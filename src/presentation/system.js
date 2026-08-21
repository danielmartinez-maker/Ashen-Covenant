import { clamp } from '../core/math.js';
import { AnimationDirector } from './animation.js';
import { PresentationContextResolver } from './context.js';
import { PresentationEventBus, bridgeLegacyPresentationEvents } from './event-bus.js';
import { ImpactPresentationSystem } from './impact.js';
import { bossSignatureCue } from './covenant-identity.js';

export class CinematicPresentationController {
  constructor(bus) {
    this.bus = bus;
    this.active = false;
    this.id = null;
    this.kind = null;
    this.startedAt = 0;
    this.completed = new Set();
    this.lastSkip = null;
  }

  start(id, { kind = 'narrative', game = null } = {}) {
    if (!id || this.active && this.id === id) return false;
    this.active = true;
    this.id = id;
    this.kind = kind;
    this.startedAt = game?.clock ?? 0;
    this.bus?.emit('cinematic:start', { id, kind }, { time: this.startedAt, source: 'cinematic-controller', priority: 90 });
    this.bus?.emit('music:duck', { active: true, amount: 0.45 }, { time: this.startedAt, source: 'cinematic-controller' });
    return true;
  }

  end({ game = null, completed = true } = {}) {
    if (!this.active) return false;
    const id = this.id;
    if (completed) this.completed.add(id);
    this.active = false;
    this.id = null;
    this.kind = null;
    this.bus?.emit('cinematic:end', { id, completed }, { time: game?.clock ?? 0, source: 'cinematic-controller', priority: 90 });
    this.bus?.emit('music:duck', { active: false, amount: 1 }, { time: game?.clock ?? 0, source: 'cinematic-controller' });
    return true;
  }

  skip(game) {
    if (!this.active) return false;
    const id = this.id;
    this.lastSkip = { id, time: game?.clock ?? 0 };
    this.bus?.emit('cinematic:skip', { id, kind: this.kind }, { time: game?.clock ?? 0, source: 'cinematic-controller', priority: 100 });
    this.end({ game, completed: true });
    return true;
  }

  update(game) {
    if (this.active && !game?.pendingCampaignDialogue && this.kind === 'narrative') this.end({ game, completed: true });
  }

  resetTransient() {
    this.active = false;
    this.id = null;
    this.kind = null;
  }

  debug() {
    return { active: this.active, id: this.id, kind: this.kind, completed: this.completed.size, lastSkip: this.lastSkip };
  }
}

export class PresentationSettingsController {
  constructor(settings = {}) {
    this.settings = settings;
  }

  normalize() {
    const settings = this.settings;
    settings.masterVolume = clamp(Number(settings.masterVolume ?? 0.82), 0, 1);
    settings.musicVolume = clamp(Number(settings.musicVolume ?? 0.62), 0, 1);
    settings.sfxVolume = clamp(Number(settings.sfxVolume ?? 0.82), 0, 1);
    settings.dialogueVolume = clamp(Number(settings.dialogueVolume ?? 0.9), 0, 1);
    settings.ambienceVolume = clamp(Number(settings.ambienceVolume ?? 0.7), 0, 1);
    settings.dynamicMusicIntensity = clamp(Number(settings.dynamicMusicIntensity ?? 1), 0, 1.25);
    settings.cameraShakeScale = clamp(Number(settings.cameraShakeScale ?? 1), 0, 1);
    settings.hitStopScale = clamp(Number(settings.hitStopScale ?? 1), 0, 1);
    settings.reducedStingers = settings.reducedStingers === true;
    settings.reducedMotion = settings.reducedMotion === true;
    settings.reducedFlashing = settings.reducedFlashing === true;
    settings.combatHudFocus = settings.combatHudFocus !== false;
    settings.backgroundAudio = settings.backgroundAudio === true;
    settings.muteWhenUnfocused = settings.muteWhenUnfocused !== false;
    settings.combatMusicFrequency = ['reduced', 'standard', 'frequent'].includes(settings.combatMusicFrequency) ? settings.combatMusicFrequency : 'standard';
    settings.streamerSafeMusic = settings.streamerSafeMusic !== false;
    settings.presentationDebug = settings.presentationDebug === true;
    return settings;
  }
}

