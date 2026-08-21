# Ashen Covenant: The Black Road — Windows Edition

Ashen Covenant: The Black Road is a deliberate Windows dungeon action RPG built around choosing two oaths and allowing those choices, combat behavior, equipment, and world decisions to reshape both the character and the world. Version 6.0.0 makes Covenant Metamorphosis the game spine: six affinities alter skills, combat rules, enemy pressure, Hunters, bosses, loot, Sanctuary, Black Road conditions, animation, VFX, and adaptive audio while preserving the proven 2.5D combat, campaign, progression, and expedition foundations.


## Version 6.0.0 — Covenant Metamorphosis

- **Six evolving Covenant affinities:** Flame, Grave, Blood, Light, Storm, and Void respond to behavior and choices, support dual alignments and instability, cross five visible Metamorphosis stages, and drive mechanical as well as visual changes.
- **Authored skill mutation:** all 30 primary-class combat actions now have four rule-changing mutation paths (120 authored mutations total). Mutations can replace projectile geometry, movement, targeting, fields, summons, guard interaction, executions, corpse use, and retaliation instead of merely adding percentages.
- **Canonical progression ownership:** legacy Imprints, Mastery, and Reforged transformation value migrates into mutation credits while historical fields remain readable for save compatibility.
- **Normalized physical combat:** HitContext/HitResult resolution now carries mass, poise, armor, Guard, guard break, knockback, launch, knockdown, and execution eligibility through one combat contract.
- **Faction combat doctrine:** Grave, Blood, Iron, Void, and Storm enemies use shared roles but coordinate with distinct pack-level tactics, cached directives, combat slots, target priorities, cadence, and mobility.
- **Persistent Named Hunters:** enemies that defeat the player can become recurring adversaries with remembered sources/damage types, scars, adaptations, intrusion cooldowns, corpse denial, reinforcements, retaliation, ward breaking, and known target rewards.
- **Authored boss controllers:** all ten existing bosses now run deterministic per-boss phase thresholds and mechanic schedules with Covenant variants and persisted discoveries while retaining the proven arena/camera/projectile/hazard executors.
- **Behavior-driven Uniques:** all 47 Unique/Mythic items expose executable hooks; former stat-package chase items now alter cooldown routing, barrier storage/retaliation, executions, world-event rewards, hybrid casts, boss control, or Covenant rupture.
- **Persistent regional simulation:** Gravewake Rising, Blood Moon Hunt, and the Black Procession physically occupy the world, persist through reload, alter corpse strategy, Hunter pressure, weather/lighting, loot bias, and Black Road pressure, and leave regional outcome echoes.
- **Living Sanctuary:** Covenant stage, reclaimed strongholds, faction rank, Hunter history, world-event outcomes, campaign progress, and boss discoveries change architecture, lighting, NPC presence, services, merchants, and cache inventories.
- **Covenant-reactive Black Road:** route context freezes Covenant/world/Eclipse conditions at launch, persists across reload, supports Hunter intrusion, adds Metamorphosis midpoint choices, forces authored boss variants, and honors eligible target-farm rewards.
- **Metamorphosis Hub and presentation:** the Covenant Hub exposes stage/instability, current mutations, Hunter dossiers, regional events, and discovered boss variants. Player animation keys, cast/trail/impact VFX, aura, markings, eyes, movement, weapon overlays, adaptive motifs, and boss signature cues all resolve from the same Covenant identity.
- **Release certification:** `npm run test:v6` combines all v6 subsystem regressions, a four-generation save migration matrix, a 200+ actor integrated stress gate, and the complete legacy dependency-free `test:core` chain.

## Play on Windows

For a no-setup game launch, extract the Windows package and double-click `Ashen Covenant.exe`. Keep the complete extracted folder together: the executable uses its adjacent `resources` folder just as a Steam game does.

The desktop build does not install a browser app or require a mobile/PWA workflow. Windows may show a SmartScreen notice for an unsigned indie executable; choose **More info → Run anyway** only if you trust the file source.

For local development, double-click [Play Ashen Covenant.bat](launchers/Play%20Ashen%20Covenant.bat), or run:

```bash
npm install
npm run desktop
```

Build the Windows portable release with:

```bash
npm run test:v6
npm run desktop:win
```

The resulting launch-ready folder is written to `release/win-unpacked/`. `npm run desktop:win:portable` is also available when building a single portable executable on a Windows build machine.

## What is playable

