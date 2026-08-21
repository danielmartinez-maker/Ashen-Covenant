# Ashen Covenant: The Black Road 4.0.0 — Release report

## Outcome

The game’s repeatable combat layer has been rebuilt around five selected dungeon expeditions and 20 sealed encounters. The prior timer-driven regional population is disabled. A new covenant begins in a clear Sanctuary, launches one route through the Atlas, fights one authored room at a time, chooses a midpoint boon, defeats a lieutenant and multi-phase boss, records the result, and explicitly returns to Sanctuary.

The creature presentation has also been replaced. Two new transparent 4 × 4 atlases provide 32 painted common, regional, elite, lieutenant, and boss creatures. All 41 enemy template IDs map to those atlases. The obsolete v2 enemy atlas is removed from source and packaged output. Enemy and corpse renderers fail closed if required creature art is unavailable.

## Implemented systems

- Five expeditions: Funeral Road, Bloodroot Descent, Iron Siege, Mirror Pilgrimage, and Last Bell.
- Four authored room types per route: formation, ritual objective, lieutenant, and boss.
- Sealed player and enemy arena boundaries with visible region-colored presentation.
- Three destructible painted ritual shrines that grant 88% damage reduction to their formation while alive.
- One midpoint branch per run, integrated with existing boons, banes, Heat, rewards, mastery, and keys.
- Scaled named lieutenants and guaranteed target rewards.
- Three boss phases with intermissions, bounded reinforcements, arena contraction, and four final-phase collapse hazards.
- Deterministic room XP, gold, controlled recovery, graded final loot, and existing progression integration.
- New Atlas route cards, stage lists, level gates, records, launch states, active state, completion state, and replay state.
- New encounter HUD states for room number, room type, exact objective, enemies, remaining ritual wards, clear transition, final completion, and Sanctuary return.
- Save snapshot version 18 with conservative Black Road migration and per-route records.

## Verification result

All 27 automated suites pass. Coverage includes:

- Black Road data, full four-room simulation, arena constraints, ward behavior, route choice, lieutenant, boss phases, rewards, records, and return;
- full Black Road JSDOM interface traversal through the actual Atlas, HUD, branch overlay, boss frame, completion state, and return control;
- package-relative Windows `file://` asset resolution;
- every historical campaign, class, skill, Journey, Paragon, loot, Masterwork, save, contract, faction, systemic, UI, input, music, presentation, and performance regression;
- 241-actor presentation stress with no streaming underruns or retained music voices;
- production build completion through Vite 7.3.6;
- JavaScript syntax checks for the engine, renderer, UI, data, and new tests;
- ASAR manifest verification, correct version-4 package metadata, both v4 creature atlases present, and the obsolete v2 atlas absent.

The rendered Canvas QA pass uses the same renderer and production assets. It verifies common creatures, elites, a boss phase, the sealed first room, and the painted three-shrine ritual room at 1500 × 940. A Linux Electron process could be installed and version-checked as 43.1.1, but this execution sandbox blocks the D-Bus socket required to create a Chromium window. The runtime screenshot path therefore exits before application load. Equivalent file-path behavior is covered by the package-relative resolver regression and direct inspection of the final Windows ASAR. The Windows deliverable reuses the previously verified Electron 43.1.1 x64 shell and replaces its ASAR with the newly built v4 application.

## Performance gate

The final stress run processed 241 actors, including 178 active animators and 139 pose evaluations. Presentation averaged approximately 0.08 ms per sampled update at the release gate, with a 95th percentile below 0.19 ms and a maximum below 3.2 ms. Audio scheduling averaged below 0.01 ms at the 95th percentile. Heap growth remained below 0.5 MB during the sampled stress pass.

## Deliverables

- Full v4 source and built web assets.
- Launch-ready Windows x64 folder with `Ashen Covenant.exe` and adjacent `resources`.
- This release report.
- SHA-256 checksum manifest.

## Compatibility

Existing valid covenants remain loadable. Version-14 Requiem state migrates to snapshot version 18 while retaining difficulty, tutorial and class-mechanic state, class pair, equipment, inventory, stash, skills, campaign choices, Journey, Paragon, contracts, factions, world state, and prior endgame history. New Black Road fields initialize safely and persist after the next save.