export class GamePresentationSystem {
  constructor(game, { input = game?.input, settings = game?.settings ?? {}, audio = null, strictEvents = false } = {}) {
    this.game = game;
    this.input = input;
    this.settingsController = new PresentationSettingsController(settings);
    this.settings = this.settingsController.normalize();
    this.audio = audio;
    this.eventBus = new PresentationEventBus({ strict: strictEvents });
    this.contextResolver = new PresentationContextResolver(this.eventBus);
    this.animationDirector = new AnimationDirector(this.eventBus, this.settings);
    this.impactSystem = new ImpactPresentationSystem(this.eventBus, input, this.settings);
    this.cinematic = new CinematicPresentationController(this.eventBus);
    this.musicOverride = null;
    this.characterClassOverride = null;
    this.animationOverride = null;
    this.debugEnabled = false;
    this.releaseDebugAllowed = Boolean(import.meta?.env?.DEV) || this.settings.presentationDebug === true;
    this.debugOverrides = { musicIntensity: null };
    this.frameTimes = [];
    this.updateCost = 0;
    this.maxUpdateCost = 0;
    this.errorLog = [];
    this.unsubscribers = bridgeLegacyPresentationEvents(game, this.eventBus);
    this._bindEvents();
    this.attach(game);
  }

  attach(game) {
    if (!game) return;
    this.game = game;
    game.presentation = this;
    game.bindPresentation?.(this);
    this.impactSystem.attach(game);
    this.animationDirector.attach(game);
    this.audio?.attach(game, this.eventBus);
  }

  _bindEvents() {
    this.eventBus.on('legacy:campaign-dialogue', (event) => this.cinematic.start(event.detail.id ?? 'campaign-dialogue', { kind: 'narrative', game: this.game }));
    this.eventBus.on('legacy:boss-phase', (event) => {
      const enemy = event.detail.enemy;
      if (enemy) {
        enemy.phaseTransition = Math.max(enemy.phaseTransition ?? 0, enemy.boss ? 0.78 : 0.42);
        enemy.windupLeft = 0;
        enemy.telegraph = null;
        enemy.state = 'phase-transition';
      }
      const covenant = this.game?.getCovenantOverview?.();
      const cue = bossSignatureCue(enemy?.templateId ?? 'boss', covenant?.primary ?? 'unbound', event.detail.phase ?? enemy?.phase ?? 1);
      this.eventBus.emit('boss:signature-cue', cue, { time: this.game?.clock ?? 0, source: 'boss-presentation', priority: 94 });
      this.eventBus.emit('music:stinger', { id: 'boss-phase', signature: cue.id, affinity: cue.affinity }, { time: this.game?.clock ?? 0, source: 'boss-presentation', priority: 92 });
      this.eventBus.emit('camera:profile', { profileId: 'boss', signature: cue.id }, { time: this.game?.clock ?? 0, source: 'boss-presentation' });
    });
    this.eventBus.on('legacy:boss-defeated', () => this.eventBus.emit('music:stinger', { id: 'boss-defeat' }, { time: this.game?.clock ?? 0, source: 'boss-presentation', priority: 98 }));
    this.eventBus.on('legacy:player-dead', () => {
      this.animationDirector.timeline.clear(this.game);
      this.cinematic.resetTransient();
      this.eventBus.emit('animation:death', { entityId: this.game?.player?.id }, { time: this.game?.clock ?? 0, source: 'presentation-system', priority: 100 });
    });
    this.eventBus.on('legacy:respawned', () => {
      this.animationDirector.timeline.clear(this.game);
      this.eventBus.emit('animation:resurrection', { entityId: this.game?.player?.id }, { time: this.game?.clock ?? 0, source: 'presentation-system', priority: 100 });
    });
    this.eventBus.on('presentation:error', (event) => {
      this.errorLog.push({ time: this.game?.clock ?? 0, ...event.detail });
      this.errorLog.length = Math.min(40, this.errorLog.length);
    });
  }

