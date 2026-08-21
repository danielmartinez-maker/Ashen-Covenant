# Ashen Covenant: The Black Road 4.0.0

## Release intent

Version 4.0 rebuilds the repeatable combat loop around deliberate dungeon runs. The previous Requiem release reduced horde behavior, but its pre-populated regional battlefields could still read as a survival game and its shared creature atlas did not give every enemy enough authored visual identity. The Black Road removes those two failure modes at the simulation, content, renderer, interface, save, and release-test layers.

## New core loop

1. Prepare in Sanctuary without an ambient enemy population.
2. Open the Atlas and choose one of five level-gated expeditions.
3. Enter one sealed room containing one coordinated encounter.
4. Clear its enemies and authored objective before the boundary opens.
5. Recover a controlled amount of health and class resource.
6. Choose a route boon at the midpoint junction.
7. Defeat the lieutenant and multi-phase boss.
8. Claim a graded reward, update the route record, and explicitly return to Sanctuary.

The population director no longer creates replacement regional packs. Starting or transitioning an activity clears transient projectiles, hazards, effects, corpses, and prior objective vessels. Only the active Black Road formation exists.

## Expedition structure

| Expedition | Region | Rooms | Final boss |
|---|---|---:|---|
| The Funeral Road | Gravewake | Procession Gate → Three Censers → Gallows Verge → Walking Crypt | Sile, the Cryptwarden |
| Bloodroot Descent | Redfen | Bloodreed Crossing → Drowned Baptism → Court of Roots → Rootmother’s Heart | Avarra, the Blood Matron |
| The Iron Siege | Cairnreach | Broken Breach → Chainworks Furnaces → Walking Ossuary → Crownless Throne | Odran, the Chain Regent |
| Mirror Pilgrimage | Veiled Road | Mirror Verge → Lost Courier → Riftmother’s Court → Fifth Reflection | Noxara, Veiled Oracle |
| The Last Bell | Bellscar | Lower Gate → Choir Without Breath → Final Ascent → Chamber Beneath Sound | Silence Incarnate |

Every route follows a readable escalation:

- **Formation:** positional target-priority test with four coordinated enemies.
- **Ritual:** three destructible vessels ward the room’s enemies with 88% damage reduction until destroyed.
- **Lieutenant:** a named, scaled elite with an authored escort and guaranteed target reward.
- **Boss:** a scaled regional boss plus a bounded escort in a larger sealed arena.

The midpoint junction offers at least three boons. The chosen boon and attached bane feed the existing expedition Heat, reward, mastery, and key systems without creating another unrelated progression track.

## Combat and boss behavior

- Arena collision clamps the player and active formation inside the visible sealed boundary. Outward movement commands are cancelled at the seal.
- All room enemies begin engaged as a coordinated local formation; there is no screen-wide wake-up or timed replacement wave.
- Telegraph direction and impact positions remain locked at commitment, preserving dodgeable action-RPG combat.
- Phase two and phase three create explicit boss intermissions, shrink the room boundary, and add only two then one regional reinforcements.
- Phase three places four collapse hazards around the boss. Existing projectile, hazard, attacker, minion, particle, and presentation budgets remain enforced.
- Each room awards deterministic XP and gold plus limited recovery. Completion awards a graded boss-source item and feeds existing leveling, contracts, faction, operation, and expedition systems.

## Creature art and rendering

The renderer now requires two new 1280 × 1280 transparent RGBA atlases:

- `enemy-atlas-v4.png`: 16 common and regional creature paintings.
- `enemy-elite-atlas-v4.png`: 16 elite, lieutenant, and boss paintings.

All 41 current enemy template IDs map to an explicit atlas and cell. Live enemies and corpses use the same mapping, with larger normal, elite, and boss footprints for silhouette readability. Required-art readiness checks include both atlases. If either atlas is missing, the renderer fails closed; it does not construct a geometric body, circle, or polygon fallback. The obsolete v2 enemy atlas is no longer packaged.

The sealed arena is drawn beneath the actor queue with a region-colored boundary, four anchoring pillars, an animated seal, and stage identity. Existing depth sorting, viewport culling, target rings, telegraphs, hit reactions, role markers for elites and bosses, and accessibility effects remain intact.

## Interface

The Atlas is now a Black Road command board rather than a passive map of pre-spawned packs. Each expedition card exposes:

- region, recommended level, and lock state;
- four room names and room types;
- route summary and final boss;
- clear count, best time, highest Heat, and completed-stage history;
- launch, active, replay, and completion states.

The live encounter HUD shows expedition name, room number, room type, exact objective, tactical hint, enemies remaining, ritual vessels remaining, and completion state. A dedicated return control appears after the boss reward. The title screen and onboarding now describe committed click-to-move combat, sealed objectives, target priority, and the four-room cadence.

## Persistence and migration

Snapshot version 18 adds a normalized `requiem.blackRoad` record:

- total route clears;
- bosses defeated;
- per-expedition clears;
- per-expedition best time;
- per-expedition highest Heat;
- cumulative stages cleared.

Older valid saves retain class pairings, equipment, inventory, stash, skills, Journey, Paragon, campaign choices, contracts, factions, world state, endgame records, difficulty, tutorial state, class mechanic, and prior room history. Missing or malformed Black Road fields receive bounded conservative defaults.

## Scope statement

The Black Road is a complete playable overhaul of this custom Canvas2D game’s repeatable combat topology and enemy presentation. It does not claim the skeletal animation volume, cinematic pipeline, asset budget, networking, or production scale of a large commercial release. The shipped behavior—manual commitment, authored room objectives, arena constraints, target priority, phase transitions, persistent dungeon records, painted actors, and Windows packaging—is implemented and release-tested.
