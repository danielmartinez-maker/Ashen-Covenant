# Ashen Covenant v7 Combat Soundscape Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace broad combat sample selection with a deterministic semantic audio registry/resolver, a packaged v7 WAV bank, layered weapon/material/Covenant impacts, and category-aware voice budgets while preserving the existing Web Audio mixer and adaptive music system.

**Architecture:** `src/data/audio-v7.js` owns asset and semantic sound definitions; `AudioPresentationResolver` maps the shared `PresentationCombatContext` plus presentation event type to bounded audio layers. `AudioDirector` remains the low-level mixer/player and gains manifest-backed sample loading plus category/concurrency budgets. `GamePresentationSystem` is the orchestration point so animation, hits, Covenant identity, boss/Hunter cues, and audio all consume the same normalized facts.

**Tech Stack:** JavaScript ES modules, Node.js built-ins for deterministic PCM/WAV generation and header validation, Web Audio API, existing presentation event bus, existing adaptive music system.

**Spec:** `docs/superpowers/specs/2026-08-21-v7-embodied-covenant-design.md`

## Global Constraints

- This plan starts only after `npm run test:v7:equipment` and `npm run test:v6` pass on `v7-embodied-covenant`.
- Keep `AudioDirector` as the existing Web Audio runtime; do not introduce a second mixer or external runtime audio service.
- New v7 audio lives under `public/assets/audio/v7/`; any intentional v5 reuse must be declared explicitly in the v7 manifest.
- Semantic audio lookup is O(1) after registry initialization.
- A resolved combat sound event has at most four layers.
- Global SFX voice budget is 36; category caps are enemy vocals 6, footsteps 8, impact clusters 10, ambient one-shots 4.
- Player critical, execution, Hunter, and boss cues may evict lower-priority distant voices; low-priority distant voices may not evict those cues.
- Required v7 audio decode/load failure fails v7 release validation. Optional layer failure emits one deduplicated warning and resolves to the nearest semantic fallback or silence.
- Audio is presentation-only: playback timing, selection, or failure cannot alter gameplay state.
- Existing adaptive music quantization, stingers, ducking, streamer-safe behavior, focus/background audio, and volume settings remain authoritative.
- Reduced/simplified effects lower optional audio density but preserve critical identity cues.
- Every production change follows RED -> GREEN -> relevant regression -> commit.

---

## File Structure

### New files

- `src/data/audio-v7.js` — v7 asset manifest, semantic definitions, material/weapon/Covenant maps, category budgets.
- `src/presentation/audio-resolver-v7.js` — pure deterministic semantic event/layer resolver.
- `scripts/generate-audio-v7.mjs` — deterministic 48 kHz 16-bit mono WAV generator using Node built-ins.
- `public/assets/audio/v7/*.wav` — generated v7 sample bank.
- `scripts/v7-audio-registry.mjs` — taxonomy/manifest/WAV header/required coverage regression.
- `scripts/v7-audio-resolver.mjs` — deterministic layering, caps, Covenant/material/weapon regression.
- `scripts/v7-audio-director.mjs` — fake-AudioContext mixer/preload/voice-budget regression.
- `scripts/v7-audio-integration.mjs` — live presentation event -> shared context -> resolved audio regression.

### Focused modifications

- `src/systems/audio.js` — manifest-backed v7 preload/playback and category/concurrency voice accounting.
- `src/presentation/system.js` — resolve v7 audio from presentation events and call `AudioDirector.playResolved()`.
- `src/presentation/event-bus.js` — add explicit v7 audio debug event types.
- `src/presentation/validator.js` — v7 audio data/runtime validation and 36-voice budget.
- `src/data/presentation.js` — leave existing `SOUND_PROFILES` for legacy bridge compatibility; do not expand it with v7 semantics.
- `package.json` — add `test:v7:audio`; do not bump release version yet.

---

### Task 1: Define the semantic v7 audio registry

**Files:**
- Create: `src/data/audio-v7.js`
- Create: `scripts/v7-audio-registry.mjs`

**Interfaces:**
- Produces: `AUDIO_CATEGORY_BUDGETS`, `AUDIO_ASSETS_V7`, `AUDIO_SEMANTIC_DEFINITIONS`, `AUDIO_REQUIRED_EVENT_FAMILIES`, `audioAsset(id)`, `audioDefinition(id)`.
- Semantic definition shape: `{ id, assets, bus, priority, concurrencyGroup, cooldown, gain, pitch, spatial, category, required, variants?, covenantVariants?, materialVariants?, maxLayers? }`.

- [ ] **Step 1: Write the failing registry coverage test**

Create `scripts/v7-audio-registry.mjs`:

```js
import assert from 'node:assert/strict';
import { AUDIO_ASSETS_V7, AUDIO_CATEGORY_BUDGETS, AUDIO_REQUIRED_EVENT_FAMILIES, AUDIO_SEMANTIC_DEFINITIONS, audioAsset, audioDefinition } from '../src/data/audio-v7.js';

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
console.log('Ashen Covenant v7 semantic audio registry regression passed.');
```

- [ ] **Step 2: Run and verify RED**

```bash
node scripts/v7-audio-registry.mjs
```

Expected: module-not-found failure.

