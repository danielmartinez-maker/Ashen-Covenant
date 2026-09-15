# Ashen Covenant v7 Integration + Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the v7 animation, equipment, Covenant, VFX, impact, and semantic audio systems operate as one presentation layer across real gameplay; preserve v6 saves/architecture; enforce the 15% presentation-performance budget; validate Electron `file://` packaging; and publish the v7.0.0 release contract.

**Architecture:** Keep `GamePresentationSystem` as the orchestration spine and test it through real `GameEngine` scenarios rather than synthetic module-only checks. Add an integrated embodied-combat regression, a compatibility/boundary regression, a same-process legacy-vs-v7 presentation benchmark, and packaged Electron asset checks. Only after all gates pass, bump metadata to 7.0.0, add the v7 release report, and make `npm run test:v7` the final certification command layered above the complete v6 suite.

**Tech Stack:** JavaScript ES modules, Node.js built-ins, existing GameEngine/PresentationSystem, existing Electron headless file-protocol smoke, Vite build, npm scripts.

**Spec:** `docs/superpowers/specs/2026-08-21-v7-embodied-covenant-design.md`

## Global Constraints

- This plan starts only after `npm run test:v7:audio` and `npm run test:v6` pass on `v7-embodied-covenant`.
- Do not change gameplay outcomes to satisfy presentation tests or performance budgets.
- Do not reduce the v6 stress actor count to make v7 pass.
- Existing v6 version-19 saves must load with identical gameplay state; v7 presentation caches/asset references are rebuilt, never persisted.
- No save-schema bump unless a genuinely player-authored persistent cosmetic choice has been introduced. This plan assumes none was introduced by Plans 1–3.
- All six primary classes, all six Covenant affinities, stages 1–5, instability, Guard break/stagger/knockdown/execution, Hunter intrusion, boss transition, Unique/Mythic appearance, Sanctuary, Black Road, and reduced presentation settings must receive integrated coverage.
- Sustained v7 presentation p95 may not exceed the same-process legacy presentation baseline by more than 15%.
- Global SFX voices remain <= 36 and category caps remain enforced under integrated stress.
- Electron `file://` packaging is a release gate; browser-only success is insufficient.
- The complete existing `npm run test:v6` chain remains green beneath the v7 release gate.
- `npm run test:v7` is the final certification command.
- Every production/release change follows RED -> GREEN -> relevant regression -> commit.

---

## File Structure

### New files

- `scripts/v7-embodied-combat.mjs` — integrated all-class/all-affinity presentation/gameplay regression.
- `scripts/v7-architecture-compatibility.mjs` — resolver boundary, non-persistence, v6 save load/save/reload regression.
- `scripts/performance-v7.mjs` — same-process legacy-vs-v7 presentation benchmark over 240+ actors plus cache/voice metrics.
- `scripts/release-contract-v7.mjs` — final metadata/script/docs/release-surface contract.
- `docs/V7_RELEASE_REPORT.md` — v7 scope, compatibility, performance, asset, and certification report.

### Focused modifications

- `src/presentation/system.js` — expose final normalized debug snapshot fields only where integration tests require them.
- `src/presentation/validator.js` — aggregate v7 animation/equipment/audio validators and final runtime checks.
- `scripts/file-protocol-smoke.cjs` — validate six v7 hero-motion assets, equipment SVG atlases, v7 audio fetch/RIFF headers, and live Black Road rendering under `file://`.
- `scripts/presentation-performance.mjs` — keep legacy absolute budget regression intact; only add v7 debug metrics if needed.
- `README.md` — add v7.0.0 Embodied Covenant release summary and certification command.
- `WINDOWS_README.txt` — update release/version/run instructions to 7.0.0 without changing Windows-only product scope.
- `src/ui/ui.js` — title/version copy only.
- `src/data/requiem.js` — runtime release overview version only.
- `package.json` — version 7.0.0, `test:v7`, keep `test:v6` intact.
- `package-lock.json` — top-level/root package version 7.0.0.
- `docs/DEVELOPMENT_LOG.md` — append v7 release milestone if file exists.

---

### Task 1: Prove embodied presentation across classes, Covenants, combat states, Hunter, boss, Sanctuary, and Black Road

**Files:**
- Create: `scripts/v7-embodied-combat.mjs`
- Modify: `src/presentation/system.js` only if the test exposes a missing debug field.

