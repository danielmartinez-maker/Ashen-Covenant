// Ashen Covenant 4.2: one source of truth for the rebuilt play loop.
// This data is deliberately independent from transient entities so authored
// routes, tutorials, class mechanics, and encounter rewards can be validated.

export const REQUIEM_RELEASE = Object.freeze({
  version: '6.0.0',
  name: 'The Black Road',
  saveVersion: 19
});

export const CLASS_MECHANICS = Object.freeze({
  warden: {
    id: 'judgment', name: 'Judgment', color: '#d9c88c', verb: 'Mark and sentence',
    description: 'Alternating attacks and skills builds Judgment. At full Judgment, the next combo finisher exposes enemies and grants a brief ward.',
    gain: { attack: 9, skillOne: 17, skillTwo: 14, companion: 20, hybrid: 24, ultimate: 35 }, decay: 3.5
  },
  thornseer: {
    id: 'blight', name: 'Blight', color: '#b28bd8', verb: 'Curse and cultivate',
    description: 'Damage against cursed enemies grows Blight. At full Blight, the next primary skill erupts curses in a controlled area.',
    gain: { attack: 7, skillOne: 20, skillTwo: 16, companion: 18, hybrid: 25, ultimate: 35 }, decay: 2.5
  },
  ironbound: {
    id: 'resolve', name: 'Resolve', color: '#d39b69', verb: 'Absorb and retaliate',
    description: 'Blocking damage with armor or Barrier builds Resolve. At full Resolve, the next combo finisher becomes an armor-piercing shockwave.',
    gain: { attack: 8, skillOne: 14, skillTwo: 22, companion: 18, hybrid: 25, ultimate: 35 }, decay: 2
  },
  veilrunner: {
    id: 'momentum', name: 'Momentum', color: '#8f86df', verb: 'Move and exploit',
    description: 'Movement, dodges, and alternating attacks build Momentum. At full Momentum, the next finisher crosses through its target and critically strikes.',
    gain: { attack: 12, skillOne: 15, skillTwo: 10, dodge: 22, companion: 18, hybrid: 25, ultimate: 35 }, decay: 7
  },
  gravebinder: {
    id: 'remains', name: 'Remains', color: '#88b8c5', verb: 'Harvest and command',
    description: 'Defeating marked or cursed enemies gathers Remains. At full Remains, the next primary skill releases a funerary procession.',
    gain: { attack: 7, skillOne: 17, skillTwo: 15, companion: 20, hybrid: 26, ultimate: 36 }, decay: 1.5
  },
  dawnstrider: {
    id: 'radiance', name: 'Radiance', color: '#efc86d', verb: 'Advance and consecrate',
    description: 'Striking marked enemies and fighting while moving builds Radiance. At full Radiance, the next finisher consecrates the ground and restores health.',
    gain: { attack: 10, skillOne: 18, skillTwo: 18, dodge: 12, companion: 18, hybrid: 24, ultimate: 35 }, decay: 4
  }
});

export const TUTORIAL_STEPS = Object.freeze([
  { id: 'move', title: 'Take the road', detail: 'Move with WASD or left-click the ground.', event: 'move', target: 1 },
  { id: 'target', title: 'Choose your prey', detail: 'Left-click a creature to select and approach it.', event: 'target', target: 1 },
  { id: 'attack', title: 'Commit your strike', detail: 'Press J or click the selected creature. Each input commits one attack.', event: 'attack', target: 3 },
  { id: 'dodge', title: 'Break the line', detail: 'Press Space during a red wind-up and leave the warned area.', event: 'dodge', target: 1 },
  { id: 'skill', title: 'Spend your class resource', detail: 'Use Q and E; attacks rebuild your class resource.', event: 'skill', target: 2 },
  { id: 'companion', title: 'Invoke the second oath', detail: 'Press C to use the Companion Technique.', event: 'companion', target: 1 },
  { id: 'hybrid', title: 'Complete the covenant', detail: 'Press F when the Hybrid Signature is ready.', event: 'hybrid', target: 1 },
  { id: 'loot', title: 'Claim the spoils', detail: 'Walk over a dropped relic, then inspect it from Relics (I).', event: 'loot', target: 1 }
]);