- **Five complete campaign chapters:** take the same save from the Bell-Broken Road through Bellscar Citadel, the Blood Beneath Redfen, the Crownless Siege, and the Fifth Road. The 31-stage campaign contains persistent objectives, set-piece warbands, dialogue, branch consequences, five major act bosses, and unique chapter rewards.
- Select exactly two classes—no class is preselected—and unlock one of fifteen hybrid archetypes. The second oath is a live Companion Technique on `C`, not a passive menu choice.
- Keyboard, mouse, and gamepad controls in a native Windows desktop window, including controller aim assist, menu navigation, and combat rumble.
- Six class kits, companion techniques, fifteen hybrid signatures and ultimates, and state-driven combat actions with wind-up, impact, recovery, and aftermath.
- Six class-defining build-and-spend mechanics—Judgment, Blight, Resolve, Momentum, Remains, and Radiance—with dedicated HUD feedback and empowered finishers.
- A 100-level Covenant Journey with 18 activity chapters, 108 persistent trials, an authored reward at every level, six rank-15 Pillars, 20 five-level Ascension choices, and an eight-board endgame Paragon Atlas.
- A branch-gated skill system with class boards, hybrid resonance nodes, prerequisites, exclusive capstones, meaningful refunds, combat-changing skill imprints, and combat-earned ability mastery doctrines.
- Pack/stash inventory (60/180 slots), item locks, saved loadouts, sorting, equip/unequip, forging, tempering, corruption, salvage, multi-rune sockets, twelve-rank endgame Masterworking, a target-farming Loot Codex, set bonuses, an Aspect Codex, and equipped-relic bond awakenings.
- Combat animation states, input buffering, dodge invulnerability, hit-stop, projectile homing and evasion, stagger, knockdowns, and executions.
- Five Black Road expeditions containing 20 sealed encounters: formation checks, ritual-objective rooms, named lieutenants, midpoint route choices, and mechanically distinct multi-phase bosses. Only the active room exists; it must be deliberately entered and cleared.
- A 41-entry regional bestiary with guards, ranged attackers, healers, commanders, assassins, burrowers, summoners, morale, flanking, retreating, twelve elite affixes, and ten bosses—now rendered through four animated enemy-motion sheets with no geometric actor substitute.
- A connected world with 30 named districts, 64 landmarks, 18 world events, six waypoints, 18 lore sites, five reclaimable strongholds, returning nemeses, and target-farmable uniques. Sanctuary and cleared roads stay clear until the player chooses the next activity.
- A persistent operations layer with 30 regional contract identities rebuilt into rotating multi-stage Field, Veteran, Heroic, Mythic, and Apex writs; ten Contract Ledger ranks; targeted Seal rewards; five faction-renown tracks; ten authored delves; eight scalable endgame modes; and 15 combinable operation modifiers.

## Project map

```text
src/
  core/       shared math and runtime constants
  data/       classes, hybrids, campaign, enemies, items, Requiem routes, world, and presentation profiles
  presentation/ context, typed events, animation, impact, music, validation, and orchestration
  systems/    input, renderer, save game, and combat/world simulation
  ui/         Covenant Hub, HUD, focus navigation, icons, and system UI
desktop/      Electron entry point and preload bridge
launchers/    Windows double-click development launcher
public/assets generated ability, item, player, enemy, terrain, and environment artwork
scripts/      lightweight regression and smoke tests
```

Generated sprite sheets now cover body, world, and combat VFX. Actual player and enemy attacks are animated game actions with wind-up, travel, impact, reaction, and aftermath—not static icons placed onto the battlefield.

## Eight-frame combat VFX revamp 4.2.0

- **Eight authored frames per action:** every basic attack, spell action, Companion Technique, hybrid signature, ultimate, execution, and enemy wind-up now starts an eight-frame generated sequence. Frame progression is tied to the live action duration, so anticipation, active damage, and recovery visibly agree with the combat timeline.
- **Class and role lanes:** Warden, Ironbound, and Veilrunner use distinct martial rows; Thornseer, Gravebinder, and Dawnstrider use distinct spell rows; enemies select melee/shield, ranged/assassin, brute/burrower, or ritual lanes. The animation is not a single recolored burst reused for every action.
- **Release-gated artwork:** three alpha-composited image-generation sheets are required at startup, checked in file-protocol packaging, and validated for all six primary kits and every enemy role by the animation regression test.

## 2.5D animation and world-art revamp 4.1.0

- **Animated enemies:** every enemy identity resolves into one of four generated motion sheets with idle, walk, wind-up, and impact frames. The renderer never substitutes a geometric creature when an image is unavailable.
- **A painted world:** a new six-region terrain atlas, a sixteen-cell entrance atlas, world-prop atlas, and animated NPC atlas replace procedural actor and landmark placeholders in the live world.
- **Grounded combat:** player and enemies own elevation, vertical velocity, grounded state, landing behavior, combat launches, and dodge/pounce lifts under a shared gravity pass.
- **2.5D stances:** character bodies turn through discrete authored stances. Aim and attacks remain responsive in the play plane, but neither player nor enemy visual bodies continuously rotate like flat top-down tokens.
- **Release-gated:** art decode, all 41 enemy mappings, gravity settlement, fixed body-stances, and packaged `file://` loading are covered by the v4.1 regression pass.

## The Black Road overhaul 4.0.0

