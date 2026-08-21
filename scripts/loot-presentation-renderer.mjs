import assert from 'node:assert/strict';
import fs from 'node:fs';
const source = fs.readFileSync(new URL('../src/systems/renderer.js', import.meta.url), 'utf8');
assert.match(source, /player\.equipmentPresentation/, 'renderer must consume the resolved equipment presentation contract');
assert.match(source, /weaponKey/, 'renderer must render a Unique-specific weapon presentation key');
assert.match(source, /auraKey/, 'renderer must render a Unique/Covenant-specific aura presentation key');
console.log('Ashen Covenant equipment presentation renderer contract passed.');
