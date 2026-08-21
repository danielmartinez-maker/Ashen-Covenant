export const ENEMIES = {
  mireling: { id: 'mireling', name: 'Mireling', role: 'melee', hp: 54, damage: 9, speed: 135, radius: 17, xp: 13, gold: [2, 5], color: '#9c5260', attack: 'claw', windup: 0.38, recovery: 0.52 },
  ashbow: { id: 'ashbow', name: 'Ash Bow', role: 'ranged', hp: 62, damage: 13, speed: 85, radius: 18, xp: 17, gold: [3, 7], color: '#ba7b89', attack: 'bolt', windup: 0.62, recovery: 0.95 },
  cairnguard: { id: 'cairnguard', name: 'Cairn Guard', role: 'shield', hp: 132, armor: 8, damage: 16, speed: 80, radius: 26, xp: 31, gold: [5, 10], color: '#9ca7a4', attack: 'brace', windup: 0.5, recovery: 0.72 },
  cinderbrute: { id: 'cinderbrute', name: 'Cinder Brute', role: 'brute', hp: 202, armor: 4, damage: 26, speed: 66, radius: 31, xp: 47, gold: [8, 15], color: '#c06f54', attack: 'smash', windup: 0.82, recovery: 1.05 },
  candlepriest: { id: 'candlepriest', name: 'Candle Priest', role: 'healer', hp: 88, damage: 10, speed: 75, radius: 20, xp: 29, gold: [6, 10], color: '#e1bd83', attack: 'heal', windup: 0.72, recovery: 1.35 },
  riftstalker: { id: 'riftstalker', name: 'Rift Stalker', role: 'assassin', hp: 105, damage: 22, speed: 196, radius: 19, xp: 35, gold: [7, 13], color: '#826fda', attack: 'pounce', windup: 0.42, recovery: 0.85 },
  echomonk: { id: 'echomonk', name: 'Echo Monk', role: 'commander', hp: 126, armor: 3, damage: 16, speed: 88, radius: 22, xp: 39, gold: [8, 14], color: '#90c8d6', attack: 'command', windup: 0.6, recovery: 1.45 },
  bonevulture: { id: 'bonevulture', name: 'Bone Vulture', role: 'burrower', hp: 75, damage: 18, speed: 154, radius: 16, xp: 24, gold: [4, 9], color: '#d5c3a8', attack: 'dive', windup: 0.48, recovery: 0.72 },
  chainwidow: { id: 'chainwidow', name: 'Chain Widow', role: 'summoner', hp: 118, armor: 2, damage: 14, speed: 90, radius: 21, xp: 41, gold: [8, 16], color: '#b687d3', attack: 'summon', windup: 0.86, recovery: 1.45 },
  wardeater: { id: 'wardeater', name: 'Ward Eater', role: 'disruptor', hp: 148, armor: 6, damage: 17, speed: 105, radius: 25, xp: 46, gold: [9, 16], color: '#6ecdc2', attack: 'drain', windup: 0.66, recovery: 1.1 },
  thorncolossus: { id: 'thorncolossus', name: 'Thorn Colossus', role: 'brute', hp: 320, armor: 9, damage: 31, speed: 58, radius: 37, xp: 75, gold: [13, 23], color: '#768d53', attack: 'slam', windup: 0.95, recovery: 1.15 },
  gallowscrow: { id: 'gallowscrow', name: 'Gallows Crow', role: 'ranged', hp: 80, damage: 15, speed: 120, radius: 16, xp: 25, gold: [5, 10], color: '#332e3e', attack: 'volley', windup: 0.7, recovery: 1.05 },
  bellknight: { id: 'bellknight', name: 'Bellscar Knight', role: 'shield', hp: 176, armor: 10, damage: 22, speed: 76, radius: 28, xp: 52, gold: [10, 18], color: '#c4a86d', attack: 'brace', windup: 0.54, recovery: 0.78 },
  gildedcantor: { id: 'gildedcantor', name: 'Gilded Cantor', role: 'commander', hp: 148, armor: 4, damage: 19, speed: 90, radius: 22, xp: 46, gold: [9, 16], color: '#e5c672', attack: 'command', windup: 0.58, recovery: 1.32 },
  ashpenitent: { id: 'ashpenitent', name: 'Ash Penitent', role: 'disruptor', hp: 164, armor: 7, damage: 19, speed: 102, radius: 24, xp: 49, gold: [10, 18], color: '#8c8899', attack: 'drain', windup: 0.62, recovery: 1.04 },
  hollowchorister: { id: 'hollowchorister', name: 'Hollow Chorister', role: 'summoner', hp: 140, armor: 3, damage: 16, speed: 88, radius: 22, xp: 48, gold: [10, 18], color: '#79c4c7', attack: 'summon', windup: 0.8, recovery: 1.34 },
  bellwitness: { id: 'bellwitness', name: 'Bell-Witness', role: 'boss', hp: 980, armor: 5, damage: 18, speed: 102, radius: 39, xp: 260, gold: [48, 74], color: '#b46b82', attack: 'boss', windup: 0.62, recovery: 0.86, boss: true },
  tollingabbot: { id: 'tollingabbot', name: 'Tolling Abbot', role: 'boss', hp: 3800, armor: 11, damage: 30, speed: 92, radius: 51, xp: 620, gold: [110, 160], color: '#d15357', attack: 'boss', windup: 0.68, recovery: 0.82, boss: true },

  // Redfen host
  bloodleech: { id: 'bloodleech', name: 'Blood Leech', role: 'melee', hp: 78, damage: 15, speed: 154, radius: 15, xp: 24, gold: [4, 9], color: '#b74359', attack: 'claw', windup: 0.31, recovery: 0.48 },
  fenwitch: { id: 'fenwitch', name: 'Fen Witch', role: 'healer', hp: 104, damage: 15, speed: 82, radius: 20, xp: 36, gold: [7, 13], color: '#cf7c89', attack: 'heal', windup: 0.66, recovery: 1.2 },
  boghulk: { id: 'boghulk', name: 'Bog Hulk', role: 'brute', hp: 268, armor: 7, damage: 30, speed: 61, radius: 34, xp: 61, gold: [10, 19], color: '#84505d', attack: 'smash', windup: 0.9, recovery: 1.08 },
  reedstalker: { id: 'reedstalker', name: 'Reed Stalker', role: 'assassin', hp: 112, damage: 24, speed: 205, radius: 18, xp: 42, gold: [8, 15], color: '#a46572', attack: 'pounce', windup: 0.37, recovery: 0.76 },
  drownedoracle: { id: 'drownedoracle', name: 'Drowned Oracle', role: 'commander', hp: 154, armor: 4, damage: 19, speed: 78, radius: 22, xp: 49, gold: [9, 17], color: '#798d8d', attack: 'command', windup: 0.62, recovery: 1.28 },

  // Cairnreach host
  ironwraith: { id: 'ironwraith', name: 'Iron Wraith', role: 'shield', hp: 198, armor: 12, damage: 23, speed: 74, radius: 28, xp: 56, gold: [10, 19], color: '#8da1aa', attack: 'brace', windup: 0.5, recovery: 0.74 },
  siegeherald: { id: 'siegeherald', name: 'Siege Herald', role: 'ranged', hp: 116, armor: 3, damage: 22, speed: 84, radius: 20, xp: 42, gold: [8, 15], color: '#a7bac1', attack: 'volley', windup: 0.74, recovery: 1.0 },
  chainmarshal: { id: 'chainmarshal', name: 'Chain Marshal', role: 'commander', hp: 182, armor: 8, damage: 23, speed: 82, radius: 26, xp: 59, gold: [11, 20], color: '#b6a377', attack: 'command', windup: 0.56, recovery: 1.18 },
  ashsmith: { id: 'ashsmith', name: 'Dead Ashsmith', role: 'disruptor', hp: 176, armor: 8, damage: 21, speed: 92, radius: 25, xp: 54, gold: [10, 18], color: '#c67c5f', attack: 'drain', windup: 0.64, recovery: 1.02 },
  ossuarybehemoth: { id: 'ossuarybehemoth', name: 'Ossuary Behemoth', role: 'brute', hp: 410, armor: 14, damage: 36, speed: 55, radius: 40, xp: 92, gold: [16, 28], color: '#b7b09a', attack: 'slam', windup: 1.02, recovery: 1.18 },

  // Veiled Road host
  mirrorwisp: { id: 'mirrorwisp', name: 'Mirror Wisp', role: 'ranged', hp: 92, damage: 19, speed: 132, radius: 15, xp: 31, gold: [6, 12], color: '#a7a0ee', attack: 'bolt', windup: 0.48, recovery: 0.82 },
  veilblade: { id: 'veilblade', name: 'Veil Blade', role: 'assassin', hp: 132, armor: 3, damage: 27, speed: 218, radius: 18, xp: 47, gold: [9, 16], color: '#7f6bd1', attack: 'pounce', windup: 0.34, recovery: 0.72 },
  nullpriest: { id: 'nullpriest', name: 'Null Priest', role: 'disruptor', hp: 168, armor: 5, damage: 22, speed: 86, radius: 23, xp: 53, gold: [10, 18], color: '#655b9d', attack: 'drain', windup: 0.6, recovery: 1.0 },
  riftmother: { id: 'riftmother', name: 'Rift Mother', role: 'summoner', hp: 182, armor: 4, damage: 20, speed: 78, radius: 25, xp: 59, gold: [11, 20], color: '#a36be0', attack: 'summon', windup: 0.76, recovery: 1.24 },
  maskedoracle: { id: 'maskedoracle', name: 'Masked Oracle', role: 'commander', hp: 176, armor: 6, damage: 22, speed: 94, radius: 24, xp: 56, gold: [11, 19], color: '#ccb5ff', attack: 'command', windup: 0.54, recovery: 1.18 },

  // Expansion bosses. They share the readable three-phase boss grammar while
  // their host composition, speed, armor, and color create distinct fights.
  cryptwarden: { id: 'cryptwarden', name: 'Cryptwarden Sile', role: 'boss', hp: 1750, armor: 9, damage: 24, speed: 88, radius: 43, xp: 340, gold: [65, 95], color: '#9aa99b', attack: 'boss', windup: 0.66, recovery: 0.88, boss: true },
  bloodmatron: { id: 'bloodmatron', name: 'Avarra, Blood Matron', role: 'boss', hp: 4650, armor: 10, damage: 34, speed: 104, radius: 48, xp: 760, gold: [135, 190], color: '#c84361', attack: 'boss', windup: 0.58, recovery: 0.78, boss: true },
  bogsovereign: { id: 'bogsovereign', name: 'Sovereign of the Drowned', role: 'boss', hp: 4300, armor: 13, damage: 33, speed: 78, radius: 55, xp: 720, gold: [128, 182], color: '#6f7f74', attack: 'boss', windup: 0.76, recovery: 0.88, boss: true },
  burialengine: { id: 'burialengine', name: 'The Burial Engine', role: 'boss', hp: 4950, armor: 18, damage: 37, speed: 64, radius: 60, xp: 810, gold: [145, 205], color: '#a9a28c', attack: 'boss', windup: 0.82, recovery: 0.92, boss: true },
  chainregent: { id: 'chainregent', name: 'Odran, Chain Regent', role: 'boss', hp: 5400, armor: 17, damage: 39, speed: 80, radius: 55, xp: 880, gold: [160, 225], color: '#a88d61', attack: 'boss', windup: 0.72, recovery: 0.84, boss: true },
  mirrorapostle: { id: 'mirrorapostle', name: 'Apostle in the Mirror', role: 'boss', hp: 4800, armor: 11, damage: 38, speed: 124, radius: 45, xp: 840, gold: [150, 215], color: '#a88ae8', attack: 'boss', windup: 0.52, recovery: 0.7, boss: true },
  veiledoracle: { id: 'veiledoracle', name: 'Noxara, Oracle of the Fifth Road', role: 'boss', hp: 6200, armor: 14, damage: 43, speed: 116, radius: 49, xp: 980, gold: [185, 255], color: '#7954ca', attack: 'boss', windup: 0.5, recovery: 0.66, boss: true },
  silenceincarnate: { id: 'silenceincarnate', name: 'Silence Incarnate', role: 'boss', hp: 7200, armor: 16, damage: 47, speed: 98, radius: 58, xp: 1120, gold: [210, 290], color: '#76c6c6', attack: 'boss', windup: 0.62, recovery: 0.72, boss: true }
};