**Interfaces:**
- Consumes: live `GameEngine`, `GamePresentationSystem`, Plan 1–3 resolvers, existing gameplay APIs.
- Produces: a single regression that proves final live state contains `combatContext`, `resolvedClip`, `equipmentAppearance`, semantic audio events, Covenant identity, and no presentation listener errors.

- [ ] **Step 1: Write the integrated six-class/six-affinity test**

Create `scripts/v7-embodied-combat.mjs` with dependency-free fixtures:

```js
import assert from 'node:assert/strict';
import { GameEngine } from '../src/systems/game.js';
import { GamePresentationSystem } from '../src/presentation/system.js';
import { ALIGNMENT_IDS } from '../src/systems/covenant.js';

const store = new Map();
globalThis.localStorage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, String(value)), removeItem: (key) => store.delete(key) };
const input = () => ({ pointer: { active: false, down: false, commandDirty: false, worldX: 0, worldY: 0 }, tick() {}, updateWorldPointer() {}, getMove() { return { x: 0, y: 0, moving: false }; }, getAimDirection() { return null; }, isHeld() { return false; }, consume() { return false; }, defer() {}, press() {}, rumble() {} });
const renderer = () => ({ viewport: { width: 1440, height: 900, scale: 1 }, getAssetStatus: () => ({ ready: true, failed: [] }) });
const pairings = [
  ['warden', 'thornseer'], ['thornseer', 'ironbound'], ['ironbound', 'veilrunner'],
  ['veilrunner', 'gravebinder'], ['gravebinder', 'dawnstrider'], ['dawnstrider', 'warden']
];
const played = [];
const audio = { attach() {}, update() {}, playResolved(event) { played.push(event); return true; }, debug() { return { activeVoices: 0, categoryVoices: { impact: 0, footstep: 0, enemyVocal: 0, ambience: 0 } }; } };

const tuneAffinity = (game, affinity, stage = 5) => {
  const tag = `${affinity}bound`;
  const weight = stage >= 5 ? 10 : stage === 4 ? 7 : stage === 3 ? 5 : stage === 2 ? 3 : 1.5;
  for (let index = 0; index < 6; index += 1) game.recordCovenantBehavior([tag], weight, { regionId: 'gravewake' });
  game._refreshPlayerStats(true);
};

for (let index = 0; index < pairings.length; index += 1) {
  const [primary, secondary] = pairings[index];
  const affinity = ALIGNMENT_IDS[index];
  const controls = input();
  const game = new GameEngine(controls, renderer(), { sound: true, reducedVfx: index % 2 === 1, reducedMotion: index % 3 === 1, reducedFlashing: true });
  const presentation = new GamePresentationSystem(game, { input: controls, settings: game.settings, audio, strictEvents: true });
  assert.equal(game.start(primary, secondary), true);
  tuneAffinity(game, affinity, 5);
  presentation.update(1 / 60);
  assert.equal(game.player.presentation.combatContext.primaryClass, primary);
  assert.equal(game.player.presentation.resolvedClip.clipId.startsWith(`${primary}:`), true);
  assert.equal(game.player.covenantPresentation.affinity, affinity);
  assert.equal(game.player.covenantPresentation.stage, 5);
  assert.ok(game.player.presentation.equipmentAppearance);
  assert.equal(presentation.eventBus.stats.listenerErrors, 0);

  game.entities.enemies = [];
  const enemy = game._spawnEnemy('cairnguard', game.player.x + 52, game.player.y, { level: 20, group: `v7-${primary}`, engaged: true });
  enemy.guard = Math.max(1, enemy.guard ?? 1);
  game.presentation.emit('combat:attack-impact', { entityId: game.player.id, targetId: enemy.id, critical: true, hitResult: { weight: 'heavy', guarded: true, guardBroken: true, staggered: true }, damageType: 'physical', material: 'plate' }, { source: 'v7-integrated-test' });
  assert.ok(played.some((event) => event.layers.some((layer) => layer.assetId === 'guard-break')));
}

console.log('Ashen Covenant v7 six-class/six-affinity embodied presentation pass completed.');
```

- [ ] **Step 2: Add stage 1–5 coverage without mutating internals directly**

For one fresh Warden/Thornseer game per stage, call `recordCovenantBehavior(['gravebound'], weight)` with increasing weights until `getCovenantOverview().stage >= desiredStage`, then assert the stage is at least the requested value and <= 5, `covenantPresentation.stage` matches, and `presentation.update()` remains error-free. Use a bounded loop of 40 applications; fail if the stage is not reached rather than assigning `player.covenant.stage` directly.

