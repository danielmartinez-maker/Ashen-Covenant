# Ashen Covenant v7.0 — Embodied Covenant Design

**Status:** Approved design baseline; self-reviewed against the live v6.0.0 import  
**Date:** 2026-08-21  
**Branch:** `v7-embodied-covenant`  
**Baseline:** Ashen Covenant v6.0.0 on `main`

## 1. Goal

Version 7.0 raises the moment-to-moment audiovisual fidelity of Ashen Covenant while preserving the combat, progression, Covenant Metamorphosis, world, boss, Hunter, loot, save, campaign, and endgame systems proven in v6.

The release has four connected deliverables:

1. authored player-body animation driven by the existing action timeline;
2. equipment and chase-item appearance that visibly changes the rendered character;
3. a deeper event-driven combat soundscape built on the existing Web Audio bus architecture;
4. one normalized presentation context that makes animation, equipment, Covenant identity, VFX, impact feedback, and SFX agree on the same gameplay facts.

The intended result is that the same v6 encounter, with the same simulation inputs and gameplay state, feels materially more physical, readable, class-specific, item-specific, and Covenant-specific without changing its gameplay outcome.

## 2. Verified Starting Point

v7 begins from the imported v6.0.0 repository state rather than from an empty presentation layer.

### 2.1 Animation baseline

`src/presentation/animation.js` already provides:

- `ActionTimelineController` with anticipation, active, follow-through, recovery, cancel windows, and authored timeline events;
- `AnimationDirector` with locomotion, reactions, class presentation profiles, footsteps, enemy pose budgeting, and presentation events;
- gameplay-independent animation state attached to the player and enemies.

`src/systems/renderer.js` already recognizes semantic hero motion states and attempts to load six class-specific sheets using the exact paths:

- `/assets/hero-motion-warden-v7.png`
- `/assets/hero-motion-thornseer-v7.png`
- `/assets/hero-motion-ironbound-v7.png`
- `/assets/hero-motion-veilrunner-v7.png`
- `/assets/hero-motion-gravebinder-v7.png`
- `/assets/hero-motion-dawnstrider-v7.png`

All six files already exist under `public/assets/`. The current implementation loads them as optional images and falls back to `hero-facing-atlas-v5.png` when a motion sheet is unavailable. v7 will convert these existing sheets into manifest-owned, validated, required release assets and remove the static body fallback from certified gameplay paths. Existing v7 enemy-motion and attack-VFX atlases remain in place and are outside the primary body-animation scope unless regression testing demonstrates a defect.

### 2.2 Equipment baseline

`LootSystem.presentationForEquipment()` already derives coarse `heroKey`, `weaponKey`, `auraKey`, and rarity data. `Renderer._drawPlayer()` already applies limited rarity rings, special weapon/aura treatments, and Covenant weapon/marking overlays.

v7 replaces this coarse contract with a deterministic slot-aware appearance description while preserving the existing equipment/stat systems as gameplay authority.

### 2.3 Audio baseline

`AudioDirector` already owns:

- Web Audio initialization;
- master compression;
- music, UI, dialogue, ability, enemy ability, ambience, footstep, impact, and destruction buses;
- sample loading and decode-failure tracking;
- spatial panning;
- voice stealing;
- settings/focus behavior;
- adaptive music integration.

The current sample bank is rooted at `/assets/audio/v5` and uses broad semantic IDs plus synthesized fallback layers. v7 keeps this mixer/runtime and replaces coarse sound selection with a manifest-backed semantic resolver and a new `/assets/audio/v7/` bank.

### 2.4 Covenant/presentation baseline

`resolveCovenantPresentationIdentity()` already resolves affinity, stage, animation key, cast/trail/impact VFX, aura, markings, eyes, movement, weapon treatment, musical motif, intensity, and pitch offset. `GamePresentationSystem` already connects animation, impact, cinematic presentation, audio, adaptive music, context resolution, and a typed presentation bus.

v7 extends these seams instead of creating a second presentation stack.

## 3. Non-Goals

v7 does not add a seventh class, a new campaign act, new Black Road routes, another progression currency, a new rarity tier, a replacement combat engine, a replacement AI architecture, or a second renderer/audio runtime.