export const ZONE_ENCOUNTER_TEMPLATES = {
  gravewake: [
    ['cairnguard', 'ashbow', 'ashbow', 'mireling', 'mireling'],
    ['candlepriest', 'cairnguard', 'mireling', 'mireling', 'ashbow'],
    ['echomonk', 'riftstalker', 'riftstalker', 'ashbow', 'mireling'],
    ['chainwidow', 'bonevulture', 'bonevulture', 'mireling', 'mireling'],
    ['gallowscrow', 'gallowscrow', 'cairnguard', 'ashbow', 'mireling'],
    ['cinderbrute', 'mireling', 'ashbow', 'candlepriest']
  ],
  redfen: [
    ['bloodleech', 'bloodleech', 'fenwitch', 'reedstalker', 'mireling'],
    ['boghulk', 'bloodleech', 'bloodleech', 'drownedoracle'],
    ['fenwitch', 'reedstalker', 'reedstalker', 'ashbow', 'bloodleech'],
    ['drownedoracle', 'boghulk', 'bloodleech', 'mireling'],
    ['thorncolossus', 'fenwitch', 'bloodleech', 'reedstalker'],
    ['bloodleech', 'bloodleech', 'bloodleech', 'reedstalker', 'fenwitch']
  ],
  cairnreach: [
    ['ironwraith', 'ironwraith', 'siegeherald', 'siegeherald', 'ashsmith'],
    ['chainmarshal', 'ironwraith', 'siegeherald', 'cinderbrute'],
    ['ossuarybehemoth', 'ashsmith', 'siegeherald', 'cairnguard'],
    ['chainmarshal', 'cairnguard', 'cairnguard', 'ashbow', 'ashbow'],
    ['ironwraith', 'wardeater', 'ashsmith', 'siegeherald'],
    ['ossuarybehemoth', 'ironwraith', 'chainmarshal']
  ],
  'veiled-road': [
    ['mirrorwisp', 'mirrorwisp', 'veilblade', 'veilblade', 'nullpriest'],
    ['riftmother', 'mirrorwisp', 'veilblade', 'riftstalker'],
    ['maskedoracle', 'veilblade', 'veilblade', 'mirrorwisp'],
    ['nullpriest', 'riftmother', 'mirrorwisp', 'mirrorwisp'],
    ['maskedoracle', 'riftstalker', 'gallowscrow', 'mirrorwisp'],
    ['veilblade', 'veilblade', 'veilblade', 'mirrorwisp', 'nullpriest']
  ],
  bellscar: [
    ['bellknight', 'bellknight', 'gildedcantor', 'ashpenitent', 'hollowchorister'],
    ['hollowchorister', 'riftmother', 'mirrorwisp', 'bellknight'],
    ['gildedcantor', 'siegeherald', 'bellknight', 'bellknight'],
    ['ashpenitent', 'nullpriest', 'hollowchorister', 'veilblade'],
    ['bellknight', 'chainmarshal', 'gildedcantor', 'ashbow'],
    ['hollowchorister', 'hollowchorister', 'riftstalker', 'mirrorwisp', 'ashpenitent']
  ],
  sanctuary: [
    ['mireling', 'mireling', 'ashbow'],
    ['gallowscrow', 'mireling', 'cairnguard']
  ]
};

