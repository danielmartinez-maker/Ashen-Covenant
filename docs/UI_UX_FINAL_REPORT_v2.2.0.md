# Ashen Covenant v2.2.0 — Covenant Interface Report

## Outcome

Version 2.2.0 replaces the collection of disconnected modal screens with a cohesive desktop game interface while retaining the exact v2.1.0 gameplay, content, save model, and presentation pipeline. The dark-fantasy art direction remains intact; hierarchy, navigation, feedback, accessibility, and deep-system retrieval have been rebuilt around it.

The starting point was the verified v2.1.0 source archive with SHA-256 `d40d19e2aa37b0e782a7ab890dd2e122ccbacb783f73a84664c93f56e8447fc0`. Its 22 regression suites passed before implementation. Save snapshot version 13 and all migration behavior remain unchanged.

## What changed

### Title and onboarding

- Split title composition separates world identity, continuation, and covenant creation.
- Continue now summarizes hybrid, level, zone, paired classes, and save recency.
- Primary Oath → Companion Oath → Hybrid Covenant is visible as a three-step flow.
- No oath is preselected; the start action is unavailable until the pairing is complete.
- The resulting hybrid passive and major actions are shown before commitment.

### Combat HUD

- Urgent vitals, objectives, boss state, minimap, tracked work, system navigation, abilities, and supporting combat state occupy distinct zones.
- Eight ability slots expose adaptive bindings, potion quantity, numeric cooldowns, and ready states.
- Low-health and Confluence-ready states have explicit treatments.
- Full, Focused, and Minimal density modes, opacity, minimap, hints, and UI scale are persisted.

### Covenant Hub

- Atlas, Journal, Skills, Journey, Relics, Chronicle, Contracts, and Settings share a persistent rail and page shell.
- Current page, ready-choice badges, resources, footer prompts, scroll memory, keyboard shortcuts, and controller movement are consistent everywhere.
- Settings is rebuilt into Session, Interface, Audio, Soundtrack, Accessibility, and Controls panels.

### Navigation and accessibility

- Directional gamepad navigation follows screen geometry instead of raw DOM order.
- Modal focus is initialized, trapped, and restored; background surfaces are isolated from assistive technology.
- Prompts change automatically between keyboard/mouse and gamepad.
- The complete gamepad combat map now includes Companion, Hybrid, Flask, Ultimate, Interact, Relics, and Pause.
- Visible focus, semantic progress values, dialog roles, live feedback, reduced motion, reduced flashing, high contrast, and applied UI scaling are covered by the interface layer.

### Relics, safety, and feedback

- Pack and Stash support live search, rarity and slot filters, result counts, and equipped-item comparison.
- Salvage, Aspect extraction, and contract abandonment share a contextual confirmation flow.
- Tooltips are bounded and purpose-specific; repeated notifications deduplicate into a capped toast stack.

## Implementation map

New modules and verification:

- `src/ui/icons.js` — original inline SVG icon set.
- `src/ui/focus.js` — modal lifecycle and spatial focus navigation.
- `scripts/ui-ux-overhaul.mjs` — permanent v2.2 interaction and persistence regression suite.
- `docs/UI_UX_AUDIT_v2.1.0.md` — baseline findings and constraints.
- `docs/UI_UX_DESIGN_SYSTEM_v2.2.0.md` — tokens, architecture, patterns, breakpoints, and authoring rules.

Primary updates:

- `src/ui/ui.js` — title, HUD, Hub, settings, inventory, confirmations, adaptive prompts, tooltips, and toasts.
- `src/styles.css` — tokenized visual system, component states, responsive rules, high contrast, and reduced motion.
- `src/systems/input.js` — complete gamepad map and last-input detection.
- `src/systems/save.js` — normalized persisted interface settings.
- `scripts/presentation-ui.mjs` and `scripts/visual-capture.cjs` — updated UI invariants and capture states.
- `README.md`, `package.json`, and `package-lock.json` — release documentation and version 2.2.0.

## Verification

- All 23 regression scripts pass, including the new v2.2 suite.
- Production Vite build passes.
- Production dependency audit (`npm audit --omit=dev`) reports zero vulnerabilities.
- Rendered screenshots cover title, completed pairing, gameplay HUD, Atlas, Journey, Relics, Chronicle, Contracts, Settings, and compact 1000×700 HUD/Relics layouts.
- No inspected screen produces horizontal document or body overflow.
- Intentional long pages remain vertically scrollable inside the Hub content viewport.
- UI work remains DOM/CSS-side; the Canvas2D actor-render path is unchanged.

Presentation stress profile after the overhaul:

| Measure | Result |
|---|---:|
| Stress actors | 241 |
| Active animators | 178 |
| Average presentation tick | 0.0543 ms |
| 95th percentile | 0.1164 ms |
| Maximum observed tick | 2.6622 ms |
| Average audio tick | 0.0044 ms |
| 95th percentile audio tick | 0.0087 ms |
| Heap change | +0.474 MiB |
| Peak music voices | 16 |
| Audio underruns | 0 |

## Release notes

The Windows package remains an unsigned x64 Electron folder build. Extract the complete folder and launch `Ashen Covenant.exe`; its adjacent `resources` folder must remain in place. Windows SmartScreen may display an unsigned-app warning.

The release intentionally does not add a PWA, browser-install flow, or touch controls. Current music remains original procedural placeholder production content, consistent with v2.1.0 documentation.
