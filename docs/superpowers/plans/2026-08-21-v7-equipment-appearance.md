# Ashen Covenant v7 Equipment Appearance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make equipped gear, Relic/Unique/Mythic identity, Masterworking/corruption state, and Covenant affinity visibly alter the live player while keeping equipment stats and save state authoritative in existing gameplay systems.

**Architecture:** Add a data-only equipment appearance manifest, deterministic SVG atlas generation, and a pure cached `EquipmentAppearanceResolver`. `GamePresentationSystem` resolves appearance from authoritative equipment/Covenant state; `Renderer` executes a bounded layer stack using the same v7 body clip/facing/anchor contract created in Plan 1. `LootSystem` stops owning live renderer-specific presentation keys.

**Tech Stack:** JavaScript ES modules, Node.js built-ins for deterministic SVG generation/tests, Canvas 2D `drawImage`, existing item/loot data, existing v7 presentation context/animation resolvers.

**Spec:** `docs/superpowers/specs/2026-08-21-v7-embodied-covenant-design.md`

## Global Constraints

- This plan starts only after `npm run test:v7:animation` and `npm run test:v6` pass on `v7-embodied-covenant`.
- Do not change item stats, affixes, equip rules, drop rates, save schema, or loot behavior to support visuals.
- Appearance derives from equipped item identity and Covenant state; no resolved atlas/image/cache objects are persisted.
- Common, Magic, Rare, and Relic items use family-level visual treatments; random affix rolls do not create new art combinations.
- Every current entry in `UNIQUES` receives a stable visual signature ID and a valid signature profile.
- At least one silhouette/material/glyph cue for each Unique/Mythic remains when `reducedVfx` is true.
- Covenant treatment is applied after item identity and may not hide chase-item identity.
- The renderer owns draw order; the resolver returns layer metadata only.
- Appearance resolution is cached until relevant equipment/Covenant revision data changes; no full inventory scan per frame.
- New equipment assets live only under `public/assets/equipment/v7/` and are referenced by manifest IDs.
- Every production change follows RED -> GREEN -> relevant regression -> commit.

---

## File Structure

### New files

- `src/data/equipment-appearance-v7.js` — slot families, atlas manifests, rarity/material treatments, Unique/Mythic signature profiles.
- `src/presentation/equipment-appearance-v7.js` — pure resolver, revision key, bounded layer description, cache stats.
- `scripts/generate-equipment-v7-assets.mjs` — deterministic SVG atlas generator for slot layers and unique signature glyphs.
- `public/assets/equipment/v7/equipment-layers-v7.svg` — generated slot/family layer atlas.
- `public/assets/equipment/v7/equipment-signatures-v7.svg` — generated Unique/Mythic signature atlas.
- `scripts/v7-equipment-manifest.mjs` — coverage/asset/metadata regression.
- `scripts/v7-equipment-resolver.mjs` — deterministic cache/Covenant/reduced-VFX regression.
- `scripts/v7-equipment-renderer.mjs` — static and live renderer contract regression.

### Focused modifications

- `src/data/items.js` — export stable `UNIQUE_VISUAL_SIGNATURE_IDS` keyed by every existing Unique/Mythic ID.
- `src/presentation/combat-context-v7.js` — expose visual signature IDs/masterwork/corruption from equipped item state.
- `src/presentation/system.js` — own one `EquipmentAppearanceResolver` and publish cached appearance to the player.
- `src/systems/renderer.js` — load the two manifest-owned equipment atlases and draw the bounded layer stack.
- `src/systems/loot.js` — retire renderer-specific `presentationForEquipment()` as live ownership; retain only compatibility if an existing legacy regression still reads it.
- `src/systems/game.js` — stop recomputing coarse `player.equipmentPresentation` during stat refresh once no live consumer requires it.
- `src/presentation/validator.js` — validate signatures, layer bounds, manifest references, cache/runtime state.
- `package.json` — add `test:v7:equipment`; do not bump release version yet.

---

### Task 1: Establish stable Unique/Mythic visual identities

**Files:**
- Modify: `src/data/items.js`
- Create: `src/data/equipment-appearance-v7.js`
- Create: `scripts/v7-equipment-manifest.mjs`

**Interfaces:**
- Consumes: `ITEM_BASES`, `RARITIES`, `UNIQUES`.
- Produces: `UNIQUE_VISUAL_SIGNATURE_IDS`, `EQUIPMENT_LAYER_ASSETS`, `EQUIPMENT_SLOT_FAMILIES`, `RARITY_MATERIALS`, `UNIQUE_VISUAL_SIGNATURES`, `equipmentBaseFamily(baseId, slot)`, `uniqueSignature(uniqueId)`.