export const ENCOUNTER_TEMPLATES = Object.values(ZONE_ENCOUNTER_TEMPLATES).flat();
export const encountersForZone = (zoneId) => ZONE_ENCOUNTER_TEMPLATES[zoneId] ?? ENCOUNTER_TEMPLATES;

export const ELITE_AFFIXES = [
  { id: 'unstoppable', name: 'Unstoppable', text: 'Cannot be staggered and periodically shrugs off control.' },
  { id: 'splitting', name: 'Splitting', text: 'Projectiles split once on impact.' },
  { id: 'sanguine', name: 'Sanguine', text: 'Leaves hazardous blood when struck.' },
  { id: 'stormbound', name: 'Stormbound', text: 'Calls short lightning pulses around itself.' },
  { id: 'shielded', name: 'Shielded', text: 'Starts combat with a regenerating barrier.' },
  { id: 'frenzied', name: 'Frenzied', text: 'Gains speed and force below half health.' },
  { id: 'volatile', name: 'Volatile', text: 'Explodes after death with a visible warning.' },
  { id: 'suppressing', name: 'Suppressing', text: 'Periodically creates a field that erodes Barrier.' },
  { id: 'mirrored', name: 'Mirrored', text: 'Creates one lesser reflection after entering combat.' },
  { id: 'hungry', name: 'Hungry', text: 'Recovers health when its attacks damage the covenant.' },
  { id: 'relentless', name: 'Relentless', text: 'Recovers from attacks faster and refuses to retreat.' },
  { id: 'oathbound', name: 'Oathbound', text: 'Alternates between a heavy ward and increased damage.' }
];
