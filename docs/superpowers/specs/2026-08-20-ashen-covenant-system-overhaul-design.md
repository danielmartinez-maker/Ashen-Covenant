# Ashen Covenant — System Overhaul Design

Date: 2026-08-20
Baseline: v5.0.1
Target: staged v5.2–v6.0 overhaul

## 1. Purpose

Ashen Covenant already has a stable 2.5D ARPG foundation: six classes, fifteen hybrid Covenants, campaign progression, Journey and Paragon systems, loot and Masterwork, factions, contracts, world-state scaffolding, Black Road expeditions, authored encounter geometry, multi-phase bosses, adaptive music, a mature desktop UI, save migration, and a broad regression suite.

The next development cycle will not rebuild those systems. It will make them cohere around one mechanical identity: **Covenant Metamorphosis**. Covenant state must become the shared systemic input that changes the player, abilities, enemies, bosses, loot, factions, Sanctuary, regions, quests, presentation, and endgame conditions.

The implementation must also reduce the concentration of gameplay authority in `src/systems/game.js`, which is currently the primary runtime god-object. Extraction will be incremental and behavior-preserving.

## 2. Non-goals

This overhaul will not prioritize:

- multiplayer or PvP;
- mounts;
- additional base classes;
- a large increase in zone count;
- another independent progression tree;
- a renderer rewrite;
- replacing the existing DOM/CSS UI shell;
- replacing WorldGeometrySystem, InputSystem, Renderer, AudioDirector, or the presentation event architecture unless a verified defect requires it.

## 3. Baseline invariants

The following must remain true throughout implementation:

1. Existing valid v5.0.1 saves remain loadable.
2. Save migration is explicit and versioned; no silent loss of inventory, campaign, Black Road, Journey, Paragon, Masterwork, faction, contract, or Requiem state.
3. Existing regression suites continue to pass after each extraction slice.
4. Black Road remains playable from Sanctuary through completion and explicit return.
5. Six-class combat fuzz remains green.
6. Core UI IDs and event contracts remain stable unless migrated in the same commit with tests.
7. Production performance must remain within the existing 241-actor stress envelope or improve.
8. Gameplay remains fully offline and dependency-light.

## 4. Architecture strategy

### 4.1 Strangler extraction

`GameEngine` remains the composition root and authoritative frame orchestrator, but responsibilities move into narrowly-scoped systems behind stable interfaces. No big-bang rewrite is allowed.

Target runtime boundaries:

- `CombatSystem` — hit resolution, poise/stagger/guard/execution, status/reaction resolution, hit-stop requests.
- `AbilitySystem` — active-skill execution, mutation resolution, cooldown/resource validation, authored effect descriptors.
- `CovenantSystem` — Covenant alignment, behavioral reinforcement, instability, thresholds, hybrid resolution, derived metamorphosis effects.
- `ProgressionSystem` — skill points, legacy migration, Journey, Paragon, mastery consolidation, level rewards.
- `EnemyDirector` — faction doctrine, role selection, combat-slot assignment policy, adaptation hooks, Hunter intrusion.
- `BossController` — authored boss phase state machines, mechanic scheduling, intermission rules, Covenant reactions.
- `LootSystem` — rarity, source pools, unique eligibility, pity, targeting, award/storage helpers, Covenant reward gating.
- `WorldStateManager` — regional threat/control/momentum, world events, faction pressure, Sanctuary state, regional modifiers.
- `HunterSystem` — persistent named adversaries, scars, adaptations, grudges, intrusions, rewards.
- `SaveMigrator` — schema upgrades from snapshot v18 to the new schema.

`GameEngine` should ultimately own lifecycle, frame order, references to systems, entity collections, camera state, and public facade methods used by the UI.

### 4.2 Dependency rule

Systems may depend on pure data modules and explicit context objects. They must not import `GameEngine`.

Preferred call direction:

`GameEngine -> subsystem -> pure data/helper modules`

Cross-system behavior should pass through context/resolver objects or emitted domain events rather than direct subsystem-to-subsystem imports wherever practical.

### 4.3 Domain events

Add a lightweight gameplay-domain event channel separate from presentation events. Initial event set:

