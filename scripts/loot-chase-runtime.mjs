import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value), removeItem: (key) => store.delete(key) };
const { GameEngine } = await import('../src/systems/game.js');
const input = { pointer: { active: false, worldX: 0, worldY: 0 }, tick() {}, updateWorldPointer() {}, getMove() { return { x: 0, y: 0, moving: false }; }, isHeld() { return false; }, consume() { return false; }, defer() {}, rumble() {} };
const game = new GameEngine(input, { viewport: { width: 1280, height: 720, scale: 1 } }, { reducedVfx: true });
assert(game.start('warden', 'thornseer'));

const equip = (...ids) => {
  game.player.equipment = { weapon: null, offhand: null, head: null, chest: null, gloves: null, boots: null, amulet: null, ring: null };
  const slots = ['weapon','offhand','head','chest','gloves','boots','amulet','ring'];
  ids.forEach((uniqueId, index) => { game.player.equipment[slots[index]] = { id: `test-${uniqueId}`, uniqueId, rarity: uniqueId === 'worldspine' || uniqueId === 'vessel-of-silence' ? 'mythic' : 'unique', slot: slots[index], name: uniqueId, affixes: [], runeIds: [], masterwork: 0, masterworkExalts: [] }; });
  game._refreshPlayerStats(true);
};

assert.equal(typeof game._applyUniqueBehaviorEvent, 'function', 'GameEngine must execute normalized Unique behavior actions');

equip('rootmother-heart');
game.player.cooldowns.skillOne = 5; game.player.cooldowns.skillTwo = 4;
game._applyUniqueBehaviorEvent('enemy-killed', { enemy: { cursed: 2 }, source: 'damage' });
assert(game.player.cooldowns.skillOne < 5 && game.player.cooldowns.skillTwo < 4, 'Rootmother Heart must fold active cooldowns on cursed kills');

equip('regents-last-link');
game._applyUniqueBehaviorEvent('combat-hit', { hitResult: { guardBroken: true, staggered: false } });
assert(game.player.uniqueMomentum?.time > 0, 'Regent’s Last Link must create a real pressure window');

equip('map-of-five-edges');
game.player.cooldowns.skillTwo = 3;
game._applyUniqueBehaviorEvent('ability-cast', { slot: 'skillOne' });
assert(game.player.cooldowns.skillTwo < 3 && game.player.fiveEdgeIndex === 1, 'Map of Five Edges must rotate and fold another cooldown');

equip('cryptwardens-key');
const inventoryBefore = game.player.inventory.length;
game._applyUniqueBehaviorEvent('enemy-killed', { enemy: { elite: true, level: 20 }, source: 'execution' });
assert(game.player.inventory.length > inventoryBefore || game.entities.loot.length > 0, 'Cryptwarden’s Key must create an execution reward');

equip('drowned-sovereigns-crown');
const barrierBefore = game.player.barrier ?? 0;
game._applyUniqueBehaviorEvent('enemy-killed', { enemy: { cursed: 1 }, source: 'damage' });
assert((game.player.barrier ?? 0) > barrierBefore, 'Drowned Sovereign’s Crown must restore a real barrier');

equip('vessel-of-silence');
game._applyUniqueBehaviorEvent('player-damaged', { absorbed: 50 });
assert(game.player.silenceStored > 0, 'Vessel of Silence must store absorbed Barrier damage');

equip('accord-compass');
game._applyUniqueBehaviorEvent('world-event-resolved', { eventId: 'test-event' });
assert.equal(game.player.nextCacheBias, 1, 'Accord Compass must bias the next world cache');

equip('worldspine');
const hazardsBefore = game.entities.hazards.length;
game._applyUniqueBehaviorEvent('ultimate', { covenant: game.player.covenant });
assert(game.entities.hazards.length > hazardsBefore, 'Worldspine must create a Covenant rupture in the live world');

console.log('Ashen Covenant chase Unique runtime mechanics passed.');
