import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, value),
  removeItem: (key) => store.delete(key)
};

const { WorldStateManager } = await import('../src/systems/world-state.js');
const world = new WorldStateManager();
let state = world.normalize(null);

const grave = world.startEvent(state, 'gravewake-rising', { zoneId: 'gravewake' });
assert.equal(grave.typeId, 'gravewake-rising');
let mods = world.modifiersForRegion(state, 'gravewake');
assert.equal(mods.corpseResurrection, true, 'Gravewake Rising must change corpse strategy');
assert(mods.enemyDensity > 1, 'Gravewake Rising must increase regional pressure');

const procession = world.startEvent(state, 'black-procession', { zoneId: 'gravewake' });
assert.equal(state.procession.eventId, procession.id);
const beforeZone = state.procession.zoneId;
world.update(state, 31);
assert.notEqual(state.procession.zoneId, beforeZone, 'Black Procession must physically advance between regions');
assert.equal(state.activeEvents.find((event) => event.id === procession.id)?.zoneId, state.procession.zoneId);

world.resolveEvent(state, grave.id, { outcome: 'destroyed-corpses' });
mods = world.modifiersForRegion(state, 'gravewake');
assert(mods.resolvedCount >= 1, 'event outcomes must remain part of persistent regional state');
assert(world.blackRoadModifiers(state, 'gravewake').lootBias.includes('grave'), 'regional state must feed Black Road reward pressure');

// Corrupted procession state must normalize to one coherent route location. The
// linked active event, procession zone, and route index may never disagree after load.
const corruptedProcession = world.normalize({
  tick: 90,
  activeEvents: [{ id: 'world-black-procession-corrupt', typeId: 'black-procession', zoneId: 'redfen', startedAt: 0, elapsed: 90, duration: 360, progress: 2, target: 8 }],
  procession: { eventId: 'world-black-procession-corrupt', zoneId: 'bellscar', routeIndex: 1, travel: 12 }
});
const linkedProcession = corruptedProcession.activeEvents.find((event) => event.id === corruptedProcession.procession?.eventId);
assert(linkedProcession, 'normalized procession must retain its linked active event');
assert.equal(corruptedProcession.procession.zoneId, linkedProcession.zoneId, 'procession zone must agree with linked active event after normalization');
assert.equal(corruptedProcession.procession.routeIndex, ['gravewake', 'redfen', 'cairnreach', 'veiled-road', 'bellscar'].indexOf(corruptedProcession.procession.zoneId), 'procession route index must agree with normalized zone');

// A stale procession pointer without its active Black Procession event must not
// survive normalization as a ghost route that continues moving across regions.
const ghostProcession = world.normalize({
  tick: 180,
  activeEvents: [],
  procession: { eventId: 'missing-procession-event', zoneId: 'cairnreach', routeIndex: 2, travel: 17 }
});
assert.equal(ghostProcession.procession, null, 'orphaned Procession state must be discarded during normalization');

// Event IDs are persistent identities. A corrupt save that repeats the same
// active event must not stack that event's pressure multiple times or leave a
// phantom duplicate behind after the event resolves.
const duplicateEventState = world.normalize({
  tick: 45,
  activeEvents: [
    { id: 'world-duplicate-event', typeId: 'blood-moon-hunt', zoneId: 'redfen', startedAt: 5, elapsed: 40, duration: 210, progress: 0, target: 1 },
    { id: 'world-duplicate-event', typeId: 'blood-moon-hunt', zoneId: 'redfen', startedAt: 5, elapsed: 40, duration: 210, progress: 0, target: 1 }
  ]
});
assert.equal(
  duplicateEventState.activeEvents.filter((event) => event.id === 'world-duplicate-event').length,
  1,
  'duplicate persisted active-event IDs must collapse to one normalized event'
);
world.resolveEvent(duplicateEventState, 'world-duplicate-event', { outcome: 'cleared' });
assert.equal(
  duplicateEventState.activeEvents.some((event) => event.id === 'world-duplicate-event'),
  false,
  'resolving a normalized event must not leave a duplicate active event behind'
);

