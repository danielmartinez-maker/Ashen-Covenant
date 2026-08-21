import { clamp, distance, lerp, wrapAngle } from '../core/math.js';
import { CLASS_PRESENTATION_PROFILES, DEFAULT_CLASS_PRESENTATION, ENEMY_PRESENTATION_PROFILES, resolvePlayerActionProfile } from '../data/presentation.js';
import { ZONES, zoneAt } from '../data/world.js';

const phaseFor = (profile, elapsed) => {
  if (elapsed < profile.startup) return 'anticipation';
  if (elapsed < profile.active + 0.026) return 'active';
  if (elapsed < profile.duration - Math.max(0.02, profile.recovery * 0.34)) return 'follow-through';
  return 'recovery';
};

const within = (elapsed, window) => Array.isArray(window) && elapsed >= window[0] && elapsed <= window[1];
const rotateToward = (current, target, maxStep) => current + clamp(wrapAngle(target - current), -maxStep, maxStep);

export class ActionTimelineController {
  constructor(bus) {
    this.bus = bus;
    this.current = null;
    this.sequence = 0;
  }

  canPerform(action) {
    if (!this.current) return true;
    if (action === 'dodge') return within(this.current.elapsed, this.current.profile.cancelWindows?.dodge);
    if (action === 'attack') return within(this.current.elapsed, this.current.profile.cancelWindows?.attack);
    if (['skillOne', 'skillTwo', 'companion', 'hybrid', 'ultimate', 'potion'].includes(action)) return within(this.current.elapsed, this.current.profile.cancelWindows?.skill);
    return false;
  }

  begin(game, profile, callbacks = {}, detail = {}) {
    if (!game?.player || !profile) return false;
    if (this.current && !this.canPerform(profile.action ?? detail.action ?? 'attack')) return false;
    if (this.current) this.end(game, 'canceled');
    this.current = {
      id: `action-${++this.sequence}`, profile, elapsed: 0, phase: 'anticipation', fired: new Set(), callbacks, detail
    };
    game.player.presentation ??= {};
    game.player.presentation.action = this.current;
    game.player.animation = { type: detail.animationType ?? profile.action ?? 'attack', duration: profile.duration, time: profile.duration, angle: detail.angle ?? game.player.facing, profileId: profile.id };
    this.bus?.emit('animation:action-start', { entityId: game.player.id, profileId: profile.id, action: profile.action, comboIndex: profile.comboIndex ?? 0 }, { time: game.clock, source: 'animation-director' });
    return true;
  }

  beginLegacy(game, type, duration, angle, callbacks = {}) {
    if (!game?.player) return false;
    const profile = resolvePlayerActionProfile(game.player.primary, type);
    return this.begin(game, { ...profile, duration: duration || profile.duration }, callbacks, { action: profile.action ?? type, animationType: profile.animationType ?? type, angle, legacy: true });
  }

  update(game, delta) {
    const action = this.current;
    if (!action || !game?.player) return;
    const previous = action.elapsed;
    action.elapsed = Math.min(action.profile.duration, action.elapsed + delta);
    const phase = phaseFor(action.profile, action.elapsed);
    if (phase !== action.phase) {
      action.phase = phase;
      this.bus?.emit('animation:phase', { entityId: game.player.id, actionId: action.id, profileId: action.profile.id, phase }, { time: game.clock, source: 'animation-director' });
    }
    for (const event of action.profile.events ?? []) {
      if (action.fired.has(event.id) || event.at > action.elapsed || event.at < previous) continue;
      action.fired.add(event.id);
      try { action.callbacks[event.id]?.(event, action); } catch (error) {
        this.bus?.emit('presentation:error', { subsystem: 'action-timeline', profileId: action.profile.id, eventId: event.id, message: error?.message ?? String(error) }, { time: game.clock, source: 'animation-director', priority: 100 });
      }
      this.bus?.emit('animation:event', { entityId: game.player.id, actionId: action.id, profileId: action.profile.id, eventId: event.id, phase }, { time: game.clock, source: 'animation-director' });
    }
    game.player.animation.time = Math.max(0, action.profile.duration - action.elapsed);
    if (action.elapsed >= action.profile.duration) this.end(game, 'complete');
  }

  end(game, reason = 'complete') {
    const action = this.current;
    if (!action) return;
    this.bus?.emit('animation:action-end', { entityId: game?.player?.id, actionId: action.id, profileId: action.profile.id, reason }, { time: game?.clock ?? 0, source: 'animation-director' });
    if (game?.player?.presentation) game.player.presentation.action = null;
    this.current = null;
  }

