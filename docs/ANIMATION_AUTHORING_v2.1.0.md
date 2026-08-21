# Animation and Presentation Authoring Guide

## Before authoring

Run `npm test` and read `PRESENTATION_AUDIT_v2.0.0.md`. The current game uses procedural Canvas2D animation, not skeletal clips. Do not mark retargeting, IK, facial animation, ragdoll, or cloth as implemented until corresponding runtime and assets actually exist.

## Add a class or weapon

1. Add the gameplay class in `src/data/classes.js` and its art index in `src/systems/renderer.js`.
2. Add one `CLASS_PRESENTATION_PROFILES` record in `src/data/presentation.js`.
3. Define weapon identity, posture, weight, acceleration/deceleration, turn/stride behavior, cast gesture, dodge style, and three attack timelines.
4. Add light/heavy weapon sound profiles and procedural gesture geometry.
5. Add rows to `docs/matrices/animation-matrix.csv`.
6. Run the validator and test each frame-rate, direction, cancel, wall, and target-size case.

A heavy weapon should have longer anticipation/recovery and stronger impact, but mechanical values must remain readable and deliberate. Do not alter timing through random animation selection.

## Add an attack or combo branch

Use the `timeline` helper or an equivalent serializable profile. Required fields are:

- stable ID, class/weapon, category, combo index;
- duration, startup, active frame, recovery;
- dodge/attack/skill cancel windows;
- movement, rotation, tracking, and root-motion policy;
- range and arc or projectile definition;
- impact, camera, audio, VFX, and optional music-accent profiles;
- ordered `CommitAttack`, `PlayWeaponWhoosh`, `EnableHitbox`, `DisableHitbox`, `AllowCancel`, and `EndAttack` events.

Damage must be created only by the hitbox/projectile event. Never duplicate the active timing in an unrelated timeout. If multiple variants have different timing, author separate complete profiles.

## Add a skill, dodge, potion, or execution

Add a `PLAYER_ACTION_PROFILES` entry with `CommitAction`, `PlayActionSound`, `ResolveAction`, `AllowCancel`, and `EndAction`. Route the gameplay method through `_queuePresentedAction`; perform resource consumption, cooldown activation, projectile/hazard creation, healing, or execution damage in the resolve callback. Validate that cancellation before resolve creates no effect and spends no resource.

Dodge distance remains gameplay-authoritative. Set invulnerability to visible travel minus a small end margin, then test at low/high frame rates. Executions may use only bounded alignment and must revalidate that the target still exists at resolve time.

## Add hit reactions and deaths

Reaction profiles must account for direction, damage tier, critical state, defender role/size, poise, boss resistance, and recent history. Bosses normally use scaled additive recoil rather than full interruption. Death profiles may select authored-style sprite collapse and bounded impulse; they must respect the corpse budget and cleanup time.

To add actual ragdolls, first implement collision filtering, authored-to-physics blending, floor stabilization, sleep, distance throttling, and deterministic cleanup. Do not label current corpse poses as ragdolls.

## Add an enemy family

1. Add the enemy gameplay record and atlas mapping.
2. Map its role to `ENEMY_PRESENTATION_PROFILES`, or add a new role profile with turn cap, anticipation, recovery weight, attack pose, and reaction scale.
3. Verify every dangerous attack has a body pose plus line/cone/area warning and matching audio.
4. Freeze or cap tracking after commitment.
5. Test interruption, elite affixes, crowd control, direction changes, slopes/edges, death, and offscreen LOD.

## Add a boss or phase

Add the boss gameplay data, music cue, matrix row, and boss-specific art/profile references. A phase change must hold attacks, clear telegraphs, set transition duration, trigger phase VFX, select boss camera, send a music stinger, then enable the new attack set only after the hold. Test death, reload, cinematic skip, repeated stagger, and revive in every phase. A revived player must not replay the reveal sting.

## Add NPC routines or interactions

Ambient actors use deterministic schedules and world-state gates. Define job, region, position, phase offset, and work/walk/converse routine. Interactions must own a stable state, explicit control lock, sound/VFX events, and safe exit. Reclaimed routines may appear only after the authoritative stronghold state says `liberated`.

## Root motion, IK, and retargeting policy

Current sprite movement is gameplay-authoritative. `Bounded correction` is not skeletal root motion. If skeletal animation is introduced:

1. document skeleton, axes, scale, frame rate, root transform, and sockets;
2. choose root motion per category and define collision/interruption/replication authority;
3. add foot placement, pelvis adjustment, foot lock, blend thresholds, airborne/speed disabling, and stairs/slopes tests;
4. add hand/weapon IK for two-handed grips and interactions;
5. validate shoulder, hip, feet, hands, weapon, twist, facial, and cloth bones for every retarget;
6. protect root/pelvis/feet/hands/weapon/head bones from aggressive compression;
7. update the matrix from `N/A` only after visual review.

## Validation

`validatePresentationData()` rejects duplicate IDs, invalid phase ordering, missing or reversed hitbox events, events outside duration, invalid cancel windows, missing action events, missing referenced impact/audio profiles, bad cue metadata, bad stems, missing context coverage, and missing fallbacks. `validatePresentationRuntime()` checks camera/hit-stop finiteness, boss transition validity, event-listener errors, and voice-budget warnings.

Run:

```bash
npm run test:presentation
npm run test:presentation:performance
npm test
```
