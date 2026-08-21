import assert from 'node:assert/strict';
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
const debug = resolver.debug();
assert.ok(debug.hits >= 1 && debug.misses >= 2);

console.log('Ashen Covenant v7 equipment appearance resolver regression passed.');