- [ ] **Step 1: Write the failing manifest coverage test**

Create `scripts/v7-equipment-manifest.mjs`:

```js
import assert from 'node:assert/strict';
import { ITEM_BASES, UNIQUES, UNIQUE_VISUAL_SIGNATURE_IDS } from '../src/data/items.js';
import { EQUIPMENT_LAYER_ASSETS, EQUIPMENT_SLOT_FAMILIES, RARITY_MATERIALS, UNIQUE_VISUAL_SIGNATURES, equipmentBaseFamily, uniqueSignature } from '../src/data/equipment-appearance-v7.js';

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
console.log('Ashen Covenant v7 equipment appearance manifest regression passed.');
```

- [ ] **Step 2: Run and verify RED**

```bash
node scripts/v7-equipment-manifest.mjs
```

Expected: failure because the new exports/modules do not exist.

- [ ] **Step 3: Export stable visual signature IDs from item data**

Immediately after the `UNIQUES` declaration in `src/data/items.js`, add:

```js
export const UNIQUE_VISUAL_SIGNATURE_IDS = Object.freeze(Object.fromEntries(
  UNIQUES.map((unique) => [unique.id, `unique:${unique.id}`])
));
```

Do not mutate the existing Unique objects or their gameplay fields.

- [ ] **Step 4: Add the appearance manifest**

Create `src/data/equipment-appearance-v7.js` with a six-slot visual family table and deterministic signature metadata. Use slot identity plus base tags rather than affix rolls:

```js
import { ITEM_BASES, UNIQUES, UNIQUE_VISUAL_SIGNATURE_IDS } from './items.js';

export const EQUIPMENT_LAYER_ASSETS = Object.freeze({
  layers: Object.freeze({ id: 'equipment-layers-v7', src: '/assets/equipment/v7/equipment-layers-v7.svg', columns: 4, rows: 6, required: true }),
  signatures: Object.freeze({ id: 'equipment-signatures-v7', src: '/assets/equipment/v7/equipment-signatures-v7.svg', columns: 8, rows: Math.max(1, Math.ceil(UNIQUES.length / 8)), required: true })
});

export const EQUIPMENT_SLOT_FAMILIES = Object.freeze({
  weapon: Object.freeze(['blade', 'focus', 'flail', 'sabre']),
  offhand: Object.freeze(['bulwark', 'censer', 'mirror', 'focus']),
  head: Object.freeze(['mask', 'circlet', 'hood', 'crown']),
  chest: Object.freeze(['coat', 'plate', 'raiment', 'bastion']),
  gloves: Object.freeze(['gauntlet', 'hexweave', 'grip', 'bracer']),
  boots: Object.freeze(['road', 'gallows', 'rift', 'plate'])
});

export const RARITY_MATERIALS = Object.freeze({
  common: Object.freeze({ trim: 0, emissive: 0, material: 'worn' }),
  magic: Object.freeze({ trim: 1, emissive: 0.04, material: 'tempered' }),
  rare: Object.freeze({ trim: 2, emissive: 0.07, material: 'etched' }),
  relic: Object.freeze({ trim: 3, emissive: 0.10, material: 'relic' }),
  unique: Object.freeze({ trim: 4, emissive: 0.14, material: 'unique' }),
  mythic: Object.freeze({ trim: 5, emissive: 0.18, material: 'mythic' })
});

const familyFromBase = (base) => {
  if (!base) return 'neutral';
  const tags = new Set(base.tags ?? []);
  if (base.slot === 'weapon') return base.id.includes('flail') ? 'flail' : base.id.includes('sabre') ? 'sabre' : tags.has('arcane') ? 'focus' : 'blade';
  if (base.slot === 'offhand') return base.id.includes('bulwark') ? 'bulwark' : base.id.includes('censer') ? 'censer' : base.id.includes('mirror') ? 'mirror' : 'focus';
  if (base.slot === 'head') return base.id.includes('mask') ? 'mask' : base.id.includes('circlet') ? 'circlet' : base.id.includes('hood') ? 'hood' : 'crown';
  if (base.slot === 'chest') return base.id.includes('plate') ? 'plate' : base.id.includes('raiment') ? 'raiment' : base.id.includes('coat') ? 'coat' : 'bastion';
  if (base.slot === 'gloves') return base.id.includes('hexweave') ? 'hexweave' : base.id.includes('grip') ? 'grip' : 'gauntlet';
  if (base.slot === 'boots') return base.id.includes('gallows') ? 'gallows' : base.id.includes('rift') ? 'rift' : 'road';
  return 'neutral';
};

const BASE_FAMILIES = Object.freeze(Object.fromEntries(ITEM_BASES.map((base) => [base.id, familyFromBase(base)])));
export const equipmentBaseFamily = (baseId, slot = null) => BASE_FAMILIES[baseId] ?? EQUIPMENT_SLOT_FAMILIES[slot]?.[0] ?? 'neutral';

const glyphs = ['◆', '✦', '☉', '✹', '◇', '†', '⛓', '☾', '♮', '⬡', '☠', '☼', '◐', '⚚', '✷', '⌁'];
export const UNIQUE_VISUAL_SIGNATURES = Object.freeze(Object.fromEntries(UNIQUES.map((unique, index) => {
  const id = UNIQUE_VISUAL_SIGNATURE_IDS[unique.id];
  return [unique.id, Object.freeze({
    id, uniqueId: unique.id, slot: unique.slot, cell: index, glyph: glyphs[index % glyphs.length],
    silhouette: `${unique.slot}:${(index * 7 + unique.id.length) % 5}`,
    material: unique.rarity === 'mythic' ? 'mythic' : 'unique',
    trailVariant: index % 4, impactVariant: index % 5, preserveWhenReduced: true
  })];
}));
export const uniqueSignature = (uniqueId) => UNIQUE_VISUAL_SIGNATURES[uniqueId] ?? null;
```

