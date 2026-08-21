# Ashen Covenant v2.1.0 UI/UX Audit

## Audit scope

This audit covers the exact v2.1.0 “Ash & Overture” source archive whose SHA-256 is `d40d19e2aa37b0e782a7ab890dd2e122ccbacb783f73a84664c93f56e8447fc0`. The baseline production build succeeds and all 22 shipped regression scripts pass before UI/UX work begins.

The review includes the title and covenant-creation flow, combat HUD, ability bar, objectives, tracked contracts, boss presentation, map, Journal, Skills, Journey and Paragon, Inventory and Forge, Chronicle, Contracts and Operations, pause/settings, death and campaign-choice panels, keyboard/mouse input, controller input, focus behavior, settings persistence, accessibility, and resolution behavior.

## What already works

- The dark-fantasy palette, serif display typography, painted campaign art, and bone/gold/ember accents are cohesive.
- Every major game system has a usable player-facing surface.
- Inventory is inspection-first instead of presenting an undifferentiated wall of actions.
- Important game states already expose ARIA labels, visible keyboard focus, and native controls.
- Full-screen panels pause single-player gameplay and Escape closes ordinary panels immediately.
- Class selection never silently preselects an oath.
- Save restoration is failure-safe and gameplay state remains authoritative.
- HUD and overlay rendering are independent from the Canvas2D world renderer.

## Primary usability problems

### 1. The application shell does not scale with system depth

Almost every system is rendered inside the same centred modal card. Journey, Paragon, Chronicle, Forge, Contracts, map, campaign, and settings have different information architectures but share no persistent navigation or orientation. Players must close one panel, remember a keyboard shortcut, and open another panel to compare related systems.

### 2. Combat HUD hierarchy is crowded

The entire top edge combines map, identity, level progress, health, resource, Barrier, Resonance, Fated effects, endgame state, six system buttons, and pause. This competes with enemy telegraphs and makes the most urgent values no more visually prominent than secondary system links.

### 3. Controller navigation is linear

D-pad input moves through the DOM order one item at a time. A grid visually presented in three columns behaves as one long list. Focus can travel a large distance from the player’s intended direction, especially in class selection, inventory, Chronicle, and Paragon.

### 4. Focus lifecycle is incomplete

Opening a panel does not guarantee a meaningful initial focus target. Focus is not trapped inside modal content, and closing a panel does not restore focus to the control that opened it. Background title/HUD controls remain available to assistive technology while a modal is active.

### 5. Saved UI scale has no effect

`uiScale` is normalized and persisted, but it is never applied to the rendered interface. The game also lacks a high-contrast UI mode, HUD-density choice, configurable HUD opacity, minimap toggle, and persistent control-hint preference.

### 6. Input prompts are static

The ability bar and help text always display keyboard/mouse bindings, even after a gamepad becomes active. The current gamepad map also omits the Companion action and does not expose a complete eight-action combat layout.

### 7. Feedback is present but shallow

Cooldowns use only a dark cover with no numeric countdown or ready state. Potion quantity is not shown on its slot. Toasts have no iconography, hierarchy, deduplication, or capped stack. Low-health and fully charged Confluence states lack clear HUD treatments.

### 8. Dense screens lack retrieval tools

Inventory supports sorting but no search, rarity filter, slot filter, or equipped-item comparison. Long panels rely on scrolling without a persistent global section rail or a reliable current-location indicator.

### 9. Destructive actions are inconsistent

Starting a replacement covenant is confirmed, but salvaging an item, extracting an Aspect, and abandoning a contract happen immediately. The UI needs a shared confirmation pattern that keeps the player in context after cancel or completion.

### 10. Title flow mixes branding, onboarding, and save continuation

The title screen gives an existing covenant and a brand-new character equal visual weight, while the primary-versus-secondary meaning of class order is explained mainly in body copy. The pairing flow needs a visible three-step model and a richer continuation summary.

## Overhaul direction

The v2.2.0 interface will preserve the existing dark palette, painted art, gameplay systems, data attributes, action routing, save format, and game-state authority while replacing the UI shell.

The implementation will add:

- A reusable design-token layer and consistent icon language.
- A split title/creation layout with save summary and Primary → Companion → Hybrid stepper.
- A distributed combat HUD with urgent vitals separated from system navigation.
- A persistent in-panel Covenant Hub rail for Map, Journal, Skills, Journey, Inventory, Chronicle, Contracts, and Settings.
- Spatial controller navigation, focus trap, focus restoration, and background isolation.
- Automatic keyboard/mouse and gamepad glyph switching.
- Numeric cooldowns, ready states, potion count, low-health state, and Confluence-ready state.
- Applied UI scaling, HUD detail, HUD opacity, high contrast, minimap, and hint preferences.
- Inventory search, rarity/slot filtering, counts, and equipped-item comparison.
- Shared confirmation UX for destructive item and contract actions.
- A structured, capped notification stack.
- New automated UI/UX, accessibility, focus, input-mode, and responsive-structure tests.

## Constraints

- Preserve save version 13 and all existing save migrations.
- Preserve all gameplay APIs and data-driven content.
- Preserve the 22 baseline regression suites.
- Do not add a web/PWA installation path or touch controls.
- Keep presentation-debug controls release-gated.
- Do not increase Canvas2D world-render cost; the overhaul must remain DOM/CSS-side.
- Do not claim controller, accessibility, or resolution behavior without automated checks and rendered inspection where the environment permits it.
