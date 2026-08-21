# Ashen Covenant: The Black Road v5.0.0 — Production Overhaul

## Scope

Version 5.0.0 is a presentation, combat-feel, world-physicality, camera, audio, and UI overhaul built on the v4.2.0 gameplay/progression stack. Existing campaign, dual-oath, Journey, Paragon, loot, Masterwork, contracts, factions, Black Road, Requiem, and save-schema systems are retained.

## Implemented

### Character and combat animation
- Added per-class v7 hero motion atlases for Ironbound, Thornseer, Warden, Veilrunner, Gravebinder, and Dawnstrider.
- Hero presentation now resolves eight visual facings from the existing 45-degree facing model.
- Added ten presentation states with eight temporal frames per state: idle, locomotion, three attack stages, cast, dodge, hit, death, and ultimate presentation.
- Added v7 enemy motion sheets with eight-frame temporal animation for combat states.
- Added action-specific player VFX lanes for basic combo stages, execution, both skills, companion, hybrid, and ultimate actions.
- Added role-specific enemy VFX lanes.
- Preserved combat startup/active/recovery timing and connected rendered action progression to those windows.
- Added root-motion attack stepping and bounded motion correction through world geometry.
- Fixed a latent attack-alignment bug where correctionAngle could be referenced before definition.
- Existing hit-stop, shake, animation-event, and rumble systems remain active.

### Physical world and authored encounter geometry
- Added WorldGeometrySystem and per-region geometry data.
- Added solid obstacle collision and sliding resolution.
- Added geometry-aware steering for enemy movement.
- Added terrain material sampling, ramps/stairs, elevation offsets, occluders, and encounter threshold ramps.
- Added stage-dependent Black Road obstacle patterns for formation, ritual, lieutenant, and boss encounters.
- Replaced purely rectangular stage containment with stage-specific polygonal arena constraints where applicable.
- Added obstacle drawing into the renderer depth queue and player-aware foreground occlusion fading.
- Ground elevation now participates in actor placement and corpse rendering.

### Enemy choreography
- Added combat-slot assignment for melee pressure rings.
- Updated melee, shield, brute, assassin, burrower, and boss movement to use role-aware positioning and geometry-aware steering.
- Reduced direct swarm convergence by using active/reserve positioning around the player.

### Boss presentation
- Added boss intro timing and screen presentation.
- Preserved multi-phase boss logic and connected phase/boss presentation to camera and impact systems.
- Boss combat uses tighter camera dead zones and midpoint framing behavior.

### Camera
- Added movement and aim look-ahead.
- Added contextual dead zones per camera profile.
- Added boss/player midpoint blending.
- Preserved contextual zoom, combat/elite/boss profiles, shake, and impact response.

### Audio
- Added a 29-file WAV sample bank covering weapon attacks, projectiles, abilities, impacts, bosses, destruction, and terrain-specific footsteps.
- AudioDirector now attempts decoded sample playback through the existing priority/bus/pan/pitch/voice architecture.
- Procedural WebAudio synthesis remains as a graceful offline fallback when a sample is missing or cannot decode.
- Footsteps select material-specific samples from world geometry.
- Existing adaptive music state architecture remains intact.

### Visual integration and feedback
- Added persistent ground decals after kills.
- Grounded corpse placement uses terrain elevation.
- Upgraded projectile trails.
- Added screen-space ultimate feedback.
- Added rarity-driven equipment presentation halo as an equipment-visual scaffold.
- Added geometry props to scene depth ordering and foreground fade behavior.

### HUD, accessibility, and controller feedback
- Added an optional Auto-focus HUD during combat setting, enabled by default for new settings.
- Combat focus reduces low-priority HUD opacity while preserving vitals, abilities, objectives, boss/target state, and encounter information.
- Setting persists through the existing save/settings path.
- Reduced-motion behavior covers new combat-focus transitions.
- Existing high-contrast, reduced-flashing, reduced-VFX, damage-number, input, and rumble systems are retained.

## Validation

### Passed dependency-free regression gates
- v5 production overhaul gate
- core verification
- action-RPG overhaul
- Requiem overhaul
- Black Road full-route simulation
- game smoke
- campaign smoke
- progression dynamics
- leveling/Journey
- systems depth
- loot expansion
- Masterwork/classes
- regression audit
- deep regression
- Worldfall expansion
- contracts overhaul
- systemic overhaul
- presentation overhaul
- adaptive music
- 2.5D revamp
- spell/attack animation
- presentation performance

Final presentation stress sample:
- stress actors: 241
- active animators: 178
- pose evaluations: 139
- presentation average: ~0.060 ms
- presentation p95: ~0.161 ms
- presentation max: ~3.068 ms
- audio p95: ~0.0067 ms
- sampled heap growth: ~0.30 MB
- streaming underruns: 0
- retained music voices after release: 0

### Environment-limited checks
The extracted v4.2 source did not include installed npm dependencies. The sandbox could not restore `jsdom`, Vite, or electron-builder from the npm registry/cache, so JSDOM-dependent UI suites and a fresh Vite/electron-builder package could not be executed here. The source changes were syntax-checked and all dependency-free gameplay/presentation suites above passed.

The Windows deliverable therefore uses the previously verified Electron 43.1.1 x64 shell from v4.2.0 with the v5 application installed as an unpacked `resources/app` payload. The desktop bootstrap registers a local secure `ashen://` scheme and serves the v5 ES-module payload without disabling browser security. The Windows GUI itself cannot be launched in this Linux sandbox, so final runtime verification should be performed by opening `Ashen Covenant.exe` on Windows.

## Authored-asset limitations
A complete studio art/audio production was not available in the supplied source, so the following are implemented as production-ready systems using derived/generated assets rather than hand-authored AAA source material:
- Hero body animation frames are derived from the existing painted class art using pose, displacement, squash/stretch, and timing transforms; they are not newly hand-drawn skeletal/per-limb frames.
- Enemy v7 animation frames are derived from the existing enemy artwork and motion states.
- Player/enemy v7 VFX lanes are action-specific and temporally distinct, but derive visual material from the existing effect library.
- The WAV bank is locally generated/processed impact and movement material rather than studio-recorded Foley or orchestral stems.
- Equipment visuals currently use rarity-driven presentation; unique per-item armor/weapon sprite swaps require authored equipment sprite sets that were not present in v4.2.

The runtime/data architecture now supports replacing these derived assets with hand-authored equivalents without redesigning the combat, renderer, audio, camera, or geometry systems.

## Running

### Windows package
Extract the Windows x64 archive and launch `Ashen Covenant.exe`.

### Source development
With npm dependencies available:
1. `npm install`
2. `npm test`
3. `npm run build`
4. `npm run desktop:win`

The source archive contains the v5 source, generated v7 assets, audio bank, regression tests, and desktop bootstrap.
