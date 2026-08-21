# Ashen Covenant v2.0.0 Presentation Audit

Audit date: 2026-08-02  
Audited release: `2.0.0` “Systemic Reforging”  
Target platform: Windows x64 desktop  
Baseline validation: all 18 existing regression suites passed before presentation work began.

## Executive finding

The project has a deep, stable gameplay layer and a mature save-migration surface, but its presentation layer is substantially shallower than its systems. Gameplay, rendering, UI, and audio are modular at the file level, yet moment-to-moment presentation is coordinated through ad hoc state fields and immediate effects. The most serious gaps are the absence of a shared presentation context, typed event timelines, attack profiles, a real adaptive soundtrack, impact profiles, transition scheduling, presentation budgets, validators, and debug telemetry.

The correct implementation path is native to the existing engine: data-driven Canvas2D procedural animation plus Web Audio synthesis and scheduled stem layers. Importing a skeletal animation or middleware stack would add major runtime and authoring cost without compatible source assets. The project currently has no skeletons, animation clips, authored stems, recorded SFX, facial rigs, cloth rigs, or network layer.

## Project inventory

| Area | Finding |
| --- | --- |
| Engine/runtime | Custom JavaScript ES modules rendered through Canvas2D in Electron `43.1.1`; Vite `7.x`; Node-based tooling. |
| Language | Modern JavaScript targeting ES2022. |
| Desktop shell | Electron BrowserWindow, context isolation and sandbox enabled. |
| Game architecture | One deterministic `GameEngine` simulation with bounded 30 Hz substeps; renderer and UI update per animation frame. |
| Animation framework | No external framework. Player uses one `{type, duration, time, angle}` record; enemies use state/timer fields. Renderer adds procedural scale, tilt, weapon arcs, trails, flashes, and telegraphs. |
| Character rigs | None. Six class silhouettes share a 4×4 painted sprite atlas; 41 enemy definitions map to 16 atlas silhouettes. |
| Skeleton/rig variants | Zero skeletal rigs and zero retargetable animation rigs. |
| Retargeting | Not applicable to current sprite assets. |
| Root motion | No authored root motion. All world motion is authoritative simulation movement. Dashes and knock effects are code-driven. |
| In-place animation | All presentation is effectively in-place/procedural around gameplay-authoritative transforms. |
| IK / motion warping | None; incompatible with current flat sprites. Safe procedural facing and short gameplay movement correction are feasible. |
| State machines | Player and enemies have implicit state machines distributed through `game.js`; no declarative graph or validation. |
| Animation events | No typed animation-event router. Damage, projectiles, audio, VFX, rumble, and camera changes are invoked directly by action methods. |
| Hit detection | Arc, projectile, hazard, and radius checks are functional. Basic melee damage is resolved immediately when an action begins, before a data-authored contact frame. |
| Combat timing | Cooldowns, windups, recoveries, input buffering, dodge i-frames, hit stop, stagger, knockdown, executions, and boss phases exist. Timing values remain distributed across gameplay methods and data. |
| Enemy AI | Group coordination, roles, telegraphs, attack caps, morale, flanking, retreat, affixes, and boss phases are functional. |
| Camera | Smooth positional follow, shake, and flash only; no profiles, framing resolver, target bias, or reduced-motion scaling. |
| VFX | Canvas particles, hazards, trails, telegraphs, dynamic lights, effects, weather, corpses, and loot beams. Caps exist for particles and corpses. |
| Audio framework | Custom Web Audio oscillator SFX layer with 12 sound IDs and a single master gain. No audio assets or mixer buses. |
| Music | Missing. No cues, states, intensity evaluator, stems, sections, transitions, stingers, history, streaming, or music settings. |
| Assets | PNG atlases and six 1254×1254 terrain plates. No WAV/OGG/music files. Assets are eagerly loaded with browser `Image`. |
| World transitions | One continuous 3840×2520 world plus operation/endgame entity resets; no scene graph or engine scene loader. |
| Cinematics | Modal campaign dialogue and authored key art; no timeline/sequencer. Skip/acknowledge is UI-state driven. |
| Save system | Version 13 JSON in `localStorage`; extensive defensive normalization and v1.4 migration. Transient combat/animation state is intentionally not serialized. |
| Multiplayer | None. No replication architecture. |
| Windows packaging | Vite production build and electron-builder `dir` x64 package with ASAR. Paths are relative and desktop assets are bundled. |
| Existing test surface | 18 data, simulation, campaign, progression, loot, UI, input, expansion, contracts, and systemic-overhaul suites. No dedicated presentation timeline/audio validation or performance telemetry suite. |

## Existing content scale

