import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, value),
  removeItem: (key) => store.delete(key)
};

const { GameEngine } = await import('../src/systems/game.js');
const input = {
  pointer: { active: false, worldX: 0, worldY: 0 },
  tick() {}, updateWorldPointer() {}, getMove() { return { x: 0, y: 0, moving: false }; },
  isHeld() { return false; }, consume() { return false; }, defer() {}, rumble() {}
};
const game = new GameEngine(input, { viewport: { width: 1280, height: 720, scale: 1 } }, { reducedVfx: true });
assert(game.start('warden', 'thornseer'));

game.player.equipment.weapon = {
  id: 'test-vessel', uniqueId: 'vessel-of-silence', rarity: 'mythic', slot: 'weapon',
  name: 'Vessel of Silence', affixes: [], runeIds: [], masterwork: 0, masterworkExalts: []
};
game._refreshPlayerStats(true);
game.player.silenceStored = 0;

assert(game.startBlackRoadExpedition('funeral-road'));
const enemy = game.entities.enemies.find((candidate) => !candidate.dead && !candidate.boss);
assert(enemy, 'the Black Road test route must provide a live enemy');
assert.doesNotThrow(
  () => game._damageEnemy(enemy, Math.max(1, enemy.maxHp * 0.01), { source: 'routing-regression' }),
  'enemy damage must never reference player barrier absorption state'
);
assert.equal(game.player.silenceStored, 0, 'damaging an enemy must not trigger Vessel of Silence');

game.player.barrier = game.player.maxHp * 2;
const hpBefore = game.player.hp;
const storedBefore = game.player.silenceStored;
const result = game._damagePlayer(Math.max(1, game.player.maxHp * 0.05), 'routing-regression');
assert.equal(game.player.hp, hpBefore, 'a fully absorbed hit must leave health unchanged');
assert(game.player.silenceStored > storedBefore, 'Vessel of Silence must store Barrier absorption even when the hit is fully absorbed');
assert.equal(result, false, 'a fully absorbed hit should preserve the existing no-health-damage return contract');

console.log('Ashen Covenant barrier/Unique routing regression passed.');