- [ ] **Step 3: Create the asset manifest and event taxonomy**

Create `src/data/audio-v7.js`. Use stable IDs and explicit paths. The minimum generated v7 bank is:

```js
export const AUDIO_CATEGORY_BUDGETS = Object.freeze({ total: 36, enemyVocal: 6, footstep: 8, impact: 10, ambience: 4 });

const generated = [
  'swing-light-a', 'swing-light-b', 'swing-heavy-a', 'swing-heavy-b',
  'impact-flesh', 'impact-plate', 'impact-stone', 'impact-bone', 'guard-impact', 'guard-break', 'poise-break',
  'projectile-launch', 'projectile-pass', 'projectile-impact', 'spell-cast', 'spell-release', 'spell-impact', 'spell-field', 'summon',
  'dodge-cloth', 'execution-start', 'execution-contact', 'execution-finish',
  'enemy-effort', 'enemy-hurt', 'enemy-death', 'enemy-command',
  'hunter-intrusion', 'hunter-signature', 'boss-telegraph', 'boss-phase', 'boss-signature', 'boss-stagger', 'boss-death',
  'destruction', 'loot-drop', 'loot-pickup', 'unique-reveal', 'ui-confirm', 'ui-error', 'ui-warning',
  'ambience-ash', 'ambience-fog', 'ambience-rain', 'ambience-wind', 'ambience-rift', 'ambience-storm',
  'cov-flame', 'cov-grave', 'cov-blood', 'cov-light', 'cov-storm', 'cov-void'
];
export const AUDIO_ASSETS_V7 = Object.freeze(Object.fromEntries([
  ...generated.map((id) => [id, Object.freeze({ id, src: `/assets/audio/v7/${id}.wav`, required: true, legacy: false })]),
  ['footstep-stone-v5', Object.freeze({ id: 'footstep-stone-v5', src: '/assets/audio/v5/footstep-stone.wav', required: true, legacy: true })],
  ['footstep-mud-v5', Object.freeze({ id: 'footstep-mud-v5', src: '/assets/audio/v5/footstep-mud.wav', required: true, legacy: true })],
  ['footstep-water-v5', Object.freeze({ id: 'footstep-water-v5', src: '/assets/audio/v5/footstep-water.wav', required: true, legacy: true })],
  ['footstep-ash-v5', Object.freeze({ id: 'footstep-ash-v5', src: '/assets/audio/v5/footstep-ash.wav', required: true, legacy: true })]
]));

export const AUDIO_REQUIRED_EVENT_FAMILIES = Object.freeze([
  'weapon-swing', 'projectile-launch', 'projectile-pass', 'projectile-impact', 'physical-impact', 'guard-impact', 'guard-break',
  'armor-impact', 'poise-break', 'stagger', 'knockdown', 'spell-cast', 'spell-sustain', 'spell-release', 'spell-impact', 'spell-field', 'summon',
  'covenant-accent', 'dodge', 'execution-start', 'execution-contact', 'execution-finish', 'enemy-effort', 'enemy-hurt', 'enemy-death', 'enemy-command',
  'hunter-intrusion', 'hunter-signature', 'boss-telegraph', 'boss-phase', 'boss-signature', 'boss-stagger', 'boss-death', 'footstep', 'destruction',
  'loot-drop', 'loot-pickup', 'unique-reveal', 'ui-confirm', 'ui-error', 'ui-warning', 'regional-ambience'
]);
```

Build `AUDIO_SEMANTIC_DEFINITIONS` with these concrete defaults:

