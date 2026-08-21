# Ashen Covenant 2.1.0 “Ash & Overture” Final Report

## Executive Summary

Version 2.1 replaces isolated animation flags and one-shot sound calls with one event-driven presentation layer. Player actions now resolve at authored contact/release events; class movement and all six weapon identities have distinct cadence; enemy and boss intent is clearer; impacts coordinate animation, damage, camera, VFX, sound, controller feedback, and optional music accents; the world gains synchronized destruction, high-tier loot reveals, NPC routines, and region-aware footsteps; and a persistent adaptive score covers the complete game-state hierarchy.

The core systems are implemented and tested. Current visual animation remains procedural Canvas2D rather than skeletal animation, and all music is original procedural placeholder content rather than final recorded stems. Those constraints are exposed in data, debug UI, matrices, and documentation rather than being presented as finished asset production.

## Project Audit

The audited 2.0.0 game used custom ES modules, Electron 43.1.1, Vite 7, Canvas2D, Web Audio sound effects, authoritative JavaScript combat/AI, and version-13 localStorage saves. Stable combat, world, progression, UI, renderer, enemy AI, boss phases, atlases, and packaging were retained. Direct animation flags, immediate attack damage, direct camera/hit-stop calls, sparse sound routing, absent music, missing context aggregation, and missing presentation validation/debugging required extension or refactoring.

There are no skeletons, rig variants, retargeters, animation clips, blend graphs, IK solvers, root-motion clips, cloth simulations, facial rigs, physics ragdolls, Wwise/FMOD integration, or recorded music assets in the project. The complete pre-change classification is in `PRESENTATION_AUDIT_v2.0.0.md`.

## Animation Architecture

- `GamePresentationSystem` coordinates context, animation, impacts, camera, cinematics, audio, settings, telemetry, and compatibility.
- A strict typed event bus carries stable presentation events while `legacy:*` bridges preserve every prior gameplay call site.
- Eighteen class/weapon attack timelines and ten action timelines own phase order, gameplay release, cancels, sound, and presentation references.
- Position and collision remain gameplay-authoritative; melee correction is capped at 22/34 units and 0.28 radians.
- A five-tier presentation LOD budget reduces distant and offscreen pose work.
- Validators reject invalid timing, events, cancels, references, music metadata, missing state coverage, and fallbacks.

## Player Animation

- Frame-rate-independent acceleration/deceleration plus idle, injured idle, combat idle, start, walk, run, combat run, stop, pivot, dodge, action, hit, death, and resurrection states.
- Six physical profiles: disciplined longsword Warden, ritual Thornseer whip, fortress Ironbound shield, fast dual-blade Veilrunner, asymmetric Gravebinder scythe, and ceremonial Dawnstrider staff.
- Three-stage combo per class with buffered input and explicit dodge/attack/skill cancel windows.
- Primary skill, ward, Companion Technique, hybrid signature, ultimate, potion, and execution effects resolve on `ResolveAction`; early cancellation cannot spend their resources or create their effects.
- Visible dodge travel and immunity differ by at most 0.01 seconds.
- Directional player reactions, accessible hit stop, weapon-specific whooshes/impacts, class casting gestures, and bounded execution alignment.

## Enemy and Boss Animation

- Eleven role profiles govern anticipation, pose, turn cap, recovery, and reaction scale across 41 enemies.
- Line, cone, and area telegraphs synchronize with impact location and role-specific audio.
- Committed attacks reduce tracking; brutes and bosses turn substantially slower than small attackers.
- Directional, damage-tiered, history-penalized reactions avoid repeated identical recoil.
- All ten bosses use a coordinated entrance/attack/stagger/phase/death framework with attack holds, cleared telegraphs, camera selection, transition rings, VFX, stingers, music layers, and post-defeat silence.
- Boss revive restores the living boss ID and phase immediately without replaying the reveal sting.

## World Animation

