import assert from 'node:assert/strict';
import { CLASS_IDS, getHybrid } from '../src/data/classes.js';
import { ITEM_BASES } from '../src/data/items.js';
import { BLACK_ROAD_BY_ID } from '../src/data/requiem.js';
import { SAVE_KEY, SETTINGS_KEY, WORLD_SIZE, MAX_LEVEL } from '../src/core/constants.js';
import { loadSave, loadSettings } from '../src/systems/save.js';
import { DomainEventBus } from '../src/systems/domain-events.js';
import { GameEngine } from '../src/systems/game.js';

let store = new Map();
let storageMode = 'normal';
const installStorage = () => {
  store = new Map();
  storageMode = 'normal';
  globalThis.localStorage = {
    getItem(key) { if (storageMode === 'read-throws') throw new Error('read blocked'); return store.get(key) ?? null; },
    setItem(key, value) { if (storageMode === 'write-throws') throw new Error('quota'); store.set(key, String(value)); },
    removeItem(key) { if (storageMode === 'remove-throws') throw new Error('blocked'); store.delete(key); }
  };
  return store;
};
installStorage();

const makeInput = () => ({
  pointer: { active: false, down: false, commandDirty: false, worldX: 0, worldY: 0 },
  tick() {}, updateWorldPointer() {},
  getMove() { return { x: 0, y: 0, moving: false }; },
  getAimDirection() { return null; }, isHeld() { return false; }, consume() { return false; },
  defer() {}, press() {}, rumble() {}, reset() {}
});
const renderer = { viewport: { width: 1280, height: 720, scale: 1 }, getAssetStatus: () => ({ ready: true, failed: [] }) };
const makeGame = () => new GameEngine(makeInput(), renderer, { reducedVfx: true, sound: false });

const assertFiniteTree = (value, trail = 'root', seen = new Set()) => {
  if (typeof value === 'number') return assert.ok(Number.isFinite(value), `${trail} must be finite, got ${value}`);
  if (value == null || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) return value.forEach((entry, index) => assertFiniteTree(entry, `${trail}[${index}]`, seen));
  for (const [key, child] of Object.entries(value)) assertFiniteTree(child, `${trail}.${key}`, seen);
};
const assertRuntimeBounds = (game, label) => {
  assert.ok(game.player, `${label}: player must exist`);
  assertFiniteTree(game.snapshot(), `${label}.snapshot`);
  for (const [index, enemy] of game.entities.enemies.entries()) assertFiniteTree(enemy, `${label}.enemy[${index}]`);
  assert.ok(game.player.x >= 0 && game.player.x <= WORLD_SIZE.width, `${label}: player x in world`);
  assert.ok(game.player.y >= 0 && game.player.y <= WORLD_SIZE.height, `${label}: player y in world`);
  assert.ok(game.player.level >= 1 && game.player.level <= MAX_LEVEL, `${label}: level bounded`);
  assert.ok(game.player.hp >= 0 && game.player.hp <= game.player.maxHp, `${label}: hp bounded`);
  assert.ok(game.player.resource >= 0 && game.player.resource <= game.player.maxResource, `${label}: resource bounded`);
  assert.ok(game.entities.projectiles.length <= 180, `${label}: projectile cap`);
  assert.ok(game.entities.hazards.length <= 90, `${label}: hazard cap`);
  assert.ok(game.entities.effects.length <= 260, `${label}: effect cap`);
  assert.ok(game.entities.particles.length <= 760, `${label}: particle cap`);
  assert.ok(game.entities.corpses.length <= 48, `${label}: corpse cap`);
};

// Gameplay domain events are notifications. A broken observer must not abort the
// gameplay mutation that emitted the event or starve later observers.
const domainBus = new DomainEventBus();
let domainDelivered = 0;
domainBus.on('combat:hit-resolved', () => { throw new Error('observer failed'); });
domainBus.on('combat:hit-resolved', () => { domainDelivered += 1; });
assert.doesNotThrow(() => domainBus.emit('combat:hit-resolved', { enemyId: 'audit-enemy' }), 'domain observer failure must not escape into gameplay');
assert.equal(domainDelivered, 1, 'later gameplay observers must still receive an event after one observer fails');

// Storage parser boundaries.
store.set(SAVE_KEY, '{not json');
assert.equal(loadSave(), null, 'malformed save JSON must be ignored');
store.set(SAVE_KEY, '[]');
assert.equal(loadSave(), null, 'array save root must be rejected');
store.set(SETTINGS_KEY, JSON.stringify({ uiScale: 999, hudOpacity: -4, masterVolume: 'NaN', dynamicMusicIntensity: 99, graphicsQuality: 'impossible' }));
const settings = loadSettings();
assert.equal(settings.uiScale, 1.3);
assert.equal(settings.hudOpacity, 0.6);
assert.equal(settings.masterVolume, 0.82);
assert.equal(settings.dynamicMusicIntensity, 1.25);
assert.equal(settings.graphicsQuality, 'high');
storageMode = 'read-throws';
assert.equal(loadSave(), null, 'storage read failure must degrade to no save');
assert.doesNotThrow(() => loadSettings(), 'settings read failure must not escape');
storageMode = 'normal';
store.clear();