```js
const def = (id, assets, extra = {}) => Object.freeze({ id, assets: Object.freeze(assets), bus: 'abilities', priority: 3, concurrencyGroup: id, cooldown: 0.02, gain: 0.75, pitch: Object.freeze([0.96, 1.04]), spatial: 'actor', category: 'general', required: true, maxLayers: 1, ...extra });
export const AUDIO_SEMANTIC_DEFINITIONS = Object.freeze({
  'weapon-swing': def('weapon-swing', ['swing-light-a', 'swing-light-b'], { bus: 'abilities', category: 'impact', maxLayers: 2 }),
  'projectile-launch': def('projectile-launch', ['projectile-launch']),
  'projectile-pass': def('projectile-pass', ['projectile-pass'], { priority: 1, gain: 0.42 }),
  'projectile-impact': def('projectile-impact', ['projectile-impact'], { bus: 'impacts', category: 'impact', maxLayers: 3 }),
  'physical-impact': def('physical-impact', ['impact-flesh'], { bus: 'impacts', priority: 4, category: 'impact', maxLayers: 4 }),
  'guard-impact': def('guard-impact', ['guard-impact'], { bus: 'impacts', priority: 5, category: 'impact' }),
  'guard-break': def('guard-break', ['guard-break'], { bus: 'impacts', priority: 8, category: 'impact', gain: 0.9 }),
  'armor-impact': def('armor-impact', ['impact-plate'], { bus: 'impacts', category: 'impact' }),
  'poise-break': def('poise-break', ['poise-break'], { bus: 'impacts', priority: 7, category: 'impact' }),
  'stagger': def('stagger', ['poise-break'], { bus: 'impacts', priority: 6, category: 'impact' }),
  'knockdown': def('knockdown', ['impact-stone'], { bus: 'impacts', priority: 7, category: 'impact' }),
  'spell-cast': def('spell-cast', ['spell-cast'], { bus: 'abilities' }),
  'spell-sustain': def('spell-sustain', ['spell-field'], { bus: 'abilities', gain: 0.42, priority: 1 }),
  'spell-release': def('spell-release', ['spell-release'], { bus: 'abilities', priority: 4 }),
  'spell-impact': def('spell-impact', ['spell-impact'], { bus: 'impacts', priority: 5, category: 'impact', maxLayers: 3 }),
  'spell-field': def('spell-field', ['spell-field'], { bus: 'abilities', priority: 2 }),
  'summon': def('summon', ['summon'], { bus: 'abilities', priority: 5 }),
  'covenant-accent': def('covenant-accent', ['cov-void'], { bus: 'abilities', priority: 2, gain: 0.36 }),
  'dodge': def('dodge', ['dodge-cloth'], { bus: 'abilities', priority: 2 }),
  'execution-start': def('execution-start', ['execution-start'], { bus: 'impacts', priority: 9, category: 'impact' }),
  'execution-contact': def('execution-contact', ['execution-contact'], { bus: 'impacts', priority: 10, category: 'impact' }),
  'execution-finish': def('execution-finish', ['execution-finish'], { bus: 'impacts', priority: 10, category: 'impact' }),
  'enemy-effort': def('enemy-effort', ['enemy-effort'], { bus: 'enemyAbilities', category: 'enemyVocal', priority: 2 }),
  'enemy-hurt': def('enemy-hurt', ['enemy-hurt'], { bus: 'enemyAbilities', category: 'enemyVocal', priority: 2 }),
  'enemy-death': def('enemy-death', ['enemy-death'], { bus: 'enemyAbilities', category: 'enemyVocal', priority: 3 }),
  'enemy-command': def('enemy-command', ['enemy-command'], { bus: 'enemyAbilities', category: 'enemyVocal', priority: 5 }),
  'hunter-intrusion': def('hunter-intrusion', ['hunter-intrusion'], { bus: 'enemyAbilities', priority: 9 }),
  'hunter-signature': def('hunter-signature', ['hunter-signature'], { bus: 'enemyAbilities', priority: 8 }),
  'boss-telegraph': def('boss-telegraph', ['boss-telegraph'], { bus: 'enemyAbilities', priority: 7 }),
  'boss-phase': def('boss-phase', ['boss-phase'], { bus: 'enemyAbilities', priority: 10 }),
  'boss-signature': def('boss-signature', ['boss-signature'], { bus: 'enemyAbilities', priority: 9 }),
  'boss-stagger': def('boss-stagger', ['boss-stagger'], { bus: 'impacts', category: 'impact', priority: 9 }),
  'boss-death': def('boss-death', ['boss-death'], { bus: 'impacts', category: 'impact', priority: 10 }),
  'footstep': def('footstep', ['footstep-stone-v5'], { bus: 'footsteps', category: 'footstep', priority: 1, gain: 0.5 }),
  'destruction': def('destruction', ['destruction'], { bus: 'destruction', category: 'impact', priority: 4 }),
  'loot-drop': def('loot-drop', ['loot-drop'], { bus: 'ui', priority: 2, spatial: 'world' }),
  'loot-pickup': def('loot-pickup', ['loot-pickup'], { bus: 'ui', priority: 3, spatial: 'none' }),
  'unique-reveal': def('unique-reveal', ['unique-reveal'], { bus: 'ui', priority: 9, spatial: 'none' }),
  'ui-confirm': def('ui-confirm', ['ui-confirm'], { bus: 'ui', priority: 2, spatial: 'none' }),
  'ui-error': def('ui-error', ['ui-error'], { bus: 'ui', priority: 5, spatial: 'none' }),
  'ui-warning': def('ui-warning', ['ui-warning'], { bus: 'ui', priority: 6, spatial: 'none' }),
  'regional-ambience': def('regional-ambience', ['ambience-ash'], { bus: 'ambience', category: 'ambience', priority: 1, spatial: 'none', gain: 0.32 })
});
export const audioAsset = (id) => AUDIO_ASSETS_V7[id] ?? null;
export const audioDefinition = (id) => AUDIO_SEMANTIC_DEFINITIONS[id] ?? null;
```

- [ ] **Step 4: Run the registry regression**

```bash
node scripts/v7-audio-registry.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/audio-v7.js scripts/v7-audio-registry.mjs
git commit -m "feat: define v7 semantic audio registry"
```

---

### Task 2: Generate and validate the packaged v7 WAV bank

**Files:**
- Create: `scripts/generate-audio-v7.mjs`
- Create: `public/assets/audio/v7/*.wav`
- Modify: `scripts/v7-audio-registry.mjs`

**Interfaces:**
- Consumes: generated v7 asset IDs from `AUDIO_ASSETS_V7`.
- Produces: deterministic PCM WAV files, 48 kHz, 16-bit, mono, RIFF/WAVE headers, 60–850 ms one-shots.

- [ ] **Step 1: Add failing required-file/WAV-header checks**

