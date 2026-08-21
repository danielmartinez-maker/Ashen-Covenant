import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const dataDir = path.join(root, 'src', 'data');
const files = fs.readdirSync(dataDir).filter((name) => name.endsWith('.js')).sort();
const failures = [];
const reports = [];
let valuesVisited = 0;
let arraysAudited = 0;
let idCollectionsAudited = 0;
let objectsVisited = 0;

const fail = (file, trail, message) => failures.push(`${file}:${trail || '<root>'} ${message}`);
const primitiveOkay = (value) => value == null || ['string', 'boolean', 'function'].includes(typeof value);

const inspect = (file, value, trail, ancestors = new Set()) => {
  valuesVisited += 1;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail(file, trail, `contains non-finite number ${String(value)}`);
    return;
  }
  if (primitiveOkay(value)) return;
  if (typeof value === 'bigint' || typeof value === 'symbol') {
    fail(file, trail, `contains non-serializable ${typeof value}`);
    return;
  }
  if (typeof value !== 'object') return;
  if (ancestors.has(value)) return;
  const nextAncestors = new Set(ancestors);
  nextAncestors.add(value);

  if (Array.isArray(value)) {
    arraysAudited += 1;
    const idEntries = value.filter((entry) => entry && typeof entry === 'object' && typeof entry.id === 'string');
    if (idEntries.length >= 2) {
      idCollectionsAudited += 1;
      const seen = new Map();
      for (let index = 0; index < value.length; index += 1) {
        const entry = value[index];
        if (!entry || typeof entry !== 'object' || typeof entry.id !== 'string') continue;
        if (!entry.id.trim()) fail(file, `${trail}[${index}].id`, 'must not be blank');
        if (seen.has(entry.id)) fail(file, `${trail}[${index}].id`, `duplicates ${entry.id} first seen at index ${seen.get(entry.id)}`);
        else seen.set(entry.id, index);
      }
    }
    value.forEach((entry, index) => inspect(file, entry, `${trail}[${index}]`, nextAncestors));
    return;
  }

  objectsVisited += 1;
  if (Object.prototype.hasOwnProperty.call(value, 'id') && typeof value.id === 'string' && !value.id.trim()) fail(file, `${trail}.id`, 'must not be blank');
  for (const [key, child] of Object.entries(value)) inspect(file, child, trail ? `${trail}.${key}` : key, nextAncestors);
};

for (const file of files) {
  const module = await import(`${pathToFileURL(path.join(dataDir, file)).href}?audit=1`);
  const exportNames = Object.keys(module).sort();
  reports.push({ file, exports: exportNames.length, names: exportNames });
  for (const [name, value] of Object.entries(module)) inspect(file, value, name);
}

// Cross-module contracts with known runtime consumers.
const classes = await import('../src/data/classes.js');
const items = await import('../src/data/items.js');
const enemies = await import('../src/data/enemies.js');
const world = await import('../src/data/world.js');
const actionVfx = await import('../src/data/action-vfx.js');
const animation = await import('../src/data/animation-v7.js');
const equipmentAppearance = await import('../src/data/equipment-appearance-v7.js');

assert.ok(Array.isArray(classes.CLASS_IDS) && classes.CLASS_IDS.length >= 6, 'CLASS_IDS must expose every playable class');
assert.equal(new Set(classes.CLASS_IDS).size, classes.CLASS_IDS.length, 'CLASS_IDS must be unique');
for (const primary of classes.CLASS_IDS) {
  for (const secondary of classes.CLASS_IDS) {
    if (primary === secondary) continue;
    const hybrid = classes.getHybrid?.(primary, secondary);
    assert.ok(hybrid, `every ordered distinct class pair must resolve a hybrid: ${primary}+${secondary}`);
  }
}

