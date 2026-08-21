import { WORLD_SIZE } from '../core/constants.js';

// The six authored terrain plates now tile the complete playable world.  The
// old regions were small encounter islands surrounded by unpainted void; the
// visible world is deliberately contiguous so every step stays inside a
// painted place.  `encounter` preserves the tighter authored centres for
// ambient campaign packs while exploration, world events, and the map use the
// full region bounds.
export const ZONES = [
  {
    id: 'sanctuary', name: 'Ashen Sanctuary', x: 0, y: 0, width: 1050, height: 1110, color: '#31444b', level: 1, safe: true,
    terrain: '/assets/terrain/sanctuary-v2.png', terrainIndex: 0, encounter: { x: 330, y: 320, width: 690, height: 570 },
    description: 'A wounded refuge where oathbound exiles gather.'
  },
  {
    id: 'gravewake', name: 'Gravewake Fields', x: 1050, y: 0, width: 1210, height: 1110, color: '#4f5748', level: 1,
    terrain: '/assets/terrain/gravewake-v2.png', terrainIndex: 1, encounter: { x: 1090, y: 250, width: 1050, height: 720 },
    description: 'Bell-marked fields where the dead still answer old roads.'
  },
  {
    id: 'redfen', name: 'The Redfen', x: 2260, y: 0, width: 1580, height: 1110, color: '#653d48', level: 6,
    terrain: '/assets/terrain/redfen-v2.png', terrainIndex: 2, encounter: { x: 2380, y: 230, width: 1160, height: 760 },
    description: 'A drowning mire swollen with blood thorns and drowned vows.'
  },
  {
    id: 'cairnreach', name: 'Cairnreach', x: 0, y: 1110, width: 1430, height: 1410, color: '#555c62', level: 10,
    terrain: '/assets/terrain/cairnreach-v2.png', terrainIndex: 3, encounter: { x: 380, y: 1180, width: 970, height: 970 },
    description: 'Collapsed fortifications contested by ironbound dead.'
  },
  {
    id: 'veiled-road', name: 'The Veiled Road', x: 1430, y: 1110, width: 1200, height: 1410, color: '#403d61', level: 15,
    terrain: '/assets/terrain/veiled-road-v2.png', terrainIndex: 4, encounter: { x: 1510, y: 1170, width: 980, height: 1030 },
    description: 'A broken path of hidden gates, rifts, and shadow couriers.'
  },
  {
    id: 'bellscar', name: 'Bellscar Citadel', x: 2630, y: 1110, width: 1210, height: 1410, color: '#6a3c3f', level: 20,
    terrain: '/assets/terrain/bellscar-v2.png', terrainIndex: 5, encounter: { x: 2670, y: 1200, width: 820, height: 980 },
    description: 'The Abbot tolls beneath a shattered cathedral bell.'
  }
];