- **The horde loop is gone:** no timer silently rebuilds regional packs, no map-wide formation wakes up at once, and Sanctuary does not spill into automatic combat. The player chooses an expedition from the Atlas and commits to one sealed room at a time.
- **Five complete dungeon routes:** Funeral Road, Bloodroot Descent, The Iron Siege, Mirror Pilgrimage, and The Last Bell each contain four authored rooms and a named final boss. That is 20 controlled combat spaces with persistent clears, best time, highest Heat, defeated-boss, and stage records.
- **Objectives change the fight:** ritual rooms contain three destructible vessels. Living vessels ward their formation with 88% damage reduction, making target order and positioning authoritative instead of optional flavor.
- **Boss arenas evolve:** expedition bosses lock the arena, transition through phases, shrink the playable boundary, summon bounded support, and place final-phase hazards. Their attacks remain committed to the telegraph shown during wind-up.
- **Painted monsters replace proxies:** 32 new transparent creature paintings are split across common and elite/boss atlases. Every one of the 41 enemy identities resolves to authored creature art; a missing atlas fails closed rather than drawing a circle, polygon, or emergency silhouette.
- **A dungeon-first interface:** the Atlas is now an expedition board with room sequence, objectives, level recommendations, completion records, and launch controls. The live encounter HUD shows route, room number, room type, objective, surviving enemies, ritual wards, and return state.
- **Persistent and compatible:** save snapshot version 18 adds normalized Black Road records while preserving prior class pairings, equipment, progression, campaign state, difficulty, contracts, world systems, and Requiem history.
- **Release-gated:** the v4 test suite simulates an entire four-room descent, validates sealed boundaries and ritual wards, kills the lieutenant and multi-phase boss, checks record persistence and Sanctuary return, validates both RGBA atlases, and runs the full historical regression chain.

## Requiem overhaul 3.0.0

- **A rebuilt road loop:** each hostile region now contains three authored battlefields—opening lesson, target-priority test, and regional guard—with bounded formations, local engagement, tactical hints, completion rewards, route tracking, minimap guidance, and persistent clear history.
- **Class identity in the hands:** all six primary oaths gain a distinct live mechanic with class-specific charge rules and empowered expenditure. The mechanic is saved, surfaced in the HUD, and integrated into real attacks, skills, barriers, marks, curses, movement, and kills.
- **Action-RPG commitment:** targeting, approach, manual strike commitment, locked telegraphs, dodge windows, recovery, and local pack leashing remain authoritative. Ground clicks receive world-space confirmation; no held auto-fire or screen-wide auto-combat was introduced.
- **No geometric actor fallback:** both enemy and hero renderers require the packaged painted atlases and fail closed when art is unavailable. All actors, corpses, loot, and destructibles now share one depth-sorted isometric queue with viewport culling.
- **Combat-readable interface:** Roadcraft teaches movement, targeting, attacks, dodging, skills, the second oath, hybrid action, and loot. Encounter name, tier, tactical hint, remaining enemies, class mechanic, next route, and three road difficulties are directly visible.
- **Persistent, compatible progression:** Requiem state records difficulty, onboarding, class mechanic, room history, best streak, and room deaths in save version 14. Existing version-13 covenants migrate conservatively with every prior class, item, campaign choice, contract, world record, and endgame record intact.
- **Release-gated verification:** the new Requiem suite validates all 15 formations, six mechanics, three difficulties, local awareness, room rewards and release, route guidance, depth sorting, fail-closed actor art, onboarding completion, and version-13 migration alongside the complete historical regression chain.

## Deliberate Combat update 2.3.0

- **Painted creatures are release-gated:** all 41 enemy identities and ten bosses render from the packaged 16-silhouette dark-fantasy atlas. Windows `file://` paths now resolve inside the application instead of at the drive root. The old geometric enemy fallback is removed, and a run cannot start if required creature art fails validation.
- **Contextual action-RPG controls:** left-click ground to move; left-click a creature to select, approach, and commit one basic attack; right-click or `Q` uses the first skill. `WASD` direct movement, keyboard abilities, controller movement, and controller aim remain supported.
- **Local encounters instead of a pursuing horde:** authored packs begin unaware, alert nearby groupmates, maintain role formations, respect attacker caps, collide with the player, and leash back to their territory. The campaign population is bounded, and replacement encounters no longer refill continuously around the player.
- **Dodgeable committed attacks:** melee cones, ranged lines, disruptor drains, assassin lunges, burrow points, boss projectiles, and boss ground patterns retain the direction or impact point shown during wind-up. Moving out before contact avoids damage instead of letting the attack retarget at the last instant.
- **Readable targeting:** selected creatures receive a grounded target ring and dedicated name, rank, health, affix, engagement, and stagger frame. Normal enemies no longer carry floating geometric role markers; those indicators are reserved for elites and bosses.
- **Permanent regression coverage:** the v2.3 suite directly validates Windows asset resolution, fail-closed creature rendering, dormant pack awareness, group alert, contextual movement and targeting, committed melee and boss attacks, population bounds, and the absence of held auto-fire.
- **Save compatible:** save snapshot version 13 is unchanged. Existing v2.2.0 covenants retain classes, gear, progression, campaign choices, contracts, world state, settings, and endgame records.

## Covenant Interface update 2.2.0

