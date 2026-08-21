# Ashen Covenant v2.3.0 — Deliberate Combat Release

## Release outcome

Version 2.3.0 replaces the screen-wide auto-combat feel with a contextual desktop action-RPG loop while preserving all v2.2.0 content, progression, interface systems, and save snapshot version 13.

## Controls

| Input | Result |
| --- | --- |
| Left-click ground | Move to the chosen world position and clear the current target. |
| Left-click creature | Select it, alert its local pack, approach to weapon range, and commit one basic attack. |
| Right-click or `Q` | Use the primary class skill. |
| `WASD` | Direct movement; cancels a pending click-to-move command. |
| `Space` | Directional dodge with invulnerability; cancels a pending movement command. |
| `E`, `C`, `F`, `R`, `G`, `X` | Second skill, Companion Technique, hybrid signature, ultimate, flask, and interact/execute. |

## Creature rendering correction

Vite copies `public/assets` beside the bundled `dist/index.html`. Root-absolute `/assets/...` references worked on the development server but resolved to the Windows drive root when Electron loaded the game with `file://`. The live renderer then hid the failure behind a circle fallback.

All Canvas and CSS art now resolves from the application document. The live enemy renderer has no geometric body fallback. Required player, creature, prop, item, and terrain assets are tracked, and gameplay remains gated until every required image is loaded successfully.

## Combat changes

- World packs begin dormant and only activate through awareness, group alert, direct targeting, or player damage.
- Packs return to their authored territory and recover if the player disengages beyond their leash.
- Only active groups enter coordination, flanking, morale, and attacker-cap logic.
- Player and engaged enemies apply body separation, restoring melee spacing.
- Normal world replenishment checks every 45 seconds and only replaces a nearly cleared local population; the global population remains capped.
- Melee, ranged, disruptor, assassin, burrower, and boss actions resolve from their committed wind-up geometry.
- Boss hazards and projectile fans use the warned location and direction rather than the player's later position.
- The HUD exposes the selected creature's name, rank, affix, health, engagement state, and stagger progress.

## Compatibility and verification

Save snapshot version 13 is unchanged. The release test chain includes `scripts/action-rpg-overhaul.mjs`, which verifies packaged Windows-style path resolution, required creature artwork, fail-closed rendering, encounter bounds, dormant and group-alert behavior, contextual targeting, ground movement, dodgeable melee contact, and locked boss aim. The existing gameplay, campaign, progression, loot, UI, contracts, systemic, presentation, music, performance, migration, and adversarial suites remain in the same release gate.