  clear(game) {
    this.end(game, 'cleared');
  }

  debug() {
    if (!this.current) return null;
    return { profileId: this.current.profile.id, elapsed: this.current.elapsed, duration: this.current.profile.duration, phase: this.current.phase, fired: [...this.current.fired] };
  }
}

export class AnimationBudgetManager {
  constructor() {
    this.tiers = { hero: 0, near: 0, mid: 0, far: 0, offscreen: 0 };
    this.activeActors = 0;
    this.poseEvaluations = 0;
  }

  beginFrame() {
    Object.keys(this.tiers).forEach((key) => { this.tiers[key] = 0; });
    this.activeActors = 0;
    this.poseEvaluations = 0;
  }

  tier(entity, player, viewport = null) {
    if (entity === player) return 'hero';
    const range = distance(entity, player);
    if (range <= 360) return 'near';
    if (range <= 760) return 'mid';
    if (range <= 1250) return 'far';
    if (viewport) {
      const padding = 180;
      const visible = entity.x >= viewport.left - padding && entity.x <= viewport.right + padding && entity.y >= viewport.top - padding && entity.y <= viewport.bottom + padding;
      if (visible) return 'far';
    }
    return 'offscreen';
  }

  record(tier, evaluated = true) {
    this.tiers[tier] = (this.tiers[tier] ?? 0) + 1;
    if (tier !== 'offscreen') this.activeActors += 1;
    if (evaluated) this.poseEvaluations += 1;
  }
}

export class AnimationDirector {
  constructor(bus, settings = {}) {
    this.bus = bus;
    this.settings = settings;
    this.timeline = new ActionTimelineController(bus);
    this.budget = new AnimationBudgetManager();
    this.ambientActors = this._buildAmbientActors();
    this.history = { attacks: [], reactions: [], deaths: [], footsteps: [] };
    this.lastFoot = 0;
    this.lastMoving = false;
    this.lastMoveAngle = 0;
  }

  _buildAmbientActors() {
    const jobs = ['blacksmith', 'vendor', 'pilgrim', 'keeper', 'guard', 'scribe'];
    const sanctuary = Array.from({ length: 18 }, (_, index) => ({
      id: `ambient-${index + 1}`, x: 190 + index % 6 * 132 + (index % 2) * 24, y: 300 + Math.floor(index / 6) * 190,
      zoneId: 'sanctuary', job: jobs[index % jobs.length], phase: index * 0.87, routine: index % 3 === 0 ? 'work' : index % 3 === 1 ? 'walk' : 'converse'
    }));
    const reclaimed = ZONES.filter((zone) => !zone.safe).flatMap((zone, zoneIndex) => Array.from({ length: 5 }, (_, index) => ({
      id: `reclaimed-${zone.id}-${index + 1}`, zoneId: zone.id,
      x: zone.x + zone.width * 0.5 + (index - 2) * 48, y: zone.y + zone.height * 0.5 + (index % 2 ? 62 : -52),
      job: jobs[(zoneIndex + index + 2) % jobs.length], phase: zoneIndex * 1.7 + index * 0.91,
      routine: index % 3 === 0 ? 'work' : index % 3 === 1 ? 'walk' : 'converse'
    })));
    return [...sanctuary, ...reclaimed];
  }

  attach(game) {
    if (!game) return;
    game.bindPresentation?.(game.presentation);
    this.bus?.on('animation:reaction', (event) => this._applyReaction(game, event.detail));
  }

  classProfile(player) {
    return CLASS_PRESENTATION_PROFILES[player?.primary] ?? DEFAULT_CLASS_PRESENTATION;
  }

  canPerform(action) {
    return this.timeline.canPerform(action);
  }

  beginAttack(game, comboIndex, callbacks = {}) {
    const profile = resolvePlayerActionProfile(game.player.primary, 'attack', comboIndex);
    const began = this.timeline.begin(game, profile, callbacks, { action: 'attack', animationType: 'attack', comboIndex, angle: game.player.facing });
    if (began) {
      this._remember('attacks', profile.id, 16);
      this.bus?.emit('combat:attack-start', {
        entityId: game.player.id, profileId: profile.id, comboIndex, weapon: profile.weapon,
        startup: profile.startup, active: profile.active, recovery: profile.recovery
      }, { time: game.clock, source: 'animation-director', priority: comboIndex === 3 ? 6 : 3 });
    }
    return began;
  }

  beginLegacyAction(game, type, duration, angle) {
    return this.timeline.beginLegacy(game, type, duration, angle);
  }