- [ ] **Step 3: Add dual-affinity instability coverage**

Create a fresh game, apply both `lightbound` and `voidbound` repeatedly, then assert:

```js
const covenant = game.getCovenantOverview();
assert.equal(covenant.unstable, true);
assert.ok(covenant.instability > 0);
presentation.update(1 / 60);
assert.equal(game.player.presentation.combatContext.covenantInstability > 0, true);
```

- [ ] **Step 4: Add Hunter intrusion and boss transition coverage**

Use the proven v6 APIs:

```js
const seed = game._spawnEnemy('reedstalker', game.player.x + 160, game.player.y, { level: 40, group: 'v7-hunter-seed', engaged: true, elite: true });
const hunter = game.createHunterFromEnemy(seed, { source: 'physical', damageType: 'physical', burst: true });
assert.ok(hunter);
const stored = game.player.hunters.find((entry) => entry.id === hunter.id);
stored.nextEligibleAt = 0;
seed.dead = true;
const intruder = game.intrudeHunter(hunter.id, { zoneId: 'gravewake', x: game.player.x + 190, y: game.player.y, group: 'v7-hunter' });
assert.equal(intruder.hunterId, hunter.id);
const boss = game._spawnEnemy('cryptwarden', game.player.x + 320, game.player.y, { group: 'v7-boss', elite: true });
boss.hp = boss.maxHp * .60;
game._updateBossPhase(boss);
assert.equal(boss.phase, 2);
assert.ok(presentation.eventBus.recent('boss:signature-cue', 1).length >= 1);
```

After the events, call `presentation.update(1 / 60)` and assert context/debug state remains valid.

- [ ] **Step 5: Add knockdown/execution and chase-item appearance coverage**

Equip one Unique and one Mythic using the existing item shape without changing loot logic:

```js
game.player.equipment.weapon = { id: 'v7-bell', slot: 'weapon', baseId: 'cleaver', rarity: 'unique', uniqueId: 'bell-sunder', masterwork: 8 };
game.player.equipment.amulet = { id: 'v7-heart', slot: 'amulet', baseId: 'obelisk-charm', rarity: 'mythic', uniqueId: 'heart-of-the-unrung', masterwork: 12 };
game._refreshPlayerStats(true);
presentation.update(1 / 60);
assert.ok(game.player.presentation.equipmentAppearance.signatureIds.includes('unique:bell-sunder'));
assert.ok(game.player.presentation.equipmentAppearance.signatureIds.includes('unique:heart-of-the-unrung'));
```

Create a staggered enemy and call the existing execution path if exposed; otherwise emit the exact presentation event produced by the execution gameplay method only after setting the authoritative enemy state to execution-eligible. Assert resolved semantic state becomes `execution` and semantic audio contains execution contact/finish cues.

- [ ] **Step 6: Add Sanctuary and Black Road contexts**

On a fresh run in Sanctuary, call `presentation.update()` and assert `PresentationContextResolver` reports `playerInTown === true`. Then:

```js
assert.equal(game.startBlackRoadExpedition('funeral-road'), true);
presentation.update(1 / 60);
assert.equal(presentation.getContext().currentDungeon !== null, true);
assert.ok(game.entities.enemies.length >= 1);
```

Assert the same player still has v7 clip and equipment appearance state after expedition launch.

- [ ] **Step 7: Run integrated regression**

```bash
node scripts/v7-embodied-combat.mjs
```

Expected: PASS with all classes/affinities/stages and integrated scenarios complete.

- [ ] **Step 8: Run Plan 1–3 certifications**

```bash
npm run test:v7:audio
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add scripts/v7-embodied-combat.mjs src/presentation/system.js
git commit -m "test: cover integrated v7 embodied combat"
```

---

### Task 2: Prove v6 save continuity and presentation non-persistence

**Files:**
- Create: `scripts/v7-architecture-compatibility.mjs`
- Modify: `src/presentation/validator.js`

**Interfaces:**
- Consumes: `SaveMigrator`, `saveRun`, `loadSave`, real `GameEngine.continueRun()`, Plan 1–3 presentation modules.
- Produces: assertions that v19 gameplay data survives load/save/reload and no v7 cache/resolved asset references enter the snapshot.

- [ ] **Step 1: Write a representative v19 round-trip test**