- 6 base classes and 15 hybrid identities.
- 41 enemy definitions, including 10 boss definitions and 12 elite affixes.
- 6 regions, 30 districts, 18 world events, 5 campaign chapters and 31 campaign stages.
- 30 contracts, 10 delves, and 8 endgame activities.
- 6 terrain plates, 6 player silhouettes, 16 enemy silhouettes, 16 environmental props, and item/rune/ability atlases.

## System classification

| System | Classification | Technical reason / required action |
| --- | --- | --- |
| Fixed-step simulation and collision | Functional and reusable | Stable bounded substeps and regression coverage. Presentation must observe it without changing authority. |
| Input buffering and gamepad support | Functional but requiring extension | Reuse queueing; add attack-specific buffer/cancel policy and protection across hit stop, cinematics, and overlays. |
| Player locomotion | Fragile and requiring refactoring | Input velocity reaches full speed immediately; only idle/run states; no start, stop, pivot, acceleration, posture, stride, or history. Add a native locomotion controller and render pose parameters. |
| Player action animation | Fragile and requiring refactoring | One coarse animation record; action damage often resolves at action start. Replace with typed timelines and shared attack metadata. |
| Combat collision and damage functions | Functional but requiring extension | Arc/projectile/hazard logic is strong. Schedule activation from presentation events rather than duplicating timings. |
| Combo logic | Functional but requiring extension | Three-hit chain and generic queue exist. Add explicit phase/cancel/input-window profiles without changing current class behavior. |
| Dodge and i-frames | Functional but requiring extension | Mechanics exist. Bind i-frame and movement windows to the same dodge timeline and expose visual states. |
| Hit reactions / stagger / death | Fragile and requiring refactoring | Mechanical reactions exist but render variation is limited and selection lacks direction/weight/history. Add data-driven profiles and controlled impulses. |
| Ragdoll / IK / cloth / facial rigs | Blocked by absent assets | Flat sprites cannot support real bones, IK, cloth, visemes, or ragdolls. Implement honest procedural sprite substitutes and document production requirements. |
| Enemy roles and group AI | Functional and reusable | Strong gameplay intent already exists. Add presentation profiles, capped turn rates, anticipation holds, reaction history, and clearer recovery. |
| Enemy telegraphs | Functional but requiring extension | Cone/line/area warnings exist. Bind warning lifetime and impact to a common attack profile and validator. |
| Boss phases | Functional but requiring extension | Three-phase logic and events exist. Add a coordinated transition controller, temporary control rules, camera profiles, music states, and skip/load safeguards. |
| NPC/town simulation | Missing | Current world has landmarks/dialogue rather than scheduled NPC actors. Implement a lightweight ambient actor system and reserve authored NPC sprite production for later. |
| Environmental animation | Functional but requiring extension | Weather, lights, scenery and particles exist. Add context intensity, quality budgets, interaction impulses, and stronghold/world-state variants. |
| Destruction | Missing | No coherent destructible entity/profile pipeline. Add demonstration destructibles without changing navigation. |
| Camera presentation | Fragile and requiring refactoring | Direct shake/flash writes are scattered. Introduce camera and impact profiles with accessibility scaling. |
| Presentation events | Fragile and requiring refactoring | Generic listener map is stable but untyped and presentation semantics are scattered. Preserve legacy events through a dedicated bus/wrapper. |
| Audio SFX | Obsolete and safe to remove after compatibility migration | Twelve single oscillators cannot express surfaces, impacts, classes, bosses, or mixing. Keep `sound` event compatibility while routing into a layered synthesized sound engine. |
| Adaptive music | Missing | Implement complete state, threat, cue, stem, section, history, mix, transition, and stinger architecture. Generated procedural cues must remain labeled placeholders. |
| Dialogue/cinematic presentation | Functional but requiring extension | Modal narrative state is stable. Add explicit presentation overrides, ducking, transition restore, and idempotent one-shot handling. |
| UI presentation | Functional but requiring extension | Broad desktop UI exists. Add presentation settings, debug panel, cue/state readouts, and non-blocking reduced-motion behavior. |
| Save/load | Functional and reusable | Versioned normalization is mature. Persist only durable presentation preferences/history that affect repetition; rebuild transient state from context. |
| Asset loading/streaming | Fragile and requiring refactoring | Images are eager and music assets do not exist. Add resilient preload policies, fallbacks, and bounded caches. |
| Performance budgets | Functional but requiring extension | Particle/corpse caps and graphics presets exist. Add presentation LOD, voice caps, animation update budgets, debug counters, and timing metrics. |
| Validation/debugging | Missing | Add attack, event, animation-profile, cue, stem, fallback, and settings validators plus a release-gated debug overlay. |
| Windows packaging | Functional and reusable | Existing ASAR build is proven. Add presentation assets/data to package validation and exercise focus/background-audio behavior. |