v7 does not move damage, hit detection, invulnerability, poise, armor, Guard, guard break, execution eligibility, cooldowns, resources, enemy decisions, item stats, loot generation, or Covenant progression into presentation code.

Presentation may explain gameplay and select a treatment from authoritative state. It may never become gameplay authority.

## 4. Design Principles

### 4.1 One combat fact, many presentation consumers

A gameplay fact is normalized once and then consumed by animation, equipment rendering, Covenant treatment, VFX, impact feedback, camera behavior, and audio. A heavy Guard break must not independently infer its weight or material in several subsystems.

### 4.2 Authored identity with bounded combinatorics

Six classes, six Covenant affinities, five visible Metamorphosis stages, equipment slots, rarities, Uniques/Mythics, action types, surfaces, enemies, and bosses create too many combinations for bespoke full-frame art for every permutation. v7 uses authored base motion plus deterministic equipment layers, item signatures, and Covenant treatments.

### 4.3 Existing action timing remains authoritative

Animation samples the current action timeline. Hit windows do not move to match art. Authored clip metadata proves that anticipation/contact/recovery visually agree with the existing authoritative events.

### 4.4 Required assets fail closed in certification

Missing required class body sheets, invalid clip metadata, or missing required semantic audio definitions fail v7 validation. Optional item decoration may degrade to a neutral authored family layer and emit a structured warning. Certified gameplay does not silently replace a missing required body sheet with static art.

### 4.5 Accessibility remains authoritative

Reduced motion, reduced flashing, simplified effects, camera shake, impact pause, UI scale, HUD settings, and audio buses continue to constrain presentation output.

## 5. PresentationCombatContext

Add `src/presentation/combat-context-v7.js` with a pure `PresentationCombatContextResolver`.

The resolver produces a read-only derived object from existing game state plus event detail. It is not persisted.

The normalized context contains:

- actor ID, actor kind, enemy role, boss/Hunter identity when applicable;
- primary class, secondary class, hybrid ID;
- action ID/profile ID, combo index, phase, normalized action progress, timeline event ID;
- facing lane, movement state, movement intensity, elevation, grounded state, surface, region;
- weapon family, off-hand family, visible equipment identities, rarity, corruption level, Masterwork rank, Unique/Mythic signature IDs;
- primary and secondary Covenant affinities, stage, instability, rupture state, Covenant presentation identity;
- hit weight, damage family, contacted material, Guard state, Guard break, poise break, stagger, knockdown, execution, critical state;
- current presentation settings relevant to output reduction.

Consumers receive the same normalized facts but remain independently testable.

The runtime flow is:

`gameplay state/event -> PresentationCombatContext -> animation/equipment/Covenant/VFX/impact/audio resolvers -> renderer/audio output`

## 6. Player Animation System

### 6.1 Clip registry

Add `src/data/animation-v7.js` as the single animation manifest/clip registry and `src/presentation/animation-clips-v7.js` as the pure resolver.

The registry maps stable semantic clip IDs to:

- class ID;
- source atlas path;
- source dimensions/grid contract;
- frame count;
- directional lane policy;
- frame timing curve;
- loop policy;
- authoritative action profile association;
- normalized contact/marker metadata used only for validation;
- body anchor;
- hand/weapon/off-hand/head/torso/feet anchors;
- allowed playback compression/extension range;
- required/optional classification.

Required semantic families are:

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
- Guard/brace where the class kit uses it;
- hit-light;
- hit-heavy/stagger;
- knockdown;
- rise;
- execution attacker;
- death.

The six existing `hero-motion-<class>-v7.png` sheets are the starting body assets. The implementation first describes and validates what these sheets already contain. If a required semantic family lacks a dedicated authored lane for a class, the affected sheet must be extended/re-authored before v7 release. A required clip may not be satisfied by a static v5 facing fallback.

### 6.2 Class motion language

All six classes implement the same semantic contract but retain distinct motion language:

- Warden: planted guard, shield/weapon weight, measured recovery;
- Thornseer: asymmetrical ritual arcs, rooted casting, thorn recoil;
- Ironbound: high-mass locomotion, slower anticipation, deliberate follow-through;
- Veilrunner: low-center locomotion, fast stance changes, short recovery silhouettes;
- Gravebinder: delayed ritual gestures, corpse/summon-directed posing;
- Dawnstrider: open radiant shapes, forward reach, spear/sword momentum.

Class differences are authored frame choices and timing metadata, not palette swaps.

### 6.3 Timeline sampling

`ActionTimelineController` remains the authoritative source of elapsed action time, action phase, cancel reason, and gameplay callbacks.

`AnimationClipResolver.resolve(context)` maps class/action/combo/weapon/Covenant/reaction state to a clip and frame index in O(1). Clip markers cannot create gameplay callbacks or hit windows.

Canceling an action clears presentation-only overlays attached to that action and transitions directly into the next authoritative locomotion/reaction/action state.

### 6.4 Direction and grounding

The existing discrete eight-direction 2.5D stance model remains. Continuous body rotation is prohibited. Body, equipment layers, attachment anchors, and body-bound VFX all share the same facing lane and elevation. World-space projectiles and area VFX may rotate independently.

### 6.5 Reaction precedence

Presentation precedence is:

`death > execution victim/knockdown > heavy reaction/stagger > dodge > active authoritative action > locomotion > idle`

This precedence is applied only when gameplay state already reports the corresponding state. Presentation cannot invent an interruption.

## 7. Equipment Appearance System

### 7.1 Ownership

Add `src/data/equipment-appearance-v7.js` and `src/presentation/equipment-appearance-v7.js`.

`EquipmentAppearanceResolver` is pure. It reads equipped items plus Covenant identity and returns a render description. It does not mutate equipment, item stats, or saves.

The render description includes:

- weapon silhouette family;
- off-hand silhouette family;
- head treatment;
- torso/shoulder treatment;
- glove/arm treatment;
- boot/lower-body treatment;
- rarity trim/material treatment;
- corruption treatment;
- Masterworking treatment;
- Unique/Mythic visual signature layers;
- Covenant-reactive material treatment;
- authored attachment-anchor overrides where required;
- stable cache key and revision inputs.

### 7.2 Layer order

The player render stack is bounded and deterministic:

1. ground shadow/contact;
2. rear weapon/off-hand layer when the pose requires it;
3. base body frame;
4. boots/lower layer;
5. torso/shoulder layer;
6. head layer;
7. glove/front-arm treatment;
8. front weapon/off-hand layer;
9. Unique/Mythic signature layer;
10. Covenant markings/material/weapon treatment;
11. action VFX and foreground impact elements.

The resolver supplies layer metadata; `Renderer` owns draw execution.

### 7.3 Normal item differentiation

Common, Magic, Rare, and Relic items receive family-level silhouette/material differences. Random affix rolls do not create new art combinations.

The canonical new equipment-art root is `public/assets/equipment/v7/`, referenced exclusively through the equipment appearance manifest.

### 7.4 Unique and Mythic differentiation

Every entry in the current `UNIQUES` registry, including all existing Unique/Mythic chase items, receives a stable `visualSignatureId` in `src/data/items.js` or equivalent manifest metadata keyed by unique ID.

A signature may change silhouette, material overlay, rune/emissive treatment, idle accent, trail shape, impact accent, or Covenant reaction. At least one silhouette/material cue must survive `simplifiedEffects` so chase-item recognition does not depend solely on particles or glow.

### 7.5 Covenant interaction

Item identity resolves before Covenant treatment. Covenant stage may add markings, material accents, wear/corruption, movement residue, or weapon energy, but it may not conceal the base visual identity of a chase item.

### 7.6 Caching

Appearance resolution is cached by a deterministic revision key derived from equipped item IDs/unique IDs/base IDs, visible slot identities, corruption/Masterwork fields, and Covenant presentation revision. No per-frame full inventory scan is allowed.

## 8. Combat Soundscape

### 8.1 Registry and resolver

Add `src/data/audio-v7.js` and `src/presentation/audio-resolver-v7.js`.

`audio-v7.js` owns the semantic sound definition registry and asset manifest. `AudioDirector` remains the low-level Web Audio mixer/player.

Each sound definition contains:

