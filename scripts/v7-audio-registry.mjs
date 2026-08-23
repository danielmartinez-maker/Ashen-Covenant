import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AUDIO_ASSETS_V7,
  AUDIO_CATEGORY_BUDGETS,
  AUDIO_REQUIRED_EVENT_FAMILIES,
  AUDIO_SEMANTIC_DEFINITIONS,
  audioAsset,
  audioDefinition
} from '../src/data/audio-v7.js';

const requiredFamilies = [
  'weapon-swing', 'projectile-launch', 'projectile-pass', 'projectile-impact', 'physical-impact', 'guard-impact', 'guard-break',
  'armor-impact', 'poise-break', 'stagger', 'knockdown', 'spell-cast', 'spell-sustain', 'spell-release', 'spell-impact', 'spell-field', 'summon',
  'covenant-accent', 'dodge', 'execution-start', 'execution-contact', 'execution-finish', 'enemy-effort', 'enemy-hurt', 'enemy-death', 'enemy-command',
  'hunter-intrusion', 'hunter-signature', 'boss-telegraph', 'boss-phase', 'boss-signature', 'boss-stagger', 'boss-death', 'footstep', 'destruction',
  'loot-drop', 'loot-pickup', 'unique-reveal', 'ui-confirm', 'ui-error', 'ui-warning', 'regional-ambience'
];

assert.deepEqual([...AUDIO_REQUIRED_EVENT_FAMILIES], requiredFamilies);
for (const id of requiredFamilies) assert.ok(audioDefinition(id), `${id} must resolve`);
assert.equal(AUDIO_CATEGORY_BUDGETS.total, 36);
assert.equal(AUDIO_CATEGORY_BUDGETS.enemyVocal, 6);
assert.equal(AUDIO_CATEGORY_BUDGETS.footstep, 8);
assert.equal(AUDIO_CATEGORY_BUDGETS.impact, 10);
assert.equal(AUDIO_CATEGORY_BUDGETS.ambience, 4);
for (const [id, definition] of Object.entries(AUDIO_SEMANTIC_DEFINITIONS)) {
  assert.equal(definition.id, id);
  assert.ok(definition.assets.length >= 1, `${id} needs at least one asset`);
  assert.ok(definition.maxLayers >= 1 && definition.maxLayers <= 4, `${id} layer budget must be bounded`);
  for (const assetId of definition.assets) assert.ok(audioAsset(assetId), `${id} references missing ${assetId}`);
}
for (const affinity of ['flame', 'grave', 'blood', 'light', 'storm', 'void']) assert.ok(audioAsset(`cov-${affinity}`));
assert.ok(Object.values(AUDIO_ASSETS_V7).some((asset) => asset.legacy === true), 'intentional v5 reuse must be explicit');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const asset of Object.values(AUDIO_ASSETS_V7).filter((entry) => !entry.legacy)) {
  const file = path.join(root, 'public', asset.src.replace(/^\//, ''));
  assert.equal(fs.existsSync(file), true, `${asset.id} must exist`);
  const bytes = fs.readFileSync(file);
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.toString('ascii', 8, 12), 'WAVE');
  assert.equal(bytes.readUInt16LE(20), 1, `${asset.id} must use PCM`);
  assert.equal(bytes.readUInt16LE(22), 1, `${asset.id} must be mono`);
  assert.equal(bytes.readUInt32LE(24), 48000, `${asset.id} must be 48 kHz`);
  assert.equal(bytes.readUInt16LE(34), 16, `${asset.id} must be 16-bit`);
  assert.ok(bytes.length > 44 + 48000 * 2 * 0.05, `${asset.id} must contain audible data`);
}

console.log('Ashen Covenant v7 semantic audio registry regression passed.');