Create `scripts/v7-architecture-compatibility.mjs`. Reuse the representative item/campaign/covenant shape from `scripts/migration-matrix-v6.mjs`, but keep this fixture focused:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameEngine } from '../src/systems/game.js';
import { GamePresentationSystem } from '../src/presentation/system.js';
import { SaveMigrator, SAVE_SCHEMA_V19 } from '../src/systems/save-migrator.js';
import { saveRun, loadSave } from '../src/systems/save.js';

const store = new Map();
globalThis.localStorage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, String(value)), removeItem: (key) => store.delete(key) };
const item = { id: 'eq-unique', name: 'Bell-Sunder', slot: 'weapon', baseId: 'cleaver', rarity: 'unique', uniqueId: 'bell-sunder', masterwork: 12, runeIds: ['ember-rune'], itemLevel: 72, affixes: [{ stat: 'power', value: 17 }] };
const source = SaveMigrator.migrate({
  version: 19, primary: 'warden', secondary: 'thornseer', stats: { kills: 700, bosses: 31, deaths: 4 }, activeOperation: null,
  player: {
    level: 83, gold: 129443, inventory: [], stash: [], equipment: { weapon: item }, runes: { 'ember-rune': 4 }, aspects: {}, skillImprints: {}, abilityMastery: {}, masteryDoctrines: {},
    campaign: { chapterId: 'chapter-five', stageId: 'return-maelin-five', choices: {}, flags: {} }, leveling: { journey: { completed: {} }, paragonRank: 19, paragonXp: 3112, paragon: { nodes: [] } },
    factions: {}, contracts: { completed: 27, ledgerXp: 810, active: null }, reforged: {}, requiem: { difficulty: 'veteran', tutorial: { completed: true }, classMechanics: {} },
    endgameRecords: { 'black-road': { clears: 14, bestTier: 23 } }, nemeses: [], hunters: [], mutationProgress: { credits: 7, selections: {}, unlocked: [], legacyConverted: true },
    covenant: { affinities: { grave: 76, flame: 14, blood: 0, light: 0, storm: 0, void: 0 }, stage: 4, instability: 8, thresholdsSeen: [1,2,3,4], mutationsUnlocked: [] },
    worldV2: { regions: {}, activeEvents: [], resolvedEvents: [], tick: 91 }, sanctuary: { level: 4, flags: {}, merchants: {}, npcs: {}, architecture: [], discoveries: [] }
  }
});
assert.equal(source.version, SAVE_SCHEMA_V19);
assert.equal(saveRun(source), true);
```

Then create the engine/presentation, call `continueRun()`, run `presentation.update()`, call `game.save()`, and load again. Assert:

```js
const roundTrip = loadSave();
assert.equal(roundTrip.version, SAVE_SCHEMA_V19);
assert.equal(roundTrip.player.equipment.weapon.uniqueId, 'bell-sunder');
assert.equal(roundTrip.player.equipment.weapon.masterwork, 12);
assert.equal(roundTrip.player.level, 83);
const serialized = JSON.stringify(roundTrip);
for (const forbidden of ['resolvedClip', 'equipmentAppearance', 'combatContext', 'assetId', 'sourcePath', 'categoryVoices']) assert.equal(serialized.includes(forbidden), false, `save must not persist ${forbidden}`);
```

- [ ] **Step 2: Add architecture import-boundary assertions**

Read all files in `src/presentation` and assert none import `../systems/game.js`. Read `src/systems/renderer.js` and `src/systems/audio.js` and assert neither imports `save.js`, `save-migrator.js`, or gameplay systems such as `combat.js`/`covenant.js`. Assert `combat-context-v7.js`, `animation-clips-v7.js`, `equipment-appearance-v7.js`, and `audio-resolver-v7.js` do not assign to `game.` or `player.` in source text.

Use exact regular expressions, for example:

```js
assert.equal(/from\s+['"][^'"]*systems\/game\.js['"]/.test(source), false, `${name} must not reverse-import GameEngine`);
assert.equal(/\bgame\.[A-Za-z_$][\w$]*\s*=/.test(resolverSource), false, `${name} must not mutate game`);
```

- [ ] **Step 3: Add aggregated v7 runtime validation**

In `src/presentation/validator.js`, export:

```js
export const validateV7PresentationData = () => {
  const animation = validateV7AnimationData();
  const equipment = validateV7EquipmentAppearanceData();
  const audio = validateV7AudioData();
  const issues = [...animation.issues, ...equipment.issues, ...audio.issues];
  return { valid: !issues.some((entry) => entry.severity === 'error'), issues, summary: { animation: animation.summary, equipment: equipment.summary, audio: audio.summary } };
};
```

Add to the compatibility test:

```js
const validation = validateV7PresentationData();
assert.equal(validation.valid, true, validation.issues.map((entry) => `${entry.code}: ${entry.message}`).join('\n'));
```

- [ ] **Step 4: Run compatibility plus v6 migration matrix**

```bash
node scripts/v7-architecture-compatibility.mjs
node scripts/migration-matrix-v6.mjs
node scripts/architecture-boundaries-v6.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/v7-architecture-compatibility.mjs src/presentation/validator.js
git commit -m "test: prove v7 save and architecture compatibility"
```

---

### Task 3: Enforce the 15% v7 presentation performance budget

**Files:**
- Create: `scripts/performance-v7.mjs`
- Modify: `scripts/presentation-performance.mjs` only to expose reusable fixture helpers if duplication becomes error-prone; do not weaken its existing absolute assertions.

**Interfaces:**
- Produces: same-process `legacyP95Ms`, `v7P95Ms`, `ratio`, cache hit rate, voice counts, actor count, and heap delta.

- [ ] **Step 1: Write a benchmark that creates two identical 240-enemy fixtures**

Create `scripts/performance-v7.mjs` using `performance.now()` and a deterministic enemy layout matching `scripts/presentation-performance.mjs`. Build two separate `GameEngine` + `GamePresentationSystem` fixtures with the same class pair, settings, enemy IDs, positions, and 240 enemy actors.

Add these helpers exactly:

```js
const percentile = (values, amount) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * amount))] ?? 0;
};
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
const measure = (frames, callback) => {
  const values = [];
  for (let frame = 0; frame < frames; frame += 1) { const start = performance.now(); callback(frame); values.push(performance.now() - start); }
  return { average: mean(values), p95: percentile(values, .95), max: Math.max(...values) };
};
```

- [ ] **Step 2: Measure the legacy presentation path without v7 resolvers**

For the baseline fixture, do not call `presentation.update()`. Reproduce the pre-v7 presentation update sequence directly from the preserved v6 components:

```js
const legacy = measure(900, () => {
  presentation.settingsController.normalize();
  const context = presentation.contextResolver.update(game, 1 / 60);
  presentation.animationDirector.update(game, 1 / 60, context);
  presentation.impactSystem.update(game, 1 / 60, context);
  presentation.cinematic.update(game);
});
```

This is the same component set that existed before v7 context/clip/equipment/audio resolution. Keep audio disabled for both sides of this comparison so the benchmark measures deterministic presentation CPU rather than fake/real audio scheduling differences.

- [ ] **Step 3: Measure full v7 presentation on the second identical fixture**

```js
const embodied = measure(900, () => presentation.update(1 / 60));
```

Warm each fixture for 120 frames before measuring so cache initialization and JIT startup do not dominate either side.

- [ ] **Step 4: Assert ratio, actors, cache behavior, and heap**

After optional `globalThis.gc?.()` before/after, assert:

```js
const ratio = embodied.p95 / Math.max(0.001, legacy.p95);
assert.ok(ratio <= 1.15, `v7 presentation p95 regressed ${(ratio * 100 - 100).toFixed(1)}%: legacy=${legacy.p95.toFixed(3)}ms v7=${embodied.p95.toFixed(3)}ms`);
assert.ok(v7Game.entities.enemies.filter((enemy) => !enemy.dead).length >= 240, 'performance gate may not reduce actor population');
const equipmentCache = v7Presentation.equipmentAppearanceResolver.debug();
assert.ok(equipmentCache.hits > equipmentCache.misses * 20, `appearance cache must remain hot: ${JSON.stringify(equipmentCache)}`);
assert.ok(v7Presentation.getDebugSnapshot().eventBus.listenerErrors === 0);
assert.ok(heapDeltaMb < 64, `v7 presentation retained ${heapDeltaMb.toFixed(2)} MB`);
```

Print a JSON result containing legacy, embodied, ratio, actor count, animation budget, equipment cache stats, and audio debug counts.

- [ ] **Step 5: Run performance gates**

```bash
node --expose-gc scripts/performance-v7.mjs
node --expose-gc scripts/presentation-performance.mjs
node --expose-gc scripts/performance-v6.mjs
```

Expected: all PASS. Do not raise the 15% ratio or reduce actor counts to make a failure green; profile resolver allocations/cache misses first.

- [ ] **Step 6: Commit**

```bash
git add scripts/performance-v7.mjs scripts/presentation-performance.mjs
git commit -m "test: enforce v7 presentation performance budget"
```

---

### Task 4: Upgrade Electron `file://` certification for v7 body, equipment, and audio assets