// Every playable ordered pair under varied frame cadence, plus save/restore.
const frameCadence = [0, 1 / 240, 1 / 120, 1 / 60, 1 / 30, 0.05, 0.1];
let pairs = 0;
for (const primary of CLASS_IDS) {
  for (const secondary of CLASS_IDS) {
    if (primary === secondary || !getHybrid(primary, secondary)) continue;
    pairs += 1;
    installStorage();
    const game = makeGame();
    assert.equal(game.start(primary, secondary), true, `${primary}+${secondary} start`);
    for (let frame = 0; frame < 420; frame += 1) game.update(frameCadence[frame % frameCadence.length]);
    assertRuntimeBounds(game, `${primary}+${secondary}:live`);
    assert.equal(game.save(), true, `${primary}+${secondary}:save`);
    const restored = makeGame();
    assert.equal(restored.continueRun(), true, `${primary}+${secondary}:restore`);
    for (let frame = 0; frame < 120; frame += 1) restored.update(frameCadence[(frame + 3) % frameCadence.length]);
    assertRuntimeBounds(restored, `${primary}+${secondary}:restored`);
  }
}
assert.ok(pairs >= 30, `expected all ordered six-class pairs, got ${pairs}`);

// Corrupted-but-parseable v19 state should normalize, not crash or leak hostile values.
installStorage();
const seedGame = makeGame();
assert(seedGame.start('warden', 'thornseer'));
const hostile = structuredClone(seedGame.snapshot());
const base = ITEM_BASES[0];
hostile.player.level = '999999999';
hostile.player.xp = -1e30;
hostile.player.x = -1e50;
hostile.player.y = 1e50;
hostile.player.hp = 'Infinity';
hostile.player.resource = 'NaN';
hostile.player.gold = -999;
hostile.player.materials = { cinders: 1e99, echoes: -40, shards: 'oops' };
hostile.player.covenant = { affinities: { grave: 1e99, blood: -1e99 }, stage: 999, instability: -5, dominant: ['bogus', 'grave', 'grave'] };
hostile.player.mutationProgress = { credits: 'Infinity', selections: null, unlocked: [null, 'bogus', 'bogus'], legacyConverted: false };
hostile.player.inventory = Array.from({ length: 250 }, (_, index) => ({
  id: index < 2 ? 'duplicate-id' : `hostile-${index}`,
  name: index === 0 ? '<img src=x onerror=globalThis.__saveInjection=1>' : `Relic ${index}`,
  description: '<script>globalThis.__saveInjection=1</script>',
  slot: base.slot, baseId: base.id, rarity: index % 2 ? 'mythic' : 'impossible', itemLevel: 1e20,
  masterwork: 999, corruption: 'text corruption', affixes: [{ stat: 'hp', label: '<b>bad</b>', value: 1e90, tier: 999 }]
}));
hostile.player.stash = hostile.player.inventory;
hostile.player.equipment = { weapon: hostile.player.inventory[0], nonsense: hostile.player.inventory[1] };
hostile.player.worldProgress = { zones: { gravewake: { corruption: 1e20, events: -5, liberated: 'yes' } }, discoveredDistricts: Array(500).fill('bogus') };
hostile.player.worldV2 = {
  tick: 'Infinity',
  regions: {
    gravewake: {
      pressure: 'Infinity', resolvedCount: 'Infinity', failedCount: -999,
      echoes: [{ typeId: 'gravewake-rising', modifiers: { hunterPressure: 'Infinity', bleedPower: 'Infinity', lootBias: ['grave'] }, outcome: 'bad', resolvedAt: 'Infinity' }]
    }
  },
  activeEvents: [{
    id: 'hostile-world-event', typeId: 'gravewake-rising', zoneId: 'gravewake',
    startedAt: 'Infinity', elapsed: 'Infinity', duration: 'Infinity', progress: 'Infinity', target: 'Infinity',
    modifiers: { enemyDensity: 'Infinity', hunterPressure: 'Infinity', bleedPower: 'Infinity', eliteRate: 'Infinity' }
  }],
  resolvedEvents: [{ id: 'resolved-hostile', typeId: 'gravewake-rising', zoneId: 'gravewake', resolvedAt: 'Infinity', outcome: 'bad' }],
  procession: { eventId: 'hostile-world-event', zoneId: 'bogus', routeIndex: 'Infinity', travel: 'Infinity' }
};
hostile.player.contracts = { active: Array(100).fill({ id: 'bogus' }), offers: Array(100).fill({ id: 'bogus' }), seals: 1e99 };
hostile.player.hunters = [null, {}, { id: '<bad>', level: 1e99, grudge: -1e99 }];
store.set(SAVE_KEY, JSON.stringify(hostile));
const hardened = makeGame();
assert.equal(hardened.continueRun(), true, 'parseable hostile v19 save must recover');
assertRuntimeBounds(hardened, 'hostile-v19');
assert.ok(hardened.player.inventory.length <= 60, 'inventory capacity enforced on restore');
assert.ok(hardened.player.stash.length <= 180, 'stash capacity enforced on restore');
assert.equal(hardened.player.level, MAX_LEVEL, 'oversized level clamped');
assert.ok(hardened.player.gold >= 0, 'negative gold rejected');
assert.ok(hardened.player.covenant.stage <= 5, 'covenant stage clamped');
assert.ok(hardened.player.worldProgress.zones.gravewake.corruption <= 100, 'world corruption clamped');
assert.ok(Number.isFinite(hardened.player.worldV2.tick), 'persistent world tick must be finite');
assert.ok(Number.isFinite(hardened.player.worldV2.regions.gravewake.pressure), 'persistent world pressure must be finite');
assert.ok(hardened.player.worldV2.regions.gravewake.pressure >= 0 && hardened.player.worldV2.regions.gravewake.pressure <= 5, 'persistent world pressure bounded');
assert.equal(globalThis.__saveInjection, undefined, 'save text must not execute during engine restore');