- **One navigable Covenant Hub:** Atlas, Journal, Skills, Journey, Relics, Chronicle, Contracts, and Settings now share a persistent rail, current-page state, ready-choice badges, character resources, remembered scroll positions, direct keyboard shortcuts, and controller navigation.
- **Rebuilt title and creation flow:** an existing save receives a prominent hybrid, level, region, class-pairing, and last-saved summary. New characters follow a visible Primary Oath → Companion Oath → Hybrid Covenant sequence, with no silent selection and a clear summary of the resulting build.
- **Combat-first HUD hierarchy:** health, class resource, objectives, tracked writ, boss state, minimap, system access, Fated/Barrier/Resonance state, contextual controls, and abilities occupy separate visual zones. Low health, full Confluence, cooldowns, ready actions, and flask quantity now have explicit states.
- **Complete adaptive controls:** prompts switch automatically between keyboard/mouse and gamepad. Spatial D-pad navigation follows the visible grid, modal focus is trapped and restored, background surfaces are isolated from assistive technology, and the gamepad layout now includes Companion, hybrid, flask, ultimate, and interact actions.
- **Usable deep inventory:** Pack and Stash gain live search, rarity and slot filters, result counts, equipped-item comparison, and a persistent inspector. Salvage, Aspect extraction, and contract abandonment now use one contextual confirmation flow.
- **Real interface accessibility:** saved UI scale now changes the interface. HUD detail, HUD opacity, high contrast, minimap visibility, control hints, reduced motion, reduced flashing, simplified effects, camera shake, impact pause, audio buses, and soundtrack behavior are all configurable and persistent.
- **Structured feedback:** custom tooltips explain classes, abilities, and items; numeric cooldowns and ready states improve combat scanning; capped notifications deduplicate repeated messages and use distinct accent, warning, and quiet treatments.
- **Permanent regression coverage:** a dedicated v2.2 suite verifies the title hierarchy, input glyph switching, complete controller action map, focus trap/restoration, spatial navigation, Hub routing, keyboard panel shortcuts, settings persistence, inventory search/filter/comparison, confirmation safety, toast bounds, and save summary.

## Ash & Overture presentation update 2.1.0

- **One shared presentation pipeline:** a typed event bus and sampled gameplay context now coordinate animation, hit timing, camera, controller feedback, VFX, sound, music, cinematics, loot, destruction, weather, world state, menus, and accessibility. Existing gameplay events remain supported through compatibility bridges.
- **Contact-accurate player actions:** six weapon identities use distinct acceleration, gait, anticipation, range, arc, recovery, impact, sound, and dodge profiles. Basic combos, primary skills, wards, Companion Techniques, hybrid signatures, ultimates, potions, and executions resolve on authored release events rather than on button press.
- **Grounded combat motion:** start, stop, walk, run, combat run, injured idle, pivot, dodge, reaction, death, and resurrection states sit over frame-rate-independent acceleration/deceleration. Bounded facing correction and short motion warping improve contact without teleporting; dodge immunity follows visible travel.
- **Readable enemies and bosses:** direction-capped turning, committed attack tracking, role-specific poses, line/cone/area telegraphs, directional reaction history, controlled corpse variants, phase holds, stagger emphasis, transition rings, boss camera profiles, phase stings, and post-defeat silence keep encounters legible.
- **Living world presentation:** region-aware footsteps, six weather/music identities, reclaimed-stronghold NPC routines, ambient town actors, destructible urns/barricades/ritual vessels, synchronized high-tier loot reveals, camera framing, and presentation LODs extend the existing painted world.
- **Persistent adaptive score:** 35+ data-driven cues cover menus, character creation, all six regions, exploration, settlements, dungeons, combat, ten bosses, narrative, death, victory, loading, and credits. Quantized transitions, synchronized procedural stems, threat hysteresis, silence scheduling, cue history, stinger priorities, mix ducking, focus behavior, and death/revive restoration run without restarting at room boundaries.
- **Accessibility and diagnostics:** independent mix buses, dynamic-score intensity, combat-music frequency, reduced stingers, camera shake, impact pause, reduced motion/flashing/effects, background audio, and streamer-safe settings persist locally. Explicitly enabled `F3` diagnostics expose timelines, hit windows, context, boss state, cue/section/stems, voice counts, LOD budgets, camera, impacts, event history, and validation errors.
- **Honest asset status:** all current music is original procedural synthesis and is labeled production placeholder content. The game has no skeletal rigs, cloth solver, or imported 48 kHz/24-bit score stems; the architecture and authoring specifications are ready for those assets without claiming they exist.

## Systemic Reforging update 2.0.0