Append to `scripts/v7-audio-registry.mjs`:

```js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
```

- [ ] **Step 2: Run and verify RED**

```bash
node scripts/v7-audio-registry.mjs
```

Expected: fail because the v7 WAV files are absent.

- [ ] **Step 3: Implement deterministic PCM generation**

Create `scripts/generate-audio-v7.mjs` using only Node built-ins. Implement reusable synthesis primitives exactly once:

```js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AUDIO_ASSETS_V7 } from '../src/data/audio-v7.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public', 'assets', 'audio', 'v7');
fs.mkdirSync(out, { recursive: true });
const rate = 48000;
const hash = (text) => [...text].reduce((value, char) => ((value * 33) ^ char.charCodeAt(0)) >>> 0, 5381);
const seeded = (seed) => () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 1_000_000) / 1_000_000; };
const envelope = (t, duration, attack = 0.008, release = 0.16) => Math.min(1, t / attack) * Math.min(1, Math.max(0, duration - t) / release);
const writeWav = (file, samples) => {
  const bytes = Buffer.alloc(44 + samples.length * 2);
  bytes.write('RIFF', 0); bytes.writeUInt32LE(36 + samples.length * 2, 4); bytes.write('WAVE', 8); bytes.write('fmt ', 12);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22); bytes.writeUInt32LE(rate, 24);
  bytes.writeUInt32LE(rate * 2, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34); bytes.write('data', 36); bytes.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((sample, index) => bytes.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(sample * 32767))), 44 + index * 2));
  fs.writeFileSync(file, bytes);
};
const render = (id, duration, voice) => {
  const count = Math.floor(rate * duration);
  const random = seeded(hash(id));
  const samples = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    const t = i / rate;
    samples[i] = Math.max(-1, Math.min(1, voice(t, duration, random) * envelope(t, duration)));
  }
  return samples;
};
const noise = (random) => random() * 2 - 1;
const tone = (t, hz) => Math.sin(t * Math.PI * 2 * hz);
```

Define a concrete synthesis profile per family instead of one generic beep. For example:

```js
const profileFor = (id) => {
  if (id.startsWith('swing-light')) return [0.16, (t, d, r) => noise(r) * 0.28 + tone(t, 220 + 480 * (1 - t / d)) * 0.18];
  if (id.startsWith('swing-heavy')) return [0.24, (t, d, r) => noise(r) * 0.34 + tone(t, 92 + 170 * (1 - t / d)) * 0.32];
  if (id.startsWith('impact-plate') || id === 'guard-impact' || id === 'guard-break') return [0.30, (t, d, r) => tone(t, 160) * 0.34 + tone(t, 320) * 0.18 + noise(r) * 0.20];
  if (id.startsWith('impact-')) return [0.24, (t, d, r) => noise(r) * 0.42 + tone(t, id.includes('flesh') ? 88 : 130) * 0.24];
  if (id.startsWith('cov-flame')) return [0.34, (t, d, r) => noise(r) * (0.18 + 0.2 * Math.sin(t * 90) ** 2) + tone(t, 260) * 0.12];
  if (id.startsWith('cov-grave')) return [0.46, (t) => tone(t, 72) * 0.30 + tone(t, 144) * 0.10];
  if (id.startsWith('cov-blood')) return [0.42, (t) => tone(t, 54 + Math.sin(t * 12) * 8) * 0.34];
  if (id.startsWith('cov-light')) return [0.46, (t) => tone(t, 660) * 0.16 + tone(t, 990) * 0.08];
  if (id.startsWith('cov-storm')) return [0.28, (t, d, r) => noise(r) * 0.34 * Math.max(0, Math.sin(t * 75)) + tone(t, 210) * 0.14];
  if (id.startsWith('cov-void')) return [0.50, (t, d, r) => tone(t, 44 + 90 * t / d) * 0.32 + noise(r) * 0.08];
  if (id.startsWith('ambience-')) return [0.85, (t, d, r) => noise(r) * 0.10 + tone(t, 38 + (hash(id) % 30)) * 0.08];
  if (id.startsWith('boss-') || id.startsWith('hunter-') || id.startsWith('execution-')) return [0.58, (t, d, r) => tone(t, 48 + 90 * (1 - t / d)) * 0.40 + noise(r) * 0.16];
  if (id.startsWith('enemy-')) return [0.34, (t, d, r) => tone(t, 105 + Math.sin(t * 23) * 30) * 0.24 + noise(r) * 0.18];
  if (id.startsWith('spell-') || id === 'summon') return [0.44, (t, d, r) => tone(t, 240 + 380 * t / d) * 0.20 + noise(r) * 0.10];
  if (id.startsWith('ui-') || id.startsWith('loot-') || id === 'unique-reveal') return [0.22, (t) => tone(t, id === 'ui-error' ? 170 : 520) * 0.22 + tone(t, id === 'unique-reveal' ? 780 : 0) * 0.10];
  return [0.28, (t, d, r) => noise(r) * 0.18 + tone(t, 180) * 0.16];
};
for (const asset of Object.values(AUDIO_ASSETS_V7).filter((entry) => !entry.legacy)) {
  const [duration, voice] = profileFor(asset.id);
  writeWav(path.join(out, `${asset.id}.wav`), render(asset.id, duration, voice));
}
console.log(`Generated ${Object.values(AUDIO_ASSETS_V7).filter((entry) => !entry.legacy).length} v7 WAV assets.`);
```

