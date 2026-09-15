# Ashen Covenant v7 Foundation + Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the v7 normalized presentation context, manifest-owned player animation clips, required body-asset validation, and renderer integration while preserving v6 gameplay timing and save behavior.

**Architecture:** Add a pure per-event/per-actor `PresentationCombatContextResolver`, a data-only animation manifest, and a pure `AnimationClipResolver`. `ActionTimelineController` remains authoritative for action timing and gameplay callbacks; the renderer consumes only resolved clip/frame/anchor output. The six existing `hero-motion-<class>-v7.png` files become required release assets and the certified v7 path no longer depends on `hero-facing-atlas-v5.png`.

**Tech Stack:** JavaScript ES modules, Node.js dependency-free regression scripts, Canvas 2D, existing Vite/Electron packaging, existing presentation event bus.

**Spec:** `docs/superpowers/specs/2026-08-21-v7-embodied-covenant-design.md`

## Global Constraints

- Work on branch `v7-embodied-covenant`.
- Preserve Ashen Covenant v6.0.0 gameplay authority: damage, hit windows, invulnerability, poise, Guard, cooldowns, resources, AI, loot, Covenant progression, and save state remain outside presentation code.
- Do not bump the save schema for derived presentation state.
- `ActionTimelineController` remains the authoritative source of elapsed action time, phase, cancel reason, and gameplay callbacks.
- Player bodies remain on the existing discrete eight-direction 2.5D stance model; continuous body rotation is prohibited.
- The six existing root assets `/assets/hero-motion-<class>-v7.png` are required v7 body assets.
- Certified v7 gameplay must not silently fall back to `hero-facing-atlas-v5.png` when a required body asset/clip is invalid.
- Resolver failures return neutral immutable presentation objects and emit `presentation:error`; they do not throw through gameplay update.
- Reduced motion, reduced flashing, reduced/simplified VFX, camera shake, and impact-pause settings remain authoritative.
- Animation frame lookup must be O(1) after manifest initialization.
- Every production change follows RED -> GREEN -> relevant regression -> commit.

---

## File Structure

### New files

- `src/presentation/combat-context-v7.js` — pure normalized presentation facts for player/enemy/action/hit events.
- `src/data/animation-v7.js` — required hero asset manifest, semantic clip registry, frame/anchor metadata, neutral fallbacks.
- `src/presentation/animation-clips-v7.js` — pure clip/frame resolver with reaction precedence and reduced-motion policy.
- `scripts/v7-combat-context.mjs` — unit/integration regression for normalized context and immutability.
- `scripts/v7-animation-contract.mjs` — six-class semantic clip, frame monotonicity, precedence, anchor, and no-static-fallback regression.
- `scripts/v7-animation-assets.mjs` — PNG header/grid/required-path validation for the six hero-motion sheets.

### Focused modifications

- `src/presentation/event-bus.js` — register v7 presentation-context/clip events used for debugging and strict tests.
- `src/presentation/animation.js` — expose normalized action progress and resolved clip state without changing gameplay callbacks.
- `src/presentation/system.js` — own one `PresentationCombatContextResolver` and one `AnimationClipResolver`; publish resolved player presentation state.
- `src/presentation/validator.js` — validate v7 clip registry, required assets, marker timing, and runtime clip state.
- `src/systems/renderer.js` — consume manifest/resolver output and make hero-motion assets required in certified path.
- `package.json` — add `test:v7:animation` only; do not bump package version in this plan.

---

### Task 1: Normalize presentation combat facts

**Files:**
- Create: `src/presentation/combat-context-v7.js`
- Create: `scripts/v7-combat-context.mjs`
- Modify: `src/presentation/event-bus.js`

**Interfaces:**
- Consumes: `GameEngine`, existing `resolveCovenantPresentationIdentity(covenant, ability)`, player/enemy/action/hit detail objects.
- Produces: `neutralPresentationCombatContext() -> Readonly<object>` and `PresentationCombatContextResolver.resolve(game, detail = {}, options = {}) -> Readonly<object>`.
- `options` shape: `{ actor?: object, eventType?: string | null, target?: object | null }`.
- Required result fields: `actorId`, `actorKind`, `enemyRole`, `bossId`, `hunterId`, `primaryClass`, `secondaryClass`, `hybridId`, `actionId`, `profileId`, `comboIndex`, `phase`, `actionProgress`, `eventId`, `facingLane`, `movementState`, `movementIntensity`, `elevation`, `grounded`, `surface`, `region`, `weaponFamily`, `offhandFamily`, `visibleEquipment`, `rarity`, `corruptionLevel`, `masterworkRank`, `visualSignatureIds`, `covenantPrimary`, `covenantSecondary`, `covenantStage`, `covenantInstability`, `covenantRupture`, `covenantIdentity`, `hitWeight`, `damageFamily`, `contactMaterial`, `guarded`, `guardBroken`, `poiseBroken`, `staggered`, `knockdown`, `execution`, `critical`, `settings`.

- [ ] **Step 1: Write the failing context regression**

Create `scripts/v7-combat-context.mjs` with a real `GameEngine` fixture and assertions that the resolver is missing first:

```js
import assert from 'node:assert/strict';
import { GameEngine } from '../src/systems/game.js';
import { PresentationCombatContextResolver, neutralPresentationCombatContext } from '../src/presentation/combat-context-v7.js';

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key)
};
const input = {
  pointer: { active: false, down: false, commandDirty: false, worldX: 0, worldY: 0 },
  tick() {}, updateWorldPointer() {}, getAimDirection() { return null; },
  getMove() { return { x: 0, y: 0, moving: false }; },
  consume() { return false; }, defer() {}, press() {}, rumble() {}
};
const renderer = { viewport: { width: 1280, height: 720, scale: 1 }, getAssetStatus: () => ({ ready: true, failed: [] }) };
const game = new GameEngine(input, renderer, { sound: false, reducedVfx: true, reducedMotion: true });
assert.equal(game.start('warden', 'thornseer'), true);
const resolver = new PresentationCombatContextResolver();
const context = resolver.resolve(game, {
  profileId: 'warden-basic-1', comboIndex: 1, eventId: 'EnableHitbox',
  hitResult: { weight: 'heavy', guardBroken: true, staggered: true },
  damageType: 'physical', material: 'plate'
}, { actor: game.player, eventType: 'combat:attack-impact' });
assert.equal(context.primaryClass, 'warden');
assert.equal(context.secondaryClass, 'thornseer');
assert.equal(context.actorKind, 'player');
assert.equal(context.hitWeight, 'heavy');
assert.equal(context.contactMaterial, 'plate');
assert.equal(context.guardBroken, true);
assert.equal(context.settings.reducedMotion, true);
assert.equal(Object.isFrozen(context), true);
assert.equal(Object.isFrozen(context.settings), true);
assert.equal(Object.isFrozen(neutralPresentationCombatContext()), true);
console.log('Ashen Covenant v7 presentation combat context regression passed.');
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node scripts/v7-combat-context.mjs
```

Expected: failure because `src/presentation/combat-context-v7.js` does not exist.

- [ ] **Step 3: Implement the neutral context and resolver**

Create `src/presentation/combat-context-v7.js` with stable helpers and a frozen result. Use the existing eight-way facing contract rather than inventing free rotation:

```js
import { clamp } from '../core/math.js';
import { zoneAt } from '../data/world.js';
import { getHybrid } from '../data/classes.js';
import { resolveCovenantPresentationIdentity } from './covenant-identity.js';

const FACING_STEP = Math.PI / 4;
const freezeRecord = (value) => Object.freeze({ ...(value ?? {}) });
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const laneFor = (angle = 0) => ((Math.round(finite(angle) / FACING_STEP) % 8) + 8) % 8;

export const neutralPresentationCombatContext = () => Object.freeze({
  actorId: null, actorKind: 'unknown', enemyRole: null, bossId: null, hunterId: null,
  primaryClass: null, secondaryClass: null, hybridId: null,
  actionId: 'idle', profileId: null, comboIndex: 0, phase: 'idle', actionProgress: 0, eventId: null,
  facingLane: 0, movementState: 'idle', movementIntensity: 0, elevation: 0, grounded: true,
  surface: 'stone', region: 'sanctuary', weaponFamily: null, offhandFamily: null,
  visibleEquipment: Object.freeze([]), rarity: 'common', corruptionLevel: 0, masterworkRank: 0,
  visualSignatureIds: Object.freeze([]), covenantPrimary: 'unbound', covenantSecondary: null,
  covenantStage: 0, covenantInstability: 0, covenantRupture: false,
  covenantIdentity: resolveCovenantPresentationIdentity({}, {}),
  hitWeight: 'light', damageFamily: 'physical', contactMaterial: 'flesh', guarded: false,
  guardBroken: false, poiseBroken: false, staggered: false, knockdown: false, execution: false,
  critical: false, settings: freezeRecord({ reducedMotion: false, reducedFlashing: false, reducedVfx: false })
});

export class PresentationCombatContextResolver {
  resolve(game, detail = {}, { actor = game?.player, eventType = null, target = null } = {}) {
    try {
      if (!game || !actor) return neutralPresentationCombatContext();
      const player = game.player;
      const action = actor === player ? player?.presentation?.action : null;
      const profile = action?.profile ?? {};
      const duration = Math.max(0.0001, finite(profile.duration, finite(actor?.animation?.duration, 1)));
      const elapsed = finite(action?.elapsed, duration - finite(actor?.animation?.time, duration));
      const covenant = game.getCovenantOverview?.() ?? {};
      const covenantIdentity = resolveCovenantPresentationIdentity(covenant, { abilityId: detail.abilityId, mutationId: detail.mutationId });
      const equipment = Object.values(player?.equipment ?? {}).filter(Boolean);
      const visibleEquipment = equipment.map((item) => Object.freeze({ slot: item.slot, baseId: item.baseId ?? null, uniqueId: item.uniqueId ?? null, rarity: item.rarity ?? 'common' }));
      const hit = detail.hitResult ?? detail.result ?? {};
      const zone = zoneAt(actor.x ?? player?.x ?? 0, actor.y ?? player?.y ?? 0);
      const hybrid = player ? getHybrid(player.primary, player.secondary) : null;
      const context = {
        actorId: actor.id ?? null,
        actorKind: actor === player ? 'player' : actor.boss ? 'boss' : actor.hunterId ? 'hunter' : 'enemy',
        enemyRole: actor.role ?? null, bossId: actor.boss ? actor.templateId ?? actor.id : null, hunterId: actor.hunterId ?? null,
        primaryClass: player?.primary ?? null, secondaryClass: player?.secondary ?? null, hybridId: hybrid?.id ?? null,
        actionId: detail.action ?? profile.action ?? actor.animation?.type ?? 'idle', profileId: detail.profileId ?? profile.id ?? actor.animation?.profileId ?? null,
        comboIndex: Math.max(0, Math.floor(finite(detail.comboIndex, profile.comboIndex ?? 0))), phase: detail.phase ?? action?.phase ?? 'idle',
        actionProgress: clamp(finite(detail.actionProgress, elapsed / duration), 0, 1), eventId: detail.eventId ?? null,
        facingLane: laneFor(actor.presentation?.visualFacing ?? actor.facing ?? 0), movementState: actor.presentation?.locomotion?.state ?? actor.state ?? 'idle',
        movementIntensity: clamp(finite(actor.presentation?.locomotion?.speedRatio, Math.hypot(actor.moveX ?? 0, actor.moveY ?? 0) / 250), 0, 1.5),
        elevation: Math.max(0, finite(actor.elevation, 0)), grounded: actor.grounded !== false, surface: actor.surface ?? 'stone', region: zone.id,
        weaponFamily: player?.presentation?.profile?.weapon ?? null, offhandFamily: player?.equipment?.offhand?.baseId ?? null,
        visibleEquipment: Object.freeze(visibleEquipment), rarity: detail.rarity ?? 'common', corruptionLevel: finite(detail.corruptionLevel, 0), masterworkRank: finite(detail.masterworkRank, 0),
        visualSignatureIds: Object.freeze(equipment.map((item) => item.visualSignatureId ?? item.uniqueId).filter(Boolean)),
        covenantPrimary: covenant.primary ?? 'unbound', covenantSecondary: covenant.secondary ?? null, covenantStage: finite(covenant.stage, 0),
        covenantInstability: finite(covenant.instability, 0), covenantRupture: Boolean(covenant.ruptureActive), covenantIdentity,
        hitWeight: detail.hitWeight ?? hit.weight ?? (detail.critical ? 'heavy' : 'light'), damageFamily: detail.damageFamily ?? detail.damageType ?? 'physical',
        contactMaterial: detail.contactMaterial ?? detail.material ?? target?.material ?? 'flesh', guarded: Boolean(hit.guarded ?? detail.guarded),
        guardBroken: Boolean(hit.guardBroken ?? detail.guardBroken), poiseBroken: Boolean(hit.poiseBroken ?? detail.poiseBroken), staggered: Boolean(hit.staggered ?? detail.staggered),
        knockdown: Boolean(hit.knockdown ?? detail.knockdown), execution: Boolean(detail.execution || detail.source === 'execution'), critical: Boolean(detail.critical),
        settings: freezeRecord({ reducedMotion: game.settings?.reducedMotion === true, reducedFlashing: game.settings?.reducedFlashing === true, reducedVfx: game.settings?.reducedVfx === true }),
        eventType
      };
      return Object.freeze(context);
    } catch (error) {
      game?.presentation?.eventBus?.emit('presentation:error', { subsystem: 'combat-context-v7', message: error?.message ?? String(error) }, { time: game?.clock ?? 0, source: 'combat-context-v7', priority: 100 });
      return neutralPresentationCombatContext();
    }
  }
}
```

- [ ] **Step 4: Register strict-mode debug event types**

In `src/presentation/event-bus.js`, append these concrete event names to `EVENT_TYPES`:

```js
'presentation:combat-context', 'animation:clip-resolved'
```

Do not bridge them from legacy engine events; they are emitted by v7 presentation code only.

- [ ] **Step 5: Run the context regression**

Run:

```bash
node scripts/v7-combat-context.mjs
```

Expected: PASS and `Ashen Covenant v7 presentation combat context regression passed.`

- [ ] **Step 6: Run relevant legacy regressions**

Run:

```bash
node scripts/covenant-presentation-v6.mjs
node scripts/presentation-overhaul.mjs
```

Expected: both PASS.

- [ ] **Step 7: Commit**

```bash
git add src/presentation/combat-context-v7.js src/presentation/event-bus.js scripts/v7-combat-context.mjs
git commit -m "feat: add v7 presentation combat context"
```

---

### Task 2: Define the v7 animation manifest and pure clip resolver

**Files:**
- Create: `src/data/animation-v7.js`
- Create: `src/presentation/animation-clips-v7.js`
- Create: `scripts/v7-animation-contract.mjs`