- **Hybrid builds become three-part identities:** every one of the fifteen dual-class hybrids now has three mutation tiers with three exclusive choices at each tier. Mutations alter rotations, Companion and Hybrid interactions, Confluence payoffs, and signature or ultimate behavior rather than adding another flat percentage.
- **Every active skill keeps evolving:** all six ability families gain three five-rank mastery paths. Rank-five capstones add repeat casts, retaliation, resource loops, execute chains, extended fields, or empowered finishers, with complete respec support.
- **Relics remember how they were used:** each equipment slot develops one of three persistent Memories through Bond progression. Memories grow from actual combat, can be rewritten, and combine with awakenings, Fated affixes, sockets, Masterworking, and set bonuses.
- **A real artisan career:** four ten-rank Forge Disciplines unlock sixteen techniques, including affix locks, guided tempering, resonant sockets, echo runes, corruption purification, targeted Fated crafting, Mythic bargains, blueprints, and heirloom conversion. Salvage, crafting, tempering, socketing, and Masterworking all feed the chosen discipline.
- **Factions change the world:** each of five factions now offers three doctrines, rotating directives, a renown shop, and an exclusive pledge. Choices alter regional rules, rewards, build behavior, and available projects instead of ending at milestone caches.
- **A living campaign map:** five multi-stage regional event arcs branch into permanent outcomes; reclaimed strongholds take projects, accumulate stability, and require recurring defenses; world threat and control react to victories and failures; Nemeses adapt, gain traits, build grudges, and carry escalating bounties.
- **Branching operations and pinnacle endgame:** every operation outside sealed contracts becomes an expedition with route choices, boons, banes, Heat, mastery, and keys. The twelve-node Eclipse Web opens alternate endgame routes and the Worldscar and Final Bell pinnacle encounters.
- **Knowledge and story become builds:** bestiary research unlocks three tactical insights for each of eight enemy families, campaign chapters award one of three persistent Decrees, Paragon routing forms sixteen Constellations, and six combat reactions reward deliberate sequencing between status effects.
- **One unified desktop interface:** press `H` to open the Systemic Chronicle. Its eight views expose all available choices, requirements, consequences, respecs, routes, research, projects, and permanent world state without burying them in the existing inventory, Journey, Contracts, or Atlas screens.
- **Safe v1.4 migration:** save version 13 now carries an optional reforged state while retaining every existing class, item, contract, campaign, Journey, Paragon, faction, and world record. Older saves receive conservative defaults and can engage with every new system immediately.

## Contract Ledger overhaul 1.4.0

- **A rotating regional board:** a new covenant begins with six focused Gravewake orders; the board expands to twelve offers as the world opens. Every cycle is deterministic for the save, can be turned manually, covers eligible factions and regions, and preserves active work while replacing stale offers.
- **Five meaningful difficulty bands:** Field Orders grow into Veteran Orders, Heroic Writs, Mythic Writs, and level-100 Apex Mandates. Higher bands add objective stages, stronger targets, more risk clauses, better item floors, substantially higher gold and renown, more crafting materials, and more Contract Seals.
- **Multi-stage contracts and sealed finales:** the original 30 names and save ids now generate connected kill, elite, event, delve, stronghold, boss, and dedicated mission stages. Mythic and Apex orders culminate in a launchable regional operation with dense waves, contract clauses, and an authored regional boss.
- **Terms that change play:** eight risk clauses can add bodies, elites, health, armor, damage, speed, rift pulses, volatile deaths, or enemy recovery. Four optional objectives track deathless and potionless clears, executions, and elite hunting alongside the main route for bonus payout.
- **Persistent contract mastery:** ten Ledger ranks unlock difficulty bands, extra active slots, free board turns, improved optional rewards, and the full Seal Exchange. Completion streaks raise gold, optional terms improve renown and materials, and the exchange offers general, regional, Fated, and Unique-targeted caches.
- **Dedicated desktop UX:** the Operations Board is split into Contracts, Operations, and Factions views. Active writs show their whole route, current stage, clauses, optional objective, and payout; a pinned contract appears below the campaign objective in the live HUD. Press `O` to open the board directly.
- **Safe v1.3 migration:** every old active contract, completion count, faction reward, item, class, campaign choice, Journey state, and Paragon choice survives save version 13. Old one-counter jobs retain their original targets while prior completions seed the new Ledger. Adversarial migration, mission gating, reward, UI, and full historical regressions are permanent release tests.

## Deep Visuals & Reliability update 1.3.0

- **Expanded live bestiary art:** a new transparent 4×4 atlas gives the 41-enemy roster sixteen distinct painted families, including guards, witches, mire creatures, assassins, carrion beasts, brutes, priests, wisps, colossi, abominations, wardens, and regional bosses. Gravebinder and Dawnstrider now use distinct player silhouettes instead of borrowing older classes.
- **Layered region graphics:** all six painted terrain plates now carry live alpha-cut props—camps, braziers, banners, graves, dead trees, bells, fences, reeds, bloodroots, shrines, pools, fortress walls, rifts, cathedral buttresses, and bell debris. Deterministic combat keepouts retain clean central fighting space.
- **Richer combat presentation:** shape-specific cone, line, and ground telegraphs communicate enemy intent; slow attacks land at the location that was actually warned. Dynamic spell and prop lighting, zone weather, world-drop item art and beams, persistent capped corpses, better movement-state animation, and restored high-quality canvas scaling add depth without changing collision geometry.
- **Scalable rendering:** Low, High, and Ultra presets control prop and atmospheric density while the existing reduced-particle option remains available independently.
- **Extensive reliability pass:** repaired pre-implicit item migration, Escape overlay dismissal, 10–20 FPS time loss, non-finite delta handling, direct delve-gate bypasses, fractional tiers, duplicate contracts, injected stronghold state, canvas smoothing after resize, missing enemy movement states, and the absent Bond III offhand awakening. Returning to Sanctuary now commits the transition immediately.
- **Permanent regression coverage:** the complete historical suite now includes deep migration, timing-equivalence, engine-gate, telegraph-location, settings, RGBA-asset, and every-slot awakening invariants.

## Hundredth Bell & Paragon Atlas update 1.2.0