- Eighteen scheduled Sanctuary actors and five reclaimed-world actors per liberated region use work, walk, and converse routines.
- Region/weather context drives atmosphere and music; footsteps respond to 12 surface profiles, foot, class weight, speed, and armor.
- Urns, barricades, and ritual vessels have data-driven health, damage response, break procedure, debris, impact, sound, loot, and cleanup.
- Corpse profiles support directional, grounded, scorched, frozen, and authored-boss presentation with bounded impulse and cleanup.
- Existing painted terrain, props, lights, weather, class/enemy atlases, projectiles, hazards, and loot art remain integrated rather than replaced.
- Skeletal IK, hand IK, cloth, hair simulation, facial animation, mounts, and physics ragdolls are not claimed because the required assets/runtime do not exist.

## Music Architecture

- Persistent adaptive music survives gameplay overlays and does not restart at room boundaries.
- Cue database, context resolver, threat evaluator, history, variation penalty, silence scheduler, quantized transitions, vertical stems, sections, stingers, mix duck, settings, and debug state are data-driven.
- Threat uses population/distance/role, elites, boss phase/health, player danger, endgame wave, local events, and combat state with attack/release smoothing and hysteresis.
- Transitions support immediate, beat, half-bar, bar, two-bar, and four-bar quantization.
- Fourteen named buses plus a separate music-duck node preserve user volume during narrative/menu ducking.
- SFX uses a 32-voice priority budget; adaptive music peaked at 16 procedural voices in stress validation.

## Soundtrack Content

- 35 cues: main menu, character creation, loading, narrative, six region exploration suites, six region combat suites, six region dungeon suites, ten boss suites, player death, victory, and credits.
- 182 synchronized stem definitions across drone, texture, strings/harmony, pulse, percussion, brass, choir, climax, depth, class color, and boss motif roles.
- 13 stingers: boss reveal/phase/defeat, death, resurrection, relic/unique/mythic drop, level, stronghold liberation, operation victory, combo finisher, and ultimate.
- Six modal/root/texture regional identities and class motif offsets.
- All content is original procedural synthesis labeled `procedural-placeholder-original`; no placeholder is claimed as a final composer recording.

## Unified Presentation Integration

- Heavy attacks share one data source for anticipation, contact, damage, hitbox lifetime, whoosh, VFX, impact, shake, rumble, and music accent.
- Boss phase events hold gameplay and synchronize phase state, rings, camera, sound, score, and attack-set activation.
- High-tier loot presentation occurs at world spawn and coordinates beam/item art, impact, sound/stinger, controller/camera response, and later pickup UI.
- Cinematic start/end/skip owns ducking and transient state; durable quest/reward state remains in idempotent campaign code.
- Stronghold completion updates durable world state and triggers reclaimed actors plus liberation audio.
- Pause/inventory/Chronicle/Paragon overlays preserve the correct underlying score with a mix adjustment.

## Files Added

- `src/data/presentation.js` — all class/action/enemy/impact/camera/sound/surface/music/destruction/fallback profiles.
- `src/presentation/event-bus.js` — typed bus and legacy bridges.
- `src/presentation/context.js` — sampled shared context and threat smoothing.
- `src/presentation/animation.js` — timelines, locomotion, reaction history, NPCs, and LOD.
- `src/presentation/impact.js` — hit stop, camera, rumble, flash, sound, and accessibility.
- `src/presentation/music.js` — cue database, history, threat, quantization, stems, stingers, and mix.
- `src/presentation/system.js` — central orchestration, cinematics, settings, debug snapshot, and compatibility API.
- `src/presentation/validator.js` — data/runtime validators.
- `scripts/presentation-overhaul.mjs` — integrated animation/impact/world validation.
- `scripts/adaptive-music.mjs` — cue, transition, stem, stinger, death/revive validation.
- `scripts/presentation-ui.mjs` — settings persistence and release-gated F3 UI validation.
- `scripts/presentation-performance.mjs` — 241-actor and adaptive-audio stress fixture.
- `scripts/headless-presentation-capture.mjs` — real Canvas2D scene capture for restricted build environments.
- `docs/PRESENTATION_AUDIT_v2.0.0.md` — mandatory pre-change audit.
- `docs/PRESENTATION_ARCHITECTURE_v2.1.0.md` — runtime architecture and policies.
- `docs/ANIMATION_AUTHORING_v2.1.0.md` — class/weapon/action/enemy/boss/IK/retarget guidance.
- `docs/MUSIC_AUTHORING_v2.1.0.md` — region/cue/stem/boss/stinger/mix/rights guidance.
- `docs/PRESENTATION_TESTING_v2.1.0.md` — tests, debug, performance, capture, and packaging guidance.
- `docs/PRESENTATION_FINAL_REPORT_v2.1.0.md` — this report.
- `docs/matrices/animation-matrix.csv`, `music-matrix.csv`, and `boss-presentation-matrix.csv` — exact implementation/content status.