- [ ] **Step 5: Run the manifest regression**

```bash
node scripts/v7-equipment-manifest.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/items.js src/data/equipment-appearance-v7.js scripts/v7-equipment-manifest.mjs
git commit -m "feat: define v7 equipment visual identities"
```

---

### Task 2: Generate deterministic equipment SVG atlases

**Files:**
- Create: `scripts/generate-equipment-v7-assets.mjs`
- Create: `public/assets/equipment/v7/equipment-layers-v7.svg`
- Create: `public/assets/equipment/v7/equipment-signatures-v7.svg`
- Modify: `scripts/v7-equipment-manifest.mjs`

**Interfaces:**
- Consumes: equipment manifest and `UNIQUES`.
- Produces: two deterministic UTF-8 SVG atlases whose viewboxes match their manifest grid.

- [ ] **Step 1: Write failing asset-existence assertions**

Append to `scripts/v7-equipment-manifest.mjs`:

```js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const asset of Object.values(EQUIPMENT_LAYER_ASSETS)) {
  const file = path.join(root, 'public', asset.src.replace(/^\//, ''));
  assert.equal(fs.existsSync(file), true, `${asset.id} must exist`);
  const svg = fs.readFileSync(file, 'utf8');
  assert.match(svg, /<svg[^>]+viewBox=/, `${asset.id} must be an SVG atlas`);
}
```

- [ ] **Step 2: Run and verify RED**

```bash
node scripts/v7-equipment-manifest.mjs
```

Expected: fail because the atlas files do not exist.

- [ ] **Step 3: Add the deterministic SVG generator**

Create `scripts/generate-equipment-v7-assets.mjs`. The generator must not need a graphics dependency; it writes SVG text directly. Use one 256×256 cell per family/signature and stable hash-derived rune geometry:

```js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EQUIPMENT_SLOT_FAMILIES, UNIQUE_VISUAL_SIGNATURES } from '../src/data/equipment-appearance-v7.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public', 'assets', 'equipment', 'v7');
fs.mkdirSync(out, { recursive: true });
const esc = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const hash = (text) => [...text].reduce((value, char) => ((value * 33) ^ char.charCodeAt(0)) >>> 0, 5381);
const rune = (id) => {
  const seed = hash(id);
  const points = Array.from({ length: 6 }, (_, index) => {
    const angle = (index / 6) * Math.PI * 2 + ((seed >>> (index * 3)) & 7) * 0.04;
    const radius = 42 + ((seed >>> (index * 4)) & 15) * 2;
    return `${128 + Math.cos(angle) * radius},${128 + Math.sin(angle) * radius}`;
  }).join(' ');
  return `<polygon points="${points}" fill="none" stroke="white" stroke-width="10" stroke-linejoin="round"/><circle cx="128" cy="128" r="18" fill="white" opacity=".82"/>`;
};
const familyShape = (slot, family, cell) => {
  const x = (cell % 4) * 256;
  const y = Math.floor(cell / 4) * 256;
  const body = slot === 'weapon' ? '<path d="M52 188 L174 66 L202 52 L188 80 L76 204 Z"/>'
    : slot === 'offhand' ? '<path d="M64 72 Q128 34 192 72 L178 178 Q128 220 78 178 Z"/>'
    : slot === 'head' ? '<path d="M70 174 L76 74 Q128 38 180 74 L186 174 L154 204 L102 204 Z"/>'
    : slot === 'chest' ? '<path d="M74 62 L112 48 L128 68 L144 48 L182 62 L202 190 L158 214 L98 214 L54 190 Z"/>'
    : slot === 'gloves' ? '<path d="M78 88 L116 66 L144 90 L164 172 L112 202 L76 162 Z"/>'
    : '<path d="M86 54 L150 54 L166 158 L204 190 L188 212 L110 212 L84 178 Z"/>';
  return `<g transform="translate(${x} ${y})" fill="white" opacity=".92">${body}<text x="128" y="238" text-anchor="middle" font-size="18" fill="white">${esc(family)}</text></g>`;
};

const layerEntries = Object.entries(EQUIPMENT_SLOT_FAMILIES).flatMap(([slot, families]) => families.map((family) => [slot, family]));
const layerCells = 24;
const layerSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1536" viewBox="0 0 1024 1536">${Array.from({ length: layerCells }, (_, index) => {
  const [slot = 'boots', family = 'neutral'] = layerEntries[index] ?? ['boots', 'neutral'];
  return familyShape(slot, family, index);
}).join('')}</svg>`;
fs.writeFileSync(path.join(out, 'equipment-layers-v7.svg'), layerSvg);