// Repeated save/restore must remain stable and finite.
for (let cycle = 0; cycle < 8; cycle += 1) {
  assert.equal(hardened.save(), true, `cycle ${cycle}: save`);
  const next = makeGame();
  assert.equal(next.continueRun(), true, `cycle ${cycle}: continue`);
  next.update(1 / 30);
  assertRuntimeBounds(next, `cycle-${cycle}`);
  Object.assign(hardened, next);
}

// Write failures must not abort the playable session and must be observable as a failed save.
installStorage();
const quotaGame = makeGame();
storageMode = 'write-throws';
assert.equal(quotaGame.start('warden', 'thornseer'), true, 'save quota failure must not block a new session');
assert.equal(quotaGame.save(), false, 'save quota failure must be reported');
assert.equal(quotaGame.state, 'playing', 'save quota failure must not terminate play');
storageMode = 'normal';

// Black Road frozen route state must survive a mid-stage restore without rerolling.
installStorage();
const road = makeGame();
road.random = () => 0.1;
assert(road.start('warden', 'thornseer'));
assert(road.startBlackRoadExpedition('funeral-road'));
const routeBefore = structuredClone(road.endgame.routeContext);
const stageBefore = road.endgame.activeStage?.id;
assert.ok(stageBefore, 'Black Road must spawn an active stage');
assert(road.save());
const roadReload = makeGame();
roadReload.random = () => 0.99;
assert(roadReload.continueRun());
assert.deepEqual(roadReload.endgame.routeContext, routeBefore, 'Black Road frozen context must not reroll');
assert.equal(roadReload.endgame.activeStage?.id, stageBefore, 'mid-stage restore must return to the same authored stage');
assertRuntimeBounds(roadReload, 'black-road-restore');

// A corrupted operation claiming every stage completed must never restore into an unwinnable empty route.
const corruptedRoad = structuredClone(road.snapshot());
const expedition = BLACK_ROAD_BY_ID[corruptedRoad.activeOperation.expeditionId];
corruptedRoad.activeOperation.completedStageIds = expedition.stages.map((stage) => stage.id);
corruptedRoad.activeOperation.pendingRoute = null;
store.set(SAVE_KEY, JSON.stringify(corruptedRoad));
const impossibleRoad = makeGame();
assert(impossibleRoad.continueRun(), 'corrupted completed-stage operation must recover the character');
if (impossibleRoad.endgame?.blackRoad && !impossibleRoad.endgame.completed) {
  const activeEnemies = impossibleRoad.entities.enemies.filter((enemy) => !enemy.dead && enemy.group === impossibleRoad.endgame.id);
  assert.ok(impossibleRoad.endgame.activeStage || impossibleRoad.endgame.pendingRoute || activeEnemies.length > 0,
    'restore must not leave a non-completed Black Road with no active stage, route choice, or enemies');
}

console.log(`runtime class-pair scenarios: ${pairs}`);
console.log('Ashen Covenant adversarial unintended-behavior audit passed.');
