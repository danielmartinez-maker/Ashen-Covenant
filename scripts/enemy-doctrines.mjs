import assert from 'node:assert/strict';
import { EnemyDirector, ENEMY_DOCTRINES, doctrineFactionForZone } from '../src/systems/enemy-director.js';

assert.deepEqual(Object.keys(ENEMY_DOCTRINES).sort(), ['blood','grave','iron','storm','void']);
assert.equal(doctrineFactionForZone('gravewake'), 'grave');
assert.equal(doctrineFactionForZone('redfen'), 'blood');
assert.equal(doctrineFactionForZone('cairnreach'), 'iron');
assert.equal(doctrineFactionForZone('veiled-road'), 'void');

const director = new EnemyDirector({ minInterval: 0.12 });
const player = { x: 0, y: 0, hp: 35, maxHp: 100 };
const enemies = Array.from({ length: 8 }, (_, index) => ({ id: `e${index}`, role: index < 4 ? 'melee' : index === 4 ? 'shield' : 'ranged', x: 90 + index * 4, y: index * 7, hp: 100 - index * 8, maxHp: 100, dead: false }));
const corpses = [{ x: 120, y: 20 }, { x: 180, y: -15 }];

const grave = director.resolveGroup({ groupId: 'grave', factionId: 'grave', enemies, player, corpses, now: 1, covenant: { primary: 'grave' } });
assert(grave.corpsePriority > 0);
assert(grave.resonance > 1, 'matching Covenant reinforces faction doctrine');
const blood = director.resolveGroup({ groupId: 'blood', factionId: 'blood', enemies, player, corpses, now: 2, covenant: { primary: 'flame' } });
assert.equal(blood.targetWounded, true);
assert(blood.aggression > grave.aggression);
const iron = director.resolveGroup({ groupId: 'iron', factionId: 'iron', enemies, player, corpses, now: 3, covenant: {} });
assert(iron.spacing >= 70);
assert.equal(iron.formation, 'phalanx');
const voidDirective = director.resolveGroup({ groupId: 'void', factionId: 'void', enemies, player, corpses, now: 4, covenant: {} });
assert(voidDirective.displacementBias > 0);
const storm = director.resolveGroup({ groupId: 'storm', factionId: 'storm', enemies, player, corpses, now: 5, covenant: {} });
assert(storm.mobility > blood.mobility);
assert(storm.cadence > 1);
assert.equal(iron.slots.length, enemies.filter((enemy) => ['melee','shield','brute','assassin','burrower'].includes(enemy.role)).length);
assert(new Set(iron.slots.map((slot) => `${Math.round(slot.x)}:${Math.round(slot.y)}`)).size === iron.slots.length);

const before = director.stats.recomputes;
for (let tick = 0; tick < 100; tick += 1) {
  for (let pack = 0; pack < 34; pack += 1) {
    director.resolveGroup({ groupId: `stress-${pack}`, factionId: ['grave','blood','iron','void','storm'][pack % 5], enemies: enemies.slice(0, 8), player, corpses, now: 10 + tick * 0.01, covenant: {} });
  }
}
const recomputed = director.stats.recomputes - before;
assert(recomputed < 600, `doctrine evaluation must be throttled; recomputed ${recomputed} times for 27,200 actor decisions`);
console.log('Ashen Covenant faction doctrine regression passed.');

const store = new Map();
globalThis.localStorage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value), removeItem: (key) => store.delete(key) };
const { GameEngine } = await import('../src/systems/game.js');
const input = { pointer: { active: false, worldX: 0, worldY: 0 }, tick() {}, updateWorldPointer() {}, getMove() { return { x: 0, y: 0, moving: false }; }, isHeld() { return false; }, consume() { return false; }, defer() {}, rumble() {} };
const game = new GameEngine(input, { viewport: { width: 1280, height: 720, scale: 1 } }, { reducedVfx: true });
assert(game.start('warden', 'thornseer'));
assert(game.enemyDirector instanceof EnemyDirector);
const pack = 'doctrine-redfen';
const e1 = game._spawnEnemy('bloodleech', 2500, 450, { group: pack, level: 8, engaged: true });
const e2 = game._spawnEnemy('reedstalker', 2550, 470, { group: pack, level: 8, engaged: true });
assert.equal(e1.doctrineFaction, 'blood');
assert.equal(e2.doctrineFaction, 'blood');
game.player.x = 2480; game.player.y = 450;
game._updateEnemies(0.016);
assert.equal(e1.packDirective?.factionId, 'blood');
assert(e1.packDirective?.targetWounded === true);
