import assert from 'node:assert/strict';
import fs from 'node:fs';
import { equipmentLayerOrderForFacing } from '../src/systems/renderer.js';

const source = fs.readFileSync(new URL('../src/systems/renderer.js', import.meta.url), 'utf8');
assert.match(source, /EQUIPMENT_LAYER_ASSETS/, 'renderer must consume the v7 equipment asset manifest');
assert.match(source, /equipmentLayers:\s*this\._loadImage\(EQUIPMENT_LAYER_ASSETS\.layers\.src\)/, 'renderer must preload the normal equipment atlas');
assert.match(source, /equipmentSignatures:\s*this\._loadImage\(EQUIPMENT_LAYER_ASSETS\.signatures\.src\)/, 'renderer must preload the chase-item signature atlas');
assert.match(source, /_drawEquipmentLayers\(/, 'renderer must expose a bounded pre-resolved equipment layer pass');
assert.match(source, /player\.presentation\?\.equipmentAppearance/, 'renderer must consume presentation-owned equipment appearance');
assert.match(source, /layer\.slot === 'amulet' \? anchors\.torso/, 'amulet signatures must anchor to the torso');
assert.match(source, /layer\.slot === 'ring' \? anchors\.hand/, 'ring signatures must anchor to the hand');
assert.doesNotMatch(source, /player\.equipmentPresentation/, 'renderer must not consume the legacy coarse appearance contract');
assert.doesNotMatch(source, /Object\.values\(player\.equipment/, 'renderer must not rescan inventory/equipment to decide appearance');
assert.doesNotMatch(source, /\bweaponKey\b|\bauraKey\b/, 'legacy Unique weapon/aura key branches must be removed');

const weapon = Object.freeze({ kind: 'slot', slot: 'weapon', order: 8 });
const offhand = Object.freeze({ kind: 'slot', slot: 'offhand', order: 7 });
const chest = Object.freeze({ kind: 'slot', slot: 'chest', order: 4 });
const signature = Object.freeze({ kind: 'signature', slot: 'weapon', order: 9 });
assert.equal(equipmentLayerOrderForFacing(weapon, 0), 8, 'east-facing weapon remains in the front pass');
assert.equal(equipmentLayerOrderForFacing(offhand, 0), 2, 'east-facing offhand must pass behind the body');
assert.equal(equipmentLayerOrderForFacing(weapon, 4), 2, 'west-facing mirrored weapon must pass behind the body');
assert.equal(equipmentLayerOrderForFacing(offhand, 4), 7, 'west-facing offhand remains in the front pass');
assert.equal(equipmentLayerOrderForFacing(weapon, 2), 8, 'vertical-facing weapon keeps authored front order');
assert.equal(equipmentLayerOrderForFacing(offhand, 6), 7, 'vertical-facing offhand keeps authored front order');
assert.equal(equipmentLayerOrderForFacing(chest, 4), 4, 'body armor order is unaffected by facing');
assert.equal(equipmentLayerOrderForFacing(signature, 4), 9, 'Unique signature order is unaffected by facing');
assert.match(source, /equipmentLayerOrderForFacing\(layer,/, 'equipment draw passes must consume facing-aware resolved order');

console.log('Ashen Covenant v7 equipment renderer contract passed.');