// Each hostile region has a short authored route: an opening pack teaches the
// regional verb, a specialist pack tests target priority, and a final guard
// combines those ideas. Campaign and endgame encounters remain separate.
export const ENCOUNTER_ROOMS = Object.freeze([
  { id: 'gravewake-procession', zoneId: 'gravewake', name: 'The Unquiet Procession', x: 1390, y: 340, radius: 250, tier: 1, formation: ['cairnguard', 'mireling', 'mireling', 'ashbow'], eliteIndex: -1, reward: 'road-cache', hint: 'Break the guard before the archers close the road.' },
  { id: 'gravewake-censer', zoneId: 'gravewake', name: 'Censer Field', x: 1860, y: 530, radius: 260, tier: 2, formation: ['candlepriest', 'cairnguard', 'ashbow', 'mireling'], eliteIndex: 0, reward: 'ritual-cache', hint: 'The Candle Priest sustains the formation.' },
  { id: 'gravewake-gallows', zoneId: 'gravewake', name: 'Gallows Verge', x: 2050, y: 850, radius: 275, tier: 3, formation: ['echomonk', 'riftstalker', 'gallowscrow', 'cinderbrute'], eliteIndex: 0, reward: 'elite-cache', hint: 'Interrupt the commander before the brute commits.' },

  { id: 'redfen-bloodreed', zoneId: 'redfen', name: 'Bloodreed Crossing', x: 2550, y: 340, radius: 260, tier: 1, formation: ['bloodleech', 'bloodleech', 'reedstalker', 'fenwitch'], eliteIndex: -1, reward: 'road-cache', hint: 'Keep moving when the reeds begin to hunt.' },
  { id: 'redfen-drowned-parish', zoneId: 'redfen', name: 'Drowned Parish', x: 3080, y: 620, radius: 275, tier: 2, formation: ['drownedoracle', 'boghulk', 'fenwitch', 'bloodleech'], eliteIndex: 0, reward: 'ritual-cache', hint: 'Separate the oracle from the hulk.' },
  { id: 'redfen-rootcourt', zoneId: 'redfen', name: 'Court of Roots', x: 3540, y: 390, radius: 290, tier: 3, formation: ['thorncolossus', 'reedstalker', 'reedstalker', 'fenwitch'], eliteIndex: 0, reward: 'elite-cache', hint: 'Bait the colossus slam, then punish its recovery.' },

  { id: 'cairnreach-breach', zoneId: 'cairnreach', name: 'The Broken Breach', x: 350, y: 1370, radius: 270, tier: 1, formation: ['ironwraith', 'ironwraith', 'siegeherald', 'ashsmith'], eliteIndex: -1, reward: 'road-cache', hint: 'Turn the shield line before advancing.' },
  { id: 'cairnreach-chainworks', zoneId: 'cairnreach', name: 'Chainworks Yard', x: 830, y: 1850, radius: 280, tier: 2, formation: ['chainmarshal', 'ironwraith', 'siegeherald', 'cinderbrute'], eliteIndex: 0, reward: 'foundry-cache', hint: 'The marshal coordinates every attacker.' },
  { id: 'cairnreach-ossuary', zoneId: 'cairnreach', name: 'Walking Ossuary', x: 1190, y: 2250, radius: 300, tier: 3, formation: ['ossuarybehemoth', 'ashsmith', 'siegeherald', 'ironwraith'], eliteIndex: 0, reward: 'elite-cache', hint: 'Use the behemoth’s long commitment against its escort.' },

  { id: 'veiled-mirror-verge', zoneId: 'veiled-road', name: 'Mirror Verge', x: 1650, y: 1340, radius: 260, tier: 1, formation: ['mirrorwisp', 'mirrorwisp', 'veilblade', 'nullpriest'], eliteIndex: -1, reward: 'road-cache', hint: 'Read the projectile lanes before pursuing the blade.' },
  { id: 'veiled-courier', zoneId: 'veiled-road', name: 'The Lost Courier', x: 2050, y: 1800, radius: 280, tier: 2, formation: ['maskedoracle', 'veilblade', 'veilblade', 'mirrorwisp'], eliteIndex: 0, reward: 'mirror-cache', hint: 'The oracle’s command makes every flank more dangerous.' },
  { id: 'veiled-riftcourt', zoneId: 'veiled-road', name: 'Riftmother’s Court', x: 2410, y: 2200, radius: 295, tier: 3, formation: ['riftmother', 'nullpriest', 'riftstalker', 'mirrorwisp'], eliteIndex: 0, reward: 'elite-cache', hint: 'Close on the summoner before the arena fills.' },

  { id: 'bellscar-lower-gate', zoneId: 'bellscar', name: 'The Lower Gate', x: 2780, y: 1320, radius: 270, tier: 1, formation: ['bellknight', 'bellknight', 'gildedcantor', 'ashpenitent'], eliteIndex: -1, reward: 'road-cache', hint: 'Break one flank instead of attacking the wall head-on.' },
  { id: 'bellscar-silent-choir', zoneId: 'bellscar', name: 'Choir Without Breath', x: 3200, y: 1890, radius: 285, tier: 2, formation: ['hollowchorister', 'nullpriest', 'veilblade', 'bellknight'], eliteIndex: 0, reward: 'choir-cache', hint: 'Silence the chorister before it rebuilds the line.' },
  { id: 'bellscar-final-ascent', zoneId: 'bellscar', name: 'The Final Ascent', x: 3540, y: 2200, radius: 305, tier: 3, formation: ['gildedcantor', 'bellknight', 'ashpenitent', 'hollowchorister', 'veilblade'], eliteIndex: 0, reward: 'elite-cache', hint: 'Every role is present; choose the order of execution.' }
]);

