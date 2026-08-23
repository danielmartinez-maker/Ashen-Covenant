import assert from 'node:assert/strict';
import fs from 'node:fs';
import { EquipmentAppearanceResolver, equipmentAppearanceRevisionKey } from '../src/presentation/equipment-appearance-v7.js';
import { resolveCovenantPresentationIdentity } from '../src/presentation/covenant-identity.js';

const equipment = {
  weapon: { id: 'item-a', slot: 'weapon', baseId: 'cleaver', rarity: 'unique', uniqueId: 'bell-sunder', masterworkRank: 8, corruption: 2 },
  chest: { id: 'item-b', slot: 'chest', baseId: 'cairn-plate', rarity: 'relic', masterworkRank: 4, corruption: 0 },
  head: { id: 'item-c', slot: 'head', baseId: 'cinder-mask', rarity: 'rare' }
};
const covenant = resolveCovenantPresentationIdentity({ primary: 'grave', stage: 5, instability: 12 }, {});
const resolver = new EquipmentAppearanceResolver();
const first = resolver.resolve(equipment, covenant, { reducedVfx: false });
const second = resolver.resolve(equipment, covenant, { reducedVfx: false });
assert.equal(first, second, 'stable revision must hit cache');
assert.equal(first.signatureIds.includes('unique:bell-sunder'), true);
assert.equal(first.layers.some((layer) => layer.kind === 'signature' && layer.requiredIdentity), true);
assert.equal(first.layers.some((layer) => layer.kind === 'covenant'), true);
assert.equal(first.masterworkTier, 2);
assert.equal(first.corruptionTier, 2);
const reduced = resolver.resolve(equipment, covenant, { reducedVfx: true });
assert.equal(reduced.layers.some((layer) => layer.kind === 'signature' && layer.requiredIdentity), true, 'signature identity survives reduced VFX');
assert.notEqual(first, reduced, 'settings are part of cache key');
assert.notEqual(
  equipmentAppearanceRevisionKey(equipment, covenant),
  equipmentAppearanceRevisionKey({ ...equipment, weapon: { ...equipment.weapon, masterworkRank: 9 } }, covenant)
);

const accessoryOnly = {
  amulet: {
    id: 'accessory-bloodroot', slot: 'amulet', baseId: 'obelisk-charm', rarity: 'unique', uniqueId: 'bloodroot-idol',
    masterwork: 12, corruption: 'Forbidden precision; Fractured armor'
  },
  ring: {
    id: 'accessory-gutter', slot: 'ring', baseId: 'veilbreaker-ring', rarity: 'unique', uniqueId: 'gutter-star', masterwork: 4
  }
};
const accessoryAppearance = resolver.resolve(accessoryOnly, covenant, { reducedVfx: false });
assert.ok(accessoryAppearance.signatureIds.includes('unique:bloodroot-idol'), 'Unique amulets must preserve their authored visual signature');
assert.ok(accessoryAppearance.signatureIds.includes('unique:gutter-star'), 'Unique rings must preserve their authored visual signature');
assert.ok(accessoryAppearance.layers.some((layer) => layer.kind === 'signature' && layer.slot === 'amulet'), 'amulet identity must reach the bounded layer stack');
assert.ok(accessoryAppearance.layers.some((layer) => layer.kind === 'signature' && layer.slot === 'ring'), 'ring identity must reach the bounded layer stack');
assert.equal(accessoryAppearance.masterworkTier, 3, 'accessory Masterwork must contribute to aggregate appearance progression');
assert.equal(accessoryAppearance.corruptionTier, 1, 'production text-form corruption must produce a visible corruption tier');
assert.equal(accessoryAppearance.rarity, 'unique', 'accessory rarity must contribute to aggregate material identity');
assert.notEqual(
  equipmentAppearanceRevisionKey({}, covenant),
  equipmentAppearanceRevisionKey(accessoryOnly, covenant),
  'accessory identity must participate in cache invalidation'
);

const debug = resolver.debug();
assert.ok(debug.hits >= 1 && debug.misses >= 3);

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key)
};
const { GameEngine } = await import('../src/systems/game.js');
const { GamePresentationSystem } = await import('../src/presentation/system.js');
const input = {
  pointer: { active: false, worldX: 0, worldY: 0 }, tick() {}, updateWorldPointer() {},
  getMove() { return { x: 0, y: 0, moving: false }; }, getAimDirection() { return null; },
  isHeld() { return false; }, consume() { return false; }, defer() {}, press() {}, rumble() {}
};
const game = new GameEngine(input, { viewport: { width: 1280, height: 720, scale: 1 }, getAssetStatus: () => ({ ready: true, failed: [] }) }, { sound: false, reducedVfx: true });
const presentation = new GamePresentationSystem(game, { input, settings: game.settings, audio: null, strictEvents: true });
assert.equal(game.start('warden', 'thornseer'), true);
game.player.equipment.weapon = { id: 'live-bell', slot: 'weapon', baseId: 'cleaver', rarity: 'unique', uniqueId: 'bell-sunder' };
presentation.update(1 / 60);
assert.equal(game.player.presentation.equipmentAppearance.signatureIds.includes('unique:bell-sunder'), true);
assert.equal(presentation.getDebugSnapshot().equipmentAppearance.cache.size >= 1, true);

const gameSource = fs.readFileSync(new URL('../src/systems/game.js', import.meta.url), 'utf8');
const lootSource = fs.readFileSync(new URL('../src/systems/loot.js', import.meta.url), 'utf8');
assert.doesNotMatch(gameSource, /player\.equipmentPresentation\s*=/, 'v7 live appearance must not be assigned by GameEngine stat refresh');
assert.doesNotMatch(lootSource, /\bpresentationForEquipment\s*\(/, 'LootSystem must not expose live equipment presentation authority');

console.log('Ashen Covenant v7 equipment appearance resolver regression passed.');