**Interfaces:**
- Consumes: frozen `PresentationCombatContext` from Task 1.
- Produces: `HERO_MOTION_ASSETS`, `ANIMATION_SEMANTIC_STATES`, `PLAYER_ANIMATION_CLIPS`, `clipById(id)`, `AnimationClipResolver.resolve(context) -> Readonly<{ clipId, assetId, row, facingLane, frame, frameCount, progress, anchors, loop, sourcePath, semanticState }>`.
- The resolver must not mutate the context or game state.

- [ ] **Step 1: Write the failing semantic clip regression**

Create `scripts/v7-animation-contract.mjs` with coverage for all six classes and required semantic families:

```js
import assert from 'node:assert/strict';
import { ANIMATION_SEMANTIC_STATES, HERO_MOTION_ASSETS, PLAYER_ANIMATION_CLIPS } from '../src/data/animation-v7.js';
import { AnimationClipResolver } from '../src/presentation/animation-clips-v7.js';

const classes = ['warden', 'thornseer', 'ironbound', 'veilrunner', 'gravebinder', 'dawnstrider'];
const required = ['idle', 'walk', 'run', 'turn', 'dodge', 'attack1', 'attack2', 'attack3', 'heavy', 'cast', 'companion', 'hybrid', 'ultimate', 'guard', 'hit-light', 'hit-heavy', 'knockdown', 'rise', 'execution', 'death'];
for (const classId of classes) {
  assert.ok(HERO_MOTION_ASSETS[classId]?.required, `${classId} body asset must be required`);
  for (const semantic of required) assert.ok(PLAYER_ANIMATION_CLIPS[`${classId}:${semantic}`], `${classId}:${semantic} must resolve`);
}
assert.deepEqual([...ANIMATION_SEMANTIC_STATES], required);
const resolver = new AnimationClipResolver();
const base = Object.freeze({ primaryClass: 'warden', actionId: 'attack', comboIndex: 2, phase: 'active', actionProgress: 0.51, facingLane: 3, movementState: 'idle', movementIntensity: 0, execution: false, knockdown: false, staggered: false, critical: false, settings: Object.freeze({ reducedMotion: false }) });
const resolved = resolver.resolve(base);
assert.equal(resolved.semanticState, 'attack2');
assert.equal(resolved.facingLane, 3);
assert.ok(resolved.frame >= 0 && resolved.frame < resolved.frameCount);
assert.equal(Object.isFrozen(resolved), true);
let previous = -1;
for (let step = 0; step <= 20; step += 1) {
  const frame = resolver.resolve(Object.freeze({ ...base, actionProgress: step / 20 })).frame;
  assert.ok(frame >= previous, `clip frames must be monotonic at step ${step}`);
  previous = frame;
}
assert.equal(resolver.resolve(Object.freeze({ ...base, actionId: 'idle', movementState: 'run', movementIntensity: 1 })).semanticState, 'run');
assert.equal(resolver.resolve(Object.freeze({ ...base, actionId: 'idle', movementState: 'run', movementIntensity: 1, settings: Object.freeze({ reducedMotion: true }) })).semanticState, 'walk');
console.log('Ashen Covenant v7 animation clip contract regression passed.');
```

- [ ] **Step 2: Run and verify RED**

```bash
node scripts/v7-animation-contract.mjs
```

Expected: module-not-found failure.

- [ ] **Step 3: Add the manifest with explicit source ownership**

Create `src/data/animation-v7.js`. Keep paths centralized and preserve the current 8-column / 8-facing / 10-source-state atlas contract. Required semantic clips may reuse a source state with distinct frame windows/timing curves, but every semantic clip gets its own stable ID and marker metadata.

Use this concrete manifest shape:

```js
export const HERO_MOTION_ASSETS = Object.freeze(Object.fromEntries(
  ['warden', 'thornseer', 'ironbound', 'veilrunner', 'gravebinder', 'dawnstrider'].map((classId) => [classId, Object.freeze({
    id: `hero-motion-${classId}-v7`,
    classId,
    src: `/assets/hero-motion-${classId}-v7.png`,
    columns: 8,
    facingLanes: 8,
    sourceStates: 10,
    required: true
  })])
));

export const ANIMATION_SEMANTIC_STATES = Object.freeze([
  'idle', 'walk', 'run', 'turn', 'dodge', 'attack1', 'attack2', 'attack3', 'heavy', 'cast',
  'companion', 'hybrid', 'ultimate', 'guard', 'hit-light', 'hit-heavy', 'knockdown', 'rise', 'execution', 'death'
]);

const source = Object.freeze({ idle: 0, run: 1, attack1: 2, attack2: 3, attack3: 4, cast: 5, dodge: 6, hit: 7, death: 8, ultimate: 9 });
const definitions = {
  idle: ['idle', [0, 7], true, 0.50], walk: ['run', [0, 5], true, 0.42], run: ['run', [0, 7], true, 0.56], turn: ['idle', [2, 5], false, 0.28],
  dodge: ['dodge', [0, 7], false, 0.48], attack1: ['attack1', [0, 7], false, 0.52], attack2: ['attack2', [0, 7], false, 0.56], attack3: ['attack3', [0, 7], false, 0.62],
  heavy: ['attack3', [1, 7], false, 0.66], cast: ['cast', [0, 7], false, 0.58], companion: ['cast', [1, 7], false, 0.62], hybrid: ['cast', [0, 6], false, 0.64],
  ultimate: ['ultimate', [0, 7], false, 0.82], guard: ['idle', [1, 6], true, 0.40], 'hit-light': ['hit', [0, 4], false, 0.24], 'hit-heavy': ['hit', [2, 7], false, 0.34],
  knockdown: ['death', [0, 4], false, 0.42], rise: ['death', [7, 3], false, 0.48], execution: ['attack3', [0, 7], false, 0.72], death: ['death', [0, 7], false, 0.90]
};
const anchors = Object.freeze({ body: [0, -0.26], hand: [0.38, -0.08], offhand: [-0.30, -0.02], head: [0, -0.58], torso: [0, -0.23], feet: [0, 0.42] });

export const PLAYER_ANIMATION_CLIPS = Object.freeze(Object.fromEntries(
  Object.keys(HERO_MOTION_ASSETS).flatMap((classId) => ANIMATION_SEMANTIC_STATES.map((semantic) => {
    const [sourceState, frameWindow, loop, nominalDuration] = definitions[semantic];
    return [`${classId}:${semantic}`, Object.freeze({
      id: `${classId}:${semantic}`, classId, semantic, assetId: HERO_MOTION_ASSETS[classId].id,
      sourcePath: HERO_MOTION_ASSETS[classId].src, sourceState, rowBase: source[sourceState],
      frameWindow: Object.freeze(frameWindow), frameCount: Math.abs(frameWindow[1] - frameWindow[0]) + 1,
      loop, nominalDuration, marker: semantic.startsWith('attack') || semantic === 'heavy' || semantic === 'execution' ? 0.52 : semantic === 'cast' || semantic === 'companion' || semantic === 'hybrid' || semantic === 'ultimate' ? 0.60 : null,
      anchors
    })];
  }))
));

export const clipById = (id) => PLAYER_ANIMATION_CLIPS[id] ?? PLAYER_ANIMATION_CLIPS['warden:idle'];
```

The reverse `rise` window is intentional. The resolver must support descending frame windows.

- [ ] **Step 4: Implement deterministic semantic resolution and frame sampling**

Create `src/presentation/animation-clips-v7.js`:

```js
import { clamp } from '../core/math.js';
import { PLAYER_ANIMATION_CLIPS, clipById } from '../data/animation-v7.js';

const semanticFor = (context) => {
  if (context.actorKind === 'player' && context.actionId === 'death') return 'death';
  if (context.knockdown) return 'knockdown';
  if (context.staggered) return context.hitWeight === 'heavy' ? 'hit-heavy' : 'hit-light';
  if (context.execution) return 'execution';
  if (context.actionId === 'dodge') return 'dodge';
  if (context.actionId === 'attack') return `attack${Math.max(1, Math.min(3, context.comboIndex || 1))}`;
  if (context.actionId === 'heavy' || context.actionId === 'empowered') return 'heavy';
  if (['skillOne', 'skillTwo', 'cast'].includes(context.actionId)) return 'cast';
  if (context.actionId === 'companion') return 'companion';
  if (context.actionId === 'hybrid') return 'hybrid';
  if (context.actionId === 'ultimate') return 'ultimate';
  if (context.actionId === 'guard' || context.actionId === 'ward') return 'guard';
  if (context.movementState === 'pivot' || context.movementState === 'start' || context.movementState === 'stop') return 'turn';
  if (context.movementState === 'run' || context.movementState === 'combat-run') return context.settings?.reducedMotion ? 'walk' : 'run';
  if (context.movementState === 'walk') return 'walk';
  return 'idle';
};

const sampleWindow = (window, progress) => {
  const [from, to] = window;
  const count = Math.abs(to - from) + 1;
  const offset = Math.min(count - 1, Math.floor(clamp(progress, 0, 0.999999) * count));
  return from <= to ? from + offset : from - offset;
};

export class AnimationClipResolver {
  resolve(context = {}) {
    try {
      const semanticState = semanticFor(context);
      const classId = context.primaryClass && PLAYER_ANIMATION_CLIPS[`${context.primaryClass}:${semanticState}`] ? context.primaryClass : 'warden';
      const clip = clipById(`${classId}:${semanticState}`);
      const progress = clamp(Number(context.actionProgress ?? context.movementIntensity ?? 0), 0, 1);
      const frame = sampleWindow(clip.frameWindow, clip.loop ? progress % 1 : progress);
      return Object.freeze({
        clipId: clip.id, assetId: clip.assetId, semanticState, sourcePath: clip.sourcePath,
        row: clip.rowBase * 8 + Math.max(0, Math.min(7, context.facingLane ?? 0)),
        facingLane: Math.max(0, Math.min(7, context.facingLane ?? 0)), frame,
        frameCount: clip.frameCount, progress, anchors: clip.anchors, loop: clip.loop, marker: clip.marker
      });
    } catch {
      const clip = clipById('warden:idle');
      return Object.freeze({ clipId: clip.id, assetId: clip.assetId, semanticState: 'idle', sourcePath: clip.sourcePath, row: 0, facingLane: 0, frame: 0, frameCount: clip.frameCount, progress: 0, anchors: clip.anchors, loop: true, marker: null });
    }
  }
}
```

