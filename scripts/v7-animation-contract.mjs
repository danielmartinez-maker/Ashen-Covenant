import assert from 'node:assert/strict';
import { ANIMATION_SEMANTIC_STATES, HERO_MOTION_ASSETS, PLAYER_ANIMATION_CLIPS } from '../src/data/animation-v7.js';
import { AnimationClipResolver } from '../src/presentation/animation-clips-v7.js';

const classes = ['warden', 'thornseer', 'ironbound', 'veilrunner', 'gravebinder', 'dawnstrider'];
const required = ['idle', 'walk', 'run', 'turn', 'dodge', 'attack1', 'attack2', 'attack3', 'heavy', 'cast', 'companion', 'hybrid', 'ultimate', 'guard', 'hit-light', 'hit-heavy', 'knockdown', 'rise', 'execution', 'death'];
assert.deepEqual([...ANIMATION_SEMANTIC_STATES], required);
for (const classId of classes) {
  const asset = HERO_MOTION_ASSETS[classId];
  assert.equal(asset.required, true);
  assert.equal(asset.src, `/assets/hero-motion-${classId}-v7.png`);
  assert.equal(asset.columns, 8);
  assert.equal(asset.facingLanes, 8);
  assert.equal(asset.sourceStates, 10);
  for (const semantic of required) {
    const clip = PLAYER_ANIMATION_CLIPS[`${classId}:${semantic}`];
    assert.ok(clip, `${classId}:${semantic} must resolve`);
    assert.equal(clip.sourcePath.includes('hero-facing-atlas-v5'), false);
    for (const anchor of ['body', 'hand', 'offhand', 'head', 'torso', 'feet']) {
      assert.ok(Array.isArray(clip.anchors[anchor]) && clip.anchors[anchor].length === 2, `${clip.id}/${anchor}`);
      assert.ok(clip.anchors[anchor].every(Number.isFinite));
    }
  }
}

const resolver = new AnimationClipResolver();
const base = Object.freeze({
  actorKind: 'player', primaryClass: 'warden', actionId: 'attack', comboIndex: 2, phase: 'active', actionProgress: 0.51,
  facingLane: 3, movementState: 'idle', movementIntensity: 0, locomotionProgress: 0,
  execution: false, knockdown: false, staggered: false, hitWeight: 'light', settings: Object.freeze({ reducedMotion: false })
});
const resolved = resolver.resolve(base);
assert.equal(resolved.semanticState, 'attack2');
assert.equal(resolved.facingLane, 3);
assert.ok(resolved.frame >= 0 && resolved.frame < 8);
assert.equal(Object.isFrozen(resolved), true);
let previous = -1;
for (let step = 0; step <= 20; step += 1) {
  const frame = resolver.resolve(Object.freeze({ ...base, actionProgress: step / 20 })).frame;
  assert.ok(frame >= previous, `attack frames must be monotonic at step ${step}`);
  previous = frame;
}
const riseFrames = [];
for (let step = 0; step <= 10; step += 1) riseFrames.push(resolver.resolve(Object.freeze({ ...base, actionId: 'resurrection', actionProgress: step / 10 })).frame);
assert.ok(riseFrames[0] > riseFrames.at(-1), 'rise clip must support descending frame windows');
assert.equal(resolver.resolve(Object.freeze({ ...base, actionId: 'death' })).semanticState, 'death');
assert.equal(resolver.resolve(Object.freeze({ ...base, actionId: 'attack', knockdown: true })).semanticState, 'knockdown');
assert.equal(resolver.resolve(Object.freeze({ ...base, actionId: 'attack', staggered: true, hitWeight: 'heavy' })).semanticState, 'hit-heavy');
assert.equal(resolver.resolve(Object.freeze({ ...base, actionId: 'attack', execution: true })).semanticState, 'execution');
assert.equal(resolver.resolve(Object.freeze({ ...base, actionId: 'dodge' })).semanticState, 'dodge');
assert.equal(resolver.resolve(Object.freeze({ ...base, actionId: 'idle', movementState: 'run', locomotionProgress: 0.64 })).semanticState, 'run');
assert.equal(resolver.resolve(Object.freeze({ ...base, actionId: 'idle', movementState: 'run', locomotionProgress: 0.64, settings: Object.freeze({ reducedMotion: true }) })).semanticState, 'walk');
assert.equal(resolver.resolve(Object.freeze({ ...base, actionId: 'idle', movementState: 'run', locomotionProgress: 0.64 })).progress, 0.64);

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key)
};
const { GameEngine } = await import('../src/systems/game.js');
const { GamePresentationSystem } = await import('../src/presentation/system.js');
const input = {
  pointer: { active: false, worldX: 0, worldY: 0 },
  tick() {}, updateWorldPointer() {},
  getMove() { return { x: 0, y: 0, moving: false }; },
  getAimDirection() { return null; }, isHeld() { return false; }, consume() { return false; }, defer() {}, press() {}, rumble() {}
};
const game = new GameEngine(input, { viewport: { width: 1280, height: 720, scale: 1 }, getAssetStatus: () => ({ ready: true, failed: [] }) }, { sound: false, reducedVfx: true });
const presentation = new GamePresentationSystem(game, { input, settings: game.settings, audio: null, strictEvents: true });
assert.equal(game.start('warden', 'thornseer'), true);
presentation.update(1 / 60);
assert.equal(game.player.presentation.combatContext.primaryClass, 'warden');
assert.equal(game.player.presentation.resolvedClip.clipId, 'warden:idle');
assert.equal(presentation.eventBus.recent('animation:clip-resolved', 1).length, 1);
assert.equal(presentation.eventBus.recent('presentation:combat-context', 1).length, 1);
assert.equal(presentation.beginPlayerAttack(1), true);
presentation.updateGameplay(0.1);
presentation.update(1 / 60);
assert.ok(game.player.presentation.actionProgress > 0 && game.player.presentation.actionProgress <= 1, 'AnimationDirector must publish normalized action progress');
assert.ok(Number.isFinite(game.player.presentation.locomotionProgress), 'AnimationDirector must publish normalized locomotion progress');
assert.equal(game.player.presentation.combatContext.actionProgress, game.player.presentation.actionProgress, 'combat context must consume published action progress');

console.log('Ashen Covenant v7 animation clip contract regression passed.');
