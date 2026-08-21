# Ashen Covenant: Requiem 3.0.0

## Release intent

Requiem is the answer to two concrete failures in the previous build: enemies could still be perceived as prototype shapes, and the world loop still read as a passive horde-survival game. Version 3.0 keeps the proven dual-oath campaign, build, loot, operations, and save systems, but replaces the moment-to-moment topology with a deliberate desktop action-RPG road.

The governing loop is:

1. Prepare in Ashen Sanctuary.
2. Follow the marked road to an authored battlefield.
3. Read the formation and choose a priority target.
4. Commit attacks, react to locked telegraphs, and spend the class mechanic.
5. Defeat a regional guard or campaign boss.
6. Claim a bounded reward, lower regional corruption, and return to progression systems.

No automatic attack loop, screen-wide enemy activation, endless local spawn stream, or geometric actor fallback is part of this release.

## What changed

### World and encounters

- Five hostile regions now own three persistent battlefields apiece: an opening lesson, a target-priority test, and a capstone formation.
- The 15 rooms contain four or five authored roles, one group identity, explicit tier, tactical hint, bounded arena, deterministic completion reward, and persistent clear/death history.
- Only the attacked or approached formation engages. Other rooms stay dormant and cannot chain-alert into the fight.
- A cleared room releases after its completion beat. Regional repopulation waits 90 seconds and restores the authored route only when that road is nearly empty.
- The minimap and Atlas mark the next least-cleared route, and live arena dressing makes battlefield boundaries legible without enclosing the open world.

### Combat and class identity

- Warden builds **Judgment** and spends it on an exposing combo sentence.
- Thornseer builds **Blight** and spends it to erupt active curses.
- Ironbound builds **Resolve** through received and barrier-absorbed damage, then retaliates with an armor-breaking shockwave.
- Veilrunner builds **Momentum** through motion, dodging, and alternating attacks, then crosses through the target on a critical finisher.
- Gravebinder gathers **Remains** from marked or cursed kills, then releases a funerary procession.
- Dawnstrider builds **Radiance** and spends it to consecrate ground and recover health.
- Existing primary, secondary, Hybrid, Confluence, imprint, mastery, mutation, relic, and Fated-affix systems continue to combine with those mechanics.
- Contextual click targeting remains one click → approach → one committed strike. Keyboard and controller inputs remain direct actions. Enemy attacks retain the direction or impact point shown during wind-up.

### Creatures and rendering

- The packaged 4×4 dark-fantasy enemy atlas remains mandatory and covers the complete bestiary through 16 painted silhouettes. The hero atlas remains mandatory for all six playable classes.
- Enemy and hero renderers both fail closed when their required art is unavailable. The former circle/rectangle prototype substitutions are absent.
- Hero, enemies, corpses, destructibles, and loot now share one Y-sorted isometric actor queue. A character behind another character can no longer draw over it merely because of entity type.
- Viewport culling now applies to actors, projectiles, effects, and particles. Painted terrain, alpha-cut props, weather, dynamic lights, telegraphs, hit reactions, and action gestures remain live.
- Ground-click and selected-target markers make input ownership visible in the world.

### Interface and onboarding

- The title screen identifies the release as **Requiem 3.0** and describes the deliberate dual-oath game.
- Roadcraft teaches movement, targeting, three committed attacks, dodging, both primary skills, Companion Technique, Hybrid Signature, and loot collection.
- The combat HUD exposes the primary class mechanic, charge, ready state, encounter name, tier, tactical hint, remaining enemies, and completion state.
- The Atlas reports battlefield completion by region. The minimap marks the next route separately from the player and live world event.
- Adventurer, Veteran, and Penitent road profiles can be changed from Settings. They alter new enemy health, damage, and room rewards; Veteran is the intended balance.
- Existing UI scale, HUD modes, contrast, minimap, hint, motion, flash, VFX, impact, camera, input, audio, and controller settings remain intact.

### Progression, loot, quests, and endgame

- Battlefield clears grant level-scaled experience, gold, and guaranteed Rare or Relic rewards at higher tiers.
- Clears count as regional event progress for compatible Journey and contract objectives and lower persistent regional corruption.
- Room clear totals, best streak, and room-specific deaths are saved and available to future balancing passes.
- The existing five-chapter campaign, 100-level Journey, Paragon Atlas, Chronicle, crafting, item comparison, Fated affixes, contract ledger, factions, delves, eight operations, expedition junctions, and pinnacle encounters remain functional and regression-covered.
- Endgame still uses bounded operation room plans rather than continuous ambient spawning; expedition route choices continue to interrupt and reshape longer runs.

### Audio and feedback

- Dedicated encounter-start and encounter-clear stingers were added to the adaptive score data.
- Existing class impacts, enemy warnings, boss phase cues, loot stingers, dynamic threat music, camera response, controller feedback, and accessibility scaling remain routed through the presentation system.

## Save migration

Requiem uses snapshot version 14. Version-13 and older loadable covenants receive conservative defaults:

- Veteran road difficulty.
- Roadcraft enabled at step one.
- Empty class-mechanic charge.
- Empty room history, streak, and death records.

All existing classes, levels, equipment, inventory, stash, loadouts, runes, aspects, collection records, crafting state, campaign choices, contracts, factions, world progress, Journey, Paragon, Chronicle, nemeses, and endgame records continue through the existing defensive normalization path.

## Release evidence

The permanent `scripts/requiem-overhaul.mjs` gate verifies:

- six class mechanics and three difficulty profiles;
- 15 unique rooms, three per hostile region, with valid 41-entry bestiary references;
- four-to-five-enemy formation bounds and one group per room;
- dormant start, local group alert, and cross-room isolation;
- room reward, history, corruption/event integration, and return to exploration;
- mechanic charge and expenditure;
- complete Roadcraft progression;
- material Penitent health/damage pressure;
- shared actor depth sorting, viewport culling, move marker, and visible arenas;
- mandatory/fail-closed hero and enemy artwork;
- encounter, mechanic, tutorial, route, Atlas, and difficulty UI hooks;
- version-13 → version-14 save migration.

It runs inside the full historical suite covering campaign, combat, progression, Journey, Paragon, loot, Masterworking, inventory, input, UI, contracts, systemic Chronicle, presentation, adaptive music, migration, adversarial state, and performance.

## Honest production boundary

Requiem is a complete playable systems-and-content overhaul, not a claim that this custom Canvas2D project now has the production budget, skeletal animation library, cinematic pipeline, networking, or asset volume of a large commercial studio game. Its deliberate controls, authored formations, class mechanics, progression loop, painted actors, telegraph rules, and Windows packaging are implemented and testable. The current score remains original procedural material, and the current actors remain painted atlas animation rather than skeletal rigs.
