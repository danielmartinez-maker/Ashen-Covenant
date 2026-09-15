import assert from 'node:assert/strict';
import fs from 'node:fs';
const source = fs.readFileSync(new URL('../src/systems/renderer.js', import.meta.url), 'utf8');
assert.match(source, /player\.presentation\?\.equipmentAppearance/, 'renderer must consume presentation-owned equipment appearance');
assert.match(source, /EQUIPMENT_LAYER_ASSETS/, 'renderer must render manifest-owned equipment atlases');
assert.match(source, /_drawEquipmentLayers\(/, 'renderer must use the bounded v7 equipment layer pass');
assert.doesNotMatch(source, /player\.equipmentPresentation|\bweaponKey\b|\bauraKey\b/, 'legacy coarse equipment rendering must remain retired');
console.log('Ashen Covenant equipment presentation renderer contract passed.');