- [ ] **Step 4: Generate and validate all WAVs**

```bash
node scripts/generate-audio-v7.mjs
node scripts/v7-audio-registry.mjs
```

Expected: both PASS.

- [ ] **Step 5: Verify deterministic generation**

```bash
find public/assets/audio/v7 -type f -name '*.wav' -print0 | sort -z | xargs -0 sha256sum > /tmp/audio-v7-before.sha
node scripts/generate-audio-v7.mjs
sha256sum -c /tmp/audio-v7-before.sha
```

Expected: every WAV reports `OK`.

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-audio-v7.mjs scripts/v7-audio-registry.mjs public/assets/audio/v7
git commit -m "feat: add deterministic v7 combat audio bank"
```

---

### Task 3: Resolve semantic audio from shared combat context

**Files:**
- Create: `src/presentation/audio-resolver-v7.js`
- Create: `scripts/v7-audio-resolver.mjs`

**Interfaces:**
- Consumes: `PresentationCombatContext`, presentation event type/detail, v7 audio registry.
- Produces: `semanticAudioEventFor(eventType, detail, context) -> string | null`; `AudioPresentationResolver.resolve(eventType, detail, context, eventKey) -> Readonly<{ id, semanticId, layers, duck, priority }>`.
- Each layer shape: `{ assetId, bus, priority, concurrencyGroup, category, gain, pitch, pan }`.

- [ ] **Step 1: Write the failing deterministic layering regression**

Create `scripts/v7-audio-resolver.mjs`:

```js
import assert from 'node:assert/strict';
import { AudioPresentationResolver, semanticAudioEventFor } from '../src/presentation/audio-resolver-v7.js';

const resolver = new AudioPresentationResolver();
const context = Object.freeze({
  actorKind: 'player', weaponFamily: 'longsword', hitWeight: 'heavy', contactMaterial: 'plate', guardBroken: true,
  staggered: true, critical: true, covenantPrimary: 'flame', covenantStage: 4, covenantInstability: 0,
  settings: Object.freeze({ reducedVfx: false }), movementIntensity: 1, surface: 'stone', region: 'bellscar'
});
assert.equal(semanticAudioEventFor('combat:attack-impact', { critical: true }, context), 'physical-impact');
const first = resolver.resolve('combat:attack-impact', { critical: true }, context, 'hit-42');
const second = resolver.resolve('combat:attack-impact', { critical: true }, context, 'hit-42');
assert.deepEqual(first, second, 'stable event key must pick deterministic variants');
assert.ok(first.layers.length >= 3 && first.layers.length <= 4);
assert.ok(first.layers.some((layer) => layer.assetId === 'impact-plate'));
assert.ok(first.layers.some((layer) => layer.assetId === 'guard-break'));
assert.ok(first.layers.some((layer) => layer.assetId === 'cov-flame'));
const reduced = resolver.resolve('combat:attack-impact', { critical: true }, { ...context, settings: Object.freeze({ reducedVfx: true }) }, 'hit-42-reduced');
assert.ok(reduced.layers.length <= first.layers.length);
assert.ok(reduced.layers.some((layer) => layer.assetId === 'guard-break'), 'critical mechanical cue survives reduced density');
const foot = resolver.resolve('animation:footstep', { surface: 'stone', foot: 'left', speed: .7 }, context, 'foot-1');
assert.equal(foot.semanticId, 'footstep');
assert.equal(foot.layers[0].category, 'footstep');
console.log('Ashen Covenant v7 semantic audio resolver regression passed.');
```

- [ ] **Step 2: Run and verify RED**

```bash
node scripts/v7-audio-resolver.mjs
```

Expected: module-not-found failure.

- [ ] **Step 3: Implement event-to-semantic mapping**

Create `src/presentation/audio-resolver-v7.js`. Implement this mapping first:

```js
export const semanticAudioEventFor = (eventType, detail = {}, context = {}) => {
  if (eventType === 'animation:footstep') return 'footstep';
  if (eventType === 'combat:attack-start') return context.execution ? 'execution-start' : 'weapon-swing';
  if (eventType === 'combat:attack-impact') return context.execution ? 'execution-contact' : context.damageFamily === 'magic' ? 'spell-impact' : 'physical-impact';
  if (eventType === 'combat:enemy-telegraph') return context.actorKind === 'boss' ? 'boss-telegraph' : 'enemy-effort';
  if (eventType === 'combat:enemy-impact') return 'physical-impact';
  if (eventType === 'combat:boss-stagger') return 'boss-stagger';
  if (eventType === 'boss:signature-cue') return detail.phase > 1 ? 'boss-phase' : 'boss-signature';
  if (eventType === 'loot:spawn') return detail.rarity === 'unique' || detail.rarity === 'mythic' ? 'unique-reveal' : 'loot-drop';
  if (eventType === 'legacy:boss-defeated') return 'boss-death';
  if (eventType === 'legacy:player-dead') return null;
  if (eventType === 'legacy:sound' && detail.id === 'dodge') return 'dodge';
  return null;
};
```

- [ ] **Step 4: Implement deterministic variant/layer resolution**

Use a stable string hash and never `Math.random()` in the resolver. Material mapping is `{ flesh: 'impact-flesh', plate: 'impact-plate', metal: 'impact-plate', stone: 'impact-stone', bone: 'impact-bone' }`. Footstep mapping uses declared v5 asset IDs. Covenant accent maps `covenantPrimary` to `cov-<affinity>` and is included only from stage 2 upward; under `reducedVfx`, include it only for stage 5 or boss/Hunter signature events.

For `physical-impact`, build bounded layers in this order:

1. material impact;
2. `guard-break` when `context.guardBroken`, otherwise `guard-impact` when `context.guarded`;
3. `poise-break` when `context.staggered || context.poiseBroken`;
4. Covenant accent when eligible.

For `weapon-swing`, choose light/heavy assets from `context.hitWeight` and stable event hash. For regional ambience map regions to the six `ambience-*` assets. Clamp to `definition.maxLayers` and then to 4.

Return a frozen result and frozen layers.

- [ ] **Step 5: Run resolver regression**

```bash
node scripts/v7-audio-resolver.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/presentation/audio-resolver-v7.js scripts/v7-audio-resolver.mjs
git commit -m "feat: resolve layered v7 combat audio"
```

---

### Task 4: Add manifest-backed sample playback and category voice budgets

**Files:**
- Modify: `src/systems/audio.js`
- Create: `scripts/v7-audio-director.mjs`

**Interfaces:**
- Consumes: resolved event from Task 3 and `AUDIO_ASSETS_V7`/`AUDIO_CATEGORY_BUDGETS`.
- Produces: `AudioDirector.playResolved(resolvedEvent) -> boolean`, `_loadV7Asset(assetId)`, category-aware active voice records, `debug().categoryVoices`.

- [ ] **Step 1: Write a fake-AudioContext RED test**

Create `scripts/v7-audio-director.mjs` using the same `Parameter`/`Node` pattern as `scripts/adaptive-music.mjs`. Add `decodeAudioData()` returning a short fake buffer and mock `globalThis.fetch` to return `{ ok: true, arrayBuffer: async () => new ArrayBuffer(64) }`.

Test:

```js
import assert from 'node:assert/strict';
import { AudioDirector } from '../src/systems/audio.js';

