# Ashen Covenant v7.0 — Embodied Covenant Design

**Status:** Approved design baseline  
**Date:** 2026-08-21  
**Branch:** `v7-embodied-covenant`  
**Baseline:** Ashen Covenant v6.0.0 on `main`

## 1. Goal

Version 7.0 raises the moment-to-moment audiovisual fidelity of Ashen Covenant without replacing the combat, progression, Covenant Metamorphosis, world, boss, Hunter, loot, save, or endgame systems proven in v6.

The release has four connected deliverables:

1. authored player-body animation driven by the existing action timeline;
2. equipment and chase-item appearance that visibly changes the rendered character;
3. a deeper event-driven combat soundscape built on the existing Web Audio bus architecture;
4. one presentation resolver that makes animation, equipment, Covenant identity, VFX, and SFX agree on the same combat context.

The result should make an existing v6 encounter feel materially more physical, readable, class-specific, and Covenant-specific while preserving gameplay outcomes for the same input/state sequence.

## 2. Existing Architecture We Preserve

The v6 build already provides the foundations v7 needs:

- `ActionTimelineController` owns authoritative presentation timing for anticipation, active, follow-through, recovery, cancel windows, and authored action events.
- `AnimationDirector` owns locomotion, reactions, attack history, actor animation budgeting, and event emission.
- `AudioDirector` already owns Web Audio initialization, buses, spatial routing, sample loading, voice limiting, settings, focus behavior, and adaptive music integration.
- `PresentationBus` and the current domain/presentation events provide the boundary between gameplay facts and audiovisual reactions.
- `systems/renderer.js` remains the authoritative Canvas renderer for the 2.5D scene.
- Covenant identity already resolves stage, affinity, aura, markings, movement, weapon overlays, VFX, and adaptive musical motifs.
- v6 saves and migration logic are already release-gated.

v7 extends these surfaces instead of creating a second presentation stack.

## 3. Non-Goals

v7 does not add a seventh class, a new campaign act, new Black Road routes, a new rarity tier, another progression currency, a replacement combat engine, or a replacement AI architecture.

v7 does not move damage, hit detection, invulnerability, poise, armor, Guard, execution eligibility, cooldowns, resource costs, enemy decisions, item stats, or Covenant progression into renderer/audio code.

Presentation may explain gameplay and may select a visual/audio treatment from gameplay state. It may not become gameplay authority.

## 4. Design Principles

### 4.1 One combat fact, many presentation consumers

A gameplay event should be normalized once and then consumed by animation, VFX, equipment rendering, camera/impact presentation, and audio. A heavy Guard break should not independently infer its weight in five subsystems.

### 4.2 Authored identity with bounded combinatorics

Six classes, six Covenant affinities, five Metamorphosis stages, equipment slots, rarities, Uniques, action types, and surfaces create too many combinations for bespoke full-frame art for every permutation. v7 uses authored base clips plus deterministic overlays, signatures, and Covenant treatments.

### 4.3 Existing timelines remain authoritative

Animation frames sample the existing action timeline. Hit windows do not move to match art. Art is authored and mapped so anticipation, contact, and recovery visually agree with already-authoritative events.

### 4.4 Fail visibly and safely

Required presentation assets are release-gated. Missing optional equipment overlays degrade to a neutral slot layer and emit a validation warning. Missing required base body/action assets fail release validation rather than silently falling back to geometric actor rendering.

### 4.5 Accessibility survives fidelity

Reduced motion, reduced flashing, simplified effects, UI scale, camera shake, impact pause, music, ambience, dialogue, and SFX settings remain authoritative. v7 adds fidelity inside those constraints rather than bypassing them.

## 5. Architecture Overview

The main runtime flow is:

`gameplay event/state -> PresentationCombatContext -> resolvers -> AnimationDirector / Renderer / ImpactDirector / AudioDirector`

`PresentationCombatContext` is a read-only normalized object created from existing game state and event detail. It contains only presentation-relevant facts:

