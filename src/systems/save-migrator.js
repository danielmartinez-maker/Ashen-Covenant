export const SAVE_SCHEMA_V19 = 19;
const ALIGNMENTS = ['flame', 'grave', 'blood', 'light', 'storm', 'void'];
const record = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
const bounded = (value, min = 0, max = 100, fallback = 0) => Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Number(value))) : fallback;

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
    return next;
  }
}
