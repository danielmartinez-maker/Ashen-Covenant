import { ZONES } from './world.js';

// Keep the original expansion import surface stable for older modules and
// tests while the deeper contract runtime lives in its own data module.
export { CONTRACTS, contractById } from './contracts.js';

export const FACTION_RANKS = [0, 60, 160, 340, 620, 980];

export const FACTIONS = [
  {
    id: 'ashen-accord', name: 'Ashen Accord', icon: '✦', color: '#91d8c6',
    description: 'Scouts, keepers, and quartermasters holding the sanctuary roads together.',
    rewards: ['Waypoint travel', 'Accord caches', 'Improved event rewards', 'Extra contract slot', 'Accord reliquary']
  },
  {
    id: 'mirebound', name: 'Mirebound Circle', icon: '✹', color: '#c86f7d',
    description: 'Redfen herbalists and curse-breakers who know which roots remember blood.',
    rewards: ['Mire cache', 'Cinder bundle', 'Redfen target cache', 'Prismatic herb', 'Mirebound reliquary']
  },
  {
    id: 'cairn-compact', name: 'Cairn Compact', icon: '⬡', color: '#a8bcc8',
    description: 'Surviving masons and oath-soldiers rebuilding Cairnreach one wall at a time.',
    rewards: ['Cairn cache', 'Tempering alloys', 'Stronghold bonus', 'Apex fragment', 'Compact reliquary']
  },
  {
    id: 'veil-couriers', name: 'Veil Couriers', icon: '☾', color: '#ac91ee',
    description: 'Runners who cross roads that only exist while nobody is looking directly at them.',
    rewards: ['Courier cache', 'Rift runes', 'Delve shortcut', 'Oath echoes', 'Courier reliquary']
  },
  {
    id: 'unrung-choir', name: 'The Unrung Choir', icon: '♬', color: '#e4bf76',
    description: 'Freed names from Bellscar learning to speak without answering the shattered bell.',
    rewards: ['Choir cache', 'Resonance runes', 'Boss cache', 'Apex core chance', 'Unrung reliquary']
  }
];

export const factionById = (id) => FACTIONS.find((faction) => faction.id === id) ?? FACTIONS[0];

const DISTRICT_BLUEPRINTS = {
  sanctuary: [
    ['cinder-gate', 'Cinder Gate', 'ashen-accord', 'The western arch where every returning covenant is counted.'],
    ['lantern-ward', 'Lantern Ward', 'ashen-accord', 'A lived-in quarter of healers, tents, and oath lanterns.'],
    ['keepers-row', 'Keepers’ Row', 'ashen-accord', 'Maelin’s scribes preserve names the road tries to erase.'],
    ['forge-quarter', 'Forge Quarter', 'cairn-compact', 'Cinder anvils and salvage tables ring through the lower court.'],
    ['pilgrim-commons', 'Pilgrim Commons', 'ashen-accord', 'Caravans, contract hunters, and refugees trade road news.']
  ],
  gravewake: [
    ['mourners-causeway', 'Mourner’s Causeway', 'ashen-accord', 'A burial road bordered by bells with their clappers removed.'],
    ['gallows-meadow', 'Gallows Meadow', 'ashen-accord', 'Wind bends the grass around graves that were never dug.'],
    ['waystone-reach', 'Waystone Reach', 'unrung-choir', 'The first broken toll still trembles beneath the old stone.'],
    ['widows-mile', 'Widow’s Mile', 'veil-couriers', 'Couriers cross quickly, watched by crows that know their names.'],
    ['sunken-ossuary', 'Sunken Ossuary', 'unrung-choir', 'Flooded crypt mouths open beneath the eastern field.']
  ],
  redfen: [
    ['bloodreed-bank', 'Bloodreed Bank', 'mirebound', 'Red reeds drink from water too warm for the season.'],
    ['drowned-parish', 'Drowned Parish', 'mirebound', 'A chapel roof and its bells barely clear the black water.'],
    ['rootmother-basin', 'Rootmother Basin', 'mirebound', 'Ancient roots knot around memories offered as sacrifice.'],
    ['leechwater-crossing', 'Leechwater Crossing', 'ashen-accord', 'A half-built causeway guarded by desperate caravan hands.'],
    ['scarlet-sluice', 'Scarlet Sluice', 'mirebound', 'Iron floodgates hold back a tide that has learned to climb.']
  ],
  cairnreach: [
    ['broken-rampart', 'Broken Rampart', 'cairn-compact', 'Siege stone and shield walls lie where the fortress split.'],
    ['chainworks', 'The Chainworks', 'cairn-compact', 'War engines still pull on chains buried deep in the mountain.'],
    ['kings-cairn', 'King’s Cairn', 'cairn-compact', 'No crown rests here, though every dead guard still kneels.'],
    ['ash-foundry', 'Ash Foundry', 'cairn-compact', 'Cold furnaces cough sparks when ironbound spirits pass.'],
    ['last-bastion', 'Last Bastion', 'ashen-accord', 'The surviving wall overlooks every road into Cairnreach.']
  ],
  'veiled-road': [
    ['mirror-verge', 'Mirror Verge', 'veil-couriers', 'Pools reflect roads that do not exist in the waking world.'],
    ['gloam-market', 'Gloam Market', 'veil-couriers', 'Empty stalls trade whispers after the merchants disappeared.'],
    ['rift-mile', 'Rift Mile', 'veil-couriers', 'Space folds sharply enough to leave cuts in passing armor.'],
    ['couriers-fall', 'Courier’s Fall', 'veil-couriers', 'Hundreds of sealed letters hang from a single dead tree.'],
    ['moonless-step', 'Moonless Step', 'unrung-choir', 'The last ascent before Bellscar never sees the same night twice.']
  ],
  bellscar: [
    ['outer-belfry', 'Outer Belfry', 'unrung-choir', 'Bell fragments hum whenever the living cross the threshold.'],
    ['golden-close', 'Golden Close', 'unrung-choir', 'The choir of obedience once marched these narrow courts.'],
    ['ashen-transept', 'Ashen Transept', 'unrung-choir', 'Grey votive dust drifts upward instead of falling.'],
    ['hollow-nave', 'Hollow Nave', 'unrung-choir', 'Forgotten names gather where the cathedral roof has collapsed.'],
    ['vaults-below', 'Vaults Below', 'cairn-compact', 'The deepest bells were cast around prisons, not sound.']
  ]
};