  beginAction(game, action, callbacks = {}, detail = {}) {
    const profile = resolvePlayerActionProfile(game?.player?.primary, action);
    return this.timeline.begin(game, profile, callbacks, {
      action, animationType: detail.animationType ?? profile.animationType ?? action,
      angle: detail.angle ?? game?.player?.facing, ...detail
    });
  }

  updateGameplay(game, delta) {
    this.timeline.update(game, delta);
  }

  update(game, delta, context) {
    if (!game?.player) return;
    this.budget.beginFrame();
    this._updatePlayer(game, delta, context);
    this._updateEnemies(game, delta);
  }

  _updatePlayer(game, delta, context) {
    const player = game.player;
    const profile = this.classProfile(player);
    player.presentation ??= {};
    player.presentation.profile = profile;
    player.presentation.locomotion ??= { state: 'idle', previous: 'idle', time: 0, stride: 0, foot: 0, speedRatio: 0, moveAngle: player.facing, facingDelta: 0 };
    const locomotion = player.presentation.locomotion;
    if (player.presentation.reaction) {
      player.presentation.reaction.time = Math.max(0, player.presentation.reaction.time - delta);
      if (!player.presentation.reaction.time) player.presentation.reaction = null;
    }
    const speed = Math.hypot(player.moveX, player.moveY);
    const maxSpeed = Math.max(1, game.getStats?.().speed ?? player.baseStats?.speed ?? 250);
    const ratio = clamp(speed / maxSpeed, 0, 1.3);
    const moving = ratio > 0.055 || Boolean(player.dash);
    const moveAngle = speed > 2 ? Math.atan2(player.moveY, player.moveX) : locomotion.moveAngle;
    const turn = Math.abs(wrapAngle(moveAngle - this.lastMoveAngle));
    let state = 'idle';
    if (player.deathTime > 0) state = 'dead';
    else if (player.dash) state = 'dodge';
    else if (this.timeline.current) state = this.timeline.current.profile.action ?? 'action';
    else if (moving && !this.lastMoving) state = 'start';
    else if (!moving && this.lastMoving) state = 'stop';
    else if (moving && turn > 1.7) state = 'pivot';
    else if (moving && ratio < 0.48) state = 'walk';
    else if (moving) state = context?.playerInCombat ? 'combat-run' : 'run';
    else if (context?.playerHealthPercent < 0.28) state = 'injured-idle';
    else if (context?.playerInCombat) state = 'combat-idle';
    if (state !== locomotion.state) {
      locomotion.previous = locomotion.state;
      locomotion.state = state;
      locomotion.time = 0;
    } else locomotion.time += delta;
    locomotion.speedRatio = lerp(locomotion.speedRatio, ratio, 1 - Math.exp(-9 * delta));
    locomotion.moveAngle = moveAngle;
    locomotion.facingDelta = wrapAngle(player.facing - moveAngle);
    locomotion.stride += delta * profile.locomotion.strideRate * Math.max(0.2, locomotion.speedRatio);
    const foot = Math.floor(locomotion.stride / Math.PI) % 2;
    if (moving && !player.dash && foot !== locomotion.foot && ratio > 0.22) {
      locomotion.foot = foot;
      const zone = zoneAt(player.x, player.y);
      const surface = player.surface ?? (zone.id === 'redfen' ? 'mud' : zone.id === 'cairnreach' || zone.id === 'bellscar' ? 'stone' : zone.id === 'gravewake' ? 'grass' : zone.id === 'veiled-road' ? 'ash' : 'stone');
      const detail = { entityId: player.id, foot: foot ? 'right' : 'left', surface, weight: profile.weight, speed: ratio, armor: profile.weapon === 'tower-shield' ? 'heavy' : 'medium' };
      this.bus?.emit('animation:footstep', detail, { time: game.clock, source: 'animation-director' });
      this._remember('footsteps', `${surface}:${detail.foot}`, 12);
    }
    this.lastMoving = moving;
    this.lastMoveAngle = moveAngle;
    this.budget.record('hero');
  }