## Files Modified

- `src/main.js` — constructs and updates the persistent presentation system.
- `src/core/constants.js` — adds the F3 debug binding.
- `src/systems/game.js` — timed action integration, motion, enemy/boss events, impacts, loot, destruction, NPC/world hooks, and camera scale.
- `src/systems/renderer.js` — camera integration, class weapons/poses, reactions, bosses, NPCs, destructibles, corpses, loot, and headless-safe atlas dimensions.
- `src/systems/audio.js` — replaces the shallow sound layer with buses, profiles, voice budget, footsteps, focus behavior, and adaptive music.
- `src/systems/save.js` — normalizes and persists audio/accessibility/debug preferences without changing save version 13.
- `src/ui/ui.js` — presentation settings and release-gated live debug panel.
- `src/styles.css` — responsive settings/debug layouts.
- `scripts/visual-capture.cjs` — adds combat, debug, and presentation-settings capture targets.
- `README.md` — documents 2.1 behavior and honest asset constraints.
- `package.json` and `package-lock.json` — version 2.1.0 and four permanent presentation suites.
- `dist/index.html` and hashed `dist/assets/index-*.js/css/map` — regenerated tested production bundle.

## Testing Completed

- All 18 historical v2.0 regression suites pass.
- Four new suites pass: unified presentation, adaptive music, presentation UI, and presentation performance.
- Every JavaScript/MJS/CJS file passes `node --check`.
- Vite production build passes with 30 transformed modules.
- Dependency audit reports zero vulnerabilities.
- Presentation validators report 6 classes, 18 attacks, 10 actions, 35 cues, 182 stems, 13 stingers, 47 sound profiles, 19 impacts, 10 cameras, and zero issues.
- Headless real-renderer QA passes at 1500×940 for dense combat telegraphs, weapon contact, high-tier loot, and boss phase transition.
- Native Electron capture is blocked by the container's denied D-Bus socket; DOM/interaction tests and direct Canvas2D capture cover the same source renderer.

## Bugs Fixed and Resolution Summary

- Basic attacks and skills could apply gameplay before visible contact: all action categories now resolve on central timeline events.
- Input buffer could age during hit stop: buffer and action timeline pause together.
- Acceleration integration could vary displacement by frame rate: bounded substeps plus trapezoidal integration preserve elapsed movement.
- Attack facing could snap after commitment: rotation is capped by phase and policy.
- Dodge immunity and visible movement diverged: immunity now ends 0.01 seconds before dash travel.
- Boss attacks/phase changes could retain old telegraphs: phase holds clear windup and telegraph before activation.
- Revive in a boss fight could replay the reveal sting or wait for a bar to restore score: boss identity is retained and restoration is immediate.
- Boss defeat could let the old boss cue re-emerge after silence: the next context crossfades immediately under the post-defeat silence.
- Dialogue ducking could overwrite user music volume: ducking now uses an independent gain node.
- Retired cue gain could disconnect before its fade completed: disconnect is delayed until the ramp finishes.
- Duplicate stinger listeners could double one-shots: stingers have one routed listener plus cooldown/priority guards.
- Failed voice reservation could still schedule nodes: scheduling now aborts when the budget rejects the request.
- Footstep surface filters were calculated but unused: filter override now reaches the noise layer.
- High-tier stings occurred at pickup instead of the visible spawn: loot spawn owns the coordinated reveal.
- F3 debug could be available unintentionally or fail to close cleanly: release gating is explicit and every close path clears debug state.

