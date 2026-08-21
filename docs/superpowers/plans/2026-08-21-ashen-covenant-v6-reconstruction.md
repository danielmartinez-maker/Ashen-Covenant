# Ashen Covenant v6 Reconstruction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Reconstruct and finish the approved Ashen Covenant v6 system overhaul from the verified v5.0.1 baseline after the prior ephemeral worktree reset.

**Architecture:** Preserve Renderer, WorldGeometrySystem, InputManager, AudioDirector, UI shell, Black Road lifecycle, and existing data contracts. Add focused domain systems behind GameEngine and migrate behavior incrementally. New save schema is v19 with one-release legacy compatibility.

**Tech Stack:** ES modules, Canvas2D, DOM/CSS, Node regression scripts, Vite/Electron packaging when dependencies are available.

**Spec:** `docs/superpowers/specs/2026-08-20-ashen-covenant-system-overhaul-design.md`

## Global Constraints
- Existing valid v5.0.1/v18 saves remain loadable.
- Existing `npm run test:core` remains a hard gate.
- Black Road lifecycle and explicit Sanctuary return remain intact.
- Six base classes and fifteen hybrids remain.
- No multiplayer, PvP, mounts, new base classes, or renderer rewrite.
- Covenant Metamorphosis must affect mechanics and presentation, not only stats/cosmetics.
- GameEngine remains facade/composition root; new systems must not import GameEngine.

---

### Task 1: Domain events + v19 save migration
Create `src/systems/domain-events.js`, `src/systems/save-migrator.js`, test `scripts/save-v19-migration.mjs`, integrate constructor/restore/snapshot.

### Task 2: Covenant Metamorphosis
Create `src/systems/covenant.js`, test `scripts/covenant-metamorphosis.mjs`; six affinities, behavior ledger, instability, thresholds, dual states, derived effects, World Torment labels.

### Task 3: Ability mutations + progression consolidation
Create `src/data/ability-mutations.js`, `src/systems/abilities.js`, `src/systems/progression-v6.js`; tests `scripts/ability-mutations.mjs`, `scripts/progression-consolidation.mjs`; 4-6 mutations across 30 primary combat actions and canonical mutation credits/selections.

### Task 4: Combat normalization
Create `src/systems/combat.js`, test `scripts/combat-hit-context.mjs`; mass/poise/guard/impulse/knockdown/execution contract and integrate final enemy hit response.

### Task 5: Faction doctrines + Hunters
Create `src/systems/enemy-director.js`, `src/systems/hunters.js`; tests `scripts/faction-doctrine.mjs`, `scripts/hunter-system.mjs`; throttled doctrine coordination and persistent adaptive Hunters.

### Task 6: Authored boss controller
Create `src/data/bosses-v6.js`, `src/systems/boss-controller.js`, test `scripts/boss-controller.mjs`; authored mechanic schedules, punish windows, Covenant variants.

### Task 7: Behavior-driven loot/equipment presentation
Create `src/systems/loot.js`, `src/data/unique-behaviors.js`, test `scripts/unique-behavior.mjs`; executable hooks, eligibility, target weighting, presentation keys.

### Task 8: Persistent regional world simulation
Create `src/systems/world-state.js`, test `scripts/living-world.mjs`; Blood Moon, Gravewake Rising, Black Procession, persistence, regional modifiers, Black Road pressure.

### Task 9: Living Sanctuary
Create `src/systems/sanctuary.js`, test `scripts/sanctuary-state.mjs`; services, merchants, NPC/architecture state, quest hooks, persistence.

### Task 10: Black Road + Eclipse integration
Create route context helpers and test `scripts/endgame-covenant-integration.mjs`; freeze Covenant/world/Eclipse context, Hunter window, Metamorphosis midpoint, boss variant, target reward, reload stability.

### Task 11: Metamorphosis UI + presentation/audio integration
Create UI snapshot facade/presentation helpers, test `scripts/metamorphosis-ui.mjs`, `scripts/covenant-presentation.mjs`; Hub page, Atlas markers, player stages, VFX/audio families.

### Task 12: GameEngine boundary cleanup
Test `scripts/architecture-boundaries.mjs`; delegate Covenant/loot/world/boss/Hunter rules and freeze runtime facade.

### Task 13: Final v6 release gate
Add `scripts/v6-performance.mjs`, `scripts/v6-migration-matrix.mjs`, aggregate `test:v6`, run repeated gates, update docs/version to 6.0.0 only after green, package source archive and persist to `/Projects/Ashen Covenant`.