## Confirmed architectural risks

1. `game.js` is 7,600+ lines and owns simulation, progression, world state, combat, rewards, and transient presentation. New presentation logic must live in focused modules and connect through events.
2. Damage and audiovisual feedback are not consistently driven from one timeline. A visual swing may lag or lead an immediate damage call.
3. Direct writes to `camera.shake`, `camera.flash`, `hitStop`, animation state, and sound IDs make accessibility scaling and priority resolution inconsistent.
4. Existing sound rate limiting is global, so a low-priority cue can suppress an unrelated important sound.
5. Music is entirely absent; no legal final-score assets are available. Runtime-generated music can demonstrate the system but remains placeholder content.
6. Current atlas sprites do not contain animation frames. Procedural transforms can improve motion language substantially, but final authored frame animation, facial performance, cloth, and true IK require new production assets.
7. There is no network layer. Multiplayer requirements are documented but cannot be validated or claimed.

## Performance budget for the overhaul

Budgets are targets for the existing Electron/Canvas2D architecture at 60 FPS, 1440×900, High preset:

| Budget | Target |
| --- | --- |
| Total simulation + presentation CPU | ≤ 5.0 ms average, ≤ 9.0 ms p95 in standard combat |
| Presentation director work | ≤ 0.6 ms average per frame |
| Renderer frame cost | ≤ 8.0 ms average in standard combat |
| Active full-detail actors | 24 near actors plus player |
| Mid-detail actors | 40 with reduced procedural layers |
| Offscreen animation | No render-pose evaluation |
| Particles | Existing hard cap 760; presets reduce emission rather than raising cap |
| Corpses | Existing hard cap 48; presentation tier may lower live detail |
| Audio voices | 32 SFX voices, 12 music/stem voices, 4 stinger/UI voices |
| Music memory | Procedural cue metadata only for demonstration; future streamed assets ≤ 96 MB region preload |
| Transition scheduling latency | Immediate safety events < 25 ms; musical transitions quantized to the next safe subdivision |

## Retention policy

Retain the simulation, Canvas renderer, entity data, event listener compatibility, UI architecture, save version 13 normalization, region art, player/enemy atlases, input layer, progression systems, enemy AI, and Windows shell. Add the presentation architecture beside them, migrate direct presentation calls incrementally, and preserve existing `sound`, `boss-phase`, `boss-defeated`, `player-dead`, `respawned`, `zone`, `overlay`, and campaign events as compatibility inputs.

## Asset blockers and honest substitutes

| Requested capability | Current blocker | Demonstration implementation | Final production need |
| --- | --- | --- | --- |
| Skeletal locomotion, foot IK, hand IK | No bones or animation clips | Procedural stride, squash, lean, foot-contact shadows, weapon-contact offsets | Rigged characters and authored clips |
| Directional hit/death sets | One painted image per silhouette | Directional tilt, recoil, squash, impulse, fade, history-based variants | Multi-frame reaction/death atlas or rigs |
| Ragdolls | No physics skeleton | Controlled authored-style corpse impulses and stabilization | Physics rigs and collision bodies |
| Facial/lip sync | No face rig or dialogue audio | Portrait/camera/body emphasis and timed restrained gesture state | Facial rig, visemes, performances and voice |
| Cloth/hair | Flat sprites | Low-amplitude secondary offset on silhouette accents | Separated cloth/hair layers or rigs |
| Final soundtrack | No music recordings or stems | Original procedural Web Audio score and fully data-driven cue architecture, clearly marked placeholder | 48 kHz/24-bit licensed original stems and final mixes |
| Recorded footsteps/impacts | No source recordings | Surface-aware synthesized layers with variation | Recorded/designed source library and mix pass |

## Implementation decision

Proceed with a modular native presentation layer:

1. A shared presentation context and event bus observing authoritative gameplay.
2. Serializable attack, animation, impact, camera, music, and region profiles.
3. Timeline-driven player/enemy actions so hit windows, VFX, audio, rumble, and camera impulses share event metadata.
4. Procedural sprite locomotion and reaction poses with class/weapon/enemy identity.
5. A persistent Web Audio score using synchronized procedural stems, hierarchical states, threat smoothing, quantized transitions, history, stingers, and mixer buses.
6. Boss transition orchestration, death/respawn restoration, dialogue/cinematic overrides, accessibility controls, debug telemetry, and validators.
7. Dedicated presentation regressions, stress tests, visual checks, and Windows package inspection.