- actor identity and role;
- primary/companion class and hybrid;
- current action/profile/phase/event;
- equipped weapon family and visible armor identities;
- item rarity plus Unique/Mythic visual signature IDs;
- dominant/secondary Covenant affinities, stage, instability, and rupture state;
- hit weight, damage family, material contact, Guard/stagger/execution flags;
- locomotion state, movement direction, elevation, surface, and local region;
- boss/Hunter identity when applicable;
- accessibility settings that constrain output.

The context is derived. It is never persisted as authoritative save state.

## 6. Player Animation System

### 6.1 Clip model

Add a data-driven animation clip registry with semantic clips instead of renderer-specific frame math. Required player clip families are:

- idle;
- walk;
- run;
- turn/stance transition;
- dodge;
- light attack chain 1–3;
- heavy/empowered attack;
- skill cast/channel/release;
- Companion Technique;
- hybrid signature;
- ultimate;
- Guard/brace where applicable;
- hit-light;
- hit-heavy/stagger;
- knockdown;
- rise;
- execution attacker;
- execution victim presentation hook;
- death.

Each clip defines frame count, frame timing curve, loop policy, directional lane policy, anchor points, equipment attachment anchors, event markers, and allowed playback compression/extension.

### 6.2 Class identity

All six primary classes share the clip contract but not the same motion language.

- Warden: measured stance, shield/weapon weight, strong planted anticipation.
- Thornseer: asymmetrical casting arcs, rooted ritual gestures, thorn recoil.
- Ironbound: high-mass locomotion and deliberate recovery.
- Veilrunner: low-center movement, fast direction changes, short recovery silhouettes.
- Gravebinder: corpse/ritual gestures, delayed follow-through, summon-directed poses.
- Dawnstrider: open radiant casting shapes, spear/sword reach, forward momentum.

Class profiles select authored lanes/atlases. They must not merely recolor a universal skeleton.

### 6.3 Timeline sampling

`ActionTimelineController` remains the source of elapsed time and phase. A new `AnimationClipResolver` maps `(class, action profile, combo index, weapon family, Covenant identity, reaction state)` to a clip and a normalized frame position.

Timeline events remain responsible for gameplay callbacks and presentation event emission. Clip markers are validation metadata used to prove the art agrees with authoritative event timing; they cannot create damage windows.

### 6.4 Direction and 2.5D grounding

The existing discrete 2.5D stance approach remains. v7 standardizes directional lanes and attachment anchors so body, weapon, armor, and VFX share facing/elevation.

Continuous sprite rotation is prohibited for player/enemy bodies. World-space VFX may rotate where appropriate.

### 6.5 Reactions and interruption

Hit reactions, stagger, knockdown, execution, and death may temporarily override locomotion/action presentation when gameplay state says they should. The resolver must respect current combat state and cannot invent an interruption.

Canceling an action uses the existing action timeline reason and transitions into the next authoritative state without leaving stale overlays or sounds attached to the canceled action.

## 7. Equipment Appearance System

### 7.1 Appearance ownership

Add `EquipmentAppearanceResolver` as a pure presentation resolver. It reads equipped items and returns a render description; it does not mutate equipment or stats.

The render description contains:

- weapon silhouette family;
- off-hand silhouette family where relevant;
- helm/hood/head treatment;
- torso/shoulder treatment;
- glove/arm treatment;
- leg/boot treatment;
- rarity trim treatment;
- corruption treatment;
- Masterworking treatment;
- Unique/Mythic signature overlay;
- Covenant-reactive material treatment;
- attachment anchor overrides only when the authored item silhouette requires them.

### 7.2 Layering model

Player rendering uses a bounded layer stack:

1. shadow/ground contact;
2. base body clip;
3. lower armor;
4. torso/shoulder armor;
5. head layer;
6. rear weapon/off-hand when pose requires it;
7. front arm/weapon layer;
8. item signature layer;
9. Covenant markings/aura/weapon treatment;
10. action VFX and foreground impact elements.

The resolver supplies ordering metadata for exceptional poses, but the renderer owns draw order execution.

### 7.3 Normal item differentiation

Normal/Magic/Rare/Legendary items receive family-level silhouette and material differences rather than unique bespoke art per random item roll. Affix rolls never create visual combinatorial explosion.