const itemSlots = new Set((items.ITEM_BASES ?? []).map((item) => item.slot));
assert.ok(itemSlots.size >= 6, 'item bases must expose the equipment slot schema');
for (const unique of items.UNIQUES ?? []) {
  assert.ok(itemSlots.has(unique.slot), `unique ${unique.id} references unknown slot ${unique.slot}`);
  if (unique.rarity != null) assert.ok(['unique', 'mythic'].includes(unique.rarity), `unique ${unique.id} has invalid chase rarity ${unique.rarity}`);
}

const enemyIds = new Set(Object.keys(enemies.ENEMIES ?? {}));
for (const [id, enemy] of Object.entries(enemies.ENEMIES ?? {})) {
  assert.equal(typeof enemy.role, 'string', `enemy ${id} must define a role`);
  assert.ok(enemy.role.length > 0, `enemy ${id} role must not be blank`);
}
for (const encounter of enemies.ENCOUNTER_TEMPLATES ?? []) {
  for (const member of encounter.enemies ?? encounter.formation ?? []) {
    const enemyId = typeof member === 'string' ? member : member?.id ?? member?.enemyId;
    if (enemyId) assert.ok(enemyIds.has(enemyId), `encounter ${encounter.id} references missing enemy ${enemyId}`);
  }
}

const zoneIds = new Set((world.ZONES ?? []).map((zone) => zone.id));
assert.ok(zoneIds.size >= 6, 'world must expose authored zones');
for (const landmark of world.LANDMARKS ?? []) if (landmark.zoneId) assert.ok(zoneIds.has(landmark.zoneId), `landmark ${landmark.id} references missing zone ${landmark.zoneId}`);
for (const event of world.WORLD_EVENTS ?? []) if (event.zoneId) assert.ok(zoneIds.has(event.zoneId), `world event ${event.id} references missing zone ${event.zoneId}`);

assert.equal(actionVfx.ACTION_VFX_FRAME_COUNT, 8, 'action VFX frame contract must remain eight frames');
for (const [id, sheet] of Object.entries(actionVfx.ACTION_VFX_SHEETS ?? {})) {
  assert.ok(Number.isInteger(sheet.rows) && sheet.rows > 0, `action VFX sheet ${id} must define positive rows`);
  assert.ok(typeof sheet.src === 'string' && sheet.src.startsWith('/assets/'), `action VFX sheet ${id} must point to a public asset`);
}
for (const classId of classes.CLASS_IDS) assert.ok(animation.HERO_MOTION_ASSETS?.[classId], `class ${classId} is missing a v7 hero motion atlas`);

const signatureIds = new Set();
for (const [uniqueId, signature] of Object.entries(equipmentAppearance.UNIQUE_VISUAL_SIGNATURES ?? {})) {
  assert.ok((items.UNIQUES ?? []).some((item) => item.id === uniqueId), `equipment signature references missing unique ${uniqueId}`);
  assert.ok(!signatureIds.has(signature.id), `duplicate visual signature id ${signature.id}`);
  signatureIds.add(signature.id);
}
for (const unique of items.UNIQUES ?? []) {
  assert.ok(equipmentAppearance.UNIQUE_VISUAL_SIGNATURES?.[unique.id], `unique ${unique.id} is missing its authored v7 visual signature`);
}

if (failures.length) {
  console.error(`DATA INTEGRITY FAILURES: ${failures.length}`);
  failures.forEach((failure) => console.error(`  ${failure}`));
}
console.log(`data modules imported: ${files.length}`);
console.log(`exported values traversed: ${valuesVisited}`);
console.log(`objects traversed: ${objectsVisited}`);
console.log(`arrays audited: ${arraysAudited}`);
console.log(`ID-bearing collections audited: ${idCollectionsAudited}`);
for (const report of reports) console.log(`  ${report.file}: ${report.exports} exports`);
assert.equal(failures.length, 0, `${failures.length} recursive data integrity failure(s)`);
console.log('Ashen Covenant exhaustive data integrity audit passed.');
