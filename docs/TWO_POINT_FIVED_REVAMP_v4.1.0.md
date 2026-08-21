# Ashen Covenant: The Black Road 4.1.0 — 2.5D revamp

This release turns the live battlefield from a prototype-map presentation into a painted, animated 2.5D action space.

- Four generated enemy-motion sheets supply idle, locomotion, wind-up, and hit/death frames for every bestiary template.
- A six-cell terrain atlas paints the full overworld, while generated entrance, world-prop, NPC, and fixed-facing hero atlases replace live actor and landmark placeholders.
- Player and enemies now carry elevation, vertical velocity, and grounded state. Dodges, pounces, heavy attacks, staggers, and hits can lift a body; a shared gravity pass resolves the landing.
- Player and enemy bodies turn in discrete 45-degree steps, and heroes render only from authored three-quarter-facing frames. Combat still aims in the play plane without allowing a flat 360-degree sprite rotation.
- Startup and packaged file-protocol checks require the new atlas set. A missing actor asset fails closed rather than reviving geometric fallback art.
