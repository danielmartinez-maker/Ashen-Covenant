import assert from 'node:assert/strict';
import { LOOT_SOURCES } from '../src/data/items.js';

const store = new Map();
globalThis.localStorage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value), removeItem: (key) => store.delete(key) };
const { GameEngine } = await import('../src/systems/game.js');
const input = { pointer: { active: false, worldX: 0, worldY: 0 }, tick() {}, updateWorldPointer() {}, getMove() { return { x: 0, y: 0, moving: false }; }, isHeld() { return false; }, consume() { return false; }, defer() {}, rumble() {} };
const game = new GameEngine(input, { viewport: { width: 1280, height: 720, scale: 1 } }, { reducedVfx: true });
assert(game.start('warden', 'thornseer'));
assert.ok(game.lootSystem, 'GameEngine must delegate loot rules to LootSystem');

const source = LOOT_SOURCES.find((entry) => entry.id === 'gravewake');
const pool = game._eligibleUniques('gravewake', 'unique');
const eligibleSourceIds = source.uniqueIds.filter((id) => { const u = game.lootSystem ? game.lootSystem.behaviorFor(id) && null : null; return true; });
// Class/hybrid restrictions may remove entries, but the surviving IDs must retain source order.
assert.deepEqual(pool.map((u) => u.id), source.uniqueIds.filter((id) => pool.some((u) => u.id === id)), 'engine source eligibility must preserve authored order among eligible entries');

game.player.equipment.weapon = { id: 'test-worldspine', uniqueId: 'worldspine', rarity: 'mythic', slot: 'weapon', name: 'Worldspine', affixes: [], runeIds: [], masterwork: 0, masterworkExalts: [] };
game._refreshPlayerStats(true);
const resolved = game.getResolvedAbility('skillOne');
assert.ok(resolved.equipmentHooks.includes('worldspine-rupture'), 'resolved abilities must consume equipped Unique hooks');
assert.equal(game.player.equipmentPresentation.weaponKey, 'worldspine-rupture', 'stat refresh must publish equipment presentation state');

console.log('Ashen Covenant LootSystem engine integration passed.');