export const ENCOUNTER_ROOM_BY_ID = Object.freeze(Object.fromEntries(ENCOUNTER_ROOMS.map((room) => [room.id, room])));
export const roomsForZone = (zoneId) => ENCOUNTER_ROOMS.filter((room) => room.zoneId === zoneId);

// The Black Road replaces ambient map-wide packs with five authored dungeon
// expeditions. Each expedition is a four-room arc: a formation check, an
// objective room, a lieutenant, and a multi-phase boss. At most one room is
// alive at a time, keeping combat readable and intentional.
export const BLACK_ROAD_EXPEDITIONS = Object.freeze([
  {
    id: 'funeral-road', zoneId: 'gravewake', name: 'The Funeral Road', icon: '†', color: '#879178', recommendedLevel: 1,
    summary: 'Follow a bell-marked procession into the crypt that taught the dead to march.', bossId: 'cryptwarden',
    stages: [
      { id: 'funeral-gate', name: 'Procession Gate', type: 'formation', x: 1390, y: 340, radius: 245, formation: ['cairnguard', 'mireling', 'mireling', 'ashbow'], eliteIndex: -1, objective: 'Break the shield line', hint: 'Turn the guard, then punish the archers.' },
      { id: 'funeral-censers', name: 'The Three Censers', type: 'ritual', x: 1860, y: 530, radius: 255, formation: ['candlepriest', 'cairnguard', 'ashbow'], eliteIndex: 0, vessels: 3, objective: 'Shatter all three funeral censers', hint: 'The ritual vessels ward the entire formation.' },
      { id: 'funeral-gallows', name: 'Gallows Verge', type: 'lieutenant', x: 2050, y: 850, radius: 270, formation: ['echomonk', 'riftstalker', 'gallowscrow', 'cinderbrute'], eliteIndex: 0, objective: 'Execute the Gallows Commander', hint: 'Interrupt the command before the brute commits.' },
      { id: 'funeral-crypt', name: 'Sile’s Walking Crypt', type: 'boss', x: 1800, y: 880, radius: 310, formation: ['cairnguard', 'candlepriest'], bossId: 'cryptwarden', objective: 'Defeat Sile, the Cryptwarden', hint: 'Each toll changes the safe side of the arena.' }
    ]
  },
  {
    id: 'bloodroot-descent', zoneId: 'redfen', name: 'Bloodroot Descent', icon: '✹', color: '#a84f60', recommendedLevel: 6,
    summary: 'Descend through a living parish before the root court seals over the road.', bossId: 'bloodmatron',
    stages: [
      { id: 'bloodroot-crossing', name: 'Bloodreed Crossing', type: 'formation', x: 2550, y: 340, radius: 250, formation: ['bloodleech', 'bloodleech', 'reedstalker', 'fenwitch'], eliteIndex: -1, objective: 'Cross the hunting reeds', hint: 'Keep moving when the ambusher vanishes.' },
      { id: 'bloodroot-fonts', name: 'Drowned Baptism', type: 'ritual', x: 3080, y: 620, radius: 265, formation: ['drownedoracle', 'boghulk', 'fenwitch'], eliteIndex: 0, vessels: 3, objective: 'Drain the three blood fonts', hint: 'The oracle rebuilds the ward while a font survives.' },
      { id: 'bloodroot-court', name: 'Court of Roots', type: 'lieutenant', x: 3540, y: 390, radius: 280, formation: ['thorncolossus', 'reedstalker', 'reedstalker', 'fenwitch'], eliteIndex: 0, objective: 'Bring down the Thorn Colossus', hint: 'Bait the long slam and punish its recovery.' },
      { id: 'bloodroot-heart', name: 'The Rootmother’s Heart', type: 'boss', x: 3480, y: 825, radius: 315, formation: ['fenwitch', 'boghulk'], bossId: 'bloodmatron', objective: 'Defeat Avarra, the Blood Matron', hint: 'Cut the blood roots before the arena closes.' }
    ]
  },
  {
    id: 'iron-siege', zoneId: 'cairnreach', name: 'The Iron Siege', icon: '⬡', color: '#9ca4aa', recommendedLevel: 10,
    summary: 'Breach a dead fortress one command post at a time and end the order that outlived its army.', bossId: 'chainregent',
    stages: [
      { id: 'iron-breach', name: 'The Broken Breach', type: 'formation', x: 350, y: 1370, radius: 255, formation: ['ironwraith', 'ironwraith', 'siegeherald', 'ashsmith'], eliteIndex: -1, objective: 'Turn the shield wall', hint: 'Flank the wraiths before closing on the herald.' },
      { id: 'iron-furnaces', name: 'Chainworks Furnaces', type: 'ritual', x: 830, y: 1850, radius: 270, formation: ['chainmarshal', 'ironwraith', 'siegeherald'], eliteIndex: 0, vessels: 3, objective: 'Destroy the command braziers', hint: 'Each brazier strengthens the marshal’s escort.' },
      { id: 'iron-ossuary', name: 'Walking Ossuary', type: 'lieutenant', x: 1190, y: 2250, radius: 290, formation: ['ossuarybehemoth', 'ashsmith', 'siegeherald', 'ironwraith'], eliteIndex: 0, objective: 'Dismantle the Ossuary Behemoth', hint: 'Its commitment is long; its recovery is your opening.' },
      { id: 'iron-throne', name: 'The Crownless Throne', type: 'boss', x: 720, y: 2290, radius: 320, formation: ['ironwraith', 'siegeherald'], bossId: 'chainregent', objective: 'Defeat Odran, the Chain Regent', hint: 'Break the chain prisons before the regent closes in.' }
    ]
  },
  {
    id: 'mirror-pilgrimage', zoneId: 'veiled-road', name: 'Mirror Pilgrimage', icon: '◇', color: '#8179b8', recommendedLevel: 15,
    summary: 'Take the road behind the road, where every room remembers a different way you could fail.', bossId: 'veiledoracle',
    stages: [
      { id: 'mirror-verge', name: 'Mirror Verge', type: 'formation', x: 1650, y: 1340, radius: 250, formation: ['mirrorwisp', 'mirrorwisp', 'veilblade', 'nullpriest'], eliteIndex: -1, objective: 'Read and break the mirror lanes', hint: 'Do not chase the blade through a projectile lane.' },
      { id: 'mirror-anchors', name: 'The Lost Courier', type: 'ritual', x: 2050, y: 1800, radius: 270, formation: ['maskedoracle', 'veilblade', 'mirrorwisp'], eliteIndex: 0, vessels: 3, objective: 'Close the three reflected anchors', hint: 'Every open anchor gives the oracle another escape.' },
      { id: 'mirror-riftcourt', name: 'Riftmother’s Court', type: 'lieutenant', x: 2410, y: 2200, radius: 285, formation: ['riftmother', 'nullpriest', 'riftstalker', 'mirrorwisp'], eliteIndex: 0, objective: 'Silence the Riftmother', hint: 'Close on the summoner before the room fills.' },
      { id: 'mirror-oracle', name: 'The Fifth Reflection', type: 'boss', x: 2320, y: 2300, radius: 315, formation: ['veilblade', 'nullpriest'], bossId: 'veiledoracle', objective: 'Defeat Noxara, Oracle of the Fifth Road', hint: 'The true oracle casts a shadow; reflections do not.' }
    ]
  },
  {
    id: 'last-bell', zoneId: 'bellscar', name: 'The Last Bell', icon: '♮', color: '#c76568', recommendedLevel: 20,
    summary: 'Climb the broken citadel through a silent choir and confront the absence beneath its final bell.', bossId: 'silenceincarnate',
    stages: [
      { id: 'lastbell-gate', name: 'The Lower Gate', type: 'formation', x: 2780, y: 1320, radius: 255, formation: ['bellknight', 'bellknight', 'gildedcantor', 'ashpenitent'], eliteIndex: -1, objective: 'Breach the lower gate', hint: 'Break one flank instead of attacking the wall head-on.' },
      { id: 'lastbell-choir', name: 'Choir Without Breath', type: 'ritual', x: 3200, y: 1890, radius: 275, formation: ['hollowchorister', 'nullpriest', 'bellknight'], eliteIndex: 0, vessels: 3, objective: 'Unmake the silent choir seals', hint: 'The chorister restores any seal left unattended.' },
      { id: 'lastbell-ascent', name: 'The Final Ascent', type: 'lieutenant', x: 3540, y: 2200, radius: 295, formation: ['gildedcantor', 'bellknight', 'ashpenitent', 'hollowchorister', 'veilblade'], eliteIndex: 0, objective: 'Execute the Gilded Cantor', hint: 'Every enemy role is present; choose the kill order.' },
      { id: 'lastbell-silence', name: 'The Chamber Beneath Sound', type: 'boss', x: 3400, y: 1720, radius: 325, formation: ['hollowchorister', 'bellknight'], bossId: 'silenceincarnate', objective: 'Defeat Silence Incarnate', hint: 'The arena shrinks after every toll.' }
    ]
  }
]);