const audio = new AudioDirector({ sound: true, masterVolume: 1, sfxVolume: 1, musicVolume: 0, ambienceVolume: 1 });
audio._createGraph(new FakeAudioContext());
await audio.preloadV7Required();
const event = Object.freeze({ id: 'test-hit', semanticId: 'physical-impact', priority: 8, duck: null, layers: Object.freeze([
  Object.freeze({ assetId: 'impact-plate', bus: 'impacts', priority: 8, concurrencyGroup: 'impact', category: 'impact', gain: .8, pitch: 1, pan: 0 }),
  Object.freeze({ assetId: 'guard-break', bus: 'impacts', priority: 9, concurrencyGroup: 'impact', category: 'impact', gain: .9, pitch: 1, pan: 0 })
]) });
assert.equal(audio.playResolved(event), true);
assert.equal(audio.debug().categoryVoices.impact, 2);
for (let index = 0; index < 20; index += 1) audio.playResolved({ ...event, id: `impact-${index}` });
assert.ok(audio.debug().categoryVoices.impact <= 10);
assert.ok(audio.debug().activeVoices <= 36);
console.log('Ashen Covenant v7 audio director regression passed.');
```

- [ ] **Step 2: Run and verify RED**

```bash
node scripts/v7-audio-director.mjs
```

Expected: failure because v7 preload/playback APIs do not exist.

- [ ] **Step 3: Import the v7 manifest and add required preload**

In `src/systems/audio.js`:

```js
import { AUDIO_ASSETS_V7, AUDIO_CATEGORY_BUDGETS, audioAsset } from '../data/audio-v7.js';
```

Add:

```js
async preloadV7Required() {
  const required = Object.values(AUDIO_ASSETS_V7).filter((asset) => asset.required);
  const results = await Promise.all(required.map((asset) => this._loadV7Asset(asset.id)));
  return results.every(Boolean);
}

