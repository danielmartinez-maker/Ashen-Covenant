import assert from 'node:assert/strict';
import { GameEngine } from '../src/systems/game.js';

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key)
};

const input = {
  pointer: { active: false, down: false, commandDirty: false, worldX: 0, worldY: 0 },
  tick() {}, updateWorldPointer() {},
  getMove() { return { x: 0, y: 0, moving: false }; },
  getAimDirection() { return null; },
  isHeld() { return false; }, consume() { return false; }, consumeUi() { return false; },
  defer() {}, press() {}, hold() {}, release() {}, rumble() {}, reset() {}
};
const renderer = { viewport: { width: 1280, height: 720, scale: 1 }, getAssetStatus: () => ({ ready: true, failed: [] }) };
const game = new GameEngine(input, renderer, { sound: false, reducedVfx: true });
assert.equal(game.start('warden', 'thornseer'), true);

const presentationEvents = [];
game.presentation = {
  emit(type, detail = {}) { presentationEvents.push({ type, detail }); },
  requestImpact() {},
  animationDirector: { reactEnemy() {} }
};

const enemy = game._spawnEnemy('mireling', game.player.x + 180, game.player.y, { group: 'contact-audit', level: 1 });
enemy.role = 'melee';
enemy.damage = 1;
enemy.windupLeft = 0.1;
enemy.telegraph = {
  x: enemy.x, y: enemy.y,
  targetX: enemy.x + 120, targetY: enemy.y,
  fromX: enemy.x, fromY: enemy.y,
  angle: 0,
  shape: 'cone', radius: 68,
  life: 0.1, maxLife: 0.1, kind: enemy.attack
};

// The player is behind the enemy and outside the authored cone. Resolving the
// attack may animate/recover, but must not publish a physical-contact event.
presentationEvents.length = 0;
game._resolveEnemyAttack(enemy);
assert.equal(
  presentationEvents.filter((event) => event.type === 'combat:enemy-impact').length,
  0,
  'melee whiff must not emit combat:enemy-impact before contact is known'
);

// Move the same enemy into a valid cone and verify genuine contact emits once.
enemy.x = game.player.x + 36;
enemy.y = game.player.y;
enemy.windupLeft = 0.1;
enemy.telegraph = {
  x: enemy.x, y: enemy.y,
  targetX: game.player.x, targetY: game.player.y,
  fromX: enemy.x, fromY: enemy.y,
  angle: Math.PI,
  shape: 'cone', radius: 68,
  life: 0.1, maxLife: 0.1, kind: enemy.attack
};
game.player.iframes = 0;
game.player.deathTime = 0;
presentationEvents.length = 0;
game._resolveEnemyAttack(enemy);
assert.equal(
  presentationEvents.filter((event) => event.type === 'combat:enemy-impact').length,
  1,
  'confirmed melee contact must emit combat:enemy-impact exactly once'
);

console.log('Ashen Covenant enemy contact presentation regression passed.');