### 7.4 Unique and Mythic differentiation

All existing Unique/Mythic chase items receive a stable `visualSignatureId`. A signature may alter silhouette, emissive/rune overlay, trail shape, idle effect, impact accent, or Covenant reaction.

Signatures must remain recognizable even with simplified effects enabled. Simplified effects may remove particles or bloom-like overlays but preserve silhouette/material cues.

### 7.5 Covenant interaction

Equipment appearance is modified after item identity resolves. Covenant identity may add markings, material emissive behavior, corruption spread, frost/ash/blood/lightning/void accents, or stage-specific wear.

Covenant treatment cannot hide the base identity of a chase item.

## 8. Combat Soundscape

### 8.1 Audio event taxonomy

Replace broad one-sample categories with semantic audio events derived from combat context:

- weapon swing by family/weight;
- projectile launch/pass/impact;
- physical impact by attack weight and contacted material;
- Guard impact and Guard break;
- poise break/stagger;
- armor/body contact;
- spell cast, sustain, release, impact, field, summon;
- Covenant layer/accent;
- dodge/cloth/armor movement;
- execution start/contact/finish;
- enemy vocal effort, hurt, death, command, summon;
- Hunter intrusion/signature cues;
- boss telegraph, phase transition, signature mechanic, stagger, death;
- footsteps by surface and movement intensity;
- destructible/world interaction;
- loot/drop/pickup/Unique reveal;
- UI confirmation/error/critical warning;
- regional ambience layers.

### 8.2 Sound definition registry

Add a v7 sound-definition registry separate from the low-level `AudioDirector`. A sound definition contains:

- sample variants;
- destination bus;
- priority;
- cooldown/concurrency group;
- base gain and pitch range;
- distance/spatial policy;
- optional material/weapon/Covenant variant map;
- optional layered samples;
- ducking request;
- accessibility category.

Variant choice is deterministic from a stable event key where tests require repeatability. Audio playback timing itself is not gameplay-authoritative.

### 8.3 Layered impact construction

A combat hit may resolve to multiple bounded layers, for example:

`heavy blade + plate armor + Guard break + Flame stage 4`

becomes:

- heavy blade transient;
- metal/plate body;
- low Guard-break accent;
- restrained Flame Covenant accent.

The mixer caps layers per event and applies priority so large encounters do not become louder simply because more layers exist.

### 8.4 Voice and density budgets

The current global active-voice limiter remains and is upgraded with category limits. Default target budgets:

- maximum simultaneous SFX voices: 36;
- maximum enemy vocal voices: 6;
- maximum footsteps: 8;
- maximum impact clusters: 10;
- maximum ambient one-shots: 4;
- bosses and player critical cues can evict lower-priority distant voices.

These are presentation budgets, not simulation limits.

### 8.5 Covenant audio identity

Each affinity gets a restrained reusable accent vocabulary rather than an entirely duplicated library:

- Flame: combustion/crackle/transient heat;
- Grave: dry bone/low breath/resonant decay;
- Blood: wet pulse/heartbeat/body resonance;
- Light: bell/glass/air harmonic;
- Storm: electrical snap/pressure crack;
- Void: filtered suction/sub-bass/unstable reverse texture.

Stage controls intensity and layering probability. Instability can introduce dissonant cross-affinity accents. Reduced/simplified effects reduce density but preserve key identity cues.

### 8.6 Authored v7 sample bank

Create `public/assets/audio/v7/` as the canonical v7 bank. Existing v5 samples may be retained where they remain useful, but the v7 registry owns selection. Newly created samples must be packaged, decodable through `file://`, and referenced through `resolveAssetUrl`.

No external runtime audio service is introduced.

## 9. Presentation Orchestration

Add `PresentationCombatContextResolver` and keep the current presentation bus as the integration spine.

For each relevant action/hit/state transition:

1. gameplay produces authoritative facts;
2. the presentation layer normalizes those facts into a context;
3. animation resolves body clip/phase/frame;
4. equipment appearance resolves visible layers;
5. Covenant identity resolves aura/markings/material accents;
6. action VFX resolves existing cast/trail/impact visuals;
7. impact presentation resolves hit-stop/camera/reaction within settings;
8. audio resolves semantic sound definitions and layers;
9. validator/debug tooling can inspect the final resolved presentation contract.

Subsystems consume the same context but remain independently testable.

## 10. Assets and Packaging

### 10.1 Required assets

Required v7 player-body atlases and required v7 audio definitions are release-gated. The build must validate dimensions/metadata/decoding before release certification.

Existing v6/v7 combat VFX atlases remain valid unless a regression test demonstrates a replacement is required.

### 10.2 Asset manifests

Add explicit manifests for animation and sound assets. Renderer/audio code should not scatter hard-coded file paths across multiple modules.

A manifest entry contains stable ID, path, dimensions/duration metadata where applicable, and required/optional classification.

### 10.3 Desktop file protocol

Every required asset must pass the existing Electron `file://` packaging path. Browser development success alone is insufficient.

## 11. Performance Budgets

v7 must stay within the existing performance envelope under the v6 200+ actor stress scenario.

Targets:

- no per-frame inventory scans for appearance resolution; cache by equipment/Covenant revision key;
- no per-frame asset URL construction for resolved stable assets;
- no unbounded canvas save/restore or layer allocations;
- body/equipment render descriptions are reused until state revision changes;
- animation frame lookup is O(1);
- audio variant lookup is O(1) after registry initialization;
- v7 presentation may not increase sustained frame time by more than 15% versus the v6 stress baseline on the same test harness;
- active audio voices remain within configured budgets;
- asset validation runs before gameplay rather than discovering missing required assets mid-fight.

If the 15% frame-time budget is exceeded, v7 must optimize presentation work rather than reducing gameplay actor counts.

## 12. Accessibility and Settings

The following settings continue to constrain v7 output:

- reduced motion;
- reduced flashing;
- simplified effects;
- camera shake;
- impact pause;
- HUD detail/opacity/scale;
- master/music/SFX/dialogue/ambience volume;
- focus/background-audio behavior.

v7 adds no mandatory screen shake, flashing, or high-frequency audio cue that bypasses these settings.

Critical gameplay information must remain readable when optional audiovisual effects are reduced.

## 13. Persistence and Compatibility

v7 should not bump the save schema solely for derived presentation state.

Equipment appearance derives from already-persisted equipment/item identity. Covenant appearance derives from already-persisted Covenant state. Animation and audio state are ephemeral.

A save-version bump is allowed only if implementation discovers a genuinely player-authored cosmetic choice that must persist. If that occurs, migration must initialize a deterministic default and the migration matrix must expand accordingly.

Existing v6 saves must load with identical gameplay state.

## 14. Error Handling and Validation

### Required base presentation failure

Missing/undecodable required body atlas, invalid clip metadata, or missing required sound definition fails release validation and blocks certified startup paths.

### Optional equipment layer failure

Use a neutral authored family layer, emit a structured presentation warning, and continue gameplay.

### Audio decode failure

Record the failed asset, avoid repeated fetch/decode spam, fall back to the closest semantic definition if one exists, and continue gameplay. Release tests must still fail if the asset is classified required.

### Invalid resolver data

Resolvers return a safe neutral presentation object and emit `presentation:error`; they must never throw through the gameplay update loop.

## 15. Testing Strategy

All production changes use RED -> GREEN -> regression verification.

### 15.1 Animation contract tests

Verify:

- every class resolves every required clip family;
- action timeline phases map monotonically to clip frames;
- authored impact markers remain within tolerance of authoritative action events;
- cancel/reaction/death overrides clear stale presentation state;
- all directional lanes and equipment anchors are valid;
- reduced-motion policy is respected.

### 15.2 Equipment appearance tests

Verify:

- all equipment slots resolve deterministic layers;
- cache keys change on equipment/Covenant revisions and remain stable otherwise;
- every Unique/Mythic has a valid visual signature;
- simplified effects preserve chase-item recognition;
- Covenant treatment never removes required item identity layers.

