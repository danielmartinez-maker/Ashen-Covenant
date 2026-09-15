# Ashen Covenant v7.0.0 Release Report

## Scope

Embodied Covenant presentation release: player body animation, visible equipment identity, semantic combat audio, and unified presentation orchestration.

## Compatibility

- Save schema: 19 (unchanged)
- v6 migration matrix: PASS
- v7 load/save/reload continuity: PASS
- Presentation caches persisted: no

## Assets

- Required hero motion sheets: 6
- Equipment appearance atlases: 2
- Required semantic audio definitions: 42
- v7 generated WAV assets: 53
- Electron file:// smoke: PASS

## Performance

- Stress actors: 240
- Legacy presentation p95: 0.120269 ms
- v7 presentation p95: 0.137664 ms
- p95 regression: 14.46%
- Appearance cache: 4739 hits / 1 miss
- Heap delta: 0.320 MB

## Certification

- npm run test:v7:animation: PASS
- npm run test:v7:equipment: PASS
- npm run test:v7:audio: PASS
- v7 embodied combat: PASS
- v7 architecture/compatibility: PASS
- v7 performance: PASS
- npm run test:v6: PASS
- npm run test:file-protocol: PASS
- npm run test:v7: PASS
