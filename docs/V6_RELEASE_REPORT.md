# Ashen Covenant: The Black Road v6.0.0 — Covenant Metamorphosis Release Report

## Outcome

Version 6.0.0 converts Ashen Covenant from a collection of strong but partially parallel ARPG systems into a Covenant-driven game architecture. The six Covenant affinities—Flame, Grave, Blood, Light, Storm, and Void—now resolve into combat, ability, world, boss, loot, Sanctuary, endgame, animation, VFX, and audio behavior through shared domain systems rather than isolated feature flags.

The v5.0.1 geometry, encounter, campaign, Journey/Paragon, inventory, Masterwork, Contracts, Requiem, Black Road, renderer, camera, and presentation foundations are retained. Save schema 19 migrates prior valid saves conservatively and retains legacy fields where compatibility requires them.

## Major systems delivered

### Covenant Metamorphosis

- Six affinities with behavior-driven reinforcement.
- Dual alignments, incompatible-pair instability, and five Metamorphosis stages.
- Derived passives, spawn bias, boss variants, reward tags, regional response, presentation identity, and audio identity.
- Threshold/alignment domain events and persisted Covenant state.

### Authored skills and progression

- 30 canonical primary-class combat actions.
- 120 rule-changing authored mutations across attack, Skill One, Skill Two, dodge, and ultimate for all six classes.
- Fixed resolver order: base ability → selected mutation → Covenant → equipment hooks → late progression.
- Canonical mutation credits/selections with idempotent conversion of legacy Imprints/Mastery/Reforged transformation value.

### Combat, enemies, and Hunters

- Normalized HitContext/HitResult combat resolution with mass, poise, armor, Guard, guard break, impulse, knockdown, launch, and execution eligibility.
- Pack-level faction doctrines for Grave, Blood, Iron, Void, and Storm.
- Cached doctrine directives and reusable combat slots prevent per-actor tactical recomputation.
- Persistent Named Hunters remember encounter information, gain adaptations, intrude through the normal enemy runtime, expose dossiers, and carry known targeted rewards.

### Bosses and loot

- Ten authored boss controllers with deterministic thresholds, mechanic schedules, punish windows, Covenant variants, and persisted discoveries.
- All 47 Uniques/Mythics normalize to executable behavior hooks.
- Nine previously stat-dominant chase items now contain explicit gameplay mechanics.
- Source-pool ordering remains authored; Covenant targeting biases eligible pools without deleting valid drops.
- Unique/Covenant equipment presentation resolves explicit weapon and aura keys.

### Living world and Sanctuary

- Persistent Gravewake Rising, Blood Moon Hunt, and Black Procession events.
- Event presence is physical: Procession movement changes regions, Gravewake can raise actual corpses, and Blood Moon surfaces Hunter/elite pressure.
- Outcomes persist into regional threat echoes, weather/lighting, loot bias, corpse rules, Hunter pressure, and Black Road modifiers.
- Sanctuary reacts to Metamorphosis, strongholds, factions, Hunters, world outcomes, campaign progress, and boss discoveries with changing architecture, NPCs, services, merchants, lighting, and real cache transactions.

### Black Road and Eclipse

- Route context freezes Covenant, persistent-world, and Eclipse conditions at launch.
- Active route context survives save/reload without rerolling.
- Eligible Named Hunter intrusion integrates with room authority without blocking completion.
- Midpoint route drafting includes affinity-specific Metamorphosis choices.
- Eclipse controls endgame conditions instead of functioning only as additive stats.
- Covenant/Eclipse state can force boss affinity variants and eligible target-farm rewards.

### Interface and audiovisual identity

- Dedicated Metamorphosis Hub view for stage, instability, mutation state, Hunter dossiers, regional events, and boss discoveries.
- Atlas regional pressure and Hunter markers.
- Covenant-resolved animation keys and three-phase cast/trail/impact VFX families.
- Stage-based aura, markings, eyes, movement, and weapon overlays.
- Covenant/faction/world/boss tonal identity, adaptive motif shifts, threshold stingers, Hunter/world-event cues, and authored boss signature cues.

## Architecture

Gameplay policy is split across focused systems: `CovenantSystem`, `AbilitySystem`, `ProgressionSystem`, `CombatSystem`, `EnemyDirector`, `HunterSystem`, `BossController`, `LootSystem`, `WorldStateManager`, `SanctuarySystem`, and `EndgameContextSystem`. `GameEngine` remains the compatibility/lifecycle facade and physical executor for entity-side world actions. A permanent architecture regression prevents subsystem reverse-imports of `GameEngine` and verifies that Covenant and loot policy remain delegated.

## Save compatibility

The release remains on save schema 19. The migration certification covers representative schema 13, 14, 18, and 19 snapshots and verifies preservation of inventory, stash, equipment, Uniques, sockets/runes, Masterwork, campaign, Journey/Paragon, factions, Contracts, Requiem, Black Road records, mutation state, Covenant/world/Sanctuary state, and legacy Nemesis → Hunter continuity. Migration is idempotent.

## Release certification

Three consecutive pre-release `npm run test:v6` runs passed before the 6.0.0 version mutation. The gate includes every v6 subsystem regression plus the full dependency-free v5 core regression chain.

Integrated v6 simulation certification exercises stage-five Metamorphosis, an authored mutation, persistent regional state, pack doctrines, a live Named Hunter, and more than 225 actors simultaneously. The reference certification run completed with approximately 2.76 ms average update time, 5.05 ms p95, roughly 1.03 MB retained heap, and a stable 200+ actor population.

The existing presentation stress gate continues to exercise 241 actors, animation LOD, pose evaluation, and adaptive audio. The reference release run completed at approximately 0.71 ms presentation p95 with zero streaming underruns and zero retained music voices after release.

## Known environment constraint

The extracted development environment used for this release has incomplete local `vite`/`jsdom` package directories. Browser-emulation tests that require `jsdom` and a production Vite/Electron build are attempted separately and may be unavailable for environmental reasons. Dependency-free static UI integrity, simulation, presentation, save, Black Road, campaign, progression, loot, Contracts, music, animation, 2.5D, and stress gates remain authoritative and are included in `npm run test:v6`.

## Build validation

The tracked 6.0.0 source passes the full dependency-free release certification. A production Vite build was attempted with `npm run build` and was blocked before compilation because the extracted environment does not contain the `vite` executable (`sh: 1: vite: not found`). The local `node_modules/vite` directory is empty and the npm cache contains zero packages. A locked `npm ci --ignore-scripts` restore was attempted, but the harness terminated it before dependencies could be downloaded; no tracked source files were changed by that attempt.

This release therefore certifies the source/game simulation and documents the packaging limitation rather than claiming a Windows executable was rebuilt in this environment. Running `npm ci`, `npm run test:v6`, and `npm run desktop:win` on a normal Node environment with network/package-cache access is the supported packaging path.
