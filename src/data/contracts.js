import { choose, hash, seeded } from '../core/math.js';

export const CONTRACT_OBJECTIVES = {
  kill: { name: 'Cull the Host', unit: 'hostiles', baseTarget: 14, description: 'Defeat hostile creatures in the marked region.' },
  elite: { name: 'Break the Captains', unit: 'elites', baseTarget: 3, description: 'Defeat elite enemies in the marked region.' },
  event: { name: 'Answer the Alarm', unit: 'events', baseTarget: 1, description: 'Complete world events in the marked region.' },
  delve: { name: 'Descend Below', unit: 'delves', baseTarget: 1, description: 'Complete a delve tied to the marked region.' },
  stronghold: { name: 'Hold the Ground', unit: 'strongholds', baseTarget: 1, description: 'Reclaim or defend a regional stronghold.' },
  boss: { name: 'Take the Head', unit: 'bosses', baseTarget: 1, description: 'Defeat a boss tied to the marked region.' },
  operation: { name: 'Break the Seal', unit: 'missions', baseTarget: 1, description: 'Launch and complete the contract’s sealed mission.' }
};

export const CONTRACT_DIFFICULTIES = [
  { id: 'field', name: 'Field Order', icon: 'I', color: '#9fc8b9', tier: 1, minLevel: 1, minRank: 0, stepCount: 1, targetScale: 1, rewardScale: 1, clauseCount: 0, seals: 1, ledgerXp: 26, itemRarity: 'rare' },
  { id: 'veteran', name: 'Veteran Order', icon: 'II', color: '#86b9e6', tier: 2, minLevel: 18, minRank: 1, stepCount: 2, targetScale: 1.25, rewardScale: 1.55, clauseCount: 1, seals: 2, ledgerXp: 48, itemRarity: 'rare' },
  { id: 'heroic', name: 'Heroic Writ', icon: 'III', color: '#dfbf69', tier: 3, minLevel: 38, minRank: 3, stepCount: 3, targetScale: 1.62, rewardScale: 2.35, clauseCount: 2, seals: 3, ledgerXp: 78, itemRarity: 'relic' },
  { id: 'mythic', name: 'Mythic Writ', icon: 'IV', color: '#c78aef', tier: 4, minLevel: 68, minRank: 5, stepCount: 3, targetScale: 2.05, rewardScale: 3.65, clauseCount: 3, seals: 5, ledgerXp: 124, itemRarity: 'unique', operation: true },
  { id: 'apex', name: 'Apex Mandate', icon: 'V', color: '#ef758e', tier: 5, minLevel: 100, minRank: 8, stepCount: 4, targetScale: 2.55, rewardScale: 5.4, clauseCount: 4, seals: 8, ledgerXp: 190, itemRarity: 'mythic', operation: true }
];

export const contractDifficultyById = (id) => CONTRACT_DIFFICULTIES.find((entry) => entry.id === id) ?? CONTRACT_DIFFICULTIES[0];

export const CONTRACT_CLAUSES = [
  { id: 'swarming', name: 'Swarming Road', description: 'Regional packs gain additional bodies.', rewardBonus: 0.12, pressure: { population: 8, density: 1 } },
  { id: 'elite-host', name: 'Captain’s Muster', description: 'Elite enemies appear much more often.', rewardBonus: 0.14, pressure: { eliteChance: 0.22 } },
  { id: 'iron-ranks', name: 'Iron Ranks', description: 'Contract enemies gain 24% health and heavier armor.', rewardBonus: 0.14, pressure: { enemyHp: 0.24, enemyArmor: 8 } },
  { id: 'ruthless', name: 'Ruthless Terms', description: 'Contract enemies deal 18% more damage.', rewardBonus: 0.16, pressure: { enemyDamage: 0.18 } },
  { id: 'quickened', name: 'Quickened Host', description: 'Contract enemies move and recover 14% faster.', rewardBonus: 0.13, pressure: { enemySpeed: 0.14 } },
  { id: 'oathstorm', name: 'Oathstorm Clause', description: 'Sealed missions add periodic rift pulses.', rewardBonus: 0.18, modifierId: 'oathstorm' },
  { id: 'volatile', name: 'Volatile Remains', description: 'Elite deaths erupt after a short warning.', rewardBonus: 0.16, modifierId: 'volatile' },
  { id: 'hungry', name: 'Hungry Dark', description: 'Enemies recover health when they wound the covenant.', rewardBonus: 0.17, modifierId: 'hungry' }
];