**Files:**
- Modify: `scripts/file-protocol-smoke.cjs`
- Modify: `package.json` only if a separate helper script is necessary; prefer keeping existing `test:file-protocol` entry.

**Interfaces:**
- Consumes: built `dist/`, renderer required asset state, browser `fetch` under `file://`/bundled paths.
- Produces: headless Electron failure if any required v7 hero/equipment asset fails or any required v7 WAV cannot be fetched/read as RIFF/WAVE.

- [ ] **Step 1: Replace the old single v5 hero diagnosis with six v7 hero assets**

In the page-side `assetDiagnosis`, return:

```js
heroMotion: Object.fromEntries(Object.entries(renderer.assets.heroMotion).map(([id, image]) => [id, { source: image.src, width: image.naturalWidth, height: image.naturalHeight }])),
equipmentLayers: { source: renderer.assets.equipmentLayers.src, width: renderer.assets.equipmentLayers.naturalWidth, height: renderer.assets.equipmentLayers.naturalHeight },
equipmentSignatures: { source: renderer.assets.equipmentSignatures.src, width: renderer.assets.equipmentSignatures.naturalWidth, height: renderer.assets.equipmentSignatures.naturalHeight }
```

Remove assertions that certified player rendering depends on `hero-facing-atlas-v5.png`.

