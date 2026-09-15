# Ashen Covenant v7 Implementation Plan Self-Review

> **Normative execution note:** This file is part of the v7 implementation plan set. Where it tightens or replaces wording in one of the four component plans, this file is authoritative. Executors must read this file and the approved design spec before starting Plan 1.

**Spec:** `docs/superpowers/specs/2026-08-21-v7-embodied-covenant-design.md`

**Component plans:**

1. `docs/superpowers/plans/2026-08-21-v7-foundation-animation.md`
2. `docs/superpowers/plans/2026-08-21-v7-equipment-appearance.md`
3. `docs/superpowers/plans/2026-08-21-v7-combat-soundscape.md`
4. `docs/superpowers/plans/2026-08-21-v7-integration-release.md`

## Self-review result

Coverage is complete across the four plans: shared presentation context, animation, equipment appearance, semantic audio, orchestration, save compatibility, accessibility, performance, Electron packaging, and final release certification all map to explicit tasks. No `TBD`, `TODO`, or deferred placeholder requirement is permitted during execution.

The review found three places where the component-plan wording needed to be made more exact. The corrections below remove those ambiguities without changing the approved v7 scope.

---

## Correction 1 — Animation semantic clips versus authored source lanes

**Applies to:** `2026-08-21-v7-foundation-animation.md`, Task 2 and Task 3.

The existing six `hero-motion-<class>-v7.png` files are the starting authored body assets. The implementation must not pretend that two semantic clips are visually distinct merely because they have different names.

### Required source-lane policy

The existing atlas contract exposes ten authored source states per class:

```js
export const HERO_SOURCE_STATES = Object.freeze({
  idle: 0,
  run: 1,
  attack1: 2,
  attack2: 3,
  attack3: 4,
  cast: 5,
  dodge: 6,
  hit: 7,
  death: 8,
  ultimate: 9
});
```

The v7 semantic contract is layered on top of those authored source states. A semantic clip is valid only when it declares one of these two source policies:

```js
sourcePolicy: 'authored-lane' // the semantic maps directly to an authored source row
sourcePolicy: 'authored-subclip' // the semantic uses a bounded, named frame window from an authored source row
```

`authored-subclip` is allowed only for the semantic states below, where the existing source art can provide a visually meaningful sub-motion without changing gameplay timing:

```js
export const ALLOWED_AUTHORED_SUBCLIPS = Object.freeze({
  walk: Object.freeze({ sourceState: 'run', frameWindow: Object.freeze([0, 5]) }),
  turn: Object.freeze({ sourceState: 'idle', frameWindow: Object.freeze([2, 5]) }),
  heavy: Object.freeze({ sourceState: 'attack3', frameWindow: Object.freeze([1, 7]) }),
  companion: Object.freeze({ sourceState: 'cast', frameWindow: Object.freeze([1, 7]) }),
  hybrid: Object.freeze({ sourceState: 'cast', frameWindow: Object.freeze([0, 6]) }),
  guard: Object.freeze({ sourceState: 'idle', frameWindow: Object.freeze([1, 6]) }),
  'hit-light': Object.freeze({ sourceState: 'hit', frameWindow: Object.freeze([0, 4]) }),
  'hit-heavy': Object.freeze({ sourceState: 'hit', frameWindow: Object.freeze([2, 7]) }),
  knockdown: Object.freeze({ sourceState: 'death', frameWindow: Object.freeze([0, 4]) }),
  rise: Object.freeze({ sourceState: 'death', frameWindow: Object.freeze([7, 3]) }),
  execution: Object.freeze({ sourceState: 'attack3', frameWindow: Object.freeze([0, 7]) })
});
```

All other required semantic states must declare `sourcePolicy: 'authored-lane'` and map directly to the corresponding authored source row.

### Required validation

`validateV7AnimationData()` must reject semantic aliasing that is not listed in `ALLOWED_AUTHORED_SUBCLIPS`:

```js
for (const [id, clip] of Object.entries(PLAYER_ANIMATION_CLIPS)) {
  if (clip.sourcePolicy === 'authored-subclip') {
    const allowed = ALLOWED_AUTHORED_SUBCLIPS[clip.semantic];
    if (!allowed || allowed.sourceState !== clip.sourceState || allowed.frameWindow[0] !== clip.frameWindow[0] || allowed.frameWindow[1] !== clip.frameWindow[1]) {
      issues.push(issue('error', 'V7_ANIM_UNAUTHORED_ALIAS', `${id} uses an undeclared semantic alias.`, id));
    }
  } else if (clip.sourcePolicy !== 'authored-lane') {
    issues.push(issue('error', 'V7_ANIM_SOURCE_POLICY', `${id} has invalid source policy ${clip.sourcePolicy}.`, id));
  }
}
```

