# Requiem 3.0.0 release checklist

## Automated gates

- JavaScript syntax: Requiem data, presentation data, engine, renderer, and UI.
- Data integrity: class, enemy, world, item, campaign, operation, presentation, and route references.
- Requiem regression: formations, local awareness, room lifecycle, mechanics, tutorial, difficulty, artwork policy, rendering topology, UI hooks, and migration.
- Historical regressions: 24 pre-Requiem gameplay, campaign, progression, loot, UI, contracts, systemic, music, presentation, and stress suites.
- Production bundle: Vite module transform and hashed asset build.
- Windows package: repacked Electron x64 runtime with the version-3.0 production `dist`, desktop bridge, and package manifest inside `resources/app.asar`.

## Visual and asset checks

- Enemy atlas inspected at original resolution: 16 alpha-cut dark-fantasy creature silhouettes; no geometric tokens.
- Character atlas inspected at original resolution: nine alpha-cut armored, occult, ranged, and caster silhouettes used by all six classes.
- Renderer source prohibits enemy and player geometry fallback.
- UI DOM regressions cover title hierarchy, Roadcraft, encounter HUD, mechanic readout, route dot, Atlas battlefield counts, Settings difficulty, keyboard/mouse/gamepad prompt switching, focus, overlays, and responsive controls.
- A production Electron screenshot pass is scripted in `scripts/visual-capture.cjs`, including `requiem-battlefield.png`. It requires a Linux Electron runtime; the release package itself contains the Windows x64 runtime.

## Performance policy

- Active simulation remains bounded by authored routes and the existing population ceiling.
- Renderer culls actors, projectiles, effects, and particles outside the camera margin.
- Presentation stress validation continues to cover 241 actors, LOD classification, animation evaluation, audio voice release, and heap stability.
- The production JavaScript bundle is large because the game is content-dense; Vite reports a chunk-size advisory, not a build failure.

## Acceptance criteria

- Starting a run never substitutes circles or rectangles for hero/enemy artwork.
- A new player sees an explicit tutorial, next route, class mechanic, and objective.
- Entering one room does not wake another.
- A click commits one attack rather than starting held auto-fire.
- Telegraphed melee and boss attacks remain avoidable after commitment.
- Clearing a room produces a visible completion beat, reward, persistent history, world progress, and then returns to exploration.
- Existing version-13 covenants continue successfully and resave as version 14.
- The complete test command and production build finish with exit code zero before packaging.