- `combat:hit-resolved`
- `combat:enemy-killed`
- `combat:execution`
- `ability:cast`
- `ability:mutation-triggered`
- `covenant:alignment-changed`
- `covenant:threshold-crossed`
- `world:event-resolved`
- `world:region-state-changed`
- `hunter:intrusion`
- `hunter:defeated`
- `boss:phase-changed`
- `loot:unique-awarded`
- `sanctuary:state-changed`

Presentation may subscribe to these through the existing presentation bridge.

## 5. Covenant Metamorphosis

### 5.1 Alignment model

Introduce six metaphysical alignments:

- Flame
- Grave
- Blood
- Light
- Storm
- Void

The existing primary/secondary class pairing remains unchanged. Covenant alignment is a second semantic layer that evolves through play and can converge with, reinforce, or destabilize the chosen hybrid.

State shape:

```js
covenant: {
  affinities: { flame, grave, blood, light, storm, void },
  dominant: [],
  instability: 0,
  stage: 0,
  thresholdsSeen: [],
  behaviorLedger: {},
  regionalResonance: {},
  mutationsUnlocked: [],
  metamorphosisFlags: {}
}
```

Affinities are bounded weighted values, not reputation ranks. Actions modify multiple affinities and instability according to authored behavior tags.

### 5.2 Behavioral reinforcement

Relevant actions receive semantic tags such as:

- `mercy`, `sacrifice`, `dominion`, `defile`, `purify`, `consume`, `preserve`, `reckless`, `vengeance`, `stormbound`, `gravebound`, `voidbound`.

Campaign choices, faction decisions, boss resolutions, executions, world-event outcomes, item attunement, skill mutations, and certain repeated combat behaviors can contribute to the ledger.

The ledger decays in influence over time so one early choice does not permanently lock the build, but major campaign decisions can establish permanent floors/ceilings.

### 5.3 Thresholds

Metamorphosis stages occur at authored thresholds. Each threshold must change at least three of the following:

- one or more ability behaviors;
- a passive combat rule;
- player visual presentation;
- NPC/faction response;
- regional spawn weights;
- dungeon modifier availability;
- boss mechanic behavior;
- merchant inventory/reward pool;
- world event outcome options.

No threshold may be cosmetic-only.

### 5.4 Dual alignment

The two strongest compatible alignments may create a hybrid Covenant state. Hybrids unlock unique mechanics unavailable to pure states. Incompatible affinities increase instability and can unlock unstable variants rather than simply cancelling each other.

### 5.5 Existing “World Oaths” rename

The difficulty tiers currently called World Oaths must be renamed to **World Torments** to avoid semantic collision with Covenant/Oath identity. Save migration maps old IDs unchanged internally where possible while updating player-facing labels.

## 6. Ability mutation architecture

### 6.1 Resolver pipeline

Every important active ability resolves through:

`base ability -> class specialization -> Covenant mutation -> equipment/Unique mutation -> late progression modifier -> runtime descriptor`

The resolver returns a normalized descriptor describing:

- damage channels;
- target shape;
- range/radius;
- projectile count and behavior;
- movement/root motion;
- resource/cooldown behavior;
- statuses;
- summon rules;
- terrain/corpse interactions;
- guard/poise properties;
- presentation key;
- tags used by other systems.

Gameplay executes the descriptor rather than scattering mutation branches through attack methods.

### 6.2 Authored mutation quality bar

Each major active skill must eventually have 4–6 meaningful mutations. A mutation must alter at least one rule of play, not merely a percentage value. Numeric modifiers are allowed as secondary support.

Examples of acceptable mutation categories:

- projectile -> melee impalement;
- linear attack -> orbiting projectiles;
- fire -> Grave damage with corpse interaction;
- dodge -> teleport strike;
- barrier -> damage-storage retaliation;
- bleed kill -> temporary summon;
- channel -> moving storm field;
- execution -> area conversion effect.

### 6.3 Legacy progression consolidation

Generic slot-level `HYBRID_MUTATIONS`, `MASTERY_EVOLUTIONS`, and old imprint choices are migrated into authored ability mutation unlocks or supporting passive bonuses. Existing earned progression is preserved by granting equivalent unlock credits.

No player loses earned ranks because a redundant tree is removed.

## 7. Combat model

### 7.1 HitContext

Introduce a normalized `HitContext` with:

```js
{
  source,
  target,
  abilityId,
  tags,
  damage,
  damageType,
  stagger,
  poiseDamage,
  impulse,
  guardDamage,
  executePower,
  crit,
  position,
  direction,
  covenantTags
}
```

