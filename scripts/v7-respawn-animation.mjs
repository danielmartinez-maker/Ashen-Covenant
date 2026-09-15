import assert from 'node:assert/strict';
import { GameEngine } from '../src/systems/game.js';
import { GamePresentationSystem } from '../src/presentation/system.js';

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key)
};

const input = {
  pointer: { active: false, worldX: 0, worldY: 0 },
  tick() {}, updateWorldPointer() {},
  getMove() { return { x: 0, y: 0, moving: false }; },
  getAimDirection() { return null; }, isHeld() { return false; }, consume() { return false; },
  defer() {}, press() {}, rumble() {}
};
const renderer = {
  viewport: { width: 1280, height: 720, scale: 1 },
  getAssetStatus: () => ({ ready: true, failed: [] })
};

const game = new GameEngine(input, renderer, { sound: false, reducedVfx: true });
const presentation = new GamePresentationSystem(game, { input, settings: game.settings, audio: null, strictEvents: true });
assert.equal(game.start('warden', 'thornseer'), true);

presentation.animationDirector.timeline.clear(game);
game.player.presentation ??= {};
game.player.presentation.reaction = { direction: 1.25, time: 0.3, duration: 0.3, tier: 'heavy' };
game.player.animation = { type: 'death', duration: 2.6, time: 0.01, angle: game.player.facing };
game.player.deathTime = 0.01;
game._respawn();

assert.equal(
  game.player.presentation?.reaction ?? null,
  null,
  'respawn must clear the fatal-hit presentation reaction before the authored rise begins'
);

presentation.update(0);
assert.equal(
  game.player.presentation.resolvedClip.semanticState,
  'rise',
  'respawn must enter the authored v7 rise clip instead of remaining dead or snapping directly to idle'
);
const firstProgress = game.player.presentation.resolvedClip.progress;
assert.ok(firstProgress >= 0 && firstProgress < 1, 'rise clip must start with bounded unfinished progress');

game.update(0.1);
presentation.update(0.1);
assert.equal(game.player.presentation.resolvedClip.semanticState, 'rise', 'rise clip must persist long enough to be visible');
assert.ok(game.player.presentation.resolvedClip.progress > firstProgress, 'rise clip progress must advance after respawn');

console.log('Ashen Covenant v7 respawn rise animation regression passed.');