- **A complete level 1–100 road:** the original curve and skill-point cadence remain intact through level 60. Levels 61–100 add veteran caches, additional Pillar growth, stronger material rewards, eight upper-road Ascensions, four more flask reinforcements, rising enemy pressure, and a final Paragon awakening.
- **Eighteen Journey chapters and 108 trials:** eight new five-level chapters cover veteran operations, perfected gear, regional mastery, boss hunting, dual-oath rotations, Apex Masterworking, tier 28–45 clears, and the final Hundredth Bell challenge. Every chapter keeps flexible four-of-six completion and a six-of-six mastery reward.
- **Deeper mortal build choices:** all six Pillars now reach rank 15 and gain a fourth behavior-changing breakthrough. Ascension expands from 12 to 20 tiers, giving 60 authored choices across offense, defense, movement, Fated effects, Companion techniques, Hybrid rotations, bosses, and final level-100 capstones.
- **Eight routed Paragon boards:** level-100 experience advances up to 180 Paragon ranks. Covenant Heart, Warpath of Ruin, The Unbroken Aegis, Twin-Oath Nexus, Stormstride Circuit, Predator Throne, Relic Weaver, and Worldfall Dominion contain 120 connected Normal, Magic, Rare, Legendary, Socket, Keystone, and Gate nodes. Point costs and prerequisites force real routing decisions.
- **Board attachment and keystones:** reaching a Gate earns a Board Sigil used to attach another eligible board. The 16 Legendary and Keystone nodes add effects such as Confluence surges, repeated attacks, ward storms, lethal-hit recovery, execution cascades, Fated amplification, and combined Worldfall bursts.
- **Ten upgradeable Glyphs:** each attached board has a socket route. Endgame operations and Paragon ranks award Glyph Embers used to raise Glyphs through ten ranks and two milestone effects; Glyphs can be moved between awakened sockets without destroying their progression.
- **Safe respec and migration:** the full Atlas can be rekindled for gold while permanent Glyph ranks remain. v1.1 Legacy ranks become banked Paragon ranks, unspent power is preserved, and invested Legacy paths remain active as permanent Legacy Imprints. Save version 12 retains every class, campaign choice, item, Masterwork rank, Journey claim, and prior progression choice.
- **Dedicated Atlas UX:** the `P` Journey screen now presents all 100 rewards, 18 chapters, rank-15 Pillars, 20 Ascensions, a rendered node-and-connection board, board previews, point and sigil status, Glyph sockets, Glyph upgrades, and migrated Imprints in one progression hub.

## Covenant Journey update 1.1.0

- **A complete level 1–60 road:** every level now has an authored reward. Skill points remain intact, even levels add permanent Pillar points, odd levels deliver scaling road caches, every fifth level opens an Ascension choice and relic cache, and every tenth level reinforces the flask.
- **Ten substantial leveling chapters:** First Embers, Broken Choir, Bloodwater, Crownless March, Fifth Road, World Reclaimer, Faction Champion, Relic Architect, Apex Covenant, and Worldfall each contain six persistent objectives. The sixty total trials cover combat rotations, bosses, executions, exploration, lore, campaign progress, events, contracts, delves, strongholds, crafting, Uniques, Masterworking, and high-tier operations.
- **Flexible completion with mastery rewards:** completing four of a chapter’s six trials earns experience, materials, gold, and a level-scaled relic. Completing all six grants a bonus Pillar point. Earlier chapters remain selectable and completable after the character moves into a later level band.
- **Six permanent Pillars:** Might, Celerity, Aegis, Communion, Predation, and Providence each contain ten ranks and major breakthroughs at ranks 3, 6, and 10. Effects include echoed strikes, lethal-hit recovery, faster Confluence, wider execution windows, and stronger Fated affixes. Pillars can be fully rekindled for gold.
- **Twelve Ascension decisions:** at levels 5 through 60, choose one of three impactful bonuses. The 36 authored options include projectile forks, ward pulses, dash rifts, Soul Harvest, Confluence surges, execution cascades, build-defining offense or defense, and a final Worldfall capstone. The full path can be rewritten for gold.
- **Experience from the entire game:** campaign stages, districts, chronicles, waypoints, contracts, world events, strongholds, delves, and operations now grant substantial experience alongside enemy kills. Later Journey bands also increase ambient formation size and elite pressure while respecting population ceilings.
- **Infinite post-cap growth:** level-60 experience advances Legacy ranks instead of disappearing. Each rank grants a point for Worldfire, Unbroken Road, Last Bell, or Relic Memory; every fifth Legacy rank also grants a Pillar point.
- **Dedicated desktop UX and save migration:** the HUD now shows level progress and ready Journey choices. A four-view Journey screen covers the current road, all ten chapters, Pillars, Ascensions, and Legacy. Worldfall saves migrate to save version 11 with catch-up Pillar points and inferred credit for completed world, campaign, contract, delve, operation, and collection progress.

## Worldfall expansion 1.0.0