const signatures = Object.values(UNIQUE_VISUAL_SIGNATURES);
const rows = Math.max(1, Math.ceil(signatures.length / 8));
const signatureSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="${rows * 256}" viewBox="0 0 2048 ${rows * 256}">${signatures.map((signature) => {
  const x = (signature.cell % 8) * 256;
  const y = Math.floor(signature.cell / 8) * 256;
  return `<g transform="translate(${x} ${y})">${rune(signature.id)}<text x="128" y="230" text-anchor="middle" font-size="42" fill="white">${esc(signature.glyph)}</text></g>`;
}).join('')}</svg>`;
fs.writeFileSync(path.join(out, 'equipment-signatures-v7.svg'), signatureSvg);
console.log(`Generated ${layerEntries.length} equipment families and ${signatures.length} chase-item signatures.`);
```

- [ ] **Step 4: Generate the committed atlases**

```bash
node scripts/generate-equipment-v7-assets.mjs
```

Expected: creates both SVGs and prints the number of equipment families and signatures.

- [ ] **Step 5: Run manifest regression**

```bash
node scripts/v7-equipment-manifest.mjs
```

Expected: PASS.

- [ ] **Step 6: Verify deterministic generation**

```bash
sha256sum public/assets/equipment/v7/equipment-layers-v7.svg public/assets/equipment/v7/equipment-signatures-v7.svg > /tmp/equipment-before.sha
node scripts/generate-equipment-v7-assets.mjs
sha256sum -c /tmp/equipment-before.sha
```

Expected: both files report `OK`.

- [ ] **Step 7: Commit**

```bash
git add scripts/generate-equipment-v7-assets.mjs public/assets/equipment/v7 scripts/v7-equipment-manifest.mjs
git commit -m "feat: add v7 equipment appearance atlases"
```

---

### Task 3: Build the pure cached equipment appearance resolver

**Files:**
- Create: `src/presentation/equipment-appearance-v7.js`
- Create: `scripts/v7-equipment-resolver.mjs`
- Modify: `src/presentation/combat-context-v7.js`

**Interfaces:**
- Consumes: equipped item record, Covenant presentation identity, `reducedVfx`.
- Produces: `equipmentAppearanceRevisionKey(equipment, covenantIdentity) -> string`; `EquipmentAppearanceResolver.resolve(equipment, covenantIdentity, options = {}) -> Readonly<EquipmentAppearance>`; `debug() -> { hits, misses, size }`.
- `EquipmentAppearance.layers` is a frozen array of `{ kind, slot, assetId, cell, family, order, opacity, blend, requiredIdentity }`.

- [ ] **Step 1: Write the failing resolver regression**

Create `scripts/v7-equipment-resolver.mjs`:

```js
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
assert.notEqual(equipmentAppearanceRevisionKey(equipment, covenant), equipmentAppearanceRevisionKey({ ...equipment, weapon: { ...equipment.weapon, masterworkRank: 9 } }, covenant));
const debug = resolver.debug();
assert.ok(debug.hits >= 1 && debug.misses >= 2);
console.log('Ashen Covenant v7 equipment appearance resolver regression passed.');
```

- [ ] **Step 2: Run and verify RED**

```bash
node scripts/v7-equipment-resolver.mjs
```

Expected: module-not-found failure.

- [ ] **Step 3: Implement revision-key and resolver**

Create `src/presentation/equipment-appearance-v7.js` with a bounded cache and deterministic layer orders:

```js
import { EQUIPMENT_LAYER_ASSETS, RARITY_MATERIALS, equipmentBaseFamily, uniqueSignature } from '../data/equipment-appearance-v7.js';

const SLOT_ORDER = Object.freeze({ boots: 3, chest: 4, head: 5, gloves: 6, offhand: 7, weapon: 8 });
const SLOT_CELL = Object.freeze({ weapon: 0, offhand: 4, head: 8, chest: 12, gloves: 16, boots: 20 });
const stableItem = (item) => item ? [item.id ?? '', item.baseId ?? '', item.uniqueId ?? '', item.rarity ?? 'common', Number(item.masterworkRank ?? item.masterwork ?? 0), Number(item.corruption ?? item.corruptionRank ?? 0)].join(':') : '-';
export const equipmentAppearanceRevisionKey = (equipment = {}, covenantIdentity = {}, reducedVfx = false) => [
  ...['weapon', 'offhand', 'head', 'chest', 'gloves', 'boots'].map((slot) => `${slot}=${stableItem(equipment[slot])}`),
  `cov=${covenantIdentity.affinity ?? 'unbound'}:${covenantIdentity.stage ?? 0}`,
  `reduced=${Boolean(reducedVfx)}`
].join('|');

export class EquipmentAppearanceResolver {
  constructor({ maxEntries = 96 } = {}) { this.cache = new Map(); this.maxEntries = maxEntries; this.hits = 0; this.misses = 0; }
  resolve(equipment = {}, covenantIdentity = {}, { reducedVfx = false } = {}) {
    const key = equipmentAppearanceRevisionKey(equipment, covenantIdentity, reducedVfx);
    if (this.cache.has(key)) { this.hits += 1; return this.cache.get(key); }
    this.misses += 1;
    const layers = [];
    const signatureIds = [];
    let maxMasterwork = 0;
    let maxCorruption = 0;
    for (const slot of ['boots', 'chest', 'head', 'gloves', 'offhand', 'weapon']) {
      const item = equipment[slot];
      if (!item) continue;
      const family = equipmentBaseFamily(item.baseId, slot);
      const familyIndex = Math.max(0, ['weapon', 'offhand', 'head', 'chest', 'gloves', 'boots'].includes(slot) ? 0 : 0);
      layers.push(Object.freeze({ kind: 'slot', slot, assetId: EQUIPMENT_LAYER_ASSETS.layers.id, cell: SLOT_CELL[slot] + familyIndex, family, order: SLOT_ORDER[slot], opacity: 0.72, blend: 'source-over', requiredIdentity: false }));
      maxMasterwork = Math.max(maxMasterwork, Number(item.masterworkRank ?? item.masterwork ?? 0));
      maxCorruption = Math.max(maxCorruption, Number(item.corruption ?? item.corruptionRank ?? 0));
      const signature = uniqueSignature(item.uniqueId);
      if (signature) {
        signatureIds.push(signature.id);
        layers.push(Object.freeze({ kind: 'signature', slot, assetId: EQUIPMENT_LAYER_ASSETS.signatures.id, cell: signature.cell, family: signature.silhouette, order: 9, opacity: 0.78, blend: 'screen', requiredIdentity: true }));
      }
    }
    const highestRarity = Object.values(equipment).filter(Boolean).map((item) => item.rarity ?? 'common').sort((a, b) => ['common','magic','rare','relic','unique','mythic'].indexOf(b) - ['common','magic','rare','relic','unique','mythic'].indexOf(a))[0] ?? 'common';
    const material = RARITY_MATERIALS[highestRarity] ?? RARITY_MATERIALS.common;
    if ((covenantIdentity.stage ?? 0) >= 2) layers.push(Object.freeze({ kind: 'covenant', slot: 'all', assetId: null, cell: -1, family: covenantIdentity.affinity ?? 'unbound', order: 10, opacity: reducedVfx ? 0.10 : 0.20, blend: 'screen', requiredIdentity: false }));
    const result = Object.freeze({
      key, layers: Object.freeze(layers), signatureIds: Object.freeze(signatureIds), rarity: highestRarity, material,
      masterworkTier: Math.min(3, Math.floor(maxMasterwork / 4)), corruptionTier: Math.min(3, Math.max(0, Math.floor(maxCorruption))),
      covenantAffinity: covenantIdentity.affinity ?? 'unbound', covenantStage: covenantIdentity.stage ?? 0, reducedVfx: Boolean(reducedVfx)
    });
    this.cache.set(key, result);
    if (this.cache.size > this.maxEntries) this.cache.delete(this.cache.keys().next().value);
    return result;
  }
  debug() { return { hits: this.hits, misses: this.misses, size: this.cache.size }; }
}
```

After the first green pass, improve `familyIndex` by exporting `equipmentFamilyCell(baseId, slot)` from the manifest so different normal families use distinct atlas cells. Keep that mapping data-only and assert it in the same test before committing.