- stable semantic ID;
- sample variants;
- destination bus;
- base priority;
- cooldown/concurrency group;
- base gain and pitch range;
- distance/spatial policy;
- optional weapon/material/Covenant variant map;
- optional layered samples;
- optional ducking request;
- accessibility category;
- required/optional asset classification.

### 8.2 Event taxonomy

Required semantic event families are:

- weapon swing by family and weight;
- projectile launch/pass/impact;
- physical impact by attack weight and material;
- Guard impact and Guard break;
- armor/body impact;
- poise break/stagger/knockdown;
- spell cast/sustain/release/impact/field/summon;
- Covenant accent layer;
- dodge/cloth/armor movement;
- execution start/contact/finish;
- enemy vocal effort/hurt/death/command/summon;
- Hunter intrusion/signature cue;
- boss telegraph/phase/signature/stagger/death;
- footsteps by surface and movement intensity;
- destructible/world interaction;
- loot drop/pickup/Unique reveal;
- UI confirmation/error/critical warning;
- regional ambience layers.

### 8.3 Layered impacts

A single hit can resolve to bounded semantic layers. Example:

`heavy blade + plate target + Guard break + Flame stage 4`

may resolve to:

- heavy-blade transient;
- plate contact body;
- Guard-break accent;
- restrained Flame Covenant accent.

The resolver caps layers per event and applies priority. More combatants must not cause unlimited loudness.

### 8.4 Voice budgets

The global SFX voice budget increases from the current 32 to a maximum of 36, with category caps:

- enemy vocal voices: 6;
- footsteps: 8;
- impact clusters: 10;
- ambient one-shots: 4;
- player critical, execution, Hunter, and boss cues may evict lower-priority distant voices.

These are presentation budgets only.

### 8.5 Covenant audio vocabulary

Each affinity uses a restrained reusable accent vocabulary:

- Flame: combustion/crackle/heat transient;
- Grave: dry bone/low breath/resonant decay;
- Blood: wet pulse/heartbeat/body resonance;
- Light: bell/glass/air harmonic;
- Storm: electrical snap/pressure crack;
- Void: filtered suction/sub-bass/reverse instability.

Stage controls layer intensity. Instability may blend a secondary affinity accent at bounded probability/intensity. Reduced/simplified effects lower density but preserve key identity cues.

### 8.6 Asset root and compatibility

The canonical v7 sound bank is `public/assets/audio/v7/`. Existing `/assets/audio/v5` samples may remain and may be referenced as explicit legacy assets where they still meet the semantic definition, but new v7 registry entries own selection. All required audio must decode in browser development and packaged Electron `file://` execution through `resolveAssetUrl`.

## 9. Presentation Orchestration

`GamePresentationSystem` remains the presentation integration spine.

For a relevant action, hit, reaction, state transition, or item/Covenant revision:

1. gameplay produces authoritative facts;
2. `PresentationCombatContextResolver` normalizes them;
3. `AnimationClipResolver` resolves body clip/frame/anchors;
4. `EquipmentAppearanceResolver` resolves visible layers;
5. existing Covenant identity resolves aura/markings/material accents;
6. existing action-VFX paths resolve cast/trail/impact visuals;
7. impact presentation resolves reaction/camera/hit-stop inside settings;
8. `AudioPresentationResolver` resolves semantic audio definitions/layers;
9. validator/debug tooling exposes the final resolved presentation contract.

No resolver mutates gameplay state.

## 10. Asset Manifests and Packaging

### 10.1 Animation manifest

The animation manifest explicitly owns the six current hero-motion files at the root `public/assets/` paths listed in Section 2.1. v7 does not move these large binary files solely for directory aesthetics.

Additional or replacement body sheets use the same `hero-motion-<class>-v7.png` naming convention unless a new manifest version is required by an incompatible grid contract.

### 10.2 Equipment manifest

New equipment layers live under `public/assets/equipment/v7/`. Paths are not scattered through renderer code.

### 10.3 Audio manifest

New audio lives under `public/assets/audio/v7/`. Definitions reference manifest IDs rather than manually constructing file names inside `AudioDirector`.

### 10.4 Validation

Required assets are validated before certified run start. Validation covers path existence/load, image dimensions/grid consistency, clip metadata, audio decode, and manifest references.