const districtRect = (zone, index) => index < 3
  ? { x: zone.x + zone.width * index / 3, y: zone.y, width: zone.width / 3, height: zone.height / 2 }
  : { x: zone.x + zone.width * (index - 3) / 2, y: zone.y + zone.height / 2, width: zone.width / 2, height: zone.height / 2 };

export const DISTRICTS = ZONES.flatMap((zone) => (DISTRICT_BLUEPRINTS[zone.id] ?? []).map((entry, index) => ({
  id: entry[0], name: entry[1], zoneId: zone.id, factionId: entry[2], description: entry[3],
  danger: zone.safe ? 0 : Math.max(1, zone.level + index * 2),
  ...districtRect(zone, index)
})));

export const districtAt = (x, y) => DISTRICTS.find((district) => (
  x >= district.x && y >= district.y && x <= district.x + district.width && y <= district.y + district.height
)) ?? DISTRICTS[0];

export const DELVES = [
  { id: 'ossuary-steps', name: 'Ossuary Steps', zoneId: 'gravewake', factionId: 'unrung-choir', level: 4, waves: 5, bossId: 'cryptwarden', icon: '†', description: 'Descend through flooded memorial stairs while the buried procession climbs toward you.' },
  { id: 'widows-bell', name: 'Widow’s Bell', zoneId: 'gravewake', factionId: 'ashen-accord', level: 6, waves: 6, bossId: 'bellwitness', icon: '♬', description: 'A bell chamber where every wave repeats the last mourner’s final defence.' },
  { id: 'bloodroot-hollow', name: 'Bloodroot Hollow', zoneId: 'redfen', factionId: 'mirebound', level: 10, waves: 6, bossId: 'bloodmatron', icon: '✹', description: 'Cut through a living root network before it closes over the entrance.' },
  { id: 'drowned-sanctum', name: 'Drowned Sanctum', zoneId: 'redfen', factionId: 'mirebound', level: 13, waves: 7, bossId: 'bogsovereign', icon: '≋', description: 'Fight through a submerged parish while the waterline steadily advances.' },
  { id: 'chainworks-depths', name: 'Chainworks Depths', zoneId: 'cairnreach', factionId: 'cairn-compact', level: 16, waves: 7, bossId: 'chainregent', icon: '⛓', description: 'Break siege engines guarded by soldiers who never received the order to stand down.' },
  { id: 'burial-engine', name: 'The Burial Engine', zoneId: 'cairnreach', factionId: 'cairn-compact', level: 19, waves: 8, bossId: 'burialengine', icon: '⬡', description: 'A mobile tomb still trying to carry an entire fortress into the mountain.' },
  { id: 'mirror-vault', name: 'Mirror Vault', zoneId: 'veiled-road', factionId: 'veil-couriers', level: 22, waves: 7, bossId: 'mirrorapostle', icon: '◇', description: 'Every room reflects a different enemy order and a different version of your route.' },
  { id: 'night-road', name: 'The Night Road', zoneId: 'veiled-road', factionId: 'veil-couriers', level: 25, waves: 8, bossId: 'veiledoracle', icon: '☾', description: 'Run a road that collapses behind the covenant as rift packs close from both sides.' },
  { id: 'lower-belfry', name: 'Lower Belfry', zoneId: 'bellscar', factionId: 'unrung-choir', level: 28, waves: 8, bossId: 'tollingabbot', icon: '☉', description: 'Climb through unfinished bells and silence the hands that still try to ring them.' },
  { id: 'crypt-of-silence', name: 'Crypt of Silence', zoneId: 'bellscar', factionId: 'unrung-choir', level: 32, waves: 9, bossId: 'silenceincarnate', icon: '♮', description: 'The choir’s discarded silence has become a thing with weight, hunger, and a name.' }
];