### 15.3 Audio tests

Verify:

- all semantic event families resolve definitions;
- material/weapon/Covenant layering is bounded and deterministic;
- concurrency groups and voice eviction honor priority;
- settings route correct bus gains;
- required v7 samples decode;
- Electron `file://` asset resolution works;
- missing optional/required assets follow the defined failure policy.

### 15.4 Integrated encounter tests

Run representative fights covering:

- all six primary classes;
- all six Covenant affinities;
- stages 1–5;
- dual-affinity instability;
- Guard break, stagger, knockdown, execution;
- a persistent Hunter intrusion;
- at least one authored boss phase transition;
- Unique/Mythic equipment signatures;
- Sanctuary and Black Road contexts.

### 15.5 Save compatibility

Load current v6 fixtures and migration-chain fixtures, run gameplay, save, reload, and prove gameplay state continuity. Presentation caches must rebuild rather than persist stale references.

### 15.6 Performance

Extend the v6 stress gate with animation-layer counts, appearance-cache hit rate, audio voice counts, resolver time, render time, and total presentation frame cost.

## 16. Primary File Boundaries

Expected new modules:

- `src/data/animation-v7.js`
- `src/data/audio-v7.js`
- `src/data/equipment-appearance-v7.js`
- `src/presentation/combat-context-v7.js`
- `src/presentation/equipment-appearance-v7.js`
- `src/presentation/animation-clips-v7.js`
- `src/presentation/audio-resolver-v7.js`

Expected focused modifications:

- `src/presentation/animation.js`
- `src/presentation/context.js`
- `src/presentation/covenant-identity.js`
- `src/presentation/system.js`
- `src/presentation/validator.js`
- `src/systems/audio.js`
- `src/systems/renderer.js`
- `src/systems/game.js` only where presentation context plumbing is required
- `src/data/items.js` for stable visual signature metadata
- `src/data/presentation.js` only for legacy bridge/removal where appropriate
- `src/ui/ui.js` only for settings/debug/presentation surfaces required by v7
- `package.json` for v7 test/release scripts and final version bump

Expected assets:

- `public/assets/player/v7/` or an equivalent manifest-controlled v7 player animation directory
- `public/assets/equipment/v7/`
- `public/assets/audio/v7/`

Expected test scripts:

- animation contract regression;
- equipment appearance regression;
- audio semantic/layering regression;
- asset/package regression;
- integrated embodied-combat regression;
- v7 performance regression;
- v7 release contract.

## 17. Implementation Order

The implementation plan should preserve this dependency order:

1. presentation combat context and manifests;
2. animation clip registry/resolver;
3. renderer integration for authored body clips;
4. equipment appearance resolver/layering;
5. Unique/Mythic signatures and Covenant interaction;
6. semantic audio registry/resolver;
7. v7 sample bank and audio-director integration;
8. integrated orchestration/validator/debug surfaces;
9. compatibility/performance/package gates;
10. documentation, final release contract, and version bump.

Each green milestone is committed to `v7-embodied-covenant` before proceeding.

## 18. Definition of Done

v7.0 is complete only when all of the following are true:

- the six classes visibly use class-specific authored body motion for required combat/locomotion states;
- equipped gear visibly changes the character through deterministic slot/family layers;
- every existing Unique/Mythic has a stable recognizable visual signature;
- Covenant affinity/stage coherently modifies body/equipment/VFX/audio presentation;
- semantic weapon, material, Guard, spell, execution, Hunter, boss, surface, and ambience audio paths are implemented;
- audiovisual output is driven by the same normalized presentation context;
- existing gameplay authority remains outside renderer/audio/resolvers;
- v6 save compatibility remains intact;
- accessibility settings constrain all new presentation features;
- required assets pass browser and packaged Electron validation;
- the v7 integrated stress test remains inside the stated performance budget;
- the complete v6 `test:v6` chain still passes beneath the v7 release gate;
- `npm run test:v7` becomes the release certification command;
- the stable v7 source, tests, manifests, assets, and documentation are all present in GitHub before the release is called complete.
