# Eight-frame combat VFX revamp — 4.2.0

## Deliverable

Combat visuals now use three generated transparent sprite sheets rather than a
single procedural flash:

- `attack-vfx-martial-v6.png`: Warden, Ironbound, and Veilrunner attack lanes.
- `attack-vfx-sorcery-v6.png`: Thornseer, Gravebinder, and Dawnstrider spell lanes.
- `attack-vfx-enemy-v6.png`: melee/shield, ranged/assassin, brute/burrower, and ritual enemy lanes.

Every lane has eight sequential frames. No supported player combat action or
enemy role is allowed to resolve without a corresponding eight-frame sequence.

## Runtime contract

- The action timeline owns duration and hit timing; VFX never changes damage,
  collision, cancellation, or input buffering.
- The game emits one `action-sequence` effect at player-action start and enemy
  wind-up start, then the renderer selects a frame from 0 through 7 using the
  action's real elapsed progress.
- Effects retain the combatant's grounded facing/elevation, so artwork overlays
  the existing 2.5D stance rather than rotating a character body freely.
- Sprite sheets are alpha-composited with screen blending and fail closed if an
  expected art asset cannot load.

## Verification

`scripts/spell-attack-animation.mjs` checks the three generated RGBA assets,
the eight-frame minimum for all six class action families and every enemy role,
live player effect spawning, enemy wind-up spawning, and renderer asset wiring.
The file-protocol smoke test also verifies the packaged Electron build decodes
all three sheets from `dist/assets/`.
