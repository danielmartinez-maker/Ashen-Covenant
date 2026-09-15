import { LOOT_SOURCES, UNIQUES, lootSourceById, uniqueById } from '../data/items.js';

const normalized = (actions = [], meta = {}) => ({ actions: Array.isArray(actions) ? actions : [actions], ...meta });
const action = (type, detail = {}) => ({ type, ...detail });

const SPECIAL_BEHAVIORS = {
  'rootmother-heart': {
    id: 'rootmother-route', trigger: 'enemy-killed', summary: 'Cursed kills fold the road and return active cooldown time.',
    apply: ({ event, enemy } = {}) => normalized(event === 'enemy-killed' ? [action('cooldown-fold', { slots: ['skillOne', 'skillTwo'], seconds: 1.25, requiresCursed: true, eligible: (enemy?.cursed ?? 0) > 0 })] : [])
  },
  'regents-last-link': {
    id: 'regent-pressure', trigger: 'combat-hit', summary: 'Guard breaks and heavy staggers convert impact into forward pressure.',
    apply: ({ event, hitResult } = {}) => normalized(event === 'combat-hit' ? [action('momentum', { duration: 3, damageMultiplier: 1.12, speedMultiplier: 1.08, requiresBreak: true, eligible: Boolean(hitResult?.guardBroken || hitResult?.staggered) })] : [])
  },
  'map-of-five-edges': {
    id: 'five-edge-routing', trigger: 'ability-cast', summary: 'Casting rotates an edge that folds the next active cooldown.',
    apply: ({ event } = {}) => normalized(event === 'ability-cast' ? [action('route-edge', { cooldownSeconds: 0.65, cycle: 5 })] : [])
  },
  'cryptwardens-key': {
    id: 'cryptwarden-execution-cache', trigger: 'enemy-killed', summary: 'Executions against elites open a sealed execution cache.',
    apply: ({ event, enemy, source } = {}) => normalized(event === 'enemy-killed' ? [action('execution-cache', { minRarity: 'relic', sourceId: 'delve', requiresEliteExecution: true, eligible: Boolean(enemy?.elite && source === 'execution') })] : [])
  },
  'drowned-sovereigns-crown': {
    id: 'deepwater-ward', trigger: 'enemy-killed', summary: 'Cursed kills replenish a deep-water ward around the wearer.',
    apply: ({ event, enemy } = {}) => normalized(event === 'enemy-killed' ? [action('barrier', { maxHpRatio: 0.08, requiresCursed: true, eligible: (enemy?.cursed ?? 0) > 0 })] : [])
  },
  'apostles-mirror': {
    id: 'apostle-mirror', trigger: 'ability-resolve', summary: 'The mirror repeats a projectile path through a reflected technique.',
    apply: ({ event } = {}) => normalized(event === 'ability-resolve' ? [action('ability-hook', { rules: { projectileCount: 2, mirroredProjectile: true } })] : [])
  },
  'vessel-of-silence': {
    id: 'stored-silence', trigger: 'player-damaged', summary: 'Barrier absorption stores silence for the next Confluence strike.',
    apply: ({ event, absorbed = 0 } = {}) => normalized(event === 'player-damaged' ? [action('store-silence', { amount: absorbed, capRatio: 0.35, eligible: absorbed > 0 })] : [])
  },
  'accord-compass': {
    id: 'unfinished-road', trigger: 'world-event-resolved', summary: 'Finishing regional work biases the next road cache toward unfinished rewards.',
    apply: ({ event } = {}) => normalized(event === 'world-event-resolved' ? [action('cache-bias', { duration: 1, quality: 1 })] : [])
  },
  worldspine: {
    id: 'worldspine-rupture', trigger: 'ultimate', summary: 'Ultimate force ruptures the arena with the current Covenant affinity.',
    apply: ({ event, covenant } = {}) => normalized(event === 'ultimate' ? [action('covenant-rupture', { affinity: covenant?.primary ?? 'void', radius: 220, damageMultiplier: 0.75 })] : [])
  }
};

const defaultBehavior = (unique) => ({
  id: unique.power ?? `legacy:${unique.id}`,
  trigger: 'legacy',
  summary: unique.effect ?? `${unique.name} retains its authored legacy power.`,
  apply: ({ event = 'inspect' } = {}) => normalized(event === 'inspect' ? [] : [action('legacy-power', { power: unique.power ?? unique.id, event })])
});

export const UNIQUE_BEHAVIORS = Object.fromEntries(UNIQUES.map((unique) => [
  unique.id,
  SPECIAL_BEHAVIORS[unique.id] ?? defaultBehavior(unique)
]));

const rarityKind = (unique) => unique?.rarity === 'mythic' ? 'mythic' : 'unique';

export class LootSystem {
  behaviorFor(uniqueId) { return UNIQUE_BEHAVIORS[uniqueId] ?? null; }

  isUniqueEligible(unique, context = {}) {
    if (!unique) return false;
    if (unique.campaignId === 'chapter-two') return unique.verdict === context.verdict;
    if (unique.hybridId) return unique.hybridId === context.hybridId;
    if (unique.classId) return unique.classId === context.primary || unique.classId === context.secondary;
    return true;
  }

  eligibleUniques({ sourceId, rarity = 'unique', isEligible = () => true, targetFarm = false, preferredIds = [] } = {}) {
    const source = lootSourceById(sourceId);
    const ordered = (source?.uniqueIds ?? []).map(uniqueById).filter(Boolean).filter(isEligible);
    const fallback = UNIQUES.filter((unique) => !unique.campaignId && isEligible(unique));
    const base = ordered.length ? ordered : fallback;
    const desired = base.filter((unique) => rarityKind(unique) === rarity);
    const pool = desired.length ? desired : rarity === 'mythic' ? [] : base.filter((unique) => rarityKind(unique) === 'unique');
    if (!targetFarm || !preferredIds?.length) return pool;
    const preferred = new Set(preferredIds);
    return [...pool].sort((a, b) => Number(preferred.has(b.id)) - Number(preferred.has(a.id)));
  }

  pickUnique({ random = Math.random, ...options } = {}) {
    const pool = this.eligibleUniques(options);
    if (!pool.length) return null;
    return pool[Math.min(pool.length - 1, Math.floor(Math.max(0, Math.min(0.999999, random())) * pool.length))] ?? null;
  }

  abilityHooks(equipment = {}, abilityId = '') {
    const uniqueIds = Object.values(equipment ?? {}).map((item) => item?.uniqueId).filter(Boolean);
    const hooks = [];
    if (uniqueIds.includes('apostles-mirror') && /:skillOne$/.test(abilityId)) hooks.push({ id: 'apostle-mirror', source: 'apostles-mirror', rules: { projectileCount: 2, mirroredProjectile: true } });
    if (uniqueIds.includes('worldspine')) hooks.push({ id: 'worldspine-rupture', source: 'worldspine', rules: { damageMultiplier: 1.08, worldspineBound: true } });
    if (uniqueIds.includes('map-of-five-edges')) hooks.push({ id: 'five-edge-routing', source: 'map-of-five-edges', rules: { cooldownMultiplier: 0.94 } });
    return hooks;
  }

  applyBehavior(uniqueId, context = {}) {
    const behavior = this.behaviorFor(uniqueId);
    return behavior ? behavior.apply({ ...context, unique: uniqueById(uniqueId) }) : normalized([]);
  }
}

export const lootSourceOrder = (sourceId) => (LOOT_SOURCES.find((source) => source.id === sourceId)?.uniqueIds ?? []).slice();