export const delveById = (id) => DELVES.find((delve) => delve.id === id) ?? null;

export const ENDGAME_ACTIVITIES = [
  { id: 'abyss', name: 'Abyss Delve', icon: '◇', factionId: 'veil-couriers', description: 'Long randomized packs with escalating density and broad loot access.', waves: 6 },
  { id: 'hunt', name: 'Boss Hunt', icon: '✺', factionId: 'unrung-choir', description: 'A rotating campaign or world boss with a strong unique-item chance.', waves: 1 },
  { id: 'arena', name: 'Covenant Arena', icon: '⚔', factionId: 'cairn-compact', description: 'Coordinated waves ending in a reinforced elite cohort.', waves: 7 },
  { id: 'trial', name: 'Hybrid Class Trial', icon: '✦', factionId: 'ashen-accord', description: 'Build checks that reward alternating both oaths and forming Confluence.', waves: 5 },
  { id: 'siege', name: 'Cairn Siege', icon: '⬡', factionId: 'cairn-compact', description: 'Heavy shield lines, commanders, and war-beasts attack in formation.', waves: 8 },
  { id: 'ritual', name: 'Redfen Ritual', icon: '✹', factionId: 'mirebound', description: 'Destroy successive ritual circles before a blood-matron enters the field.', waves: 7 },
  { id: 'gauntlet', name: 'Bellscar Gauntlet', icon: '♬', factionId: 'unrung-choir', description: 'Three bosses in succession with only brief recovery between bells.', waves: 3 },
  { id: 'echoes', name: 'Veiled Echoes', icon: '☾', factionId: 'veil-couriers', description: 'Fast assassin packs and mirrored elites reward precise movement.', waves: 7 }
];

export const activityById = (id) => ENDGAME_ACTIVITIES.find((activity) => activity.id === id) ?? ENDGAME_ACTIVITIES[0];

export const ENDGAME_MODIFIERS = [
  { id: 'unstoppable', name: 'Unstoppable ranks', text: 'Elites periodically shed stagger.' },
  { id: 'splitting', name: 'Splitting projectiles', text: 'Enemy bolts split on impact.' },
  { id: 'darkness', name: 'Veiled darkness', text: 'Vision narrows beyond the immediate fight.' },
  { id: 'sanguine', name: 'Sanguine ground', text: 'Elite deaths leave hazardous blood.' },
  { id: 'bloodprice', name: 'Blood price', text: 'Enemy damage rises while health slowly drains.' },
  { id: 'frenzied', name: 'Frenzied ranks', text: 'Wounded enemies gain speed and attack force.' },
  { id: 'fortified', name: 'Fortified host', text: 'Enemies gain armor; elites begin behind a ward.' },
  { id: 'volatile', name: 'Volatile dead', text: 'Elite deaths erupt after a short warning.' },
  { id: 'suppressing', name: 'Suppressing field', text: 'Disruptors create fields that erode Barrier.' },
  { id: 'mirrored', name: 'Mirrored host', text: 'Major waves add a reflected elite from another region.' },
  { id: 'crowded', name: 'Crowded road', text: 'Packs contain an additional copy of their front line.' },
  { id: 'hungry', name: 'Hungry dark', text: 'Enemies recover health when they damage the covenant.' },
  { id: 'relentless', name: 'Relentless pursuit', text: 'Enemy recovery is shorter and retreats are rare.' },
  { id: 'executioner', name: 'Executioner’s law', text: 'Enemies deal more damage while the covenant is wounded.' },
  { id: 'oathstorm', name: 'Oathstorm', text: 'Periodic rift pulses force constant repositioning.' }
];