- [ ] **Step 2: Assert all six v7 hero sources and equipment SVGs resolve inside dist**

Use:

```js
for (const [classId, motion] of Object.entries(assetDiagnosis.heroMotion)) {
  assert.ok(motion.source.includes(`/dist/assets/hero-motion-${classId}-v7.png`), `${classId} v7 hero motion must resolve inside packaged dist/assets`);
  assert.ok(motion.width >= 1_000 && motion.height >= 1_000, `${classId} hero motion must decode at release scale`);
}
assert.ok(assetDiagnosis.equipmentLayers.source.includes('/dist/assets/equipment/v7/equipment-layers-v7.svg'));
assert.ok(assetDiagnosis.equipmentSignatures.source.includes('/dist/assets/equipment/v7/equipment-signatures-v7.svg'));
assert.ok(assetDiagnosis.equipmentLayers.width > 0 && assetDiagnosis.equipmentSignatures.width > 0);
```

Keep existing terrain, entrance, props, NPC, enemy-motion, and action-VFX assertions, updating only versioned paths that the live renderer already changed before v7.

- [ ] **Step 3: Fetch required v7 WAVs inside the loaded Electron page**

Inside `executeJavaScript`, dynamically import or access the built manifest through the runtime only if exposed. To avoid widening the public runtime facade, use a fixed representative required set covering generator families:

```js
const audioChecks = await Promise.all([
  'swing-heavy-a.wav', 'impact-plate.wav', 'guard-break.wav', 'spell-impact.wav',
  'execution-contact.wav', 'hunter-intrusion.wav', 'boss-phase.wav', 'cov-grave.wav', 'ambience-storm.wav'
].map(async (name) => {
  const response = await fetch(new URL(`./assets/audio/v7/${name}`, location.href));
  const bytes = new Uint8Array(await response.arrayBuffer());
  return { name, ok: response.ok, riff: String.fromCharCode(...bytes.slice(0, 4)), wave: String.fromCharCode(...bytes.slice(8, 12)), size: bytes.length };
}));
```

Return `audioChecks` and assert each is `{ ok: true, riff: 'RIFF', wave: 'WAVE' }` with size > 4,800 bytes.

- [ ] **Step 4: Strengthen the live Black Road screenshot diagnosis**

After launching `funeral-road`, call `window.ashenCovenant.presentation.update(1/60)` if presentation is exposed; otherwise let the normal runtime tick. Return and assert that the player has `presentation.resolvedClip` and `presentation.equipmentAppearance` in addition to existing enemy/target checks.

- [ ] **Step 5: Run packaged smoke**

```bash
npm run test:file-protocol
```

Expected: build succeeds, Electron loads `file:`, all required assets resolve, the run starts, Black Road launches, and the screenshot capture remains valid.

- [ ] **Step 6: Commit**

```bash
git add scripts/file-protocol-smoke.cjs
git commit -m "test: certify v7 Electron presentation assets"
```

---

### Task 5: Create the final v7 release contract and version metadata