The animation contract test must assert:

```js
for (const clip of Object.values(PLAYER_ANIMATION_CLIPS)) {
  assert.ok(['authored-lane', 'authored-subclip'].includes(clip.sourcePolicy));
  if (clip.sourcePolicy === 'authored-subclip') assert.ok(ALLOWED_AUTHORED_SUBCLIPS[clip.semantic]);
}
```

This makes every permitted reuse explicit and reviewable. A new semantic reuse discovered during implementation cannot be accepted by simply adding another arbitrary alias in the resolver; it requires updating the approved animation data contract and its test.

---

## Correction 2 — Equipment family cells must be distinct in the first green implementation

**Applies to:** `2026-08-21-v7-equipment-appearance.md`, Task 1 and Task 3.

The placeholder-style `familyIndex = 0` implementation in Task 3 is superseded. Normal equipment families must resolve distinct atlas cells immediately.

### Add exact family-cell mapping to the manifest

After `EQUIPMENT_SLOT_FAMILIES`, add:

```js
const SLOT_ROW = Object.freeze({ weapon: 0, offhand: 1, head: 2, chest: 3, gloves: 4, boots: 5 });

export const EQUIPMENT_FAMILY_CELLS = Object.freeze(Object.fromEntries(
  Object.entries(EQUIPMENT_SLOT_FAMILIES).flatMap(([slot, families]) => families.map((family, column) => [
    `${slot}:${family}`,
    SLOT_ROW[slot] * 4 + column
  ]))
));

export const equipmentFamilyCell = (baseId, slot) => {
  const family = equipmentBaseFamily(baseId, slot);
  return EQUIPMENT_FAMILY_CELLS[`${slot}:${family}`] ?? EQUIPMENT_FAMILY_CELLS[`${slot}:${EQUIPMENT_SLOT_FAMILIES[slot]?.[0]}`] ?? 0;
};
```

Update the manifest test import and assert every base has a stable cell:

```js
import { equipmentFamilyCell } from '../src/data/equipment-appearance-v7.js';
for (const base of ITEM_BASES) {
  const cell = equipmentFamilyCell(base.id, base.slot);
  assert.ok(Number.isInteger(cell) && cell >= 0 && cell < 24, `${base.id} needs a valid family cell`);
}
assert.notEqual(equipmentFamilyCell('cleaver', 'weapon'), equipmentFamilyCell('focus', 'weapon'));
assert.notEqual(equipmentFamilyCell('cinder-mask', 'head'), equipmentFamilyCell('veiled-hood', 'head'));
```

### Replace Task 3 resolver cell selection

Import `equipmentFamilyCell`:

```js
import {
  EQUIPMENT_LAYER_ASSETS,
  RARITY_MATERIALS,
  equipmentBaseFamily,
  equipmentFamilyCell,
  uniqueSignature
} from '../data/equipment-appearance-v7.js';
```

Replace the superseded `SLOT_CELL` / `familyIndex` calculation with:

```js
const family = equipmentBaseFamily(item.baseId, slot);
const cell = equipmentFamilyCell(item.baseId, slot);
layers.push(Object.freeze({
  kind: 'slot',
  slot,
  assetId: EQUIPMENT_LAYER_ASSETS.layers.id,
  cell,
  family,
  order: SLOT_ORDER[slot],
  opacity: 0.72,
  blend: 'source-over',
  requiredIdentity: false
}));
```

Delete the component-plan sentence that suggests improving `familyIndex` after the first green pass; execution must use this exact mapping in the initial implementation.

---

## Correction 3 — AudioDirector v7 playback/voice interfaces are exact

**Applies to:** `2026-08-21-v7-combat-soundscape.md`, Task 4.

The component plan's prose about refactoring `_sample` and `_reserveVoices` is superseded by these concrete interfaces.

### Voice record

Every v7 sample voice stored in `activeVoices` must have this shape:

```js
{
  source,
  end,
  priority,
  stopped,
  sampled: true,
  category,
  concurrencyGroup,
  assetId
}
```

### Category cap helper

Add:

```js
_categoryCap(category) {
  if (category === 'enemyVocal') return AUDIO_CATEGORY_BUDGETS.enemyVocal;
  if (category === 'footstep') return AUDIO_CATEGORY_BUDGETS.footstep;
  if (category === 'impact') return AUDIO_CATEGORY_BUDGETS.impact;
  if (category === 'ambience') return AUDIO_CATEGORY_BUDGETS.ambience;
  return AUDIO_CATEGORY_BUDGETS.total;
}
```

### Exact v7 reservation method

Add a separate v7 reservation method so the legacy `play()` path is not accidentally changed while migrating:

```js
_reserveV7Voice(priority, { category = 'general', concurrencyGroup = null } = {}) {
  this.activeVoices = this.activeVoices.filter((voice) => voice.end > this.context.currentTime && !voice.stopped);
  const stopVoice = (voice) => {
    voice.stopped = true;
    try { voice.source.stop(); } catch { /* already ended */ }
    this.activeVoices = this.activeVoices.filter((entry) => entry !== voice);
  };
  const sameCategory = () => this.activeVoices.filter((voice) => voice.category === category);
  while (sameCategory().length >= this._categoryCap(category)) {
    const candidate = sameCategory().slice().sort((a, b) => a.priority - b.priority || a.end - b.end)[0];
    if (!candidate || candidate.priority > priority) return false;
    stopVoice(candidate);
  }
  if (concurrencyGroup) {
    const sameGroup = this.activeVoices.filter((voice) => voice.concurrencyGroup === concurrencyGroup);
    const groupCap = category === 'impact' ? 4 : category === 'enemyVocal' ? 2 : 3;
    while (sameGroup.length >= groupCap) {
      const candidate = sameGroup.slice().sort((a, b) => a.priority - b.priority || a.end - b.end)[0];
      if (!candidate || candidate.priority > priority) return false;
      stopVoice(candidate);
      sameGroup.splice(sameGroup.indexOf(candidate), 1);
    }
  }
  while (this.activeVoices.length >= AUDIO_CATEGORY_BUDGETS.total) {
    const candidate = this.activeVoices.slice().sort((a, b) => a.priority - b.priority || a.end - b.end)[0];
    if (!candidate || candidate.priority > priority) return false;
    stopVoice(candidate);
  }
  return true;
}
```

### Exact v7 sample method

Add a separate method rather than overloading the legacy `_sample` contract:

```js
_sampleV7(at, layer) {
  const buffer = this.samples.get(layer.assetId);
  if (!buffer) { this._loadV7Asset(layer.assetId); return false; }
  if (!this._reserveV7Voice(layer.priority, layer)) return false;
  const source = this.context.createBufferSource();
  const gain = this.context.createGain();
  source.buffer = buffer;
  source.playbackRate.setValueAtTime(clamp(Number(layer.pitch) || 1, 0.68, 1.55), at);
  gain.gain.setValueAtTime(Math.max(0.0001, Number(layer.gain) || 0.0001), at);
  source.connect(gain);
  const destination = this.buses[layer.bus] ?? this.buses.abilities;
  const spatial = this._connectSpatial(gain, destination, layer.pan ?? 0);
  const duration = Math.max(0.025, buffer.duration / Math.max(0.68, Number(layer.pitch) || 1));
  const voice = {
    source,
    end: at + duration + 0.015,
    priority: layer.priority,
    stopped: false,
    sampled: true,
    category: layer.category ?? 'general',
    concurrencyGroup: layer.concurrencyGroup ?? null,
    assetId: layer.assetId
  };
  this.activeVoices.push(voice);
  source.onended = () => {
    voice.stopped = true;
    try { source.disconnect(); gain.disconnect(); if (spatial !== destination) spatial.disconnect(); } catch { /* already collected */ }
  };
  source.start(at);
  return true;
}
```

### Exact resolved-event playback

Implement:

```js
playResolved(resolved = {}) {
  if (!this.settings.sound || !this.context || this.context.state && this.context.state !== 'running') return false;
  if (!Array.isArray(resolved.layers) || resolved.layers.length === 0) return false;
  const at = this.context.currentTime;
  let played = false;
  for (const layer of resolved.layers.slice(0, 4)) {
    if (!audioAsset(layer.assetId)) continue;
    if (!this.samples.has(layer.assetId)) this._loadV7Asset(layer.assetId);
    played = this._sampleV7(at, layer) || played;
  }
  return played;
}
```

The existing legacy `_sample`, `_reserveVoices`, and `play(id, detail)` methods remain intact until final integration proves no legacy regression depends on their exact behavior.

---

## Final self-review checklist

Before execution begins, the implementer must treat these as hard checks:

```text
[coverage] Every approved spec section maps to at least one task across Plans 1–4.
[placeholders] No Task 2 equipment-family cell is deferred; exact mapping is above.
[type consistency] PresentationCombatContext -> AnimationClipResolver / EquipmentAppearanceResolver / AudioPresentationResolver names and fields are stable across all plans.
[authority] No resolver owns damage, hit windows, resources, AI, loot rules, Covenant progression, or saves.
[persistence] Save schema remains 19 unless a new player-authored persistent cosmetic is explicitly introduced and separately approved.
[release] test:v7 must include test:v7:audio, integrated combat, architecture/compatibility, performance-v7, test:v6, file-protocol, and release-contract-v7.
```

With these corrections, the plan set is ready for execution.