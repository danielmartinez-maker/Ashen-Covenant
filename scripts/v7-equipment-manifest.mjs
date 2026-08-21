import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ITEM_BASES, UNIQUES, UNIQUE_VISUAL_SIGNATURE_IDS } from '../src/data/items.js';
import {
  EQUIPMENT_LAYER_ASSETS,
  EQUIPMENT_SLOT_FAMILIES,
  RARITY_MATERIALS,
  UNIQUE_VISUAL_SIGNATURES,
  equipmentBaseFamily,
  uniqueSignature
} from '../src/data/equipment-appearance-v7.js';

assert.equal(Object.keys(UNIQUE_VISUAL_SIGNATURE_IDS).length, UNIQUES.length);
for (const unique of UNIQUES) {
  const signatureId = UNIQUE_VISUAL_SIGNATURE_IDS[unique.id];
  assert.equal(signatureId, `unique:${unique.id}`);
  const signature = uniqueSignature(unique.id);
  assert.equal(signature.id, signatureId);
  assert.equal(signature.slot, unique.slot);
  assert.ok(Number.isInteger(signature.cell) && signature.cell >= 0);
  assert.ok(signature.glyph.length >= 1);
  assert.equal(signature.preserveWhenReduced, true);
}
for (const base of ITEM_BASES) assert.ok(equipmentBaseFamily(base.id, base.slot), `${base.id} needs a visible family`);
for (const rarity of ['common', 'magic', 'rare', 'relic', 'unique', 'mythic']) assert.ok(RARITY_MATERIALS[rarity]);
assert.equal(EQUIPMENT_LAYER_ASSETS.layers.src, '/assets/equipment/v7/equipment-layers-v7.svg');
assert.equal(EQUIPMENT_LAYER_ASSETS.signatures.src, '/assets/equipment/v7/equipment-signatures-v7.svg');
assert.deepEqual(Object.keys(EQUIPMENT_SLOT_FAMILIES).sort(), ['boots', 'chest', 'gloves', 'head', 'offhand', 'weapon']);
assert.equal(Object.keys(UNIQUE_VISUAL_SIGNATURES).length, UNIQUES.length);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const asset of Object.values(EQUIPMENT_LAYER_ASSETS)) {
  const file = path.join(root, 'public', asset.src.replace(/^\//, ''));
  assert.equal(fs.existsSync(file), true, `${asset.id} must exist`);
  const svg = fs.readFileSync(file, 'utf8');
  assert.match(svg, /<svg[^>]+viewBox=/, `${asset.id} must be an SVG atlas`);
}

console.log('Ashen Covenant v7 equipment appearance manifest regression passed.');