export const contractClauseById = (id) => CONTRACT_CLAUSES.find((entry) => entry.id === id) ?? null;

export const CONTRACT_BONUSES = [
  { id: 'unbroken', name: 'Unbroken Oath', type: 'noDeath', target: 1, description: 'Finish the order without dying.' },
  { id: 'dry-flask', name: 'Dry Flask', type: 'noPotion', target: 1, description: 'Finish the order without using a potion.' },
  { id: 'execution-tithe', name: 'Execution Tithe', type: 'execution', target: 4, description: 'Execute staggered enemies in the contract region.' },
  { id: 'captains-due', name: 'Captain’s Due', type: 'elite', target: 3, description: 'Defeat additional elite enemies in the contract region.' }
];

export const contractBonusById = (id) => CONTRACT_BONUSES.find((entry) => entry.id === id) ?? null;

export const CONTRACT_LEDGER_RANKS = [
  { rank: 0, xp: 0, name: 'Unsigned', reward: 'Field Orders' },
  { rank: 1, xp: 80, name: 'Road Hand', reward: 'Veteran Orders' },
  { rank: 2, xp: 210, name: 'Seal Bearer', reward: 'One free board turn' },
  { rank: 3, xp: 430, name: 'Writ Keeper', reward: 'Heroic Writs' },
  { rank: 4, xp: 760, name: 'Quartermaster', reward: 'Fourth active slot' },
  { rank: 5, xp: 1_240, name: 'Black Ledger', reward: 'Mythic Writs' },
  { rank: 6, xp: 1_900, name: 'Faction Voice', reward: 'Improved optional rewards' },
  { rank: 7, xp: 2_780, name: 'Road Marshal', reward: 'Second free board turn' },
  { rank: 8, xp: 3_920, name: 'Mandate Keeper', reward: 'Apex Mandates' },
  { rank: 9, xp: 5_360, name: 'Covenant Hand', reward: 'Fifth active slot' },
  { rank: 10, xp: 7_200, name: 'Master of Seals', reward: 'Reliquary prices reduced' }
];

export const contractLedgerRankForXp = (xp) => CONTRACT_LEDGER_RANKS.reduce((rank, entry) => (xp >= entry.xp ? entry.rank : rank), 0);

export const CONTRACT_CACHE_OFFERS = [
  { id: 'road-cache', name: 'Road Cache', cost: 3, minRank: 0, minRarity: 'rare', sourceId: 'contracts', description: 'A reliable rare-or-better item and crafting bundle.' },
  { id: 'gravewake-cache', name: 'Gravewake Reliquary', cost: 6, minRank: 2, minRarity: 'relic', sourceId: 'gravewake', description: 'Target Gravewake sets and regional Uniques.' },
  { id: 'redfen-cache', name: 'Redfen Reliquary', cost: 6, minRank: 2, minRarity: 'relic', sourceId: 'redfen', description: 'Target Redfen sets and regional Uniques.' },
  { id: 'cairnreach-cache', name: 'Cairnreach Reliquary', cost: 6, minRank: 2, minRarity: 'relic', sourceId: 'cairnreach', description: 'Target Cairnreach sets and regional Uniques.' },
  { id: 'veiled-road-cache', name: 'Veiled Reliquary', cost: 6, minRank: 2, minRarity: 'relic', sourceId: 'veiled-road', description: 'Target Veiled Road sets and regional Uniques.' },
  { id: 'bellscar-cache', name: 'Bellscar Reliquary', cost: 6, minRank: 2, minRarity: 'relic', sourceId: 'bellscar', description: 'Target Bellscar sets and regional Uniques.' },
  { id: 'fated-cache', name: 'Fated Reliquary', cost: 11, minRank: 6, minRarity: 'relic', sourceId: 'contracts', guaranteedFated: true, description: 'A Relic or better with a guaranteed Fated affix.' },
  { id: 'mythic-cache', name: 'Master’s Reliquary', cost: 18, minRank: 10, minRarity: 'unique', sourceId: 'mythic-hunt', forceUnique: true, description: 'A guaranteed eligible Unique with an elevated Mythic chance.' }
];

export const contractCacheById = (id) => CONTRACT_CACHE_OFFERS.find((entry) => entry.id === id) ?? null;