  updateGameplay(delta) {
    if (!this.game?.player || this.game.state !== 'playing') return;
    this.animationDirector.updateGameplay(this.game, delta);
  }

  update(delta) {
    const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.settingsController.normalize();
    const context = this.contextResolver.update(this.game, delta);
    this.animationDirector.update(this.game, delta, context);
    this.impactSystem.update(this.game, delta, context);
    this.cinematic.update(this.game);
    this.audio?.update(context);
    const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.updateCost = Math.max(0, end - start);
    this.maxUpdateCost = Math.max(this.maxUpdateCost, this.updateCost);
    this.frameTimes.push(this.updateCost);
    if (this.frameTimes.length > 180) this.frameTimes.splice(0, this.frameTimes.length - 180);
    return context;
  }

  canPerformAction(action) {
    return this.animationDirector.canPerform(action);
  }

  beginPlayerAttack(comboIndex, callbacks = {}) {
    return this.animationDirector.beginAttack(this.game, comboIndex, callbacks);
  }

  beginLegacyAction(type, duration, angle) {
    return this.animationDirector.beginLegacyAction(this.game, type, duration, angle);
  }

  beginPlayerAction(action, callbacks = {}, detail = {}) {
    return this.animationDirector.beginAction(this.game, action, callbacks, detail);
  }

  requestImpact(profileId, detail = {}) {
    return this.impactSystem.request(profileId, detail, this.game);
  }

  emit(type, detail = {}, meta = {}) {
    return this.eventBus.emit(type, detail, { time: this.game?.clock ?? 0, source: meta.source ?? 'game', ...meta });
  }

  skipCinematic() {
    return this.cinematic.skip(this.game);
  }

  toggleDebug(force = null) {
    this.releaseDebugAllowed = Boolean(import.meta?.env?.DEV) || this.settings.presentationDebug === true;
    if (!this.releaseDebugAllowed) {
      this.debugEnabled = false;
      return false;
    }
    this.debugEnabled = force === null ? !this.debugEnabled : Boolean(force);
    return this.debugEnabled;
  }

  forceMusicIntensity(value = null) {
    const numeric = value === null || value === '' ? null : Number(value);
    this.debugOverrides.musicIntensity = Number.isFinite(numeric) ? clamp(numeric, 0, 1) : null;
    return this.debugOverrides.musicIntensity;
  }

  getContext() {
    return this.contextResolver.snapshot();
  }

  getDebugSnapshot() {
    const average = this.frameTimes.length ? this.frameTimes.reduce((sum, value) => sum + value, 0) / this.frameTimes.length : 0;
    const sorted = this.frameTimes.slice().sort((a, b) => a - b);
    const p95 = sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] : 0;
    return {
      enabled: this.debugEnabled,
      context: this.getContext(),
      playerAnimation: this.game?.player?.animation ?? null,
      locomotion: this.game?.player?.presentation?.locomotion ?? null,
      animation: this.animationDirector.debug(), impact: this.impactSystem.debug(), cinematic: this.cinematic.debug(),
      audio: this.audio?.debug() ?? null, eventBus: { ...this.eventBus.stats, history: this.eventBus.recent(null, 8) },
      performance: { currentMs: this.updateCost, averageMs: average, p95Ms: p95, maximumMs: this.maxUpdateCost },
      activeRagdolls: 0, activeCorpses: this.game?.entities?.corpses?.length ?? 0,
      activeDestructibles: this.game?.entities?.destructibles?.filter((entry) => !entry.broken).length ?? 0,
      activeParticles: this.game?.entities?.particles?.length ?? 0, activeProjectiles: this.game?.entities?.projectiles?.length ?? 0,
      errors: this.errorLog.slice(-8)
    };
  }
}