**Files:**
- Create: `scripts/release-contract-v7.mjs`
- Create: `docs/V7_RELEASE_REPORT.md`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `README.md`
- Modify: `WINDOWS_README.txt`
- Modify: `src/ui/ui.js`
- Modify: `src/data/requiem.js`
- Modify: `docs/DEVELOPMENT_LOG.md` if present.

**Interfaces:**
- Produces: package/runtime/docs version 7.0.0 and final `npm run test:v7` certification.

- [ ] **Step 1: Write the release contract before bumping metadata**

Create `scripts/release-contract-v7.mjs`:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
assert.equal(pkg.version, '7.0.0', 'release metadata must identify v7.0.0');
assert.equal(typeof pkg.scripts?.['test:v7'], 'string', true, 'package must expose test:v7');
for (const required of ['test:v7:audio', 'v7-embodied-combat.mjs', 'v7-architecture-compatibility.mjs', 'performance-v7.mjs', 'test:file-protocol', 'test:v6']) {
  assert.match(pkg.scripts['test:v7'], new RegExp(required.replaceAll('.', '\\.')), `test:v7 must include ${required}`);
}
const lock = JSON.parse(fs.readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
assert.equal(lock.version, '7.0.0');
assert.equal(lock.packages?.['']?.version, '7.0.0');
const ui = fs.readFileSync(new URL('../src/ui/ui.js', import.meta.url), 'utf8');
const requiem = fs.readFileSync(new URL('../src/data/requiem.js', import.meta.url), 'utf8');
const readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const windowsReadme = fs.readFileSync(new URL('../WINDOWS_README.txt', import.meta.url), 'utf8');
assert.match(ui, /The Black Road · v7\.0\.0/);
assert.match(requiem, /version: '7\.0\.0'/);
assert.match(readme, /Version 7\.0\.0/);
assert.match(windowsReadme, /ASHEN COVENANT: THE BLACK ROAD 7\.0\.0/);
assert.equal(fs.existsSync(new URL('../docs/V7_RELEASE_REPORT.md', import.meta.url)), true);
console.log('Ashen Covenant v7 release contract regression passed.');
```

- [ ] **Step 2: Run and verify RED**

```bash
node scripts/release-contract-v7.mjs
```

Expected: fail because package/runtime/docs still report 6.0.0.

- [ ] **Step 3: Add final `test:v7` package script before version bump**

Set:

```json
"test:v7": "npm run test:v7:audio && node scripts/v7-embodied-combat.mjs && node scripts/v7-architecture-compatibility.mjs && node --expose-gc scripts/performance-v7.mjs && npm run test:v6 && npm run test:file-protocol && node scripts/release-contract-v7.mjs"
```

Keep `test:v6` unchanged.

- [ ] **Step 4: Bump package and lockfile versions to 7.0.0**

Update exactly:

```json
"version": "7.0.0"
```

in `package.json`, top-level `package-lock.json.version`, and `package-lock.json.packages[""].version`. Do not run an npm command that upgrades dependency versions.

- [ ] **Step 5: Update title/runtime/Windows version surfaces**

Replace `The Black Road · v6.0.0` with `The Black Road · v7.0.0` in `src/ui/ui.js`; update the release overview in `src/data/requiem.js` from `version: '6.0.0'` to `version: '7.0.0'`; update the Windows readme header to `ASHEN COVENANT: THE BLACK ROAD 7.0.0` while preserving Windows launch instructions.

- [ ] **Step 6: Add the README v7 release section**

At the top of `README.md`, update the introductory version statement and add a `## Version 7.0.0 — Embodied Covenant` section containing these verified bullets only after their tests exist:

```markdown
- **Manifest-owned player motion:** all six classes use required v7 body sheets through the shared action timeline and clip resolver; certified gameplay no longer depends on the static v5 hero fallback.
- **Visible equipment identity:** equipped slot families, Relic/Unique/Mythic signatures, Masterworking/corruption treatments, and Covenant materials resolve through a cached appearance contract.
- **Semantic combat soundscape:** weapon weight, target material, Guard/poise state, spells, executions, Hunters, bosses, Covenant accents, footsteps, loot, UI, and ambience use a manifest-backed v7 sample bank with bounded layering and voice budgets.
- **Unified presentation context:** animation, equipment, Covenant identity, VFX, impact feedback, and audio consume the same normalized gameplay facts without becoming gameplay authority.
- **Compatibility and certification:** v19 saves rebuild derived presentation state, Electron `file://` assets are release-gated, the 240+ actor presentation benchmark stays within the v7 budget, and `npm run test:v7` includes the complete v6 certification chain.
```

- [ ] **Step 7: Write `docs/V7_RELEASE_REPORT.md` from measured results**

Use this exact structure and fill only values printed by the actual tests:

```markdown
# Ashen Covenant v7.0.0 Release Report

## Scope
Embodied Covenant presentation release: player body animation, visible equipment identity, semantic combat audio, and unified presentation orchestration.

## Compatibility
- Save schema: 19 (unchanged)
- v6 migration matrix: PASS
- v7 load/save/reload continuity: PASS
- Presentation caches persisted: no

## Assets
- Required hero motion sheets: 6
- Equipment appearance atlases: 2
- Required semantic audio definitions: <value from validateV7AudioData>
- v7 generated WAV assets: <value from AUDIO_ASSETS_V7 excluding legacy entries>
- Electron file:// smoke: PASS

## Performance
- Stress actors: <value from performance-v7.mjs>
- Legacy presentation p95: <measured ms>
- v7 presentation p95: <measured ms>
- p95 regression: <measured percent>
- Appearance cache: <hits/misses from benchmark>
- Heap delta: <measured MB>

## Certification
- npm run test:v7:animation: PASS
- npm run test:v7:equipment: PASS
- npm run test:v7:audio: PASS
- v7 embodied combat: PASS
- v7 architecture/compatibility: PASS
- v7 performance: PASS
- npm run test:v6: PASS
- npm run test:file-protocol: PASS
- npm run test:v7: PASS
```

Do not write estimated performance values.

- [ ] **Step 8: Append the development log**

If `docs/DEVELOPMENT_LOG.md` exists, append one dated entry summarizing the four v7 plans, final certification command, and save schema remaining at 19. If the file does not exist, do not create a duplicate log system solely for v7.

- [ ] **Step 9: Run release contract**

```bash
node scripts/release-contract-v7.mjs
```

Expected: PASS.

- [ ] **Step 10: Commit release metadata/docs**

```bash
git add package.json package-lock.json README.md WINDOWS_README.txt src/ui/ui.js src/data/requiem.js docs/V7_RELEASE_REPORT.md docs/DEVELOPMENT_LOG.md scripts/release-contract-v7.mjs
git commit -m "release: prepare Ashen Covenant v7.0.0"
```

If `docs/DEVELOPMENT_LOG.md` does not exist, omit it from `git add`.

---

### Task 6: Final v7 certification and branch handoff

**Files:**
- No production changes expected. Any failure discovered here must be fixed in the owning subsystem with its focused regression first.

**Interfaces:**
- Produces: verified `v7-embodied-covenant` branch ready for review/merge.

- [ ] **Step 1: Run focused v7 slice gates**

```bash
npm run test:v7:animation
npm run test:v7:equipment
npm run test:v7:audio
node scripts/v7-embodied-combat.mjs
node scripts/v7-architecture-compatibility.mjs
node --expose-gc scripts/performance-v7.mjs
```

Expected: all PASS.

- [ ] **Step 2: Run complete historical certification**

```bash
npm run test:v6
```

Expected: PASS.

- [ ] **Step 3: Run packaged Electron certification**

```bash
npm run test:file-protocol
```

Expected: PASS.

- [ ] **Step 4: Run the final release command from a clean working tree**

```bash
git status --short
npm run test:v7
```

Expected: first command prints nothing; second command PASSes every v7 and v6 gate, packaged Electron smoke, and release contract.

- [ ] **Step 5: Re-run release contract after the full suite**

```bash
node scripts/release-contract-v7.mjs
```

Expected: PASS.

- [ ] **Step 6: Capture final evidence**

```bash
git rev-parse HEAD
git status --short
```

Record the commit SHA in the handoff. Working tree must be clean.

- [ ] **Step 7: Stop before merge/release integration**

Use the required `superpowers:verification-before-completion` skill, then `superpowers:finishing-a-development-branch` to present merge/PR/keep-branch options. Do not merge to `main`, tag, or publish a Windows binary without the user's explicit choice at that handoff.

---

## Plan 4 Exit Gate / Definition of Done

The v7 branch is implementation-complete only when:

```bash
npm run test:v7
```

passes from a clean `v7-embodied-covenant` working tree and `scripts/release-contract-v7.mjs` confirms version 7.0.0, `test:v7`, documentation, runtime title/version surfaces, and the release report. The handoff must include the final commit SHA, measured performance ratio, save schema (19), and Electron `file://` result.