`CombatSystem.resolveHit(context)` returns a `HitResult` describing applied damage, blocked/guarded state, stagger transition, knockback, knockdown, execution eligibility, reactions, death, and presentation impact tier.

### 7.2 Physical response

Enemy templates receive explicit mass/poise/armor classes. Response to the same hit differs by target class.

Required states:

- flinch;
- stagger;
- guard break;
- knockback;
- knockdown;
- launch where anatomy permits;
- execution window;
- unstoppable/boss immunity windows.

### 7.3 Weapon/class cadence

Basic attacks and skill recovery are tuned per weapon/class identity. Heavy archetypes gain commitment and impact; fast archetypes gain precision, cancel windows, and lower impulse. Existing startup/active/recovery animation timing remains authoritative.

## 8. Enemy factions and Hunters

### 8.1 Faction doctrine

Roles remain reusable, but each faction receives doctrine-level logic that changes how those roles cooperate.

Examples:

- Grave: corpse recycling, death zones, resurrection pressure.
- Blood: wounded-target focus, self-buffs from nearby bleeding units.
- Iron: shield lines, formation bonuses, guarded support units.
- Void: displacement, LOS disruption, spatial denial.
- Storm: mobile ranged pressure, chaining position requirements.
- Light: warded elites, cleansing, coordinated counterattacks.

### 8.2 HunterSystem

Upgrade current `nemeses` into persistent Named Hunters.

Hunter state includes:

- template/faction;
- epithet/name;
- level;
- victories/defeats;
- grudge;
- scars;
- adaptation traits;
- known player damage/ability tags;
- intrusion eligibility;
- region history;
- targeted reward pool.

Hunters may escape, intrude into world events/Black Road rooms, gain adaptations from prior defeats, and drop guaranteed themed rewards when finally slain.

## 9. Boss architecture

Bosses move to authored definitions using a common controller API but unique state machines.

Each major boss must have:

- a unique encounter thesis;
- authored phase transitions;
- at least three signature mechanics overall;
- punishable recovery windows;
- distinct intermission behavior where applicable;
- one Covenant-reactive mechanic or variant;
- one environment interaction where the arena supports it;
- unique presentation and audio cues.

Shared utilities may implement hazards, summons, arena contraction, projectile patterns, or vulnerability windows, but the encounter sequence may not be generated from one generic three-phase template.

## 10. Loot and equipment identity

### 10.1 Unique item rule

Every Unique/Mythic must have at least one behavioral hook represented in executable data, not only descriptive text/stat multipliers.

Unique effects can:

- replace or add an ability mutation;
- modify a combat reaction;
- alter Covenant threshold behavior;
- transform resource economy;
- create summon/terrain/corpse interactions;
- enable a new defensive/offensive loop.

### 10.2 Equipment renderer

Add a lightweight equipment-presentation layer on top of existing hero atlases:

- weapon silhouette/overlay family;
- helm/shoulder/chest accent layers where art exists;
- Covenant tint/effect channels;
- unique-item visual overrides for flagship items.

The current rarity halo remains optional feedback rather than the primary visual representation of equipment.

## 11. Living world and Sanctuary

### 11.1 Regional state

`WorldStateManager` resolves each region from:

- threat;
- control;
- momentum;
- faction pressure;
- Covenant resonance;
- event outcomes;
- campaign decrees;
- stronghold state.

The resolved region state modifies:

- spawn tables;
- elite/faction composition;
- weather/lighting presentation flags;
- ambient hazards;
- reward weights;
- event selection;
- merchant availability;
- boss variants;
- Black Road route modifiers tied to that region.

### 11.2 Physical world events

At least three event archetypes must exist physically in the world rather than as abstract counters. Initial set:

1. **The Black Procession** — moving caravan across connected regions.
2. **Gravewake Rising** — corpse-driven outbreak with resurrection nodes.
3. **Blood Moon Hunt** — roaming Blood Hunter plus regional bleed pressure.

Players can intercept, ignore, redirect, defend against, or exploit events depending on type.

### 11.3 Sanctuary

Sanctuary has a persistent resolved state affected by campaign, faction, Covenant, strongholds, Hunters, and world outcomes.

Changes may affect:

- NPC presence;
- merchant stock;
- crafting services;
- visual props/lighting;
- faction banners;
- Covenant architecture/effects;
- available quests;
- post-boss reactions.

## 12. Endgame consolidation

Black Road remains the core repeatable dungeon layer.

Changes:

- regional/Covenant state modifies route affixes and encounter composition;
- Hunters can invade eligible rooms;
- bosses can gain Covenant-reactive variants;
- midpoint boons can interact with current Metamorphosis;
- route rewards can target Covenant-specific Uniques;
- Eclipse progression shifts from another additive tree toward manipulating endgame conditions.

Progression ownership after consolidation:

- Class tree: class kit and core specialization.
- Covenant Metamorphosis: transformation and cross-system identity.
- Equipment/Uniques: build-changing rules.
- Paragon: late-game specialization and route optimization.
- Masterwork/Forge: item refinement.
- Journey: milestone rewards and onboarding of deep systems.
- Factions: world relationships/services, not generic combat-stat duplication.
- Eclipse: endgame condition control.

## 13. UI/UX

Preserve the v2.2 Covenant Hub architecture and accessibility systems.

Add:

- Metamorphosis page/state panel;
- current dominant affinities and instability;
- explicit “why this changed” recent-behavior ledger;
- threshold previews without exposing hidden narrative consequences;
- skill mutation comparison UI;
- Hunter dossier UI;
- regional state summaries on Atlas;
- Sanctuary state cues;
- boss Covenant variant indicators when discovered.

Normal combat HUD remains compact. Deep Covenant data belongs in the Hub, while threshold crossings get concise combat/world feedback.

## 14. Presentation and audio

### 14.1 Animation

Preserve the current animation controller and 8-facing support. Replace transform-derived/high-visibility placeholder motion first:

Priority:

1. basic combo impact frames;
2. dodge;
3. signature skills;
4. hybrid skill;
5. ultimate;
6. boss signatures;
7. executions.

Hitbox timing remains synchronized to startup/active/recovery windows.

### 14.2 VFX

Every major ability descriptor resolves a presentation key. Covenant mutation can replace the presentation family while preserving readability.

VFX pipeline supports:

- cast;
- trail/projectile;
- impact;
- terrain interaction;
- status layer;
- reaction layer;
- optional screen-space feedback.

### 14.3 Audio

Preserve AudioDirector, bus/priority/pan/pitch/voice logic, and adaptive music state machine. Expand content with:

- faction sound families;
- Covenant layers/stingers;
- boss mechanic cues;
- armor/weapon family differentiation;
- Sanctuary transformation ambience;
- world-event audio signatures.

## 15. Save migration

Current save version is 18. The overhaul introduces a new schema version.

Migration rules:

- preserve all existing top-level player data;
- preserve `reforged` as a legacy source during migration;
- create `covenant` state using hybrid/class/campaign/history defaults;
- convert existing hybrid mutation selections into mutation unlock credits or mapped authored mutations;
- convert mastery/imprint investment to equal-or-greater progression value;
- rename World Oath labels without invalidating stored difficulty IDs;
- convert `nemeses` to Hunters;
- seed new Sanctuary/regional fields from existing world/stronghold/faction state;
- never delete legacy fields until at least one stable release has shipped with the migrator.

Migration tests use representative snapshots from old schemas and v18.

## 16. Error handling and defensive rules

- Runtime subsystem methods return explicit success/result objects for expected invalid actions; do not use exceptions for normal gameplay validation.
- Corrupt optional save fields normalize to safe defaults.
- Corrupt identity-critical fields make the snapshot unloadable rather than silently creating a different character.
- Missing authored mutation/Unique/boss IDs fail closed to base behavior and emit a development diagnostic; production gameplay must remain functional.
- No empty catch blocks in gameplay code.

## 17. Testing strategy

### 17.1 Preserve existing tests

`npm run test:core` remains a hard gate.

### 17.2 New deterministic suites

Add:

- `scripts/covenant-metamorphosis.mjs`
- `scripts/ability-mutations.mjs`
- `scripts/combat-hit-context.mjs`
- `scripts/faction-doctrine.mjs`
- `scripts/hunter-system.mjs`
- `scripts/boss-controller.mjs`
- `scripts/living-world.mjs`
- `scripts/sanctuary-state.mjs`
- `scripts/progression-consolidation.mjs`
- `scripts/save-v19-migration.mjs` (or final chosen schema version)
- `scripts/unique-behavior.mjs`