- [ ] **Step 4: Expose relevant item fields in `PresentationCombatContextResolver`**

Update `visibleEquipment` records to include:

```js
masterworkRank: Number(item.masterworkRank ?? item.masterwork ?? 0),
corruption: Number(item.corruption ?? item.corruptionRank ?? 0),
visualSignatureId: item.uniqueId ? `unique:${item.uniqueId}` : null
```

Set context-level `masterworkRank` and `corruptionLevel` to the maximum visible equipped values instead of accepting only event detail.

- [ ] **Step 5: Run resolver and context regressions**

```bash
node scripts/v7-equipment-resolver.mjs
node scripts/v7-combat-context.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/presentation/equipment-appearance-v7.js src/presentation/combat-context-v7.js scripts/v7-equipment-resolver.mjs src/data/equipment-appearance-v7.js
git commit -m "feat: resolve cached v7 equipment appearance"
```

---

### Task 4: Move live appearance ownership into `GamePresentationSystem`

**Files:**
- Modify: `src/presentation/system.js`
- Modify: `src/systems/loot.js`
- Modify: `src/systems/game.js`
- Modify: `scripts/v7-equipment-resolver.mjs`

**Interfaces:**
- Consumes: `EquipmentAppearanceResolver` and current `player.equipment`/`player.covenantPresentation`.
- Produces: `player.presentation.equipmentAppearance` and debug cache stats.

- [ ] **Step 1: Add a failing live ownership assertion**

Extend `scripts/v7-equipment-resolver.mjs` with a live game/presentation fixture:

```js
const { GameEngine } = await import('../src/systems/game.js');
const { GamePresentationSystem } = await import('../src/presentation/system.js');
const input = { pointer: { active: false, worldX: 0, worldY: 0 }, tick() {}, updateWorldPointer() {}, getMove() { return { x: 0, y: 0, moving: false }; }, getAimDirection() { return null; }, isHeld() { return false; }, consume() { return false; }, defer() {}, rumble() {} };
const game = new GameEngine(input, { viewport: { width: 1280, height: 720, scale: 1 }, getAssetStatus: () => ({ ready: true, failed: [] }) }, { sound: false, reducedVfx: true });
const presentation = new GamePresentationSystem(game, { input, settings: game.settings, audio: null, strictEvents: true });
assert.equal(game.start('warden', 'thornseer'), true);
game.player.equipment.weapon = { id: 'live-bell', slot: 'weapon', baseId: 'cleaver', rarity: 'unique', uniqueId: 'bell-sunder' };
presentation.update(1 / 60);
assert.equal(game.player.presentation.equipmentAppearance.signatureIds.includes('unique:bell-sunder'), true);
assert.equal(presentation.getDebugSnapshot().equipmentAppearance.cache.size >= 1, true);
```

- [ ] **Step 2: Run and verify RED**

```bash
node scripts/v7-equipment-resolver.mjs
```

Expected: failure because presentation does not own the resolver.

- [ ] **Step 3: Wire `EquipmentAppearanceResolver` into `GamePresentationSystem`**

Import and construct:

```js
import { EquipmentAppearanceResolver } from './equipment-appearance-v7.js';
// constructor
this.equipmentAppearanceResolver = new EquipmentAppearanceResolver();
```

In `update(delta)`, after the combat context/clip resolution from Plan 1:

```js
const equipmentAppearance = this.equipmentAppearanceResolver.resolve(
  this.game.player.equipment,
  this.game.player.covenantPresentation ?? combatContext.covenantIdentity,
  { reducedVfx: this.settings.reducedVfx === true }
);
this.game.player.presentation.equipmentAppearance = equipmentAppearance;
```

Extend `getDebugSnapshot()`:

```js
equipmentAppearance: { cache: this.equipmentAppearanceResolver.debug(), currentKey: this.game?.player?.presentation?.equipmentAppearance?.key ?? null },
```

- [ ] **Step 4: Remove coarse live ownership from game stat refresh**

In `src/systems/game.js`, remove the assignment:

```js
player.equipmentPresentation = this.lootSystem.presentationForEquipment(player.equipment, covenantView);
```

Keep `player.covenantPresentation = resolveCovenantPresentationIdentity(...)`.

- [ ] **Step 5: Retire or quarantine `LootSystem.presentationForEquipment()`**

Search all remaining consumers. If none remain, delete `presentationForEquipment()` from `src/systems/loot.js` and update `scripts/loot-presentation-renderer.mjs` later in Task 5. If a legacy regression still requires the method, rename it `legacyPresentationForEquipment()` and add a comment that v7 live rendering must not call it.

- [ ] **Step 6: Run live resolver and loot regressions**

