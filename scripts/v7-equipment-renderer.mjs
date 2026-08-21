import assert from 'node:assert/strict';
import fs from 'node:fs';

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

console.log('Ashen Covenant v7 equipment renderer contract passed.');