## Performance Results

Representative clean release stress run:

- Presentation CPU: 0.080 ms average, 0.237 ms p95, 4.167 ms maximum.
- Adaptive-music CPU: 0.006 ms average, 0.011 ms p95, 1.848 ms maximum.
- Retained heap after GC: 0.42 MB.
- Stress population: 241 actors; 178 active animators; 139 pose evaluations.
- LOD distribution: hero 1, near 48, mid 48, far 81, offscreen 63.
- Active skeletal bones: 0; physics ragdolls: 0; cloth simulations: 0.
- Peak procedural music voices: 16; active after release: 0; SFX cap: 32.
- Streaming stability: zero underruns because current procedural music is resident; imported-asset streaming remains unmeasured.

These subsystem timings are from the build container and are not a substitute for GPU/audio-device profiling on target Windows hardware.

## Remaining Asset Needs

Systems are complete enough to accept content, but final AAA asset production remains substantial:

1. Original 48 kHz/24-bit composed stems and mixes for all 35 cue slots plus separate tails and rights metadata.
2. Recorded/designed weapon, armor, creature, destruction, ambience, UI, dialogue, and material libraries to replace procedural SFX.
3. Multi-frame or skeletal locomotion/attack/dodge/reaction/death sets for six classes, 41 enemies, ten bosses, and NPC professions.
4. Humanoid/creature skeleton standards, weapon sockets, retarget profiles, foot/hand IK, slope grounding, compression, and bone LOD.
5. Authored boss entrances, phase transitions, staggers, and deaths; cinematic camera tracks; facial rigs, visemes, mocap, and voice production.
6. Cloth/hair/secondary-motion assets and budgets; authored-to-ragdoll physics if desired.
7. Dedicated biome ambience, weather recordings, class-selection sequences, loading/victory/credits art, and world-boss-scale content.

## Windows Build Validation

- `electron-builder` produced `release/win-unpacked` from the exact tested 2.1.0 bundle.
- Launcher: PE32+ x86-64, Windows GUI subsystem 2, one intended `Ashen Covenant.exe` and no duplicate `electron.exe`.
- `resources/app.asar` contains version 2.1.0, the tested JS/CSS hashes, all six terrain plates, player/enemy/environment/item/rune/ability atlases, campaign art, desktop entry, and relative-path `dist/index.html`.
- App archive: 41,261,079 bytes; Windows folder: approximately 387 MB before ZIP compression.
- The ZIP and source archive are tested separately during final handoff.
- The executable was not launched on Windows in this Linux container because Wine/Windows runners are unavailable. Windows audio-device switching, focus behavior, and launch therefore require a target-Windows smoke test before public release; this report does not claim otherwise.

## Recommended Next Steps

1. Run the packaged build on low/mid/high Windows hardware and capture CPU/GPU/audio/IO traces through extended sessions and device changes.
2. Commission one final regional exploration/combat suite and one complete boss suite first; verify the imported-stem pipeline before producing all music.
3. Choose a skeletal 2D/3D animation strategy, build the Warden/longsword vertical slice, and validate root/IK/retarget/LOD policies before scaling to six classes.
4. Produce dedicated authored telegraphs, reactions, phase transitions, and deaths for the ten bosses and highest-threat enemy families.
5. Add facial/dialogue tooling and final VO only after camera, subtitle, skip, localization, and save-state tests are locked.
6. Expand mounts, world bosses, future regions, chapters, cinematics, and endgame activities through the existing context/profile databases rather than new managers.