- **A five-act campaign:** Chapters III–V continue directly from the existing Bellscar save. Each act has a Maelin briefing, regional entrance, three objectives that can be cleared in any order, a named three-phase boss with signature mechanics, a return sequence, and a unique build reward.
- **Thirty explorable districts:** every painted region is divided into named subregions with discovery persistence, danger ratings, faction identity, in-world boundary treatment, and atlas completion. Six attunable waypoints add map-based fast travel; 18 chronicle sites provide exploration XP, renown, gold, and collection progress.
- **A living encounter director:** the bestiary now exceeds 40 enemy and boss definitions, arranged into 32 regional pack compositions. The world streams bounded replacement packs as the covenant travels, while five strongholds and 18 event types alter regional corruption and calm periods.
- **Contracts and factions:** the Operations Board exposes 30 repeatable objectives across kills, elites, events, delves, strongholds, and bosses. Contract caches feed five renown tracks, each with five reward ranks; high Ashen Accord renown unlocks an additional active-contract slot.
- **Ten authored delves:** every hostile region contains two descents with its own level, wave count, regional composition, boss, grade, record, loot source, and faction reward. Delves can be launched from their world entrances or the Operations Board.
- **Eight real endgame modes:** Abyss Delve, Boss Hunt, Covenant Arena, Hybrid Trial, Cairn Siege, Redfen Ritual, Bellscar Gauntlet, and Veiled Echoes build different wave plans and final encounters. Tier 20 combines two modifiers and tier 35 combines three from a 15-modifier pool.
- **A denser but clearer UX:** the world atlas tracks districts, lore, delves, waypoints, corruption, and travel in one view. The expanded Operations Board separates activities, active contracts, the full contract catalog, faction progress, and delves into scan-friendly sections.
- **Level 60 and save version 10:** existing v0.9.0 covenants migrate into the expanded level cap and safely receive normalized district, waypoint, lore, delve, faction, contract, and Chapters III–V state without losing classes, gear, Masterworking, campaign choices, or inventory.

## Painted World, Fated Loot & UX update 0.9.0

- **A completely painted world:** the six authored terrain plates now tile the full playable 3840×2520 world. There are no longer unpainted gaps between encounter islands; the renderer, minimap, and world-map overlay use the same zone image everywhere.
- **Fated affixes:** Relics, Uniques, and Mythics now guarantee one action-changing affix. These can echo core strikes, fork projectiles, rupture criticals, pulse from a barrier, leave dash rifts, cascade executions, convert elite kills to Barrier, or create an extra Confluence charge. Their effect text is visible directly on the item and in the Codex.
- **An inspection-first inventory:** the former all-in-one wall of controls is now divided into Loadout, Forge, and Codex views. Select a compact item tile to inspect it, then use only the relevant equip, salvage, craft, socket, Masterwork, or target-farm actions in that context.

## Art & animation update 0.8.0

- **Six painted combat regions:** Ashen Sanctuary, Gravewake Fields, Redfen, Cairnreach, the Veiled Road, and Bellscar Citadel now use individual top-down terrain plates with authored borders, landmarks, material detail, and deliberately open combat centres. Zone light, corruption treatment, and atmospheric particles sit on top of the art rather than replacing it with flat colour fields.
- **Clearer live combat:** player and enemy bodies now shift through idle, movement, wind-up, strike, cast, dash, hit, knockdown, recovery, and death poses. Weapon gesture arcs, directional projectile silhouettes, new impact flashes, and richer zone-specific atmosphere make abilities and enemy intent easier to read in motion.
- **Loot has real art:** the full equipment and unique-item pool now maps to a 16-slot painted inventory atlas. A matching rune/material atlas gives socketed runes, forge choices, and Masterworking materials a visual identity while preserving all existing art indices and saves.

## Campaign and graphics update 0.4.0

- **A playable opening chapter:** Chapter I provides a structured story route, contextual objectives, a cinematic dialogue layer, authored encounter logic, an introductory boss, save-safe campaign state, and an explicit Chapter II continuation rather than dropping a new character into an unguided sandbox.
- **A more dimensional world renderer:** the world now draws distinct terrain palettes, layered roads, ruins, grave markers, braziers, reeds, rifts, ash, lighting pools, and atmospheric motes by zone. Landmarks and the Bellscar gate are visually readable at a glance.
- **Character-led combat visuals:** the renderer uses the supplied player and enemy art atlases for actual combatants, with movement, attack, cast, hit, stagger, dash, death, and boss-state motion layered over the sprites. Ability and item art remain UI iconography where it belongs.
- **New key art:** the title and campaign journal use an original Chapter I scene that establishes the sanctuary, road, and distant Bellscar threat.

## Chapter II update 0.5.0

- **A complete Bellscar chapter:** Chapter II begins when the Chapter I return is complete. Speak with Maelin, cross the Bellscar Gate, clear the Golden, Ashen, and Hollow Choir seals in any order, make a persistent verdict at the Reliquary of Names, defeat Rath Vell, and return to the sanctuary.
- **Three authored encounter identities:** the Golden Choir relies on guards and a cantor, the Ashen Choir pressures wards and recovery, and the Hollow Choir uses summoning, flanking, and mobility. Their completion survives reloads; unfinished seal encounters rebuild safely after a save restore.
- **A consequential campaign choice:** Bind the Choir grants defensive ward play and turns phase transitions into a brief safeguard, while Sever the Choir makes Rath Vell vulnerable in later phases and leans into power, critical hits, and stagger. The choice reshapes the boss’s phase-two behavior and rewards a different unique relic.
- **A true Chapter II boss route:** Rath Vell is spawned only by the Bell Vault stage, carries a three-phase encounter, uses choice-aware patterns, has a dedicated entrance and defeat dialogue, and cannot appear as an untethered world boss before the chapter starts.
- **Bellscar presentation:** the journal and dialogue system now use original Chapter II Bellscar key art, while the live renderer gives the gate, three seals, reliquary, and bell vault distinct silhouettes, locked states, and campaign-target highlights.