Desktop `file://` packaging is a release gate. Browser-only success is insufficient.

## 11. Error Handling

### Required body asset or clip metadata failure

Record a structured presentation validation error and fail certified startup/release validation. Do not use the static v5 body fallback in the v7 certified path.

### Optional equipment layer failure

Use a neutral authored family layer for that slot/signature, emit one deduplicated structured warning, and continue gameplay.

### Required audio failure

Record the failed asset, prevent repeated decode/fetch spam, and fail release validation. During a non-certified development run, the runtime may use the closest semantic legacy definition when available so debugging can continue.

### Optional audio failure

Use the nearest semantic definition or silence for that optional layer, emit one deduplicated warning, and continue.

### Invalid resolver input

Return a neutral immutable presentation description and emit `presentation:error`. Resolver failures must not throw through the gameplay update loop.

## 12. Persistence and Save Compatibility

v7 does not bump the save schema for derived presentation state.

Equipment appearance derives from already-persisted equipment/item identity. Covenant appearance derives from already-persisted Covenant state. Animation context, appearance caches, audio selection, and presentation contexts are ephemeral.

A save-version bump is permitted only if implementation introduces a genuinely player-authored cosmetic choice that must persist. If that occurs, migration must initialize a deterministic default and extend the current migration matrix.

Existing v6 saves must load with identical gameplay state and must rebuild v7 presentation caches from authoritative state.

## 13. Performance Budgets

The v6 200+ actor stress scenario remains the comparison baseline.

v7 requirements:

- animation frame lookup is O(1);
- audio semantic lookup is O(1) after registry initialization;
- appearance descriptions are cached until equipment/Covenant revision changes;
- stable asset URLs are resolved once rather than reconstructed per frame;
- no unbounded per-frame arrays or Canvas layer allocations;
- active audio voices remain inside configured budgets;
- required asset validation occurs before combat;
- sustained total presentation frame cost may not regress by more than 15% versus the same v6 stress harness;
- if the 15% budget is exceeded, presentation work is optimized rather than reducing gameplay actor counts.

The v7 performance test records resolver time, animation lookups, appearance-cache hit rate, render cost, audio voice counts, and total presentation update cost.

## 14. Accessibility and Settings

The following settings remain authoritative over v7 output:

- reduced motion;
- reduced flashing;
- simplified effects/reduced VFX;
- camera shake;
- impact pause/hit-stop scaling;
- HUD detail/opacity/scale;
- master/music/SFX/dialogue/ambience volume;
- background-audio and focus behavior.

No mandatory new shake, flash, particle density, or high-frequency audio cue may bypass these settings. Critical gameplay information must remain legible when optional effects are reduced.

## 15. Testing Strategy

Every production change follows RED -> GREEN -> full relevant regression.

### 15.1 Animation contract

Tests must verify:

- all six classes resolve all required semantic clip families;
- the six current hero-motion assets are present, valid, and treated as required;
- action timeline progress maps monotonically to clip frames;
- authored contact markers stay within declared tolerance of authoritative timeline events;
- cancel/reaction/knockdown/death transitions clear stale presentation state;
- all directional lanes and equipment anchors are valid;
- certified v7 body rendering does not use the v5 static fallback;
- reduced-motion policy is respected.

### 15.2 Equipment appearance

Tests must verify:

- every visible equipment slot resolves deterministic layer metadata;
- Common/Magic/Rare/Relic family treatments resolve without affix combinatorial expansion;
- every current Unique/Mythic definition has a valid visual signature;
- cache keys change on relevant equipment/Covenant revisions and remain stable otherwise;
- simplified effects preserve chase-item recognition;
- Covenant treatment cannot remove required item identity layers.

### 15.3 Audio

Tests must verify:

- every required semantic event family resolves a definition;
- material/weapon/Covenant layering is deterministic and bounded;
- concurrency groups and voice eviction honor priority;
- settings route correct gains to buses;
- required v7 samples decode;
- legacy v5 samples, when intentionally referenced, are declared in the v7 manifest rather than reached by implicit fallback;
- Electron `file://` resolution works;
- required and optional failure policies behave differently as specified.