export const LANDMARKS = [
  { id: 'maelin', zoneId: 'sanctuary', x: 838, y: 550, kind: 'campaign', label: 'Sister Maelin', hint: 'Speak with the keeper of the Ashen Gate', campaignStage: 'meet-maelin' },
  { id: 'board', zoneId: 'sanctuary', x: 700, y: 500, kind: 'endgame', label: 'Covenant Board', hint: 'Open endgame activity board' },
  { id: 'forge', zoneId: 'sanctuary', x: 500, y: 640, kind: 'forge', label: 'Cinder Forge', hint: 'Reforge one item affix' },
  { id: 'gravewake-waystone', zoneId: 'gravewake', x: 1230, y: 590, kind: 'campaign', label: 'Gravewake Waystone', hint: 'Examine the bell-marked stone', campaignStage: 'reach-waystone' },
  { id: 'trial', zoneId: 'cairnreach', x: 830, y: 1660, kind: 'stronghold', label: 'Cairnreach Stronghold', hint: 'Reclaim this fortress' },
  { id: 'bell-gate', zoneId: 'bellscar', x: 2775, y: 1660, kind: 'campaign', variant: 'gate', label: 'Bellscar Gate', hint: 'Cross into the drowned cathedral road', campaignStage: 'enter-bellscar' },
  { id: 'golden-choir', zoneId: 'bellscar', x: 2870, y: 1390, kind: 'campaign', variant: 'seal-gold', label: 'Golden Choir Seal', hint: 'Break the seal of obedience', campaignStage: 'break-choir-seals' },
  { id: 'ashen-choir', zoneId: 'bellscar', x: 3310, y: 1460, kind: 'campaign', variant: 'seal-ash', label: 'Ashen Choir Seal', hint: 'Break the seal of grief', campaignStage: 'break-choir-seals' },
  { id: 'hollow-choir', zoneId: 'bellscar', x: 3030, y: 1925, kind: 'campaign', variant: 'seal-hollow', label: 'Hollow Choir Seal', hint: 'Break the seal of forgotten names', campaignStage: 'break-choir-seals' },
  { id: 'reliquary-names', zoneId: 'bellscar', x: 3125, y: 1735, kind: 'campaign', variant: 'reliquary', label: 'Reliquary of Names', hint: 'Decide the fate of the broken choir', campaignStage: 'choose-the-toll' },
  { id: 'abbot-vault', zoneId: 'bellscar', x: 3370, y: 1685, kind: 'campaign', variant: 'vault', label: 'Bell Vault', hint: 'Challenge Rath Vell, the Tolling Abbot', campaignStage: 'defeat-tolling-abbot' },

  // Regional waystones turn the painted world into a place that can be
  // revisited deliberately instead of a single eastward run.
  { id: 'waypoint-sanctuary', zoneId: 'sanctuary', x: 760, y: 760, kind: 'waypoint', label: 'Sanctuary Waystone', hint: 'Attune this road anchor' },
  { id: 'waypoint-gravewake', zoneId: 'gravewake', x: 1890, y: 900, kind: 'waypoint', label: 'Widow’s Mile Waystone', hint: 'Attune this road anchor' },
  { id: 'waypoint-redfen', zoneId: 'redfen', x: 3090, y: 905, kind: 'waypoint', label: 'Redfen Waystone', hint: 'Attune this road anchor' },
  { id: 'waypoint-cairnreach', zoneId: 'cairnreach', x: 1190, y: 2260, kind: 'waypoint', label: 'Cairnreach Waystone', hint: 'Attune this road anchor' },
  { id: 'waypoint-veiled-road', zoneId: 'veiled-road', x: 2320, y: 2280, kind: 'waypoint', label: 'Moonless Waystone', hint: 'Attune this road anchor' },
  { id: 'waypoint-bellscar', zoneId: 'bellscar', x: 3660, y: 2290, kind: 'waypoint', label: 'Bellscar Waystone', hint: 'Attune this road anchor' },

  // Five strongholds create a regional liberation path rather than one
  // isolated Cairnreach event.
  { id: 'mourner-redoubt', zoneId: 'gravewake', x: 2090, y: 780, kind: 'stronghold', label: 'Mourner’s Redoubt', hint: 'Reclaim the field fortification' },
  { id: 'redfen-sluicehold', zoneId: 'redfen', x: 3490, y: 830, kind: 'stronghold', label: 'Scarlet Sluicehold', hint: 'Reclaim the floodgate bastion' },
  { id: 'mirror-garrison', zoneId: 'veiled-road', x: 2380, y: 1980, kind: 'stronghold', label: 'Mirror Garrison', hint: 'Reclaim the courier fortress' },
  { id: 'lower-belfry-hold', zoneId: 'bellscar', x: 3540, y: 2110, kind: 'stronghold', label: 'Lower Belfry Hold', hint: 'Reclaim the shattered tower' },

  // Ten authored delve entrances use the existing painted terrain as their
  // exterior while opening a distinct wave route and boss.
  { id: 'delve-ossuary-steps', delveId: 'ossuary-steps', zoneId: 'gravewake', x: 1420, y: 830, kind: 'delve', label: 'Ossuary Steps', hint: 'Enter the regional delve' },
  { id: 'delve-widows-bell', delveId: 'widows-bell', zoneId: 'gravewake', x: 2140, y: 330, kind: 'delve', label: 'Widow’s Bell', hint: 'Enter the regional delve' },
  { id: 'delve-bloodroot-hollow', delveId: 'bloodroot-hollow', zoneId: 'redfen', x: 2480, y: 760, kind: 'delve', label: 'Bloodroot Hollow', hint: 'Enter the regional delve' },
  { id: 'delve-drowned-sanctum', delveId: 'drowned-sanctum', zoneId: 'redfen', x: 3680, y: 310, kind: 'delve', label: 'Drowned Sanctum', hint: 'Enter the regional delve' },
  { id: 'delve-chainworks-depths', delveId: 'chainworks-depths', zoneId: 'cairnreach', x: 390, y: 1730, kind: 'delve', label: 'Chainworks Depths', hint: 'Enter the regional delve' },
  { id: 'delve-burial-engine', delveId: 'burial-engine', zoneId: 'cairnreach', x: 1160, y: 1380, kind: 'delve', label: 'The Burial Engine', hint: 'Enter the regional delve' },
  { id: 'delve-mirror-vault', delveId: 'mirror-vault', zoneId: 'veiled-road', x: 1600, y: 1970, kind: 'delve', label: 'Mirror Vault', hint: 'Enter the regional delve' },
  { id: 'delve-night-road', delveId: 'night-road', zoneId: 'veiled-road', x: 2480, y: 1350, kind: 'delve', label: 'The Night Road', hint: 'Enter the regional delve' },
  { id: 'delve-lower-belfry', delveId: 'lower-belfry', zoneId: 'bellscar', x: 2760, y: 2290, kind: 'delve', label: 'Lower Belfry', hint: 'Enter the regional delve' },
  { id: 'delve-crypt-of-silence', delveId: 'crypt-of-silence', zoneId: 'bellscar', x: 3730, y: 1270, kind: 'delve', label: 'Crypt of Silence', hint: 'Enter the regional delve' },

  // Chronicle sites give exploration a persistent collection layer.
  { id: 'lore-first-ember', zoneId: 'sanctuary', x: 190, y: 240, kind: 'lore', label: 'Tablet of the First Ember', hint: 'Record this chronicle' },
  { id: 'lore-oath-ledger', zoneId: 'sanctuary', x: 900, y: 240, kind: 'lore', label: 'The Oath Ledger', hint: 'Record this chronicle' },
  { id: 'lore-empty-chair', zoneId: 'sanctuary', x: 230, y: 880, kind: 'lore', label: 'The Empty Keeper’s Chair', hint: 'Record this chronicle' },
  { id: 'lore-mourner-names', zoneId: 'gravewake', x: 1160, y: 180, kind: 'lore', label: 'Names of the First Mourners', hint: 'Record this chronicle' },
  { id: 'lore-clapperless-bell', zoneId: 'gravewake', x: 1810, y: 210, kind: 'lore', label: 'The Clapperless Bell', hint: 'Record this chronicle' },
  { id: 'lore-gallows-letter', zoneId: 'gravewake', x: 2200, y: 990, kind: 'lore', label: 'Letter from the Gallows', hint: 'Record this chronicle' },
  { id: 'lore-red-baptism', zoneId: 'redfen', x: 2370, y: 190, kind: 'lore', label: 'The Red Baptism', hint: 'Record this chronicle' },
  { id: 'lore-rootmother', zoneId: 'redfen', x: 3020, y: 450, kind: 'lore', label: 'Rootmother’s Litany', hint: 'Record this chronicle' },
  { id: 'lore-sluice-orders', zoneId: 'redfen', x: 3750, y: 980, kind: 'lore', label: 'Scarlet Sluice Orders', hint: 'Record this chronicle' },
  { id: 'lore-last-wall', zoneId: 'cairnreach', x: 150, y: 1300, kind: 'lore', label: 'The Last Wall', hint: 'Record this chronicle' },
  { id: 'lore-chain-census', zoneId: 'cairnreach', x: 690, y: 2380, kind: 'lore', label: 'Chainworks Census', hint: 'Record this chronicle' },
  { id: 'lore-crownless-cairn', zoneId: 'cairnreach', x: 1370, y: 1890, kind: 'lore', label: 'The Crownless Cairn', hint: 'Record this chronicle' },
  { id: 'lore-fifth-road', zoneId: 'veiled-road', x: 1510, y: 1270, kind: 'lore', label: 'Map of the Fifth Road', hint: 'Record this chronicle' },
  { id: 'lore-unopened-letter', zoneId: 'veiled-road', x: 2020, y: 2400, kind: 'lore', label: 'The Unopened Letter', hint: 'Record this chronicle' },
  { id: 'lore-mirror-oath', zoneId: 'veiled-road', x: 2590, y: 1780, kind: 'lore', label: 'Oath in the Mirror', hint: 'Record this chronicle' },
  { id: 'lore-first-choir', zoneId: 'bellscar', x: 2710, y: 1190, kind: 'lore', label: 'Roll of the First Choir', hint: 'Record this chronicle' },
  { id: 'lore-bell-foundry', zoneId: 'bellscar', x: 3250, y: 2380, kind: 'lore', label: 'Bell Foundry Testament', hint: 'Record this chronicle' },
  { id: 'lore-unrung-name', zoneId: 'bellscar', x: 3770, y: 1920, kind: 'lore', label: 'The Name Never Rung', hint: 'Record this chronicle' },

  // Campaign Acts III–V each use an entrance, three set-piece encounters, and
  // a named boss arena. Their state and completion are normalized in the
  // campaign data rather than inferred from transient enemies.
  { id: 'redfen-gate', zoneId: 'redfen', x: 2320, y: 550, kind: 'campaign', variant: 'gate', chapterId: 'chapter-three', nodeType: 'gate', label: 'Scarlet Sluice', hint: 'Enter the deep Redfen' },
  { id: 'blood-sigil-reed', zoneId: 'redfen', x: 2690, y: 290, kind: 'campaign', variant: 'seal-ash', chapterId: 'chapter-three', nodeType: 'node', label: 'Bloodreed Sigil', hint: 'Break the feeding sigil' },
  { id: 'blood-sigil-parish', zoneId: 'redfen', x: 3190, y: 790, kind: 'campaign', variant: 'seal-hollow', chapterId: 'chapter-three', nodeType: 'node', label: 'Drowned Parish Sigil', hint: 'Break the drowning sigil' },
  { id: 'blood-sigil-root', zoneId: 'redfen', x: 3550, y: 430, kind: 'campaign', variant: 'seal-gold', chapterId: 'chapter-three', nodeType: 'node', label: 'Rootmother Sigil', hint: 'Break the remembering sigil' },
  { id: 'blood-matron-lair', zoneId: 'redfen', x: 3590, y: 930, kind: 'campaign', variant: 'vault', chapterId: 'chapter-three', nodeType: 'boss', label: 'Rootmother Basin', hint: 'Challenge Avarra, the Blood Matron' },
  { id: 'cairnreach-gate', zoneId: 'cairnreach', x: 210, y: 1450, kind: 'campaign', variant: 'gate', chapterId: 'chapter-four', nodeType: 'gate', label: 'Broken Rampart', hint: 'Enter the siege road' },
  { id: 'cairn-standard-west', zoneId: 'cairnreach', x: 480, y: 1320, kind: 'campaign', variant: 'seal-ash', chapterId: 'chapter-four', nodeType: 'node', label: 'West War Standard', hint: 'Break the first command' },
  { id: 'cairn-standard-foundry', zoneId: 'cairnreach', x: 980, y: 2050, kind: 'campaign', variant: 'seal-gold', chapterId: 'chapter-four', nodeType: 'node', label: 'Foundry War Standard', hint: 'Break the second command' },
  { id: 'cairn-standard-crown', zoneId: 'cairnreach', x: 1260, y: 1510, kind: 'campaign', variant: 'seal-hollow', chapterId: 'chapter-four', nodeType: 'node', label: 'Crownless Standard', hint: 'Break the final command' },
  { id: 'chain-regent-throne', zoneId: 'cairnreach', x: 720, y: 2360, kind: 'campaign', variant: 'vault', chapterId: 'chapter-four', nodeType: 'boss', label: 'Chain Regent’s Throne', hint: 'Challenge Odran, the Chain Regent' },
  { id: 'veiled-road-gate', zoneId: 'veiled-road', x: 1490, y: 1460, kind: 'campaign', variant: 'gate', chapterId: 'chapter-five', nodeType: 'gate', label: 'Mirror Verge', hint: 'Enter the road behind the road' },
  { id: 'veil-anchor-mirror', zoneId: 'veiled-road', x: 1720, y: 1260, kind: 'campaign', variant: 'seal-gold', chapterId: 'chapter-five', nodeType: 'node', label: 'Mirror Anchor', hint: 'Close the reflected road' },
  { id: 'veil-anchor-letter', zoneId: 'veiled-road', x: 2070, y: 2310, kind: 'campaign', variant: 'seal-ash', chapterId: 'chapter-five', nodeType: 'node', label: 'Courier Anchor', hint: 'Close the remembered road' },
  { id: 'veil-anchor-moon', zoneId: 'veiled-road', x: 2510, y: 1650, kind: 'campaign', variant: 'seal-hollow', chapterId: 'chapter-five', nodeType: 'node', label: 'Moonless Anchor', hint: 'Close the road without a sky' },
  { id: 'oracle-mirror', zoneId: 'veiled-road', x: 2450, y: 2380, kind: 'campaign', variant: 'vault', chapterId: 'chapter-five', nodeType: 'boss', label: 'Oracle’s Mirror', hint: 'Challenge Noxara, Oracle of the Fifth Road' }
];