```bash
node scripts/v7-equipment-resolver.mjs
node scripts/loot-engine-integration.mjs
node scripts/loot-chase-runtime.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/presentation/system.js src/systems/game.js src/systems/loot.js scripts/v7-equipment-resolver.mjs
git commit -m "refactor: move equipment appearance into presentation"
```

---

### Task 5: Render the bounded equipment layer stack

**Files:**
- Modify: `src/systems/renderer.js`
- Create: `scripts/v7-equipment-renderer.mjs`
- Modify: `scripts/loot-presentation-renderer.mjs`

**Interfaces:**
- Consumes: `player.presentation.resolvedClip.anchors`, `player.presentation.equipmentAppearance.layers`, `EQUIPMENT_LAYER_ASSETS`.
- Produces: two required loaded equipment atlases and bounded draw operations in orders 2–10 around the v7 body frame.

- [ ] **Step 1: Write the failing renderer contract**

Create `scripts/v7-equipment-renderer.mjs`:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source = fs.readFileSync(new URL('../src/systems/renderer.js', import.meta.url), 'utf8');
assert.match(source, /EQUIPMENT_LAYER_ASSETS/, 'renderer must load equipment assets from the manifest');
assert.match(source, /equipmentAppearance/, 'renderer must consume resolved equipment appearance');
assert.match(source, /_drawEquipmentLayers/, 'renderer must isolate bounded equipment layer rendering');
assert.doesNotMatch(source, /equipmentPresentation/, 'renderer must not consume the legacy coarse equipment presentation contract');
console.log('Ashen Covenant v7 equipment renderer contract passed.');
```

- [ ] **Step 2: Run and verify RED**

```bash
node scripts/v7-equipment-renderer.mjs
```

Expected: fail on current coarse rendering.

- [ ] **Step 3: Load manifest-owned SVG atlases as required assets**

Import:

```js
import { EQUIPMENT_LAYER_ASSETS } from '../data/equipment-appearance-v7.js';
```

Add to `this.assets`:

```js
equipmentLayers: this._loadImage(EQUIPMENT_LAYER_ASSETS.layers.src),
equipmentSignatures: this._loadImage(EQUIPMENT_LAYER_ASSETS.signatures.src),
```

Add both to `getAssetStatus().required`.

- [ ] **Step 4: Add one bounded equipment drawing helper**

Implement `_drawEquipmentLayers(player, game, minOrder, maxOrder)` that filters `player.presentation.equipmentAppearance.layers` without scanning inventory:

```js
_drawEquipmentLayers(player, game, minOrder, maxOrder) {
  const appearance = player.presentation?.equipmentAppearance;
  if (!appearance) return;
  const anchors = player.presentation?.resolvedClip?.anchors ?? {};
  for (const layer of appearance.layers) {
    if (layer.order < minOrder || layer.order > maxOrder) continue;
    if (layer.kind === 'covenant') { this._drawCovenantEquipmentTreatment(player, game, layer); continue; }
    const image = layer.assetId === EQUIPMENT_LAYER_ASSETS.signatures.id ? this.assets.equipmentSignatures : this.assets.equipmentLayers;
    if (!this._assetReady(image)) continue;
    const manifest = layer.assetId === EQUIPMENT_LAYER_ASSETS.signatures.id ? EQUIPMENT_LAYER_ASSETS.signatures : EQUIPMENT_LAYER_ASSETS.layers;
    const anchor = layer.slot === 'head' ? anchors.head : layer.slot === 'boots' ? anchors.feet : layer.slot === 'weapon' ? anchors.hand : layer.slot === 'offhand' ? anchors.offhand : anchors.torso;
    const offsetX = (anchor?.[0] ?? 0) * player.radius;
    const offsetY = (anchor?.[1] ?? 0) * player.radius;
    this.ctx.save();
    this.ctx.globalAlpha = layer.opacity;
    this.ctx.globalCompositeOperation = layer.blend;
    this._drawAtlas(image, manifest.columns, manifest.rows, layer.cell, offsetX, offsetY, player.radius * 4.2, player.radius * 4.2);
    this.ctx.restore();
  }
}
```

Implement `_drawCovenantEquipmentTreatment` using the existing Covenant palette and `screen` blend. Respect `game.settings.reducedVfx` by using the resolver-supplied lower opacity; do not remove signature glyph layers.

- [ ] **Step 5: Place layers around the body frame**

Inside `_drawPlayer`, draw rear layers before the body and front/signature/Covenant layers after it:

```js
this._drawEquipmentLayers(player, game, 2, 2);
// draw required v7 body clip
this._drawEquipmentLayers(player, game, 3, 10);
```

Preserve action VFX after order 10. Remove the old rarity ring / `weaponKey` / `auraKey` branches that read `player.equipmentPresentation`; retain barrier and Covenant body markings not owned by equipment.

- [ ] **Step 6: Replace the legacy renderer regression**

Update `scripts/loot-presentation-renderer.mjs` to assert `equipmentAppearance`, `EQUIPMENT_LAYER_ASSETS`, and absence of `weaponKey`/`auraKey` renderer ownership. Keep the script name because `test:v6` invokes it.

- [ ] **Step 7: Run renderer regressions**

```bash
node scripts/v7-equipment-renderer.mjs
node scripts/loot-presentation-renderer.mjs
node scripts/v7-animation-contract.mjs
node scripts/visual-affix-ux.mjs
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/systems/renderer.js scripts/v7-equipment-renderer.mjs scripts/loot-presentation-renderer.mjs
git commit -m "feat: render v7 equipment appearance layers"
```

---

### Task 6: Validate complete chase-item coverage, failure policy, and cache bounds

**Files:**
- Modify: `src/presentation/validator.js`
- Modify: `scripts/v7-equipment-manifest.mjs`
- Modify: `scripts/v7-equipment-resolver.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `validateV7EquipmentAppearanceData()`, runtime cache warnings, and `npm run test:v7:equipment`.