const CONTRACT_SEEDS = {
  gravewake: {
    factionId: 'ashen-accord', minLevel: 1,
    entries: [
      ['Count the Unburied', 'kill', 'The burial road is filling faster than the keepers can count.'],
      ['Gallows-Crow Cull', 'elite', 'Carrion captains are teaching the flocks to hunt by name.'],
      ['Waystone Vigil', 'event', 'Hold every alarm that reaches the old waystone.'],
      ['Mourner Escort', 'delve', 'Open the flooded memorial road beneath the fields.'],
      ['Ossuary Sweep', 'stronghold', 'Take back the ground above the sunken dead.'],
      ['The Returned Name', 'boss', 'A named horror has returned to claim its grave.']
    ]
  },
  redfen: {
    factionId: 'mirebound', minLevel: 8,
    entries: [
      ['Thin the Bloodreeds', 'kill', 'The reeds have begun walking after sundown.'],
      ['Drowned Parish', 'elite', 'Break the parish wardens before they toll the water.'],
      ['Root-Curse Samples', 'event', 'Secure live samples while the mire fights back.'],
      ['Leechwater Rescue', 'delve', 'Find the missing hands below the black water.'],
      ['Sluice Defence', 'stronghold', 'Keep the scarlet floodgates in mortal hands.'],
      ['Matron’s Brood', 'boss', 'Cut the bloodline at its eldest root.']
    ]
  },
  cairnreach: {
    factionId: 'cairn-compact', minLevel: 15,
    entries: [
      ['Raise the Rampart', 'kill', 'Clear the masons’ line before the next stone is set.'],
      ['Break the Chain Crews', 'elite', 'The old siege captains are rebuilding their engines.'],
      ['Recover the Standards', 'event', 'Answer every signal still flying over the ruins.'],
      ['Foundry Purge', 'delve', 'Descend where the cold furnaces have begun breathing.'],
      ['Guard the Masons', 'stronghold', 'Hold the wall while the Compact seals its breaches.'],
      ['A Regent’s Challenge', 'boss', 'Answer the fortress commander in the old language of steel.']
    ]
  },
  'veiled-road': {
    factionId: 'veil-couriers', minLevel: 22,
    entries: [
      ['Deliver the Unopened', 'kill', 'Clear a route for a letter that must remain sealed.'],
      ['Shatter False Mirrors', 'elite', 'Reflected captains have started replacing the living.'],
      ['Close the Rift Mile', 'event', 'Stabilize every break before the road folds again.'],
      ['Find the Lost Courier', 'delve', 'Follow the courier into a road beneath the road.'],
      ['Cross Moonless', 'stronghold', 'Hold the last reliable step before Bellscar.'],
      ['Hunt the Oracle', 'boss', 'Silence the voice predicting every failed route.']
    ]
  },
  bellscar: {
    factionId: 'unrung-choir', minLevel: 28,
    entries: [
      ['Gather Bell Shards', 'kill', 'Recover the fragments before the obedient dead do.'],
      ['Golden Close Patrol', 'elite', 'Break the commanders marching the cathedral courts.'],
      ['Ashen Transept', 'event', 'Answer the alarms rising through the votive ash.'],
      ['Names from the Nave', 'delve', 'Descend for names the Choir could not erase.'],
      ['Vault Descent', 'stronghold', 'Secure the prisons beneath the deepest bells.'],
      ['Silence the Hand', 'boss', 'Cut down the hand still reaching for the final rope.']
    ]
  }
};

const CONTRACT_ROUTES = {
  kill: ['kill'],
  elite: ['kill', 'elite'],
  event: ['kill', 'elite', 'event'],
  delve: ['kill', 'elite', 'delve'],
  stronghold: ['kill', 'event', 'stronghold'],
  boss: ['kill', 'elite', 'event', 'boss']
};

export const CONTRACTS = Object.entries(CONTRACT_SEEDS).flatMap(([zoneId, seed]) => seed.entries.map((entry, index) => {
  const objective = CONTRACT_OBJECTIVES[entry[1]];
  return {
    id: `${zoneId}-contract-${index + 1}`,
    name: entry[0],
    zoneId,
    factionId: seed.factionId,
    minLevel: seed.minLevel,
    type: entry[1],
    target: objective.baseTarget,
    description: objective.description,
    flavor: entry[2],
    route: CONTRACT_ROUTES[entry[1]],
    gold: 90 + index * 35,
    renown: 22 + index * 6,
    material: index >= 5 ? 'echoes' : index >= 3 ? 'alloys' : 'shards',
    materialAmount: index >= 5 ? 1 : index >= 3 ? 2 : 3
  };
}));

export const contractById = (id) => CONTRACTS.find((contract) => contract.id === id) ?? null;