export const BLACK_ROAD_BY_ID = Object.freeze(Object.fromEntries(BLACK_ROAD_EXPEDITIONS.map((expedition) => [expedition.id, expedition])));
export const blackRoadForZone = (zoneId) => BLACK_ROAD_EXPEDITIONS.find((expedition) => expedition.zoneId === zoneId) ?? null;

export const DIFFICULTY_PROFILES = Object.freeze({
  adventurer: { id: 'adventurer', name: 'Adventurer', enemyHp: 0.88, enemyDamage: 0.78, reward: 0.9, description: 'Story-forward combat with forgiving recovery.' },
  veteran: { id: 'veteran', name: 'Veteran', enemyHp: 1, enemyDamage: 1, reward: 1, description: 'The intended deliberate action-RPG balance.' },
  penitent: { id: 'penitent', name: 'Penitent', enemyHp: 1.18, enemyDamage: 1.2, reward: 1.22, description: 'Tighter dodge checks, sturdier enemies, and better rewards.' }
});

export const normalizeDifficulty = (id) => DIFFICULTY_PROFILES[id]?.id ?? 'veteran';

export const createRequiemState = (raw = {}) => ({
  version: 2,
  difficulty: normalizeDifficulty(raw?.difficulty),
  tutorial: {
    enabled: raw?.tutorial?.enabled !== false,
    step: Math.max(0, Math.min(TUTORIAL_STEPS.length, Number(raw?.tutorial?.step) || 0)),
    progress: Math.max(0, Number(raw?.tutorial?.progress) || 0),
    complete: raw?.tutorial?.complete === true
  },
  classMechanic: {
    value: Math.max(0, Math.min(100, Number(raw?.classMechanic?.value) || 0)),
    ready: raw?.classMechanic?.ready === true,
    lastAction: typeof raw?.classMechanic?.lastAction === 'string' ? raw.classMechanic.lastAction.slice(0, 24) : null
  },
  roomHistory: Object.fromEntries(Object.entries(raw?.roomHistory ?? {}).filter(([id]) => ENCOUNTER_ROOM_BY_ID[id]).map(([id, count]) => [id, Math.max(0, Math.min(999, Math.floor(Number(count) || 0)))])),
  roomsCleared: Math.max(0, Math.floor(Number(raw?.roomsCleared) || 0)),
  bestRoomStreak: Math.max(0, Math.floor(Number(raw?.bestRoomStreak) || 0)),
  deathsByRoom: Object.fromEntries(Object.entries(raw?.deathsByRoom ?? {}).filter(([id]) => ENCOUNTER_ROOM_BY_ID[id]).map(([id, count]) => [id, Math.max(0, Math.min(999, Math.floor(Number(count) || 0)))])),
  blackRoad: {
    totalClears: Math.max(0, Math.floor(Number(raw?.blackRoad?.totalClears) || 0)),
    bossesDefeated: Math.max(0, Math.floor(Number(raw?.blackRoad?.bossesDefeated) || 0)),
    records: Object.fromEntries(BLACK_ROAD_EXPEDITIONS.map((expedition) => {
      const record = raw?.blackRoad?.records?.[expedition.id] ?? {};
      return [expedition.id, {
        clears: Math.max(0, Math.min(9999, Math.floor(Number(record.clears) || 0))),
        bestTime: Math.max(0, Math.min(1_000_000, Number(record.bestTime) || 0)),
        highestHeat: Math.max(0, Math.min(99, Math.floor(Number(record.highestHeat) || 0))),
        stagesCleared: Math.max(0, Math.min(99999, Math.floor(Number(record.stagesCleared) || 0)))
      }];
    }))
  }
});

export const activeTutorialStep = (state) => state?.tutorial?.enabled !== false && !state?.tutorial?.complete
  ? TUTORIAL_STEPS[state.tutorial.step] ?? null
  : null;
