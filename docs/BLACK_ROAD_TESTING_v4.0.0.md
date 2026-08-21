# The Black Road 4.0.0 release checklist

## Automated release gate

The release runs 27 JavaScript suites covering data, simulation, save migration, campaign, progression, loot, class mechanics, UI, contracts, systemic systems, presentation, music, stress budgets, and Windows-style asset paths.

The dedicated `scripts/black-road-overhaul.mjs` test validates:

- five unique regional expeditions and 20 unique stage IDs;
- two real 1280 × 1280 RGBA creature atlases larger than 1 MB each;
- an empty new-game road with no pre-spawned survival population;
- launch of an authored expedition and its first formation;
- player clamping inside a sealed room;
- a three-vessel ritual objective and material ward reduction;
- a midpoint route choice with at least three options;
- a named lieutenant with a target reward;
- a dedicated expedition boss;
- phase-two and phase-three transitions;
- shrinking boss-arena radius and four final-phase collapse hazards;
- all four stage records, final clear, boss record, and completion HUD state;
- explicit return to Sanctuary with the route record preserved.

The companion `scripts/black-road-ui.mjs` test mounts the real interface, verifies five route cards and all 20 stage entries, checks level locks, launches the Funeral Road through the Atlas, follows every HUD state, selects the midpoint route, verifies the boss frame and completion state, and uses the visible return control.

## Required commands

```bash
npm test
npm run build
npm run test:file-protocol
```

The source-release gate also performs JavaScript syntax checks on the game engine, renderer, UI, and Black Road data; validates all required runtime assets; scans for obsolete enemy-atlas references; and verifies archive contents and SHA-256 checksums.

## Visual acceptance

- Title screen names **The Black Road · v4.0** and communicates the four-room dungeon loop.
- Atlas shows five expedition cards, ordered stage lists, lock states, records, and launch controls without horizontal overflow at desktop and compact widths.
- Sanctuary contains no hostile population after a new run or explicit return.
- The first launched room displays a sealed boundary, four distinct painted enemies, a target ring, encounter objective, and room counter.
- Ritual rooms show three attackable vessels and update the remaining-ward count.
- Common, elite, lieutenant, boss, and corpse rendering use the correct v4 atlas without geometric substitutions.
- Boss phases visibly contract the arena while respecting HUD, telegraph, camera, and effects-reduction settings.
- Completion exposes the reward summary and explicit Sanctuary return.

## Save acceptance

- A fresh covenant saves as snapshot version 18.
- A valid version-14 Requiem covenant migrates to version 18.
- Difficulty and all earlier Requiem history remain intact.
- Black Road records initialize for all five routes.
- Saving and continuing after a complete expedition retains its clear, best time, Heat, boss, and stage totals.
- Malformed optional records normalize without overwriting an unplayable save.

## Windows acceptance

- The application loads from `file://` inside Electron.
- Both v4 creature atlases resolve from `resources/app.asar/dist/assets/` and decode at full resolution.
- All required art reports ready with zero failed assets.
- A new run starts, launches the Funeral Road, renders its complete four-enemy formation, and resolves a combat target.
- The packaged x64 folder launches through `Ashen Covenant.exe` with its adjacent `resources` directory.