- [ ] **Step 5: Run the semantic clip regression**

```bash
node scripts/v7-animation-contract.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/animation-v7.js src/presentation/animation-clips-v7.js scripts/v7-animation-contract.mjs
git commit -m "feat: add v7 animation clip registry"
```

---

### Task 3: Release-gate the six current hero-motion assets

**Files:**
- Create: `scripts/v7-animation-assets.mjs`
- Modify: `src/presentation/validator.js`

**Interfaces:**
- Consumes: `HERO_MOTION_ASSETS`, `PLAYER_ANIMATION_CLIPS`.
- Produces: validator issues with stable codes `V7_ANIM_ASSET`, `V7_ANIM_CLIP`, `V7_ANIM_MARKER`, `V7_ANIM_ANCHOR`; `validateV7AnimationData()`.

- [ ] **Step 1: Write the failing asset test**

Create `scripts/v7-animation-assets.mjs` using only Node built-ins:

```js
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
console.log('Ashen Covenant v7 hero animation asset regression passed.');
```

- [ ] **Step 2: Run and confirm current assets satisfy the concrete grid contract**

```bash
node scripts/v7-animation-assets.mjs
```

Expected: PASS. If this fails, fix manifest dimensions only when the PNG header proves the current grid differs; do not weaken required classification or remove alpha checks.

- [ ] **Step 3: Add `validateV7AnimationData()`**

In `src/presentation/validator.js`, import the v7 animation registry and add:

```js
import { ANIMATION_SEMANTIC_STATES, HERO_MOTION_ASSETS, PLAYER_ANIMATION_CLIPS } from '../data/animation-v7.js';

export const validateV7AnimationData = () => {
  const issues = [];
  for (const [classId, asset] of Object.entries(HERO_MOTION_ASSETS)) {
    if (!asset.required || !asset.src.startsWith('/assets/hero-motion-') || !asset.src.endsWith('-v7.png')) issues.push(issue('error', 'V7_ANIM_ASSET', `${classId} has an invalid required body asset.`, classId));
    for (const semantic of ANIMATION_SEMANTIC_STATES) {
      const clip = PLAYER_ANIMATION_CLIPS[`${classId}:${semantic}`];
      if (!clip) { issues.push(issue('error', 'V7_ANIM_CLIP', `${classId}:${semantic} is missing.`, classId)); continue; }
      if (!Array.isArray(clip.frameWindow) || clip.frameWindow.length !== 2 || clip.frameWindow.some((value) => !Number.isInteger(value) || value < 0 || value > 7)) issues.push(issue('error', 'V7_ANIM_CLIP', `${clip.id} has an invalid frame window.`, clip.id));
      if (!clip.anchors?.body || !clip.anchors?.hand || !clip.anchors?.feet) issues.push(issue('error', 'V7_ANIM_ANCHOR', `${clip.id} is missing required anchors.`, clip.id));
      if (clip.marker !== null && !(clip.marker >= 0 && clip.marker <= 1)) issues.push(issue('error', 'V7_ANIM_MARKER', `${clip.id} has invalid marker timing.`, clip.id));
    }
  }
  return { valid: !issues.some((entry) => entry.severity === 'error'), issues, summary: { assets: Object.keys(HERO_MOTION_ASSETS).length, clips: Object.keys(PLAYER_ANIMATION_CLIPS).length } };
};
```

- [ ] **Step 4: Extend the test to validate registry data**

Append to `scripts/v7-animation-assets.mjs`:

```js
const { validateV7AnimationData } = await import('../src/presentation/validator.js');
const validation = validateV7AnimationData();
assert.equal(validation.valid, true, validation.issues.map((entry) => `${entry.code}: ${entry.message}`).join('\n'));
assert.equal(validation.summary.assets, 6);
assert.equal(validation.summary.clips, 120);
```

- [ ] **Step 5: Run asset and legacy validator regressions**

```bash
node scripts/v7-animation-assets.mjs
node scripts/presentation-overhaul.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/v7-animation-assets.mjs src/presentation/validator.js
git commit -m "test: release-gate v7 hero animation assets"
```

---

### Task 4: Integrate clip resolution into the live presentation system

**Files:**
- Modify: `src/presentation/animation.js`
- Modify: `src/presentation/system.js`
- Modify: `scripts/v7-animation-contract.mjs`

**Interfaces:**
- Consumes: `PresentationCombatContextResolver`, `AnimationClipResolver`.
- Produces: `player.presentation.combatContext` and `player.presentation.resolvedClip`; emits `presentation:combat-context` and `animation:clip-resolved` only when the resolved signature changes.

- [ ] **Step 1: Add a failing live integration assertion**

Extend `scripts/v7-animation-contract.mjs` with a `GameEngine` + `GamePresentationSystem` fixture and assert:

```js
const { GameEngine } = await import('../src/systems/game.js');
const { GamePresentationSystem } = await import('../src/presentation/system.js');
const input = { pointer: { active: false, worldX: 0, worldY: 0 }, tick() {}, updateWorldPointer() {}, getMove() { return { x: 0, y: 0, moving: false }; }, getAimDirection() { return null; }, isHeld() { return false; }, consume() { return false; }, defer() {}, rumble() {} };
const game = new GameEngine(input, { viewport: { width: 1280, height: 720, scale: 1 }, getAssetStatus: () => ({ ready: true, failed: [] }) }, { sound: false, reducedVfx: true });
const presentation = new GamePresentationSystem(game, { input, settings: game.settings, audio: null, strictEvents: true });
assert.equal(game.start('warden', 'thornseer'), true);
presentation.update(1 / 60);
assert.equal(game.player.presentation.combatContext.primaryClass, 'warden');
assert.equal(game.player.presentation.resolvedClip.clipId, 'warden:idle');
assert.ok(presentation.eventBus.recent('animation:clip-resolved', 1).length === 1);
```

- [ ] **Step 2: Run and verify RED**

```bash
node scripts/v7-animation-contract.mjs
```

Expected: failure because `resolvedClip` is not populated.

- [ ] **Step 3: Wire resolvers into `GamePresentationSystem`**

In `src/presentation/system.js`, import and construct the resolvers:

```js
import { PresentationCombatContextResolver } from './combat-context-v7.js';
import { AnimationClipResolver } from './animation-clips-v7.js';
```

Add in the constructor:

```js
this.combatContextResolver = new PresentationCombatContextResolver();
this.animationClipResolver = new AnimationClipResolver();
this.lastResolvedClipSignature = '';
```

After `animationDirector.update(...)` in `update(delta)`, derive and publish the live player clip:

```js
if (this.game?.player) {
  const combatContext = this.combatContextResolver.resolve(this.game, {}, { actor: this.game.player, eventType: 'frame' });
  const resolvedClip = this.animationClipResolver.resolve(combatContext);
  this.game.player.presentation ??= {};
  this.game.player.presentation.combatContext = combatContext;
  this.game.player.presentation.resolvedClip = resolvedClip;
  const signature = `${resolvedClip.clipId}|${resolvedClip.row}|${resolvedClip.frame}`;
  if (signature !== this.lastResolvedClipSignature) {
    this.lastResolvedClipSignature = signature;
    this.eventBus.emit('animation:clip-resolved', resolvedClip, { time: this.game.clock, source: 'animation-clips-v7' });
  }
}
```

Do not call gameplay methods from the resolver path.

- [ ] **Step 4: Expose normalized action progress from `AnimationDirector`**

In `src/presentation/animation.js`, after updating `locomotion`, set:

```js
player.presentation.actionProgress = this.timeline.current
  ? clamp(this.timeline.current.elapsed / Math.max(0.0001, this.timeline.current.profile.duration), 0, 1)
  : 0;
```

Update `combat-context-v7.js` to prefer `player.presentation.actionProgress` when no explicit `detail.actionProgress` exists.

- [ ] **Step 5: Run integration and legacy regressions**

```bash
node scripts/v7-animation-contract.mjs
node scripts/presentation-overhaul.mjs
node scripts/covenant-presentation-v6.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/presentation/animation.js src/presentation/system.js src/presentation/combat-context-v7.js scripts/v7-animation-contract.mjs
git commit -m "feat: resolve live v7 player animation clips"
```

---

### Task 5: Make renderer consume required manifest-owned hero motion

**Files:**
- Modify: `src/systems/renderer.js`
- Modify: `scripts/v7-animation-contract.mjs`
- Modify: `scripts/v7-animation-assets.mjs`

**Interfaces:**
- Consumes: `player.presentation.resolvedClip`, `HERO_MOTION_ASSETS`.
- Produces: manifest-backed `assets.heroMotion[classId]` load state and exact frame rendering from `{ row, frame }`.

- [ ] **Step 1: Add failing static-source assertions**

Append to `scripts/v7-animation-contract.mjs`:

```js
import fs from 'node:fs';
const rendererSource = fs.readFileSync(new URL('../src/systems/renderer.js', import.meta.url), 'utf8');
assert.match(rendererSource, /resolvedClip/, 'renderer must consume v7 resolved clip state');
assert.doesNotMatch(rendererSource, /_heroMotionImage\(/, 'renderer must not lazily load required hero sheets outside the manifest path');
assert.doesNotMatch(rendererSource, /\? this\._drawAtlas\(heroMotion[\s\S]*: this\._drawAtlas\(this\.assets\.heroes/, 'certified body path must not use the v5 static fallback');
```

- [ ] **Step 2: Run and verify RED**

```bash
node scripts/v7-animation-contract.mjs
```

Expected: fail on current renderer behavior.

- [ ] **Step 3: Replace optional hero motion loading with required manifest loading**

In `src/systems/renderer.js`, import `HERO_MOTION_ASSETS` and initialize:

```js
import { HERO_MOTION_ASSETS } from '../data/animation-v7.js';
```

Replace `heroMotion: new Map()` plus `_heroMotionImage()` with:

```js
heroMotion: Object.fromEntries(Object.entries(HERO_MOTION_ASSETS).map(([classId, asset]) => [classId, this._loadImage(asset.src)])),
```

Add every `heroMotion` image to `getAssetStatus().required`.

- [ ] **Step 4: Render directly from `resolvedClip`**

Inside `_drawPlayer`, replace manual `HERO_MOTION_STATES` state/frame derivation with:

```js
const resolvedClip = player.presentation?.resolvedClip;
const heroMotion = this.assets.heroMotion[player.primary];
const spriteDrawn = resolvedClip && this._assetReady(heroMotion)
  ? this._drawAtlas(heroMotion, 8, 80, resolvedClip.row * 8 + resolvedClip.frame, 0, -player.radius * .26, spriteSize, spriteSize)
  : false;
if (!spriteDrawn) { ctx.restore(); return; }
```

Keep current body grounding, shadow, discrete facing, equipment gesture/VFX code, elevation, barrier, and depth sorting. Remove `HERO_MOTION_STATES`, `_heroMotionImage()`, and the v5 body fallback from `_drawPlayer`; retain `this.assets.heroes` only if another non-gameplay UI path still uses it, otherwise remove it from required assets too.

- [ ] **Step 5: Strengthen asset regression**

In `scripts/v7-animation-assets.mjs`, assert the renderer imports the manifest and no longer contains optional hero motion loading:

```js
const rendererSource = readFileSync(path.join(root, 'src', 'systems', 'renderer.js'), 'utf8');
assert.match(rendererSource, /HERO_MOTION_ASSETS/);
assert.doesNotMatch(rendererSource, /_loadOptionalImage\(`\/assets\/hero-motion-/);
```

- [ ] **Step 6: Run full animation slice**

```bash
node scripts/v7-combat-context.mjs
node scripts/v7-animation-assets.mjs
node scripts/v7-animation-contract.mjs
node scripts/2_5d-revamp.mjs
node scripts/spell-attack-animation.mjs
node scripts/presentation-overhaul.mjs
```

Expected: PASS. If `2_5d-revamp.mjs` still requires the v5 hero-facing atlas, update only its hero assertion to require all six v7 manifest paths while retaining its continuous-rotation prohibition and gravity tests.

- [ ] **Step 7: Commit**

```bash
git add src/systems/renderer.js scripts/v7-animation-contract.mjs scripts/v7-animation-assets.mjs scripts/2_5d-revamp.mjs
git commit -m "feat: render required v7 hero motion clips"
```

---

### Task 6: Add v7 animation release script and runtime validation

**Files:**
- Modify: `src/presentation/validator.js`
- Modify: `src/presentation/system.js`
- Modify: `package.json`

**Interfaces:**
- Produces: `npm run test:v7:animation` as the independently green certification for Plan 1.

- [ ] **Step 1: Add a failing runtime validator assertion**

Extend `scripts/v7-animation-contract.mjs` after a live `presentation.update()`:

```js
const { validatePresentationRuntime } = await import('../src/presentation/validator.js');
const runtime = validatePresentationRuntime(game, presentation);
assert.equal(runtime.valid, true, runtime.issues.map((entry) => `${entry.code}: ${entry.message}`).join('\n'));
assert.ok(game.player.presentation.resolvedClip?.clipId);
```

- [ ] **Step 2: Extend runtime validation**

In `validatePresentationRuntime`, add errors when a live player lacks v7 context/clip or when the clip has invalid lane/frame values:

```js
const clip = game?.player?.presentation?.resolvedClip;
if (game?.player && !clip) issues.push(issue('error', 'V7_RUNTIME_NO_CLIP', 'Player v7 animation clip is missing.'));
if (clip && (!Number.isInteger(clip.row) || clip.row < 0 || !Number.isInteger(clip.frame) || clip.frame < 0 || clip.frame > 7)) issues.push(issue('error', 'V7_RUNTIME_INVALID_CLIP', 'Player v7 animation clip is invalid.'));
```

- [ ] **Step 3: Add the package script**

In `package.json`, add exactly:

```json
"test:v7:animation": "node scripts/v7-combat-context.mjs && node scripts/v7-animation-assets.mjs && node scripts/v7-animation-contract.mjs && node scripts/presentation-overhaul.mjs && node scripts/2_5d-revamp.mjs && node scripts/spell-attack-animation.mjs"
```

Do not modify `version` or `test:v7` yet.

- [ ] **Step 4: Run the Plan 1 certification**

```bash
npm run test:v7:animation
```

Expected: all commands PASS.

- [ ] **Step 5: Run the v6 presentation-sensitive regressions**

```bash
node scripts/covenant-presentation-v6.mjs
node scripts/architecture-boundaries-v6.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/presentation/validator.js src/presentation/system.js package.json
git commit -m "test: certify v7 foundation and animation"
```

---

## Plan 1 Exit Gate

Before starting the equipment plan, verify all of the following in one command sequence:

```bash
npm run test:v7:animation
npm run test:v6
```

Expected: both PASS. Record the branch commit SHA as the dependency baseline for `2026-08-21-v7-equipment-appearance.md`.