### 17.3 Required scenario tests

At minimum:

- two characters with identical classes but different Covenant behavior diverge mechanically;
- same skill resolves to different descriptors under different Covenant/equipment states;
- mass/poise classes react differently to identical hits;
- faction doctrine changes group behavior without changing base role IDs;
- Hunter survives, adapts, reinvades, then awards targeted loot;
- boss mechanic changes under a qualifying Covenant threshold;
- regional state changes spawns/rewards and persists;
- Sanctuary changes after world/campaign/Covenant outcomes;
- Black Road integrates Covenant modifiers and Hunter invasion without breaking route completion;
- every Unique has an executable behavioral hook;
- v18 save migrates without item/progression loss.

### 17.4 Performance gates

Retain the 241-actor presentation test and add:

- 200+ enemy faction-doctrine stress;
- mutation descriptor resolution benchmark;
- world-state update throttling benchmark;
- Hunter intrusion allocation check;
- no uncontrolled per-frame allocation introduced by Covenant resolution.

Covenant/world state should be recomputed on relevant events or throttled intervals, not rebuilt per actor per frame.

## 18. Delivery sequence

### Phase A — v5.2 Foundation

- baseline freeze and regression proof;
- initialize repository history if absent;
- extract SaveMigrator, CovenantSystem skeleton, AbilitySystem resolver, CombatSystem hit context;
- keep public GameEngine facade behavior compatible;
- add new domain tests.

### Phase B — v5.3 Metamorphosis vertical slice

Implement one complete Covenant vertical slice across player, one class pair, two abilities, one faction, one region, one boss, one Unique, Sanctuary, UI, VFX/audio, save migration. The slice proves the architecture before content multiplication.

### Phase C — v5.4 Ability/buildcraft expansion

- authored mutations for all major class abilities;
- consolidate generic mastery/imprint/hybrid mutation layers;
- add mutation UI and migration grants;
- convert Uniques to behavioral hooks.

### Phase D — v5.5 Combat/factions/Hunters

- full HitContext physical-response migration;
- faction doctrine coverage;
- persistent Hunter framework;
- combat balance pass.

### Phase E — v5.6 Boss/loot identity

- authored BossController definitions;
- Covenant boss variants;
- targeted Hunter/boss rewards;
- equipment presentation layers.

### Phase F — v5.7 Living world/Sanctuary

- regional resolver;
- physical world events;
- evolving Sanctuary;
- faction/merchant/quest/world integration.

### Phase G — v5.8 Endgame consolidation

- Black Road Covenant integration;
- Hunter invasions;
- Eclipse condition-control redesign;
- progression ownership cleanup.

### Phase H — v6.0 Production pass

- high-visibility animation replacement;
- VFX/audio content expansion;
- final UI polish;
- full migration matrix;
- balance, performance, packaging, and release validation.

## 19. Acceptance criteria

The overhaul is complete only when all are true:

1. Covenant state materially changes combat, skills, presentation, world, rewards, and relationships.
2. Two players with the same classes can produce clearly different playstyles through Covenant evolution.
3. Every important active skill has multiple authored rule-changing mutations.
4. Enemy factions have visibly different group doctrine.
5. Named Hunters persist and adapt across encounters.
6. Major bosses have authored encounter logic and Covenant-reactive variants.
7. Every Unique/Mythic contains at least one executable behavioral hook.
8. Regions and Sanctuary visibly and mechanically respond to persistent world state.
9. Black Road consumes Covenant/world/Hunter state rather than existing as an isolated endgame island.
10. Player equipment and Metamorphosis are visibly represented beyond rarity halos.
11. Existing v5.0.1 saves migrate safely.
12. `GameEngine` is materially reduced in responsibility and new cross-system logic lives behind explicit subsystem boundaries.
13. `npm run test:core`, all new deterministic suites, build validation, and performance gates pass.
14. No core player-facing system depends on obvious programmer-art placeholders when production-ready authored assets are available.

## 20. Scope control

The implementation should optimize for depth and interaction density, not total feature count. If a proposed feature does not reinforce Covenant identity, buildcraft, combat readability, world consequence, or replayability, it should be deferred.