// A persistent event ID cannot be both active and terminal. If corrupted save
// data contains the same identity in active and resolved histories, the terminal
// record wins and any linked Procession pointer must be discarded.
const lifecycleCollision = world.normalize({
  tick: 120,
  activeEvents: [
    { id: 'world-lifecycle-collision', typeId: 'black-procession', zoneId: 'redfen', startedAt: 0, elapsed: 120, duration: 360, progress: 3, target: 8 }
  ],
  resolvedEvents: [
    { id: 'world-lifecycle-collision', typeId: 'black-procession', zoneId: 'redfen', startedAt: 0, elapsed: 120, duration: 360, progress: 3, target: 8, resolved: true, failed: false, outcome: 'cleared', resolvedAt: 119 }
  ],
  procession: { eventId: 'world-lifecycle-collision', zoneId: 'redfen', routeIndex: 1, travel: 12 }
});
assert.equal(
  lifecycleCollision.activeEvents.some((event) => event.id === 'world-lifecycle-collision'),
  false,
  'terminal persistent-event history must suppress an active record with the same ID'
);
assert.equal(
  lifecycleCollision.resolvedEvents.filter((event) => event.id === 'world-lifecycle-collision').length,
  1,
  'terminal persistent-event identity must remain represented exactly once'
);
assert.equal(lifecycleCollision.procession, null, 'a terminal Black Procession event must not retain a live Procession route');

// The bounded terminal-history window must not make event identities reusable.
// With 40 terminal records at one tick, resolving and immediately restarting an
// event must allocate a new ID rather than colliding with the record just written.
const saturatedHistory = world.normalize({
  tick: 500,
  resolvedEvents: Array.from({ length: 40 }, (_, index) => ({
    id: `world-history-${index + 1}`,
    typeId: 'gravewake-rising',
    zoneId: 'gravewake',
    startedAt: index,
    elapsed: 1,
    duration: 240,
    progress: 1,
    target: 1,
    resolved: true,
    failed: false,
    outcome: 'cleared',
    resolvedAt: index + 1
  }))
});
const firstCappedEvent = world.startEvent(saturatedHistory, 'gravewake-rising', { zoneId: 'gravewake' });
world.resolveEvent(saturatedHistory, firstCappedEvent.id, { outcome: 'cleared' });
const secondCappedEvent = world.startEvent(saturatedHistory, 'gravewake-rising', { zoneId: 'gravewake' });
assert.notEqual(secondCappedEvent.id, firstCappedEvent.id, 'terminal-history trimming must never make a persistent event ID reusable');
const normalizedCappedHistory = world.normalize(saturatedHistory);
assert(
  normalizedCappedHistory.activeEvents.some((event) => event.id === secondCappedEvent.id),
  'a newly started event must survive normalization even after terminal history reaches its cap'
);

const { GameEngine } = await import('../src/systems/game.js');
const input = { pointer: { active: false, worldX: 0, worldY: 0 }, tick() {}, updateWorldPointer() {}, getMove() { return { x: 0, y: 0, moving: false }; }, isHeld() { return false; }, consume() { return false; }, defer() {}, rumble() {} };
const make = () => new GameEngine(input, { viewport: { width: 1280, height: 720, scale: 1 } }, { reducedVfx: true });
const game = make();
assert(game.start('warden', 'thornseer'));
assert.equal(typeof game.startPersistentWorldEvent, 'function', 'GameEngine must expose persistent world-event execution');
assert(game.startPersistentWorldEvent('blood-moon-hunt', 'redfen'));
const active = game.player.worldV2.activeEvents.find((event) => event.typeId === 'blood-moon-hunt');
assert(active, 'Blood Moon Hunt must enter persistent save state');
assert(game.entities.enemies.some((enemy) => enemy.persistentEventId === active.id), 'persistent world events must exist physically in the world');
game.save();

const restored = make();
assert(restored.continueRun(), 'v19 save with persistent world state must reload');
assert(restored.player.worldV2.activeEvents.some((event) => event.id === active.id), 'active persistent events must survive reload');
const roadMods = restored.getPersistentWorldModifiers('redfen');
assert(roadMods.hunterPressure > 0, 'Blood Moon Hunt must increase Hunter pressure after reload');
assert(restored.getBlackRoadWorldModifiers('redfen').enemyDensity >= roadMods.enemyDensity, 'Black Road must consume persistent regional modifiers');

console.log('Ashen Covenant persistent living-world regression passed.');