### 15.4 Integrated embodied combat

Representative integration scenarios cover:

- all six primary classes;
- all six Covenant affinities;
- Metamorphosis stages 1–5;
- dual-affinity instability;
- Guard break, stagger, knockdown, execution;
- a persistent Hunter intrusion;
- an authored boss phase transition;
- Unique/Mythic visual signatures;
- Sanctuary and Black Road contexts;
- reduced-motion/reduced-flashing/simplified-effects settings.

### 15.5 Compatibility

Load current v6 fixtures plus migration-chain fixtures, run gameplay, save, reload, and prove gameplay continuity. No presentation cache or resolved asset reference is persisted as gameplay state.

### 15.6 Performance

Extend the existing v6 stress harness and compare v7 against the same scenario. Release fails if sustained presentation cost exceeds the 15% budget without an explicitly documented benchmark correction caused by test-harness error.

## 16. File Boundaries

Expected new modules:

- `src/data/animation-v7.js`
- `src/data/audio-v7.js`
- `src/data/equipment-appearance-v7.js`
- `src/presentation/combat-context-v7.js`
- `src/presentation/animation-clips-v7.js`
- `src/presentation/equipment-appearance-v7.js`
- `src/presentation/audio-resolver-v7.js`

Focused modifications:

- `src/presentation/animation.js`
- `src/presentation/context.js`
- `src/presentation/covenant-identity.js`
- `src/presentation/system.js`
- `src/presentation/validator.js`
- `src/systems/audio.js`
- `src/systems/renderer.js`
- `src/systems/loot.js` to replace coarse equipment presentation with the new resolver boundary
- `src/systems/game.js` only where presentation revision/context plumbing is required
- `src/data/items.js` for stable Unique/Mythic visual signature metadata
- `src/data/presentation.js` only for legacy bridge compatibility or removal of superseded tables
- `src/ui/ui.js` only for required settings/debug surfaces
- `package.json` for v7 test/release scripts and final version bump

Assets:

- existing required `public/assets/hero-motion-<class>-v7.png` files remain at their current paths;
- new equipment assets: `public/assets/equipment/v7/`;
- new semantic audio bank: `public/assets/audio/v7/`.

## 17. Implementation Packaging

Because animation, equipment appearance, and audio are independently testable but share the new normalized combat context, implementation should be executed as four linked plans rather than one monolithic change:

1. **v7 Foundation + Animation** — context resolver, manifests, clip registry, body rendering, required-asset validation;
2. **v7 Equipment Appearance** — slot layers, caching, all Unique/Mythic signatures, Covenant material interaction;
3. **v7 Combat Soundscape** — semantic registry, resolver, v7 sample bank, mixer integration and voice budgets;
4. **v7 Integration + Release** — orchestration, debug/validator surfaces, compatibility, performance, Electron packaging, documentation, `test:v7`, final version bump.

Each plan produces independently green software and is committed to `v7-embodied-covenant` before the next plan begins.

## 18. Definition of Done

v7.0 is complete only when:

- all six classes use class-specific authored body motion for required combat/locomotion states;
- the six current hero-motion v7 sheets are manifest-owned and release-gated;
- certified v7 gameplay no longer depends on the static v5 hero-facing fallback;
- equipped gear visibly changes the character through deterministic slot/family layers;
- every existing Unique/Mythic definition has a stable recognizable visual signature;
- Covenant affinity/stage coherently modifies body/equipment/VFX/audio presentation without hiding item identity;
- semantic weapon, material, Guard, spell, execution, Hunter, boss, surface, loot, UI, and ambience audio paths are implemented;
- animation, equipment, Covenant identity, VFX, impact, and audio consume the same normalized presentation context;
- existing gameplay authority remains outside renderer/audio/resolvers;
- v6 save compatibility remains intact;
- accessibility settings constrain every new presentation feature;
- required image/audio assets pass browser and packaged Electron validation;
- v7 stays inside the stated performance budget;
- the complete v6 `npm run test:v6` chain still passes beneath the v7 release gate;
- `npm run test:v7` is the final release certification command;
- stable v7 source, tests, manifests, assets, and documentation are all present in GitHub before release is called complete.
