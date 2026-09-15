import { BLACK_ROAD_BY_ID } from '../data/requiem.js';
import { EXPEDITION_BANES, EXPEDITION_BOONS } from '../data/reforged.js';

export const SAVE_SCHEMA_V19 = 19;
const ALIGNMENTS = ['flame', 'grave', 'blood', 'light', 'storm', 'void'];
const EXPEDITION_BOON_IDS = new Set(EXPEDITION_BOONS.map((entry) => entry.id));
const EXPEDITION_BANE_IDS = new Set(EXPEDITION_BANES.map((entry) => entry.id));
const record = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
const bounded = (value, min = 0, max = 100, fallback = 0) => Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Number(value))) : fallback;
const uniqueAllowedIds = (values, allowed) => Array.isArray(values)
  ? [...new Set(values.filter((id) => typeof id === 'string' && allowed.has(id)))]
  : [];
const uniqueStrings = (values) => Array.isArray(values)
  ? [...new Set(values.filter((id) => typeof id === 'string' && id.trim()))]
  : [];

export const defaultCovenantState = (raw = {}) => {
  const source = record(raw);
  const affinities = Object.fromEntries(ALIGNMENTS.map((id) => [id, bounded(record(source.affinities)[id])]));
  return {
    affinities,
    dominant: Array.isArray(source.dominant) ? source.dominant.filter((id) => ALIGNMENTS.includes(id)).slice(0, 2) : [],
    instability: bounded(source.instability, 0, 100),
    stage: Math.max(0, Math.min(5, Math.floor(Number(source.stage) || 0))),
    thresholdsSeen: Array.isArray(source.thresholdsSeen) ? [...new Set(source.thresholdsSeen.map(Number).filter((v) => v >= 1 && v <= 5))] : [],
    behaviorLedger: { ...record(source.behaviorLedger) },
    regionalResonance: { ...record(source.regionalResonance) },
    mutationsUnlocked: Array.isArray(source.mutationsUnlocked) ? [...new Set(source.mutationsUnlocked.filter((v) => typeof v === 'string'))] : [],
    metamorphosisFlags: { ...record(source.metamorphosisFlags) }
  };
};

const migrateHunters = (player) => {
  if (Array.isArray(player.hunters)) return clone(player.hunters);
  return (Array.isArray(player.nemeses) ? player.nemeses : []).map((nemesis, index) => ({
    id: `hunter-${nemesis?.id ?? index + 1}`,
    legacyNemesisId: nemesis?.id ?? null,
    name: nemesis?.name ?? `Nameless Hunter ${index + 1}`,
    factionId: nemesis?.factionId ?? 'grave',
    level: Math.max(1, Math.floor(Number(nemesis?.level) || 1)),
    encounters: Math.max(0, Math.floor(Number(nemesis?.wins) || 0) + Math.floor(Number(nemesis?.losses) || 0)),
    victories: Math.max(0, Math.floor(Number(nemesis?.wins) || 0)),
    defeats: Math.max(0, Math.floor(Number(nemesis?.losses) || 0)),
    scars: [], adaptations: [], learnedTags: {}, grudge: 0, cooldown: 0,
    targetReward: null, active: false, defeated: false
  }));
};

const normalizePendingRoute = (pendingRoute, completedStageIds, expeditionBoons, expedition, routeContext) => {
  if (!pendingRoute || typeof pendingRoute !== 'object' || Array.isArray(pendingRoute)) return null;
  const checkpoint = Number(pendingRoute.checkpoint);
  if (!Number.isInteger(checkpoint) || checkpoint <= 0 || checkpoint >= expedition.stages.length || checkpoint !== completedStageIds.length) return null;

  const ownedBoons = new Set(expeditionBoons);
  const choices = uniqueAllowedIds(pendingRoute.choices, EXPEDITION_BOON_IDS).filter((id) => !ownedBoons.has(id));
  const allowedMetamorphosis = new Set(uniqueStrings(routeContext?.metamorphosisChoiceIds));
  const metamorphosisChoices = uniqueStrings(pendingRoute.metamorphosisChoices).filter((id) => allowedMetamorphosis.has(id));
  if (!choices.length && !metamorphosisChoices.length) return null;

  return {
    checkpoint,
    room: checkpoint + 1,
    totalRooms: expedition.stages.length,
    choices,
    metamorphosisChoices
  };
};

const normalizeActiveOperation = (operation) => {
  if (!operation || typeof operation !== 'object' || Array.isArray(operation)) return operation;
  const next = clone(operation);
  if (next.blackRoad !== true) return next;
  const expedition = BLACK_ROAD_BY_ID[next.expeditionId];
  if (!expedition) return next;

  const claimedStageIds = new Set(
    Array.isArray(next.completedStageIds)
      ? next.completedStageIds.filter((id) => typeof id === 'string')
      : []
  );
  const completedStageIds = [];
  for (const stage of expedition.stages) {
    if (!claimedStageIds.has(stage.id)) break;
    completedStageIds.push(stage.id);
  }
  next.completedStageIds = completedStageIds;
  next.expeditionBoons = uniqueAllowedIds(next.expeditionBoons, EXPEDITION_BOON_IDS);
  next.expeditionBanes = uniqueAllowedIds(next.expeditionBanes, EXPEDITION_BANE_IDS);
  next.pendingRoute = normalizePendingRoute(next.pendingRoute, completedStageIds, next.expeditionBoons, expedition, next.routeContext);
  return next;
};

export class SaveMigrator {
  static migrate(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return snapshot;
    const next = clone(snapshot);
    next.version = SAVE_SCHEMA_V19;
    next.player = record(next.player);
    const player = next.player;
    player.covenant = defaultCovenantState(player.covenant);
    player.hunters = migrateHunters(player);
    const legacyRegions = record(record(player.reforged).world).regions;
    player.worldV2 = {
      regions: clone(record(record(player.worldV2).regions && Object.keys(record(player.worldV2).regions).length ? player.worldV2.regions : legacyRegions)),
      activeEvents: Array.isArray(player.worldV2?.activeEvents) ? clone(player.worldV2.activeEvents) : [],
      resolvedEvents: Array.isArray(player.worldV2?.resolvedEvents) ? clone(player.worldV2.resolvedEvents) : [],
      procession: player.worldV2?.procession ? clone(player.worldV2.procession) : null,
      tick: bounded(player.worldV2?.tick, 0, Number.MAX_SAFE_INTEGER, 0)
    };
    player.sanctuary = {
      level: Math.max(1, Math.min(5, Math.floor(Number(player.sanctuary?.level) || 1))),
      flags: { ...record(player.sanctuary?.flags) },
      merchants: { ...record(player.sanctuary?.merchants) },
      npcs: { ...record(player.sanctuary?.npcs) },
      architecture: Array.isArray(player.sanctuary?.architecture) ? clone(player.sanctuary.architecture) : [],
      discoveries: Array.isArray(player.sanctuary?.discoveries) ? clone(player.sanctuary.discoveries) : []
    };
    player.mutationProgress = {
      credits: Math.floor(bounded(player.mutationProgress?.credits, 0, 1_000_000, 0)),
      selections: { ...record(player.mutationProgress?.selections) },
      unlocked: Array.isArray(player.mutationProgress?.unlocked) ? [...new Set(player.mutationProgress.unlocked)] : [],
      legacyConverted: player.mutationProgress?.legacyConverted === true
    };
    if ('activeOperation' in next) next.activeOperation = normalizeActiveOperation(next.activeOperation);
    return next;
  }
}
