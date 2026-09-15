import assert from 'node:assert/strict';
import { HunterSystem, HUNTER_ADAPTATIONS } from '../src/systems/hunters.js';

assert(HUNTER_ADAPTATIONS.length >= 7);
const system = new HunterSystem();
const hunter = system.createFromVictor({ id: 'enemy-1', templateId: 'reedstalker', name: 'Reed Stalker', level: 12, role: 'assassin', doctrineFaction: 'blood' }, { source: 'projectile-fire', covenant: { primary: 'flame' }, now: 10 });
assert(hunter.id && hunter.name.includes('Reed Stalker'));
assert.equal(hunter.factionId, 'blood');
assert(hunter.targetRewardId, 'black-lantern');

let evolved = system.recordVictory(hunter, { source: 'projectile-fire', damageType: 'fire', barrierUsed: true, corpseBuild: true, burst: true, now: 20 });
assert(evolved.victories >= 2);
assert(evolved.adaptations.length >= 2);
assert(evolved.knowledge.damageTypes.includes('fire'));
assert(evolved.knowledge.sources.includes('projectile-fire'));
assert.equal(system.chooseIntrusion([evolved], { now: 21, zoneId: 'redfen' }), null, 'cooldown blocks immediate reappearance');
evolved = { ...evolved, nextEligibleAt: 0 };
assert.equal(system.chooseIntrusion([evolved], { now: 100, zoneId: 'redfen' })?.id, evolved.id);

// Normalization is used during save restoration and intrusion selection. Reading
// an existing Hunter must not consume future generated IDs.
const allocatorBefore = system.createFromVictor(
  { templateId: 'mireling', name: 'Allocator Probe', level: 2, doctrineFaction: 'grave' },
  { source: 'melee', now: 200 }
);
const beforeNumber = Number(allocatorBefore.id.match(/^hunter-(\d+)$/)?.[1]);
assert.ok(Number.isSafeInteger(beforeNumber));
for (let index = 0; index < 8; index += 1) system.normalize(allocatorBefore);
const allocatorAfter = system.createFromVictor(
  { templateId: 'mireling', name: 'Allocator Probe Two', level: 2, doctrineFaction: 'grave' },
  { source: 'melee', now: 201 }
);
const afterNumber = Number(allocatorAfter.id.match(/^hunter-(\d+)$/)?.[1]);
assert.equal(afterNumber, beforeNumber + 1, 'normalizing an existing Hunter must not advance the ID allocator');

const decorated = system.decorateEnemy({ hp: 200, maxHp: 200, damage: 25, speed: 180, armor: 4, shield: 0, affixes: [], name: 'Reed Stalker' }, evolved);
assert.equal(decorated.hunterId, evolved.id);
assert(decorated.maxHp > 200 && decorated.damage > 25);
assert(decorated.hunterAdaptations.length === evolved.adaptations.length);
const defeated = system.recordDefeat(evolved, { now: 130 });
assert.equal(defeated.defeated, true);
assert.equal(defeated.rewardId, evolved.targetRewardId);
console.log('Ashen Covenant Named Hunter regression passed.');

const store = new Map();
globalThis.localStorage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value), removeItem: (key) => store.delete(key) };
const { GameEngine } = await import('../src/systems/game.js');
const input = { pointer: { active: false, worldX: 0, worldY: 0 }, tick() {}, updateWorldPointer() {}, getMove() { return { x: 0, y: 0, moving: false }; }, isHeld() { return false; }, consume() { return false; }, defer() {}, rumble() {} };
const game = new GameEngine(input, { viewport: { width: 1280, height: 720, scale: 1 } }, { reducedVfx: true });
assert(game.start('warden', 'thornseer'));
assert(game.hunterSystem instanceof HunterSystem);
const candidate = game._spawnEnemy('reedstalker', 2500, 450, { level: 10, group: 'hunter-seed', engaged: true, doctrineFaction: 'blood' });
const created = game.createHunterFromEnemy(candidate, { source: 'projectile-fire', damageType: 'fire', burst: true });
assert(created && game.player.hunters.some((entry) => entry.id === created.id));
const storedHunter = game.player.hunters.find((entry) => entry.id === created.id);
storedHunter.adaptations = ['grave-eater', 'war-call', 'scar-ground', 'blood-reprisal', 'wardbreaker', 'nullstep'];
storedHunter.nextEligibleAt = 0;
let intrusion = null;
const offIntrusion = game.domainEvents.on('hunter:intrusion', (detail) => { intrusion = detail; });
const intruder = game.intrudeHunter(created.id, { x: 2520, y: 470, zoneId: 'redfen' });
offIntrusion();
assert(intruder?.hunterId === created.id);
assert.equal(intrusion?.hunterId, created.id);
assert(intruder.corpseDenial && intruder.hunterReinforcement && intruder.hunterHazard);
game.player.x = intruder.x - 40; game.player.y = intruder.y;
game.entities.corpses.push({ id: 'hunter-corpse', x: intruder.x + 10, y: intruder.y + 10, life: 20 });
const corpseCount = game.entities.corpses.length;
game._updateEnemies(0.016);
assert(game.entities.corpses.length < corpseCount, 'corpse-denial Hunter adaptation consumes nearby corpses');
let defeatEvent = null;
const offDefeat = game.domainEvents.on('hunter:defeated', (detail) => { defeatEvent = detail; });
game._damageEnemy(intruder, intruder.maxHp * 20, { source: 'execution', damageType: 'physical', stagger: 2, poiseDamage: intruder.poiseMax * 2 });
offDefeat();
assert.equal(defeatEvent?.hunterId, created.id);
assert(game.player.hunters.find((entry) => entry.id === created.id)?.defeated === true);
assert(game.snapshot().player.hunters.some((entry) => entry.id === created.id));