## Loot Foundry update 0.6.0

- **Six meaningful rarities:** Common, Magic, Rare, Relic, Unique, and Mythic drops now draw from 25 authored item bases. Every base carries an implicit modifier, while rarity determines affix budget, socket capacity, forge potential, and salvage yield.
- **Real build choices on gear:** 25 combat-relevant affixes can alter core, projectile, companion, hybrid, ultimate, boss, elite, stagger, execution, sustain, mastery, Resonance, movement, and drop-focused play. Item level, quality, affix tier, masterwork rank, Bond, corruption, and sockets all contribute to the live stat calculation.
- **Target farming and collection:** 23 uniques are assigned to region, boss, stronghold, endgame, hybrid-trial, nemesis, and Mythic sources. The Loot Codex records discoveries, shows source pools, exposes boss/Mythic pity, and lets you mark an eligible unique for the Target Forge.
- **Sets and Mythics:** Four three-piece sets offer authored 2-piece and 3-piece bonuses. Three Mythics create late-game chase drops with multi-socket gear and combat-changing powers rather than only larger numbers.
- **A deeper forge:** salvage now returns Cinders, Forge Shards, Oath Echoes, and Prisms by rarity; forge recipes create runes, Relics, or your marked unique. Items can be reforged, tempered, infused with a compatible affix, masterworked, corrupted, socketed up to three times, and individually unsocketed without destroying them.
- **Save-safe upgrade:** existing covenants migrate into the new 60-slot pack and 180-slot stash with legacy rune and Aspect data preserved. New source, collection, pity, target, socket, quality, set, and material data is normalized defensively on load.

## Endgame Forge & Six Oaths update 0.7.0

- **Two new base classes:** the Gravebinder turns curses, bone rites, and fallen enemies into Essence-fuelled pressure; the Dawnstrider uses Fervor, radiant javelins, consecrated ground, and movement to control a fight. Both ship with a full 12-node class board, companion technique, dodge, ward, ultimate, three authored uniques, and live combat animation/effect hooks.
- **A complete six-class matrix:** every one of the 15 possible pairs now has an authored hybrid identity, passive, signature, ultimate, progression board, visual colour, and target-farmable unique. New pairings include Graveguard, Blightweaver, Ossuary, Wraithblade, Dawn Aegis, Eclipse Chorus, Sunforge, Gilded Shade, and Requiem.
- **True endgame Masterworking:** Relics, Uniques, and Mythics can progress through Foundry ranks 1–4, Starlit ranks 5–8, and Apex ranks 9–12. Each stage has level and endgame-tier requirements, distinct material costs, and a focused-affix choice. Ranks 4, 8, and 12 exalt the chosen affix by 25%, so a finished item reflects the build it was made for rather than a generic stat increase.
- **Earned materials and safe commitments:** Abyss, Arena, Hunt, and Trial rewards now provide Tempering Alloys, while a Tier 20 S-rank clear can yield an Apex Core. Reforging and tempering lock once Masterworking begins, preventing a random roll from erasing a finished item plan; salvaging high-rank gear returns a portion of the investment.
- **Save-safe migration:** existing gear receives normalized 0–12 Masterwork state, focus, exalt, Alloy, and Apex Core fields on load. Legacy Masterwork ranks remain valid and can continue into the new tiers without discarding inventory or equipment.

## Core systems added in 0.2.0

- **Dual-oath depth:** every secondary class supplies a companion technique, while hybrid boards add Echo and Resonance branches that directly improve the paired build.
- **Combat readability:** enemies coordinate through pack morale and roles; projectiles, wards, execution windows, boss phase shifts, hit-stop, and controller rumble give each action a clear outcome.
- **Item identity:** relics roll item levels and affix tiers, can be masterworked and runed, and uniques can be sacrificed into one selectable permanent Aspect.
- **World and endgame persistence:** region state survives saves, strongholds stay reclaimed, nemeses return after a defeat, and Abyss, Arena, Trial, and Hunt activities progress in bounded waves with local records and letter grades.

## Progression update 0.3.0

- **Combat mastery:** the six active ability families progress only while enemies are nearby. Each rank improves the live action; rank III opens one of two freely swappable doctrines for that ability family.
- **Confluence loop:** rotating between primary skills, the companion technique, hybrid signatures, and ultimates fills a visible Resonance meter. A full meter creates a Confluence charge, triggers a pair-specific battlefield effect, and empowers the next hybrid signature.
- **Relic bonds:** equipped gear gains bond experience from kills. Bond ranks strengthen a relic’s affixes, and Bond III unlocks a slot-specific awakening such as Keening Edge, Stoneward, or Confluence Vessel.
- **Save-safe migration:** older v0.2.0 covenants load with empty mastery and bond state; no existing class, inventory, equipment, or world progress is discarded.