async _loadV7Asset(assetId) {
  const asset = audioAsset(assetId);
  if (!asset || !this.context || this.samples.has(assetId) || this.sampleFailures.has(assetId)) return this.samples.get(assetId) ?? null;
  if (this.sampleLoads.has(assetId)) return this.sampleLoads.get(assetId);
  const promise = (async () => {
    try {
      const response = await fetch(resolveAssetUrl(asset.src));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = await this.context.decodeAudioData((await response.arrayBuffer()).slice(0));
      this.samples.set(assetId, buffer);
      return buffer;
    } catch {
      this.sampleFailures.add(assetId);
      return null;
    } finally { this.sampleLoads.delete(assetId); }
  })();
  this.sampleLoads.set(assetId, promise);
  return promise;
}
```

Keep current v5 `_loadSample(file)` only for the legacy `play(id, detail)` bridge.

- [ ] **Step 4: Add resolved-event playback**

Add `playResolved(resolved)` that ignores invalid/no-layer events, enforces sound/context state, loads missing v7 assets once, reserves voices per layer, then calls `_sample` with the v7 buffer key. Refactor `_sample` to accept either a stored key or explicit buffer and add voice metadata `{ category, concurrencyGroup }`.

Use this signature:

```js
playResolved(resolved = {})
```

and this reservation signature:

```js
_reserveVoices(count, priority, { category = 'general', concurrencyGroup = null } = {})
```

Before global eviction, count current live voices in the requested category and evict lowest-priority/oldest same-category voices until the category cap is satisfied. Then apply the existing global eviction logic against `AUDIO_CATEGORY_BUDGETS.total`.

- [ ] **Step 5: Raise global v7 limit and expose category debug data**

Set:

```js
this.maxSfxVoices = AUDIO_CATEGORY_BUDGETS.total;
```

Extend `debug()` with:

```js
categoryVoices: Object.fromEntries(['enemyVocal', 'footstep', 'impact', 'ambience', 'general'].map((category) => [category, this.activeVoices.filter((voice) => !voice.stopped && voice.category === category).length]))
```

- [ ] **Step 6: Run director and legacy audio regressions**

```bash
node scripts/v7-audio-director.mjs
node scripts/adaptive-music.mjs
node scripts/presentation-overhaul.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/systems/audio.js scripts/v7-audio-director.mjs
git commit -m "feat: add v7 manifest audio playback budgets"
```

---

### Task 5: Orchestrate semantic audio through `GamePresentationSystem`

**Files:**
- Modify: `src/presentation/system.js`
- Modify: `src/systems/audio.js`
- Modify: `src/presentation/event-bus.js`
- Create: `scripts/v7-audio-integration.mjs`

**Interfaces:**
- Consumes: presentation events + `PresentationCombatContextResolver` + `AudioPresentationResolver`.
- Produces: one resolved audio event per mapped presentation event; emits `audio:semantic-resolved` for strict debug/testing; calls `AudioDirector.playResolved()`.

- [ ] **Step 1: Add the strict event type**

Add to `EVENT_TYPES` in `src/presentation/event-bus.js`:

```js
'audio:semantic-resolved'
```

- [ ] **Step 2: Write a failing live event integration test**

Create `scripts/v7-audio-integration.mjs` with a real game/presentation fixture and a stub audio object:

```js
import assert from 'node:assert/strict';
import { GameEngine } from '../src/systems/game.js';
import { GamePresentationSystem } from '../src/presentation/system.js';

const played = [];
const audio = { attach() {}, update() {}, playResolved(event) { played.push(event); return true; }, debug() { return { activeVoices: 0, categoryVoices: {} }; } };
const input = { pointer: { active: false, worldX: 0, worldY: 0 }, tick() {}, updateWorldPointer() {}, getMove() { return { x: 0, y: 0, moving: false }; }, getAimDirection() { return null; }, isHeld() { return false; }, consume() { return false; }, defer() {}, rumble() {} };
const game = new GameEngine(input, { viewport: { width: 1280, height: 720, scale: 1 }, getAssetStatus: () => ({ ready: true, failed: [] }) }, { sound: true, reducedVfx: false });
const presentation = new GamePresentationSystem(game, { input, settings: game.settings, audio, strictEvents: true });
assert.equal(game.start('warden', 'thornseer'), true);
presentation.eventBus.emit('combat:attack-impact', { entityId: game.player.id, critical: true, hitResult: { weight: 'heavy', guardBroken: true }, damageType: 'physical', material: 'plate' }, { time: game.clock, source: 'test' });
assert.equal(played.length, 1);
assert.equal(played[0].semanticId, 'physical-impact');
assert.ok(played[0].layers.some((layer) => layer.assetId === 'guard-break'));
assert.equal(presentation.eventBus.recent('audio:semantic-resolved', 1).length, 1);
console.log('Ashen Covenant v7 audio orchestration regression passed.');
```

- [ ] **Step 3: Run and verify RED**

```bash
node scripts/v7-audio-integration.mjs
```

Expected: no resolved event is played yet.

- [ ] **Step 4: Construct and bind `AudioPresentationResolver`**

In `src/presentation/system.js` import:

```js
import { AudioPresentationResolver } from './audio-resolver-v7.js';
```

Construct:

```js
this.audioResolver = new AudioPresentationResolver();
```

Add a private binder called from `_bindEvents()` for these event types:

```js
[
  'animation:footstep', 'combat:attack-start', 'combat:attack-impact', 'combat:enemy-telegraph',
  'combat:enemy-impact', 'combat:boss-stagger', 'boss:signature-cue', 'loot:spawn',
  'legacy:boss-defeated', 'legacy:sound'
]
```

For each event, choose actor/target from `event.detail` when available, resolve one shared combat context using `this.combatContextResolver.resolve(...)`, then call:

```js
const resolved = this.audioResolver.resolve(event.type, event.detail, context, event.id);
if (resolved?.layers?.length) {
  this.eventBus.emit('audio:semantic-resolved', resolved, { time: event.time, source: 'audio-resolver-v7', priority: resolved.priority });
  this.audio?.playResolved?.(resolved);
}
```

- [ ] **Step 5: Prevent duplicate footstep playback**

In `AudioDirector.attach`, when a presentation bus is supplied, remove the direct `animation:footstep -> playFootstep` subscription. Keep `legacy:sound -> play(...)` only for unmigrated legacy cues. The v7 semantic resolver now owns footsteps.

- [ ] **Step 6: Run orchestration and legacy regressions**

```bash
node scripts/v7-audio-integration.mjs
node scripts/v7-audio-resolver.mjs
node scripts/v7-audio-director.mjs
node scripts/presentation-overhaul.mjs
node scripts/adaptive-music.mjs
```

Expected: PASS with no duplicate footstep sound path.

- [ ] **Step 7: Commit**

```bash
git add src/presentation/system.js src/presentation/event-bus.js src/systems/audio.js scripts/v7-audio-integration.mjs
git commit -m "feat: orchestrate semantic v7 combat audio"
```

---

### Task 6: Validate audio failure policy and certify Plan 3

**Files:**
- Modify: `src/presentation/validator.js`
- Modify: `scripts/v7-audio-registry.mjs`
- Modify: `scripts/v7-audio-director.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `validateV7AudioData()`, runtime category-budget checks, `npm run test:v7:audio`.

