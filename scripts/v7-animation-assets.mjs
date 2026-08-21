import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HERO_MOTION_ASSETS } from '../src/data/animation-v7.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const asset of Object.values(HERO_MOTION_ASSETS)) {
  const relative = asset.src.replace(/^\/assets\//, '');
  const bytes = readFileSync(path.join(root, 'public', 'assets', relative));
  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${asset.id} must be PNG`);
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  assert.equal(width % asset.columns, 0, `${asset.id} width must fit ${asset.columns} columns`);
  assert.equal(height % (asset.facingLanes * asset.sourceStates), 0, `${asset.id} height must fit ${asset.facingLanes * asset.sourceStates} rows`);
  assert.equal(bytes[25], 6, `${asset.id} must preserve alpha`);
}

const { validateV7AnimationData } = await import('../src/presentation/validator.js');
const validation = validateV7AnimationData();
assert.equal(validation.valid, true, validation.issues.map((entry) => `${entry.code}: ${entry.message}`).join('\n'));
assert.equal(validation.summary.assets, 6);
assert.equal(validation.summary.clips, 120);

console.log('Ashen Covenant v7 hero animation asset regression passed.');
