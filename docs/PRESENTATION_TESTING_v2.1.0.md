# Presentation Testing and Debugging

## Release commands

```bash
npm test
npm run build
npm audit --omit=optional
npm run desktop:win
```

Focused commands:

```bash
npm run test:presentation
npm run test:presentation:performance
```

`npm test` contains the complete historical game suite plus presentation data/runtime, adaptive music, settings/debug UI, and 241-actor stress coverage.

## Automated coverage

- Six distinct class/weapon profiles and 18 ordered attack timelines.
- Ten shared action profiles; skills spend resources and create effects only at `ResolveAction`.
- Combo input buffering, authored cancels, dodge immunity alignment, hit-stop timeline safety, and bounded motion alignment.
- Start/stop/pivot and frame-rate-independent acceleration/deceleration.
- Surface/foot contact events, directional hit reactions, enemy role telegraphs, boss transition hold, boss stagger, death, corpse profile, destruction, loot spawn, ambient/reclaimed NPCs, and cinematic skip events.
- Thirty-five cue selection paths, 182 stems, beat/bar quantization, threat clamps, history, silence, stinger cooldown/priority, boss defeat silence, and death-to-current-boss restoration without reveal replay.
- Settings persistence, 14 audio buses, F3 release gating, all debug controls, responsive overlay structure, and safe close behavior.
- Every prior campaign, save migration, 1–100 Journey, Paragon, loot, Masterwork, class, Fated affix, Contracts, Chronicle, world, endgame, and systemic-overhaul regression.

## Debug panel

Enable **Presentation Debug** in Pause settings and press `F3`. Release builds reject F3 until this setting is explicitly enabled. The panel shows:

- movement/action profile, phase/time, buffer, weapon and motion policy;
- enemies/elites/boss, phase/stagger, threat and intensity band;
- music state, cue, section, active stems, transition, SFX/music voices and asset status;
- camera/impact profiles, animation LOD counts, pose evaluations, destructibles, particles, projectiles and presentation CPU;
- recent typed events and listener/runtime errors.

Controls trigger three impact weights, reward/boss stingers, the nearest enemy attack, boss phase advance, one 30 Hz frame step, music-intensity override, and JSON log export. Close with F3, Escape, backdrop, or the close button.

## Rendered QA

Electron capture is attempted against the production `dist` bundle. In the build container, Chromium currently exits before window creation because D-Bus socket access is denied. That is an environment restriction, not an application exception. A headless Canvas2D capture therefore runs the real renderer and real painted atlases through `@napi-rs/canvas` in a temporary QA runtime.

The 1500×940 capture set checks:

- dense Redfen encounter composition and painted terrain;
- ranged line and brute area telegraphs against props and enemies;
- class/weapon contact frame and arc readability;
- elite/health/icon hierarchy and high-tier loot reveal;
- boss phase label, transition rings, player separation and camera framing.

The committed project has no QA-only canvas dependency. `scripts/headless-presentation-capture.mjs` accepts `CANVAS_RUNTIME` and writes only to the chosen output directory.

## Measured stress result

The release stress fixture uses 240 enemies plus the hero over 900 presentation frames and 1,200 adaptive-music frames. On the build container:

| Metric | Result |
|---|---:|
| Presentation average | 0.140 ms |
| Presentation p95 | 0.452 ms |
| Presentation maximum | 6.040 ms |
| Adaptive-music average | 0.009 ms |
| Adaptive-music p95 | 0.019 ms |
| Adaptive-music maximum | 1.455 ms |
| Heap retained after GC | 0.42 MB |
| Stress actors | 241 |
| Active animators | 178 |
| Pose evaluations | 139 |
| LOD hero / near / mid / far / offscreen | 1 / 48 / 48 / 81 / 63 |
| Peak procedural music voices | 16 |
| Voices after release | 0 |
| Streaming underruns | 0 |
| Skeletal bones / ragdolls / cloth | 0 / 0 / 0 |

These are deterministic Node/fake-Web-Audio subsystem timings, not a claim about every player's total frame rate. GPU cost and real audio-device latency require Windows hardware profiling.

## Manual test scenarios

Run locomotion at 20/30/60/120 FPS; reverse direction; move on every region plate; enter/leave combat; use all six classes and every action; buffer and cancel at window boundaries; attack at max warp range and near world bounds; pause during anticipation, active frames, hit stop, boss phases and death; force every telegraph; stagger each boss; die/revive/reload in phases two and three; skip every campaign dialogue; spawn repeated relic/unique/mythic drops; liberate and revisit strongholds; change regions/weather/menu state rapidly; toggle every accessibility/audio setting; alt-tab; and change the default Windows output device.

## Common failure triage

- **Damage before contact:** inspect the current profile and `ResolveAction`/`EnableHitbox` event; remove any immediate gameplay call.
- **Stuck action:** inspect timeline duration, hit stop, invalid deferred inputs, and missing end event.
- **Music restarts:** inspect context signature, desired cue, history, and pending quantized transition; do not recreate `AudioDirector` per scene.
- **Wrong boss music after revive:** verify the live boss ID/phase and retained `revealedBossId`.
- **Duplicate stinger:** inspect per-ID cooldown and duplicate legacy/typed listeners.
- **Permanent duck:** inspect `music:duck`, cinematic end/skip, and the independent `musicDuck` node.
- **Visual pop:** inspect camera/LOD blend and ensure Canvas dimensions did not reset smoothing state.
- **Missing asset:** follow validated fallbacks and keep gameplay running; log the missing stable ID.

## Packaged-build checks

Inspect the final Windows folder for one intended launcher, `resources/app.asar`, all six terrain plates and four required atlases, version 2.1.0 metadata, relative paths, and no editor-only source dependency. Validate the PE as 64-bit Windows GUI, test the ZIP, compute SHA-256, and launch on Windows. Linux can build and inspect the Windows artifact but cannot honestly confirm Windows audio-device behavior without a Windows runner.