export const WORLD_EVENTS = [
  { id: 'invasion', name: 'Host Incursion', objective: 'Defeat the invading cohort', duration: 100, target: 10, reward: 'Covenant cache', renown: 12 },
  { id: 'ritual', name: 'Ritual Interruption', objective: 'Break the ritual guard', duration: 90, target: 7, reward: 'Ritual cache', renown: 14 },
  { id: 'caravan', name: 'Caravan Defence', objective: 'Hold the road against successive packs', duration: 105, target: 9, reward: 'Merchant cache', renown: 12 },
  { id: 'nemesis', name: 'Nemesis Return', objective: 'Defeat the scarred nemesis', duration: 110, target: 1, reward: 'Nemesis cache', renown: 24 },
  { id: 'bell-procession', name: 'Bell Procession', objective: 'Silence the marching choristers', duration: 95, target: 12, reward: 'Choir cache', renown: 15, enemyIds: ['hollowchorister', 'bellknight', 'gildedcantor'] },
  { id: 'blood-tithe', name: 'Blood Tithe', objective: 'Stop the tithe collectors', duration: 100, target: 11, reward: 'Mirebound cache', renown: 15, enemyIds: ['bloodleech', 'fenwitch', 'reedstalker'] },
  { id: 'rift-breach', name: 'Rift Breach', objective: 'Destroy the host crossing the breach', duration: 92, target: 13, reward: 'Courier cache', renown: 16, enemyIds: ['mirrorwisp', 'veilblade', 'riftmother'] },
  { id: 'siege-column', name: 'Siege Column', objective: 'Break the advancing shield line', duration: 115, target: 14, reward: 'Compact cache', renown: 16, enemyIds: ['ironwraith', 'siegeherald', 'chainmarshal'] },
  { id: 'ward-collapse', name: 'Ward Collapse', objective: 'Clear enemies from the failing ward', duration: 80, target: 8, reward: 'Ward cache', renown: 12, enemyIds: ['wardeater', 'nullpriest', 'ashpenitent'] },
  { id: 'relic-hunt', name: 'Relic Hunt', objective: 'Defeat relic-bearing elites', duration: 120, target: 6, reward: 'Relic cache', renown: 18 },
  { id: 'prisoner-break', name: 'Prisoner Break', objective: 'Cut through the gaolers', duration: 105, target: 10, reward: 'Rescue cache', renown: 15 },
  { id: 'oath-trial', name: 'Roadside Oath Trial', objective: 'Survive the oathbound challengers', duration: 90, target: 9, reward: 'Trial cache', renown: 16 },
  { id: 'gallows-flock', name: 'Gallows Flock', objective: 'Cull the bone-winged swarm', duration: 80, target: 15, reward: 'Scavenger cache', renown: 12, enemyIds: ['gallowscrow', 'bonevulture', 'mirrorwisp'] },
  { id: 'root-surge', name: 'Root Surge', objective: 'Cut down the awakened mire host', duration: 105, target: 12, reward: 'Bloodroot cache', renown: 15, enemyIds: ['boghulk', 'bloodleech', 'drownedoracle'] },
  { id: 'ash-storm', name: 'Ash Storm', objective: 'Defeat enemies hidden in the storm', duration: 88, target: 10, reward: 'Ash cache', renown: 14 },
  { id: 'foundry-revolt', name: 'Foundry Revolt', objective: 'Put down the ironbound dead', duration: 112, target: 13, reward: 'Foundry cache', renown: 16, enemyIds: ['ashsmith', 'ironwraith', 'ossuarybehemoth'] },
  { id: 'mirror-hunt', name: 'Mirror Hunt', objective: 'Find and destroy the reflected pack', duration: 94, target: 8, reward: 'Mirror cache', renown: 17, enemyIds: ['mirrorwisp', 'veilblade', 'maskedoracle'] },
  { id: 'choir-liberation', name: 'Choir Liberation', objective: 'Free the names trapped in the escort', duration: 118, target: 12, reward: 'Unrung cache', renown: 18, enemyIds: ['bellknight', 'ashpenitent', 'hollowchorister'] }
];

export const worldBounds = () => ({ left: 0, top: 0, right: WORLD_SIZE.width, bottom: WORLD_SIZE.height });
export const zoneAt = (x, y) => ZONES.find((zone) => x >= zone.x && y >= zone.y && x <= zone.x + zone.width && y <= zone.y + zone.height) ?? ZONES[0];
