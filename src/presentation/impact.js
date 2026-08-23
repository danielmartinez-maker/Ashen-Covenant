import { clamp, lerp } from '../core/math.js';
import { CAMERA_PROFILES, IMPACT_PROFILES, PRESENTATION_FALLBACKS } from '../data/presentation.js';

export class CameraPresentationController {
  constructor(bus, settings = {}) {
    this.bus = bus;
    this.settings = settings;
    this.profileId = 'exploration';
    this.targetProfileId = 'exploration';
    this.impulses = [];
  }

  setProfile(id, game) {
    const profileId = CAMERA_PROFILES[id] ? id : PRESENTATION_FALLBACKS.camera;
    if (profileId === this.targetProfileId) return;
    this.targetProfileId = profileId;
    this.bus?.emit('camera:profile', { profileId }, { time: game?.clock ?? 0, source: 'camera-controller' });
  }

  impulse(amount, duration = 0.16, direction = 0, game = null) {
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(duration) || duration <= 0) return;
    this.impulses.push({ amount, duration, time: duration, direction: Number.isFinite(direction) ? direction : 0 });
    if (this.impulses.length > 8) this.impulses.splice(0, this.impulses.length - 8);
    this.bus?.emit('camera:impulse', { amount, duration, direction: Number.isFinite(direction) ? direction : 0 }, { time: game?.clock ?? 0, source: 'camera-controller' });
  }

  update(game, delta, context) {
    if (!game?.camera) return;
    this.setProfile(context?.cameraProfile ?? 'exploration', game);
    const target = CAMERA_PROFILES[this.targetProfileId] ?? CAMERA_PROFILES.exploration;
    const reducedMotion = this.settings.reducedMotion === true;
    const zoomTarget = reducedMotion ? 1 : target.zoom;
    game.camera.zoom = lerp(Number.isFinite(game.camera.zoom) ? game.camera.zoom : 1, zoomTarget, 1 - Math.exp(-5.5 * delta));
    game.camera.follow = lerp(Number.isFinite(game.camera.follow) ? game.camera.follow : 0.11, target.follow, 1 - Math.exp(-6 * delta));
    game.camera.offsetY = lerp(Number.isFinite(game.camera.offsetY) ? game.camera.offsetY : 0, reducedMotion ? 0 : target.offsetY, 1 - Math.exp(-5 * delta));
    game.camera.deadZone = lerp(Number.isFinite(game.camera.deadZone) ? game.camera.deadZone : 34, reducedMotion ? 52 : (target.deadZone ?? 34), 1 - Math.exp(-5 * delta));
    game.camera.profileId = this.targetProfileId;
    this.profileId = this.targetProfileId;
    const shakeSetting = clamp(Number(this.settings.cameraShakeScale ?? 1), 0, 1);
    const accessibilityScale = reducedMotion ? Math.min(0.15, shakeSetting) : shakeSetting;
    let impulse = 0;
    for (const entry of this.impulses) {
      entry.time = Math.max(0, entry.time - delta);
      impulse += entry.amount * (entry.time / entry.duration) ** 1.8;
    }
    this.impulses = this.impulses.filter((entry) => entry.time > 0);
    game.camera.presentationShake = impulse * accessibilityScale * target.shakeScale;
  }

  debug() {
    return { profileId: this.profileId, targetProfileId: this.targetProfileId, impulses: this.impulses.length };
  }
}

export class ImpactPresentationSystem {
  constructor(bus, input, settings = {}) {
    this.bus = bus;
    this.input = input;
    this.settings = settings;
    this.camera = new CameraPresentationController(bus, settings);
    this.activeProfile = null;
    this.count = 0;
    this.lastImpact = null;
    this.game = null;
    this.bus?.on('impact:request', (event) => this.request(event.detail.profileId, event.detail, this.game));
  }

  attach(game) {
    this.game = game;
  }

  request(profileId, detail = {}, game = this.game) {
    if (!game) return false;
    const fallback = IMPACT_PROFILES[PRESENTATION_FALLBACKS.impact];
    const profile = IMPACT_PROFILES[profileId] ?? fallback;
    const hitStopScale = clamp(Number(this.settings.hitStopScale ?? 1), 0, 1);
    const flashScale = this.settings.reducedFlashing === true ? 0.2 : 1;
    game.hitStop = Math.max(game.hitStop ?? 0, profile.hitStop * hitStopScale);
    game.camera.flash = Math.max(game.camera.flash ?? 0, profile.flash * flashScale);
    this.camera.impulse(profile.shake * (detail.shakeScale ?? 1), detail.duration ?? 0.16, detail.direction ?? 0, game);
    const [duration, strong, weak] = profile.rumble ?? [0, 0, 0];
    if (!this.settings.reducedMotion && duration > 0) this.input?.rumble?.(duration, strong, weak);
    if (profile.sound) this.bus?.emit('legacy:sound', { id: profile.sound, category: 'impact', priority: detail.priority ?? 5 }, { time: game.clock, source: 'impact-system', priority: detail.priority ?? 5 });
    if (detail.musicAccent) this.bus?.emit('music:stinger', { id: detail.musicAccent }, { time: game.clock, source: 'impact-system', priority: detail.priority ?? 4 });
    this.activeProfile = profileId;
    this.count += 1;
    this.lastImpact = { profileId, time: game.clock, x: detail.x, y: detail.y };
    return true;
  }

  update(game, delta, context) {
    this.game = game;
    this.camera.settings = this.settings;
    this.camera.update(game, delta, context);
  }

  debug() {
    return { activeProfile: this.activeProfile, count: this.count, lastImpact: this.lastImpact, camera: this.camera.debug() };
  }
}