- [ ] **Step 1: Add failing validation assertions**

Append to `scripts/v7-equipment-manifest.mjs`:

```js
const { validateV7EquipmentAppearanceData } = await import('../src/presentation/validator.js');
const validation = validateV7EquipmentAppearanceData();
assert.equal(validation.valid, true, validation.issues.map((entry) => `${entry.code}: ${entry.message}`).join('\n'));
assert.equal(validation.summary.signatures, UNIQUES.length);
```

- [ ] **Step 2: Implement equipment data validation**

In `src/presentation/validator.js`, import `UNIQUES`, `EQUIPMENT_LAYER_ASSETS`, `UNIQUE_VISUAL_SIGNATURES` and add:

```js
export const validateV7EquipmentAppearanceData = () => {
  const issues = [];
  for (const unique of UNIQUES) {
    const signature = UNIQUE_VISUAL_SIGNATURES[unique.id];
    if (!signature) issues.push(issue('error', 'V7_EQUIPMENT_SIGNATURE', `${unique.id} has no visual signature.`, unique.id));
    else if (!signature.preserveWhenReduced) issues.push(issue('error', 'V7_EQUIPMENT_REDUCED_IDENTITY', `${unique.id} loses identity in reduced VFX.`, unique.id));
  }
  for (const asset of Object.values(EQUIPMENT_LAYER_ASSETS)) {
    if (!asset.required || !asset.src.startsWith('/assets/equipment/v7/')) issues.push(issue('error', 'V7_EQUIPMENT_ASSET', `${asset.id} has an invalid manifest path.`, asset.id));
  }
  return { valid: !issues.some((entry) => entry.severity === 'error'), issues, summary: { signatures: Object.keys(UNIQUE_VISUAL_SIGNATURES).length, assets: Object.keys(EQUIPMENT_LAYER_ASSETS).length } };
};
```

- [ ] **Step 3: Add runtime cache bound validation**

In `validatePresentationRuntime`, add a warning if the appearance cache exceeds its configured 96 entries:

```js
const equipmentCache = presentation?.equipmentAppearanceResolver?.debug?.();
if ((equipmentCache?.size ?? 0) > 96) issues.push(issue('warning', 'V7_EQUIPMENT_CACHE', 'Equipment appearance cache exceeded 96 entries.'));
```

- [ ] **Step 4: Add package certification script**

Add to `package.json`:

```json
"test:v7:equipment": "npm run test:v7:animation && node scripts/v7-equipment-manifest.mjs && node scripts/v7-equipment-resolver.mjs && node scripts/v7-equipment-renderer.mjs && node scripts/loot-engine-integration.mjs && node scripts/loot-chase-runtime.mjs && node scripts/loot-presentation-renderer.mjs"
```

- [ ] **Step 5: Run Plan 2 certification**

```bash
npm run test:v7:equipment
```

Expected: PASS.

- [ ] **Step 6: Run full v6 gate**

```bash
npm run test:v6
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/presentation/validator.js scripts/v7-equipment-manifest.mjs scripts/v7-equipment-resolver.mjs package.json
git commit -m "test: certify v7 equipment appearance"
```

---

## Plan 2 Exit Gate

Before starting the combat soundscape plan, run:

```bash
npm run test:v7:equipment
npm run test:v6
```

Expected: both PASS. Record the branch commit SHA as the dependency baseline for `2026-08-21-v7-combat-soundscape.md`.