  _updateEnemies(game, delta) {
    const player = game.player;
    const worldScale = (game.renderer?.viewport?.scale ?? 1) * (game.camera?.zoom ?? 1);
    const viewWidth = (game.renderer?.viewport?.width ?? 1280) / worldScale;
    const viewHeight = (game.renderer?.viewport?.height ?? 720) / worldScale;
    const viewport = { left: game.camera.x, top: game.camera.y, right: game.camera.x + viewWidth, bottom: game.camera.y + viewHeight };
    for (const enemy of game.entities.enemies) {
      const tier = this.budget.tier(enemy, player, viewport);
      const evaluate = tier === 'near' || tier === 'mid' || tier === 'far' && Math.floor(game.clock * 12 + enemy.x) % 2 === 0;
      this.budget.record(tier, evaluate);
      enemy.presentation ??= { visualFacing: enemy.facing ?? 0, reaction: null, reactionHistory: [], stride: 0, tier, phasePose: 0 };
      enemy.presentation.tier = tier;
      if (!evaluate || tier === 'offscreen') continue;
      const profile = ENEMY_PRESENTATION_PROFILES[enemy.role] ?? ENEMY_PRESENTATION_PROFILES.melee;
      const committed = enemy.state === 'windup' && enemy.windupLeft < (enemy.windup ?? 1) * 0.58 || enemy.state === 'attack' || enemy.phaseTransition > 0;
      const turnRate = committed ? profile.turnRate * 0.22 : profile.turnRate;
      enemy.presentation.visualFacing = rotateToward(enemy.presentation.visualFacing, enemy.facing ?? 0, turnRate * delta);
      const moving = ['move', 'evade', 'chase', 'patrol', 'alert', 'retreat'].includes(enemy.state);
      enemy.presentation.stride += moving ? delta * Math.max(3.4, enemy.speed * 0.055) : delta * 0.8;
      if (enemy.presentation.reaction) {
        enemy.presentation.reaction.time = Math.max(0, enemy.presentation.reaction.time - delta);
        if (!enemy.presentation.reaction.time) enemy.presentation.reaction = null;
      }
      enemy.presentation.phasePose = lerp(enemy.presentation.phasePose, enemy.phaseTransition > 0 ? 1 : 0, 1 - Math.exp(-8 * delta));
    }
  }

  reactEnemy(game, enemy, { amount = 1, direction = 0, critical = false, damageType = 'physical', tier = null } = {}) {
    if (!enemy || enemy.dead) return;
    const profile = ENEMY_PRESENTATION_PROFILES[enemy.role] ?? ENEMY_PRESENTATION_PROFILES.melee;
    const normalized = tier ?? (critical ? 'heavy' : amount > enemy.maxHp * 0.16 ? 'medium' : 'micro');
    const duration = normalized === 'heavy' ? 0.28 : normalized === 'medium' ? 0.2 : 0.12;
    enemy.presentation ??= { visualFacing: enemy.facing ?? 0, reactionHistory: [] };
    const variant = this._reactionVariant(enemy.presentation.reactionHistory, normalized, direction);
    enemy.presentation.reaction = { tier: normalized, direction, damageType, variant, time: duration, duration, scale: profile.reactionScale };
    enemy.presentation.reactionHistory.unshift(`${normalized}:${variant}`);
    enemy.presentation.reactionHistory.length = 6;
    this._remember('reactions', `${enemy.templateId}:${normalized}:${variant}`, 20);
    this.bus?.emit('animation:reaction', { entityId: enemy.id, enemyId: enemy.templateId, tier: normalized, direction, damageType, variant }, { time: game?.clock ?? 0, source: 'animation-director' });
  }

  _applyReaction() {
    // Reactions are applied synchronously by reactEnemy. This listener exists
    // so external tools can issue compatible typed reaction events safely.
  }

  _reactionVariant(history, tier, direction) {
    const side = Math.cos(direction) > 0.45 ? 'front' : Math.cos(direction) < -0.45 ? 'back' : Math.sin(direction) > 0 ? 'right' : 'left';
    const candidates = [`${side}-a`, `${side}-b`, `${side}-c`];
    return candidates.find((candidate) => !history.slice(0, 2).some((entry) => entry.endsWith(candidate))) ?? candidates[history.length % candidates.length];
  }

  _remember(key, value, limit) {
    this.history[key].unshift(value);
    this.history[key].length = Math.min(this.history[key].length, limit);
  }

  getAmbientActors(context) {
    if (context?.playerInTown) return this.ambientActors.filter((actor) => actor.zoneId === 'sanctuary');
    if (context?.strongholdState === 'liberated') return this.ambientActors.filter((actor) => actor.zoneId === context.currentRegion);
    return [];
  }

  debug() {
    return {
      timeline: this.timeline.debug(), budget: { tiers: { ...this.budget.tiers }, activeActors: this.budget.activeActors, poseEvaluations: this.budget.poseEvaluations },
      history: Object.fromEntries(Object.entries(this.history).map(([key, value]) => [key, value.slice(0, 6)]))
    };
  }
}
