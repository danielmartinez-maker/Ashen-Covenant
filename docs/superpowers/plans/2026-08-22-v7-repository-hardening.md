# V7 Repository Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the confirmed v7 correctness defects, add regressions for each root cause, and perform a complete source-level audit of every tracked executable/text code path before release certification.

**Architecture:** Gameplay authority stays in `GameEngine`/domain systems; presentation observes and renders state but must not mutate combat rules. Semantic animation and combat context must be deterministic for overlapping states and actor-specific. Repository certification combines focused regressions with the existing full-code/text audit and CI matrix.

**Tech Stack:** JavaScript ES modules, Node.js 22, Vite, Electron, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-21-v7-embodied-covenant-design.md`

## Global Constraints

- Work only on `v7-embodied-covenant`; do not modify `main` directly.
- Use a failing regression before each production-code bug fix.
- Preserve existing gameplay behavior except where the regression proves the behavior is defective.
- Keep presentation read-only with respect to gameplay-authoritative boss state.
- Keep hostile save inputs finite, bounded, and non-crashing.
- Run Repository Audit and V7 Embodied Covenant workflows after the fixes.

---

### Task 1: Boss phase authority boundary

**Files:**
- Modify: `scripts/boss-controllers.mjs`
- Modify: `src/systems/game.js`
- Modify: `src/presentation/system.js`

**Interfaces:**
- Consumes: `BossController.update(enemy, ...)`, `GameEngine._updateBossPhase(enemy)`.
- Produces: gameplay-owned `enemy.phaseTransition`, `enemy.windupLeft`, `enemy.telegraph`, and `enemy.state`; presentation only emits cues.

- [ ] **Step 1: Write a failing regression**

Extend `scripts/boss-controllers.mjs` so a phase transition is triggered without constructing `GamePresentationSystem`, then assert `phaseTransition > 0`, `windupLeft === 0`, `telegraph === null`, and `state === 'phase-transition'`.

- [ ] **Step 2: Run the focused regression and confirm RED**

Run: `node scripts/boss-controllers.mjs`
Expected before fix: phase number changes, but gameplay intermission state is absent without presentation.

- [ ] **Step 3: Move phase-transition state mutation into gameplay**

In `GameEngine._updateBossPhase`, when a real phase change occurs, assign the phase intermission state from `BossController` before emitting the legacy presentation event. Remove the corresponding mutations from the `legacy:boss-phase` listener in `src/presentation/system.js`.

- [ ] **Step 4: Re-run focused regression**

Run: `node scripts/boss-controllers.mjs`
Expected: PASS both with and without presentation.

### Task 2: Cinematic duck release on forced reset

**Files:**
- Modify: `scripts/presentation-overhaul.mjs`
- Modify: `src/presentation/system.js`

**Interfaces:**
- Produces: `CinematicPresentationController.resetTransient(game)` that releases `music:duck` when an active cinematic is forcibly cleared.

- [ ] **Step 1: Write a failing regression**

Start a cinematic, register a `music:duck` listener, invoke `resetTransient(game)`, and assert the last duck event has `{ active: false, amount: 1 }` and cinematic state is inactive.

- [ ] **Step 2: Confirm RED**

Run: `node scripts/presentation-overhaul.mjs`
Expected before fix: cinematic state clears but no release event is emitted.

- [ ] **Step 3: Implement forced-release semantics**

Make `resetTransient(game)` emit the same duck release as normal end when it clears an active cinematic. Keep it non-completing and do not emit a normal cinematic completion event.

- [ ] **Step 4: Re-run regression**

Run: `node scripts/presentation-overhaul.mjs`
Expected: PASS.

### Task 3: Animation semantic precedence

**Files:**
- Modify: `scripts/v7-animation-contract.mjs`
- Modify: `src/presentation/animation-clips-v7.js`

**Interfaces:**
- Produces deterministic precedence: death > knockdown > execution > stagger reaction > dodge/rise/actions > locomotion.

- [ ] **Step 1: Write overlap regressions**

Assert execution wins when both `execution` and `staggered` are true; death remains absolute; knockdown remains above execution.

- [ ] **Step 2: Confirm RED**

Run: `node scripts/v7-animation-contract.mjs`
Expected before fix: execution+stagger resolves to a hit reaction.

- [ ] **Step 3: Reorder semantic resolution**

Move execution ahead of stagger while keeping death and knockdown ahead of execution.

- [ ] **Step 4: Re-run regression**

Run: `node scripts/v7-animation-contract.mjs`
Expected: PASS.

### Task 4: Actor-specific combat context

**Files:**
- Modify: `scripts/v7-context-regression.mjs` or the existing v7 combat-context regression file found in `package.json`
- Modify: `src/presentation/combat-context-v7.js`

**Interfaces:**
- Produces: enemy/boss/Hunter contexts that do not inherit player equipment, player weapon/offhand, player class/hybrid, or player Covenant identity as actor-owned fields.

- [ ] **Step 1: Add a failing enemy-actor regression**

Resolve context for a spawned enemy while the player has distinctive equipment/Covenant state. Assert actor-owned equipment/signature/masterwork/corruption fields are empty/neutral and enemy role/boss/Hunter identity comes from the actor.

- [ ] **Step 2: Confirm RED**

Run the focused v7 context script.
Expected before fix: enemy context contains player loadout-derived values.

- [ ] **Step 3: Split player-owned world context from actor-owned presentation identity**

Only populate class/hybrid/equipment/weapon/offhand/Covenant actor fields when `actor === game.player`. Keep world region/settings and explicitly supplied event detail available for every actor.

- [ ] **Step 4: Re-run focused regression**

Expected: PASS.

### Task 5: Rear equipment layer path

**Files:**
- Modify: `scripts/v7-equipment-resolver.mjs`
- Modify: `src/presentation/equipment-appearance-v7.js`

**Interfaces:**
- Produces: bounded order-2 rear layers for weapon/offhand silhouettes when applicable, leaving signatures and front overlays in later passes.

- [ ] **Step 1: Add a failing layer-order regression**

Equip a weapon/offhand and assert the resolved appearance includes at least one body-relative rear layer at order 2 while front equipment/signatures remain at their intended orders.

- [ ] **Step 2: Confirm RED**

Run: `node scripts/v7-equipment-resolver.mjs`

- [ ] **Step 3: Add deterministic rear layer generation**

Generate rear weapon/offhand layers from the existing equipment manifest without adding inventory scans to the renderer.

- [ ] **Step 4: Re-run equipment regressions**

Run the resolver and renderer scripts. Expected: PASS.

### Task 6: Runtime validator budget alignment

**Files:**
- Modify: the focused presentation validator regression
- Modify: `src/presentation/validator.js`

- [ ] **Step 1: Add a regression for the current v7 SFX voice budget**

Assert the validator warning threshold matches the actual configured v7 soundscape budget rather than the retired fixed value of 32.

- [ ] **Step 2: Confirm RED, update the validator from the authoritative budget, then confirm GREEN**

Do not duplicate a magic number if an exported budget constant exists; otherwise introduce one in the presentation/audio authority and consume it in validation.

### Task 7: Complete repository source audit

**Files:**
- Inspect: every tracked code/text file under `src/`, `scripts/`, `desktop/`, `launchers/`, `.github/`, root JS/JSON/HTML/CSS/config files.
- Modify only files with reproduced defects.
- Extend `scripts/repository-audit.mjs` or the existing line-audit script if an uncovered defect class is found.

- [ ] **Step 1: Enumerate every tracked source/text file from the repository tree**

Exclude generated binary assets from semantic line review, but verify their references through the asset audit.

- [ ] **Step 2: Review every executable source line by subsystem**

Check numeric finiteness/bounds, nullability, array/object shape assumptions, state ownership, mutation during iteration, resource cleanup, event recursion, save migration idempotency, stale cache keys, combat timing, input/cancel windows, geometry, loot/pity, boss/hunter state, UI rendering safety, audio lifetimes, file-protocol behavior, build/package scripts, and workflow correctness.

- [ ] **Step 3: For every newly confirmed bug, use the same RED → minimal fix → GREEN cycle**

Do not change suspicious code without a reproducible invariant or failing test.

- [ ] **Step 4: Strengthen repository audit coverage for any new defect class**

The resulting audit must read/validate every tracked code/text file and fail on the newly discovered regression pattern.

### Task 8: Full verification and branch completion

- [ ] **Step 1: Run focused regressions for every modified subsystem**
- [ ] **Step 2: Run `npm test` and `npm run test:v6`**
- [ ] **Step 3: Run build, file-protocol, dependency, static-integrity, class-matrix, and Windows packaging gates**
- [ ] **Step 4: Verify both GitHub Actions workflows are green on the final commit**
- [ ] **Step 5: Review the PR diff for accidental scope creep and leave PR #3 draft until the remaining v7 Combat Soundscape phase is complete.**
