# Ashen Covenant Interface System v2.2.0

## Experience principles

1. **Combat owns the centre.** Urgent status lives at the edges and never competes with telegraphs around the player.
2. **One covenant, one hub.** Deep systems share a persistent rail, page identity, resources, close behavior, and remembered scroll position.
3. **Choice before commitment.** Oaths are not preselected; dangerous actions explain their consequence and require confirmation.
4. **Input follows the player.** Prompts and navigation respond to the last active keyboard/mouse or gamepad input.
5. **State is visible.** Readiness, cooldown, danger, selection, progress, focus, and disabled states do not rely on color alone.

## Foundation

### Color tokens

| Token | Value | Use |
|---|---:|---|
| Ink | `#090b0e` | Canvas surround, deepest panels, modal isolation |
| Slate | `#192126` | Elevated surfaces and cards |
| Bone | `#d8d0bd` | Primary copy and display typography |
| Gold | `#d5ad67` | Selection, progress, primary actions |
| Ember | `#ef8d45` | Momentum, warnings, active combat energy |
| Wound | `#cd5857` | Health danger and destructive actions |
| Veil | `#62cabb` | Resolve, positive state, companion cues |
| Lilac | `#9c86d7` | Focus, hybrid magic, secondary oath |
| Fog | `#7894a0` | Secondary text and quiet controls |

Dark translucent surfaces retain the painted world as context. Text and icon states add shape, labels, borders, or motion so meaning is not color-only.

### Type and rhythm

- Georgia provides covenant names, page titles, item identity, and authored fantasy tone.
- The system sans-serif stack carries interface copy, data, controls, and compact status.
- Uppercase micro-labels use strong tracking for hierarchy, not for long copy.
- The base interface scale is user-controlled from 85% to 120% and applied at the root.
- Spacing follows a compact 4/8/12/16/24/32-pixel rhythm, with touch-sized controls where density permits.

### Elevation

- World HUD: translucent, high-blur edge cards.
- Hub shell: opaque-enough slate surface with a fine bone border.
- Inspector and system cards: one nested level, never a second modal.
- Confirmation: focused dialog above an isolated and inert background.
- Tooltip and toast: topmost non-modal feedback layers with bounded placement.

## Application architecture

### Title and covenant creation

The title screen uses a two-column composition: identity and continuation on the left; covenant creation on the right. Creation is an explicit sequence:

1. Primary Oath — weapon and core kit.
2. Companion Oath — technique and build direction.
3. Hybrid Covenant — combined identity, passive, signature, ultimate, and progression.

The start action remains disabled until two distinct oaths are selected. A returning player sees hybrid, level, zone, class pair, and relative save time before continuing.

### Combat HUD

| Zone | Contents | Priority |
|---|---|---|
| Top left | Oath identity, health, class resource | Critical |
| Left | Current campaign path | High |
| Top centre/right | Hub access, minimap, tracked writ | Medium |
| Centre top | Boss identity and health, when present | Critical |
| Bottom centre | Eight combat actions, quantities, cooldowns | Critical |
| Bottom edge | Barrier, Resonance, Fated state, contextual hints | Supporting |

Full, Focused, and Minimal HUD modes progressively remove supporting detail. HUD opacity, minimap, and control hints are independent preferences.

### Covenant Hub

Atlas, Journal, Skills, Journey, Relics, Chronicle, Contracts, and Settings share:

- A persistent icon-and-label rail with current-page state and ready-choice badges.
- A compact header for page identity and character resources.
- A single content viewport with per-page scroll memory.
- A footer with directional, select, and back prompts.
- Direct keyboard shortcuts: `M`, `L`, `K`, `P`, `I`, `H`, `O`; `Esc` closes or resumes.

At narrower widths the rail becomes icon-first and the content grid collapses without introducing horizontal document scrolling.

## Interaction patterns

### Focus and controller navigation

- Opening a modal records the invoking element and moves focus to the first meaningful control.
- `Tab` and `Shift+Tab` wrap inside the active modal.
- D-pad movement chooses the nearest eligible element in the requested physical direction.
- Closing restores focus when the invoker still exists.
- Background title and HUD surfaces are hidden from the accessibility tree while a modal is active.
- Every interactive element has a visible `:focus-visible` treatment.

### Adaptive prompts

The last meaningful input determines displayed glyphs. The gamepad combat map is:

| Action | Gamepad |
|---|---|
| Attack | A |
| Dodge | B |
| Core skills | X / Y |
| Companion | LB |
| Hybrid | RB |
| Flask | LT |
| Ultimate | RT |
| Interact | Left-stick press |
| Relics / Pause | View / Menu |

### Feedback

- Ability slots expose key/glyph, quantity, cooldown seconds, and ready state.
- Low health and full Confluence have explicit HUD states.
- Tooltips are custom, bounded to the viewport, and omitted when visible card copy already explains the control.
- Toasts are capped, deduplicated, timed, and use semantic accent variants.
- Destructive confirmations state the object and consequence, with the safer action available alongside confirmation.

### Relics and inventory

Relics retain the Loadout / Forge / Codex model. Pack and Stash add live search, rarity and slot filters, result counts, sorting, a persistent inspector, and comparison against the equipped item in that slot. Selection and filter state survive rerenders within the open Hub page.

## Accessibility and preferences

Persisted interface settings include UI scale, HUD mode, HUD opacity, high contrast, minimap visibility, control hints, reduced interface/camera motion, reduced flashing, simplified effects, camera shake, impact pause, controller aim assist, graphics quality, auto-pickup, and independent audio behavior.

Native buttons, inputs, selects, progress semantics, dialog roles, ARIA labels, pressed/current states, live regions, and focus management form the accessibility baseline. Reduced-motion media preferences suppress decorative transitions even before the in-game preference is changed.

## Responsive behavior

- **1320 px and below:** HUD and dense grids compress; secondary text is reduced before controls.
- **1050 px and below:** Hub rail becomes compact, inventory becomes single-column, HUD navigation becomes vertical, and nonessential labels hide.
- **760 px and below:** title columns stack, class and settings grids collapse, and the Hub becomes a compact shell with scrollable content.
- **480 px and below:** minimum spacing and type sizes are used while preserving visible focus and reachable actions.

The product remains a keyboard/mouse and gamepad desktop game. The responsive rules protect window resizing and lower desktop resolutions; they do not add touch controls or a PWA path.

## Authoring rules

- Reuse `uiIcon()` instead of Unicode stand-ins when an interface icon exists.
- Route full-system surfaces through the Covenant Hub; reserve standalone dialogs for short decisions, death, and campaign conversations.
- Add new modal controls to semantic DOM order and verify spatial navigation in their rendered grid.
- Add destructive operations through the shared confirmation path.
- Add persistent interface preferences to save normalization and `applyUiPreferences()`.
- Keep world-render work in Canvas2D and interface work in DOM/CSS so UI growth does not increase actor-render cost.