const targetFor = (type, difficulty) => {
  const objective = CONTRACT_OBJECTIVES[type];
  if (!objective) return 1;
  if (['boss', 'stronghold', 'operation'].includes(type)) return 1;
  if (type === 'delve') return difficulty.tier >= 5 ? 2 : 1;
  if (type === 'event') return difficulty.tier >= 4 ? 2 : 1;
  return Math.max(1, Math.ceil(objective.baseTarget * difficulty.targetScale));
};

const selectUnique = (items, count, random) => {
  const pool = items.slice();
  const selected = [];
  while (pool.length && selected.length < count) selected.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  return selected;
};

export const buildContractOffer = ({ blueprintId, difficultyId = 'field', seed = 1, level = 1 } = {}) => {
  const blueprint = contractById(blueprintId);
  if (!blueprint) return null;
  const difficulty = contractDifficultyById(difficultyId);
  const offeredLevel = Math.max(1, Math.min(100, Math.floor(Number(level) || 1)));
  const safeSeed = (Number(seed) >>> 0) || hash(`${blueprint.id}:${difficulty.id}:${offeredLevel}`);
  const random = seeded(`${safeSeed}:${blueprint.id}:${difficulty.id}`);
  const baseRoute = blueprint.route.slice(-Math.max(1, difficulty.stepCount));
  while (baseRoute.length < difficulty.stepCount) baseRoute.unshift(baseRoute[0] === 'kill' ? 'elite' : 'kill');
  const route = difficulty.operation ? [...baseRoute, 'operation'] : baseRoute;
  const steps = route.map((type, index) => {
    const objective = CONTRACT_OBJECTIVES[type];
    const target = targetFor(type, difficulty);
    return {
      id: `${blueprint.id}-step-${index + 1}`,
      type,
      target,
      name: objective.name,
      description: type === 'operation' ? `Enter the sealed ${blueprint.name} mission and defeat its final host.` : objective.description,
      unit: objective.unit
    };
  });
  const clauses = selectUnique(CONTRACT_CLAUSES, difficulty.clauseCount, random);
  const bonusPool = CONTRACT_BONUSES.filter((bonus) => bonus.type !== 'elite' || steps.some((step) => ['kill', 'elite', 'operation'].includes(step.type)));
  const bonusDefinition = choose(bonusPool, random);
  const bonusScale = bonusDefinition.type === 'execution' || bonusDefinition.type === 'elite' ? Math.max(1, Math.ceil(bonusDefinition.target * (0.75 + difficulty.tier * 0.22))) : 1;
  const clauseMultiplier = 1 + clauses.reduce((sum, clause) => sum + clause.rewardBonus, 0);
  const gold = Math.round((115 + offeredLevel * 8 + steps.reduce((sum, step) => sum + step.target * 4, 0)) * difficulty.rewardScale * clauseMultiplier);
  const renown = Math.round((20 + difficulty.tier * 9 + steps.length * 5) * (1 + clauses.length * 0.08));
  const material = difficulty.tier >= 5 ? 'cores' : difficulty.tier >= 4 ? 'prisms' : difficulty.tier >= 3 ? 'echoes' : difficulty.tier >= 2 ? 'alloys' : 'shards';
  const materialAmount = Math.max(1, Math.ceil((difficulty.tier + clauses.length) * (difficulty.tier >= 4 ? 0.75 : 1.15)));
  return {
    id: `${blueprint.id}~${difficulty.id}~${safeSeed.toString(36)}`,
    blueprintId: blueprint.id,
    seed: safeSeed,
    offeredLevel,
    name: blueprint.name,
    zoneId: blueprint.zoneId,
    factionId: blueprint.factionId,
    flavor: blueprint.flavor,
    difficultyId: difficulty.id,
    difficulty: difficulty.name,
    difficultyTier: difficulty.tier,
    difficultyIcon: difficulty.icon,
    difficultyColor: difficulty.color,
    type: steps[0].type,
    target: steps[0].target,
    description: steps[0].description,
    steps,
    clauses: clauses.map((clause) => clause.id),
    bonus: { id: bonusDefinition.id, type: bonusDefinition.type, target: bonusScale, name: bonusDefinition.name, description: bonusDefinition.description },
    gold,
    renown,
    material,
    materialAmount,
    seals: difficulty.seals,
    ledgerXp: difficulty.ledgerXp,
    itemRarity: difficulty.itemRarity,
    rewardSourceId: blueprint.zoneId,
    operation: difficulty.operation === true
  };
};

export const unlockedContractDifficulties = (level, ledgerRank) => CONTRACT_DIFFICULTIES.filter((entry) => level >= entry.minLevel && ledgerRank >= entry.minRank);