- [ ] **Step 1: Add failing data-validation assertion**

Append to `scripts/v7-audio-registry.mjs`:

```js
const { validateV7AudioData } = await import('../src/presentation/validator.js');
const validation = validateV7AudioData();
assert.equal(validation.valid, true, validation.issues.map((entry) => `${entry.code}: ${entry.message}`).join('\n'));
assert.equal(validation.summary.semanticEvents, AUDIO_REQUIRED_EVENT_FAMILIES.length);
```

- [ ] **Step 2: Implement `validateV7AudioData()`**

In `src/presentation/validator.js`, import the v7 audio tables and check:

```js
export const validateV7AudioData = () => {
  const issues = [];
  for (const id of AUDIO_REQUIRED_EVENT_FAMILIES) {
    const definition = AUDIO_SEMANTIC_DEFINITIONS[id];
    if (!definition) { issues.push(issue('error', 'V7_AUDIO_DEFINITION', `${id} is missing.`, id)); continue; }
    if (definition.maxLayers < 1 || definition.maxLayers > 4) issues.push(issue('error', 'V7_AUDIO_LAYERS', `${id} has invalid layer budget.`, id));
    for (const assetId of definition.assets) if (!AUDIO_ASSETS_V7[assetId]) issues.push(issue('error', 'V7_AUDIO_ASSET_REF', `${id} references missing ${assetId}.`, id));
  }
  for (const asset of Object.values(AUDIO_ASSETS_V7)) {
    if (!asset.src.startsWith('/assets/audio/')) issues.push(issue('error', 'V7_AUDIO_PATH', `${asset.id} has invalid asset path.`, asset.id));
    if (asset.legacy && !asset.src.startsWith('/assets/audio/v5/')) issues.push(issue('error', 'V7_AUDIO_LEGACY', `${asset.id} legacy path is not explicit v5.`, asset.id));
    if (!asset.legacy && !asset.src.startsWith('/assets/audio/v7/')) issues.push(issue('error', 'V7_AUDIO_PATH', `${asset.id} v7 path is invalid.`, asset.id));
  }
  return { valid: !issues.some((entry) => entry.severity === 'error'), issues, summary: { semanticEvents: AUDIO_REQUIRED_EVENT_FAMILIES.length, assets: Object.keys(AUDIO_ASSETS_V7).length } };
};
```

- [ ] **Step 3: Update runtime voice budget validation**

Replace the current hardcoded `> 32` warning with `> AUDIO_CATEGORY_BUDGETS.total`. Add warnings for category counts above their configured caps using `presentation.audio.debug().categoryVoices`.

- [ ] **Step 4: Test required decode failure bookkeeping**

Extend `scripts/v7-audio-director.mjs` with a second `AudioDirector` whose mocked `fetch` returns `ok: false`; assert `preloadV7Required()` returns false and `sampleFailures.size > 0`, then call preload again and assert the number of fetch calls does not increase for already-failed assets.

- [ ] **Step 5: Add package certification script**

Add to `package.json`:

```json
"test:v7:audio": "npm run test:v7:equipment && node scripts/v7-audio-registry.mjs && node scripts/v7-audio-resolver.mjs && node scripts/v7-audio-director.mjs && node scripts/v7-audio-integration.mjs && node scripts/adaptive-music.mjs && node scripts/presentation-overhaul.mjs"
```

- [ ] **Step 6: Run Plan 3 certification**

```bash
npm run test:v7:audio
```

Expected: PASS.

- [ ] **Step 7: Run full v6 gate**

```bash
npm run test:v6
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/presentation/validator.js scripts/v7-audio-registry.mjs scripts/v7-audio-director.mjs package.json
git commit -m "test: certify v7 combat soundscape"
```

---

## Plan 3 Exit Gate

Before starting integration/release, run:

```bash
npm run test:v7:audio
npm run test:v6
```

Expected: both PASS. Record the branch commit SHA as the dependency baseline for `2026-08-21-v7-integration-release.md`.
