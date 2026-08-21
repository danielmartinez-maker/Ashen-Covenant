import { LEVEL_XP, MAX_LEVEL, RARITY_COLORS, SKILL_POINT_LEVEL_CAP, TICK_LIMIT, WORLD_SIZE } from '../core/constants.js';
import { classMixStats, getClass, getHybrid, SKILL_IMPRINTS } from '../data/classes.js';
import { ELITE_AFFIXES, ENCOUNTER_TEMPLATES, ENEMIES, encountersForZone } from '../data/enemies.js';
import { AFFIXES, ITEM_BASES, LOOT_SOURCES, MASTERWORK_MAX_RANK, MASTERWORK_MILESTONES, MASTERWORK_STAGES, RARITIES, RUNES, SET_COLLECTIONS, UNIQUES, lootSourceById, rarityById, runeById, setById, uniqueById } from '../data/items.js';
import { MASTERY_DOCTRINES, MASTERY_ORDER, MASTERY_TRACKS, RELIC_AWAKENINGS, getMasteryDoctrine, getMasteryTrack, masteryRankFor, nextMasteryThreshold, nextRelicBondThreshold, relicBondRankFor } from '../data/progression.js';
import { LANDMARKS, WORLD_EVENTS, ZONES, zoneAt } from '../data/world.js';
import { CAMPAIGN_CHAPTERS, CAMPAIGN_DIALOGUES, CHOIR_SEALS, CHOIR_VERDICTS, EXPANSION_ACTS, chapterIsComplete, createCampaignState, getCampaignChapter, getCampaignStage, normalizeCampaignState } from '../data/campaign.js';
import { DELVES, DISTRICTS, ENDGAME_ACTIVITIES, ENDGAME_MODIFIERS, FACTIONS, FACTION_RANKS, activityById, delveById, districtAt, factionById } from '../data/expansion.js';
import { CONTRACTS, CONTRACT_CACHE_OFFERS, CONTRACT_CLAUSES, CONTRACT_DIFFICULTIES, CONTRACT_LEDGER_RANKS, buildContractOffer, contractBonusById, contractById, contractCacheById, contractClauseById, contractDifficultyById, contractLedgerRankForXp, unlockedContractDifficulties } from '../data/contracts.js';
import { ASCENSION_TIERS, JOURNEY_BANDS, JOURNEY_REQUIRED_TASKS, LEGACY_PATHS, LEVEL_REWARDS, PILLARS, ascensionChoiceById, ascensionTierForLevel, journeyBandById, journeyBandForLevel, legacyPathById, legacyXpForRank, pillarById } from '../data/leveling.js';
import { PARAGON_BOARDS, PARAGON_ENTRY_BOARD_ID, PARAGON_GLYPHS, PARAGON_MAX_RANK, glyphUpgradeCost, paragonBoardById, paragonGlyphById, paragonNodeById, paragonXpForRank } from '../data/paragon.js';
import {
  BESTIARY_FAMILIES, BESTIARY_INSIGHTS, CAMPAIGN_DECREES, COMBAT_REACTIONS, ECLIPSE_WEB, EVENT_ARCS,
  EXPEDITION_BANES, EXPEDITION_BOONS, FACTION_DOCTRINES, FACTION_OFFERS, FORGE_DISCIPLINES, FORGE_RANK_XP,
  HYBRID_MUTATIONS, MASTERY_EVOLUTIONS, PARAGON_CONSTELLATIONS, RELIC_MEMORIES, STRONGHOLD_PROJECTS,
  SYSTEM_DEPTH_AUDIT, WORLD_OATHS, activeParagonConstellations, bestiaryFamilyForRole, campaignDecreeById,
  eclipseNodeById, eventArcByZone, factionDoctrineById, forgeDisciplineById, hybridMutationById,
  masteryEvolutionById, relicMemoryById, worldOathById
} from '../data/reforged.js';
import { angleTo, choose, clamp, distance, fromAngle, length, normalize, range, seeded, wrapAngle } from '../core/math.js';
import { loadSave, saveRun } from './save.js';
import { DomainEventBus } from './domain-events.js';
import { SaveMigrator, SAVE_SCHEMA_V19, defaultCovenantState } from './save-migrator.js';
import { CovenantSystem } from './covenant.js';
import { AbilitySystem } from './abilities.js';
import { ProgressionSystem } from './progression-v6.js';
import { CombatSystem, combatProfileForRole } from './combat.js';
import { EnemyDirector, doctrineFactionForZone } from './enemy-director.js';
import { HunterSystem } from './hunters.js';
import { BossController } from './boss-controller.js';
import { LootSystem } from './loot.js';
import { WorldStateManager } from './world-state.js';
import { SanctuarySystem } from './sanctuary.js';
import { resolveCovenantPresentationIdentity } from '../presentation/covenant-identity.js';
import { EndgameContextSystem } from './endgame-context.js';
import { abilityIdFor } from '../data/ability-mutations.js';
import { WorldGeometrySystem } from './world-geometry.js';
import { DESTRUCTIBLE_PROFILES } from '../data/presentation.js';
import { enemyActionVfx, playerActionVfx } from '../data/action-vfx.js';
import {
  BLACK_ROAD_BY_ID, BLACK_ROAD_EXPEDITIONS, CLASS_MECHANICS, DIFFICULTY_PROFILES,
  ENCOUNTER_ROOM_BY_ID, ENCOUNTER_ROOMS, REQUIEM_RELEASE, TUTORIAL_STEPS,
  activeTutorialStep, blackRoadForZone, createRequiemState, roomsForZone
} from '../data/requiem.js';

const uid = (() => {
  let value = 1;
  return (prefix = 'id') => `${prefix}-${value++}`;
})();

const roleRanges = {
  melee: 48, shield: 60, brute: 72, ranged: 320, healer: 350, commander: 300,
  assassin: 52, burrower: 58, summoner: 300, disruptor: 170, boss: 92
};

const BOSS_PHASE_LINES = {
  cryptwarden: ['The Cryptwarden opens the drowned procession.', 'Every sealed tomb answers Sile.'],
  bloodmatron: ['Avarra roots herself in the covenant’s blood.', 'The Blood Matron tears open her borrowed heart.'],
  bogsovereign: ['The drowned court rises with its sovereign.', 'Black water claims the final ground.'],
  burialengine: ['The Burial Engine opens another sealed chamber.', 'Every tomb inside the engine begins to march.'],
  chainregent: ['Odran draws the fortress chains tight.', 'The Chain Regent issues his final command.'],
  mirrorapostle: ['The Apostle steps into a second reflection.', 'Every surviving mirror turns toward the covenant.'],
  veiledoracle: ['Noxara folds the Fifth Road around the arena.', 'The Oracle erases every path but one.'],
  silenceincarnate: ['Silence gathers enough weight to break stone.', 'The final absence begins to speak.']
};

const CONTRACT_BOSSES = {
  gravewake: 'cryptwarden',
  redfen: 'bloodmatron',
  cairnreach: 'chainregent',
  'veiled-road': 'veiledoracle',
  bellscar: 'silenceincarnate'
};

const activityNames = Object.fromEntries(ENDGAME_ACTIVITIES.map((activity) => [activity.id, activity.name]));
activityNames.delve = 'Regional Delve';
activityNames.contract = 'Sealed Contract';
activityNames['black-road'] = 'Black Road Expedition';
const endgameModifiers = ENDGAME_MODIFIERS;

const INVENTORY_CAPACITY = 60;
const STASH_CAPACITY = 180;
const ITEM_SLOTS = new Set(ITEM_BASES.map((item) => item.slot));
const ITEM_RARITIES = new Set(RARITIES.map((rarity) => rarity.id));
const AFFIX_BY_STAT = new Map(AFFIXES.map((affix) => [affix.stat, affix]));
const FATED_AFFIX_STATS = new Set(AFFIXES.filter((affix) => affix.kind === 'fated').map((affix) => affix.stat));
const UNIQUE_IDS = new Set(UNIQUES.map((item) => item.id));
const RUNE_IDS = new Set(RUNES.map((rune) => rune.id));
const SET_IDS = new Set(SET_COLLECTIONS.map((set) => set.id));
const RARITY_SCORE = Object.fromEntries(RARITIES.map((rarity) => [rarity.id, rarity.score]));
const MAX_PROJECTILES = 180;
const MAX_HAZARDS = 90;
const MAX_EFFECTS = 260;
const MAX_PARTICLES = 760;
const MAX_CORPSES = 48;
const GRAVITY = 1520;
const MAX_ELEVATION = 180;
const FACING_STEP = Math.PI / 4;
const PLAYER_TURN_RATE = 6.8;
const COMMITTED_TURN_RATE = 2.8;

const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const finite = (value, fallback = 0, min = -Infinity, max = Infinity) => {
  const number = Number(value);
  return Number.isFinite(number) ? clamp(number, min, max) : fallback;
};
const integer = (value, fallback = 0, min = -Infinity, max = Infinity) => Math.floor(finite(value, fallback, min, max));
const text = (value, fallback, maxLength = 140) => typeof value === 'string' && value.trim() ? value.slice(0, maxLength) : fallback;
const skillPointBudgetForLevel = (level) => Math.max(0, Math.min(SKILL_POINT_LEVEL_CAP, integer(level, 1, 1, MAX_LEVEL)) - 1);
const approach = (current, target, maximumDelta) => current < target
  ? Math.min(target, current + maximumDelta)
  : Math.max(target, current - maximumDelta);

export class GameEngine {
  constructor(input, renderer, settings) {
    this.input = input;
    this.renderer = renderer;
    this.settings = { reducedVfx: false, graphicsQuality: 'high', ...settings };
    this.worldGeometry = new WorldGeometrySystem();
    this.listeners = new Map();
    this.domainEvents = new DomainEventBus();
    this.covenantSystem = new CovenantSystem(this.domainEvents);
    this.abilitySystem = new AbilitySystem();
    this.progressionSystem = new ProgressionSystem();
    this.combatSystem = new CombatSystem();
    this.enemyDirector = new EnemyDirector();
    this.hunterSystem = new HunterSystem();
    this.bossController = new BossController(this.domainEvents);
    this.lootSystem = new LootSystem();
    this.worldStateManager = new WorldStateManager();
    this.sanctuarySystem = new SanctuarySystem();
    this.endgameContextSystem = new EndgameContextSystem();
    this.state = 'menu';
    this.clock = 0;
    this.seed = Date.now();
    this.random = seeded(this.seed);
    this.camera = { x: 0, y: 0, shake: 0, flash: 0, zoom: 1, follow: 0.11, offsetY: 0, presentationShake: 0, profileId: 'menu', lookAheadX: 0, lookAheadY: 0, deadZone: 34, bossBlend: 0 };
    this.presentation = null;
    this.entities = this._emptyEntities();
    this.player = null;
    this.objective = { title: 'Choose two oaths', detail: 'A covenant needs two disciplines.', progress: 0, total: 1 };
    this.worldEvent = null;
    this.endgame = null;
    this.pendingCampaignDialogue = null;
    this.groupMemory = new Map();
    this.hitStop = 0;
    this.autoSave = 0;
    this.saveWarningShown = false;
    this.lastZoneId = null;
    this.lastDistrictId = null;
    this.populationTimer = 0;
    this.encounter = { activeRoomId: null, activeGroupId: null, state: 'exploration', remaining: 0, total: 0, roomStreak: 0, announcedRoomId: null, clearedAt: 0 };
    this.stats = { kills: 0, bosses: 0, damage: 0, deaths: 0, events: 0 };
  }

  _emptyEntities() {
    return { enemies: [], projectiles: [], hazards: [], effects: [], particles: [], corpses: [], destructibles: [], loot: [], landmarks: LANDMARKS.map((landmark) => ({ ...landmark })) };
  }

  on(event, listener) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(listener);
    return () => this.listeners.get(event)?.delete(listener);
  }

  bindPresentation(presentation) {
    this.presentation = presentation ?? null;
    return this.presentation;
  }

  emit(event, detail = {}) {
    this.listeners.get(event)?.forEach((listener) => listener(detail));
  }

  notify(message, tone = 'normal') {
    this.emit('toast', { message, tone });
  }

  hasSave() {
    const snapshot = loadSave();
    return this._isLoadableSnapshot(snapshot);
  }

  _presentationAssetsReady() {
    if (typeof this.renderer?.getAssetStatus !== 'function') return true;
    const status = this.renderer.getAssetStatus();
    if (status.ready) return true;
    const detail = status.failed?.length
      ? `Required gameplay art failed to load: ${status.failed.join(', ')}.`
      : 'Required gameplay art is still loading. Please try again in a moment.';
    this.notify(detail, 'warning');
    return false;
  }

  start(primary, secondary) {
    if (!this._presentationAssetsReady()) return false;
    if (!this._prepareRun(primary, secondary)) return false;
    this._finishRunStart(false);
    this.save();
    return true;
  }

  _isLoadableSnapshot(snapshot) {
    return isRecord(snapshot) && isRecord(snapshot.player) && typeof snapshot.primary === 'string' && typeof snapshot.secondary === 'string' && snapshot.primary !== snapshot.secondary && Boolean(getHybrid(snapshot.primary, snapshot.secondary));
  }

  _prepareRun(primary, secondary) {
    if (typeof primary !== 'string' || typeof secondary !== 'string' || primary === secondary || !getHybrid(primary, secondary)) return false;
    this.seed = Date.now();
    this.random = seeded(this.seed);
    this.clock = 0;
    this.autoSave = 0;
    this.hitStop = 0;
    this.lastZoneId = null;
    this.lastDistrictId = null;
    this.populationTimer = 0;
    this.encounter = { activeRoomId: null, activeGroupId: null, state: 'exploration', remaining: 0, total: 0, roomStreak: 0, announcedRoomId: null, clearedAt: 0 };
    this.camera = { x: 0, y: 0, shake: 0, flash: 0, zoom: 1, follow: 0.11, offsetY: 0, presentationShake: 0, profileId: 'exploration', lookAheadX: 0, lookAheadY: 0, deadZone: 34, bossBlend: 0 };
    this.entities = this._emptyEntities();
    this.groupMemory.clear();
    this.player = this._makePlayer(primary, secondary);
    this.stats = { kills: 0, bosses: 0, damage: 0, deaths: 0, events: 0 };
    this.endgame = null;
    this.worldEvent = null;
    this.pendingCampaignDialogue = null;
    this.state = 'playing';
    this._spawnCampaignWorld();
    this._focusCamera(true);
    this._setCampaignObjective();
    return true;
  }

  _finishRunStart(restored) {
    this.emit('run-started', { player: this.player, hybrid: this.getHybrid() });
    this.notify(restored ? 'Covenant restored.' : `${this.getHybrid().name} sworn. The road remembers.`, 'accent');
    if (!restored && !this.player.campaign.dialogueSeen['chapter-one-opening']) this._queueCampaignDialogue('chapter-one-opening');
  }

  continueRun() {
    if (!this._presentationAssetsReady()) return false;
    const snapshot = loadSave();
    if (!this._isLoadableSnapshot(snapshot)) return false;
    if (!this._prepareRun(snapshot.primary, snapshot.secondary)) return false;
    try {
      this._restoreSnapshot(snapshot);
      this._focusCamera(true);
      this._finishRunStart(true);
      this.save();
      return true;
    } catch {
      this.state = 'menu';
      this.player = null;
      this.entities = this._emptyEntities();
      this.worldEvent = null;
      this.endgame = null;
      this.notify('This covenant could not be restored safely. Its save file was left untouched.', 'warning');
      return false;
    }
  }

  _restoreSnapshot(snapshot) {
    snapshot = SaveMigrator.migrate(snapshot);
    const player = this.player;
    const saved = snapshot.player ?? {};
    player.level = integer(saved.level, 1, 1, MAX_LEVEL);
    player.xp = finite(saved.xp, 0, 0, LEVEL_XP[player.level - 1] ?? 0);
    player.gold = integer(saved.gold, 0, 0, 1_000_000_000);
    player.inventorySort = ['rarity', 'slot', 'name'].includes(saved.inventorySort) ? saved.inventorySort : 'rarity';
    player.materials = this._normalizeMaterials(saved.materials);
    player.runes = this._normalizeRunes(saved.runes);
    player.aspects = this._normalizeAspects(saved.aspects);
    player.attunedAspects = this._normalizeAttunedAspects(saved.attunedAspects ?? [saved.attunedAspect], player.aspects, player.level);
    player.attunedAspect = player.attunedAspects[0] ?? null;
    player.lootCollection = this._normalizeLootCollection(saved.lootCollection);
    player.lootPity = this._normalizeLootPity(saved.lootPity);
    player.lootTarget = UNIQUE_IDS.has(saved.lootTarget) && this._isUniqueEligible(uniqueById(saved.lootTarget)) ? saved.lootTarget : null;
    player.worldProgress = this._normalizeWorldProgress(saved.worldProgress);
    player.endgameRecords = this._normalizeEndgameRecords(saved.endgameRecords);
    player.nemeses = this._normalizeNemeses(saved.nemeses);
    player.hunters = Array.isArray(saved.hunters) ? saved.hunters.map((hunter) => this.hunterSystem.normalize(hunter)) : [];
    player.covenant = defaultCovenantState(saved.covenant);
    player.worldV2 = this.worldStateManager.normalize(saved.worldV2);
    player.sanctuary = this.sanctuarySystem.normalizeStored(saved.sanctuary);
    player.mutationProgress = isRecord(saved.mutationProgress) ? saved.mutationProgress : { credits: 0, selections: {}, unlocked: [], legacyConverted: false };
    player.campaign = normalizeCampaignState(saved.campaign, !Object.prototype.hasOwnProperty.call(saved, 'campaign'));
    player.factions = this._normalizeFactionProgress(saved.factions);
    player.contracts = this._normalizeContracts(saved.contracts, player.level);
    player.leveling = this._normalizeLeveling(saved.leveling, player.level);

    const seenItems = new Set();
    player.inventory = this._normalizeItemCollection(saved.inventory, INVENTORY_CAPACITY, seenItems);
    player.stash = this._normalizeItemCollection(saved.stash, STASH_CAPACITY, seenItems);
    player.equipment = this._normalizeEquipment(saved.equipment, seenItems);
    const ownedItems = new Map([...player.inventory, ...player.stash, ...Object.values(player.equipment)].map((item) => [item.id, item]));
    player.itemLocks = this._normalizeItemLocks(saved.itemLocks, ownedItems);
    player.loadouts = this._normalizeLoadouts(saved.loadouts, ownedItems);
    player.skillImprints = this._normalizeImprints(saved.skillImprints, player.level);
    player.abilityMastery = this._normalizeAbilityMastery(saved.abilityMastery, player.level);
    player.masteryDoctrines = this._normalizeMasteryDoctrines(saved.masteryDoctrines, player.abilityMastery);
    player.reforged = this._normalizeReforged(saved.reforged, player);
    player.requiem = createRequiemState(saved.requiem);
    this.progressionSystem.convertLegacy(player, player.primary);
    player.resonance = finite(saved.resonance, 0, 0, 99.99);
    player.confluence = integer(saved.confluence, 0, 0, 3);
    player.lastResonanceFamily = typeof saved.lastResonanceFamily === 'string' ? saved.lastResonanceFamily.slice(0, 24) : null;
    this._restoreSkillRanks(saved.skillRanks);
    const spentPoints = Object.values(player.skillRanks).reduce((total, rank) => total + rank, 0);
    const skillBudget = skillPointBudgetForLevel(player.level);
    player.skillPoints = integer(saved.skillPoints, Math.max(0, skillBudget - spentPoints), 0, Math.max(0, skillBudget - spentPoints));

    this._refreshPlayerStats(false);
    player.potions = integer(saved.potions, player.maxPotions, 0, player.maxPotions);
    player.x = finite(saved.x, player.x, 50, WORLD_SIZE.width - 50);
    player.y = finite(saved.y, player.y, 50, WORLD_SIZE.height - 50);
    this._moveBodyWithGeometry(player, player.x, player.y);
    player.hp = finite(saved.hp, player.maxHp, 1, player.maxHp);
    player.resource = finite(saved.resource, player.maxResource, 0, player.maxResource);
    // Dynamic enemies are intentionally not serialized. Rebuild the campaign
    // from the restored world-pressure state so a reclaimed or corrupted zone
    // feels the same after a load as it did before saving.
    this.entities = this._emptyEntities();
    this.groupMemory.clear();
    this._spawnCampaignWorld();
    if (snapshot.activeOperation?.blackRoad) this._restoreActiveOperation(snapshot.activeOperation);
    if (isRecord(snapshot.stats)) {
      this.stats = {
        kills: integer(snapshot.stats.kills, 0, 0, 1_000_000_000),
        bosses: integer(snapshot.stats.bosses, 0, 0, 1_000_000),
        damage: integer(snapshot.stats.damage, 0, 0, 1_000_000_000),
        deaths: integer(snapshot.stats.deaths, 0, 0, 1_000_000),
        events: integer(snapshot.stats.events, 0, 0, 1_000_000)
      };
    }
    if (!saved.leveling) this._seedLegacyJourney();
    if (player.level >= MAX_LEVEL && player.xp > 0) {
      player.leveling.paragonXp = integer(player.leveling.paragonXp + player.xp, player.leveling.paragonXp, 0, 1_000_000_000);
      player.xp = 0;
    }
    this._setCampaignObjective();
  }

  _normalizeItemCollection(value, capacity, seen) {
    if (!Array.isArray(value)) return [];
    const items = [];
    for (const rawItem of value) {
      if (items.length >= capacity) break;
      const item = this._normalizeItem(rawItem, seen);
      if (item) items.push(item);
    }
    return items;
  }

  _normalizeEquipment(value, seen) {
    if (!isRecord(value)) return {};
    const equipment = {};
    for (const rawItem of Object.values(value)) {
      const item = this._normalizeItem(rawItem, seen);
      if (item && !equipment[item.slot]) equipment[item.slot] = item;
    }
    return equipment;
  }

  _normalizeItem(rawItem, seen) {
    if (!isRecord(rawItem) || !ITEM_SLOTS.has(rawItem.slot)) return null;
    let id = typeof rawItem.id === 'string' && /^[A-Za-z0-9_-]{1,96}$/.test(rawItem.id) ? rawItem.id : '';
    if (!id || seen.has(id)) id = uid('restored-item');
    seen.add(id);
    const base = ITEM_BASES.find((entry) => entry.id === rawItem.baseId && entry.slot === rawItem.slot) ?? null;
    const uniqueDefinition = uniqueById(rawItem.uniqueId);
    const uniqueId = uniqueDefinition?.slot === rawItem.slot ? uniqueDefinition.id : null;
    const rarity = uniqueId ? (uniqueDefinition.rarity === 'mythic' ? 'mythic' : 'unique') : (ITEM_RARITIES.has(rawItem.rarity) ? rawItem.rarity : 'common');
    const maxAffixes = Math.min(7, rarityById(rarity).affixes + 2);
    const affixes = Array.isArray(rawItem.affixes) ? rawItem.affixes.filter((affix) => isRecord(affix) && AFFIX_BY_STAT.has(affix.stat)).slice(0, maxAffixes).map((affix) => {
      const template = AFFIX_BY_STAT.get(affix.stat);
      return {
        stat: affix.stat,
        label: text(affix.label, template.label, 80),
        value: finite(affix.value, 0, -10_000, 10_000),
        percentage: affix.percentage === true || template.percentage === true,
        tier: integer(affix.tier, 1, 1, 5)
      };
    }) : [];
    // Early saves did not persist base implicits. Derive those values from the
    // base rather than dereferencing a missing object and rejecting the whole
    // character during migration.
    const savedImplicit = isRecord(rawItem.implicit) && AFFIX_BY_STAT.has(rawItem.implicit.stat) ? rawItem.implicit : null;
    const implicitTemplate = base?.implicit ?? (savedImplicit ? AFFIX_BY_STAT.get(savedImplicit.stat) : null);
    const implicit = implicitTemplate ? {
      stat: savedImplicit?.stat ?? implicitTemplate.stat,
      label: text(savedImplicit?.label, implicitTemplate.label, 80),
      value: finite(savedImplicit?.value, implicitTemplate.value ?? 0, -10_000, 10_000),
      percentage: savedImplicit?.percentage === true || implicitTemplate.percentage === true
    } : null;
    const sockets = integer(rawItem.sockets, rawItem.runeId ? 1 : rarityById(rarity).sockets, 0, 3);
    const runeIds = Array.isArray(rawItem.runeIds)
      ? rawItem.runeIds.filter((runeId) => RUNE_IDS.has(runeId)).slice(0, sockets)
      : RUNE_IDS.has(rawItem.runeId) && sockets ? [rawItem.runeId] : [];
    const setId = !uniqueId && SET_IDS.has(rawItem.setId) && setById(rawItem.setId)?.slots.includes(rawItem.slot) ? rawItem.setId : undefined;
    const masterwork = integer(rawItem.masterwork, 0, 0, MASTERWORK_MAX_RANK);
    const masterworkExalts = Array.isArray(rawItem.masterworkExalts)
      ? rawItem.masterworkExalts.map((index) => integer(index, -1, -1, Math.max(-1, affixes.length - 1))).filter((index) => index >= 0).slice(0, MASTERWORK_MILESTONES.length)
      : [];
    const masterworkFocus = affixes.length ? integer(rawItem.masterworkFocus, 0, 0, affixes.length - 1) : 0;
    const bondXp = integer(rawItem.bondXp, 0, 0, 100_000);
    const bondRank = relicBondRankFor(bondXp);
    const memories = Array.isArray(rawItem.memories)
      ? [...new Set(rawItem.memories.filter((memoryId) => relicMemoryById(rawItem.slot, memoryId)))].slice(0, bondRank)
      : [];
    return {
      id,
      rarity,
      name: text(rawItem.name, 'Unknown Relic'),
      slot: rawItem.slot,
      icon: text(rawItem.icon, '◇', 8),
      art: integer(rawItem.art, 0, 0, 15),
      baseId: base?.id,
      uniqueId: uniqueId ?? undefined,
      affixes,
      implicit,
      setId,
      sourceId: lootSourceById(rawItem.sourceId)?.id ?? undefined,
      quality: ['worn', 'sturdy', 'superior', 'exquisite'].includes(rawItem.quality) ? rawItem.quality : 'worn',
      description: text(rawItem.description, uniqueId ? 'A covenant relic.' : 'A salvageable relic of the broken road.', 320),
      value: integer(rawItem.value, 0, 0, 1_000_000_000),
      itemLevel: integer(rawItem.itemLevel, 1, 1, MAX_LEVEL),
      tempered: integer(rawItem.tempered, 0, 0, 99),
      masterwork,
      masterworkFocus,
      masterworkExalts,
      sockets,
      runeIds,
      // Retained for older saves and old UI integrations. New code reads
      // runeIds, allowing Relics and Mythics to carry more than one rune.
      runeId: runeIds[0],
      corruption: typeof rawItem.corruption === 'string' ? rawItem.corruption.slice(0, 180) : undefined,
      bondXp,
      bondRank,
      memories,
      forgeLockedAffix: affixes.length ? integer(rawItem.forgeLockedAffix, -1, -1, affixes.length - 1) : -1,
      resonantSocketUsed: rawItem.resonantSocketUsed === true,
      empoweredRunes: integer(rawItem.empoweredRunes, 0, 0, sockets),
      echoRune: rawItem.echoRune === true,
      guidedTemper: ['offense', 'defense', 'utility'].includes(rawItem.guidedTemper) ? rawItem.guidedTemper : undefined,
      heirloom: rawItem.heirloom === true
    };
  }

  _normalizeRunes(value) {
    if (!isRecord(value)) return {};
    return Object.fromEntries(Object.entries(value)
      .filter(([id]) => RUNE_IDS.has(id))
      .map(([id, count]) => [id, integer(count, 0, 0, 999)]));
  }

  _normalizeMaterials(value) {
    const raw = isRecord(value) ? value : {};
    return {
      cinders: integer(raw.cinders, 0, 0, 1_000_000),
      echoes: integer(raw.echoes, 0, 0, 1_000_000),
      shards: integer(raw.shards, 0, 0, 1_000_000),
      prisms: integer(raw.prisms, 0, 0, 1_000_000),
      marks: integer(raw.marks, 0, 0, 1_000_000),
      alloys: integer(raw.alloys, 0, 0, 1_000_000),
      cores: integer(raw.cores, 0, 0, 1_000_000)
    };
  }

  _normalizeAttunedAspects(value, aspects, level) {
    const slots = level >= 22 ? 2 : 1;
    const entries = Array.isArray(value) ? value : [];
    return [...new Set(entries.filter((id) => UNIQUE_IDS.has(id) && aspects?.[id]))].slice(0, slots);
  }

  _normalizeLootCollection(value) {
    const raw = isRecord(value) ? value : {};
    const normalizeEntries = (source, allowed) => isRecord(source)
      ? Object.fromEntries(Object.entries(source)
        .filter(([id, count]) => allowed.has(id) && Number.isFinite(Number(count)) && Number(count) > 0)
        .map(([id, count]) => [id, integer(count, 1, 1, 9_999)]))
      : {};
    return {
      uniques: normalizeEntries(raw.uniques, UNIQUE_IDS),
      sets: normalizeEntries(raw.sets, SET_IDS),
      bases: normalizeEntries(raw.bases, new Set(ITEM_BASES.map((base) => base.id))),
      sources: normalizeEntries(raw.sources, new Set(LOOT_SOURCES.map((source) => source.id)))
    };
  }

  _normalizeLootPity(value) {
    const raw = isRecord(value) ? value : {};
    return {
      elite: integer(raw.elite, 0, 0, 99),
      boss: integer(raw.boss, 0, 0, 99),
      mythic: integer(raw.mythic, 0, 0, 199)
    };
  }

  _normalizeAspects(value) {
    if (!isRecord(value)) return {};
    return Object.fromEntries(Object.entries(value)
      .filter(([id, unlocked]) => UNIQUE_IDS.has(id) && unlocked === true)
      .map(([id]) => [id, true]));
  }

  _normalizeWorldProgress(value) {
    const raw = isRecord(value) ? value : {};
    const zones = {};
    ZONES.forEach((zone) => {
      const saved = isRecord(raw.zones?.[zone.id]) ? raw.zones[zone.id] : {};
      zones[zone.id] = {
        corruption: integer(saved.corruption, zone.safe ? 0 : Math.min(60, zone.level * 3), 0, 100),
        events: integer(saved.events, 0, 0, 999),
        liberated: saved.liberated === true,
        calmUntil: finite(saved.calmUntil, 0, 0, Number.MAX_SAFE_INTEGER)
      };
    });
    const allowedDistricts = new Set(DISTRICTS.map((district) => district.id));
    const allowedWaypoints = new Set(LANDMARKS.filter((landmark) => landmark.kind === 'waypoint').map((landmark) => landmark.id));
    const allowedLore = new Set(LANDMARKS.filter((landmark) => landmark.kind === 'lore').map((landmark) => landmark.id));
    const allowedStrongholds = new Set(LANDMARKS.filter((landmark) => landmark.kind === 'stronghold').map((landmark) => landmark.id));
    const allowedDelves = new Set(DELVES.map((delve) => delve.id));
    const discoveredDistricts = Array.isArray(raw.discoveredDistricts)
      ? [...new Set(raw.discoveredDistricts.filter((id) => allowedDistricts.has(id)))].slice(0, allowedDistricts.size)
      : [];
    const waypoints = Array.isArray(raw.waypoints)
      ? [...new Set(raw.waypoints.filter((id) => allowedWaypoints.has(id)))].slice(0, allowedWaypoints.size)
      : [];
    const lore = Array.isArray(raw.lore)
      ? [...new Set(raw.lore.filter((id) => allowedLore.has(id)))].slice(0, allowedLore.size)
      : [];
    const delves = isRecord(raw.delves)
      ? Object.fromEntries(Object.entries(raw.delves).filter(([id]) => allowedDelves.has(id)).map(([id, record]) => [id, {
        clears: integer(record?.clears, 0, 0, 999_999),
        bestTier: integer(record?.bestTier, 0, 0, 50),
        fastest: finite(record?.fastest, 0, 0, 86_400)
      }]))
      : {};
    return {
      zones,
      strongholds: isRecord(raw.strongholds) ? Object.fromEntries(Object.entries(raw.strongholds).filter(([id, entry]) => allowedStrongholds.has(id) && entry === true)) : {},
      discoveredDistricts,
      waypoints,
      lore,
      delves
    };
  }

  _normalizeEndgameRecords(value) {
    const raw = isRecord(value) ? value : {};
    return Object.fromEntries(Object.keys(activityNames).map((activity) => {
      const record = isRecord(raw[activity]) ? raw[activity] : {};
      return [activity, {
        bestTier: integer(record.bestTier, 0, 0, 50),
        fastest: finite(record.fastest, 0, 0, 86_400),
        clears: integer(record.clears, 0, 0, 1_000_000)
      }];
    }));
  }

  _normalizeFactionProgress(value) {
    const raw = isRecord(value) ? value : {};
    return Object.fromEntries(FACTIONS.map((faction) => {
      const saved = isRecord(raw[faction.id]) ? raw[faction.id] : {};
      const renown = integer(saved.renown, 0, 0, 1_000_000);
      const rank = FACTION_RANKS.reduce((current, threshold, index) => (renown >= threshold ? index : current), 0);
      return [faction.id, { renown, rank }];
    }));
  }

  _legacyContractOffer(id) {
    const definition = contractById(id);
    if (!definition) return null;
    const legacyTarget = { kill: 18, elite: 4, event: 2, delve: 1, stronghold: 1, boss: 1 }[definition.type] ?? definition.target;
    return {
      ...definition,
      blueprintId: definition.id,
      seed: 1,
      offeredLevel: 1,
      difficultyId: 'field',
      difficulty: 'Legacy Order',
      difficultyTier: 1,
      difficultyIcon: 'I',
      difficultyColor: '#9fc8b9',
      flavor: definition.flavor ?? definition.description,
      target: legacyTarget,
      steps: [{ id: `${definition.id}-legacy-step`, type: definition.type, target: legacyTarget, name: definition.name, description: definition.description, unit: definition.type }],
      clauses: [],
      bonus: null,
      seals: 1,
      ledgerXp: 26,
      itemRarity: definition.type === 'boss' ? 'relic' : 'rare',
      rewardSourceId: definition.zoneId,
      operation: false
    };
  }

  _restoreContractOffer(value, level = this.player?.level ?? 1) {
    if (!isRecord(value)) return null;
    const legacy = contractById(value.id) && !value.blueprintId ? this._legacyContractOffer(value.id) : null;
    if (legacy) return legacy;
    const blueprint = contractById(value.blueprintId);
    if (!blueprint) return null;
    const difficulty = CONTRACT_DIFFICULTIES.find((entry) => entry.id === value.difficultyId);
    if (!difficulty) return null;
    return buildContractOffer({
      blueprintId: blueprint.id,
      difficultyId: difficulty.id,
      seed: integer(value.seed, 1, 1, 0xffff_ffff),
      level: integer(value.offeredLevel, level, 1, MAX_LEVEL)
    });
  }

  _normalizeContracts(value, level = this.player?.level ?? 1) {
    const raw = isRecord(value) ? value : {};
    const completed = isRecord(raw.completed)
      ? Object.fromEntries(Object.entries(raw.completed).filter(([id, count]) => contractById(id) && Number(count) > 0).map(([id, count]) => [id, integer(count, 1, 1, 9999)]))
      : {};
    const inferredCompletions = Object.values(completed).reduce((sum, count) => sum + count, 0);
    const ledgerXp = integer(raw.ledgerXp, inferredCompletions * 26, 0, 1_000_000);
    const ledgerRank = contractLedgerRankForXp(ledgerXp);
    const active = [];
    const seenActive = new Set();
    if (Array.isArray(raw.active)) raw.active.some((entry) => {
      const offer = this._restoreContractOffer(entry, level);
      if (!offer || seenActive.has(offer.id)) return false;
      seenActive.add(offer.id);
      const stepIndex = integer(entry.stepIndex, 0, 0, Math.max(0, offer.steps.length - 1));
      const step = offer.steps[stepIndex];
      const stepProgress = integer(entry.stepProgress ?? entry.progress, 0, 0, step.target);
      const ready = entry.ready === true || stepIndex === offer.steps.length - 1 && stepProgress >= step.target;
      const bonusDefinition = offer.bonus ? contractBonusById(offer.bonus.id) : null;
      const bonusTarget = offer.bonus?.target ?? bonusDefinition?.target ?? 1;
      active.push({
        ...offer,
        stepIndex,
        stepProgress: ready ? step.target : stepProgress,
        progress: ready ? step.target : stepProgress,
        ready,
        bonusProgress: integer(entry.bonusProgress, 0, 0, bonusTarget),
        bonusFailed: entry.bonusFailed === true,
        bonusComplete: entry.bonusComplete === true,
        acceptedAt: integer(entry.acceptedAt, 0, 0, 1_000_000_000),
        completedSteps: Array.isArray(entry.completedSteps) ? [...new Set(entry.completedSteps.map((item) => integer(item, -1, 0, offer.steps.length - 1)).filter((item) => item >= 0))] : Array.from({ length: stepIndex }, (_, index) => index)
      });
      return active.length >= 5;
    });
    const offers = [];
    const seenOffers = new Set();
    if (Array.isArray(raw.offers)) raw.offers.some((entry) => {
      const offer = this._restoreContractOffer(entry, level);
      if (!offer || seenOffers.has(offer.id)) return false;
      seenOffers.add(offer.id);
      offers.push(offer);
      return offers.length >= 12;
    });
    const history = Array.isArray(raw.history) ? raw.history.slice(0, 20).map((entry) => ({
      id: text(entry?.id, 'contract-history', 96),
      name: text(entry?.name, 'Completed order', 80),
      difficulty: text(entry?.difficulty, 'Field Order', 32),
      zoneId: ZONES.some((zone) => zone.id === entry?.zoneId) ? entry.zoneId : 'gravewake',
      bonus: entry?.bonus === true,
      seals: integer(entry?.seals, 0, 0, 99)
    })) : [];
    const pinnedId = active.some((entry) => entry.id === raw.pinnedId) ? raw.pinnedId : active[0]?.id ?? null;
    return {
      version: 2,
      active,
      completed,
      offers,
      boardSeed: integer(raw.boardSeed, Math.floor(this.random() * 0x7fff_ffff) || 1, 1, 0x7fff_ffff),
      boardCycle: integer(raw.boardCycle, 0, 0, 1_000_000),
      ledgerXp,
      ledgerRank,
      seals: integer(raw.seals, 0, 0, 9999),
      streak: integer(raw.streak, 0, 0, 999),
      bestStreak: integer(raw.bestStreak, 0, 0, 999),
      freeRefreshes: integer(raw.freeRefreshes, isRecord(value) ? 1 : 1, 0, 9),
      refreshes: integer(raw.refreshes, 0, 0, 9999),
      pinnedId,
      history
    };
  }

  _normalizeLeveling(value, level) {
    const supplied = isRecord(value);
    const raw = supplied ? value : {};
    const pillarRanks = Object.fromEntries(PILLARS.map((pillar) => [pillar.id, integer(raw.pillarRanks?.[pillar.id], 0, 0, pillar.maxRank)]));
    const pillarSpent = Object.values(pillarRanks).reduce((sum, rank) => sum + rank, 0);
    const earnedPillarPoints = 1 + Math.floor(Math.max(0, level) / 2);
    const journeyProgress = {};
    JOURNEY_BANDS.forEach((band) => {
      const savedBand = isRecord(raw.journeyProgress?.[band.id]) ? raw.journeyProgress[band.id] : {};
      journeyProgress[band.id] = Object.fromEntries(band.tasks.map((entry) => [entry.id, integer(savedBand[entry.id], 0, 0, entry.target)]));
    });
    const validBandIds = new Set(JOURNEY_BANDS.map((band) => band.id));
    const cacheClaims = Array.isArray(raw.cacheClaims) ? [...new Set(raw.cacheClaims.filter((id) => validBandIds.has(id)))] : [];
    const masteryClaims = Array.isArray(raw.masteryClaims) ? [...new Set(raw.masteryClaims.filter((id) => validBandIds.has(id)))] : [];
    const ascensions = {};
    ASCENSION_TIERS.forEach((tier) => {
      const selected = ascensionChoiceById(tier.level, raw.ascensions?.[tier.level]);
      if (selected && level >= tier.level) ascensions[tier.level] = selected.id;
    });
    const legacyPaths = Object.fromEntries(LEGACY_PATHS.map((path) => [path.id, integer(raw.legacyPaths?.[path.id], 0, 0, path.maxRank)]));
    const legacySpent = Object.values(legacyPaths).reduce((sum, rank) => sum + rank, 0);
    const legacyRank = integer(raw.legacyRank, 0, 0, 999);
    const legacyXp = integer(raw.legacyXp, 0, 0, 1_000_000_000);
    const paragonRank = integer(raw.paragonRank, legacyRank, 0, PARAGON_MAX_RANK);
    const requestedBoards = Array.isArray(raw.paragonBoards) ? raw.paragonBoards : [];
    const eligibleBoardIds = new Set(PARAGON_BOARDS.filter((board) => paragonRank >= board.minRank).map((board) => board.id));
    let paragonBoards = [PARAGON_ENTRY_BOARD_ID, ...requestedBoards].filter((id, index, entries) => eligibleBoardIds.has(id) && entries.indexOf(id) === index);
    const requestedNodes = isRecord(raw.paragonAllocated) ? raw.paragonAllocated : {};
    const normalizeAllocations = (boardIds) => {
      const accepted = {};
      let spent = 0;
      let changed = true;
      while (changed) {
        changed = false;
        PARAGON_BOARDS.filter((board) => boardIds.includes(board.id)).forEach((board) => {
          board.nodes.forEach((node) => {
            if (accepted[node.id] || requestedNodes[node.id] !== true || spent + node.cost > paragonRank) return;
            const required = node.requires.every((id) => accepted[id]);
            const requiredAny = !node.requiresAny.length || node.requiresAny.some((id) => accepted[id]);
            if (!required || !requiredAny) return;
            accepted[node.id] = true;
            spent += node.cost;
            changed = true;
          });
        });
      }
      return { accepted, spent };
    };
    let normalizedParagon = normalizeAllocations(paragonBoards);
    const earnedBoardSigils = Object.keys(normalizedParagon.accepted).filter((id) => paragonNodeById(id)?.type === 'gate').length;
    paragonBoards = paragonBoards.slice(0, Math.max(1, 1 + earnedBoardSigils));
    normalizedParagon = normalizeAllocations(paragonBoards);
    const spentBoardSigils = Math.max(0, paragonBoards.length - 1);
    const boardSigils = Math.max(0, Object.keys(normalizedParagon.accepted).filter((id) => paragonNodeById(id)?.type === 'gate').length - spentBoardSigils);
    const paragonGlyphs = Object.fromEntries(PARAGON_GLYPHS.map((glyph) => {
      const saved = raw.paragonGlyphs?.[glyph.id];
      return [glyph.id, integer(isRecord(saved) ? saved.rank : saved, 1, 1, glyph.maxRank)];
    }));
    const paragonSockets = {};
    const socketedGlyphs = new Set();
    if (isRecord(raw.paragonSockets)) Object.entries(raw.paragonSockets).forEach(([nodeId, glyphId]) => {
      const node = paragonNodeById(nodeId);
      const glyph = paragonGlyphById(glyphId);
      if (!node || node.type !== 'socket' || !normalizedParagon.accepted[nodeId] || !glyph || socketedGlyphs.has(glyph.id)) return;
      paragonSockets[nodeId] = glyph.id;
      socketedGlyphs.add(glyph.id);
    });
    const claimedLevels = supplied && Array.isArray(raw.claimedLevels)
      ? [...new Set(raw.claimedLevels.map((entry) => integer(entry, 0, 0, MAX_LEVEL)).filter((entry) => entry > 0 && entry <= level))]
      : Array.from({ length: level }, (_, index) => index + 1);
    return {
      version: 2,
      pillarPoints: integer(raw.pillarPoints, Math.max(0, earnedPillarPoints - pillarSpent), 0, 999),
      pillarRanks,
      claimedLevels,
      journeyProgress,
      cacheClaims,
      masteryClaims,
      ascensions,
      legacyRank,
      legacyXp,
      legacyPoints: integer(raw.legacyPoints, Math.max(0, legacyRank - legacySpent), 0, 999),
      legacyPaths,
      legacyConverted: raw.legacyConverted === true || legacyRank > 0,
      paragonRank,
      paragonXp: integer(raw.paragonXp, legacyXp, 0, paragonRank >= PARAGON_MAX_RANK ? 0 : Math.max(0, paragonXpForRank(paragonRank) - 1)),
      paragonPoints: Math.max(0, paragonRank - normalizedParagon.spent),
      paragonBoards,
      paragonAllocated: normalizedParagon.accepted,
      paragonBoardSigils: boardSigils,
      paragonGlyphs,
      paragonGlyphEmbers: integer(raw.paragonGlyphEmbers, legacyRank > 0 ? Math.floor(legacyRank / 3) : 0, 0, 1_000_000),
      paragonSockets,
      secondWindCooldown: finite(raw.secondWindCooldown, 0, 0, 180),
      legacySeeded: supplied ? raw.legacySeeded !== false : false
    };
  }

  _seedLegacyJourney() {
    const player = this.player;
    const leveling = player?.leveling;
    if (!player || !leveling || leveling.legacySeeded) return;
    const world = player.worldProgress;
    const operationClears = Object.values(player.endgameRecords ?? {}).reduce((sum, record) => sum + integer(record?.clears, 0, 0, 1_000_000), 0);
    const delveClears = Object.values(world?.delves ?? {}).reduce((sum, record) => sum + integer(record?.clears, 0, 0, 1_000_000), 0);
    const contractClaims = Object.values(player.contracts?.completed ?? {}).reduce((sum, count) => sum + integer(count, 0, 0, 9999), 0);
    const uniqueFinds = Object.values(player.lootCollection?.uniques ?? {}).reduce((sum, count) => sum + integer(count, 0, 0, 9999), 0);
    const masterworkRanks = [...player.inventory, ...player.stash, ...Object.values(player.equipment)].reduce((sum, item) => sum + integer(item?.masterwork, 0, 0, MASTERWORK_MAX_RANK), 0);
    const completedCampaignStages = this.getCampaignJournal()?.chapters.reduce((sum, chapter) => sum + (chapter.completed ? getCampaignChapter(chapter.id)?.stages?.length ?? 0 : chapter.active ? Math.max(0, getCampaignChapter(chapter.id)?.stages?.findIndex((stage) => stage.id === player.campaign.stageId) ?? 0) : 0), 0) ?? 0;
    [
      ['kill', this.stats.kills], ['boss', this.stats.bosses], ['event', this.stats.events],
      ['district', world?.discoveredDistricts?.length ?? 0], ['waypoint', world?.waypoints?.length ?? 0], ['lore', world?.lore?.length ?? 0],
      ['delve', delveClears], ['operation', operationClears], ['apex', Object.values(player.endgameRecords ?? {}).reduce((sum, record) => sum + (record?.bestTier >= 15 ? integer(record.clears, 0, 0, 1_000_000) : 0), 0)],
      ['contract', contractClaims], ['unique', uniqueFinds], ['masterwork', masterworkRanks], ['campaign', completedCampaignStages],
      ['stronghold', Object.keys(world?.strongholds ?? {}).length]
    ].forEach(([type, amount]) => this._recordLevelingProgress(type, amount, {}, false));
    leveling.legacySeeded = true;
  }

  _recordLevelingProgress(type, amount = 1, context = {}, announce = true) {
    const player = this.player;
    if (!player?.leveling || !type || !Number.isFinite(Number(amount)) || Number(amount) <= 0) return false;
    let changed = false;
    JOURNEY_BANDS.filter((band) => player.level >= band.minLevel).forEach((band) => {
      band.tasks.filter((entry) => entry.type === type).forEach((entry) => {
        if (entry.zoneId && entry.zoneId !== context.zoneId) return;
        if (entry.minTier && Number(context.tier ?? 0) < entry.minTier) return;
        const bandProgress = player.leveling.journeyProgress[band.id] ?? (player.leveling.journeyProgress[band.id] = {});
        const previous = integer(bandProgress[entry.id], 0, 0, entry.target);
        const next = Math.min(entry.target, previous + Math.max(1, Math.floor(Number(amount))));
        if (next === previous) return;
        bandProgress[entry.id] = next;
        changed = true;
        if (announce && next >= entry.target && previous < entry.target) this.notify(`${band.name}: ${entry.name} complete.`, 'accent');
      });
    });
    if (changed) this.emit('leveling-updated', this.getLevelingOverview());
    return changed;
  }

  getJourneyBandState(bandId) {
    const band = journeyBandById(bandId);
    const leveling = this.player?.leveling;
    if (!band || !leveling) return null;
    const progress = leveling.journeyProgress[band.id] ?? {};
    const tasks = band.tasks.map((entry) => ({ ...entry, progress: integer(progress[entry.id], 0, 0, entry.target), complete: Number(progress[entry.id] ?? 0) >= entry.target }));
    const completed = tasks.filter((entry) => entry.complete).length;
    const unlocked = this.player.level >= band.minLevel;
    const cacheClaimed = leveling.cacheClaims.includes(band.id);
    const masteryClaimed = leveling.masteryClaims.includes(band.id);
    return {
      ...band,
      unlocked,
      active: journeyBandForLevel(this.player.level)?.id === band.id,
      tasks,
      completed,
      required: JOURNEY_REQUIRED_TASKS,
      cacheClaimed,
      masteryClaimed,
      cacheReady: unlocked && completed >= JOURNEY_REQUIRED_TASKS && !cacheClaimed,
      masteryReady: unlocked && completed >= tasks.length && cacheClaimed && !masteryClaimed
    };
  }

  getLevelingOverview() {
    const player = this.player;
    if (!player?.leveling) return null;
    const leveling = player.leveling;
    const activeBand = journeyBandForLevel(player.level);
    return {
      level: player.level,
      xp: player.level >= MAX_LEVEL ? leveling.paragonXp : player.xp,
      nextXp: player.level >= MAX_LEVEL ? paragonXpForRank(leveling.paragonRank) : LEVEL_XP[player.level - 1],
      activeBandId: activeBand.id,
      bands: JOURNEY_BANDS.map((band) => this.getJourneyBandState(band.id)),
      rewards: LEVEL_REWARDS,
      pillarPoints: leveling.pillarPoints,
      pillars: PILLARS.map((pillar) => ({ ...pillar, rank: leveling.pillarRanks[pillar.id] ?? 0, canInvest: leveling.pillarPoints > 0 && (leveling.pillarRanks[pillar.id] ?? 0) < pillar.maxRank })),
      ascensions: ASCENSION_TIERS.map((tier) => ({ ...tier, unlocked: player.level >= tier.level, selected: leveling.ascensions[tier.level] ?? null })),
      paragon: this.getParagonOverview(),
      legacy: {
        rank: leveling.legacyRank,
        xp: leveling.legacyXp,
        nextXp: legacyXpForRank(leveling.legacyRank),
        points: leveling.legacyPoints,
        converted: leveling.legacyConverted,
        paths: LEGACY_PATHS.map((path) => ({ ...path, rank: leveling.legacyPaths[path.id] ?? 0, canInvest: false }))
      }
    };
  }

  claimJourneyReward(bandId, mastery = false) {
    const state = this.getJourneyBandState(bandId);
    const leveling = this.player?.leveling;
    if (!state || !leveling || (mastery ? !state.masteryReady : !state.cacheReady)) return false;
    if (mastery) {
      leveling.masteryClaims.push(state.id);
      leveling.pillarPoints += 1;
      this.player.materials = this._normalizeMaterials(this.player.materials);
      this.player.materials.prisms += state.number >= 8 ? 1 : 0;
      this.player.materials.echoes += Math.max(1, Math.floor(state.number / 3));
      if (state.number >= 10) this.player.materials.cores += 1;
      this.notify(`${state.name} mastered — a bonus Pillar point has awakened.`, 'accent');
    } else {
      leveling.cacheClaims.push(state.id);
      const gold = 180 + state.number * 135;
      this.player.gold += gold;
      this.player.materials = this._normalizeMaterials(this.player.materials);
      this.player.materials.cinders += 12 + state.number * 6;
      this.player.materials.shards += 2 + Math.floor(state.number / 2);
      if (state.number >= 4) this.player.materials.alloys += 1 + Math.floor(state.number / 4);
      if (state.number >= 7) this.player.materials.echoes += 1;
      const reward = this._generateItem({ sourceId: state.number >= 8 ? 'hybrid-trial' : 'contracts', minRarity: state.number >= 5 ? 'relic' : 'rare', elite: true, forceUnique: state.number >= 9 && this.random() < 0.35 });
      if (reward) this._awardItem(reward, `${state.name} Journey cache`);
      this._gainXp(150 + state.number * 110);
      this.notify(`${state.name} cache claimed — ${gold} gold, materials, experience, and a relic.`, 'accent');
    }
    this.emit('leveling-updated', this.getLevelingOverview());
    this.save();
    return true;
  }

  investPillar(pillarId) {
    const pillar = pillarById(pillarId);
    const leveling = this.player?.leveling;
    if (!pillar || !leveling || leveling.pillarPoints <= 0 || (leveling.pillarRanks[pillar.id] ?? 0) >= pillar.maxRank) return false;
    leveling.pillarPoints -= 1;
    leveling.pillarRanks[pillar.id] = (leveling.pillarRanks[pillar.id] ?? 0) + 1;
    this._refreshPlayerStats(true);
    const milestone = pillar.milestones.find((entry) => entry.rank === leveling.pillarRanks[pillar.id]);
    this.notify(milestone ? `${pillar.name} ${milestone.rank}: ${milestone.name} awakened.` : `${pillar.name} rises to ${leveling.pillarRanks[pillar.id]}/${pillar.maxRank}.`, milestone ? 'accent' : 'quiet');
    this.emit('leveling-updated', this.getLevelingOverview());
    this.save();
    return true;
  }

  respecPillars() {
    const leveling = this.player?.leveling;
    if (!leveling) return false;
    const spent = Object.values(leveling.pillarRanks).reduce((sum, rank) => sum + rank, 0);
    const cost = 300 + this.player.level * 45 + spent * 30;
    if (!spent || this.player.gold < cost) {
      this.notify(!spent ? 'No Pillar ranks are invested.' : `Rekindling the Pillars requires ${cost} gold.`, 'warning');
      return false;
    }
    this.player.gold -= cost;
    leveling.pillarPoints += spent;
    Object.keys(leveling.pillarRanks).forEach((id) => { leveling.pillarRanks[id] = 0; });
    this._refreshPlayerStats(true);
    this.notify(`${spent} Pillar points rekindled for ${cost} gold.`, 'accent');
    this.emit('leveling-updated', this.getLevelingOverview());
    this.save();
    return true;
  }

  chooseAscension(level, choiceId) {
    const tier = ascensionTierForLevel(level);
    const selected = ascensionChoiceById(level, choiceId);
    const leveling = this.player?.leveling;
    if (!tier || !selected || !leveling || this.player.level < tier.level || leveling.ascensions[tier.level]) return false;
    leveling.ascensions[tier.level] = selected.id;
    this._refreshPlayerStats(true);
    this.notify(`${tier.name}: ${selected.name} chosen.`, 'accent');
    this.emit('leveling-updated', this.getLevelingOverview());
    this.save();
    return true;
  }

  respecAscensions() {
    const leveling = this.player?.leveling;
    if (!leveling) return false;
    const count = Object.keys(leveling.ascensions).length;
    const cost = 900 + this.player.level * 110 + count * 250;
    if (!count || this.player.gold < cost) {
      this.notify(!count ? 'No Ascension choices have been made.' : `Rewriting Ascension requires ${cost} gold.`, 'warning');
      return false;
    }
    this.player.gold -= cost;
    leveling.ascensions = {};
    leveling.secondWindCooldown = 0;
    this._refreshPlayerStats(true);
    this.notify(`${count} Ascension choices released.`, 'accent');
    this.emit('leveling-updated', this.getLevelingOverview());
    this.save();
    return true;
  }

  investLegacy(pathId) {
    const path = legacyPathById(pathId);
    const leveling = this.player?.leveling;
    if (!path || !leveling || this.player.level < MAX_LEVEL || leveling.legacyPoints <= 0 || (leveling.legacyPaths[path.id] ?? 0) >= path.maxRank) return false;
    leveling.legacyPoints -= 1;
    leveling.legacyPaths[path.id] = (leveling.legacyPaths[path.id] ?? 0) + 1;
    this._refreshPlayerStats(true);
    this.notify(`${path.name} Legacy rises to ${leveling.legacyPaths[path.id]}/${path.maxRank}.`, 'accent');
    this.emit('leveling-updated', this.getLevelingOverview());
    this.save();
    return true;
  }

  _canAllocateParagonNode(node, boardId = null) {
    const player = this.player;
    const leveling = player?.leveling;
    const resolved = typeof node === 'string' ? paragonNodeById(node) : node;
    const resolvedBoardId = boardId ?? resolved?.boardId ?? (resolved ? PARAGON_BOARDS.find((board) => board.nodes.some((entry) => entry.id === resolved.id))?.id : null);
    if (!player || !leveling || player.level < MAX_LEVEL || !resolved || !resolvedBoardId || !leveling.paragonBoards.includes(resolvedBoardId)) return false;
    if (leveling.paragonAllocated[resolved.id] || leveling.paragonPoints < resolved.cost) return false;
    if (!resolved.requires.every((id) => leveling.paragonAllocated[id])) return false;
    return !resolved.requiresAny.length || resolved.requiresAny.some((id) => leveling.paragonAllocated[id]);
  }

  getParagonOverview() {
    const player = this.player;
    const leveling = player?.leveling;
    if (!player || !leveling) return null;
    const unlocked = player.level >= MAX_LEVEL;
    const boards = PARAGON_BOARDS.map((board) => {
      const attached = leveling.paragonBoards.includes(board.id);
      return {
        ...board,
        unlocked: attached,
        canUnlock: unlocked && !attached && leveling.paragonBoardSigils > 0 && leveling.paragonRank >= board.minRank,
        constellations: PARAGON_CONSTELLATIONS.filter((entry) => entry.boardId === board.id).map((entry) => ({ ...entry, active: entry.keys.every((key) => leveling.paragonAllocated[`${board.id}:${key}`] === true) })),
        nodes: board.nodes.map((node) => ({
          ...node,
          allocated: leveling.paragonAllocated[node.id] === true,
          available: this._canAllocateParagonNode(node, board.id),
          socketedGlyph: leveling.paragonSockets[node.id] ?? null
        }))
      };
    });
    const socketed = new Map(Object.entries(leveling.paragonSockets).map(([nodeId, glyphId]) => [glyphId, nodeId]));
    return {
      unlocked,
      rank: leveling.paragonRank,
      maxRank: PARAGON_MAX_RANK,
      xp: leveling.paragonXp,
      nextXp: paragonXpForRank(leveling.paragonRank),
      points: leveling.paragonPoints,
      boardSigils: leveling.paragonBoardSigils,
      glyphEmbers: leveling.paragonGlyphEmbers,
      boards,
      constellations: PARAGON_CONSTELLATIONS.map((entry) => ({ ...entry, active: entry.keys.every((key) => leveling.paragonAllocated[`${entry.boardId}:${key}`] === true) })),
      glyphs: PARAGON_GLYPHS.map((glyph) => ({
        ...glyph,
        rank: leveling.paragonGlyphs[glyph.id] ?? 1,
        upgradeCost: glyphUpgradeCost(leveling.paragonGlyphs[glyph.id] ?? 1),
        canUpgrade: unlocked && (leveling.paragonGlyphs[glyph.id] ?? 1) < glyph.maxRank && leveling.paragonGlyphEmbers >= glyphUpgradeCost(leveling.paragonGlyphs[glyph.id] ?? 1),
        socketedNodeId: socketed.get(glyph.id) ?? null
      })),
      sockets: { ...leveling.paragonSockets },
      legacyImprints: LEGACY_PATHS.map((path) => ({ ...path, rank: leveling.legacyPaths[path.id] ?? 0 })).filter((path) => path.rank > 0)
    };
  }

  allocateParagonNode(nodeId) {
    const node = paragonNodeById(nodeId);
    const leveling = this.player?.leveling;
    if (!node || !leveling || !this._canAllocateParagonNode(node, node.boardId)) return false;
    const activeBefore = new Set(activeParagonConstellations(leveling.paragonAllocated).map((entry) => entry.id));
    leveling.paragonAllocated[node.id] = true;
    leveling.paragonPoints -= node.cost;
    if (node.type === 'gate') leveling.paragonBoardSigils += 1;
    this._refreshPlayerStats(true);
    const awakened = activeParagonConstellations(leveling.paragonAllocated).find((entry) => !activeBefore.has(entry.id));
    this.notify(awakened ? `${awakened.name} Constellation completed — ${awakened.description}` : node.type === 'gate' ? `${node.name} opened — a Board Sigil has awakened.` : `${node.name} awakened.`, awakened || node.type !== 'normal' ? 'accent' : 'quiet');
    this.emit('leveling-updated', this.getLevelingOverview());
    this.save();
    return true;
  }

  unlockParagonBoard(boardId) {
    const board = paragonBoardById(boardId);
    const leveling = this.player?.leveling;
    if (!board || !leveling || this.player.level < MAX_LEVEL || board.id === PARAGON_ENTRY_BOARD_ID || leveling.paragonBoards.includes(board.id) || leveling.paragonBoardSigils <= 0 || leveling.paragonRank < board.minRank) return false;
    leveling.paragonBoardSigils -= 1;
    leveling.paragonBoards.push(board.id);
    this.notify(`${board.name} attached to the Paragon Atlas.`, 'accent');
    this.emit('leveling-updated', this.getLevelingOverview());
    this.save();
    return true;
  }

  respecParagon() {
    const leveling = this.player?.leveling;
    if (!leveling || this.player.level < MAX_LEVEL) return false;
    const spent = Object.keys(leveling.paragonAllocated).reduce((sum, id) => sum + (paragonNodeById(id)?.cost ?? 0), 0);
    const cost = 2_500 + leveling.paragonRank * 90 + spent * 140;
    if (!spent || this.player.gold < cost) {
      this.notify(!spent ? 'No Paragon nodes are allocated.' : `Rekindling the Paragon Atlas requires ${cost} gold.`, 'warning');
      return false;
    }
    this.player.gold -= cost;
    leveling.paragonAllocated = {};
    leveling.paragonPoints = leveling.paragonRank;
    leveling.paragonBoards = [PARAGON_ENTRY_BOARD_ID];
    leveling.paragonBoardSigils = 0;
    leveling.paragonSockets = {};
    leveling.secondWindCooldown = 0;
    this._refreshPlayerStats(true);
    this.notify(`${spent} Paragon power rekindled. The Atlas has returned to its Heart.`, 'accent');
    this.emit('leveling-updated', this.getLevelingOverview());
    this.save();
    return true;
  }

  upgradeParagonGlyph(glyphId) {
    const glyph = paragonGlyphById(glyphId);
    const leveling = this.player?.leveling;
    if (!glyph || !leveling || this.player.level < MAX_LEVEL) return false;
    const rank = leveling.paragonGlyphs[glyph.id] ?? 1;
    const cost = glyphUpgradeCost(rank);
    if (rank >= glyph.maxRank || leveling.paragonGlyphEmbers < cost) return false;
    leveling.paragonGlyphEmbers -= cost;
    leveling.paragonGlyphs[glyph.id] = rank + 1;
    this._refreshPlayerStats(true);
    this.notify(`${glyph.name} Glyph rises to ${rank + 1}/${glyph.maxRank}.`, rank + 1 === 5 || rank + 1 === 10 ? 'accent' : 'quiet');
    this.emit('leveling-updated', this.getLevelingOverview());
    this.save();
    return true;
  }

  socketParagonGlyph(nodeId, glyphId = null) {
    const node = paragonNodeById(nodeId);
    const glyph = glyphId ? paragonGlyphById(glyphId) : null;
    const leveling = this.player?.leveling;
    if (!node || node.type !== 'socket' || !leveling || this.player.level < MAX_LEVEL || !leveling.paragonAllocated[node.id] || (glyphId && !glyph)) return false;
    Object.entries(leveling.paragonSockets).forEach(([socketId, currentGlyph]) => {
      if (socketId === node.id || currentGlyph === glyph?.id) delete leveling.paragonSockets[socketId];
    });
    if (glyph) leveling.paragonSockets[node.id] = glyph.id;
    this._refreshPlayerStats(true);
    this.notify(glyph ? `${glyph.name} socketed into ${node.name}.` : `${node.name} cleared.`, glyph ? 'accent' : 'quiet');
    this.emit('leveling-updated', this.getLevelingOverview());
    this.save();
    return true;
  }

  getAbilityMutationOverview() {
    return this.player ? this.progressionSystem.overview(this.player, this.player.primary) : null;
  }

  unlockAbilityMutation(mutationId) {
    if (!this.player || !this.progressionSystem.unlock(this.player, mutationId)) return false;
    this.emit('mutations-updated', this.getAbilityMutationOverview());
    this.save();
    return true;
  }

  selectAbilityMutation(slot, mutationId = null) {
    if (!this.player) return false;
    const abilityId = abilityIdFor(this.player.primary, slot);
    if (!this.progressionSystem.select(this.player, abilityId, mutationId)) return false;
    this.emit('mutations-updated', this.getAbilityMutationOverview());
    this.save();
    return true;
  }

  getResolvedAbility(slot) {
    if (!this.player) return null;
    const kit = this.getPrimaryClass();
    const base = kit?.abilities?.[slot];
    if (!base) return null;
    const abilityId = abilityIdFor(this.player.primary, slot);
    const selectedMutationId = this.player.mutationProgress?.selections?.[abilityId] ?? null;
    const mastery = this.getMastery?.(slot);
    const lateModifiers = { cooldownMultiplier: 1 - Math.min(0.15, (mastery?.rank ?? 0) * 0.03), damageMultiplier: 1 + (mastery?.rank ?? 0) * 0.03 };
    const equipmentHooks = this.lootSystem.abilityHooks(this.player.equipment, abilityId);
    return this.abilitySystem.resolve({ classId: this.player.primary, slot, base, selectedMutationId, covenant: this.player.covenant, equipmentHooks, lateModifiers });
  }

  _applyUniqueBehaviorEvent(event, context = {}) {
    if (!this.player) return [];
    const uniqueIds = [...new Set(Object.values(this.player.equipment ?? {}).map((item) => item?.uniqueId).filter(Boolean))];
    const applied = [];
    for (const uniqueId of uniqueIds) {
      const result = this.lootSystem.applyBehavior(uniqueId, { event, player: this.player, covenant: this.player.covenant, ...context });
      for (const behaviorAction of result.actions ?? []) {
        if (behaviorAction.eligible === false) continue;
        applied.push({ uniqueId, ...behaviorAction });
        if (behaviorAction.type === 'cooldown-fold') {
          for (const slot of behaviorAction.slots ?? []) this.player.cooldowns[slot] = Math.max(0, (this.player.cooldowns[slot] ?? 0) - (behaviorAction.seconds ?? 0));
        } else if (behaviorAction.type === 'momentum') {
          this.player.uniqueMomentum = { time: behaviorAction.duration ?? 3, damageMultiplier: behaviorAction.damageMultiplier ?? 1, speedMultiplier: behaviorAction.speedMultiplier ?? 1 };
        } else if (behaviorAction.type === 'route-edge') {
          this.player.fiveEdgeIndex = ((this.player.fiveEdgeIndex ?? 0) + 1) % Math.max(1, behaviorAction.cycle ?? 5);
          for (const slot of ['skillOne', 'skillTwo', 'companion', 'hybrid', 'ultimate']) {
            if (slot === context.slot) continue;
            this.player.cooldowns[slot] = Math.max(0, (this.player.cooldowns[slot] ?? 0) - (behaviorAction.cooldownSeconds ?? 0));
          }
        } else if (behaviorAction.type === 'execution-cache') {
          const reward = this._generateItem({ sourceId: behaviorAction.sourceId ?? 'delve', minRarity: behaviorAction.minRarity ?? 'relic', elite: true });
          if (reward) this._awardItem(reward, 'Cryptwarden execution cache');
        } else if (behaviorAction.type === 'barrier') {
          this.player.barrier = (this.player.barrier ?? 0) + this.player.maxHp * (behaviorAction.maxHpRatio ?? 0);
          this.player.barrierTime = Math.max(this.player.barrierTime ?? 0, 4);
        } else if (behaviorAction.type === 'store-silence') {
          const cap = this.player.maxHp * (behaviorAction.capRatio ?? 0.35);
          this.player.silenceStored = Math.min(cap, (this.player.silenceStored ?? 0) + (behaviorAction.amount ?? 0));
        } else if (behaviorAction.type === 'cache-bias') {
          this.player.nextCacheBias = Math.max(this.player.nextCacheBias ?? 0, behaviorAction.quality ?? 1);
        } else if (behaviorAction.type === 'covenant-rupture') {
          const stats = this.getStats();
          this._createHazard({ owner: 'player', kind: `worldspine-${behaviorAction.affinity ?? 'void'}`, x: this.player.x, y: this.player.y, radius: behaviorAction.radius ?? 220, life: 1.8, tick: 0.28, damage: stats.power * (behaviorAction.damageMultiplier ?? 0.75), color: this.getHybrid()?.color ?? '#a77cff', mark: 3.5 });
        }
      }
    }
    return applied;
  }

  recordCovenantBehavior(tags, weight = 1, context = {}) {
    if (!this.player) return false;
    this.player.covenant = this.covenantSystem.applyBehavior(this.player.covenant, Array.isArray(tags) ? tags : [tags], weight, context);
    this.emit('covenant-updated', this.getCovenantOverview());
    return true;
  }

  getCovenantOverview() {
    return this.player ? this.covenantSystem.resolve(this.player.covenant) : null;
  }

  getMetamorphosisSnapshot() {
    if (!this.player) return { covenant: null, mutations: null, hunters: [], regionalEvents: [], bossDiscoveries: [], sanctuary: null };
    const covenant = this.covenantSystem.resolve(this.player.covenant);
    const mutations = this.getAbilityMutationOverview();
    const hunters = this.getHunterDossiers();
    const world = this.worldStateManager.normalize(this.player.worldV2);
    const regionalEvents = world.activeEvents.map((event) => ({ ...event }));
    const bossDiscoveries = (this.player.sanctuary?.discoveries ?? []).filter((entry) => typeof entry === 'string' && entry.startsWith('boss:'));
    return { covenant, mutations, hunters, regionalEvents, bossDiscoveries, sanctuary: this.getSanctuaryState() };
  }

  getCovenantRegionResponse(regionId) {
    return this.player ? this.covenantSystem.getRegionResponse(this.player.covenant, regionId) : null;
  }

  getCovenantBossVariant(bossId) {
    return this.player ? this.covenantSystem.getBossVariant(this.player.covenant, bossId) : null;
  }

  getCovenantRewardBias() {
    return this.player ? this.covenantSystem.getRewardBias(this.player.covenant) : [];
  }

  _reforged() {
    return this.player?.reforged ?? null;
  }

  _worldOath() {
    return worldOathById(this._reforged()?.worldOath);
  }

  _directiveDefinitions(factionId) {
    const cycle = this._reforged()?.factions?.[factionId]?.directiveCycle ?? 0;
    return [
      { id: 'kill', name: 'Break hostile formations', icon: '⚔', type: 'kill', target: 24 + Math.min(36, cycle * 3), favor: 2, description: 'Defeat enemies in districts represented by this faction.' },
      { id: 'event', name: 'Answer regional pressure', icon: '⌖', type: 'event', target: 2 + Math.min(2, Math.floor(cycle / 3)), favor: 3, description: 'Complete world events or defend a faction stronghold.' },
      { id: 'operation', name: 'Carry the banner below', icon: '◇', type: 'operation', target: 1 + Math.min(2, Math.floor(cycle / 5)), favor: 4, description: 'Complete a delve, contract finale, or endgame operation for this faction.' }
    ];
  }

  _hasReforgedSpecial(special) {
    const state = this._reforged();
    if (!state || !special) return false;
    const hybridId = this.getHybrid()?.id;
    if ((HYBRID_MUTATIONS[hybridId] ?? []).some((tier) => hybridMutationById(hybridId, state.hybridMutations[tier.tier])?.special === special)) return true;
    if (Object.entries(state.mastery).some(([slot, entry]) => entry.rank >= 5 && masteryEvolutionById(slot, entry.pathId)?.milestone?.special === special)) return true;
    if (Object.values(this.player.equipment ?? {}).some((item) => (item?.memories ?? []).some((memoryId) => relicMemoryById(item.slot, memoryId)?.special === special))) return true;
    if (FACTIONS.some((faction) => factionDoctrineById(faction.id, state.factions[faction.id]?.doctrineId)?.special === special)) return true;
    if (EVENT_ARCS.some((arc) => arc.endings.find((ending) => ending.id === state.world.arcs[arc.id]?.outcomeId)?.special === special)) return true;
    if (ECLIPSE_WEB.some((node) => state.eclipse.allocated[node.id] && node.special === special)) return true;
    if (activeParagonConstellations(this.player.leveling?.paragonAllocated).some((entry) => entry.special === special)) return true;
    if (Object.entries(state.decrees).some(([chapterId, decreeId]) => campaignDecreeById(chapterId, decreeId)?.special === special)) return true;
    return (this.endgame?.expeditionBoons ?? []).some((boonId) => EXPEDITION_BOONS.find((boon) => boon.id === boonId)?.special === special);
  }

  getReforgedOverview() {
    const state = this._reforged();
    if (!state) return null;
    const hybridId = this.getHybrid()?.id;
    const mastery = Object.entries(state.mastery).map(([slot, entry]) => ({
      slot,
      ...entry,
      paths: (MASTERY_EVOLUTIONS[slot] ?? []).map((path) => ({ ...path, selected: entry.pathId === path.id, canInvest: entry.points > 0 && (!entry.pathId || entry.pathId === path.id) && entry.rank < path.maxRank }))
    }));
    const factions = FACTIONS.map((faction) => {
      const entry = state.factions[faction.id];
      const renown = this.player.factions?.[faction.id] ?? { rank: 0, renown: 0 };
      const directives = this._directiveDefinitions(faction.id).map((directive) => ({
        ...directive,
        progress: Math.min(directive.target, entry.directiveProgress[directive.type] ?? 0),
        claimed: entry.directiveClaims.includes(directive.id),
        ready: !entry.directiveClaims.includes(directive.id) && (entry.directiveProgress[directive.type] ?? 0) >= directive.target
      }));
      return {
        ...faction,
        ...entry,
        renown: renown.renown,
        rank: renown.rank,
        pledged: state.pledgedFaction === faction.id,
        canPledge: renown.rank >= 4,
        doctrines: (FACTION_DOCTRINES[faction.id] ?? []).map((entryDefinition) => ({ ...entryDefinition, selected: entry.doctrineId === entryDefinition.id, unlocked: renown.rank >= 2 })),
        directives,
        offers: FACTION_OFFERS.filter((offer) => offer.factionId === faction.id).map((offer) => ({ ...offer, canBuy: entry.favor >= offer.cost }))
      };
    });
    const strongholds = LANDMARKS.filter((landmark) => landmark.kind === 'stronghold').map((landmark) => {
      const entry = state.world.strongholds[landmark.id];
      return {
        ...landmark,
        ...entry,
        projects: STRONGHOLD_PROJECTS.map((project) => {
          const rank = entry.projects[project.id] ?? 0;
          return { ...project, rank, nextCost: project.costs[rank] ?? 0, canInvest: entry.reclaimed && rank < project.maxRank && this.player.materials.alloys >= (project.costs[rank] ?? Infinity) };
        })
      };
    });
    const arcs = EVENT_ARCS.map((arc) => {
      const entry = state.world.arcs[arc.id];
      return {
        ...arc,
        ...entry,
        currentStage: entry.stage < arc.stages.length ? { name: arc.stages[entry.stage][0], description: arc.stages[entry.stage][1] } : null,
        pendingChoice: state.world.pendingArcId === arc.id && !entry.outcomeId,
        selectedEnding: arc.endings.find((ending) => ending.id === entry.outcomeId) ?? null
      };
    });
    const eclipseSpent = Object.keys(state.eclipse.allocated).reduce((sum, id) => sum + (eclipseNodeById(id)?.cost ?? 0), 0);
    const eclipseNodes = ECLIPSE_WEB.map((node) => ({
      ...node,
      allocated: state.eclipse.allocated[node.id] === true,
      available: !state.eclipse.allocated[node.id] && state.eclipse.points >= node.cost && node.requires.every((id) => state.eclipse.allocated[id])
    }));
    const bestiary = BESTIARY_FAMILIES.map((family) => {
      const entry = state.bestiary[family.id];
      const next = family.thresholds[Math.min(family.thresholds.length - 1, entry.rank + 1)];
      return { ...family, ...entry, next, insights: BESTIARY_INSIGHTS.map((insight) => ({ ...insight, selected: entry.insightId === insight.id, canChoose: entry.rank >= 2 })) };
    });
    const completedDecrees = Object.entries(CAMPAIGN_DECREES).map(([chapterId, choices]) => ({
      chapterId,
      completed: chapterIsComplete(this.player.campaign, chapterId),
      selected: state.decrees[chapterId] ?? null,
      choices: choices.map((choice) => ({ ...choice, selected: state.decrees[chapterId] === choice.id }))
    }));
    const ownedRelics = [
      ...Object.entries(this.player.equipment ?? {}).map(([slot, item]) => ({ item, location: `Equipped · ${slot}` })),
      ...(this.player.inventory ?? []).map((item) => ({ item, location: 'Pack' })),
      ...(this.player.stash ?? []).map((item) => ({ item, location: 'Stash' }))
    ].filter(({ item }) => item).map(({ item, location }) => ({
      id: item.id, name: item.name, slot: item.slot, rarity: item.rarity, location, baseId: item.baseId, sourceId: item.sourceId,
      bondRank: relicBondRankFor(item.bondXp ?? 0), bondXp: item.bondXp ?? 0,
      memories: (item.memories ?? []).map((id) => relicMemoryById(item.slot, id)).filter(Boolean),
      memoryChoices: (RELIC_MEMORIES[item.slot] ?? []).map((memory) => ({ ...memory, selected: item.memories?.includes(memory.id), available: relicBondRankFor(item.bondXp ?? 0) > (item.memories?.length ?? 0) && !item.memories?.includes(memory.id) })),
      affixes: item.affixes ?? [], sockets: item.sockets ?? 0, runeIds: item.runeIds ?? [], corruption: item.corruption,
      forgeLockedAffix: item.forgeLockedAffix ?? -1, masterwork: item.masterwork ?? 0, quality: item.quality, heirloom: item.heirloom === true
    }));
    return {
      audit: SYSTEM_DEPTH_AUDIT,
      oath: { ...this._worldOath(), family: 'World Torment' },
      oaths: WORLD_OATHS.map((oath) => ({ ...oath, family: 'World Torment', unlocked: this.player.level >= oath.minLevel, selected: state.worldOath === oath.id })),
      hybrid: {
        id: hybridId,
        tiers: (HYBRID_MUTATIONS[hybridId] ?? []).map((tier) => ({ ...tier, unlocked: this.player.level >= tier.level, selected: state.hybridMutations[tier.tier] ?? null }))
      },
      mastery,
      relics: ownedRelics,
      forge: {
        ...state.forge,
        disciplines: FORGE_DISCIPLINES.map((discipline) => {
          const rank = state.forge.ranks[discipline.id] ?? 0;
          const nextXp = FORGE_RANK_XP[Math.min(FORGE_RANK_XP.length - 1, rank + 1)];
          return { ...discipline, rank, xp: state.forge.xp[discipline.id], nextXp, focused: state.forge.focus === discipline.id, techniques: discipline.techniques.map((technique) => ({ ...technique, unlocked: rank >= technique.rank })) };
        })
      },
      factions,
      world: { regions: ZONES.map((zone) => ({ ...zone, ...state.world.regions[zone.id] })), strongholds, arcs, pendingArcId: state.world.pendingArcId },
      expedition: { ...state.expedition, active: this.endgame?.expedition === true ? { heat: this.endgame.rewardHeat ?? 0, boons: this.endgame.expeditionBoons ?? [], banes: this.endgame.expeditionBanes ?? [], pendingRoute: this.endgame.pendingRoute ?? null } : null },
      eclipse: { ...state.eclipse, spent: eclipseSpent, nodes: eclipseNodes, constellations: activeParagonConstellations(this.player.leveling?.paragonAllocated) },
      bestiary,
      nemeses: this.player.nemeses.map((nemesis) => ({ ...nemesis })),
      reactions: COMBAT_REACTIONS.map((reaction) => ({ ...reaction, count: state.reactions[reaction.id] ?? 0 })),
      decrees: completedDecrees,
      vendetta: state.vendetta
    };
  }

  _emitReforgedUpdate() {
    this.emit('reforged-updated', this.getReforgedOverview());
  }

  setWorldOath(oathId) {
    const oath = worldOathById(oathId);
    const state = this._reforged();
    if (!state || !oath || this.player.level < oath.minLevel) return false;
    if (!zoneAt(this.player.x, this.player.y).safe || this.endgame || this.worldEvent) {
      this.notify('World Torments can only be rewritten in Ashen Sanctuary.', 'warning');
      return false;
    }
    state.worldOath = oath.id;
    this.notify(`${oath.name} World Torment sworn. ${oath.summary}`, 'accent');
    this._emitReforgedUpdate();
    this.save();
    return true;
  }

  chooseHybridMutation(tierNumber, choiceId) {
    const state = this._reforged();
    const hybridId = this.getHybrid()?.id;
    const tier = (HYBRID_MUTATIONS[hybridId] ?? []).find((entry) => entry.tier === Number(tierNumber));
    const choice = tier?.choices.find((entry) => entry.id === choiceId);
    if (!state || !tier || !choice || this.player.level < tier.level) return false;
    const previous = state.hybridMutations[tier.tier];
    if (previous === choice.id) return true;
    if (previous) {
      const cost = 600 * tier.tier + this.player.level * 18;
      if (this.player.gold < cost) {
        this.notify(`Rewriting this mutation requires ${cost.toLocaleString()} gold.`, 'warning');
        return false;
      }
      this.player.gold -= cost;
    }
    state.hybridMutations[tier.tier] = choice.id;
    this._refreshPlayerStats(true);
    this.notify(`${choice.name} bound to ${this.getHybrid().name}.`, 'accent');
    this._emitReforgedUpdate();
    this.save();
    return true;
  }

  investMasteryEvolution(slot, pathId) {
    const state = this._reforged();
    const entry = state?.mastery?.[slot];
    const path = masteryEvolutionById(slot, pathId);
    if (!entry || !path || entry.points <= 0 || entry.rank >= path.maxRank || entry.pathId && entry.pathId !== path.id) return false;
    entry.pathId = path.id;
    entry.rank += 1;
    entry.points -= 1;
    this._refreshPlayerStats(true);
    this.notify(`${path.name} ${entry.rank}/${path.maxRank}${entry.rank === path.maxRank ? ` — ${path.milestone.name} awakened.` : ''}`, 'accent');
    this._emitReforgedUpdate();
    this.save();
    return true;
  }

  respecMasteryEvolution(slot) {
    const state = this._reforged();
    const entry = state?.mastery?.[slot];
    if (!entry?.rank) return false;
    const cost = 450 + entry.rank * 240 + this.player.level * 8;
    if (this.player.gold < cost) {
      this.notify(`Rewriting this mastery requires ${cost.toLocaleString()} gold.`, 'warning');
      return false;
    }
    this.player.gold -= cost;
    entry.points += entry.rank;
    entry.rank = 0;
    entry.pathId = null;
    this._refreshPlayerStats(true);
    this.notify('Ability evolution rewritten.', 'quiet');
    this._emitReforgedUpdate();
    this.save();
    return true;
  }

  chooseRelicMemory(itemId, memoryId) {
    const found = this._findOwnedItem(itemId);
    const item = found?.item;
    const memory = item ? relicMemoryById(item.slot, memoryId) : null;
    const memories = item ? (item.memories ??= []) : [];
    if (!item || !memory || item.bondRank <= memories.length || memories.includes(memory.id)) return false;
    memories.push(memory.id);
    this._refreshPlayerStats(true);
    this.notify(`${item.name} remembers ${memory.name}.`, 'accent');
    this._emitReforgedUpdate();
    this.save();
    return true;
  }

  rewriteRelicMemories(itemId) {
    const found = this._findOwnedItem(itemId);
    const item = found?.item;
    if (!item?.memories?.length) return false;
    const cost = item.memories.length * 2;
    if (this.player.materials.echoes < cost) {
      this.notify(`Rewriting these Memories requires ${cost} Oath Echoes.`, 'warning');
      return false;
    }
    this.player.materials.echoes -= cost;
    item.memories = [];
    this._refreshPlayerStats(true);
    this.notify(`${item.name}'s Memories were released.`, 'quiet');
    this._emitReforgedUpdate();
    this.save();
    return true;
  }

  setForgeFocus(disciplineId) {
    const discipline = forgeDisciplineById(disciplineId);
    const state = this._reforged();
    if (!discipline || !state) return false;
    state.forge.focus = discipline.id;
    this.notify(`${discipline.name} is now the active artisan focus.`, 'quiet');
    this._emitReforgedUpdate();
    this.save();
    return true;
  }

  _gainForgeXp(action, amount = 1) {
    const state = this._reforged();
    if (!state) return false;
    const matching = FORGE_DISCIPLINES.filter((discipline) => discipline.source.includes(action));
    if (!matching.length) return false;
    let ranked = false;
    matching.forEach((discipline) => {
      const multiplier = (state.forge.focus === discipline.id ? 1.5 : 1) * (this._hasReforgedSpecial('faction-foundry') && discipline.id === 'smithing' ? 1.3 : 1);
      const before = state.forge.ranks[discipline.id] ?? 0;
      state.forge.xp[discipline.id] = integer((state.forge.xp[discipline.id] ?? 0) + Math.max(1, Math.round(amount * multiplier)), 0, 0, 1_000_000);
      const after = FORGE_RANK_XP.reduce((rank, threshold, index) => (state.forge.xp[discipline.id] >= threshold ? index : rank), 0);
      state.forge.ranks[discipline.id] = after;
      if (after > before) {
        ranked = true;
        const unlocked = discipline.techniques.filter((technique) => technique.rank > before && technique.rank <= after).map((technique) => technique.name).join(', ');
        this.notify(`${discipline.name} rank ${after}${unlocked ? ` — ${unlocked} unlocked.` : '.'}`, 'accent');
      }
    });
    if (ranked) this._emitReforgedUpdate();
    return true;
  }

  useForgeTechnique(techniqueId, options = {}) {
    const state = this._reforged();
    const discipline = FORGE_DISCIPLINES.find((entry) => entry.techniques.some((technique) => technique.id === techniqueId));
    const technique = discipline?.techniques.find((entry) => entry.id === techniqueId);
    if (!state || !discipline || !technique || (state.forge.ranks[discipline.id] ?? 0) < technique.rank) return false;
    const found = options.itemId ? this._findOwnedItem(options.itemId) : null;
    const item = found?.item;
    let changed = false;
    if (techniqueId === 'lock-affix' && item?.affixes?.length) {
      const requested = integer(options.index, 0, -1, item.affixes.length - 1);
      item.forgeLockedAffix = item.forgeLockedAffix === requested ? -1 : requested;
      changed = true;
    } else if (techniqueId === 'guided-temper' && item?.affixes?.length && this.player.materials.shards >= 2) {
      this.player.materials.shards -= 2;
      item.guidedTemper = ['offense', 'defense', 'utility'].includes(options.family) ? options.family : 'offense';
      changed = true;
    } else if (techniqueId === 'purify' && item?.corruption && this.player.materials.prisms >= 1) {
      this.player.materials.prisms -= 1;
      delete item.corruption;
      changed = true;
    } else if (techniqueId === 'recenter-exalt' && item?.masterworkExalts?.length && item.affixes?.length && this.player.materials.cores >= 1) {
      this.player.materials.cores -= 1;
      item.masterworkExalts[item.masterworkExalts.length - 1] = integer(item.masterworkFocus, 0, 0, item.affixes.length - 1);
      changed = true;
    } else if (techniqueId === 'perfect-base' && item && !item.uniqueId && item.quality !== 'exquisite' && this.player.materials.cores >= 2) {
      this.player.materials.cores -= 2;
      item.quality = 'exquisite';
      changed = true;
    } else if (techniqueId === 'resonant-socket' && item && !item.resonantSocketUsed && item.sockets < 3 && this.player.materials.echoes >= 3) {
      this.player.materials.echoes -= 3;
      item.sockets += 1;
      item.resonantSocketUsed = true;
      changed = true;
    } else if (techniqueId === 'echo-rune' && item?.runeIds?.length && !item.echoRune && this.player.materials.echoes >= 2) {
      this.player.materials.echoes -= 2;
      item.echoRune = true;
      changed = true;
    } else if (techniqueId === 'fated-choice' && item?.affixes?.length && this.player.materials.echoes >= 2 && this.player.materials.prisms >= 1) {
      const base = ITEM_BASES.find((entry) => entry.id === item.baseId);
      const pool = AFFIXES.filter((affix) => affix.kind === 'fated' && (!base?.slot || !affix.slots?.length || affix.slots.includes(base.slot)));
      const chosen = pool.find((affix) => affix.stat === options.stat) ?? choose(pool, this.random);
      if (chosen) {
        this.player.materials.echoes -= 2;
        this.player.materials.prisms -= 1;
        const tier = clamp(1 + Math.floor((item.itemLevel - 1) / 20), 1, 5);
        const value = range(chosen.min, chosen.max, this.random) * (0.9 + item.itemLevel * 0.045) * (0.9 + tier * 0.1);
        const index = item.affixes.length - 1;
        item.affixes[index] = { stat: chosen.stat, label: chosen.label, value, percentage: true, tier };
        changed = true;
      }
    } else if (techniqueId === 'mythic-bargain' && item?.rarity === 'relic' && this.player.materials.cores >= 2 && this.player.materials.prisms >= 2) {
      this.player.materials.cores -= 2;
      this.player.materials.prisms -= 2;
      if (this.random() < 0.72) {
        item.rarity = 'mythic';
        item.quality = 'exquisite';
        item.sockets = Math.max(2, item.sockets);
        item.description = `Mythic Bargain: ${item.description}`;
      } else {
        item.corruption = 'Failed Mythic Bargain; the relic remembers the cost.';
        item.affixes.push({ stat: 'hp', label: 'Bargain scar', value: -Math.max(12, this.player.maxHp * 0.035), percentage: false, tier: 5 });
      }
      changed = true;
    } else if (techniqueId === 'material-exchange' && this.player.materials.cinders >= 20) {
      this.player.materials.cinders -= 20;
      this.player.materials.alloys += 1;
      state.forge.conversions += 1;
      changed = true;
    } else if (techniqueId === 'rune-synthesis' && RUNE_IDS.has(options.runeId) && (this.player.runes[options.runeId] ?? 0) >= 3) {
      this.player.runes[options.runeId] -= 3;
      if (item && item.runeIds?.includes(options.runeId)) item.empoweredRunes = Math.min(item.sockets, (item.empoweredRunes ?? 0) + 1);
      else this.player.runes[options.runeId] += 1;
      changed = true;
    } else if (techniqueId === 'source-blueprint' && state.forge.blueprints.includes(options.baseId) && this.player.materials.cinders >= 70 && this.player.materials.shards >= 5) {
      const base = ITEM_BASES.find((entry) => entry.id === options.baseId);
      if (base) {
        this.player.materials.cinders -= 70;
        this.player.materials.shards -= 5;
        const crafted = this._generateItem({ slot: base.slot, rarity: 'relic', minRarity: 'relic', sourceId: options.sourceId ?? 'stronghold' });
        if (crafted) {
          crafted.baseId = base.id;
          crafted.name = `Blueprint ${base.name}`;
          crafted.icon = base.icon;
          crafted.art = base.art;
          crafted.implicit = this._rollImplicit(base, crafted.itemLevel, crafted.quality);
          this._awardItem(crafted, 'Source Blueprint');
          changed = true;
        }
      }
    } else if (techniqueId === 'heirloom' && state.forge.blueprints.includes(options.baseId) && !state.forge.heirlooms.includes(options.sourceId ?? 'stronghold') && this.player.materials.cores >= 3 && this.player.materials.echoes >= 6) {
      const base = ITEM_BASES.find((entry) => entry.id === options.baseId);
      if (base) {
        this.player.materials.cores -= 3;
        this.player.materials.echoes -= 6;
        const sourceId = lootSourceById(options.sourceId)?.id ?? 'stronghold';
        const crafted = this._generateItem({ slot: base.slot, rarity: 'relic', minRarity: 'relic', sourceId });
        if (crafted) {
          crafted.baseId = base.id;
          crafted.name = `Heirloom ${base.name}`;
          crafted.icon = base.icon;
          crafted.art = base.art;
          crafted.quality = 'exquisite';
          crafted.heirloom = true;
          crafted.implicit = this._rollImplicit(base, crafted.itemLevel, crafted.quality);
          state.forge.heirlooms.push(sourceId);
          this._awardItem(crafted, 'Heirloom Craft');
          changed = true;
        }
      }
    }
    if (!changed) return false;
    this._gainForgeXp(discipline.source[0], 16);
    this._refreshPlayerStats(true);
    this.notify(`${technique.name} completed.`, 'accent');
    this._emitReforgedUpdate();
    this.save();
    return true;
  }

  chooseFactionDoctrine(factionId, doctrineId) {
    const state = this._reforged();
    const entry = state?.factions?.[factionId];
    const doctrineChoice = factionDoctrineById(factionId, doctrineId);
    if (!entry || !doctrineChoice || (this.player.factions?.[factionId]?.rank ?? 0) < 2) return false;
    if (entry.doctrineId && entry.doctrineId !== doctrineChoice.id) {
      if (entry.favor < 3) {
        this.notify('Rewriting a faction doctrine costs 3 Favor.', 'warning');
        return false;
      }
      entry.favor -= 3;
    }
    entry.doctrineId = doctrineChoice.id;
    this._refreshPlayerStats(true);
    this.notify(`${doctrineChoice.name} adopted.`, 'accent');
    this._emitReforgedUpdate();
    this.save();
    return true;
  }

  pledgeFaction(factionId) {
    const state = this._reforged();
    const faction = FACTIONS.find((entry) => entry.id === factionId);
    if (!state || !faction || (this.player.factions?.[factionId]?.rank ?? 0) < 4) return false;
    if (state.pledgedFaction && state.pledgedFaction !== factionId) {
      this.notify('A Covenant may hold only one faction pledge. The existing pledge is permanent for this character.', 'warning');
      return false;
    }
    state.pledgedFaction = factionId;
    this._refreshPlayerStats(true);
    this.notify(`Pledged to ${faction.name}. Its doctrine is now empowered.`, 'accent');
    this._emitReforgedUpdate();
    this.save();
    return true;
  }

  claimFactionDirective(factionId, directiveId) {
    const state = this._reforged();
    const entry = state?.factions?.[factionId];
    const directive = this._directiveDefinitions(factionId).find((item) => item.id === directiveId);
    if (!entry || !directive || entry.directiveClaims.includes(directive.id) || (entry.directiveProgress[directive.type] ?? 0) < directive.target) return false;
    entry.directiveClaims.push(directive.id);
    entry.favor += directive.favor + (state.pledgedFaction === factionId ? 1 : 0);
    this.player.materials.cinders += 5 + directive.favor * 2;
    this._gainRenown(factionId, 12 + directive.favor * 3, false);
    if (entry.directiveClaims.length >= 3) {
      entry.directiveCycle += 1;
      entry.directiveProgress = { kill: 0, event: 0, operation: 0 };
      entry.directiveClaims = [];
      this.notify(`${factionById(factionId).name} directive cycle ${entry.directiveCycle + 1} opened.`, 'accent');
    } else this.notify(`${directive.name} paid ${directive.favor} Favor.`, 'accent');
    this._emitReforgedUpdate();
    this.save();
    return true;
  }

  purchaseFactionOffer(offerId) {
    const offer = FACTION_OFFERS.find((entry) => entry.id === offerId);
    const state = this._reforged();
    const faction = offer ? state?.factions?.[offer.factionId] : null;
    if (!offer || !faction || faction.favor < offer.cost) return false;
    faction.favor -= offer.cost;
    if (offer.reward === 'item' || offer.reward === 'relic') {
      const item = this._generateItem({ sourceId: offer.factionId === 'ashen-accord' ? 'contracts' : offer.factionId === 'unrung-choir' ? 'bell-witness' : 'stronghold', minRarity: offer.reward === 'relic' ? 'relic' : 'rare', elite: true });
      if (!item) {
        faction.favor += offer.cost;
        this.notify('The reliquary could not form a reward. No Favor was spent.', 'warning');
        return false;
      }
      if (offer.reward === 'relic') {
        item.bondXp = 18;
        item.bondRank = relicBondRankFor(item.bondXp);
      }
      this._awardItem(item, offer.name);
    } else if (offer.reward === 'potion') {
      this.player.potions = this.player.maxPotions;
      this.player.materials.prisms += 2;
    } else if (offer.reward === 'alloys') {
      this.player.materials.alloys += 6;
      if (this.random() < 0.25) this.player.materials.cores += 1;
    } else if (offer.reward === 'key') {
      state.expedition.keys += 1;
      this.player.materials.echoes += 3;
    }
    this.notify(`${offer.name} purchased.`, 'accent');
    this._emitReforgedUpdate();
    this.save();
    return true;
  }

  investStronghold(strongholdId, projectId) {
    const state = this._reforged();
    const hold = state?.world?.strongholds?.[strongholdId];
    const project = STRONGHOLD_PROJECTS.find((entry) => entry.id === projectId);
    const rank = hold?.projects?.[projectId] ?? 0;
    const cost = project?.costs?.[rank];
    if (!hold?.reclaimed || !project || rank >= project.maxRank || !Number.isFinite(cost) || this.player.materials.alloys < cost) return false;
    this.player.materials.alloys -= cost;
    hold.projects[projectId] = rank + 1;
    hold.stability = Math.min(100, hold.stability + 12 + rank * 4);
    this._refreshPlayerStats(true);
    this.notify(`${project.name} ${rank + 1}/${project.maxRank} completed at ${LANDMARKS.find((entry) => entry.id === strongholdId)?.label ?? 'the stronghold'}.`, 'accent');
    this._emitReforgedUpdate();
    this.save();
    return true;
  }

  chooseEventArcOutcome(arcId, outcomeId) {
    const state = this._reforged();
    const arc = EVENT_ARCS.find((entry) => entry.id === arcId);
    const entry = state?.world?.arcs?.[arcId];
    const outcome = arc?.endings.find((ending) => ending.id === outcomeId);
    if (!entry || !outcome || entry.outcomeId || state.world.pendingArcId !== arcId) return false;
    entry.outcomeId = outcome.id;
    entry.stage = arc.stages.length;
    entry.completions += 1;
    state.world.pendingArcId = null;
    const region = state.world.regions[arc.zoneId];
    region.control = Math.min(100, region.control + 18);
    region.threat = Math.max(0, region.threat - 22);
    this._refreshPlayerStats(true);
    this.notify(`${outcome.name} becomes the lasting answer in ${ZONES.find((zone) => zone.id === arc.zoneId)?.name}.`, 'accent');
    this._emitReforgedUpdate();
    this.save();
    return true;
  }

  chooseExpeditionRoute(boonId) {
    const pending = this.endgame?.pendingRoute;
    const metamorphosis = this.endgameContextSystem.getMetamorphosisChoice(boonId);
    if (metamorphosis && pending?.metamorphosisChoices?.includes(metamorphosis.id)) {
      this.endgame.metamorphosisBoons ??= [];
      this.endgame.metamorphosisRules ??= {};
      if (!this.endgame.metamorphosisBoons.includes(metamorphosis.id)) this.endgame.metamorphosisBoons.push(metamorphosis.id);
      Object.assign(this.endgame.metamorphosisRules, metamorphosis.rules ?? {});
      this.endgame.rewardHeat = (this.endgame.rewardHeat ?? 0) + (metamorphosis.heat ?? 0);
      this.endgame.bossCovenantVariant = metamorphosis.affinity ?? this.endgame.bossCovenantVariant;
      this.endgame.pendingRoute = null;
      this.notify(`${metamorphosis.name} chosen · the Black Road changes shape.`, 'accent');
      this.domainEvents.emit('covenant:road-metamorphosis', { expeditionId: this.endgame.expeditionId, boonId: metamorphosis.id, affinity: metamorphosis.affinity, rules: { ...metamorphosis.rules } });
      this.save();
      return true;
    }
    const boon = EXPEDITION_BOONS.find((entry) => entry.id === boonId);
    if (!boon || !pending?.choices?.includes(boon.id)) return false;
    this.endgame.expeditionBoons ??= [];
    this.endgame.expeditionBanes ??= [];
    this.endgame.expeditionBoons.push(boon.id);
    this.endgame.rewardHeat = (this.endgame.rewardHeat ?? 0) + boon.heat;
    if (boon.bane && !this.endgame.expeditionBanes.includes(boon.bane)) this.endgame.expeditionBanes.push(boon.bane);
    if (boon.heat >= 2 && this.random() < 0.42) {
      const candidates = EXPEDITION_BANES.filter((bane) => !this.endgame.expeditionBanes.includes(bane.id));
      if (candidates.length) this.endgame.expeditionBanes.push(choose(candidates, this.random).id);
    }
    this._reforged().expedition.routesChosen += 1;
    this._reforged().expedition.maxHeat = Math.max(this._reforged().expedition.maxHeat, this.endgame.rewardHeat);
    if (!this._reforged().expedition.discoveredBoons.includes(boon.id)) this._reforged().expedition.discoveredBoons.push(boon.id);
    this.endgame.pendingRoute = null;
    this.notify(`${boon.name} chosen · Reward Heat ${this.endgame.rewardHeat}.`, 'accent');
    this._emitReforgedUpdate();
    this.save();
    return true;
  }

  getExpeditionRouteChoice() {
    const pending = this.endgame?.pendingRoute;
    if (!pending) return null;
    return {
      ...pending,
      heat: this.endgame.rewardHeat ?? 0,
      currentBoons: (this.endgame.expeditionBoons ?? []).map((id) => EXPEDITION_BOONS.find((boon) => boon.id === id)).filter(Boolean),
      currentBanes: (this.endgame.expeditionBanes ?? []).map((id) => EXPEDITION_BANES.find((bane) => bane.id === id)).filter(Boolean),
      choices: [
        ...pending.choices.map((id) => EXPEDITION_BOONS.find((boon) => boon.id === id)).filter(Boolean),
        ...(pending.metamorphosisChoices ?? []).map((id) => this.endgameContextSystem.getMetamorphosisChoice(id)).filter(Boolean)
      ]
    };
  }

  allocateEclipseNode(nodeId) {
    const state = this._reforged();
    const node = eclipseNodeById(nodeId);
    if (!state || !node || this.player.level < MAX_LEVEL || state.eclipse.allocated[node.id] || state.eclipse.points < node.cost || !node.requires.every((id) => state.eclipse.allocated[id])) return false;
    state.eclipse.allocated[node.id] = true;
    state.eclipse.points -= node.cost;
    this._refreshPlayerStats(true);
    this.notify(`${node.name} awakened in the Eclipse Web.`, 'accent');
    this._emitReforgedUpdate();
    this.save();
    return true;
  }

  chooseBestiaryInsight(familyId, insightId) {
    const state = this._reforged();
    const family = BESTIARY_FAMILIES.find((entry) => entry.id === familyId);
    const insight = BESTIARY_INSIGHTS.find((entry) => entry.id === insightId);
    const entry = state?.bestiary?.[familyId];
    if (!family || !insight || !entry || entry.rank < 2) return false;
    if (entry.insightId && entry.insightId !== insight.id && this.player.materials.marks < 1) {
      this.notify('Rewriting a Bestiary insight requires one Apex Mark.', 'warning');
      return false;
    }
    if (entry.insightId && entry.insightId !== insight.id) this.player.materials.marks -= 1;
    entry.insightId = insight.id;
    this.notify(`${family.name}: ${insight.name} insight selected.`, 'accent');
    this._emitReforgedUpdate();
    this.save();
    return true;
  }

  chooseCampaignDecree(chapterId, decreeId) {
    const state = this._reforged();
    const decree = campaignDecreeById(chapterId, decreeId);
    if (!state || !decree || !chapterIsComplete(this.player.campaign, chapterId) || state.decrees[chapterId]) return false;
    state.decrees[chapterId] = decree.id;
    this._refreshPlayerStats(true);
    this.notify(`${decree.name} decreed for this covenant.`, 'accent');
    this._emitReforgedUpdate();
    this.save();
    return true;
  }

  createHunterFromEnemy(enemy, context = {}) {
    if (!this.player || !enemy?.templateId) return null;
    const existingIndex = this.player.hunters.findIndex((hunter) => !hunter.defeated && hunter.templateId === enemy.templateId);
    const resolvedCovenant = this.covenantSystem.resolve(this.player.covenant);
    const observation = { ...context, now: this.clock, covenant: resolvedCovenant, factionId: enemy.doctrineFaction };
    let hunter;
    if (existingIndex >= 0) {
      hunter = this.hunterSystem.recordVictory(this.player.hunters[existingIndex], observation);
      this.player.hunters[existingIndex] = hunter;
    } else {
      hunter = this.hunterSystem.createFromVictor(enemy, observation);
      this.player.hunters.unshift(hunter);
      this.player.hunters = this.player.hunters.slice(0, 8);
    }
    this.save();
    return hunter;
  }

  intrudeHunter(hunterId = null, context = {}) {
    if (!this.player) return null;
    const hunter = hunterId
      ? this.player.hunters.find((entry) => entry.id === hunterId && !entry.defeated && entry.nextEligibleAt <= this.clock)
      : this.hunterSystem.chooseIntrusion(this.player.hunters, { now: this.clock, zoneId: context.zoneId ?? zoneAt(this.player.x, this.player.y).id });
    if (!hunter) return null;
    const x = Number.isFinite(context.x) ? context.x : this.player.x + 180;
    const y = Number.isFinite(context.y) ? context.y : this.player.y;
    const group = context.group ?? uid('hunter-pack');
    const enemy = this._spawnEnemy(hunter.templateId, x, y, { level: Math.max(this.player.level, hunter.level), group, engaged: true, elite: true, doctrineFaction: hunter.factionId });
    if (!enemy) return null;
    this.hunterSystem.decorateEnemy(enemy, hunter);
    hunter.lastSeenAt = this.clock;
    hunter.nextEligibleAt = this.clock + Math.min(180, 50 + hunter.victories * 10);
    this.domainEvents.emit('hunter:intrusion', { hunterId: hunter.id, enemyId: enemy.id, zoneId: context.zoneId ?? zoneAt(x, y).id, adaptations: [...hunter.adaptations] });
    this.notify(`${hunter.name} has found the covenant again.`, 'warning');
    return enemy;
  }

  getSanctuaryState() {
    if (!this.player) return null;
    const resolved = this.sanctuarySystem.resolve({
      sanctuary: this.player.sanctuary,
      covenant: this.covenantSystem.resolve(this.player.covenant),
      worldProgress: this.player.worldProgress,
      factions: this.player.factions,
      hunters: this.player.hunters,
      worldV2: this.player.worldV2,
      campaign: this.player.campaign
    });
    this.player.sanctuary.level = resolved.level;
    this.player.sanctuary.architecture = [...resolved.architecture];
    this.player.sanctuary.npcs = Object.fromEntries(resolved.npcs.map((npc) => [npc.id, true]));
    this.player.sanctuary.merchants = Object.fromEntries(resolved.merchants.map((merchant) => [merchant.id, true]));
    return resolved;
  }

  getSanctuaryPresentation() {
    const state = this.getSanctuaryState();
    return state ? this.sanctuarySystem.presentation(state) : { props: [], npcs: [], lighting: null };
  }

  buySanctuaryCache(merchantId, offerId) {
    if (!this.player || zoneAt(this.player.x, this.player.y).id !== 'sanctuary' || this.endgame) return false;
    const state = this.getSanctuaryState();
    const merchant = state?.merchants.find((entry) => entry.id === merchantId);
    const offer = merchant?.offers.find((entry) => entry.id === offerId);
    if (!offer || this.player.gold < offer.cost) return false;
    const covenantBias = this.covenantSystem.getRewardBias(this.player.covenant);
    const item = this._generateItem({
      sourceId: offer.sourceId,
      minRarity: offer.minRarity,
      forceUnique: offer.forceUnique === true,
      elite: true,
      covenantBias,
      targetFarm: offer.id === 'covenant-cache' || offer.id === 'hunter-cache'
    });
    if (!item) return false;
    this.player.gold -= offer.cost;
    const location = this._awardItem(item, offer.name);
    this.notify(`${offer.name} opened · ${item.name} ${location ? 'secured' : 'awaits nearby'}.`, 'accent');
    this.domainEvents.emit('sanctuary:merchant-purchase', { merchantId, offerId, itemId: item.id, uniqueId: item.uniqueId ?? null });
    this.save();
    return true;
  }

  getHunterDossiers() {
    return (this.player?.hunters ?? []).map((hunter) => ({ ...this.hunterSystem.normalize(hunter), active: this.entities.enemies.some((enemy) => !enemy.dead && enemy.hunterId === hunter.id) }));
  }

  _normalizeNemeses(value) {
    if (!Array.isArray(value)) return [];
    return value.filter((entry) => isRecord(entry) && ENEMIES[entry.templateId]).slice(0, 4).map((entry, index) => ({
      id: text(entry.id, `nemesis-${index}`, 64),
      name: text(entry.name, 'Scarred Adversary', 64),
      templateId: entry.templateId,
      level: integer(entry.level, 1, 1, MAX_LEVEL + 20),
      victories: integer(entry.victories, 1, 1, 99),
      damageType: text(entry.damageType, 'darkness', 48),
      grudge: integer(entry.grudge, entry.victories ?? 1, 1, 99),
      scars: Array.isArray(entry.scars) ? [...new Set(entry.scars.filter((id) => ['fire', 'projectile', 'hybrid', 'ultimate', 'execution', 'ward'].includes(id)))].slice(0, 4) : [],
      traits: Array.isArray(entry.traits) ? [...new Set(entry.traits.filter((id) => ['vengeful', 'ironhide', 'mirrorborn', 'bloodfed', 'nullstep', 'bellbound'].includes(id)))].slice(0, 4) : [],
      lastVictorSource: text(entry.lastVictorSource, entry.damageType ?? 'darkness', 48),
      bounty: integer(entry.bounty, 1, 1, 25)
    }));
  }

  _normalizeReforged(value, player = this.player) {
    const raw = isRecord(value) ? value : {};
    const level = integer(player?.level, 1, 1, MAX_LEVEL);
    const requestedOath = worldOathById(raw.worldOath);
    const worldOath = level >= requestedOath.minLevel ? requestedOath.id : 'pilgrim';

    const hybridId = player?.hybridId ?? this.getHybrid()?.id;
    const hybridMutations = {};
    (HYBRID_MUTATIONS[hybridId] ?? []).forEach((tier) => {
      const chosen = tier.choices.find((choice) => choice.id === raw.hybridMutations?.[tier.tier]);
      if (chosen && level >= tier.level) hybridMutations[tier.tier] = chosen.id;
    });

    const mastery = {};
    MASTERY_ORDER.forEach((slot) => {
      const earned = Math.min(5, integer(player?.abilityMastery?.[slot]?.rank, 0, 0, 6));
      const saved = isRecord(raw.mastery?.[slot]) ? raw.mastery[slot] : {};
      let path = masteryEvolutionById(slot, saved.pathId);
      if (!path) {
        const legacyDoctrine = player?.masteryDoctrines?.[slot];
        const legacyIndex = Math.max(0, (MASTERY_DOCTRINES[slot] ?? []).findIndex((entry) => entry.id === legacyDoctrine));
        path = MASTERY_EVOLUTIONS[slot]?.[legacyIndex] ?? null;
      }
      const rank = path ? integer(saved.rank, earned >= 3 && player?.masteryDoctrines?.[slot] ? 1 : 0, 0, earned) : 0;
      mastery[slot] = { pathId: rank ? path.id : null, rank, earned, points: Math.max(0, earned - rank) };
    });

    const forgeXp = {};
    const forgeRanks = {};
    FORGE_DISCIPLINES.forEach((discipline) => {
      const xp = integer(raw.forge?.xp?.[discipline.id], 0, 0, 1_000_000);
      forgeXp[discipline.id] = xp;
      forgeRanks[discipline.id] = FORGE_RANK_XP.reduce((rank, threshold, index) => (xp >= threshold ? index : rank), 0);
    });
    const forge = {
      focus: forgeDisciplineById(raw.forge?.focus)?.id ?? 'smithing',
      xp: forgeXp,
      ranks: forgeRanks,
      blueprints: Array.isArray(raw.forge?.blueprints) ? [...new Set(raw.forge.blueprints.filter((id) => ITEM_BASES.some((base) => base.id === id)))].slice(0, ITEM_BASES.length) : [],
      conversions: integer(raw.forge?.conversions, 0, 0, 1_000_000),
      heirlooms: Array.isArray(raw.forge?.heirlooms) ? [...new Set(raw.forge.heirlooms.filter((id) => LOOT_SOURCES.some((source) => source.id === id)))].slice(0, LOOT_SOURCES.length) : []
    };

    const factionState = {};
    FACTIONS.forEach((faction) => {
      const saved = isRecord(raw.factions?.[faction.id]) ? raw.factions[faction.id] : {};
      const rank = player?.factions?.[faction.id]?.rank ?? 0;
      const doctrineChoice = factionDoctrineById(faction.id, saved.doctrineId);
      factionState[faction.id] = {
        doctrineId: doctrineChoice && rank >= 2 ? doctrineChoice.id : null,
        favor: integer(saved.favor, 0, 0, 9_999),
        directiveCycle: integer(saved.directiveCycle, 0, 0, 99_999),
        directiveProgress: {
          kill: integer(saved.directiveProgress?.kill, 0, 0, 999),
          event: integer(saved.directiveProgress?.event, 0, 0, 99),
          operation: integer(saved.directiveProgress?.operation, 0, 0, 99)
        },
        directiveClaims: Array.isArray(saved.directiveClaims) ? [...new Set(saved.directiveClaims.filter((id) => ['kill', 'event', 'operation'].includes(id)))] : []
      };
    });
    const pledgedFaction = FACTIONS.some((faction) => faction.id === raw.pledgedFaction && (player?.factions?.[faction.id]?.rank ?? 0) >= 4) ? raw.pledgedFaction : null;

    const regions = {};
    ZONES.forEach((zone) => {
      const saved = isRecord(raw.world?.regions?.[zone.id]) ? raw.world.regions[zone.id] : {};
      const legacy = player?.worldProgress?.zones?.[zone.id];
      regions[zone.id] = {
        threat: integer(saved.threat, zone.safe ? 0 : legacy?.corruption ?? Math.min(60, zone.level * 3), 0, 100),
        control: integer(saved.control, legacy?.liberated ? 65 : zone.safe ? 100 : Math.max(0, 35 - (legacy?.corruption ?? 0) / 2), 0, 100),
        momentum: integer(saved.momentum, 0, -100, 100),
        secrets: integer(saved.secrets, 0, 0, 5),
        ignoredEvents: integer(saved.ignoredEvents, 0, 0, 999)
      };
    });

    const strongholds = {};
    LANDMARKS.filter((landmark) => landmark.kind === 'stronghold').forEach((landmark) => {
      const saved = isRecord(raw.world?.strongholds?.[landmark.id]) ? raw.world.strongholds[landmark.id] : {};
      const reclaimed = player?.worldProgress?.strongholds?.[landmark.id] === true;
      strongholds[landmark.id] = {
        reclaimed,
        stability: integer(saved.stability, reclaimed ? 60 : 0, 0, 100),
        defenses: integer(saved.defenses, 0, 0, 99_999),
        projects: Object.fromEntries(STRONGHOLD_PROJECTS.map((project) => [project.id, reclaimed ? integer(saved.projects?.[project.id], 0, 0, project.maxRank) : 0]))
      };
    });

    const arcs = {};
    EVENT_ARCS.forEach((arc) => {
      const saved = isRecord(raw.world?.arcs?.[arc.id]) ? raw.world.arcs[arc.id] : {};
      const outcome = arc.endings.find((entry) => entry.id === saved.outcomeId);
      arcs[arc.id] = {
        stage: outcome ? arc.stages.length : integer(saved.stage, 0, 0, arc.stages.length - 1),
        progress: integer(saved.progress, 0, 0, 3),
        outcomeId: outcome?.id ?? null,
        completions: integer(saved.completions, 0, 0, 999)
      };
    });

    const expedition = {
      keys: integer(raw.expedition?.keys, 0, 0, 9_999),
      mastery: integer(raw.expedition?.mastery, 0, 0, 1_000_000),
      routesChosen: integer(raw.expedition?.routesChosen, 0, 0, 1_000_000),
      maxHeat: integer(raw.expedition?.maxHeat, 0, 0, 99),
      discoveredBoons: Array.isArray(raw.expedition?.discoveredBoons) ? [...new Set(raw.expedition.discoveredBoons.filter((id) => EXPEDITION_BOONS.some((boon) => boon.id === id)))].slice(0, EXPEDITION_BOONS.length) : []
    };

    const eclipsePointsEarned = integer(raw.eclipse?.pointsEarned, 0, 0, 99);
    const requestedEclipse = isRecord(raw.eclipse?.allocated) ? raw.eclipse.allocated : {};
    const eclipseAllocated = {};
    let eclipseSpent = 0;
    let changed = true;
    while (changed) {
      changed = false;
      ECLIPSE_WEB.forEach((node) => {
        if (eclipseAllocated[node.id] || requestedEclipse[node.id] !== true || eclipseSpent + node.cost > eclipsePointsEarned) return;
        if (!node.requires.every((id) => eclipseAllocated[id])) return;
        eclipseAllocated[node.id] = true;
        eclipseSpent += node.cost;
        changed = true;
      });
    }
    const eclipse = {
      seals: Object.fromEntries(ENDGAME_ACTIVITIES.map((activity) => [activity.id, integer(raw.eclipse?.seals?.[activity.id], 0, 0, 99)])),
      pointsEarned: eclipsePointsEarned,
      points: Math.max(0, eclipsePointsEarned - eclipseSpent),
      allocated: eclipseAllocated,
      escalation: integer(raw.eclipse?.escalation, 0, 0, 100),
      pinnacleKeys: integer(raw.eclipse?.pinnacleKeys, 0, 0, 99),
      worldscarClears: integer(raw.eclipse?.worldscarClears, 0, 0, 999),
      finalBellClears: integer(raw.eclipse?.finalBellClears, 0, 0, 999)
    };

    const bestiary = {};
    BESTIARY_FAMILIES.forEach((family) => {
      const saved = isRecord(raw.bestiary?.[family.id]) ? raw.bestiary[family.id] : {};
      const kills = integer(saved.kills, 0, 0, 10_000_000);
      const rank = family.thresholds.reduce((current, threshold, index) => (kills >= threshold ? index : current), 0);
      const insight = BESTIARY_INSIGHTS.find((entry) => entry.id === saved.insightId);
      bestiary[family.id] = { kills, rank, insightId: insight && rank >= 2 ? insight.id : null, breaks: integer(saved.breaks, 0, 0, 1_000_000) };
    });

    const reactions = Object.fromEntries(COMBAT_REACTIONS.map((reaction) => [reaction.id, integer(raw.reactions?.[reaction.id], 0, 0, 10_000_000)]));
    const decrees = {};
    Object.keys(CAMPAIGN_DECREES).forEach((chapterId) => {
      const decree = campaignDecreeById(chapterId, raw.decrees?.[chapterId]);
      if (decree && chapterIsComplete(player?.campaign, chapterId)) decrees[chapterId] = decree.id;
    });

    return {
      version: 1,
      worldOath,
      hybridMutations,
      mastery,
      forge,
      factions: factionState,
      pledgedFaction,
      world: { regions, strongholds, arcs, pendingArcId: EVENT_ARCS.some((arc) => arc.id === raw.world?.pendingArcId && !arcs[arc.id].outcomeId && arcs[arc.id].stage >= arc.stages.length - 1) ? raw.world.pendingArcId : null },
      expedition,
      eclipse,
      bestiary,
      reactions,
      reactionTotal: integer(raw.reactionTotal, Object.values(reactions).reduce((sum, count) => sum + count, 0), 0, 100_000_000),
      decrees,
      vendetta: integer(raw.vendetta, 0, 0, 9_999)
    };
  }

  _normalizeItemLocks(value, ownedItems) {
    if (!isRecord(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([id, locked]) => locked === true && ownedItems.has(id)));
  }

  _normalizeLoadouts(value, ownedItems) {
    const loadouts = [null, null, null];
    if (!Array.isArray(value)) return loadouts;
    value.slice(0, 3).forEach((rawLoadout, index) => {
      if (!isRecord(rawLoadout)) return;
      const loadout = {};
      Object.entries(rawLoadout).forEach(([slot, id]) => {
        const item = ownedItems.get(id);
        if (item && item.slot === slot) loadout[slot] = id;
      });
      if (Object.keys(loadout).length) loadouts[index] = loadout;
    });
    return loadouts;
  }

  _normalizeImprints(value, level) {
    if (!isRecord(value)) return {};
    const imprints = {};
    Object.entries(SKILL_IMPRINTS).forEach(([slot, options]) => {
      const imprint = options.find((entry) => entry.id === value[slot]);
      if (imprint && level >= imprint.level) imprints[slot] = imprint.id;
    });
    return imprints;
  }

  _normalizeAbilityMastery(value, level) {
    const raw = isRecord(value) ? value : {};
    return Object.fromEntries(MASTERY_ORDER.map((id) => {
      const track = getMasteryTrack(id);
      const xp = integer(raw[id]?.xp, 0, 0, 100_000);
      return [id, { xp, rank: masteryRankFor(track, xp, level) }];
    }));
  }

  _normalizeMasteryDoctrines(value, mastery) {
    const raw = isRecord(value) ? value : {};
    const doctrines = {};
    MASTERY_ORDER.forEach((slot) => {
      const doctrine = getMasteryDoctrine(slot, raw[slot]);
      if (doctrine && (mastery?.[slot]?.rank ?? 0) >= 3) doctrines[slot] = doctrine.id;
    });
    return doctrines;
  }

  _restoreSkillRanks(value) {
    const requested = isRecord(value) ? value : {};
    const nodes = this.getSkillNodes();
    const targets = new Map(nodes.map((node) => [node.id, integer(requested[node.id], 0, 0, node.max)]));
    this.player.skillRanks = {};
    const pointBudget = skillPointBudgetForLevel(this.player.level);
    let spent = 0;
    let changed = true;
    while (changed && spent < pointBudget) {
      changed = false;
      nodes.forEach((node) => {
        if (spent >= pointBudget) return;
        const current = this.getTalentRank(node.id);
        if (current >= (targets.get(node.id) ?? 0) || this.getSkillLockReason(node)) return;
        this.player.skillRanks[node.id] = current + 1;
        spent += 1;
        changed = true;
      });
    }
  }

  _makePlayer(primary, secondary) {
    const hybrid = getHybrid(primary, secondary);
    const stats = classMixStats(primary, secondary);
    const player = {
      id: 'hero', primary, secondary, hybridId: hybrid.id,
      x: 690, y: 625, radius: 20, facing: 0, moveX: 0, moveY: 0,
      elevation: 0, groundElevation: 0, verticalVelocity: 0, grounded: true, turnCooldown: 0,
      moveCommand: null, combatTargetId: null,
      baseStats: stats, maxHp: stats.hp, hp: stats.hp, maxResource: stats.resource, resource: stats.resource,
      maxPotions: stats.potions, potions: stats.potions, gold: 0, level: 1, xp: 0, skillPoints: 0,
      skillRanks: {}, skillImprints: {}, abilityMastery: this._normalizeAbilityMastery(null, 1), masteryDoctrines: {}, resonance: 0, confluence: 0, lastResonanceFamily: null,
      inventory: [], stash: [], itemLocks: {}, inventorySort: 'rarity', loadouts: [null, null, null], equipment: {}, materials: this._normalizeMaterials(null),
      runes: {}, aspects: {}, attunedAspects: [], attunedAspect: null, lootCollection: this._normalizeLootCollection(null), lootPity: this._normalizeLootPity(null), lootTarget: null,
      worldProgress: this._normalizeWorldProgress(null), endgameRecords: this._normalizeEndgameRecords(null), nemeses: [], hunters: [], campaign: createCampaignState(),
      covenant: defaultCovenantState(), worldV2: { regions: {}, activeEvents: [], resolvedEvents: [], procession: null, tick: 0 }, sanctuary: { level: 1, flags: {}, merchants: {}, npcs: {}, architecture: [], discoveries: [] }, mutationProgress: { credits: 0, selections: {}, unlocked: [], legacyConverted: true },
      factions: this._normalizeFactionProgress(null), contracts: this._normalizeContracts(null, 1),
      leveling: this._normalizeLeveling({ pillarPoints: 1, claimedLevels: [1], legacySeeded: true }, 1),
      cooldowns: { attack: 0, skillOne: 0, skillTwo: 0, dodge: 0, companion: 0, hybrid: 0, ultimate: 0, potion: 0 },
      animation: { type: 'idle', time: 0, duration: 0, angle: 0 }, presentation: null, dash: null, iframes: 0, stagger: 0,
      barrier: 0, barrierTime: 0, attackChain: 0, attackChainTime: 0, markedTargets: 0,
      buffs: [], status: {}, combatTime: 0, deathTime: 0, lastDamageSource: null, afterimages: [],
      actionHistory: [], hybridCharge: 0, reforged: null
    };
    player.reforged = this._normalizeReforged(null, player);
    player.requiem = createRequiemState();
    return player;
  }

  _snapFacing(angle) {
    return Math.round(angle / FACING_STEP) * FACING_STEP;
  }

  _turnBody(body, desiredAngle, dt, turnRate = PLAYER_TURN_RATE) {
    if (!body || !Number.isFinite(desiredAngle)) return;
    const current = this._snapFacing(Number.isFinite(body.facing) ? body.facing : 0);
    const target = this._snapFacing(desiredAngle);
    const delta = wrapAngle(target - current);
    body.facing = current;
    body.turnCooldown = Math.max(0, finite(body.turnCooldown, 0) - dt);
    if (Math.abs(delta) < FACING_STEP * .25 || body.turnCooldown > 0) return;
    body.facing = this._snapFacing(current + Math.sign(delta) * FACING_STEP);
    body.turnCooldown = FACING_STEP / Math.max(.1, turnRate);
  }

  _applyGravity(body, dt) {
    if (!body) return false;
    const elevation = finite(body.elevation, 0, 0, MAX_ELEVATION);
    const velocity = finite(body.verticalVelocity, 0, -2200, 920);
    body.elevation = elevation;
    body.verticalVelocity = velocity;
    if (elevation <= 0 && velocity <= 0) {
      body.elevation = 0;
      body.verticalVelocity = 0;
      body.grounded = true;
      return false;
    }
    body.verticalVelocity = Math.max(-2200, velocity - GRAVITY * dt);
    body.elevation += body.verticalVelocity * dt;
    if (body.elevation <= 0) {
      const landedHard = body.verticalVelocity < -300;
      body.elevation = 0;
      body.verticalVelocity = 0;
      body.grounded = true;
      return landedHard;
    }
    body.elevation = Math.min(MAX_ELEVATION, body.elevation);
    body.grounded = false;
    return false;
  }

  _updateGroundState(body) {
    if (!body) return;
    body.groundElevation = this.worldGeometry?.groundElevation?.(body.x, body.y, this) ?? 0;
    body.surface = this.worldGeometry?.surfaceAt?.(body.x, body.y, this) ?? 'dirt';
  }

  _moveBodyWithGeometry(body, nextX, nextY) {
    if (!body) return false;
    const previousX = body.x; const previousY = body.y;
    const resolved = this.worldGeometry?.resolveMove?.(body, nextX, nextY, this) ?? { x: nextX, y: nextY };
    body.x = resolved.x; body.y = resolved.y;
    this._updateGroundState(body);
    return Math.abs(body.x - previousX) + Math.abs(body.y - previousY) > 0.001;
  }

  _applyPlayerRootMotion(dt) {
    const player = this.player;
    const action = player?.presentation?.action;
    if (!action || !['attack', 'execution'].includes(action.profile?.action) || player.dash) return;
    const profile = action.profile;
    if (profile.movementPolicy === 'stationary' || profile.range > 220) return;
    const duration = Math.max(.01, profile.duration ?? .3);
    const progress = clamp(action.elapsed / duration, 0, 1);
    const previous = Number.isFinite(action.rootMotionProgress) ? action.rootMotionProgress : progress;
    action.rootMotionProgress = progress;
    const combo = profile.comboIndex ?? 1;
    const total = action.profile?.action === 'execution' ? 42 : combo === 3 ? 34 : combo === 2 ? 24 : 20;
    const curve = (t) => t < .58 ? Math.sin((t / .58) * Math.PI * .5) : 1 - Math.max(0, (t - .58) / .42) * .08;
    const delta = Math.max(0, curve(progress) - curve(previous)) * total;
    if (delta <= 0) return;
    this._moveBodyWithGeometry(player, player.x + Math.cos(player.facing) * delta, player.y + Math.sin(player.facing) * delta);
  }

  _assignCombatSlot(enemy, group) {
    if (!enemy || !this.player) return null;
    const melee = group.filter((unit) => !unit.dead && ['melee', 'shield', 'brute', 'assassin', 'burrower', 'boss'].includes(unit.role));
    const index = Math.max(0, melee.indexOf(enemy));
    const count = Math.max(1, melee.length);
    const base = Math.atan2(enemy.spawnY - this.player.y, enemy.spawnX - this.player.x);
    const angle = base + ((index / count) * Math.PI * 2) + (enemy.role === 'assassin' ? Math.PI * .42 : 0);
    const radius = enemy.boss ? 104 : enemy.role === 'brute' ? 92 : enemy.role === 'shield' ? 78 : 70;
    enemy.combatSlot = { angle, radius, x: this.player.x + Math.cos(angle) * radius, y: this.player.y + Math.sin(angle) * radius, updatedAt: this.clock };
    return enemy.combatSlot;
  }

  getHybrid() {
    return this.player ? getHybrid(this.player.primary, this.player.secondary) : null;
  }

  getPrimaryClass() {
    return this.player ? getClass(this.player.primary) : null;
  }

  getSecondaryClass() {
    return this.player ? getClass(this.player.secondary) : null;
  }

  getRequiemOverview() {
    if (!this.player) return null;
    const state = this.player.requiem ?? (this.player.requiem = createRequiemState());
    const mechanic = CLASS_MECHANICS[this.player.primary] ?? CLASS_MECHANICS.warden;
    const room = ENCOUNTER_ROOM_BY_ID[this.encounter.activeRoomId] ?? null;
    const activeExpedition = this.endgame?.blackRoad ? BLACK_ROAD_BY_ID[this.endgame.expeditionId] ?? null : null;
    const activeStage = this.endgame?.blackRoad ? this.endgame.activeStage ?? null : null;
    const tutorial = activeTutorialStep(state);
    const nextExpedition = BLACK_ROAD_EXPEDITIONS
      .map((candidate) => ({ expedition: candidate, clears: state.blackRoad.records[candidate.id]?.clears ?? 0 }))
      .filter((entry) => this.player.level + 4 >= entry.expedition.recommendedLevel)
      .sort((left, right) => left.clears - right.clears || left.expedition.recommendedLevel - right.expedition.recommendedLevel)[0]?.expedition ?? BLACK_ROAD_EXPEDITIONS[0];
    const route = activeStage ?? nextExpedition?.stages?.[0] ?? null;
    const remainingVessels = activeStage ? (this.entities.destructibles ?? []).filter((entry) => !entry.broken && entry.expeditionStageId === activeStage.id).length : 0;
    const activeEnemies = activeStage ? this.entities.enemies.filter((enemy) => !enemy.dead && enemy.group === this.endgame.id).length : 0;
    const encounterData = activeStage ? {
      id: activeStage.id, name: activeStage.name, hint: activeStage.hint, tier: this.endgame.waveIndex,
      state: this.endgame.completed ? 'cleared' : this.endgame.stageClearedAt ? 'cleared' : this.entities.enemies.some((enemy) => !enemy.dead && enemy.windupLeft > 0) ? 'danger' : 'engaged',
      remaining: activeEnemies + remainingVessels,
      total: Math.max(1, this.endgame.activeStageTotal ?? activeEnemies + remainingVessels),
      objective: activeStage.objective,
      stageType: activeStage.type,
      stage: Math.min(this.endgame.waveIndex, this.endgame.wavePlan.length),
      totalStages: this.endgame.wavePlan.length,
      vessels: remainingVessels,
      completed: this.endgame.completed === true
    } : room ? {
      id: room.id, name: room.name, hint: room.hint, tier: room.tier,
      state: this.encounter.state, remaining: this.encounter.remaining, total: this.encounter.total
    } : null;
    return {
      release: REQUIEM_RELEASE,
      difficulty: DIFFICULTY_PROFILES[state.difficulty] ?? DIFFICULTY_PROFILES.veteran,
      mechanic: { ...mechanic, value: state.classMechanic.value, ready: state.classMechanic.ready },
      encounter: encounterData,
      route: route ? { id: route.id, name: route.name, zoneId: activeExpedition?.zoneId ?? nextExpedition?.zoneId, tier: route.tier ?? 1, x: route.x, y: route.y } : null,
      blackRoad: {
        active: Boolean(activeExpedition),
        expeditionId: activeExpedition?.id ?? null,
        name: activeExpedition?.name ?? null,
        stage: activeStage ? Math.min(this.endgame.waveIndex, this.endgame.wavePlan.length) : 0,
        totalStages: activeExpedition?.stages.length ?? 0,
        heat: this.endgame?.blackRoad ? this.endgame.rewardHeat ?? 0 : 0,
        completed: this.endgame?.blackRoad ? this.endgame.completed === true : false,
        totalClears: state.blackRoad.totalClears,
        bossesDefeated: state.blackRoad.bossesDefeated
      },
      tutorial: tutorial ? { ...tutorial, progress: state.tutorial.progress } : null,
      tutorialStep: state.tutorial.step,
      tutorialTotal: TUTORIAL_STEPS.length,
      roomsCleared: state.roomsCleared,
      bestRoomStreak: state.bestRoomStreak
    };
  }

  getBlackRoadAtlas() {
    if (!this.player) return [];
    const state = this.player.requiem ?? (this.player.requiem = createRequiemState());
    return BLACK_ROAD_EXPEDITIONS.map((expedition) => {
      const record = state.blackRoad.records[expedition.id];
      return {
        ...expedition,
        unlocked: this.player.level + 4 >= expedition.recommendedLevel,
        active: this.endgame?.blackRoad === true && this.endgame.expeditionId === expedition.id,
        record: { ...record },
        stages: expedition.stages.map((stage, index) => ({
          ...stage,
          number: index + 1,
          cleared: record.clears > 0 || (this.endgame?.blackRoad === true && this.endgame.expeditionId === expedition.id && this.endgame.waveIndex > index + Number(Boolean(this.endgame.activeStage)))
        }))
      };
    });
  }

  getActiveExpeditionArena() {
    const stage = this.endgame?.blackRoad && !this.endgame.completed ? this.endgame.activeStage : null;
    if (!stage) return null;
    return {
      x: stage.x,
      y: stage.y,
      radius: stage.radius,
      color: BLACK_ROAD_BY_ID[this.endgame.expeditionId]?.color ?? '#c8a96b',
      name: stage.name,
      sealed: !this.endgame.stageClearedAt
    };
  }

  _constrainBlackRoadArena() {
    const arena = this.getActiveExpeditionArena();
    if (!arena?.sealed || !this.player) return;
    const activeStageId = this.endgame?.activeStage?.id;
    const constrain = (actor, inset = 0) => {
      if (activeStageId && this.worldGeometry?.constrainArena) {
        for (let pass = 0; pass < 2; pass += 1) {
          this.worldGeometry.constrainArena(actor, activeStageId, inset, arena.radius);
          const resolved = this.worldGeometry.resolveMove?.(actor, actor.x, actor.y, this);
          if (resolved) { actor.x = resolved.x; actor.y = resolved.y; }
        }
        this.worldGeometry.constrainArena(actor, activeStageId, inset, arena.radius);
        this._updateGroundState(actor);
        return;
      }
      const dx = actor.x - arena.x;
      const dy = actor.y - arena.y;
      const limit = Math.max(70, arena.radius - Math.max(inset, actor.radius ?? 0) - 9);
      const magnitude = Math.hypot(dx, dy);
      if (magnitude <= limit || magnitude <= 0.001) return;
      actor.x = arena.x + dx / magnitude * limit;
      actor.y = arena.y + dy / magnitude * limit;
    };
    const beforeX = this.player.x;
    const beforeY = this.player.y;
    constrain(this.player, 18);
    if (beforeX !== this.player.x || beforeY !== this.player.y) {
      this.player.moveCommand = null;
      const outward = normalize(beforeX - arena.x, beforeY - arena.y);
      const movingOut = this.player.moveX * outward.x + this.player.moveY * outward.y;
      if (movingOut > 0) {
        this.player.moveX -= outward.x * movingOut;
        this.player.moveY -= outward.y * movingOut;
      }
    }
    this.entities.enemies
      .filter((enemy) => !enemy.dead && enemy.group === this.endgame.id)
      .forEach((enemy) => constrain(enemy, enemy.boss ? 32 : 12));
  }

  startBlackRoadExpedition(expeditionId) {
    if (!this.player || this.state !== 'playing') return false;
    const expedition = BLACK_ROAD_BY_ID[expeditionId] ?? blackRoadForZone(expeditionId);
    if (!expedition) return false;
    if (this.player.level + 4 < expedition.recommendedLevel) {
      this.notify(`${expedition.name} recommends level ${expedition.recommendedLevel}.`, 'warning');
      return false;
    }
    if (this.endgame && !this.endgame.completed) {
      this.notify('Finish or abandon the current operation before opening another road.', 'warning');
      return false;
    }
    const difficulty = this.player.requiem?.difficulty ?? 'veteran';
    const tier = difficulty === 'penitent' ? 6 : difficulty === 'adventurer' ? 1 : 3;
    this.entities.enemies = [];
    this.entities.projectiles = [];
    this.entities.hazards = [];
    this.entities.effects = [];
    this.entities.particles = [];
    this.entities.corpses = [];
    this.entities.destructibles = [];
    this.groupMemory.clear();
    this.worldEvent = null;
    this.encounter = { activeRoomId: null, activeGroupId: null, state: 'exploration', remaining: 0, total: 0, roomStreak: 0, announcedRoomId: null, clearedAt: 0 };
    const resolvedCovenant = this.covenantSystem.resolve(this.player.covenant);
    const worldModifiers = this.getBlackRoadWorldModifiers(expedition.zoneId);
    const routeContext = this.endgameContextSystem.buildBlackRoadContext({
      covenant: { primary: resolvedCovenant.primary, stage: resolvedCovenant.stage, rewardTags: resolvedCovenant.effects?.rewardTags ?? [] },
      worldModifiers,
      eclipseAllocated: this._reforged()?.eclipse?.allocated ?? {},
      zoneId: expedition.zoneId,
      expeditionId: expedition.id
    });
    this.endgame = {
      id: uid('black-road'),
      activity: 'black-road',
      name: expedition.name,
      expeditionId: expedition.id,
      zoneId: expedition.zoneId,
      tier,
      modifier: { id: 'sealed-rooms', name: 'Sealed rooms', text: 'Only the active encounter exists and its boundary remains closed until the objective is complete.' },
      modifiers: [{ id: 'sealed-rooms', name: 'Sealed rooms', text: 'Only the active encounter exists and its boundary remains closed until the objective is complete.' }],
      kills: 0,
      completed: false,
      elapsed: 0,
      waveIndex: 0,
      wavePlan: expedition.stages.map((stage) => ({ ...stage, formation: [...(stage.formation ?? [])] })),
      expedition: true,
      blackRoad: true,
      expeditionBoons: [],
      expeditionBanes: [],
      pendingRoute: null,
      routeCheckpoints: [],
      activeStage: null,
      activeStageTotal: 0,
      stageClearedAt: 0,
      completedStageIds: [],
      worldModifiers,
      routeContext,
      bossCovenantVariant: routeContext.bossVariantAffinity,
      rewardHeat: routeContext.eclipseControls.rewardHeat ?? 0
    };
    const targetId = routeContext.eclipseControls.targetFarm ? this.player.lootTarget : null;
    if (targetId && this._eligibleUniques(expedition.zoneId, 'unique', { targetFarm: true, preferredIds: [targetId] }).some((unique) => unique.id === targetId)) this.endgame.targetRewardId = targetId;
    const first = expedition.stages[0];
    this.player.x = first.x - Math.min(135, first.radius * 0.48);
    this.player.y = first.y + Math.min(42, first.radius * 0.16);
    this._moveBodyWithGeometry(this.player, this.player.x, this.player.y);
    this.player.hp = this.player.maxHp;
    this.player.resource = this.player.maxResource;
    this.player.potions = this.player.maxPotions;
    this.player.moveCommand = null;
    this.player.combatTargetId = null;
    this._spawnEndgameWave();
    this.notify(`${expedition.name} opened · four sealed rooms · ${DIFFICULTY_PROFILES[difficulty].name}.`, 'warning');
    this.emit('endgame-started', this.endgame);
    this.emit('requiem-updated', this.getRequiemOverview());
    this._focusCamera(true);
    this.save();
    return true;
  }

  setRequiemDifficulty(id) {
    if (!this.player || !DIFFICULTY_PROFILES[id]) return false;
    this.player.requiem ??= createRequiemState();
    this.player.requiem.difficulty = id;
    this.notify(`${DIFFICULTY_PROFILES[id].name} road selected. New encounters use this balance.`, 'accent');
    this.emit('requiem-updated', this.getRequiemOverview());
    this.save();
    return true;
  }

  _recordTutorial(event, amount = 1) {
    const state = this.player?.requiem;
    const step = activeTutorialStep(state);
    if (!state || !step || step.event !== event) return false;
    state.tutorial.progress = Math.min(step.target, state.tutorial.progress + Math.max(0, amount));
    if (state.tutorial.progress < step.target) {
      this.emit('requiem-updated', this.getRequiemOverview());
      return true;
    }
    state.tutorial.step += 1;
    state.tutorial.progress = 0;
    const next = activeTutorialStep(state);
    if (!next) {
      state.tutorial.complete = true;
      this.notify('Roadcraft complete. Every system now answers your covenant.', 'accent');
      this._gainXp(120);
      this.player.gold += 80;
    } else this.notify(`${step.title} complete · ${next.title}`, 'quiet');
    this.emit('requiem-updated', this.getRequiemOverview());
    this.save();
    return true;
  }

  _gainClassMechanic(action, amount = null) {
    const state = this.player?.requiem;
    const definition = CLASS_MECHANICS[this.player?.primary];
    if (!state || !definition || state.classMechanic.ready) return false;
    const gain = amount ?? definition.gain[action] ?? 0;
    if (gain <= 0) return false;
    const alternating = state.classMechanic.lastAction && state.classMechanic.lastAction !== action ? 1.18 : 1;
    state.classMechanic.lastAction = action;
    state.classMechanic.value = clamp(state.classMechanic.value + gain * alternating, 0, 100);
    if (state.classMechanic.value >= 100) {
      state.classMechanic.value = 100;
      state.classMechanic.ready = true;
      this.notify(`${definition.name} is ready.`, 'accent');
      this._pushEffect({ kind: 'convergence', x: this.player.x, y: this.player.y, life: 0.72, maxLife: 0.72, color: definition.color });
    }
    this.emit('requiem-updated', this.getRequiemOverview());
    return true;
  }

  _consumeClassMechanic(trigger) {
    const state = this.player?.requiem;
    const definition = CLASS_MECHANICS[this.player?.primary];
    if (!state?.classMechanic?.ready || !definition) return false;
    const finisherClasses = new Set(['warden', 'ironbound', 'veilrunner', 'dawnstrider']);
    const valid = trigger === 'finisher' ? finisherClasses.has(this.player.primary) : trigger === 'skillOne' ? !finisherClasses.has(this.player.primary) : false;
    if (!valid) return false;
    state.classMechanic.value = 0;
    state.classMechanic.ready = false;
    state.classMechanic.lastAction = null;
    const stats = this.getStats();
    const color = definition.color;
    if (this.player.primary === 'warden') {
      this.entities.enemies.filter((enemy) => !enemy.dead && distance(enemy, this.player) < 145).forEach((enemy) => { enemy.marked = Math.max(enemy.marked, 5.5); });
      this.player.barrier += stats.hp * 0.1 * stats.ward;
      this.player.barrierTime = Math.max(this.player.barrierTime, 3.5);
    } else if (this.player.primary === 'ironbound') {
      this._damageArc(this.player, 145, 2.25, stats.power * 0.92, { source: 'resolve-counter', stagger: 2.2, armorPierce: 0.65, color });
    } else if (this.player.primary === 'veilrunner') {
      const target = this._combatTarget();
      if (target && distance(target, this.player) < 155) {
        this._moveBodyWithGeometry(this.player,
          clamp(target.x + Math.cos(this.player.facing) * 42, 35, WORLD_SIZE.width - 35),
          clamp(target.y + Math.sin(this.player.facing) * 42, 35, WORLD_SIZE.height - 35));
      }
      this.player.iframes = Math.max(this.player.iframes, 0.32);
    } else if (this.player.primary === 'dawnstrider') {
      this._createHazard({ owner: 'player', kind: 'radiant-verdict', x: this.player.x, y: this.player.y, radius: 124, life: 2.6, tick: 0.42, damage: stats.power * 0.46, heal: 2.4, color, mark: 3.2 });
      this.player.hp = clamp(this.player.hp + this.player.maxHp * 0.08, 0, this.player.maxHp);
    } else if (this.player.primary === 'thornseer') {
      this.entities.enemies.filter((enemy) => !enemy.dead && enemy.cursed > 0 && distance(enemy, this.player) < 520).slice(0, 8).forEach((enemy) => {
        this._createHazard({ owner: 'player', kind: 'blight-eruption', x: enemy.x, y: enemy.y, radius: 72, life: 0.66, tick: 0.24, damage: stats.power * 0.7, color, mark: 2.8, noFatedProc: true });
      });
    } else if (this.player.primary === 'gravebinder') {
      const targets = this.entities.enemies.filter((enemy) => !enemy.dead).sort((a, b) => distance(a, this.player) - distance(b, this.player)).slice(0, 4);
      targets.forEach((enemy, index) => this._createProjectile({ owner: 'player', kind: 'funerary-procession', x: this.player.x, y: this.player.y, angle: angleTo(this.player, enemy), speed: 570 + index * 28, radius: 10, life: 1.05, damage: stats.power * 0.74, pierce: 1, color, mark: 3, homing: 0.2 }));
    }
    this._emitBurst(this.player.x, this.player.y, color, 20, 180);
    this.emit('requiem-updated', this.getRequiemOverview());
    return true;
  }

  getCampaign() {
    return this.player?.campaign ?? null;
  }

  getCampaignJournal() {
    const state = this.getCampaign();
    if (!state) return null;
    const chapter = getCampaignChapter(state.chapterId);
    const stage = getCampaignStage(state);
    return {
      chapter,
      stage,
      progress: state.progress,
      completed: state.completed === true,
      chapters: CAMPAIGN_CHAPTERS.map((entry) => ({
        ...entry,
        active: entry.id === chapter.id,
        discovered: state.discovered?.includes(entry.id) ?? false,
        completed: chapterIsComplete(state, entry.id)
      }))
    };
  }

  _isCampaignStage(stageId) {
    return this.player?.campaign?.stageId === stageId;
  }

  _campaignComplete() {
    return this._hasCompletedChapter('chapter-one');
  }

  _hasCompletedChapter(chapterId) {
    return chapterIsComplete(this.getCampaign(), chapterId);
  }

  _isCampaignChapter(chapterId) {
    return this.player?.campaign?.chapterId === chapterId;
  }

  _setCampaignObjective() {
    const state = this.getCampaign();
    const stage = getCampaignStage(state);
    if (!stage) return;
    this._setObjective(stage.title, stage.detail, Math.min(stage.total, state.progress), stage.total);
    this.emit('campaign-updated', this.getCampaignJournal());
  }

  _setCampaignStage(stageId, progress = 0, chapterId = this.getCampaign()?.chapterId) {
    const state = this.getCampaign();
    const chapter = getCampaignChapter(chapterId);
    const stage = chapter.stages?.find((entry) => entry.id === stageId);
    if (!state || !stage) return false;
    const previousStageId = state.stageId;
    state.chapterId = chapter.id;
    state.stageId = stage.id;
    state.progress = Math.max(0, Math.min(stage.total, Math.floor(Number(progress) || 0)));
    if (!state.discovered.includes(chapter.id)) state.discovered.push(chapter.id);
    state.completed = stage.id === chapter.stages?.at(-1)?.id;
    if (previousStageId !== stage.id) {
      const chapterNumber = Math.max(1, CAMPAIGN_CHAPTERS.findIndex((entry) => entry.id === chapter.id) + 1);
      this._gainXp(65 + chapterNumber * 35 + Math.max(0, chapter.stages.findIndex((entry) => entry.id === stage.id)) * 12);
      this._recordLevelingProgress('campaign', 1, { chapterId: chapter.id, stageId: stage.id });
    }
    this._setCampaignObjective();
    this.save();
    return true;
  }

  _beginChapterTwo() {
    const state = this.getCampaign();
    if (!state || !this._hasCompletedChapter('chapter-one')) return false;
    if (this._isCampaignChapter('chapter-two')) return true;
    state.flags = { ...(state.flags ?? {}), choirSeals: [], choirVerdict: null, abbotSummons: 0, chapterTwoRewardClaimed: false };
    this._setCampaignStage('maelin-bellscar-briefing', 0, 'chapter-two');
    this._queueCampaignDialogue('chapter-two-opening');
    return true;
  }

  _beginNextChapter() {
    const state = this.getCampaign();
    if (!state) return false;
    const currentIndex = CAMPAIGN_CHAPTERS.findIndex((chapter) => chapter.id === state.chapterId);
    const next = CAMPAIGN_CHAPTERS[currentIndex + 1];
    if (!next || !chapterIsComplete(state, state.chapterId)) return false;
    if (next.id === 'chapter-two') return this._beginChapterTwo();
    const act = EXPANSION_ACTS[next.id];
    if (!act) return false;
    state.flags.chapterNodes ??= {};
    state.flags.chapterRewards ??= {};
    state.flags.chapterNodes[next.id] = [];
    state.flags.chapterRewards[next.id] = false;
    this._setCampaignStage(act.firstStage, 0, next.id);
    this._queueCampaignDialogue(act.openingDialogue);
    return true;
  }

  _activeExpansionAct() {
    return EXPANSION_ACTS[this.getCampaign()?.chapterId] ?? null;
  }

  _expansionNodes(chapterId = this.getCampaign()?.chapterId) {
    const act = EXPANSION_ACTS[chapterId];
    const nodes = this.getCampaign()?.flags?.chapterNodes?.[chapterId];
    return act && Array.isArray(nodes) ? nodes.filter((id) => act.nodeIds.includes(id)) : [];
  }

  _hasClearedExpansionNode(nodeId) {
    return this._expansionNodes().includes(nodeId);
  }

  _choirSealCount() {
    const seals = this.getCampaign()?.flags?.choirSeals;
    return Array.isArray(seals) ? seals.length : 0;
  }

  _hasBrokenChoirSeal(sealId) {
    return this.getCampaign()?.flags?.choirSeals?.includes(sealId) === true;
  }

  getChoirVerdict() {
    const verdict = this.getCampaign()?.flags?.choirVerdict;
    return CHOIR_VERDICTS.includes(verdict) ? verdict : null;
  }

  isCampaignLandmarkAvailable(landmarkId) {
    const state = this.getCampaign();
    if (!state) return false;
    if (landmarkId === 'maelin' || landmarkId === 'gravewake-waystone') return true;
    if (landmarkId === 'bell-gate') return this._isCampaignChapter('chapter-two') && state.stageId !== 'maelin-bellscar-briefing';
    if (CHOIR_SEALS.includes(landmarkId)) return this._isCampaignChapter('chapter-two') && !['maelin-bellscar-briefing', 'enter-bellscar'].includes(state.stageId);
    if (landmarkId === 'reliquary-names') return this._isCampaignChapter('chapter-two') && ['choose-the-toll', 'defeat-tolling-abbot', 'return-maelin-two', 'chapter-two-complete'].includes(state.stageId);
    if (landmarkId === 'abbot-vault') return this._isCampaignChapter('chapter-two') && ['defeat-tolling-abbot', 'return-maelin-two', 'chapter-two-complete'].includes(state.stageId);
    const landmark = LANDMARKS.find((entry) => entry.id === landmarkId);
    const act = landmark?.chapterId ? EXPANSION_ACTS[landmark.chapterId] : null;
    if (act) {
      if (state.chapterId !== landmark.chapterId) return chapterIsComplete(state, landmark.chapterId);
      if (landmark.nodeType === 'gate') return state.stageId !== act.firstStage;
      if (landmark.nodeType === 'node') return ![act.firstStage, act.enterStage].includes(state.stageId);
      if (landmark.nodeType === 'boss') return [act.bossStage, act.returnStage, act.completeStage].includes(state.stageId);
    }
    return true;
  }

  isCampaignLandmarkTarget(landmarkId) {
    if (landmarkId === 'maelin') {
      const act = this._activeExpansionAct();
      return this._isCampaignStage('meet-maelin')
        || this._isCampaignStage('chapter-one-complete')
        || this._isCampaignStage('maelin-bellscar-briefing')
        || this._isCampaignStage('return-maelin')
        || this._isCampaignStage('return-maelin-two')
        || Boolean(act && [act.firstStage, act.returnStage, act.completeStage].includes(this.getCampaign()?.stageId));
    }
    if (landmarkId === 'gravewake-waystone') return this._isCampaignStage('reach-waystone');
    if (landmarkId === 'bell-gate') return this._isCampaignStage('enter-bellscar');
    if (CHOIR_SEALS.includes(landmarkId)) return this._isCampaignStage('break-choir-seals') && !this._hasBrokenChoirSeal(landmarkId);
    if (landmarkId === 'reliquary-names') return this._isCampaignStage('choose-the-toll');
    if (landmarkId === 'abbot-vault') return this._isCampaignStage('defeat-tolling-abbot');
    const landmark = LANDMARKS.find((entry) => entry.id === landmarkId);
    const act = landmark?.chapterId ? EXPANSION_ACTS[landmark.chapterId] : null;
    if (act && this._isCampaignChapter(landmark.chapterId)) {
      if (landmark.nodeType === 'gate') return this._isCampaignStage(act.enterStage);
      if (landmark.nodeType === 'node') return this._isCampaignStage(act.nodeStage) && !this._hasClearedExpansionNode(landmarkId);
      if (landmark.nodeType === 'boss') return this._isCampaignStage(act.bossStage);
    }
    return false;
  }

  chooseChoirVerdict(verdict) {
    const state = this.getCampaign();
    if (!state || !CHOIR_VERDICTS.includes(verdict) || !this._isCampaignStage('choose-the-toll')) return false;
    state.flags.choirVerdict = verdict;
    state.progress = 1;
    const name = verdict === 'bind-choir' ? 'Vigil of the Bound Choir' : 'Last Peal of Bellscar';
    this._setCampaignStage('defeat-tolling-abbot');
    this._queueCampaignDialogue('abbot-arrives');
    this._spawnCampaignTollingAbbot();
    this.notify(`${name} answers your covenant. The bell vault opens.`, 'accent');
    this._refreshPlayerStats(true);
    return true;
  }

  _queueCampaignDialogue(id) {
    const dialogue = CAMPAIGN_DIALOGUES[id];
    const state = this.getCampaign();
    if (!dialogue || !state) return false;
    state.dialogueSeen[id] = true;
    this.pendingCampaignDialogue = id;
    this.emit('campaign-dialogue', { id, dialogue, journal: this.getCampaignJournal() });
    return true;
  }

  acknowledgeCampaignDialogue(id = this.pendingCampaignDialogue) {
    if (!id || this.pendingCampaignDialogue !== id) return false;
    this.pendingCampaignDialogue = null;
    this.save();
    if (id === 'reliquary-awakens' && this._isCampaignStage('choose-the-toll')) this.emit('overlay', { panel: 'campaign-choice' });
    return true;
  }

  getImprint(slot) {
    if (!this.player || !slot) return null;
    const id = this.player.skillImprints?.[slot];
    return SKILL_IMPRINTS[slot]?.find((entry) => entry.id === id) ?? null;
  }

  getImprintOptions() {
    const titles = { skillOne: 'First skill', skillTwo: 'Second skill', hybrid: 'Hybrid signature', ultimate: 'Hybrid ultimate' };
    return Object.entries(SKILL_IMPRINTS).map(([slot, options]) => ({ slot, title: titles[slot] ?? slot, selected: this.getImprint(slot)?.id ?? null, options }));
  }

  getMastery(slot) {
    const track = getMasteryTrack(slot);
    if (!track || !this.player) return null;
    const entry = this.player.abilityMastery?.[slot] ?? { xp: 0, rank: 0 };
    const rank = masteryRankFor(track, entry.xp, this.player.level);
    const next = nextMasteryThreshold(track, rank);
    return {
      ...track,
      xp: entry.xp,
      rank,
      maxRank: track.thresholds.length - 1,
      nextXp: rank >= track.thresholds.length - 1 ? track.thresholds[rank] : next,
      unlockLevel: track.unlockLevels[Math.min(track.unlockLevels.length - 1, rank + 1)] ?? this.player.level,
      doctrine: this.getMasteryDoctrine(slot)
    };
  }

  getMasteryOptions() {
    return MASTERY_ORDER.map((slot) => {
      const mastery = this.getMastery(slot);
      return {
        ...mastery,
        doctrineOptions: MASTERY_DOCTRINES[slot] ?? [],
        selectedDoctrine: this.player?.masteryDoctrines?.[slot] ?? null,
        doctrineUnlocked: (mastery?.rank ?? 0) >= 3
      };
    });
  }

  getMasteryDoctrine(slot) {
    return getMasteryDoctrine(slot, this.player?.masteryDoctrines?.[slot]);
  }

  selectMasteryDoctrine(slot, doctrineId) {
    const player = this.player;
    const mastery = this.getMastery(slot);
    const doctrine = getMasteryDoctrine(slot, doctrineId);
    if (!player || !mastery || !doctrine) return false;
    if (mastery.rank < 3) {
      this.notify(`${mastery.name} reaches a doctrine choice at rank III.`, 'warning');
      return false;
    }
    if (player.masteryDoctrines?.[slot] === doctrine.id) {
      delete player.masteryDoctrines[slot];
      this.notify(`${doctrine.name} set aside.`, 'quiet');
    } else {
      player.masteryDoctrines[slot] = doctrine.id;
      this.notify(`${doctrine.name} committed to ${mastery.name}.`, 'accent');
    }
    this.save();
    return true;
  }

  getRelicBond(item) {
    if (!item) return null;
    const xp = integer(item.bondXp, 0, 0, 100_000);
    const rank = relicBondRankFor(xp);
    return {
      xp,
      rank,
      maxRank: 3,
      nextXp: rank >= 3 ? xp : nextRelicBondThreshold(rank),
      awakening: rank >= 3 ? RELIC_AWAKENINGS[item.slot] ?? null : null
    };
  }

  _reconcileMasteryRanks(announce = false) {
    const player = this.player;
    if (!player) return;
    MASTERY_ORDER.forEach((slot) => {
      const track = getMasteryTrack(slot);
      const entry = player.abilityMastery?.[slot];
      if (!track || !entry) return;
      const previous = integer(entry.rank, 0, 0, track.thresholds.length - 1);
      const next = masteryRankFor(track, entry.xp, player.level);
      entry.rank = next;
      if (announce && next > previous) this._announceMasteryRank(slot, next);
    });
  }

  _announceMasteryRank(slot, rank) {
    const mastery = this.getMastery(slot);
    if (!mastery) return;
    const doctrine = rank === 3 ? ' A doctrine can now be chosen.' : '';
    this.notify(`${mastery.name} reaches rank ${rank}.${doctrine}`, 'accent');
    this.emit('mastery-rank', { slot, rank, mastery });
    this._pushEffect({ kind: 'mastery-rank', x: this.player.x, y: this.player.y, life: 0.9, maxLife: 0.9, color: this.getHybrid()?.color ?? '#f3d27f' });
    this._emitBurst(this.player.x, this.player.y, this.getHybrid()?.color ?? '#f3d27f', 18, 170);
  }

  _isCombatContext() {
    return Boolean(this.player) && this.entities.enemies.some((enemy) => !enemy.dead && distance(enemy, this.player) < 720);
  }

  _grantMastery(slot, amount) {
    const player = this.player;
    const track = getMasteryTrack(slot);
    if (!player || !track || !Number.isFinite(amount) || amount <= 0) return false;
    const entry = player.abilityMastery?.[slot] ?? { xp: 0, rank: 0 };
    player.abilityMastery[slot] = entry;
    const before = masteryRankFor(track, entry.xp, player.level);
    const gain = Math.max(1, Math.round(amount * (this.getStats().masteryGain ?? 1)));
    entry.xp = integer(entry.xp + gain, 0, 0, 100_000);
    const after = masteryRankFor(track, entry.xp, player.level);
    entry.rank = after;
    if (after > before) {
      this._announceMasteryRank(slot, after);
      const evolution = this._reforged()?.mastery?.[slot];
      if (evolution) {
        const gained = Math.max(0, Math.min(5, after) - evolution.earned);
        evolution.earned = Math.min(5, after);
        evolution.points += gained;
        if (gained) this._emitReforgedUpdate();
      }
    }
    return true;
  }

  _buildResonance(slot) {
    const player = this.player;
    if (!player) return;
    const family = ['attack', 'skillOne', 'skillTwo'].includes(slot) ? 'primary' : slot;
    const base = family === 'primary' ? 8 : family === 'companion' ? 16 : family === 'hybrid' ? 22 : 30;
    const varied = player.lastResonanceFamily && player.lastResonanceFamily !== family;
    const gain = base * (varied ? 1.55 : player.lastResonanceFamily ? 0.62 : 1) * (this.getStats().resonanceGain ?? 1);
    player.lastResonanceFamily = family;
    if (player.confluence >= 3) {
      player.resonance = Math.min(99.99, player.resonance + gain * 0.35);
      return;
    }
    player.resonance += gain;
    while (player.resonance >= 100 && player.confluence < 3) {
      player.resonance -= 100;
      player.confluence += 1;
      this._triggerConfluence();
    }
    player.resonance = clamp(player.resonance, 0, 99.99);
  }

  _recordCombatAction(slot, multiplier = 1) {
    const track = getMasteryTrack(slot);
    if (!track || !this._isCombatContext()) return;
    const nextFamily = ['attack', 'skillOne', 'skillTwo'].includes(slot) ? 'primary' : slot;
    const previousFamily = this.player.lastResonanceFamily;
    this._grantMastery(slot, track.baseGain * multiplier);
    this._buildResonance(slot);
    if (previousFamily && previousFamily !== nextFamily) {
      this.player.status.oathAlternations = (this.player.status.oathAlternations ?? 0) + 1;
      if (this.player.status.oathAlternations >= 3 && (this.player.status.concordantReadyAt ?? 0) <= this.clock) {
        const reaction = COMBAT_REACTIONS.find((entry) => entry.id === 'concordant-echo');
        this.player.status.oathAlternations = 0;
        this.player.status.concordantReadyAt = this.clock + reaction.cooldown;
        this.player.cooldowns.companion = Math.max(0, this.player.cooldowns.companion - 1.2);
        this.player.cooldowns.hybrid = Math.max(0, this.player.cooldowns.hybrid - 1.5);
        this._gainResource(this.player.maxResource * 0.08);
        this._pushEffect({ kind: 'convergence', x: this.player.x, y: this.player.y, life: 0.65, maxLife: 0.65, color: reaction.color });
        this._float(this.player.x, this.player.y - 48, reaction.name.toUpperCase(), reaction.color, 'crit');
        this._recordReforgedProgress('reaction', { reactionId: reaction.id });
      }
    }
    this._recordLevelingProgress('action', 1, { slot });
    this._applyMasteryEvolutionAction(slot);
    this._gainClassMechanic(slot);
    this._recordTutorial(slot === 'skillOne' || slot === 'skillTwo' ? 'skill' : slot);
  }

  _applyMasteryEvolutionAction(slot) {
    const entry = this._reforged()?.mastery?.[slot];
    const path = masteryEvolutionById(slot, entry?.pathId);
    if (!path || entry.rank < path.maxRank) return;
    const special = path.milestone?.special;
    const player = this.player;
    const stats = this.getStats();
    if (special === 'attack-perfect-string' && player.attackChain === 3) {
      this._gainResource(player.maxResource * 0.1);
      player.cooldowns.skillOne = Math.max(0, player.cooldowns.skillOne - 0.45);
      player.cooldowns.skillTwo = Math.max(0, player.cooldowns.skillTwo - 0.45);
    } else if (special === 'attack-faultline' && player.attackChain === 3) {
      this._damageArc(player, 112, 1.8, stats.power * 0.42, { stagger: 2.2, source: 'faultline', color: '#d8b678' });
    } else if (special === 'attack-final-measure') {
      const prey = this.entities.enemies.filter((enemy) => !enemy.dead && distance(enemy, player) < 145 && enemy.hp / enemy.maxHp < 0.28).sort((a, b) => a.hp - b.hp)[0];
      if (prey) prey.knockdown = Math.max(prey.knockdown, 0.55);
    } else if (special === 'skill-one-pierce') {
      this._createProjectile({ owner: 'player', kind: 'mastery-pierce', x: player.x, y: player.y, angle: player.facing, speed: 820, radius: 7, life: 0.86, damage: stats.power * 0.5, pierce: 4, color: '#d9c37c', mark: 2.5 });
    } else if (special === 'skill-one-fork') {
      [-0.28, 0.28].forEach((offset) => this._createProjectile({ owner: 'player', kind: 'mastery-fork', x: player.x, y: player.y, angle: player.facing + offset, speed: 690, radius: 7, life: 0.82, damage: stats.power * 0.38, pierce: 1, color: '#b8d891', mark: 2.2, homing: 0.12 }));
    } else if (special === 'skill-one-sunder') {
      const target = this.entities.enemies.filter((enemy) => !enemy.dead && distance(enemy, player) < 520).sort((a, b) => distance(a, player) - distance(b, player))[0];
      if (target) { target.marked = Math.max(target.marked, 5); target.armor = Math.max(0, target.armor - 8); }
    } else if (special === 'skill-two-sanctuary') {
      player.barrier += player.maxHp * 0.08 * stats.ward;
      player.barrierTime = Math.max(player.barrierTime, 4);
    } else if (special === 'skill-two-devour') {
      this._createHazard({ owner: 'player', kind: 'devouring-field', x: player.x, y: player.y, radius: 115 * stats.area, life: 2.2, tick: 0.35, damage: stats.power * 0.46, color: '#9f78c9', slow: 0.24, mark: 2.5 });
    } else if (special === 'skill-two-renewal') {
      this._gainResource(player.maxResource * 0.14);
      player.cooldowns.dodge = Math.max(0, player.cooldowns.dodge - 0.8);
    } else if (special === 'companion-echo') {
      player.cooldowns.companion = Math.max(0, player.cooldowns.companion - 1.25);
      this._pushEffect({ kind: 'companion-echo', x: player.x, y: player.y, life: 0.5, maxLife: 0.5, color: '#9fbddd' });
    } else if (special === 'companion-guard') {
      player.barrier += player.maxHp * 0.1 * stats.ward;
      player.barrierTime = Math.max(player.barrierTime, 3.2);
    } else if (special === 'companion-sovereign' && player.confluence < 3) {
      player.status.sovereignVoice = (player.status.sovereignVoice ?? 0) + 1;
      if (player.status.sovereignVoice >= 3) { player.status.sovereignVoice = 0; player.confluence += 1; }
    } else if (special === 'signature-cataclysm') {
      this._createHazard({ owner: 'player', kind: 'signature-cataclysm', x: player.x, y: player.y, radius: 145 * stats.area, life: 1.15, tick: 0.28, damage: stats.power * 0.72 * stats.hybridDamage, color: this.getHybrid().color, mark: 3 });
    } else if (special === 'signature-shelter') {
      player.barrier += player.maxHp * 0.16 * stats.ward;
      player.barrierTime = Math.max(player.barrierTime, 5);
    } else if (special === 'signature-reprise') {
      player.cooldowns.companion = Math.max(0, player.cooldowns.companion - 2.2);
    } else if (special === 'ultimate-ruin') {
      const boss = this.getBoss();
      if (boss) this._damageEnemy(boss, stats.power * 1.1 * stats.ultimateDamage, { source: 'final-weapon', stagger: 1.5 });
    } else if (special === 'ultimate-domain') {
      this._createHazard({ owner: 'player', kind: 'world-domain', x: player.x, y: player.y, radius: 185 * stats.area, life: 4, tick: 0.45, damage: stats.power * 0.52 * stats.ultimateDamage, color: this.getHybrid().color, slow: 0.3, mark: 3 });
    } else if (special === 'ultimate-mercy') {
      player.hp = clamp(player.hp + player.maxHp * 0.25, 0, player.maxHp);
      Object.keys(player.cooldowns).filter((id) => id !== 'ultimate').forEach((id) => { player.cooldowns[id] *= 0.55; });
    }
  }

  _triggerConfluence() {
    const player = this.player;
    const hybrid = this.getHybrid();
    if (!player || !hybrid) return;
    this._recordLevelingProgress('confluence', 1, { hybridId: hybrid.id });
    const stats = this.getStats();
    player.status.convergence = 5;
    this._pushEffect({ kind: 'convergence', x: player.x, y: player.y, life: 1.1, maxLife: 1.1, color: hybrid.color });
    switch (hybrid.id) {
      case 'briar-oath':
        this._createHazard({ owner: 'player', kind: 'confluence-briar', x: player.x, y: player.y, radius: 84, life: 2.8, tick: 0.46, damage: stats.power * 0.46, color: hybrid.color, slow: 0.22, mark: 2, thornwall: true });
        player.barrier += stats.hp * 0.06 * stats.ward;
        player.barrierTime = Math.max(player.barrierTime, 2.8);
        break;
      case 'cairn-covenant':
        player.barrier += stats.hp * 0.11 * stats.ward;
        player.barrierTime = Math.max(player.barrierTime, 3.4);
        this._createHazard({ owner: 'player', kind: 'confluence-cairn', x: player.x, y: player.y, radius: 78, life: 2.4, tick: 0.45, damage: stats.power * 0.5, color: hybrid.color, slow: 0.28, knockdown: 0.16 });
        break;
      case 'riftchain':
        [-0.2, 0, 0.2].forEach((offset) => this._createProjectile({ owner: 'player', kind: 'confluence-shade', x: player.x, y: player.y, angle: player.facing + offset, speed: 690, radius: 7, life: 0.75, damage: stats.power * 0.58, pierce: 1, color: hybrid.color, mark: 2.4, homing: 0.12 }));
        player.buffs.push({ id: 'speed', time: 2.5 });
        break;
      case 'blood-bastion':
        player.hp = clamp(player.hp + stats.hp * 0.055, 0, player.maxHp);
        this._createHazard({ owner: 'player', kind: 'confluence-blood', x: player.x, y: player.y, radius: 94, life: 2.6, tick: 0.42, damage: stats.power * 0.5, color: hybrid.color, heal: 3, slow: 0.2 });
        break;
      case 'nightbloom':
        this._createProjectile({ owner: 'player', kind: 'confluence-seed', x: player.x, y: player.y, angle: player.facing, speed: 540, radius: 10, life: 0.95, damage: stats.power * 0.8, pierce: 1, color: hybrid.color, mark: 3, homing: 0.2 });
        break;
      case 'black-rampart':
        this._damageArc(player, 118, Math.PI * 2, stats.power * 0.58, { stagger: 1.25, mark: 2.2, source: 'confluence-rampart', color: hybrid.color });
        player.barrier += stats.hp * 0.075 * stats.ward;
        player.barrierTime = Math.max(player.barrierTime, 2.8);
        break;
      default:
        break;
    }
    if (this._hasReforgedSpecial('hybrid-cataclysm')) {
      this._createHazard({ owner: 'player', kind: 'mutation-cataclysm', x: player.x, y: player.y, radius: 132 * stats.area, life: 1.2, tick: 0.3, damage: stats.power * 0.64 * stats.hybridDamage, color: hybrid.color, mark: 2.8 });
    }
    if (this._hasReforgedSpecial('hybrid-sanctuary')) {
      player.barrier += player.maxHp * 0.18 * stats.ward;
      player.barrierTime = Math.max(player.barrierTime, 5.5);
      player.buffs.push({ id: 'unstoppable', time: 1.8 });
      this._pushEffect({ kind: 'mutation-sanctuary', x: player.x, y: player.y, life: 1, maxLife: 1, color: '#92d8c2' });
    }
    if (this._hasReforgedSpecial('hybrid-reprise')) {
      player.cooldowns.companion = Math.max(0, player.cooldowns.companion - 2.4);
      player.status.repriseReady = 4;
    }
    if (this.hasPower('choir-vigil')) {
      const erased = this.entities.hazards.filter((hazard) => hazard.owner === 'enemy' && distance(hazard, player) < 235);
      erased.forEach((hazard) => { hazard.life = Math.min(hazard.life, 0.18); });
      player.barrier += stats.hp * 0.08 * stats.ward;
      player.barrierTime = Math.max(player.barrierTime, 3.4);
      this._pushEffect({ kind: 'choir-ward', x: player.x, y: player.y, life: 0.88, maxLife: 0.88, color: '#a8e7e0' });
    }
    if (player.confluence < 3 && this._rollFatedProc('confluenceSurge', stats)) {
      player.confluence += 1;
      this._pushEffect({ kind: 'affix-confluence-surge', x: player.x, y: player.y, life: 0.76, maxLife: 0.76, color: '#f3d27f' });
      this._float(player.x, player.y - 48, '+ CONFLUENCE', '#f3d27f', 'crit');
    }
    this.notify(`${hybrid.name} forms a Confluence charge.`, 'accent');
    this.emit('confluence', { hybrid, charges: player.confluence });
  }

  _advanceRelicBonds(enemy) {
    const player = this.player;
    if (!player || !enemy) return;
    const gain = Math.max(1, Math.round((enemy.boss ? 16 : enemy.elite ? 5 : 1) * (this._hasReforgedSpecial('faction-names') ? 1.35 : 1)));
    let awakened = false;
    Object.values(player.equipment).forEach((item) => {
      if (!item) return;
      const before = relicBondRankFor(item.bondXp ?? 0);
      item.bondXp = integer((item.bondXp ?? 0) + gain, 0, 0, 100_000);
      item.bondRank = relicBondRankFor(item.bondXp);
      if (item.bondRank > before) {
        awakened = true;
        const memoriesReady = Math.max(0, item.bondRank - (item.memories?.length ?? 0));
        const awakening = item.bondRank >= 3 ? RELIC_AWAKENINGS[item.slot] : null;
        this.notify(`${item.name} reaches bond ${item.bondRank} — ${memoriesReady} Memory choice${memoriesReady === 1 ? '' : 's'} ready${awakening ? `; ${awakening.name} stirs beneath them` : ''}.`, 'accent');
      }
    });
    if (awakened) {
      this._refreshPlayerStats(true);
      this._emitReforgedUpdate();
    }
  }

  selectImprint(slot, id) {
    const player = this.player;
    const imprint = SKILL_IMPRINTS[slot]?.find((entry) => entry.id === id);
    if (!player || !imprint) return false;
    if (player.level < imprint.level) {
      this.notify(`${imprint.name} unlocks at level ${imprint.level}.`, 'warning');
      return false;
    }
    if (player.skillImprints?.[slot] === id) {
      delete player.skillImprints[slot];
      this.notify(`${imprint.name} unattuned.`, 'quiet');
    } else {
      player.skillImprints[slot] = id;
      this.notify(`${imprint.name} attuned to ${slot === 'skillOne' ? 'Skill One' : slot === 'skillTwo' ? 'Skill Two' : slot === 'hybrid' ? 'your hybrid signature' : 'your hybrid ultimate'}.`, 'accent');
    }
    this.save();
    return true;
  }

  getTalentRank(id) {
    return this.player?.skillRanks?.[id] ?? 0;
  }

  hasUnique(uniqueId) {
    return Boolean(this.player && Object.values(this.player.equipment).some((item) => item?.uniqueId === uniqueId));
  }

  hasPower(uniqueId) {
    // Existing combat hooks historically used unique ids.  Newer data can
    // also name a unique's explicit power, so accept either form.  Keeping
    // this translation here makes extracted Aspects and equipped items behave
    // identically without forcing every combat caller to know the item id.
    const matchingUnique = UNIQUES.find((unique) => unique.power === uniqueId);
    const ids = matchingUnique ? [uniqueId, matchingUnique.id] : [uniqueId];
    const aspects = this.player?.attunedAspects ?? [this.player?.attunedAspect];
    return ids.some((id) => this.hasUnique(id) || aspects.includes(id));
  }

  getCompanionTechnique() {
    const secondary = this.getSecondaryClass();
    if (!secondary) return null;
    const source = secondary.abilities.skillOne;
    return {
      name: `Echo: ${source.name}`,
      icon: source.icon,
      hint: `${secondary.shortName} answers as a companion technique.`,
      cooldown: Math.max(4.5, source.cooldown * 3.1),
      cost: Math.max(12, Math.round((source.cost ?? 18) * 0.72)),
      color: secondary.color
    };
  }

  getAspectLibrary() {
    const player = this.player;
    if (!player) return [];
    return UNIQUES.filter((unique) => this._isUniqueEligible(unique))
      .map((unique) => ({ ...unique, unlocked: player.aspects?.[unique.id] === true, active: (player.attunedAspects ?? []).includes(unique.id) }));
  }

  getInventoryCapacities() {
    return { pack: INVENTORY_CAPACITY, stash: STASH_CAPACITY };
  }

  getAspectSlots() {
    return this.player?.level >= 22 ? 2 : 1;
  }

  getLootCodex() {
    const player = this.player;
    if (!player) return { sources: [], sets: [], target: null, pity: {} };
    const collection = player.lootCollection ?? this._normalizeLootCollection(null);
    return {
      target: player.lootTarget ? uniqueById(player.lootTarget) : null,
      pity: { ...player.lootPity },
      sources: LOOT_SOURCES.map((source) => {
        const entries = source.uniqueIds.map((id) => uniqueById(id)).filter(Boolean).filter((unique) => this._isUniqueEligible(unique));
        return {
          ...source,
          entries: entries.map((unique) => ({ ...unique, found: Boolean(collection.uniques?.[unique.id]), count: collection.uniques?.[unique.id] ?? 0 })),
          found: entries.filter((unique) => collection.uniques?.[unique.id]).length,
          total: entries.length
        };
      }).filter((source) => source.total),
      sets: SET_COLLECTIONS.map((set) => ({
        ...set,
        found: collection.sets?.[set.id] ?? 0,
        active: this.getActiveSetBonuses().filter((bonus) => bonus.setId === set.id)
      }))
    };
  }

  getActiveSetBonuses() {
    const player = this.player;
    if (!player) return [];
    const counts = Object.values(player.equipment).reduce((all, item) => {
      if (item?.setId) all[item.setId] = (all[item.setId] ?? 0) + 1;
      return all;
    }, {});
    return SET_COLLECTIONS.flatMap((set) => (set.bonuses ?? [])
      .filter((bonus) => (counts[set.id] ?? 0) >= bonus.pieces)
      .map((bonus) => ({ ...bonus, setId: set.id, setName: set.name, pieces: counts[set.id] })));
  }

  _isUniqueEligible(unique) {
    const player = this.player;
    if (!player) return false;
    return this.lootSystem.isUniqueEligible(unique, {
      verdict: this.getChoirVerdict(),
      hybridId: this.getHybrid()?.id ?? null,
      primary: player.primary,
      secondary: player.secondary
    });
  }

  getHighestEndgameTier() {
    const records = this.player?.endgameRecords ?? {};
    return Math.max(0, ...Object.values(records).map((record) => integer(record?.bestTier, 0, 0, 50)));
  }

  _masterworkStageForRank(rank) {
    const value = integer(rank, 1, 1, MASTERWORK_MAX_RANK);
    return MASTERWORK_STAGES.find((stage) => value >= stage.ranks[0] && value <= stage.ranks[1]) ?? MASTERWORK_STAGES.at(-1);
  }

  _masterworkCosts(item, nextRank) {
    const stage = this._masterworkStageForRank(nextRank);
    const stageIndex = Math.max(0, MASTERWORK_STAGES.indexOf(stage));
    const rarityScore = Math.max(0, RARITY_SCORE[item?.rarity] ?? 0);
    return {
      cinders: 18 + nextRank * 9 + rarityScore * 6,
      shards: 1 + Math.floor((nextRank - 1) / 3) + (rarityScore >= RARITY_SCORE.unique ? 1 : 0),
      alloys: 1 + stageIndex,
      echoes: nextRank >= 5 ? stageIndex + (rarityScore >= RARITY_SCORE.unique ? 1 : 0) : 0,
      prisms: nextRank >= 9 && (nextRank === 9 || nextRank === 12 || item?.rarity === 'mythic') ? 1 : 0,
      cores: nextRank === MASTERWORK_MAX_RANK ? 1 : 0
    };
  }

  _masterworkEligibility(item, nextRank) {
    if (!this.player || !item) return { ok: false, reason: 'No relic is selected.' };
    if (!['relic', 'unique', 'mythic'].includes(item.rarity)) return { ok: false, reason: 'Only Relics, Uniques, and Mythics can be Masterworked.' };
    if (!this._campaignComplete()) return { ok: false, reason: 'Complete Chapter I to unlock the Covenant Foundry.' };
    const stage = this._masterworkStageForRank(nextRank);
    if (this.player.level < stage.level) return { ok: false, reason: `${stage.name} Masterworking requires level ${stage.level}.` };
    const highestTier = this.getHighestEndgameTier();
    if (highestTier < stage.tier) return { ok: false, reason: stage.tier ? `${stage.name} Masterworking requires an endgame Tier ${stage.tier} clear.` : 'Finish an endgame activity to temper this relic.' };
    return { ok: true, stage, highestTier };
  }

  getMasterworkState(item) {
    const rank = integer(item?.masterwork, 0, 0, MASTERWORK_MAX_RANK);
    const nextRank = Math.min(MASTERWORK_MAX_RANK, rank + 1);
    const stage = rank >= MASTERWORK_MAX_RANK ? MASTERWORK_STAGES.at(-1) : this._masterworkStageForRank(nextRank);
    const focusIndex = integer(item?.masterworkFocus, 0, 0, Math.max(0, (item?.affixes?.length ?? 1) - 1));
    const focus = item?.affixes?.[focusIndex] ?? null;
    const exalts = Array.isArray(item?.masterworkExalts) ? item.masterworkExalts : [];
    const milestone = MASTERWORK_MILESTONES.includes(nextRank);
    const eligibility = rank >= MASTERWORK_MAX_RANK ? { ok: false, reason: 'This relic has reached Apex Masterwork.' } : this._masterworkEligibility(item, nextRank);
    return { rank, nextRank, maxRank: MASTERWORK_MAX_RANK, stage, focusIndex, focus, exalts, milestone, costs: rank >= MASTERWORK_MAX_RANK ? null : this._masterworkCosts(item, nextRank), eligibility, highestTier: this.getHighestEndgameTier() };
  }

  getMasterworkGuide() {
    return {
      highestTier: this.getHighestEndgameTier(),
      stages: MASTERWORK_STAGES.map((stage) => ({ ...stage, unlocked: this.player?.level >= stage.level && this.getHighestEndgameTier() >= stage.tier && (stage.tier > 0 || this._campaignComplete()) }))
    };
  }

  setMasterworkFocus(itemId, index) {
    const item = this._findOwnedItem(itemId)?.item;
    const focus = integer(index, -1, -1, Math.max(-1, (item?.affixes?.length ?? 0) - 1));
    if (!item || focus < 0 || !item.affixes?.[focus]) return false;
    item.masterworkFocus = focus;
    this.notify(`${item.name} now focuses ${item.affixes[focus].label} for its next breakthrough.`, 'quiet');
    this.save();
    return true;
  }

  getZoneProgress(zoneId) {
    return this.player?.worldProgress?.zones?.[zoneId] ?? null;
  }

  getDistrict(x = this.player?.x, y = this.player?.y) {
    return Number.isFinite(x) && Number.isFinite(y) ? districtAt(x, y) : null;
  }

  getWorldAtlas() {
    const progress = this.player?.worldProgress;
    if (!progress) return { districts: [], waypoints: [], lore: [], delves: [] };
    return {
      districts: DISTRICTS.map((district) => ({ ...district, discovered: progress.discoveredDistricts.includes(district.id) })),
      waypoints: LANDMARKS.filter((landmark) => landmark.kind === 'waypoint').map((landmark) => ({ ...landmark, discovered: progress.waypoints.includes(landmark.id) })),
      lore: LANDMARKS.filter((landmark) => landmark.kind === 'lore').map((landmark) => ({ ...landmark, discovered: progress.lore.includes(landmark.id) })),
      delves: this.getDelves()
    };
  }

  getFactionProgress() {
    if (!this.player) return [];
    return FACTIONS.map((faction) => {
      const state = this.player.factions?.[faction.id] ?? { renown: 0, rank: 0 };
      const next = FACTION_RANKS[Math.min(FACTION_RANKS.length - 1, state.rank + 1)] ?? state.renown;
      const floor = FACTION_RANKS[state.rank] ?? 0;
      return {
        ...faction,
        renown: state.renown,
        rank: state.rank,
        maxRank: FACTION_RANKS.length - 1,
        rankProgress: state.rank >= FACTION_RANKS.length - 1 ? 1 : clamp((state.renown - floor) / Math.max(1, next - floor), 0, 1),
        next
      };
    });
  }

  _gainRenown(factionId, amount, announce = true) {
    const faction = factionById(factionId);
    const state = this.player?.factions?.[faction.id];
    if (!state || amount <= 0) return false;
    const previousRank = state.rank;
    state.renown = integer(state.renown + amount, state.renown, 0, 1_000_000);
    state.rank = FACTION_RANKS.reduce((current, threshold, index) => (state.renown >= threshold ? index : current), 0);
    if (state.rank > previousRank) {
      const gained = state.rank - previousRank;
      this.player.gold += 120 * gained + state.rank * 45;
      this.player.materials = this._normalizeMaterials(this.player.materials);
      this.player.materials.shards += 2 * gained;
      if (state.rank >= 2) this.player.materials.alloys += gained;
      if (state.rank >= 4) this.player.materials.echoes += gained;
      if (state.rank >= 5 && this.random() < 0.35) this.player.materials.cores += 1;
      this.notify(`${faction.name} reached Renown ${state.rank}. A faction cache was delivered.`, 'accent');
    } else if (announce) {
      this.notify(`${faction.name} +${Math.round(amount)} renown.`, 'quiet');
    }
    return true;
  }

  getContractSlotLimit() {
    const accordSlot = (this.player?.factions?.['ashen-accord']?.rank ?? 0) >= 4 ? 1 : 0;
    const ledgerRank = this.player?.contracts?.ledgerRank ?? 0;
    const ledgerSlots = (ledgerRank >= 4 ? 1 : 0) + (ledgerRank >= 9 ? 1 : 0);
    return Math.min(5, 3 + accordSlot + ledgerSlots);
  }

  _ensureContractOffers(force = false) {
    const state = this.player?.contracts;
    if (!state) return [];
    if (!force && state.offers.length) return state.offers;
    const level = this.player.level;
    const blueprints = CONTRACTS.filter((entry) => level + 5 >= entry.minLevel);
    const difficulties = unlockedContractDifficulties(level, state.ledgerRank);
    const random = seeded(`${state.boardSeed}:${state.boardCycle}:${level}:${state.ledgerRank}`);
    const targetCount = Math.min(12, Math.max(6, blueprints.length * Math.max(1, difficulties.length)));
    const offers = [];
    const combinations = new Set();
    const addOffer = (blueprint, difficulty, ordinal) => {
      if (!blueprint || !difficulty) return false;
      const key = `${blueprint.id}:${difficulty.id}`;
      if (combinations.has(key)) return false;
      const offer = buildContractOffer({
        blueprintId: blueprint.id,
        difficultyId: difficulty.id,
        seed: Math.floor(random() * 0x7fff_ffff) + ordinal + 1,
        level
      });
      if (!offer) return false;
      combinations.add(key);
      offers.push(offer);
      return true;
    };
    const zoneIds = [...new Set(blueprints.map((entry) => entry.zoneId))];
    zoneIds.forEach((zoneId, index) => {
      const pool = blueprints.filter((entry) => entry.zoneId === zoneId);
      const difficulty = index === 0 ? difficulties.at(-1) : difficulties[Math.floor(Math.pow(random(), 1.55) * difficulties.length)] ?? difficulties[0];
      addOffer(choose(pool, random), difficulty, index);
    });
    let guard = 0;
    while (offers.length < targetCount && guard < 500) {
      guard += 1;
      const blueprint = choose(blueprints, random);
      const difficulty = guard === 1 ? difficulties.at(-1) : difficulties[Math.floor(Math.pow(random(), 1.65) * difficulties.length)] ?? difficulties[0];
      addOffer(blueprint, difficulty, guard + offers.length);
    }
    state.offers = offers;
    return offers;
  }

  _contractStep(entry) {
    return entry?.steps?.[integer(entry.stepIndex, 0, 0, Math.max(0, (entry?.steps?.length ?? 1) - 1))] ?? null;
  }

  _presentContract(entry) {
    if (!entry) return null;
    const step = this._contractStep(entry);
    const bonusDefinition = contractBonusById(entry.bonus?.id);
    return {
      ...entry,
      type: step?.type ?? entry.type,
      target: step?.target ?? entry.target,
      progress: entry.ready ? step?.target ?? entry.target : entry.stepProgress ?? entry.progress ?? 0,
      description: step?.description ?? entry.description,
      currentStep: step,
      stepNumber: Math.min(entry.steps?.length ?? 1, (entry.stepIndex ?? 0) + 1),
      totalSteps: entry.steps?.length ?? 1,
      bonus: entry.bonus ? {
        ...entry.bonus,
        name: bonusDefinition?.name ?? entry.bonus.name,
        description: bonusDefinition?.description ?? entry.bonus.description,
        progress: entry.bonusProgress ?? 0,
        failed: entry.bonusFailed === true,
        complete: entry.bonusComplete === true
      } : null,
      clauseDetails: (entry.clauses ?? []).map((id) => contractClauseById(id)).filter(Boolean)
    };
  }

  getContractRefreshCost() {
    const state = this.player?.contracts;
    if (!state || state.freeRefreshes > 0) return 0;
    const base = 180 + (this.player?.level ?? 1) * 24 + Math.min(900, state.refreshes * 35);
    return Math.round(base * (state.ledgerRank >= 10 ? 0.8 : 1));
  }

  getContractBoard() {
    if (!this.player) return { active: [], available: [], limit: 0, ledger: null, caches: [] };
    const state = this.player.contracts;
    this._ensureContractOffers();
    const activeIds = new Set(state.active.map((entry) => entry.id));
    const activeBlueprints = new Set(state.active.map((entry) => entry.blueprintId));
    const active = state.active.map((entry) => this._presentContract(entry)).filter(Boolean);
    const available = state.offers.filter((offer) => !activeIds.has(offer.id) && !activeBlueprints.has(offer.blueprintId)).map((offer) => ({
      ...this._presentContract(offer),
      completions: state.completed?.[offer.blueprintId] ?? 0
    }));
    const rankDefinition = CONTRACT_LEDGER_RANKS[state.ledgerRank] ?? CONTRACT_LEDGER_RANKS[0];
    const nextDefinition = CONTRACT_LEDGER_RANKS[state.ledgerRank + 1] ?? rankDefinition;
    const floor = rankDefinition.xp;
    const ledger = {
      rank: state.ledgerRank,
      maxRank: CONTRACT_LEDGER_RANKS.at(-1).rank,
      name: rankDefinition.name,
      reward: rankDefinition.reward,
      xp: state.ledgerXp,
      nextXp: nextDefinition.xp,
      progress: state.ledgerRank >= CONTRACT_LEDGER_RANKS.at(-1).rank ? 1 : clamp((state.ledgerXp - floor) / Math.max(1, nextDefinition.xp - floor), 0, 1),
      seals: state.seals,
      streak: state.streak,
      bestStreak: state.bestStreak,
      freeRefreshes: state.freeRefreshes,
      refreshCost: this.getContractRefreshCost(),
      cycle: state.boardCycle,
      history: state.history.slice(),
      difficulties: CONTRACT_DIFFICULTIES.map((difficulty) => ({ ...difficulty, unlocked: this.player.level >= difficulty.minLevel && state.ledgerRank >= difficulty.minRank }))
    };
    const cacheDiscount = state.ledgerRank >= 10 ? 0.8 : 1;
    const caches = CONTRACT_CACHE_OFFERS.map((cache) => ({ ...cache, cost: Math.max(1, Math.round(cache.cost * cacheDiscount)), unlocked: state.ledgerRank >= cache.minRank }));
    return { active, available, limit: this.getContractSlotLimit(), ledger, caches, pinnedId: state.pinnedId };
  }

  getTrackedContract() {
    const state = this.player?.contracts;
    if (!state?.active?.length) return null;
    const entry = state.active.find((contract) => contract.id === state.pinnedId) ?? state.active[0];
    return this._presentContract(entry);
  }

  acceptContract(contractId) {
    const state = this.player?.contracts;
    if (!state) return false;
    this._ensureContractOffers();
    const definition = state.offers.find((entry) => entry.id === contractId) ?? this._legacyContractOffer(contractId);
    if (!definition) return false;
    if (state.active.some((entry) => entry.id === contractId)) return false;
    if (state.active.some((entry) => entry.blueprintId === definition.blueprintId)) {
      this.notify('Only one writ for the same regional order can be active at once.', 'warning');
      return false;
    }
    if (state.active.length >= this.getContractSlotLimit()) {
      this.notify(`Your contract ledger is full (${this.getContractSlotLimit()} active).`, 'warning');
      return false;
    }
    state.active.push({
      ...definition,
      stepIndex: 0,
      stepProgress: 0,
      progress: 0,
      ready: false,
      completedSteps: [],
      bonusProgress: 0,
      bonusFailed: false,
      bonusComplete: false,
      acceptedAt: Math.floor(this.clock)
    });
    state.pinnedId ??= definition.id;
    this.notify(`${definition.name} accepted.`, 'accent');
    this.emit('contracts-updated', this.getContractBoard());
    this.save();
    return true;
  }

  abandonContract(contractId) {
    const state = this.player?.contracts;
    if (!state) return false;
    if (this.endgame?.contractId === contractId && !this.endgame.completed) {
      this.notify('A sealed mission must be left at Sanctuary before its writ can be abandoned.', 'warning');
      return false;
    }
    const before = state.active.length;
    state.active = state.active.filter((entry) => entry.id !== contractId);
    if (state.active.length === before) return false;
    state.streak = 0;
    if (state.pinnedId === contractId) state.pinnedId = state.active[0]?.id ?? null;
    this.notify('Contract returned to the board.', 'quiet');
    this.emit('contracts-updated', this.getContractBoard());
    this.save();
    return true;
  }

  pinContract(contractId) {
    const state = this.player?.contracts;
    if (!state?.active?.some((entry) => entry.id === contractId)) return false;
    state.pinnedId = contractId;
    this.emit('contracts-updated', this.getContractBoard());
    this.save();
    return true;
  }

  refreshContractBoard() {
    const state = this.player?.contracts;
    if (!state) return false;
    const cost = this.getContractRefreshCost();
    if (state.freeRefreshes > 0) state.freeRefreshes -= 1;
    else if (this.player.gold < cost) {
      this.notify(`Turning the board costs ${cost} gold.`, 'warning');
      return false;
    } else this.player.gold -= cost;
    state.boardCycle += 1;
    state.refreshes += 1;
    state.offers = [];
    this._ensureContractOffers(true);
    this.notify(cost ? `The Covenant Board turns for ${cost} gold.` : 'The Covenant Board turns on a free seal.', 'accent');
    this.emit('contracts-updated', this.getContractBoard());
    this.save();
    return true;
  }

  _gainContractLedgerXp(amount) {
    const state = this.player?.contracts;
    if (!state || amount <= 0) return false;
    const previousRank = state.ledgerRank;
    state.ledgerXp = integer(state.ledgerXp + amount, state.ledgerXp, 0, 1_000_000);
    state.ledgerRank = contractLedgerRankForXp(state.ledgerXp);
    if (state.ledgerRank > previousRank) {
      for (let rank = previousRank + 1; rank <= state.ledgerRank; rank += 1) {
        state.seals += 1 + Math.floor(rank / 3);
        if ([2, 7].includes(rank)) state.freeRefreshes = Math.min(9, state.freeRefreshes + 1);
      }
      const definition = CONTRACT_LEDGER_RANKS[state.ledgerRank];
      this.notify(`Contract Ledger ${state.ledgerRank}: ${definition.name}. ${definition.reward} unlocked.`, 'accent');
    }
    return true;
  }

  claimContract(contractId) {
    const state = this.player?.contracts;
    const active = state?.active?.find((entry) => entry.id === contractId);
    if (!state || !active?.ready) return false;
    const blueprint = contractById(active.blueprintId) ?? contractById(active.id);
    if (!blueprint) return false;
    const conditionalBonus = ['noDeath', 'noPotion'].includes(active.bonus?.type) && !active.bonusFailed;
    active.bonusComplete = active.bonusComplete || conditionalBonus || active.bonusProgress >= (active.bonus?.target ?? Infinity);
    const nextStreak = Math.min(999, state.streak + 1);
    const streakMultiplier = 1 + Math.min(0.5, nextStreak * 0.05);
    const bonusMultiplier = active.bonusComplete ? 1.35 : 1;
    const payoutMultiplier = streakMultiplier * bonusMultiplier;
    const gold = Math.round(active.gold * payoutMultiplier);
    const renown = Math.round(active.renown * (active.bonusComplete ? 1.2 : 1));
    const materialAmount = Math.max(1, Math.round(active.materialAmount * bonusMultiplier));
    const seals = active.seals + (active.bonusComplete ? Math.max(1, Math.ceil(active.seals * 0.5)) : 0) + (nextStreak % 5 === 0 ? 1 : 0);
    this.player.gold += gold;
    this.player.materials = this._normalizeMaterials(this.player.materials);
    this.player.materials[active.material] = (this.player.materials[active.material] ?? 0) + materialAmount;
    this._gainRenown(active.factionId, renown, false);
    state.completed[blueprint.id] = Math.min(9999, (state.completed[blueprint.id] ?? 0) + 1);
    state.active = state.active.filter((entry) => entry.id !== contractId);
    state.streak = nextStreak;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    state.seals = Math.min(9999, state.seals + seals);
    if (state.streak % 3 === 0) state.freeRefreshes = Math.min(9, state.freeRefreshes + 1);
    this._gainContractLedgerXp(active.ledgerXp + (active.bonusComplete ? Math.round(active.ledgerXp * 0.3) : 0));
    const reward = this._generateItem({
      sourceId: active.difficultyTier >= 5 ? 'mythic-hunt' : active.rewardSourceId ?? 'contracts',
      minRarity: active.itemRarity ?? 'rare',
      elite: true,
      boss: active.difficultyTier >= 4,
      forceUnique: active.difficultyTier >= 4 || active.bonusComplete && active.difficultyTier >= 3 && this.random() < 0.28
    });
    if (reward) this._awardItem(reward, `${active.name} contract cache`);
    this._gainXp(Math.round((90 + active.steps.reduce((sum, step) => sum + step.target * 6, 0) + renown * 3) * (1 + active.difficultyTier * 0.18)));
    this._recordLevelingProgress('contract', 1, { zoneId: active.zoneId, factionId: active.factionId, contractId: blueprint.id, difficulty: active.difficultyId, bonus: active.bonusComplete });
    state.history.unshift({ id: active.id, name: active.name, difficulty: active.difficulty, zoneId: active.zoneId, bonus: active.bonusComplete, seals });
    state.history = state.history.slice(0, 20);
    if (state.pinnedId === contractId) state.pinnedId = state.active[0]?.id ?? null;
    state.boardCycle += 1;
    state.offers = [];
    this._ensureContractOffers(true);
    this.notify(`${active.name} claimed — ${gold} gold, ${renown} renown, and ${seals} seal${seals === 1 ? '' : 's'}.`, 'accent');
    this.emit('contracts-updated', this.getContractBoard());
    this.save();
    return true;
  }

  purchaseContractCache(cacheId) {
    const state = this.player?.contracts;
    const cache = contractCacheById(cacheId);
    if (!state || !cache || state.ledgerRank < cache.minRank) return false;
    const cost = Math.max(1, Math.round(cache.cost * (state.ledgerRank >= 10 ? 0.8 : 1)));
    if (state.seals < cost) {
      this.notify(`${cache.name} costs ${cost} contract seals.`, 'warning');
      return false;
    }
    const item = this._generateItem({ sourceId: cache.sourceId, minRarity: cache.minRarity, elite: true, boss: cache.forceUnique === true, forceUnique: cache.forceUnique === true });
    if (!item) return false;
    state.seals -= cost;
    this.player.materials = this._normalizeMaterials(this.player.materials);
    this.player.materials.cinders += 4 + Math.floor(cost / 2);
    const location = this._awardItem(item, cache.name);
    const destination = location === 'stash' ? 'the stash' : location === 'inventory' ? 'your pack' : 'the ground beside you';
    this.notify(`${cache.name} opened — ${item.name} secured in ${destination}.`, 'accent');
    this.emit('contracts-updated', this.getContractBoard());
    this.save();
    return true;
  }

  _failContractBonuses(type) {
    const state = this.player?.contracts;
    if (!state) return false;
    let changed = false;
    state.active.forEach((entry) => {
      if (!entry.ready && !entry.bonusFailed && entry.bonus?.type === type) {
        entry.bonusFailed = true;
        changed = true;
      }
    });
    if (changed) this.emit('contracts-updated', this.getContractBoard());
    return changed;
  }

  _progressContracts(type, context = {}) {
    const state = this.player?.contracts;
    if (!state?.active?.length) return;
    let changed = false;
    state.active.forEach((entry) => {
      if (entry.ready) return;
      if (context.contractId && entry.id !== context.contractId) return;
      if (context.zoneId && entry.zoneId !== context.zoneId) return;
      const amount = Math.max(1, integer(context.amount, 1, 1, 100));
      if (!entry.bonusFailed && entry.bonus?.type === type && !['noDeath', 'noPotion'].includes(type)) {
        entry.bonusProgress = Math.min(entry.bonus.target, (entry.bonusProgress ?? 0) + amount);
        entry.bonusComplete = entry.bonusProgress >= entry.bonus.target;
        changed = true;
      }
      const step = this._contractStep(entry);
      if (!step || step.type !== type) return;
      entry.stepProgress = Math.min(step.target, (entry.stepProgress ?? 0) + amount);
      entry.progress = entry.stepProgress;
      changed = true;
      if (entry.stepProgress >= step.target) {
        entry.completedSteps = [...new Set([...(entry.completedSteps ?? []), entry.stepIndex])];
        if (entry.stepIndex < entry.steps.length - 1) {
          entry.stepIndex += 1;
          entry.stepProgress = 0;
          entry.progress = 0;
          const next = this._contractStep(entry);
          this.notify(`${entry.name}: ${next.name} is now active.`, 'quiet');
        } else {
          entry.ready = true;
          if (['noDeath', 'noPotion'].includes(entry.bonus?.type) && !entry.bonusFailed) entry.bonusComplete = true;
          this.notify(`${entry.name} is ready to claim at the Covenant Board.`, 'accent');
        }
      }
    });
    if (changed) this.emit('contracts-updated', this.getContractBoard());
  }

  getContractPressure(zoneId = zoneAt(this.player?.x ?? 0, this.player?.y ?? 0).id) {
    const pressure = { population: 0, density: 0, eliteChance: 0, enemyHp: 0, enemyArmor: 0, enemyDamage: 0, enemySpeed: 0 };
    const active = this.player?.contracts?.active ?? [];
    active.filter((entry) => !entry.ready && entry.zoneId === zoneId).forEach((entry) => {
      (entry.clauses ?? []).map((id) => contractClauseById(id)?.pressure).filter(Boolean).forEach((clause) => {
        Object.keys(pressure).forEach((key) => { pressure[key] = Math.max(pressure[key], Number(clause[key]) || 0); });
      });
    });
    return pressure;
  }

  startContractMission(contractId) {
    const entry = this.player?.contracts?.active?.find((contract) => contract.id === contractId);
    const step = this._contractStep(entry);
    if (!entry || entry.ready || step?.type !== 'operation') {
      this.notify('Complete the current contract steps before breaking its mission seal.', 'warning');
      return false;
    }
    const tier = entry.difficultyId === 'apex' ? 42 : 27;
    return this.startEndgame('contract', tier, {
      contractId: entry.id,
      contractZoneId: entry.zoneId,
      contractName: entry.name,
      contractDifficultyId: entry.difficultyId,
      contractClauses: entry.clauses
    });
  }

  getDelves() {
    if (!this.player) return [];
    return DELVES.map((delve) => {
      const record = this.player.worldProgress?.delves?.[delve.id] ?? { clears: 0, bestTier: 0, fastest: 0 };
      return {
        ...delve,
        ...record,
        unlocked: this._campaignComplete() && this.player.level + 5 >= delve.level
      };
    });
  }

  hasEndgameModifier(id) {
    if (!this.endgame) return false;
    const modifiers = Array.isArray(this.endgame.modifiers) ? this.endgame.modifiers : [this.endgame.modifier].filter(Boolean);
    if (modifiers.some((modifier) => modifier?.id === id)) return true;
    return (this.endgame.expeditionBanes ?? []).some((baneId) => {
      const bane = EXPEDITION_BANES.find((entry) => entry.id === baneId);
      return bane?.id === id || bane?.modifierId === id;
    });
  }

  _enemyHasAffix(enemy, id) {
    if (!enemy || !id) return false;
    return (enemy.affixes ?? [enemy.affix].filter(Boolean)).some((affix) => affix?.id === id);
  }

  _discoverDistrict(district) {
    const progress = this.player?.worldProgress;
    if (!district || !progress || progress.discoveredDistricts.includes(district.id)) return false;
    progress.discoveredDistricts.push(district.id);
    this._gainRenown(district.factionId, district.zoneId === 'sanctuary' ? 2 : 5, false);
    this._gainXp(35 + Math.max(1, district.danger ?? 1) * 6);
    this._recordLevelingProgress('district', 1, { zoneId: district.zoneId, districtId: district.id });
    const region = this._reforged()?.world?.regions?.[district.zoneId];
    if (region && district.zoneId !== 'sanctuary') {
      region.secrets = Math.min(5, region.secrets + 1);
      region.control = Math.min(100, region.control + (this._hasReforgedSpecial('decree-open-road') ? 4 : 2));
      region.threat = Math.max(0, region.threat - (this._hasReforgedSpecial('decree-open-road') ? 5 : 2));
      this._emitReforgedUpdate();
    }
    this.notify(`Discovered ${district.name} · ${progress.discoveredDistricts.length}/${DISTRICTS.length} districts.`, 'quiet');
    this.save();
    return true;
  }

  fastTravel(zoneId) {
    const waypoint = LANDMARKS.find((landmark) => landmark.kind === 'waypoint' && landmark.zoneId === zoneId);
    const progress = this.player?.worldProgress;
    if (!waypoint || !progress?.waypoints.includes(waypoint.id) || this.endgame || this.worldEvent) return false;
    this._moveBodyWithGeometry(this.player, waypoint.x, waypoint.y + 46);
    this.player.hp = Math.max(this.player.hp, this.player.maxHp * 0.7);
    this.player.resource = this.player.maxResource;
    this._focusCamera(true);
    this.notify(`Travelled to ${waypoint.label}.`, 'accent');
    this.save();
    return true;
  }

  _applyProgressionModifierSet(stats, modifiers = {}, multiplier = 1) {
    Object.entries(modifiers).forEach(([stat, rawValue]) => {
      const value = Number(rawValue) * multiplier;
      if (!Number.isFinite(value) || value === 0) return;
      if (stat === 'powerScale') stats.power *= Math.max(0.1, 1 + value);
      else if (stat === 'hpScale') stats.hp *= Math.max(0.1, 1 + value);
      else if (stat === 'armorScale') stats.armor *= Math.max(0.1, 1 + value);
      else if (stat === 'staggerScale') stats.staggerMultiplier *= Math.max(0.1, 1 + value);
      else if (stat === 'dashDamageScale') stats.dashDamage *= Math.max(0.1, 1 + value);
      else if (stat === 'fatedAmplifier') ['echoStrike', 'projectileFork', 'criticalBurst', 'wardPulse', 'dashNova', 'executionCascade', 'confluenceSurge'].forEach((fated) => { stats[fated] += value; });
      else this._applyModifierToStats(stats, stat, value);
    });
  }

  _applyReforgedStats(stats) {
    const state = this._reforged();
    if (!state) return;
    const apply = (modifiers, multiplier = 1) => this._applyProgressionModifierSet(stats, modifiers, multiplier);
    const hybridId = this.getHybrid()?.id;
    (HYBRID_MUTATIONS[hybridId] ?? []).forEach((tier) => {
      const choice = hybridMutationById(hybridId, state.hybridMutations[tier.tier]);
      if (choice) apply(choice.modifiers);
    });
    Object.entries(state.mastery).forEach(([slot, entry]) => {
      const path = masteryEvolutionById(slot, entry.pathId);
      if (!path || !entry.rank) return;
      apply(path.perRank, entry.rank);
    });
    Object.values(this.player.equipment ?? {}).forEach((item) => {
      (item?.memories ?? []).forEach((memoryId) => {
        const memory = relicMemoryById(item.slot, memoryId);
        if (memory) apply(memory.modifiers, this._hasReforgedSpecial('constellation-living-arsenal') ? 1.35 : 1);
      });
    });
    FACTIONS.forEach((faction) => {
      const selected = factionDoctrineById(faction.id, state.factions[faction.id]?.doctrineId);
      if (selected) apply(selected.modifiers, state.pledgedFaction === faction.id ? 1.5 : 1);
    });
    Object.values(state.world.strongholds).forEach((hold) => {
      if (!hold.reclaimed) return;
      const stabilityScale = 0.35 + hold.stability / 100 * 0.65;
      STRONGHOLD_PROJECTS.forEach((project) => {
        const rank = hold.projects[project.id] ?? 0;
        if (rank) apply(project.modifiers, rank * 0.7 * stabilityScale);
      });
    });
    EVENT_ARCS.forEach((arc) => {
      const outcome = arc.endings.find((ending) => ending.id === state.world.arcs[arc.id]?.outcomeId);
      if (outcome) apply(outcome.modifiers);
    });
    activeParagonConstellations(this.player.leveling?.paragonAllocated).forEach((entry) => apply(entry.modifiers));
    ECLIPSE_WEB.filter((node) => state.eclipse.allocated[node.id]).forEach((node) => apply(node.modifiers));
    Object.entries(state.decrees).forEach(([chapterId, decreeId]) => {
      const decree = campaignDecreeById(chapterId, decreeId);
      if (decree) apply(decree.modifiers);
    });
    (this.endgame?.expeditionBoons ?? []).map((id) => EXPEDITION_BOONS.find((boon) => boon.id === id)).filter(Boolean).forEach((boon) => apply(boon.modifiers));
    const currentFamilyRanks = Object.values(state.bestiary).reduce((sum, entry) => sum + entry.rank, 0);
    if (currentFamilyRanks) {
      stats.eliteDamage *= 1 + Math.min(0.12, currentFamilyRanks * 0.003);
      stats.lootFind += Math.min(0.08, currentFamilyRanks * 0.002);
    }
    if ((state.forge.ranks.occult ?? 0) >= 8) {
      const aspects = this.player.attunedAspects?.length ?? 0;
      stats.power *= 1 + aspects * 0.025;
      stats.ward += aspects * 0.025;
    }
  }

  _recordReforgedProgress(type, context = {}) {
    const state = this._reforged();
    if (!state || !type) return false;
    let changed = false;
    if (type === 'kill' && context.role) {
      const family = bestiaryFamilyForRole(context.role);
      const entry = state.bestiary[family.id];
      const before = entry.rank;
      entry.kills += this._hasReforgedSpecial('faction-names') || this._hasReforgedSpecial('relic-archive') ? 2 : 1;
      entry.rank = family.thresholds.reduce((rank, threshold, index) => (entry.kills >= threshold ? index : rank), 0);
      if (entry.rank > before) this.notify(`${family.name} Bestiary rank ${entry.rank}. ${entry.rank === 2 ? 'Choose a permanent research insight.' : 'New countermeasure recorded.'}`, 'accent');
      const zoneId = context.zoneId;
      const region = state.world.regions[zoneId];
      if (region && zoneId !== 'sanctuary') {
        region.momentum = Math.min(100, region.momentum + (context.elite ? 2 : 0.2));
        region.control = Math.min(100, region.control + (context.elite ? 0.35 : 0.06));
      }
      changed = true;
    }
    if (type === 'boss-break' && context.role === 'boss') {
      const entry = state.bestiary.bosses;
      entry.breaks += 1;
      changed = true;
    }
    if (context.factionId && state.factions[context.factionId]) {
      const factionEntry = state.factions[context.factionId];
      const directiveType = type === 'kill' ? 'kill' : type === 'event' || type === 'stronghold' ? 'event' : type === 'operation' || type === 'delve' ? 'operation' : null;
      if (directiveType && !factionEntry.directiveClaims.includes(directiveType)) {
        factionEntry.directiveProgress[directiveType] = Math.min(999, (factionEntry.directiveProgress[directiveType] ?? 0) + 1);
        changed = true;
      }
    }
    if (type === 'event' && context.zoneId) {
      const arc = eventArcByZone(context.zoneId);
      const arcEntry = arc ? state.world.arcs[arc.id] : null;
      if (arcEntry && !arcEntry.outcomeId && !state.world.pendingArcId) {
        arcEntry.progress += 1;
        if (arcEntry.progress >= 1) {
          arcEntry.progress = 0;
          if (arcEntry.stage < arc.stages.length - 1) {
            arcEntry.stage += 1;
            this.notify(`${arc.name}: ${arc.stages[arcEntry.stage][0]} has begun.`, 'accent');
          } else {
            state.world.pendingArcId = arc.id;
            this.notify(`${arc.name} awaits a permanent decision in the World Chronicle.`, 'warning');
          }
        }
      }
      const region = state.world.regions[context.zoneId];
      if (region) {
        region.threat = Math.max(0, region.threat - (context.stronghold ? 18 : 8));
        region.control = Math.min(100, region.control + (context.stronghold ? 12 : 5));
        region.momentum = Math.min(100, region.momentum + 8);
      }
      changed = true;
    }
    if (type === 'event-failed' && context.zoneId) {
      const region = state.world.regions[context.zoneId];
      if (region) {
        region.threat = Math.min(100, region.threat + 10 * this._worldOath().threatGain);
        region.control = Math.max(0, region.control - 5);
        region.momentum = Math.max(-100, region.momentum - 10);
        region.ignoredEvents += 1;
        changed = true;
      }
      const hold = context.strongholdId ? state.world.strongholds[context.strongholdId] : null;
      if (hold?.reclaimed) {
        hold.stability = Math.max(0, hold.stability - 24);
        changed = true;
        if (hold.stability === 0) this.notify('A reclaimed stronghold has fallen dormant. Rebuild its stability through defense.', 'warning');
      }
    }
    if (type === 'death' && context.zoneId) {
      const region = state.world.regions[context.zoneId];
      if (region && context.zoneId !== 'sanctuary') {
        region.threat = Math.min(100, region.threat + 6 * this._worldOath().threatGain);
        region.momentum = Math.max(-100, region.momentum - 12);
        changed = true;
      }
    }
    if (type === 'stronghold' && context.strongholdId) {
      const hold = state.world.strongholds[context.strongholdId];
      if (hold) {
        hold.reclaimed = true;
        hold.stability = Math.min(100, Math.max(60, hold.stability + 20));
        hold.defenses += context.defense ? 1 : 0;
        changed = true;
      }
    }
    if (type === 'operation') {
      const activity = context.activity;
      if (state.eclipse.seals[activity] !== undefined && context.grade && ['S', 'A'].includes(context.grade)) {
        state.eclipse.seals[activity] = Math.min(99, state.eclipse.seals[activity] + 1);
        state.eclipse.escalation = Math.min(100, state.eclipse.escalation + 2 + Math.floor((context.tier ?? 1) / 10));
        const totalSeals = Object.values(state.eclipse.seals).reduce((sum, count) => sum + count, 0);
        const earned = Math.min(30, Math.floor(totalSeals / 2));
        if (earned > state.eclipse.pointsEarned) {
          state.eclipse.points += earned - state.eclipse.pointsEarned;
          state.eclipse.pointsEarned = earned;
          this.notify('An Eclipse Web point awakened.', 'accent');
        }
        if (state.eclipse.escalation >= 25) {
          state.eclipse.escalation -= 25;
          state.eclipse.pinnacleKeys = Math.min(99, state.eclipse.pinnacleKeys + 1);
          this.notify('A Pinnacle Key condensed from the completed operation.', 'accent');
        }
        changed = true;
      }
    }
    if (type === 'reaction' && state.reactions[context.reactionId] !== undefined) {
      state.reactions[context.reactionId] += 1;
      state.reactionTotal += 1;
      changed = true;
    }
    if (changed) this._emitReforgedUpdate();
    return changed;
  }

  _applyProgressionStats(stats) {
    const leveling = this.player?.leveling;
    if (!leveling) return;
    PILLARS.forEach((pillar) => {
      const rank = leveling.pillarRanks[pillar.id] ?? 0;
      if (!rank) return;
      this._applyProgressionModifierSet(stats, pillar.perRank, rank);
      pillar.milestones.filter((milestone) => rank >= milestone.rank).forEach((milestone) => this._applyProgressionModifierSet(stats, milestone.modifiers));
    });
    ASCENSION_TIERS.forEach((tier) => {
      const selected = ascensionChoiceById(tier.level, leveling.ascensions[tier.level]);
      if (selected) this._applyProgressionModifierSet(stats, selected.modifiers);
    });
    LEGACY_PATHS.forEach((path) => {
      const rank = leveling.legacyPaths[path.id] ?? 0;
      if (rank) this._applyProgressionModifierSet(stats, path.perRank, rank);
    });
    if (this.player.level < MAX_LEVEL) return;
    Object.keys(leveling.paragonAllocated).forEach((nodeId) => {
      const node = paragonNodeById(nodeId);
      if (node) this._applyProgressionModifierSet(stats, node.modifiers);
    });
    Object.entries(leveling.paragonSockets).forEach(([nodeId, glyphId]) => {
      if (!leveling.paragonAllocated[nodeId] || paragonNodeById(nodeId)?.type !== 'socket') return;
      const glyph = paragonGlyphById(glyphId);
      const rank = glyph ? leveling.paragonGlyphs[glyph.id] ?? 1 : 0;
      if (!glyph || !rank) return;
      this._applyProgressionModifierSet(stats, glyph.perRank, rank);
      glyph.milestones.filter((milestone) => rank >= milestone.rank).forEach((milestone) => this._applyProgressionModifierSet(stats, milestone.modifiers));
    });
  }

  _hasProgressionSpecial(special) {
    const leveling = this.player?.leveling;
    if (!leveling || !special) return false;
    if (PILLARS.some((pillar) => (leveling.pillarRanks[pillar.id] ?? 0) >= (pillar.milestones.find((milestone) => milestone.special === special)?.rank ?? Infinity))) return true;
    if (ASCENSION_TIERS.some((tier) => ascensionChoiceById(tier.level, leveling.ascensions[tier.level])?.special === special)) return true;
    return this.player.level >= MAX_LEVEL && Object.keys(leveling.paragonAllocated).some((nodeId) => paragonNodeById(nodeId)?.special === special);
  }

  _secondWindCooldown() {
    const cooldowns = [];
    if (this._hasProgressionSpecial('second-wind')) cooldowns.push(120);
    if (this._hasProgressionSpecial('greater-second-wind')) cooldowns.push(75);
    if (this._hasProgressionSpecial('paragon-second-wind')) cooldowns.push(60);
    const aegis = pillarById('aegis');
    if ((this.player?.leveling?.pillarRanks?.aegis ?? 0) >= (aegis?.milestones.find((milestone) => milestone.special === 'second-wind')?.rank ?? Infinity)) cooldowns.push(90);
    return cooldowns.length ? Math.min(...cooldowns) : 0;
  }

  getStats() {
    if (!this.player) return null;
    const player = this.player;
    const base = player.baseStats;
    const levelScale = player.level - 1;
    const stats = {
      hp: base.hp + levelScale * 11,
      power: base.power + levelScale * 2.2,
      armor: base.armor + levelScale * 0.75,
      speed: base.speed + levelScale * 1.5,
      crit: base.crit,
      critMult: base.critMult,
      resource: base.resource + levelScale * 3,
      resourceGain: 1,
      cooldown: 0,
      ward: 1,
      marked: 0,
      potionReduction: 0,
      wardRadius: 1,
      wardBarrier: 1,
      bloomHeal: 0,
      curseDuration: 0,
      curseSlow: 0,
      harpoonPull: 1,
      attackStagger: 1,
      dashDamage: 1,
      staggerMultiplier: 1,
      smokeDuration: 1,
      riftRefund: false,
      cursedKillHeal: 0,
      wardArmor: 0,
      wardDamageReduction: 0,
      bloomPower: 0,
      executionHeal: 0,
      executionBarrier: 0,
      companionPower: 1,
      masteryGain: 1,
      resonanceGain: 1,
      confluenceDamage: 1,
      attackDamage: 1,
      projectileDamage: 1,
      companionDamage: 1,
      hybridDamage: 1,
      ultimateDamage: 1,
      area: 1,
      eliteDamage: 1,
      bossDamage: 1,
      markedDamage: 1,
      executeThreshold: 0,
      lifeOnKill: 0,
      lootFind: 0,
      goldFind: 0,
      echoStrike: 0,
      projectileFork: 0,
      criticalBurst: 0,
      wardPulse: 0,
      dashNova: 0,
      executionCascade: 0,
      soulLeech: 0,
      confluenceSurge: 0,
      reactionPower: 1
    };
    Object.values(player.equipment).forEach((item) => this._applyItemStats(stats, item));
    // Extracted aspects carry their named effect and explicit stat profile even
    // when the source relic is no longer equipped.  The guard avoids counting
    // a currently equipped unique twice.
    (player.attunedAspects ?? []).forEach((uniqueId) => {
      if (this.hasUnique(uniqueId)) return;
      const unique = uniqueById(uniqueId);
      Object.entries(unique?.statBonuses ?? {}).forEach(([stat, value]) => this._applyModifierToStats(stats, stat, value));
    });
    this.getActiveSetBonuses().forEach((bonus) => {
      Object.entries(bonus.stats ?? {}).forEach(([stat, value]) => this._applyModifierToStats(stats, stat, value));
    });
    const rank = (id) => this.getTalentRank(id);
    stats.power *= 1 + rank('warden-edge') * 0.08 + rank('thorn-needle') * 0.08 + rank('grave-edge') * 0.08 + rank('dawn-edge') * 0.08;
    stats.critMult += rank('veil-edge') * 0.07;
    stats.ward += rank('warden-vow') * 0.14 + rank('grave-shroud') * 0.1 + rank('dawn-halo') * 0.14;
    stats.wardRadius += rank('thorn-bloom') * 0.18 + rank('warden-sentinel') * 0.14 + rank('iron-citadel') * 0.1 + rank('grave-ossuary') * 0.12 + rank('dawn-halo') * 0.14;
    stats.wardBarrier += rank('iron-citadel') * 0.1;
    stats.marked += rank('warden-judgment') * 0.1;
    stats.curseDuration += rank('thorn-curse') * 1.2 + rank('grave-marrow') * 0.45;
    stats.curseSlow += rank('thorn-moonroot') * 0.08;
    stats.potionReduction += rank('warden-iron') * 0.25;
    stats.cursedKillHeal += rank('thorn-sap') * 0.06 + rank('grave-siphon') * 0.05;
    stats.lifeOnKill += rank('dawn-mercy') * 0.05;
    stats.armor *= 1 + rank('iron-rampart') * 0.11 + rank('grave-shroud') * 0.12;
    stats.harpoonPull += rank('iron-chain') * 0.2;
    stats.attackStagger += rank('iron-shatter') * 0.35;
    stats.dashDamage += rank('iron-vanguard') * 0.25;
    stats.staggerMultiplier += rank('iron-core') * 0.09;
    stats.bloomHeal += rank('thorn-vitalbloom') * 2 + rank('grave-ossuary') * 1.5 + rank('dawn-chorus') * 1.6;
    stats.smokeDuration += rank('veil-smoke') * 0.14;
    stats.riftRefund = rank('veil-phantom') > 0;
    stats.executionHeal += rank('warden-intercession') * 0.03;
    stats.executionBarrier += rank('warden-intercession') * 0.05;
    stats.wardArmor += rank('warden-keep') * 0.12;
    stats.wardDamageReduction += rank('iron-everwall') * 0.12;
    stats.bloomPower += rank('thorn-heartroot') * 0.14;
    stats.companionPower += (rank('warden-crescent') + rank('thorn-witchfire') + rank('iron-galvanize') + rank('veil-quickdraw') + rank('grave-reaper') + rank('dawn-cinder')) * 0.025;

    if (rank('warden-oathforge')) {
      stats.armor *= 1.18;
      stats.ward += 0.1;
    }
    if (rank('iron-colossus')) {
      stats.hp *= 1.2;
      stats.armor *= 1.2;
    }
    if (rank('veil-phantom')) stats.crit += 0.12;
    if (rank('grave-legion')) {
      stats.power *= 1.18;
      stats.curseDuration += 1.2;
    }
    if (rank('grave-sanctum')) {
      stats.ward += 0.2;
      stats.wardDamageReduction += 0.1;
    }
    if (rank('dawn-ascendant')) {
      stats.power *= 1.12;
      stats.bossDamage *= 1.18;
    }
    if (rank('dawn-shelter')) {
      stats.ward += 0.18;
      stats.wardDamageReduction += 0.1;
    }

    const hybridId = this.getHybrid()?.id;
    if (hybridId) {
      const hybridRanks = player.skillRanks;
      stats.ward += (hybridRanks[`${hybridId}-0`] ?? 0) * 0.16;
      stats.marked += (hybridRanks[`${hybridId}-1`] ?? 0) * 0.1;
      stats.cooldown += (hybridRanks[`${hybridId}-2`] ?? 0) * 0.055;
      stats.power *= 1 + (hybridRanks[`${hybridId}-3`] ?? 0) * 0.12;
      stats.companionPower += (hybridRanks[`${hybridId}-echo`] ?? 0) * 0.12;
      stats.cooldown += (hybridRanks[`${hybridId}-resonance`] ?? 0) * 0.06;
      if (rank(`${hybridId}-aegis`)) stats.ward += 0.22;
      if (rank(`${hybridId}-ruin`)) stats.power *= 1.18;
    }
    this._applyProgressionStats(stats);
    this._applyReforgedStats(stats);
    const choirVerdict = this.getChoirVerdict();
    if (choirVerdict === 'bind-choir') {
      stats.ward += 0.16;
      stats.executionBarrier += 0.08;
      stats.wardDamageReduction += 0.06;
    } else if (choirVerdict === 'sever-choir') {
      stats.power *= 1.08;
      stats.staggerMultiplier += 0.2;
      stats.crit += 0.035;
    }
    if (this.hasPower('last-peal')) stats.staggerMultiplier += 0.4;
    if ((player.uniqueMomentum?.time ?? 0) > 0) { stats.power *= player.uniqueMomentum.damageMultiplier ?? 1.12; stats.speed *= player.uniqueMomentum.speedMultiplier ?? 1.08; }
    stats.crit = clamp(stats.crit, 0, 0.65);
    // Corruption can carry a downside.  Never let a build create an invalid
    // simulation state (negative health, zero resource, or an unusable move speed).
    stats.hp = Math.max(1, stats.hp);
    stats.armor = Math.max(0, stats.armor);
    stats.speed = Math.max(120, stats.speed);
    stats.resource = Math.max(1, stats.resource);
    ['echoStrike', 'projectileFork', 'criticalBurst', 'wardPulse', 'dashNova', 'executionCascade', 'confluenceSurge'].forEach((stat) => {
      stats[stat] = clamp(stats[stat] ?? 0, 0, 0.65);
    });
    stats.soulLeech = clamp(stats.soulLeech ?? 0, 0, 0.35);
    return stats;
  }

  getActiveFatedAffixes() {
    if (!this.player) return [];
    return Object.values(this.player.equipment ?? {}).filter(Boolean).flatMap((item) => (
      (Array.isArray(item.affixes) ? item.affixes : []).map((affix) => {
        const definition = AFFIX_BY_STAT.get(affix?.stat);
        if (definition?.kind !== 'fated') return null;
        return { ...definition, value: affix.value, tier: affix.tier ?? 1, itemId: item.id, itemName: item.name, slot: item.slot };
      }).filter(Boolean)
    ));
  }

  _applyItemStats(stats, item) {
    if (!item) return;
    const bondRank = relicBondRankFor(item.bondXp ?? 0);
    const bondMultiplier = 1 + bondRank * 0.035;
    const masterworkRank = integer(item.masterwork, 0, 0, MASTERWORK_MAX_RANK);
    const masterworkMultiplier = 1 + masterworkRank * 0.045;
    const exalts = Array.isArray(item.masterworkExalts) ? item.masterworkExalts : [];
    if (item.implicit && Number.isFinite(item.implicit.value)) this._applyModifierToStats(stats, item.implicit.stat, item.implicit.value * bondMultiplier);
    (Array.isArray(item.affixes) ? item.affixes : []).forEach((affix, index) => {
      if (!Number.isFinite(affix?.value)) return;
      const exaltCount = exalts.filter((focus) => focus === index).length;
      const exaltMultiplier = 1 + exaltCount * 0.25;
      this._applyModifierToStats(stats, affix.stat, affix.value * bondMultiplier * masterworkMultiplier * exaltMultiplier);
    });
    if (item.rarity === 'unique' || item.rarity === 'mythic') {
      stats.power *= 1.08;
      stats.ward += 0.08;
    }
    const unique = uniqueById(item.uniqueId);
    Object.entries(unique?.statBonuses ?? {}).forEach(([stat, value]) => this._applyModifierToStats(stats, stat, value));
    const qualityMultiplier = { worn: 1, sturdy: 1.025, superior: 1.055, exquisite: 1.09 }[item.quality] ?? 1;
    if (qualityMultiplier > 1) {
      stats.power *= qualityMultiplier;
      stats.armor *= qualityMultiplier;
      stats.hp *= qualityMultiplier;
    }
    const runeIds = Array.isArray(item.runeIds) && item.runeIds.length ? item.runeIds : item.runeId ? [item.runeId] : [];
    runeIds.map((id) => runeById(id)).filter(Boolean).forEach((rune, index) => {
      const empowered = index < integer(item.empoweredRunes, 0, 0, runeIds.length);
      const livingScript = this._reforged()?.forge?.ranks?.runecraft >= 10 ? 1 + bondRank * 0.04 : 1;
      this._applyModifierToStats(stats, rune.stat, rune.value * (empowered ? 1.45 : 1) * livingScript);
      if (item.echoRune && index === 0) this._applyModifierToStats(stats, rune.stat, rune.value * 0.6 * livingScript);
    });
    if (bondRank >= 3) {
      if (item.slot === 'weapon') stats.confluenceDamage += 0.12;
      else if (item.slot === 'head') stats.cooldown += 0.04;
      else if (item.slot === 'chest') stats.ward += 0.1;
      else if (item.slot === 'gloves') stats.crit += 0.04;
      else if (item.slot === 'boots') stats.speed *= 1.05;
      else if (item.slot === 'amulet') stats.resonanceGain += 0.15;
      else if (item.slot === 'ring') stats.masteryGain += 0.15;
      else if (item.slot === 'offhand') stats.companionDamage += 0.12;
    }
  }

  _applyModifierToStats(stats, stat, value) {
    if (!Number.isFinite(value)) return;
    if (stat === 'speed') stats.speed *= Math.max(0.1, 1 + value);
    else if (stat === 'crit' || stat === 'cooldown' || stat === 'resourceGain' || stat === 'executeThreshold' || stat === 'lifeOnKill' || stat === 'lootFind' || stat === 'goldFind' || FATED_AFFIX_STATS.has(stat)) stats[stat] += value;
    else if (stat === 'barrier') stats.ward += value;
    else if (stat === 'stagger') stats.staggerMultiplier *= 1 + value;
    else if (stat === 'area' || stat === 'attackDamage' || stat === 'projectileDamage' || stat === 'companionDamage' || stat === 'hybridDamage' || stat === 'ultimateDamage' || stat === 'eliteDamage' || stat === 'bossDamage' || stat === 'markedDamage' || stat === 'resonanceGain' || stat === 'masteryGain' || stat === 'reactionPower') stats[stat] *= 1 + value;
    else stats[stat] = (stats[stat] ?? 0) + value;
  }

  _refreshPlayerStats(keepRatio = false) {
    const player = this.player;
    const oldHp = player.maxHp || 1;
    const oldResource = player.maxResource || 1;
    const oldPotionCap = player.maxPotions || player.baseStats.potions;
    const stats = this.getStats();
    player.maxHp = Math.round(stats.hp);
    player.maxResource = Math.round(stats.resource);
    player.maxPotions = Math.min(12, player.baseStats.potions + Math.floor(player.level / 10));
    player.hp = keepRatio ? clamp(player.hp / oldHp * player.maxHp, 1, player.maxHp) : clamp(player.hp, 1, player.maxHp);
    player.resource = keepRatio ? clamp(player.resource / oldResource * player.maxResource, 0, player.maxResource) : clamp(player.resource, 0, player.maxResource);
    player.potions = clamp((player.potions ?? oldPotionCap) + Math.max(0, player.maxPotions - oldPotionCap), 0, player.maxPotions);
    const covenantView = this.getCovenantOverview();
    player.covenantPresentation = resolveCovenantPresentationIdentity(covenantView, {});
  }

  _spawnCampaignWorld() {
    // v4 keeps the overworld for travel, campaign landmarks, and discovery.
    // General combat now happens in a single selected Black Road expedition,
    // so the entire map is no longer pre-populated with disconnected packs.
    if (this._isCampaignStage('clear-bell-risen')) this._spawnCampaignBellRisen();
    if (this._isCampaignStage('defeat-bell-witness')) this._spawnCampaignBellWitness();
    if (this._isCampaignChapter('chapter-two') && this._isCampaignStage('break-choir-seals')) this._spawnCampaignChoirSeals();
    if (this._isCampaignChapter('chapter-two') && this._isCampaignStage('defeat-tolling-abbot')) this._spawnCampaignTollingAbbot();
    this._spawnExpansionCampaign();
    this._spawnPresentationDestructibles();
  }

  _spawnAuthoredRegionRooms(zoneId, baseLevel = 1) {
    const roomDefinitions = roomsForZone(zoneId);
    if (!roomDefinitions.length) return 0;
    const zoneProgress = this.getZoneProgress(zoneId);
    const corruptionPressure = Math.floor((zoneProgress?.corruption ?? 0) / 35);
    const journeyPressure = Math.floor((journeyBandForLevel(this.player?.level ?? 1).number - 1) / 4);
    let spawned = 0;
    roomDefinitions.forEach((room) => {
      if (this.entities.enemies.some((enemy) => !enemy.dead && enemy.roomId === room.id)) return;
      const group = `room:${room.id}`;
      const formation = [...room.formation];
      if (journeyPressure >= 1 && room.tier >= 2) formation.push(room.formation.at(-1));
      if (corruptionPressure >= 2 && room.tier >= 3) formation.push(room.formation[1] ?? room.formation[0]);
      formation.forEach((enemyId, index) => {
        const angle = (Math.PI * 2 * index) / Math.max(1, formation.length) - Math.PI / 2;
        const ring = index === 0 ? 20 : 64 + (index % 2) * 48;
        const enemy = this._spawnEnemy(enemyId, room.x + Math.cos(angle) * ring, room.y + Math.sin(angle) * ring * 0.72, {
          level: Math.max(1, baseLevel + room.tier - 1 + corruptionPressure), group,
          elite: index === room.eliteIndex, roomId: room.id, packName: room.name, encounterTier: room.tier
        });
        if (enemy) spawned += 1;
      });
    });
    return spawned;
  }

  _spawnPresentationDestructibles() {
    if ((this.entities.destructibles ?? []).length) return;
    this.entities.destructibles ??= [];
    const kinds = Object.keys(DESTRUCTIBLE_PROFILES);
    ZONES.forEach((zone, zoneIndex) => {
      const count = zone.safe ? 4 : 6;
      for (let index = 0; index < count; index += 1) {
        const kind = kinds[(zoneIndex * 2 + index) % kinds.length];
        const profile = DESTRUCTIBLE_PROFILES[kind];
        const column = index % 3;
        const row = Math.floor(index / 3);
        const edge = index % 2 ? 0.78 : 0.22;
        this.entities.destructibles.push({
          id: uid('destructible'), kind, zoneId: zone.id, profileId: kind,
          x: zone.x + zone.width * (column === 1 ? edge : column === 0 ? 0.13 : 0.87),
          y: zone.y + zone.height * (row ? 0.78 : 0.22) + (column - 1) * 22,
          radius: profile.radius, health: profile.health, maxHealth: profile.health,
          broken: false, life: profile.cleanup, maxLife: profile.cleanup, hitTime: 0, variant: (zoneIndex + index) % 3
        });
      }
    });
  }

  _spawnCampaignBellRisen() {
    const state = this.getCampaign();
    const waypoint = this.entities.landmarks.find((entry) => entry.id === 'gravewake-waystone');
    if (!state || !waypoint || this.entities.enemies.some((enemy) => !enemy.dead && enemy.campaignId === 'chapter-one-bell-risen')) return false;
    const remaining = Math.max(0, 8 - state.progress);
    const formation = ['mireling', 'mireling', 'ashbow', 'cairnguard', 'mireling', 'candlepriest', 'ashbow', 'riftstalker'];
    const group = 'chapter-one-bell-risen';
    formation.slice(0, remaining).forEach((enemyId, index) => {
      const angle = index / Math.max(1, remaining) * Math.PI * 2 - 0.4;
      const radius = 112 + (index % 3) * 28;
      this._spawnEnemy(enemyId, waypoint.x + Math.cos(angle) * radius, waypoint.y + Math.sin(angle) * radius, {
        level: 2, group, campaignId: 'chapter-one-bell-risen', elite: index === remaining - 1
      });
    });
    this._pushEffect({ kind: 'campaign-awaken', x: waypoint.x, y: waypoint.y, life: 1.25, maxLife: 1.25, color: '#e5b777' });
    return true;
  }

  _spawnCampaignBellWitness() {
    const waypoint = this.entities.landmarks.find((entry) => entry.id === 'gravewake-waystone');
    if (!waypoint || this.entities.enemies.some((enemy) => !enemy.dead && enemy.campaignId === 'chapter-one-witness')) return false;
    const witness = this._spawnEnemy('bellwitness', waypoint.x + 205, waypoint.y - 74, {
      level: 3, group: 'chapter-one-witness', campaignId: 'chapter-one-witness', campaignBoss: true, elite: true, targetDrop: true
    });
    if (!witness) return false;
    this._pushEffect({ kind: 'campaign-awaken', x: witness.x, y: witness.y, life: 1.5, maxLife: 1.5, color: witness.color });
    this.camera.flash = Math.max(this.camera.flash, 0.28);
    return true;
  }

  _chapterTwoLandmark(id) {
    return this.entities.landmarks.find((entry) => entry.id === id) ?? null;
  }

  _spawnCampaignChoirSeals() {
    CHOIR_SEALS.forEach((sealId) => this._spawnCampaignChoirSeal(sealId));
  }

  _spawnCampaignChoirSeal(sealId) {
    const state = this.getCampaign();
    if (!state || !CHOIR_SEALS.includes(sealId) || this._hasBrokenChoirSeal(sealId)) return false;
    const landmark = this._chapterTwoLandmark(sealId);
    const campaignId = `chapter-two-seal:${sealId}`;
    if (!landmark || this.entities.enemies.some((enemy) => !enemy.dead && enemy.campaignId === campaignId)) return false;
    const formations = {
      'golden-choir': ['bellknight', 'bellknight', 'gildedcantor', 'ashbow', 'mireling'],
      'ashen-choir': ['ashpenitent', 'cinderbrute', 'candlepriest', 'ashbow', 'ashbow'],
      'hollow-choir': ['hollowchorister', 'riftstalker', 'riftstalker', 'bonevulture', 'mireling']
    };
    const colors = { 'golden-choir': '#e5c672', 'ashen-choir': '#c57d69', 'hollow-choir': '#75d0d1' };
    const formation = formations[sealId] ?? [];
    const group = campaignId;
    formation.forEach((enemyId, index) => {
      const angle = index / Math.max(1, formation.length) * Math.PI * 2 - Math.PI / 2;
      const radius = 72 + (index % 2) * 44;
      this._spawnEnemy(enemyId, landmark.x + Math.cos(angle) * radius, landmark.y + Math.sin(angle) * radius, {
        level: Math.max(6, this.player.level + 2), group, campaignId, elite: index === 0, targetDrop: index === 0
      });
    });
    this._pushEffect({ kind: 'campaign-awaken', x: landmark.x, y: landmark.y, life: 1.25, maxLife: 1.25, color: colors[sealId] });
    return true;
  }

  _spawnCampaignTollingAbbot() {
    const state = this.getCampaign();
    const vault = this._chapterTwoLandmark('abbot-vault');
    if (!state || !vault || !this._isCampaignStage('defeat-tolling-abbot') || this.entities.enemies.some((enemy) => !enemy.dead && enemy.campaignId === 'chapter-two-abbot')) return false;
    const abbot = this._spawnEnemy('tollingabbot', vault.x, vault.y, {
      level: Math.max(12, this.player.level + 4), elite: true, group: 'chapter-two-abbot', campaignId: 'chapter-two-abbot', campaignBoss: true, targetDrop: true
    });
    if (!abbot) return false;
    abbot.choirVerdict = this.getChoirVerdict();
    abbot.name = 'Rath Vell, Tolling Abbot';
    this._pushEffect({ kind: 'campaign-awaken', x: abbot.x, y: abbot.y, life: 1.65, maxLife: 1.65, color: '#e36d5d' });
    this.camera.flash = Math.max(this.camera.flash, 0.36);
    return true;
  }

  _spawnExpansionCampaign() {
    const act = this._activeExpansionAct();
    if (!act) return false;
    if (this._isCampaignStage(act.nodeStage)) act.nodeIds.forEach((nodeId) => this._spawnExpansionNode(nodeId));
    if (this._isCampaignStage(act.bossStage)) this._spawnExpansionBoss();
    return true;
  }

  _spawnExpansionNode(nodeId) {
    const act = this._activeExpansionAct();
    if (!act || !act.nodeIds.includes(nodeId) || this._hasClearedExpansionNode(nodeId)) return false;
    const landmark = this.entities.landmarks.find((entry) => entry.id === nodeId);
    const campaignId = `${this.getCampaign().chapterId}-node:${nodeId}`;
    if (!landmark || this.entities.enemies.some((enemy) => !enemy.dead && enemy.campaignId === campaignId)) return false;
    const formation = act.formations?.[nodeId] ?? choose(encountersForZone(landmark.zoneId), this.random);
    const group = campaignId;
    formation.forEach((enemyId, index) => {
      const angle = index / Math.max(1, formation.length) * Math.PI * 2 - Math.PI / 2;
      const radius = 78 + (index % 2) * 46;
      this._spawnEnemy(enemyId, landmark.x + Math.cos(angle) * radius, landmark.y + Math.sin(angle) * radius, {
        level: Math.max(12, this.player.level + 2), group, campaignId, elite: index === 0, targetDrop: index === 0
      });
    });
    this._pushEffect({ kind: 'campaign-awaken', x: landmark.x, y: landmark.y, life: 1.25, maxLife: 1.25, color: getCampaignChapter(this.getCampaign().chapterId)?.id === 'chapter-three' ? '#cf5d73' : getCampaignChapter(this.getCampaign().chapterId)?.id === 'chapter-four' ? '#afaa92' : '#a383ef' });
    return true;
  }

  _spawnExpansionBoss() {
    const act = this._activeExpansionAct();
    const landmark = this.entities.landmarks.find((entry) => entry.id === act?.bossLandmarkId);
    if (!act || !landmark || !this._isCampaignStage(act.bossStage) || this.entities.enemies.some((enemy) => !enemy.dead && enemy.campaignId === act.bossCampaignId)) return false;
    const boss = this._spawnEnemy(act.bossId, landmark.x, landmark.y, {
      level: Math.max(18, this.player.level + 5), elite: true, group: act.bossCampaignId, campaignId: act.bossCampaignId, campaignBoss: true, targetDrop: true
    });
    if (!boss) return false;
    this._pushEffect({ kind: 'campaign-awaken', x: boss.x, y: boss.y, life: 1.7, maxLife: 1.7, color: boss.color });
    this.camera.flash = Math.max(this.camera.flash, 0.38);
    return true;
  }

  _spawnEncounter(zone, level, elite) {
    const template = choose(encountersForZone(zone.id), this.random);
    const journeyTier = journeyBandForLevel(this.player?.level ?? 1).number;
    const contractPressure = this.getContractPressure(zone.id);
    const oath = this._worldOath();
    const region = this._reforged()?.world?.regions?.[zone.id];
    const formation = [...template];
    if (journeyTier >= 4 && template[0]) formation.push(template[0]);
    if (journeyTier >= 7 && template[1]) formation.push(template[1]);
    if (journeyTier >= 10) formation.push(choose(template, this.random));
    for (let index = 0; index < contractPressure.density && template[index % template.length]; index += 1) formation.push(template[index % template.length]);
    const systemicDensity = oath.density + Math.floor((region?.threat ?? 0) / 34);
    for (let index = 0; index < systemicDensity && template[index % template.length]; index += 1) formation.push(template[index % template.length]);
    const group = uid('pack');
    const bounds = zone.encounter ?? zone;
    const candidates = Array.from({ length: 8 }, () => ({
      x: bounds.x + range(140, Math.max(180, bounds.width - 140), this.random),
      y: bounds.y + range(140, Math.max(180, bounds.height - 140), this.random)
    }));
    const anchor = candidates.sort((a, b) => distance(b, this.player) - distance(a, this.player))[0];
    const stageElite = elite || this.random() < Math.min(0.86, contractPressure.eliteChance + oath.eliteChance + (region?.threat ?? 0) * 0.002 + (journeyTier >= 4 ? Math.min(0.28, 0.05 + journeyTier * 0.02) : 0));
    formation.forEach((enemyId, index) => {
      const angle = (Math.PI * 2 * index) / formation.length + range(-0.2, 0.2, this.random);
      const radius = range(35, 125, this.random);
      this._spawnEnemy(enemyId, anchor.x + Math.cos(angle) * radius, anchor.y + Math.sin(angle) * radius, {
        level: Math.max(1, level + Math.floor(this.random() * 2)), group, elite: stageElite && index === 0
      });
    });
  }

  _updatePopulation(dt) {
    // Intentionally empty in v4. Enemy density is authored per sealed room;
    // defeated packs never repopulate around the player on a timer.
    void dt;
  }

  _spawnEnemy(enemyId, x, y, options = {}) {
    const template = ENEMIES[enemyId];
    if (!template) return null;
    const level = options.level ?? 1;
    const difficulty = options.difficulty ?? (this.endgame?.tier ?? 0);
    const zoneId = zoneAt(x, y).id;
    const oath = this._worldOath();
    const region = this._reforged()?.world?.regions?.[zoneId];
    const threat = zoneId === 'sanctuary' ? 0 : (region?.threat ?? 0) / 100;
    const contractPressure = !this.endgame || this.endgame.contractId ? this.getContractPressure(this.endgame?.contractId ? this.endgame.zoneId : zoneId) : { enemyHp: 0, enemyArmor: 0, enemyDamage: 0, enemySpeed: 0 };
    const multiplier = 1 + (level - 1) * 0.18 + difficulty * 0.19;
    const elite = Boolean(options.elite || (!template.boss && this.random() < Math.min(0.62, oath.eliteChance + threat * 0.12 + (difficulty > 0 ? 0.08 + difficulty * 0.018 : 0))));
    let affix = elite ? choose(ELITE_AFFIXES, this.random) : null;
    const modifierAffix = ['unstoppable', 'splitting', 'sanguine', 'frenzied', 'volatile', 'suppressing', 'mirrored', 'hungry', 'relentless'].find((id) => this.hasEndgameModifier(id));
    if (elite && modifierAffix) affix = ELITE_AFFIXES.find((entry) => entry.id === modifierAffix) ?? affix;
    const affixes = affix ? [affix] : [];
    const affixCount = elite ? Math.max(1, oath.affixCount) : 0;
    while (affixes.length < affixCount) {
      const pool = ELITE_AFFIXES.filter((entry) => !affixes.some((existing) => existing.id === entry.id));
      const candidate = choose(pool, this.random);
      if (!candidate) break;
      affixes.push(candidate);
    }
    const baneDamage = (this.endgame?.expeditionBanes ?? []).reduce((sum, id) => sum + (EXPEDITION_BANES.find((bane) => bane.id === id)?.enemyDamage ?? 0), 0);
    const baneArmor = (this.endgame?.expeditionBanes ?? []).reduce((sum, id) => sum + (EXPEDITION_BANES.find((bane) => bane.id === id)?.armor ?? 0), 0);
    const roadDifficulty = DIFFICULTY_PROFILES[this.player?.requiem?.difficulty] ?? DIFFICULTY_PROFILES.veteran;
    const maxHp = Math.round(template.hp * multiplier * (elite ? 1.72 : 1) * (1 + contractPressure.enemyHp + oath.enemyHp + threat * 0.28) * roadDifficulty.enemyHp);
    const fortified = this.hasEndgameModifier('fortified');
    const speedScale = 1 + contractPressure.enemySpeed + oath.enemySpeed + threat * 0.04;
    const groupId = options.group ?? uid('pack');
    const inheritedEngagement = Boolean(options.engaged || this.endgame || this.entities.enemies.some((candidate) => !candidate.dead && candidate.group === groupId && candidate.engaged));
    const awarenessRadius = template.boss ? 620 : ['ranged', 'healer', 'commander', 'summoner'].includes(template.role) ? 370 : template.role === 'assassin' ? 430 : 310;
    const combatProfile = combatProfileForRole(template.role, template.boss);
    const enemy = {
      ...template, ...combatProfile, id: uid('enemy'), templateId: template.id, x, y, spawnX: x, spawnY: y, level, group: groupId,
      maxHp, hp: maxHp, armor: Math.round((template.armor ?? 0) + level * 0.5 + (elite ? 4 : 0) + contractPressure.enemyArmor + baneArmor + threat * 8),
      doctrineFaction: options.doctrineFaction ?? (affixes.some((entry) => entry.id === 'stormbound') ? 'storm' : doctrineFactionForZone(zoneId)), packDirective: null,
      damage: Math.round(template.damage * (1 + (level - 1) * 0.11 + difficulty * 0.12) * (elite ? 1.18 : 1) * (1 + contractPressure.enemyDamage + oath.enemyDamage + baneDamage + threat * 0.18) * roadDifficulty.enemyDamage),
      speed: template.speed * (elite ? 1.04 : 1) * speedScale, recovery: template.recovery / speedScale, cooldown: range(0.1, template.recovery / speedScale, this.random),
      windupLeft: 0, recoveryLeft: 0, state: 'idle', facing: 0, attackTarget: null, buffTime: 0,
      elevation: 0, groundElevation: 0, verticalVelocity: 0, grounded: true, turnCooldown: 0,
      stagger: 0, staggerMax: maxHp * (template.boss ? 0.22 : 0.27), knockdown: 0, marked: 0, cursed: 0,
      shield: affixes.some((entry) => entry.id === 'shielded') ? maxHp * 0.18 : 0, elite, affix: affixes[0] ?? null, affixes, phase: 1, phaseAnnounced: 1,
      protectedBy: null, summonCount: 0, dead: false, hitFlash: 0, justHit: 0, trail: [], eventId: options.eventId ?? null,
      telegraph: null, scoreValue: template.xp * (elite ? 1.7 : 1) * roadDifficulty.reward, morale: 1, alert: 0, attackCount: 0,
      engaged: inheritedEngagement, lastEngagedAt: inheritedEngagement ? this.clock : -1_000_000_000,
      awarenessRadius, leashRadius: template.boss || options.campaignBoss ? 920 : 690,
      patrolPhase: this.random() * Math.PI * 2, patrolTime: range(1.2, 3.8, this.random),
      nemesisId: options.nemesisId ?? null, targetDrop: options.targetDrop ?? null,
      campaignId: options.campaignId ?? null, campaignBoss: options.campaignBoss === true,
      roomId: ENCOUNTER_ROOM_BY_ID[options.roomId]?.id ?? null,
      packName: typeof options.packName === 'string' ? options.packName.slice(0, 80) : null,
      encounterTier: integer(options.encounterTier, 0, 0, 9),
      bossIntroTime: template.boss && inheritedEngagement ? 2.35 : 0
    };
    enemy.poiseMax = Math.max(combatProfile.poiseMax, Math.round(combatProfile.poiseMax * (1 + (level - 1) * 0.035 + (elite ? 0.18 : 0))));
    enemy.poise = enemy.poiseMax;
    enemy.guardMax = Math.max(0, Math.round(combatProfile.guardMax * (1 + (level - 1) * 0.025 + (elite ? 0.16 : 0))));
    enemy.guard = enemy.guardMax;
    if (fortified) {
      enemy.armor += 5 + Math.floor(difficulty * 0.35);
      if (elite) enemy.shield = Math.max(enemy.shield, enemy.maxHp * 0.2);
    }
    if (enemy.affixes.some((entry) => entry.id === 'oathbound')) enemy.shield = Math.max(enemy.shield, enemy.maxHp * 0.16);
    const spawnPoint = this.worldGeometry?.resolveMove?.(enemy, enemy.x, enemy.y, this);
    if (spawnPoint) { enemy.x = spawnPoint.x; enemy.y = spawnPoint.y; }
    const activeStage = this.endgame?.blackRoad ? this.endgame.activeStage : null;
    if (activeStage?.id) this.worldGeometry?.constrainArena?.(enemy, activeStage.id, enemy.boss ? 32 : 12, activeStage.radius);
    enemy.spawnX = enemy.x; enemy.spawnY = enemy.y;
    this._updateGroundState(enemy);
    this.entities.enemies.push(enemy);
    if (enemy.boss) enemy.bossRuntime = this.bossController.update(enemy, { covenant: this.covenantSystem.resolve(this.player?.covenant ?? defaultCovenantState()), now: this.clock });
    return enemy;
  }

  _setObjective(title, detail, progress = 0, total = 1) {
    this.objective = { title, detail, progress, total };
    this.emit('objective', this.objective);
  }

  update(delta) {
    // Preserve elapsed time on slower machines while retaining the stable
    // 30 Hz upper bound used by collision and combat. The previous clamp
    // silently discarded one third of the simulation at 20 FPS.
    let remaining = finite(delta, 0, 0, 0.1);
    while (remaining > 0.000001) {
      const dt = Math.min(remaining, TICK_LIMIT);
      this._updateStep(dt);
      remaining -= dt;
    }
  }

  _updateStep(dt) {
    this.clock += dt;
    this.input.tick(this.hitStop > 0 ? 0 : dt);
    if (!this.player || this.state !== 'playing') {
      this._updateEffects(dt);
      return;
    }
    const viewport = this.renderer?.viewport;
    if (viewport) this.input.updateWorldPointer(this.camera, { ...viewport, scale: viewport.scale * (this.camera.zoom ?? 1) });
    if (this.hitStop > 0) {
      this.hitStop = Math.max(0, this.hitStop - dt);
      this._updateEffects(dt * 0.42);
      return;
    }
    this.presentation?.updateGameplay?.(dt);
    this._updatePlayer(dt);
    this._updateEnemies(dt);
    this._constrainBlackRoadArena();
    this._updateEncounterDirector();
    this._updateProjectiles(dt);
    this._updateHazards(dt);
    this._updateLoot(dt);
    this._updateEffects(dt);
    this._updatePersistentWorldState(dt);
    this._updateWorldEvent(dt);
    this._updateEndgame(dt);
    this._updatePopulation(dt);
    this._focusCamera(false);
    this.autoSave += dt;
    if (this.autoSave > 18) {
      this.autoSave = 0;
      this.save();
    }
  }

  _updatePlayer(dt) {
    const player = this.player;
    const stats = this.getStats();
    this._applyGravity(player, dt);
    this._updateGroundState(player);
    Object.keys(player.cooldowns).forEach((key) => { player.cooldowns[key] = Math.max(0, player.cooldowns[key] - dt * (1 + stats.cooldown)); });
    if (player.leveling) player.leveling.secondWindCooldown = Math.max(0, (player.leveling.secondWindCooldown ?? 0) - dt);
    player.iframes = Math.max(0, player.iframes - dt);
    const expiringBarrier = player.barrier > 0 && player.barrierTime > 0 && player.barrierTime - dt <= 0;
    const expiredBarrierValue = player.barrier;
    player.barrierTime = Math.max(0, player.barrierTime - dt);
    if (player.barrierTime <= 0) {
      player.barrier = 0;
      if (expiringBarrier && this.getHybrid()?.id === 'graveguard') {
        this._createHazard({ owner: 'player', kind: 'graveguard-pulse', x: player.x, y: player.y, radius: 86, life: 0.8, tick: 0.24, damage: stats.power * (0.48 + Math.min(0.42, expiredBarrierValue / Math.max(1, player.maxHp))), color: this.getHybrid().color, slow: 0.22, mark: 2.8 });
        this._emitBurst(player.x, player.y, this.getHybrid().color, 10, 115);
      }
    }
    player.combatTime = Math.max(0, player.combatTime - dt);
    const requiemState = player.requiem ?? (player.requiem = createRequiemState());
    const classMechanic = CLASS_MECHANICS[player.primary];
    if (!requiemState.classMechanic.ready && player.combatTime <= 0 && classMechanic) {
      requiemState.classMechanic.value = Math.max(0, requiemState.classMechanic.value - classMechanic.decay * dt);
    }
    player.attackChainTime = Math.max(0, player.attackChainTime - dt);
    if (!player.attackChainTime) player.attackChain = 0;
    player.animation.time = Math.max(0, player.animation.time - dt);
    if (!player.animation.time && !player.dash) player.animation.type = 'idle';
    player.buffs = player.buffs.filter((buff) => (buff.time -= dt) > 0);
    if (player.uniqueMomentum?.time > 0) player.uniqueMomentum.time = Math.max(0, player.uniqueMomentum.time - dt);
    if (player.status.potionWard) player.status.potionWard -= dt;
    if (player.status.potionWard <= 0) delete player.status.potionWard;
    if (player.status.confluenceEcho) player.status.confluenceEcho -= dt;
    if (player.status.confluenceEcho <= 0) delete player.status.confluenceEcho;
    if (player.status.convergence) player.status.convergence -= dt;
    if (player.status.convergence <= 0) delete player.status.convergence;
    if (player.status.relay) player.status.relay -= dt;
    if (player.status.relay <= 0) delete player.status.relay;
    if (player.status.umbra) player.status.umbra -= dt;
    if (player.status.umbra <= 0) delete player.status.umbra;
    if (this.hasEndgameModifier('bloodprice') && player.deathTime <= 0) this._damagePlayer(Math.max(1, player.maxHp * 0.012 * dt), 'blood price');
    if (this.hasEndgameModifier('oathstorm') && this.clock % 5.5 < dt) {
      const angle = this.random() * Math.PI * 2;
      this._createHazard({ owner: 'enemy', kind: 'oathstorm', x: player.x + Math.cos(angle) * 120, y: player.y + Math.sin(angle) * 120, radius: 74, life: 1.2, tick: 0.3, damage: player.maxHp * 0.035, color: '#a788f2' });
    }
    const zone = zoneAt(player.x, player.y);
    if (zone.id !== this.lastZoneId) {
      this.lastZoneId = zone.id;
      this.emit('zone', zone);
      if (!zone.safe) this.notify(`${zone.name} · level ${zone.level}`, 'quiet');
    }
    const district = districtAt(player.x, player.y);
    if (district.id !== this.lastDistrictId) {
      this.lastDistrictId = district.id;
      this.emit('district', district);
      this._discoverDistrict(district);
    }

    this._handleUiActions();
    if (player.deathTime > 0) {
      player.deathTime -= dt;
      if (player.deathTime <= 0) this._respawn();
      return;
    }

    if (this.input.consume('contextAction')) this._performAction('contextAction');
    if (this.input.pointer?.down && this.input.pointer.commandDirty) {
      this.input.pointer.commandDirty = false;
      this._contextAction();
    }

    const targetAngle = this._aimAngle();
    if (Number.isFinite(targetAngle)) {
      const action = player.presentation?.action;
      const committed = action && action.elapsed >= (action.profile?.startup ?? 0.1) * 0.42;
      const rate = committed ? action.profile?.rotationPolicy === 'locked' ? 1.4 : COMMITTED_TURN_RATE : PLAYER_TURN_RATE;
      this._turnBody(player, targetAngle, dt, rate);
    }
    const manualMove = this.input.getMove();
    if (manualMove.moving) player.moveCommand = null;
    const move = manualMove.moving ? manualMove : this._commandMove();
    if (move.moving) this._recordTutorial('move');
    if (move.moving && player.primary === 'veilrunner' && !requiemState.classMechanic.ready) {
      requiemState.classMechanic.value = Math.min(100, requiemState.classMechanic.value + dt * 5.5);
      if (requiemState.classMechanic.value >= 100) {
        requiemState.classMechanic.ready = true;
        this.notify('Momentum is ready.', 'accent');
      }
    }
    if (player.dash) {
      this._updateDash(dt);
    } else {
      const speed = stats.speed * (player.buffs.some((buff) => buff.id === 'speed') ? 1.22 : 1);
      const locomotion = this.presentation?.animationDirector?.classProfile?.(player)?.locomotion;
      const targetX = move.x * speed;
      const targetY = move.y * speed;
      const accelerating = move.moving && Math.hypot(targetX, targetY) > Math.hypot(player.moveX, player.moveY);
      const response = accelerating ? locomotion?.acceleration ?? 2200 : locomotion?.deceleration ?? 2700;
      const previousMoveX = player.moveX;
      const previousMoveY = player.moveY;
      player.moveX = approach(player.moveX, targetX, response * dt);
      player.moveY = approach(player.moveY, targetY, response * dt);
      if (!move.moving && Math.hypot(player.moveX, player.moveY) < 2) { player.moveX = 0; player.moveY = 0; }
      const nextPlayerX = clamp(player.x + (previousMoveX + player.moveX) * 0.5 * dt, 35, WORLD_SIZE.width - 35);
      const nextPlayerY = clamp(player.y + (previousMoveY + player.moveY) * 0.5 * dt, 35, WORLD_SIZE.height - 35);
      this._moveBodyWithGeometry(player, nextPlayerX, nextPlayerY);
      this._applyPlayerRootMotion(dt);
      const visuallyMoving = Math.hypot(player.moveX, player.moveY) > 8;
      if (visuallyMoving && player.animation.type === 'idle') player.animation.type = 'run';
      if (!visuallyMoving && player.animation.type === 'run') player.animation.type = 'idle';
    }
    ['dodge', 'attack', 'skillOne', 'skillTwo', 'companion', 'hybrid', 'ultimate', 'potion', 'interact'].forEach((action) => {
      if (this.input.consume(action)) this._performAction(action);
    });
  }

  _handleUiActions() {
    if (this.input.consume('inventory')) this.emit('overlay', { panel: 'inventory' });
    if (this.input.consume('skills')) this.emit('overlay', { panel: 'skills' });
    if (this.input.consume('journey')) this.emit('overlay', { panel: 'journey' });
    if (this.input.consume('chronicle')) this.emit('overlay', { panel: 'chronicle' });
    if (this.input.consume('campaign')) this.emit('overlay', { panel: 'campaign' });
    if (this.input.consume('contracts')) this.emit('overlay', { panel: 'endgame' });
    if (this.input.consume('map')) this.emit('overlay', { panel: 'map' });
    if (this.input.consume('debug')) {
      if (this.presentation?.toggleDebug()) this.emit('overlay', { panel: 'presentation-debug' });
      else this.notify('Enable Presentation Debug in Pause settings first.', 'quiet');
    }
    if (this.input.consume('pause')) this.emit('overlay', { panel: 'pause' });
  }

  _combatTarget() {
    const id = this.player?.combatTargetId;
    if (!id) return null;
    const target = this.entities.enemies.find((enemy) => enemy.id === id && !enemy.dead) ?? null;
    if (!target && this.player) {
      this.player.combatTargetId = null;
      if (this.player.moveCommand?.targetId === id) this.player.moveCommand = null;
    }
    return target;
  }

  getCombatTarget() {
    return this._combatTarget();
  }

  _basicAttackRange() {
    const player = this.player;
    const profile = this.presentation?.animationDirector?.classProfile?.(player);
    const nextIndex = player ? player.attackChain % 3 : 0;
    return Number(profile?.attacks?.[nextIndex]?.range ?? (player?.primary === 'thornseer' ? 520 : 92));
  }

  _enemyAtWorldPoint(x, y) {
    return this.entities.enemies
      .filter((enemy) => !enemy.dead)
      .map((enemy) => {
        const dx = x - enemy.x;
        const dy = y - (enemy.y - enemy.radius * 0.28);
        const hitRadius = Math.max(30, enemy.radius * (enemy.boss ? 2.25 : 1.72));
        return { enemy, score: Math.hypot(dx, dy), hitRadius };
      })
      .filter((entry) => entry.score <= entry.hitRadius)
      .sort((a, b) => Number(b.enemy.boss) - Number(a.enemy.boss) || Number(b.enemy.elite) - Number(a.enemy.elite) || a.score - b.score)[0]?.enemy ?? null;
  }

  _engageEnemyGroup(enemy) {
    if (!enemy) return;
    if (enemy.roomId) this._beginEncounterRoom(enemy);
    enemy.engaged = true;
    enemy.lastEngagedAt = this.clock;
    this.entities.enemies.forEach((ally) => {
      if (!ally.dead && ally.group === enemy.group && distance(ally, enemy) <= 430) {
        ally.engaged = true;
        ally.lastEngagedAt = this.clock;
      }
    });
  }

  _beginEncounterRoom(enemy) {
    const room = ENCOUNTER_ROOM_BY_ID[enemy?.roomId];
    if (!room) return false;
    const changingRoom = this.encounter.activeRoomId !== room.id;
    if (this.encounter.activeGroupId && this.encounter.activeGroupId !== enemy.group) {
      // A direct player attack is still authoritative, but unrelated authored
      // packs do not chain-alert across the open world.
      this.entities.enemies.forEach((candidate) => {
        if (!candidate.dead && candidate.group === this.encounter.activeGroupId) candidate.lastEngagedAt = this.clock;
      });
    }
    const living = this.entities.enemies.filter((candidate) => !candidate.dead && candidate.group === enemy.group);
    this.encounter.activeRoomId = room.id;
    this.encounter.activeGroupId = enemy.group;
    this.encounter.state = 'engaged';
    this.encounter.clearedAt = 0;
    this.encounter.remaining = living.length;
    this.encounter.total = changingRoom ? living.length : Math.max(this.encounter.total, living.length);
    if (this.encounter.announcedRoomId !== room.id) {
      this.encounter.announcedRoomId = room.id;
      this.notify(`${room.name} · ${room.hint}`, 'warning');
      this.presentation?.emit('music:stinger', { id: 'encounter-start' }, { source: 'encounter-room', priority: room.tier >= 3 ? 72 : 48 });
    }
    this.emit('requiem-updated', this.getRequiemOverview());
    return true;
  }

  _updateEncounterDirector() {
    if (!this.player || this.endgame || this.worldEvent) return;
    const activeGroupId = this.encounter.activeGroupId;
    if (activeGroupId) {
      const living = this.entities.enemies.filter((enemy) => !enemy.dead && enemy.group === activeGroupId);
      this.encounter.remaining = living.length;
      if (living.length) {
        this.encounter.state = living.some((enemy) => enemy.windupLeft > 0) ? 'danger' : 'engaged';
        return;
      }
      if (this.encounter.state === 'cleared') {
        if (this.clock - this.encounter.clearedAt > 3.5) {
          this.encounter = { activeRoomId: null, activeGroupId: null, state: 'exploration', remaining: 0, total: 0, roomStreak: this.encounter.roomStreak, announcedRoomId: this.encounter.announcedRoomId, clearedAt: 0 };
          this.emit('requiem-updated', this.getRequiemOverview());
        }
        return;
      }
      const room = ENCOUNTER_ROOM_BY_ID[this.encounter.activeRoomId];
      if (room && this.encounter.state !== 'cleared') this._completeEncounterRoom(room);
      return;
    }
    const nearbyRoom = ENCOUNTER_ROOMS
      .map((room) => ({ room, distance: Math.hypot(this.player.x - room.x, this.player.y - room.y), living: this.entities.enemies.filter((enemy) => !enemy.dead && enemy.roomId === room.id).length }))
      .filter((entry) => entry.living > 0 && entry.distance <= entry.room.radius * 1.15)
      .sort((a, b) => a.distance - b.distance)[0]?.room ?? null;
    if (nearbyRoom) {
      this.encounter.activeRoomId = nearbyRoom.id;
      this.encounter.state = 'approaching';
      this.encounter.remaining = this.entities.enemies.filter((enemy) => !enemy.dead && enemy.roomId === nearbyRoom.id).length;
      this.encounter.total = this.encounter.remaining;
    } else if (this.encounter.state !== 'exploration') {
      this.encounter = { activeRoomId: null, activeGroupId: null, state: 'exploration', remaining: 0, total: 0, roomStreak: this.encounter.roomStreak, announcedRoomId: this.encounter.announcedRoomId, clearedAt: 0 };
    }
  }

  _completeEncounterRoom(room) {
    const state = this.player.requiem ?? (this.player.requiem = createRequiemState());
    state.roomHistory[room.id] = (state.roomHistory[room.id] ?? 0) + 1;
    state.roomsCleared += 1;
    this.encounter.roomStreak += 1;
    state.bestRoomStreak = Math.max(state.bestRoomStreak, this.encounter.roomStreak);
    const zoneProgress = this.getZoneProgress(room.zoneId);
    if (zoneProgress) {
      zoneProgress.corruption = Math.max(0, zoneProgress.corruption - (2 + room.tier));
      zoneProgress.events += 1;
    }
    this.stats.events += 1;
    this._recordLevelingProgress('event', 1, { zoneId: room.zoneId, eventId: room.id });
    this._progressContracts('event', { zoneId: room.zoneId, amount: 1 });
    const difficulty = DIFFICULTY_PROFILES[state.difficulty] ?? DIFFICULTY_PROFILES.veteran;
    const xp = Math.round((65 + room.tier * 35 + this.player.level * 4) * difficulty.reward);
    const gold = Math.round((28 + room.tier * 22 + this.player.level * 2) * difficulty.reward);
    this._gainXp(xp);
    this.player.gold += gold;
    if (room.tier >= 2) {
      const reward = this._generateItem({ sourceId: room.zoneId, minRarity: room.tier >= 3 ? 'relic' : 'rare', elite: true });
      if (reward) this._awardItem(reward, room.name);
    }
    this.encounter.state = 'cleared';
    this.encounter.remaining = 0;
    this.encounter.clearedAt = this.clock;
    this.notify(`${room.name} cleared · +${xp} XP · +${gold} gold`, 'accent');
    this.presentation?.emit('music:stinger', { id: 'encounter-clear' }, { source: 'encounter-room', priority: 76 });
    this.emit('requiem-updated', this.getRequiemOverview());
    this.save();
  }

  _contextAction() {
    const player = this.player;
    const pointer = this.input.pointer;
    if (!player || !pointer?.active) return false;
    const target = this._enemyAtWorldPoint(pointer.worldX, pointer.worldY);
    if (target) {
      player.combatTargetId = target.id;
      player.moveCommand = { targetId: target.id, x: target.x, y: target.y, attackOnArrival: true };
      this._engageEnemyGroup(target);
    } else {
      player.combatTargetId = null;
      player.moveCommand = {
        targetId: null,
        x: clamp(pointer.worldX, 35, WORLD_SIZE.width - 35),
        y: clamp(pointer.worldY, 35, WORLD_SIZE.height - 35),
        attackOnArrival: false
      };
      this._recordTutorial('move');
    }
    if (target) this._recordTutorial('target');
    return true;
  }

  _commandMove() {
    const player = this.player;
    const command = player?.moveCommand;
    if (!player || !command) return { x: 0, y: 0, moving: false };
    const target = command.targetId ? this.entities.enemies.find((enemy) => enemy.id === command.targetId && !enemy.dead) : null;
    if (command.targetId && !target) {
      player.moveCommand = null;
      player.combatTargetId = null;
      return { x: 0, y: 0, moving: false };
    }
    if (target) {
      command.x = target.x;
      command.y = target.y;
    }
    const dx = command.x - player.x;
    const dy = command.y - player.y;
    const remaining = Math.hypot(dx, dy);
    const attackRange = this._basicAttackRange();
    const stopDistance = target
      ? Math.max(36, attackRange * (attackRange > 210 ? 0.72 : 0.66) + target.radius * 0.35)
      : 10;
    const clearLine = !target || !this.worldGeometry?.segmentBlocked?.(player.x, player.y, target.x, target.y, Math.max(4, player.radius * .32), this);
    if (remaining <= stopDistance && clearLine) {
      player.moveCommand = null;
      if (target && command.attackOnArrival) {
        if (player.cooldowns.attack <= 0) this.input.press('attack', 0.14);
      }
      return { x: 0, y: 0, moving: false };
    }
    const direction = this.worldGeometry?.steer?.(player, command.x, command.y, this) ?? normalize(dx, dy);
    return { x: direction.x, y: direction.y, moving: true };
  }

  _aimAngle() {
    const player = this.player;
    const lockedTarget = this._combatTarget();
    if (lockedTarget) return angleTo(player, lockedTarget);
    const gamepadAim = this.input.getAimDirection?.();
    if (gamepadAim) {
      const rawAngle = Math.atan2(gamepadAim.y, gamepadAim.x);
      if (!this.settings.aimAssist) return rawAngle;
      const assisted = this.entities.enemies
        .filter((enemy) => !enemy.dead && distance(enemy, player) < 560)
        .map((enemy) => ({ enemy, angle: angleTo(player, enemy), offset: Math.abs(wrapAngle(angleTo(player, enemy) - rawAngle)) }))
        .filter((candidate) => candidate.offset < 0.42)
        .sort((a, b) => a.offset - b.offset || distance(a.enemy, player) - distance(b.enemy, player))[0];
      if (!assisted) return rawAngle;
      return rawAngle + wrapAngle(assisted.angle - rawAngle) * 0.62;
    }
    if (this.input.pointer.active) return Math.atan2(this.input.pointer.worldY - player.y, this.input.pointer.worldX - player.x);
    const move = this.input.getMove();
    return move.moving ? Math.atan2(move.y, move.x) : player.facing;
  }

  _performAction(action) {
    const player = this.player;
    if (player.deathTime > 0) return;
    if (action === 'contextAction') return this._contextAction();
    if (action === 'interact') return this.interact();
    if (player.cooldowns[action] > 0) {
      this.input.defer(action);
      return;
    }
    if (this.presentation && !this.presentation.canPerformAction(action)) {
      this.input.defer(action, action === 'attack' ? 0.2 : 0.14);
      return;
    }
    if (action === 'attack') return this._basicAttack();
    if (action === 'skillOne') return this._skillOne();
    if (action === 'skillTwo') return this._skillTwo();
    if (action === 'dodge') return this._dodge();
    if (action === 'companion') return this._companionTechnique();
    if (action === 'hybrid') return this._hybridSignature();
    if (action === 'ultimate') return this._hybridUltimate();
    if (action === 'potion') return this._potion();
  }

  _canSpend(amount) {
    if (this.player.resource < amount) {
      this.notify(`Not enough ${this.getPrimaryClass().resource}.`, 'warning');
      return false;
    }
    this.player.resource -= amount;
    if (this.player.primary === 'ironbound' && this.hasPower('cairnheart')) {
      const stats = this.getStats();
      this._damageArc(this.player, 72, Math.PI * 2, stats.power * 0.38, { stagger: 1.15, source: 'cairnheart', color: '#e8be6b' });
      this._emitBurst(this.player.x, this.player.y, '#e8be6b', 7, 100);
    }
    return true;
  }

  _setAnimation(type, duration, angle = this.player.facing) {
    if (this.presentation?.beginLegacyAction?.(type, duration, angle)) {
      this.player.actionHistory.unshift(type);
      this.player.actionHistory.length = 5;
      this._spawnPlayerActionVfx(type, this.player.presentation?.action?.profile?.duration ?? duration);
      return;
    }
    this.player.animation = { type, duration, time: duration, angle };
    this.player.actionHistory.unshift(type);
    this.player.actionHistory.length = 5;
    this._spawnPlayerActionVfx(type, duration);
  }

  _spawnPlayerActionVfx(action, duration = 0, comboIndex = 0) {
    const player = this.player;
    const spec = playerActionVfx(player?.primary, action, comboIndex || player?.attackChain || 1);
    if (!player || !spec) return null;
    const finisher = action === 'attack' && comboIndex === 3;
    const scale = spec.scale * (finisher ? 1.16 : 1);
    const lifetime = Math.max(spec.durationFloor, duration || 0);
    const forward = spec.anchor * (action === 'skillTwo' || action === 'ward' || action === 'ultimate' ? 0.45 : 1);
    const baseSize = action === 'ultimate' ? 156 : action === 'hybrid' ? 132 : action === 'skillTwo' || action === 'ward' ? 118 : action === 'execution' ? 126 : 98;
    const ability = ['attack', 'skillOne', 'skillTwo', 'dodge', 'ultimate'].includes(action) ? this.getResolvedAbility(action) : null;
    const vfxFamily = resolveCovenantPresentationIdentity(this.getCovenantOverview(), { abilityId: ability?.id ?? action, mutationId: ability?.mutationId ?? null, slot: action });
    return this._pushEffect({
      kind: 'action-sequence', source: 'player', action, sheet: spec.sheet, row: spec.row, frames: spec.frames,
      vfxFamily, vfxPhases: [vfxFamily.vfx.cast, vfxFamily.vfx.trail, vfxFamily.vfx.impact], animationKey: vfxFamily.animationKey,
      x: player.x + Math.cos(player.facing) * forward,
      y: player.y + Math.sin(player.facing) * forward,
      angle: player.facing, elevation: player.elevation ?? 0,
      size: baseSize * scale, life: lifetime, maxLife: lifetime, color: this.getPrimaryClass().color
    });
  }

  _spawnEnemyActionVfx(enemy, duration = 0) {
    if (!enemy || enemy.dead) return null;
    const spec = enemyActionVfx(enemy.role, enemy.boss);
    const lifetime = Math.max(spec.durationFloor, duration || 0);
    const size = Math.max(enemy.boss ? 158 : 88, enemy.radius * (enemy.boss ? 3.7 : 3.05)) * spec.scale;
    return this._pushEffect({
      kind: 'action-sequence', source: 'enemy', action: enemy.attack, sheet: spec.sheet, row: spec.row, frames: spec.frames,
      x: enemy.x + Math.cos(enemy.facing ?? 0) * spec.anchor,
      y: enemy.y + Math.sin(enemy.facing ?? 0) * spec.anchor,
      angle: enemy.facing ?? 0, elevation: enemy.elevation ?? 0,
      size, life: lifetime, maxLife: lifetime, color: enemy.color
    });
  }

  _queuePresentedAction(action, resolve, { soundId = null, onCommit = null, stingerId = null, animationType = null, angle = this.player?.facing } = {}) {
    if (!this.presentation || typeof resolve !== 'function') return false;
    const began = this.presentation.beginPlayerAction(action, {
      CommitAction: () => onCommit?.(),
      PlayActionSound: () => { if (soundId) this.emit('sound', { id: soundId, priority: action === 'ultimate' || action === 'execution' ? 9 : 5 }); },
      ResolveAction: () => {
        if (stingerId) this.presentation.emit('music:stinger', { id: stingerId }, { source: 'player-action', priority: action === 'ultimate' ? 86 : 50 });
        resolve();
      }
    }, { animationType, angle });
    if (began) this._spawnPlayerActionVfx(action, this.player.presentation?.action?.profile?.duration ?? 0);
    return began;
  }

  _rollFatedProc(stat, stats = this.getStats()) {
    const chance = clamp(Number(stats?.[stat]) || 0, 0, 0.8);
    return chance > 0 && this.random() < chance;
  }

  _basicAttack() {
    const player = this.player;
    const kit = this.getPrimaryClass();
    const stats = this.getStats();
    const ability = kit.abilities.attack;
    const mastery = this.getMastery('attack');
    const doctrine = this.getMasteryDoctrine('attack');
    player.cooldowns.attack = ability.cooldown;
    player.attackChain = (player.attackChain % 3) + 1;
    const comboIndex = player.attackChain;
    player.attackChainTime = 0.85;
    const resolveAttack = () => {
    const attackProfile = player.presentation?.action?.profile;
    const multiplier = (1 + (comboIndex === 3 ? 0.35 : 0) + (player.buffs.some((buff) => buff.id === 'oath') ? 0.25 : 0))
      * (1 + (mastery?.rank ?? 0) * 0.055)
      * (comboIndex === 3 && (mastery?.rank ?? 0) >= 3 ? 1.16 : 1);
    const mechanicFinisher = comboIndex === 3 && this.player.requiem?.classMechanic?.ready
      && ['warden', 'ironbound', 'veilrunner', 'dawnstrider'].includes(player.primary);
    const damage = stats.power * multiplier * stats.attackDamage * (mechanicFinisher ? 1.34 : 1);
    if (player.primary === 'thornseer') {
      this._createProjectile({ owner: 'player', kind: 'briar', x: player.x, y: player.y, angle: player.facing, speed: 640, radius: 10, life: 0.95, damage, pierce: 0, color: kit.color, mark: 2.6, executioner: doctrine?.id === 'executioner', impactProfile: attackProfile?.impactProfile });
    } else if (player.primary === 'veilrunner') {
      this._damageArc(player, attackProfile?.range ?? 86, attackProfile?.arc ?? 1.72, damage, { mark: 1.6, dash: false, color: kit.color, executioner: doctrine?.id === 'executioner', impactProfile: attackProfile?.impactProfile });
      if (comboIndex === 3) this._createProjectile({ owner: 'player', kind: 'knife', x: player.x, y: player.y, angle: player.facing, speed: 760, radius: 8, life: 0.75, damage: damage * 0.65, pierce: 1, color: kit.color, mark: 2 });
      const quickdraw = this.getTalentRank('veil-quickdraw');
      if (comboIndex === 3 && quickdraw) {
        for (let index = 0; index < quickdraw; index += 1) this._createProjectile({ owner: 'player', kind: 'quickdraw-knife', x: player.x, y: player.y, angle: player.facing + (index ? 0.18 : -0.18), speed: 795, radius: 7, life: 0.68, damage: damage * 0.48, pierce: 1, color: kit.color, mark: 1.8 });
      }
    } else if (player.primary === 'gravebinder') {
      const hits = this._damageArc(player, attackProfile?.range ?? 94, attackProfile?.arc ?? 1.74, damage * 1.04, { mark: 2.3, stagger: 1.05 + this.getTalentRank('grave-cairn') * 0.18, source: 'grave-scythe', color: kit.color, executioner: doctrine?.id === 'executioner', impactProfile: attackProfile?.impactProfile });
      if (comboIndex === 3) {
        const count = 1 + this.getTalentRank('grave-reaper');
        for (let index = 0; index < count; index += 1) this._createProjectile({ owner: 'player', kind: 'soul-hex', x: player.x, y: player.y, angle: player.facing + (index - (count - 1) / 2) * 0.2, speed: 640, radius: 8, life: 0.88, damage: damage * 0.56, pierce: 1, color: kit.color, mark: 2.4, homing: 0.12 });
      }
      if (hits >= 2 && this.getTalentRank('grave-sanctum')) {
        player.barrier += stats.hp * 0.025 * stats.ward;
        player.barrierTime = Math.max(player.barrierTime, 2.2);
      }
    } else if (player.primary === 'dawnstrider') {
      this._damageArc(player, attackProfile?.range ?? 88, attackProfile?.arc ?? 1.58, damage, { mark: 2.6, stagger: 0.86, source: 'sun-staff', color: kit.color, executioner: doctrine?.id === 'executioner', impactProfile: attackProfile?.impactProfile });
      if (comboIndex === 3) this._createProjectile({ owner: 'player', kind: 'sun-spark', x: player.x, y: player.y, angle: player.facing, speed: 710, radius: 8, life: 0.82, damage: damage * 0.66, pierce: 1, color: kit.color, mark: 2.8, homing: 0.11 });
    } else {
      const hits = this._damageArc(player, attackProfile?.range ?? (player.primary === 'ironbound' ? 93 : 84), attackProfile?.arc ?? (player.primary === 'ironbound' ? 1.55 : 1.82), damage, { mark: 1.9, stagger: player.primary === 'ironbound' ? stats.attackStagger : 1, color: kit.color, executioner: doctrine?.id === 'executioner', impactProfile: attackProfile?.impactProfile });
      if (player.primary === 'ironbound' && hits >= 2 && this.getTalentRank('iron-galvanize')) {
        player.barrier += stats.hp * 0.02 * this.getTalentRank('iron-galvanize');
        player.barrierTime = Math.max(player.barrierTime, 1.9);
      }
      if (player.primary === 'warden' && comboIndex === 3 && (this.getTalentRank('warden-crescent') || this.hasPower('vowbreaker'))) {
        const count = this.getTalentRank('warden-crescent') + (this.hasPower('vowbreaker') ? 1 : 0);
        for (let index = 0; index < count; index += 1) this._createProjectile({ owner: 'player', kind: 'covenant-crescent', x: player.x, y: player.y, angle: player.facing + (index ? 0.15 : -0.15), speed: 620, radius: 9, life: 0.88, damage: damage * 0.54, pierce: 1, bounce: 1, color: kit.color, mark: 2.5, homing: 0.1 });
      }
    }
    this._gainResource(ability.resource, (player.primary === 'veilrunner' || player.primary === 'dawnstrider') && length(player.moveX, player.moveY) > 30 ? 1.35 : 1);
    if (comboIndex === 3 && doctrine?.id === 'relentless') this._gainResource(player.maxResource * 0.12);
    if (this._rollFatedProc('echoStrike', stats)) {
      if (player.primary === 'thornseer') {
        this._createProjectile({ owner: 'player', kind: 'fated-echo-briar', x: player.x, y: player.y, angle: player.facing, speed: 700, radius: 8, life: 0.7, damage: damage * 0.55, pierce: 1, color: '#d7b3ff', mark: 1.8, noFatedProc: true });
      } else {
        this._damageArc(player, 116, 2.15, damage * 0.55, { source: 'fated-echo-strike', stagger: 0.44, mark: 1.5, color: '#d7b3ff', noFatedProc: true });
      }
      this._pushEffect({ kind: 'affix-echo-strike', x: player.x, y: player.y, angle: player.facing, life: 0.34, maxLife: 0.34, color: '#d7b3ff' });
    }
    this._emitBurst(player.x, player.y, kit.color, 5, 85);
    if (mechanicFinisher) this._consumeClassMechanic('finisher');
    this._recordCombatAction('attack');
    };
    const presented = this.presentation?.beginPlayerAttack?.(comboIndex, {
      CommitAttack: () => this._alignPlayerAttack(this._combatTarget()),
      PlayWeaponWhoosh: () => this.emit('sound', { id: this.player.presentation?.action?.profile?.audioProfile ?? 'attack', weapon: this.player.presentation?.profile?.weapon, comboIndex }),
      EnableHitbox: () => resolveAttack()
    });
    if (presented) {
      this._spawnPlayerActionVfx('attack', player.presentation?.action?.profile?.duration ?? 0, comboIndex);
      player.actionHistory.unshift(`attack-${comboIndex}`);
      player.actionHistory.length = 5;
      return true;
    }
    this._setAnimation('attack', 0.26);
    this.emit('sound', { id: 'attack' });
    resolveAttack();
    return true;
  }

  _alignPlayerAttack(preferredTarget = null) {
    const player = this.player;
    const profile = player?.presentation?.action?.profile;
    if (!player || !profile || profile.range > 210 || profile.movementPolicy === 'stationary') return false;
    const rangeLimit = Number(profile.range ?? 110);
    const preferred = preferredTarget && !preferredTarget.dead && distance(player, preferredTarget) <= rangeLimit + 52
      && !this.worldGeometry?.segmentBlocked?.(player.x, player.y, preferredTarget.x, preferredTarget.y, 5, this)
      ? { enemy: preferredTarget, angle: angleTo(player, preferredTarget), offset: Math.abs(wrapAngle(angleTo(player, preferredTarget) - player.facing)) }
      : null;
    const target = preferred ?? this.entities.enemies
      .filter((enemy) => !enemy.dead && distance(player, enemy) <= profile.range + 52 && !this.worldGeometry?.segmentBlocked?.(player.x, player.y, enemy.x, enemy.y, 5, this))
      .map((enemy) => ({ enemy, angle: angleTo(player, enemy), offset: Math.abs(wrapAngle(angleTo(player, enemy) - player.facing)) }))
      .filter((candidate) => candidate.offset <= Math.min(0.64, profile.arc * 0.42))
      .sort((a, b) => a.offset - b.offset || distance(a.enemy, player) - distance(b.enemy, player))[0];
    if (!target) return false;
    // Attacks may correct one authored body stance, never smoothly spin the paper-doll.
    this._turnBody(player, target.angle, TICK_LIMIT, COMMITTED_TURN_RATE);
    const gap = distance(player, target.enemy) - (rangeLimit * 0.72 + target.enemy.radius * 0.35);
    const translation = clamp(gap, 0, profile.comboIndex === 3 ? 34 : 22);
    const correctionAngle = wrapAngle(target.angle - player.facing);
    if (translation > 0) this._moveBodyWithGeometry(player, player.x + Math.cos(player.facing) * translation, player.y + Math.sin(player.facing) * translation);
    this.presentation?.emit('animation:event', { entityId: player.id, eventId: 'MotionWarp', targetId: target.enemy.id, translation, rotation: correctionAngle }, { source: 'motion-warping', priority: 4 });
    return true;
  }

  _skillOne(resolved = false) {
    const player = this.player;
    const kit = this.getPrimaryClass();
    const ability = this.getResolvedAbility('skillOne') ?? kit.abilities.skillOne;
    if (!resolved && this.presentation) {
      if (player.resource < ability.cost) { this.notify(`Not enough ${kit.resource}.`, 'warning'); return false; }
      return this._queuePresentedAction('skillOne', () => this._skillOne(true), { soundId: 'projectile', animationType: 'cast' });
    }
    if (!this._canSpend(ability.cost)) return;
    this._applyUniqueBehaviorEvent('ability-cast', { slot: 'skillOne', ability });
    player.cooldowns.skillOne = ability.cooldown;
    if (!resolved) { this._setAnimation('cast', 0.36); this.emit('sound', { id: 'projectile' }); }
    const stats = this.getStats();
    const imprint = this.getImprint('skillOne');
    const mastery = this.getMastery('skillOne');
    const doctrine = this.getMasteryDoctrine('skillOne');
    const relay = player.status.relay > 0;
    if (relay) delete player.status.relay;
    const mechanicSkill = player.requiem?.classMechanic?.ready && ['thornseer', 'gravebinder'].includes(player.primary);
    const base = stats.power * 1.8 * stats.projectileDamage * (imprint?.id === 'piercing' ? 1.12 : 1) * (imprint?.id === 'seeker' ? 1.18 : 1)
      * (1 + (mastery?.rank ?? 0) * 0.075) * (relay ? 1.22 : 1) * (mechanicSkill ? 1.24 : 1) * (ability.damageMultiplier ?? 1);
    const extraPierce = (imprint?.id === 'piercing' ? 2 : 0) + (doctrine?.id === 'sunder' ? 1 : 0);
    const extraSplit = (imprint?.id === 'splinter' ? 2 : 0) + (doctrine?.id === 'scatter' ? 1 : 0);
    const nailstorm = this.getTalentRank('warden-nailstorm');
    const barbs = this.getTalentRank('thorn-barbs');
    const knifeFan = this.getTalentRank('veil-fan');
    const chainlord = this.getTalentRank('iron-chainlord') > 0;
    if (ability.shape === 'melee') {
      this._damageArc(player, ability.range ?? 78, 1.25, base * 1.12, { mark: 3.5, stagger: ability.guardDamageMultiplier ?? 1.4, source: ability.id, color: kit.color, damageType: ability.damageType, corpseInteraction: ability.corpseInteraction });
      const lunge = ability.movement === 'lunge' ? 24 : 0;
      if (lunge) this._moveBodyWithGeometry(player, player.x + Math.cos(player.facing) * lunge, player.y + Math.sin(player.facing) * lunge);
    } else if (player.primary === 'ironbound') {
      this._createProjectile({ owner: 'player', kind: 'harpoon', x: player.x, y: player.y, angle: player.facing, speed: 780, radius: 13, life: 0.72, damage: base, pierce: extraPierce, bounce: chainlord ? 1 : 0, split: extraSplit, pull: 220 * stats.harpoonPull, color: kit.color, mark: 2.6, homing: imprint?.id === 'seeker' ? 0.16 : 0, sunder: doctrine?.id === 'sunder' });
    } else if (player.primary === 'veilrunner') {
      this._createProjectile({ owner: 'player', kind: 'knife', x: player.x, y: player.y, angle: player.facing, speed: 810, radius: 9, life: 0.98, damage: base, pierce: 2 + extraPierce, bounce: 2, split: extraSplit, repeatOnCrit: this.getTalentRank('veil-tempest') > 0, color: kit.color, mark: 3, homing: imprint?.id === 'seeker' ? 0.18 : 0, sunder: doctrine?.id === 'sunder' });
      for (let index = 0; index < knifeFan; index += 1) {
        const offset = (index - (knifeFan - 1) / 2) * 0.3 || 0.3;
        this._createProjectile({ owner: 'player', kind: 'fan-knife', x: player.x, y: player.y, angle: player.facing + offset, speed: 760, radius: 7, life: 0.82, damage: base * 0.58, pierce: 1, bounce: 1, color: kit.color, mark: 2.2 });
      }
    } else if (player.primary === 'gravebinder') {
      const marrow = this.getTalentRank('grave-marrow');
      const legion = this.getTalentRank('grave-legion') > 0;
      this._createProjectile({ owner: 'player', kind: 'bone-hex', x: player.x, y: player.y, angle: player.facing, speed: 680, radius: 12, life: 1.15, damage: base * (legion ? 1.18 : 1), pierce: 1 + marrow + extraPierce, split: extraSplit + (this.hasPower('bone-codex') ? 2 : 0), color: kit.color, mark: 3.4, homing: imprint?.id === 'seeker' ? 0.2 : 0.1, sunder: doctrine?.id === 'sunder' });
    } else if (player.primary === 'dawnstrider') {
      const lance = this.getTalentRank('dawn-lance');
      const returnLance = this.hasPower('daybreak-lance') || this.getTalentRank('dawn-ascendant') > 0;
      this._createProjectile({ owner: 'player', kind: returnLance ? 'returning-javelin' : 'radiant-javelin', x: player.x, y: player.y, angle: player.facing, speed: 760, radius: 11, life: 1.05, damage: base * (this.getTalentRank('dawn-ascendant') ? 1.18 : 1), pierce: 2 + lance + extraPierce, split: extraSplit, bounce: this.getTalentRank('dawn-horizon') > 0 ? 1 : 0, color: kit.color, mark: 3.8 + this.getTalentRank('dawn-brand') * 1.3, homing: imprint?.id === 'seeker' ? 0.2 : 0.1, sunder: doctrine?.id === 'sunder' });
    } else {
      const classSplits = player.primary === 'thornseer' ? 2 + barbs : nailstorm;
      this._createProjectile({ owner: 'player', kind: player.primary === 'thornseer' ? 'hex' : 'spirit', x: player.x, y: player.y, angle: player.facing, speed: 700, radius: 12, life: 1.2, damage: base, pierce: (player.primary === 'thornseer' ? 1 : 2) + extraPierce, split: classSplits + extraSplit, color: kit.color, mark: 3.5, homing: imprint?.id === 'seeker' ? 0.18 : 0, sunder: doctrine?.id === 'sunder' });
    }
    if (ability.shape !== 'melee' && (ability.projectileCount ?? 1) > 1) {
      const extra = Math.min(5, (ability.projectileCount ?? 1) - 1);
      for (let index = 0; index < extra; index += 1) {
        const offset = (index - (extra - 1) / 2) * 0.18 + (index >= extra / 2 ? 0.09 : -0.09);
        this._createProjectile({ owner: 'player', kind: 'mutation-bolt', x: player.x, y: player.y, angle: player.facing + offset, speed: 680, radius: 8, life: 0.88, damage: base * 0.52, pierce: ability.projectileBehavior?.includes('pierce') ? 1 : 0, color: kit.color, mark: 2, damageType: ability.damageType, presentationKey: ability.presentationKey });
      }
    }
    if (imprint?.id === 'forked') [-0.17, 0.17].forEach((offset) => this._createProjectile({ owner: 'player', kind: 'imprint-bolt', x: player.x, y: player.y, angle: player.facing + offset, speed: 660, radius: 8, life: 0.9, damage: base * 0.52, pierce: 0, color: kit.color, mark: 1.8 }));
    if (mechanicSkill) this._consumeClassMechanic('skillOne');
    this._emitBurst(player.x, player.y, kit.color, 8, 110);
    this._recordCombatAction('skillOne');
  }

  _skillTwo(resolved = false) {
    const player = this.player;
    const kit = this.getPrimaryClass();
    const ability = kit.abilities.skillTwo;
    if (!resolved && this.presentation) {
      if (player.resource < ability.cost) { this.notify(`Not enough ${kit.resource}.`, 'warning'); return false; }
      return this._queuePresentedAction('skillTwo', () => this._skillTwo(true), { soundId: 'ward', animationType: 'ward' });
    }
    if (!this._canSpend(ability.cost)) return;
    player.cooldowns.skillTwo = ability.cooldown;
    if (!resolved) { this._setAnimation('ward', 0.48); this.emit('sound', { id: 'ward' }); }
    const stats = this.getStats();
    const target = this._abilityTarget(210);
    const imprint = this.getImprint('skillTwo');
    const mastery = this.getMastery('skillTwo');
    const doctrine = this.getMasteryDoctrine('skillTwo');
    const parameters = {
      owner: 'player', x: target.x, y: target.y, radius: (player.primary === 'ironbound' ? 118 : player.primary === 'gravebinder' ? 116 : player.primary === 'dawnstrider' ? 112 : 106) * stats.wardRadius * (1 + (mastery?.rank ?? 0) * 0.075),
      life: (player.primary === 'veilrunner' ? 4.2 : player.primary === 'gravebinder' ? 5.9 : player.primary === 'dawnstrider' ? 5.7 : 5.5) * (player.primary === 'veilrunner' ? stats.smokeDuration : 1) * (1 + (mastery?.rank ?? 0) * 0.055), tick: 0.42, damage: stats.power * 0.64, color: kit.color,
      kind: player.primary === 'gravebinder' ? 'ward-grave' : player.primary === 'dawnstrider' ? 'ward-dawn' : 'ward', slow: player.primary === 'veilrunner' ? 0.38 : player.primary === 'gravebinder' ? 0.27 : player.primary === 'dawnstrider' ? 0.24 : 0.18,
      heal: player.primary === 'thornseer' ? 3 + stats.bloomHeal : player.primary === 'gravebinder' ? 2 + stats.bloomHeal : player.primary === 'dawnstrider' ? 2 + stats.bloomHeal : 0,
      barrier: player.primary === 'warden' ? stats.hp * 0.15 * stats.ward * stats.wardBarrier : player.primary === 'ironbound' ? stats.hp * 0.1 * stats.ward * stats.wardBarrier : player.primary === 'gravebinder' ? stats.hp * 0.08 * stats.ward : player.primary === 'dawnstrider' ? stats.hp * 0.11 * stats.ward : 0,
      follow: (player.primary === 'ironbound' && this.getTalentRank('iron-colossus') > 0) || (player.primary === 'gravebinder' && this.getTalentRank('grave-crypt') > 0) || (player.primary === 'dawnstrider' && this.getTalentRank('dawn-shelter') > 0), buff: player.primary
    };
    if (player.primary === 'thornseer') parameters.damage *= 1 + stats.bloomPower;
    if (player.primary === 'ironbound' && this.getTalentRank('iron-everwall')) parameters.life *= 1.4;
    if (player.primary === 'gravebinder' && this.getTalentRank('grave-ossuary')) {
      parameters.radius *= 1 + this.getTalentRank('grave-ossuary') * 0.12;
      parameters.heal += this.getTalentRank('grave-ossuary') * 1.5;
    }
    if (player.primary === 'dawnstrider' && this.getTalentRank('dawn-chorus')) {
      parameters.radius *= 1 + this.getTalentRank('dawn-chorus') * 0.1;
      parameters.heal += this.getTalentRank('dawn-chorus') * 1.6;
      parameters.barrier *= 1 + this.getTalentRank('dawn-chorus') * 0.12;
    }
    if (imprint?.id === 'expanse') { parameters.radius *= 1.35; parameters.damage *= 0.9; }
    if (imprint?.id === 'lasting') parameters.life *= 1.55;
    if (imprint?.id === 'sentinel') parameters.thornwall = true;
    if (imprint?.id === 'echoing') parameters.echoOnExpire = true;
    if (doctrine?.id === 'eruption') parameters.masteryEruption = true;
    if (player.primary === 'thornseer' && this.hasPower('last-briar')) {
      const cursed = this.entities.enemies.filter((enemy) => !enemy.dead && enemy.cursed > 0).sort((a, b) => distance(a, player) - distance(b, player))[0];
      if (cursed) parameters.followEnemyId = cursed.id;
    }
    if (player.primary === 'thornseer' && this.hasPower('bloodroot-idol')) {
      const cursedCount = this.entities.enemies.filter((enemy) => !enemy.dead && enemy.cursed > 0 && distance(enemy, target) < parameters.radius * 1.35).length;
      if (cursedCount) {
        parameters.heal += Math.min(8, cursedCount * 2);
        parameters.damage *= 1 + Math.min(0.28, cursedCount * 0.06);
        this.notify(`Bloodroot Idol drinks ${cursedCount} curse${cursedCount === 1 ? '' : 's'}.`, 'quiet');
      }
    }
    if (player.primary === 'gravebinder' && this.hasPower('pall-crown')) {
      const cursed = this.entities.enemies.filter((enemy) => !enemy.dead && enemy.cursed > 0).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (cursed) this._createProjectile({ owner: 'player', kind: 'ossuary-hex', x: target.x, y: target.y, angle: angleTo(target, cursed), speed: 650, radius: 8, life: 0.8, damage: stats.power * 0.82, pierce: 1, color: kit.color, mark: 2.8, homing: 0.2 });
    }
    if (player.primary === 'dawnstrider' && this.hasPower('halo-of-ash')) {
      parameters.barrier *= 1.3;
      this._createHazard({ owner: 'player', kind: 'halo-flare', x: target.x, y: target.y, radius: 84, life: 1.25, tick: 0.42, damage: stats.power * 0.52, color: kit.color, slow: 0.18, mark: 2.4 });
    }
    this._createHazard(parameters);
    if (parameters.barrier) {
      player.barrier += parameters.barrier;
      player.barrierTime = Math.max(player.barrierTime, parameters.life);
    }
    if (player.primary === 'thornseer' && this.getTalentRank('thorn-bloodmoon')) {
      player.barrier += stats.hp * 0.12;
      player.barrierTime = Math.max(player.barrierTime, parameters.life);
    }
    if (player.primary === 'gravebinder' && this.getTalentRank('grave-sanctum')) {
      player.barrier += stats.hp * 0.1 * stats.ward;
      player.barrierTime = Math.max(player.barrierTime, parameters.life);
    }
    if (player.primary === 'dawnstrider' && this.getTalentRank('dawn-shelter')) {
      player.barrier += stats.hp * 0.1 * stats.ward;
      player.barrierTime = Math.max(player.barrierTime, parameters.life);
    }
    if (doctrine?.id === 'sanctuary') {
      player.barrier += stats.hp * 0.06 * stats.ward;
      player.barrierTime = Math.max(player.barrierTime, 3);
    }
    this._emitBurst(target.x, target.y, kit.color, 18, 160);
    this._recordCombatAction('skillTwo');
  }

  _companionTechnique(resolved = false) {
    const player = this.player;
    const technique = this.getCompanionTechnique();
    const companion = this.getSecondaryClass();
    if (!technique || !companion) return;
    if (!resolved && this.presentation) {
      if (player.resource < technique.cost) { this.notify(`Not enough ${this.getPrimaryClass().resource}.`, 'warning'); return false; }
      return this._queuePresentedAction('companion', () => this._companionTechnique(true), { soundId: 'companion' });
    }
    if (!this._canSpend(technique.cost)) return;
    player.cooldowns.companion = technique.cooldown;
    if (!resolved) { this._setAnimation('companion', 0.4); this.emit('sound', { id: 'companion' }); }
    const stats = this.getStats();
    const mastery = this.getMastery('companion');
    const doctrine = this.getMasteryDoctrine('companion');
    const empowered = player.status.confluenceEcho > 0;
    const power = stats.power * stats.companionPower * stats.companionDamage * (empowered ? 1.4 : 1) * (1 + (mastery?.rank ?? 0) * 0.09);
    if (empowered) delete player.status.confluenceEcho;
    switch (companion.id) {
      case 'warden':
        this._damageArc(player, 105, 1.9, power * 1.16, { mark: 2.8, stagger: 1.1, source: 'companion-warden', color: companion.color });
        player.barrier += stats.hp * 0.06 * stats.ward;
        player.barrierTime = Math.max(player.barrierTime, 2.5);
        break;
      case 'thornseer':
        this._createProjectile({ owner: 'player', kind: 'echo-hex', x: player.x, y: player.y, angle: player.facing, speed: 680, radius: 10, life: 1.05, damage: power * 1.18, pierce: 1, split: 1, color: companion.color, mark: 3.4, homing: 0.16 });
        break;
      case 'ironbound':
        this._createProjectile({ owner: 'player', kind: 'echo-harpoon', x: player.x, y: player.y, angle: player.facing, speed: 760, radius: 12, life: 0.8, damage: power * 1.25, pierce: 1, pull: 170 * stats.harpoonPull, color: companion.color, mark: 2.5 });
        break;
      case 'veilrunner':
        [-0.12, 0.12].forEach((offset) => this._createProjectile({ owner: 'player', kind: 'echo-knife', x: player.x, y: player.y, angle: player.facing + offset, speed: 790, radius: 8, life: 0.82, damage: power * 0.78, pierce: 1, bounce: 1, color: companion.color, mark: 2.8, homing: 0.11 }));
        break;
      case 'gravebinder':
        [-0.15, 0.15].forEach((offset) => this._createProjectile({ owner: 'player', kind: 'echo-bone-hex', x: player.x, y: player.y, angle: player.facing + offset, speed: 690, radius: 9, life: 0.92, damage: power * 0.72, pierce: 1, color: companion.color, mark: 3.1, homing: 0.15 }));
        break;
      case 'dawnstrider':
        this._createProjectile({ owner: 'player', kind: 'echo-javelin', x: player.x, y: player.y, angle: player.facing, speed: 760, radius: 9, life: 0.9, damage: power * 1.04, pierce: 2, color: companion.color, mark: 3.2, homing: 0.12 });
        player.barrier += stats.hp * 0.035 * stats.ward;
        player.barrierTime = Math.max(player.barrierTime, 2.2);
        break;
      default:
        break;
    }
    if (doctrine?.id === 'accord') {
      this._gainResource(player.maxResource * 0.12);
      player.barrier += stats.hp * 0.05 * stats.ward;
      player.barrierTime = Math.max(player.barrierTime, 2.5);
    }
    if (doctrine?.id === 'relay') player.status.relay = 4;
    if (this.hasPower('choir-vigil')) {
      player.barrier += stats.hp * 0.1 * stats.ward;
      player.barrierTime = Math.max(player.barrierTime, 3.2);
      this._pushEffect({ kind: 'choir-ward', x: player.x, y: player.y, life: 0.7, maxLife: 0.7, color: '#a8e7e0' });
    }
    this._emitBurst(player.x, player.y, companion.color, 11, 135);
    this.notify(`${technique.name}${empowered ? ' — confluence amplified.' : '.'}`, 'quiet');
    this._recordCombatAction('companion');
  }

  _dodge() {
    const player = this.player;
    player.moveCommand = null;
    const kit = this.getPrimaryClass();
    const ability = kit.abilities.dodge;
    player.cooldowns.dodge = ability.cooldown;
    const movement = this.input.getMove();
    const direction = movement.moving ? movement : fromAngle(player.facing);
    player.dash = { x: direction.x, y: direction.y, time: player.primary === 'ironbound' ? 0.25 : player.primary === 'gravebinder' ? 0.23 : player.primary === 'dawnstrider' ? 0.21 : 0.2, speed: player.primary === 'ironbound' ? 960 : player.primary === 'gravebinder' ? 1000 : player.primary === 'dawnstrider' ? 1120 : 1050, hit: new Set() };
    // Dodges lift just enough to clear the ground shadow, then use the shared gravity pass.
    player.verticalVelocity = Math.max(player.verticalVelocity ?? 0, player.primary === 'ironbound' ? 245 : 315);
    player.grounded = false;
    player.iframes = Math.max(0.16, player.dash.time - 0.01);
    player.dodgeCount = (player.dodgeCount ?? 0) + 1;
    if (player.primary === 'veilrunner' && this.getTalentRank('veil-rift')) this._gainResource(8 * this.getTalentRank('veil-rift'));
    if (player.primary === 'veilrunner' && this.getTalentRank('veil-ambush')) player.buffs.push({ id: 'ambush', time: 1.4 * this.getTalentRank('veil-ambush') });
    if (player.primary === 'veilrunner' && this.getTalentRank('veil-umbra')) player.status.umbra = Math.max(player.status.umbra ?? 0, 1.2);
    if (player.primary === 'veilrunner' && this.getTalentRank('veil-phantom') && player.dodgeCount % 3 === 0) {
      player.cooldowns.dodge = ability.cooldown * 0.55;
      this.notify('Phantom Road refunds your Rift Step.', 'quiet');
    }
    const ghostThread = this.getTalentRank('veil-ghost');
    for (let index = 0; index < ghostThread; index += 1) this._createProjectile({ owner: 'player', kind: 'shade-knife', x: player.x, y: player.y, angle: player.facing + (index ? 0.18 : -0.18), speed: 680, radius: 7, life: 0.72, delay: 0.16 + index * 0.12, damage: this.getStats().power * 0.68, pierce: 1, color: kit.color, mark: 2 });
    if (player.primary === 'veilrunner' && this.hasPower('riftglass')) this._createProjectile({ owner: 'player', kind: 'riftglass-echo', x: player.x, y: player.y, angle: player.facing, speed: 770, radius: 8, life: 0.9, delay: 0.24, damage: this.getStats().power * 1.05, pierce: 2, bounce: 1, color: kit.color, mark: 3 });
    this._setAnimation('dodge', player.dash.time);
    this.emit('sound', { id: 'dodge' });
    this._pushEffect({ kind: 'afterimage', x: player.x, y: player.y, angle: player.facing, life: 0.4, maxLife: 0.4, color: kit.color });
    if (player.primary === 'thornseer') this._createHazard({ owner: 'player', kind: 'trail', x: player.x, y: player.y, radius: 54, life: 2.6, tick: 0.45, damage: this.getStats().power * 0.4, color: kit.color, slow: 0.2 });
    if (player.primary === 'gravebinder') {
      this._createHazard({ owner: 'player', kind: 'soul-trail', x: player.x, y: player.y, radius: 58, life: 2.8 + this.getTalentRank('grave-quiet') * 0.45, tick: 0.42, damage: this.getStats().power * 0.44, color: kit.color, slow: 0.24, mark: 2.5 });
      if (this.getTalentRank('grave-quiet')) this._gainResource(4 * this.getTalentRank('grave-quiet'));
    }
    if (player.primary === 'dawnstrider') {
      this._createHazard({ owner: 'player', kind: 'lightstep-flare', x: player.x, y: player.y, radius: 62, life: 0.72, tick: 0.24, damage: this.getStats().power * (0.48 + this.getTalentRank('dawn-quickstep') * 0.2), color: kit.color, slow: 0.15, mark: 2.7 });
      if (this.hasPower('orison-chain')) this._createProjectile({ owner: 'player', kind: 'orison-echo', x: player.x, y: player.y, angle: player.facing, speed: 720, radius: 8, life: 0.76, delay: 0.16, damage: this.getStats().power * 0.88, pierce: 1, color: kit.color, mark: 2.8, homing: 0.18 });
    }
    if (player.primary === 'veilrunner' && this.getTalentRank('veil-silent-road') && player.dodgeCount % 3 === 0) {
      this._createProjectile({ owner: 'player', kind: 'silent-road-echo', x: player.x, y: player.y, angle: player.facing, speed: 730, radius: 8, life: 0.82, delay: 0.18, damage: this.getStats().power * 0.92, pierce: 1, bounce: 1, color: kit.color, mark: 2.4 });
    }
    const stats = this.getStats();
    if (this._rollFatedProc('dashNova', stats)) {
      this._createHazard({ owner: 'player', kind: 'fated-rift', x: player.x, y: player.y, radius: 88, life: 1.25, tick: 0.3, damage: stats.power * 0.58, color: '#ca92ff', slow: 0.22, mark: 2.4, noFatedProc: true });
      this._pushEffect({ kind: 'affix-dash-nova', x: player.x, y: player.y, life: 0.46, maxLife: 0.46, color: '#ca92ff' });
    }
    this._emitBurst(player.x, player.y, kit.color, 9, 120);
    this._gainClassMechanic('dodge');
    this._recordTutorial('dodge');
  }

  _updateDash(dt) {
    const player = this.player;
    const dash = player.dash;
    dash.time -= dt;
    this._moveBodyWithGeometry(player,
      clamp(player.x + dash.x * dash.speed * dt, 35, WORLD_SIZE.width - 35),
      clamp(player.y + dash.y * dash.speed * dt, 35, WORLD_SIZE.height - 35));
    if (this.clock % 0.055 < dt) this._pushEffect({ kind: 'afterimage', x: player.x, y: player.y, angle: player.facing, life: 0.28, maxLife: 0.28, color: this.getPrimaryClass().color });
    this.entities.enemies.forEach((enemy) => {
      if (enemy.dead || dash.hit.has(enemy.id) || distance(player, enemy) > player.radius + enemy.radius + 10) return;
      dash.hit.add(enemy.id);
      const multiplier = player.primary === 'veilrunner' ? 0.9 : player.primary === 'ironbound' ? 1.3 * this.getStats().dashDamage : player.primary === 'dawnstrider' ? 0.88 * this.getStats().dashDamage : player.primary === 'gravebinder' ? 0.78 : 0.65;
      this._damageEnemy(enemy, this.getStats().power * multiplier, { stagger: 1.3, mark: player.primary === 'veilrunner' || player.primary === 'dawnstrider' ? 2.6 : 0, source: player.primary === 'gravebinder' ? 'soul-hex' : 'dash', color: this.getPrimaryClass().color });
      if (player.primary === 'ironbound' && this.getTalentRank('iron-vanguard')) this._createHazard({ owner: 'player', kind: 'vanguard-shockwave', x: enemy.x, y: enemy.y, radius: 62, life: 0.48, tick: 0.22, damage: this.getStats().power * 0.46 * this.getTalentRank('iron-vanguard'), color: this.getPrimaryClass().color, slow: 0.18, knockdown: 0.16 });
    });
    if (dash.time <= 0) player.dash = null;
  }

  _hybridSignature(resolved = false) {
    const player = this.player;
    const hybrid = this.getHybrid();
    const cost = 26;
    if (!resolved && this.presentation) {
      if (player.resource < cost) { this.notify(`Not enough ${this.getPrimaryClass().resource}.`, 'warning'); return false; }
      return this._queuePresentedAction('hybrid', () => this._hybridSignature(true), { soundId: 'hybrid' });
    }
    if (!this._canSpend(cost)) return;
    const imprint = this.getImprint('hybrid');
    const mastery = this.getMastery('hybrid');
    const doctrine = this.getMasteryDoctrine('hybrid');
    const charged = player.confluence > 0;
    if (charged) player.confluence -= 1;
    player.cooldowns.hybrid = hybrid.signature.cooldown * (1 - Math.min(0.16, (mastery?.rank ?? 0) * 0.032)) * (charged ? 0.72 : 1);
    if (!resolved) { this._setAnimation('hybrid', 0.56); this.emit('sound', { id: 'hybrid' }); }
    const stats = this.getStats();
    let hybridPower = stats.power * stats.hybridDamage * (imprint?.id === 'overcharge' ? 1.26 : 1) * (1 + (mastery?.rank ?? 0) * 0.1)
      * (charged ? 1.28 * stats.confluenceDamage : 1);
    const target = this._abilityTarget(240);
    const briarWrit = this.hasPower('briar-writ');
    const covenantAnvil = this.hasPower('covenant-anvil');
    const gallowsKey = this.hasPower('gallows-key');
    switch (hybrid.id) {
      case 'briar-oath':
        this._createHazard({ owner: 'player', kind: 'thornwall', x: target.x, y: target.y, radius: 118, life: 6.5 * (briarWrit ? 1.35 : 1), tick: 0.38, damage: hybridPower * 0.9, color: hybrid.color, slow: 0.3, barrier: stats.hp * 0.12, thornwall: true, retaliationCount: briarWrit ? 3 : 1 });
        player.barrier += stats.hp * 0.18;
        player.barrierTime = Math.max(player.barrierTime, 5.8);
        break;
      case 'cairn-covenant':
        this._createHazard({ owner: 'player', kind: 'cairn', x: target.x, y: target.y, radius: 132, life: 3.8, tick: 0.32, damage: hybridPower * 1.1, color: hybrid.color, slow: 0.38, knockdown: 0.4 });
        if (covenantAnvil) this._createHazard({ owner: 'player', kind: 'armor-shard', x: player.x, y: player.y, radius: 86, life: 5.2, tick: 0.42, damage: hybridPower * 0.54, color: hybrid.color, slow: 0.2, barrier: stats.hp * 0.07 });
        player.barrier += stats.hp * 0.16;
        player.barrierTime = 3.8;
        break;
      case 'riftchain':
        this._damageArc(player, 156, 2.9, hybridPower * 1.65, { mark: 4, stagger: 1.2, color: hybrid.color });
        this._pushEffect({ kind: 'chain-reprise', x: player.x, y: player.y, angle: player.facing, life: 0.72, maxLife: 0.72, color: hybrid.color });
        if (this.hasPower('chain-refrain')) {
          const reprise = this.entities.enemies.filter((enemy) => !enemy.dead && enemy.marked > 0).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
          if (reprise) this._damageEnemy(reprise, hybridPower * 0.82, { mark: 3, stagger: 0.9, source: 'chain-refrain', color: hybrid.color });
        }
        break;
      case 'blood-bastion':
        this._createHazard({ owner: 'player', kind: 'citadel', x: target.x, y: target.y, radius: 142, life: 6.2, tick: 0.36, damage: hybridPower * 0.92, color: hybrid.color, heal: this.hasPower('red-bastion') ? 8 : 5, slow: 0.23, barrier: stats.hp * 0.08 });
        player.hp = clamp(player.hp + stats.hp * 0.05, 0, player.maxHp);
        break;
      case 'nightbloom':
        this._createHazard({ owner: 'player', kind: 'orchid', x: target.x, y: target.y, radius: 92, life: 4.8, tick: 0.31, damage: hybridPower * 1.05, color: hybrid.color, slow: 0.28, mark: 4 });
        this._createProjectile({ owner: 'player', kind: 'shade-seed', x: player.x, y: player.y, angle: player.facing, speed: 500, radius: 12, life: 1.1, damage: hybridPower * 1.25, pierce: 1, color: hybrid.color, mark: 4 });
        break;
      case 'black-rampart':
        this._damageArc(player, 150, 2.55, hybridPower * 1.55, { stagger: 2.2, mark: 3, color: hybrid.color, pull: 150, source: 'hybrid', suspendElites: gallowsKey });
        player.buffs.push({ id: 'speed', time: 3.6 });
        player.barrier += stats.hp * 0.1;
        player.barrierTime = 3.6;
        break;
      case 'graveguard':
        this._createHazard({ owner: 'player', kind: 'ward-graveguard', x: target.x, y: target.y, radius: 126, life: 6.2, tick: 0.36, damage: hybridPower * 0.86, color: hybrid.color, slow: 0.28, mark: 3.4, barrier: stats.hp * 0.15, thornwall: true, retaliationCount: this.hasPower('graveguard-ward') ? 3 : 1 });
        player.barrier += stats.hp * (this.hasPower('graveguard-ward') ? 0.24 : 0.18) * stats.ward;
        player.barrierTime = Math.max(player.barrierTime, 5.8);
        break;
      case 'blightweaver':
        this._createHazard({ owner: 'player', kind: 'carrion-bloom', x: target.x, y: target.y, radius: 126, life: 5.5, tick: 0.34, damage: hybridPower * 1.02, color: hybrid.color, slow: 0.34, mark: 3.5 });
        this._createProjectile({ owner: 'player', kind: 'carrion-hex', x: player.x, y: player.y, angle: player.facing, speed: 610, radius: 10, life: 0.96, damage: hybridPower * 0.88, pierce: 1, split: this.hasPower('blightweaver-spread') ? 3 : 1, color: hybrid.color, mark: 3.6, homing: 0.18 });
        break;
      case 'ossuary':
        this._damageArc(player, 164, 2.55, hybridPower * 1.48, { stagger: 2.5, mark: 3.2, pull: this.hasPower('ossuary-pulse') ? 180 : 90, source: 'hybrid', color: hybrid.color });
        this._createHazard({ owner: 'player', kind: 'ossuary-cairn', x: target.x, y: target.y, radius: 112, life: 3.4, tick: 0.34, damage: hybridPower * 0.72, color: hybrid.color, slow: 0.32, knockdown: 0.22 });
        if (this.hasPower('ossuary-pulse')) this._createHazard({ owner: 'player', kind: 'marrow-pulse', x: target.x, y: target.y, radius: 92, life: 0.72, tick: 0.22, damage: hybridPower * 0.74, color: hybrid.color, slow: 0.38, knockdown: 0.22 });
        break;
      case 'wraithblade':
        this._damageArc(player, 150, 2.85, hybridPower * 1.56, { stagger: 1.5, mark: 4, source: 'soul-hex', color: hybrid.color, armorPierce: 0.34 });
        [-0.18, 0.18].forEach((offset) => this._createProjectile({ owner: 'player', kind: 'wraith-hex', x: player.x, y: player.y, angle: player.facing + offset, speed: 720, radius: 8, life: 0.82, damage: hybridPower * 0.62, pierce: 1, color: hybrid.color, mark: 3, homing: 0.17 }));
        break;
      case 'dawn-aegis':
        this._createHazard({ owner: 'player', kind: 'ward-sunward', x: target.x, y: target.y, radius: 124, life: 5.8, tick: 0.36, damage: hybridPower * 0.94, color: hybrid.color, slow: 0.24, mark: 3.5, barrier: stats.hp * 0.16, thornwall: this.hasPower('dawn-aegis-ward') });
        player.barrier += stats.hp * 0.21 * stats.ward;
        player.barrierTime = Math.max(player.barrierTime, 5.6);
        if (this.hasPower('dawn-aegis-ward')) this._createProjectile({ owner: 'player', kind: 'sunward-javelin', x: player.x, y: player.y, angle: player.facing, speed: 760, radius: 9, life: 0.9, damage: hybridPower * 0.7, pierce: 2, color: hybrid.color, mark: 3.4, homing: 0.14 });
        break;
      case 'eclipse-chorus':
        this._createHazard({ owner: 'player', kind: 'vesper-bloom', x: target.x, y: target.y, radius: 132, life: 5.6, tick: 0.3, damage: hybridPower * 1.0, color: hybrid.color, slow: 0.33, mark: 4 });
        if (this.hasPower('eclipse-chorus-prism')) [-0.22, 0.22].forEach((offset) => this._createProjectile({ owner: 'player', kind: 'vesper-hex', x: target.x, y: target.y, angle: player.facing + offset, speed: 620, radius: 8, life: 0.78, damage: hybridPower * 0.58, pierce: 1, color: hybrid.color, mark: 3, homing: 0.16 }));
        break;
      case 'sunforge':
        this._damageArc(player, 158, 2.4, hybridPower * 1.58, { stagger: 2.4, mark: 3, source: 'hybrid', color: hybrid.color, knockdown: 0.26 });
        this._createHazard({ owner: 'player', kind: 'anvilflare', x: target.x, y: target.y, radius: 120, life: 3.8, tick: 0.32, damage: hybridPower * 0.78, color: hybrid.color, slow: 0.27, barrier: this.hasPower('sunforge-anvil') ? stats.hp * 0.08 : 0 });
        if (this.hasPower('sunforge-anvil')) this._gainResource(player.maxResource * 0.12);
        break;
      case 'gilded-shade':
        this._damageArc(player, 142, 2.7, hybridPower * 1.36, { stagger: 1.4, mark: 4, source: 'hybrid', color: hybrid.color, armorPierce: 0.25 });
        [-0.28, 0, 0.28].forEach((offset) => this._createProjectile({ owner: 'player', kind: 'goldleaf-knife', x: player.x, y: player.y, angle: player.facing + offset, speed: 780, radius: 8, life: 0.78, damage: hybridPower * 0.55, pierce: 1, color: hybrid.color, mark: 3.3, homing: 0.14 }));
        if (this.hasPower('gilded-shade-fan')) [-0.48, 0.48].forEach((offset) => this._createProjectile({ owner: 'player', kind: 'goldleaf-knife', x: player.x, y: player.y, angle: player.facing + offset, speed: 760, radius: 7, life: 0.72, damage: hybridPower * 0.48, pierce: 1, color: hybrid.color, mark: 3 }));
        break;
      case 'requiem': {
        const count = this.entities.enemies.filter((enemy) => !enemy.dead && enemy.marked > 0 && enemy.cursed > 0 && distance(enemy, target) < 220).length;
        this._createHazard({ owner: 'player', kind: 'litany-ash', x: target.x, y: target.y, radius: 138, life: 5.1, tick: 0.32, damage: hybridPower * 1.04, color: hybrid.color, slow: 0.3, mark: 4 });
        const heal = stats.hp * (0.05 + Math.min(0.15, count * 0.025) * (this.hasPower('requiem-revive') ? 1.5 : 1));
        player.hp = clamp(player.hp + heal, 0, player.maxHp);
        player.barrier += stats.hp * 0.08 * stats.ward;
        player.barrierTime = Math.max(player.barrierTime, 3.8);
        break;
      }
      default:
        break;
    }
    if (imprint?.id === 'bulwark') {
      player.barrier += stats.hp * 0.1;
      player.barrierTime = Math.max(player.barrierTime, 3.5);
    }
    if (this.getTalentRank('warden-oathforge')) {
      player.barrier += stats.hp * 0.1;
      player.barrierTime = Math.max(player.barrierTime, 4.5);
    }
    if (this.getTalentRank(`${hybrid.id}-aegis`)) {
      player.barrier += stats.hp * 0.12;
      player.barrierTime = Math.max(player.barrierTime, 5);
    }
    if (charged && doctrine?.id === 'aegis') {
      player.barrier += stats.hp * 0.14 * stats.ward;
      player.barrierTime = Math.max(player.barrierTime, 5.5);
    }
    if (charged && doctrine?.id === 'ruin') {
      this._createHazard({ owner: 'player', kind: 'resonant-rupture', x: target.x, y: target.y, radius: 112, life: 1.35, tick: 0.55, damage: hybridPower * 0.68, color: hybrid.color, slow: 0.28, mark: 3, masteryEruption: true });
    }
    if (charged && this.hasPower('heart-of-the-unrung')) {
      this._createHazard({ owner: 'player', kind: 'unrung-echo', x: target.x, y: target.y, radius: 96, life: 0.78, tick: 0.5, damage: hybridPower * 0.45, color: '#f06fca', slow: 0.2, mark: 2, masteryEruption: true });
      this._pushEffect({ kind: 'confluence-echo', x: target.x, y: target.y, life: 0.78, maxLife: 0.78, color: '#f06fca' });
    }
    if (imprint?.id === 'refraction') [-0.28, 0, 0.28].forEach((offset) => this._createProjectile({ owner: 'player', kind: 'covenant-shard', x: player.x, y: player.y, angle: player.facing + offset, speed: 570, radius: 8, life: 0.8, damage: stats.power * 0.68, pierce: 1, color: hybrid.color, mark: 2 }));
    if (imprint?.id === 'confluence') {
      player.hybridCharge = (player.hybridCharge ?? 0) + 1;
      player.status.confluenceEcho = 5;
      if (player.hybridCharge >= 3) {
        player.hybridCharge = 0;
        player.cooldowns.hybrid = 0;
        this.notify('Confluence Engine renews your hybrid signature.', 'accent');
      }
    }
    this._emitBurst(target.x, target.y, hybrid.color, 28, 195);
    this.notify(`${hybrid.signature.name}${charged ? ' — Confluence-charged!' : '!'} `, 'accent');
    this._recordCombatAction('hybrid');
  }

  _hybridUltimate(resolved = false) {
    const player = this.player;
    const hybrid = this.getHybrid();
    // Several light-resource oaths begin below 66 maximum resource.  An
    // ultimate should be expensive, not unusable until a lucky item drops.
    // The ceiling keeps the original endgame cost while guaranteeing every
    // starting pair can cast it from a full resource bar.
    const cost = Math.min(66, Math.max(1, Math.floor(player.maxResource * 0.9)));
    if (!resolved && this.presentation) {
      if (player.resource < cost) { this.notify(`Not enough ${this.getPrimaryClass().resource}.`, 'warning'); return false; }
      return this._queuePresentedAction('ultimate', () => this._hybridUltimate(true), { soundId: 'ultimate', stingerId: 'ultimate' });
    }
    if (!this._canSpend(cost)) return;
    this._applyUniqueBehaviorEvent('ultimate', { slot: 'ultimate', covenant: player.covenant });
    const imprint = this.getImprint('ultimate');
    const mastery = this.getMastery('ultimate');
    const doctrine = this.getMasteryDoctrine('ultimate');
    player.cooldowns.ultimate = hybrid.ultimate.cooldown * (1 - Math.min(0.15, (mastery?.rank ?? 0) * 0.03));
    if (!resolved) { this._setAnimation('ultimate', 0.75); this.emit('sound', { id: 'ultimate' }); }
    const stats = this.getStats();
    const ultimatePower = stats.power * stats.ultimateDamage * (imprint?.id === 'cataclysm' ? 1.22 : 1) * (1 + (mastery?.rank ?? 0) * 0.08);
    const target = this._abilityTarget(320);
    switch (hybrid.id) {
      case 'briar-oath':
        this._createHazard({ owner: 'player', kind: 'verdict', x: target.x, y: target.y, radius: 224, life: 8, tick: 0.26, damage: ultimatePower * 1.15, color: hybrid.color, slow: 0.52, mark: 5, knockdown: 0.3 });
        break;
      case 'cairn-covenant':
        this._createHazard({ owner: 'player', kind: 'bastion', x: player.x, y: player.y, follow: true, radius: 178, life: 8, tick: 0.3, damage: ultimatePower * 1.05, color: hybrid.color, barrier: stats.hp * 0.48, slow: 0.4 });
        player.barrier += stats.hp * 0.4;
        player.barrierTime = 8;
        break;
      case 'riftchain': {
        const targets = this.entities.enemies.filter((enemy) => !enemy.dead && distance(enemy, player) < 510).sort((a, b) => distance(a, player) - distance(b, player)).slice(0, 8);
        targets.forEach((enemy, index) => {
          this._pushEffect({ kind: 'chain-strike', x: enemy.x, y: enemy.y, life: 0.38 + index * 0.07, maxLife: 0.38 + index * 0.07, color: hybrid.color });
          this._damageEnemy(enemy, ultimatePower * 2.35, { mark: 5, stagger: 2, source: 'ultimate', color: hybrid.color, armorPierce: 0.55 });
        });
        break;
      }
      case 'blood-bastion':
        this._createHazard({ owner: 'player', kind: 'red-siege', x: player.x, y: player.y, follow: true, radius: 190, life: 8.5, tick: 0.28, damage: ultimatePower * 1.25, color: hybrid.color, heal: 7, barrier: stats.hp * 0.3, slow: 0.38 });
        player.barrier += stats.hp * 0.28;
        player.barrierTime = 8.5;
        break;
      case 'nightbloom':
        this._createHazard({ owner: 'player', kind: 'eclipse', x: target.x, y: target.y, radius: 232, life: 8, tick: 0.24, damage: ultimatePower * 1.05, color: hybrid.color, slow: 0.5, mark: 5 });
        for (let index = 0; index < 9; index += 1) this._createProjectile({ owner: 'player', kind: 'lunar-shade', x: player.x, y: player.y, angle: index / 9 * Math.PI * 2, speed: 470, radius: 10, life: 1.2, damage: ultimatePower * 1.3, pierce: 1, color: hybrid.color, mark: 4 });
        break;
      case 'black-rampart':
        this._createHazard({ owner: 'player', kind: 'night-siege', x: player.x, y: player.y, follow: true, radius: 205, life: 8, tick: 0.25, damage: ultimatePower * 1.28, color: hybrid.color, slow: 0.42, knockdown: 0.4 });
        player.buffs.push({ id: 'speed', time: 8 });
        player.barrier += stats.hp * 0.24;
        player.barrierTime = 8;
        break;
      case 'graveguard':
        this._createHazard({ owner: 'player', kind: 'ward-citadel-names', x: player.x, y: player.y, follow: true, radius: 194, life: 8.3, tick: 0.28, damage: ultimatePower * 1.14, color: hybrid.color, slow: 0.42, mark: 5, barrier: stats.hp * 0.42, thornwall: true, retaliationCount: 3 });
        player.barrier += stats.hp * 0.36 * stats.ward;
        player.barrierTime = 8.3;
        break;
      case 'blightweaver':
        this._createHazard({ owner: 'player', kind: 'funeral-garden', x: target.x, y: target.y, radius: 224, life: 8, tick: 0.24, damage: ultimatePower * 1.18, color: hybrid.color, slow: 0.52, mark: 5 });
        for (let index = 0; index < 7; index += 1) this._createProjectile({ owner: 'player', kind: 'funeral-hex', x: player.x, y: player.y, angle: index / 7 * Math.PI * 2, speed: 480, radius: 9, life: 1.1, damage: ultimatePower * 0.9, pierce: 1, color: hybrid.color, mark: 4, homing: 0.18 });
        break;
      case 'ossuary':
        this._createHazard({ owner: 'player', kind: 'bone-siege', x: player.x, y: player.y, follow: true, radius: 202, life: 8.2, tick: 0.25, damage: ultimatePower * 1.26, color: hybrid.color, slow: 0.43, knockdown: 0.38, barrier: stats.hp * 0.28 });
        player.barrier += stats.hp * 0.28;
        player.barrierTime = 8.2;
        break;
      case 'wraithblade': {
        const targets = this.entities.enemies.filter((enemy) => !enemy.dead && distance(enemy, player) < 520).sort((a, b) => (b.cursed + b.marked) - (a.cursed + a.marked) || distance(a, player) - distance(b, player)).slice(0, 9);
        targets.forEach((enemy, index) => {
          this._pushEffect({ kind: 'chain-strike', x: enemy.x, y: enemy.y, life: 0.35 + index * 0.05, maxLife: 0.35 + index * 0.05, color: hybrid.color });
          this._damageEnemy(enemy, ultimatePower * 2.14, { mark: 5, stagger: 1.8, source: 'soul-hex', color: hybrid.color, armorPierce: 0.48 });
        });
        break;
      }
      case 'dawn-aegis':
        this._createHazard({ owner: 'player', kind: 'ward-last-sunrise', x: player.x, y: player.y, follow: true, radius: 198, life: 8, tick: 0.27, damage: ultimatePower * 1.12, color: hybrid.color, slow: 0.38, mark: 5, barrier: stats.hp * 0.46, thornwall: true, retaliationCount: 3 });
        player.barrier += stats.hp * 0.42 * stats.ward;
        player.barrierTime = 8;
        break;
      case 'eclipse-chorus':
        this._createHazard({ owner: 'player', kind: 'crown-eclipse', x: target.x, y: target.y, radius: 230, life: 8, tick: 0.23, damage: ultimatePower * 1.16, color: hybrid.color, slow: 0.5, mark: 5 });
        for (let index = 0; index < 8; index += 1) this._createProjectile({ owner: 'player', kind: 'eclipse-hex', x: player.x, y: player.y, angle: index / 8 * Math.PI * 2, speed: 500, radius: 9, life: 1.15, damage: ultimatePower * 0.82, pierce: 1, color: hybrid.color, mark: 4, homing: 0.15 });
        break;
      case 'sunforge':
        this._createHazard({ owner: 'player', kind: 'noon-siege', x: player.x, y: player.y, follow: true, radius: 204, life: 8.2, tick: 0.25, damage: ultimatePower * 1.3, color: hybrid.color, slow: 0.4, knockdown: 0.34, barrier: stats.hp * 0.32 });
        player.barrier += stats.hp * 0.3;
        player.barrierTime = 8.2;
        this._gainResource(player.maxResource * 0.28);
        break;
      case 'gilded-shade': {
        const targets = this.entities.enemies.filter((enemy) => !enemy.dead && distance(enemy, player) < 540).sort((a, b) => distance(a, player) - distance(b, player)).slice(0, 10);
        targets.forEach((enemy, index) => {
          this._pushEffect({ kind: 'chain-strike', x: enemy.x, y: enemy.y, life: 0.32 + index * 0.045, maxLife: 0.32 + index * 0.045, color: hybrid.color });
          this._damageEnemy(enemy, ultimatePower * 2.05, { mark: 5, stagger: 1.7, source: 'ultimate', color: hybrid.color, armorPierce: 0.5 });
        });
        break;
      }
      case 'requiem':
        this._createHazard({ owner: 'player', kind: 'choir-unrung', x: target.x, y: target.y, radius: 228, life: 8.1, tick: 0.24, damage: ultimatePower * 1.2, color: hybrid.color, slow: 0.5, mark: 5, heal: 8, barrier: stats.hp * 0.28 });
        player.barrier += stats.hp * 0.26 * stats.ward;
        player.barrierTime = 8.1;
        if (this.hasPower('requiem-revive')) player.hp = clamp(player.hp + stats.hp * 0.16, 0, player.maxHp);
        break;
      default:
        break;
    }
    if (imprint?.id === 'aftershock' || doctrine?.id === 'cataclysm' || this.hasPower('crown-of-noon')) this._createHazard({ owner: 'player', kind: 'aftershock', x: target.x, y: target.y, radius: doctrine?.id === 'cataclysm' ? 142 : 128, life: this.hasPower('crown-of-noon') ? 3.1 : 2.5, tick: 0.42, damage: ultimatePower * (doctrine?.id === 'cataclysm' ? 1.02 : this.hasPower('crown-of-noon') ? 0.94 : 0.82), color: hybrid.color, slow: 0.32, mark: 2, masteryEruption: doctrine?.id === 'cataclysm' || this.hasPower('crown-of-noon') });
    if (imprint?.id === 'ascendant') this._createHazard({ owner: 'player', kind: 'covenant-avatar', x: player.x, y: player.y, follow: true, radius: 78, life: 5.4, tick: 0.38, damage: ultimatePower * 0.58, color: hybrid.color, slow: 0.18, mark: 2 });
    if (doctrine?.id === 'resurgence') {
      this._gainResource(player.maxResource * 0.3);
      if (player.confluence < 3) {
        player.confluence += 1;
        this.notify('Resurgence forms a Confluence charge.', 'quiet');
      }
    }
    this.camera.shake = Math.max(this.camera.shake, 14);
    this.camera.flash = 0.25;
    this._emitBurst(target.x, target.y, hybrid.color, 48, 300);
    this.notify(`${hybrid.ultimate.name} — the covenant answers.`, 'accent');
    this._recordCombatAction('ultimate');
  }

  _potion(resolved = false) {
    const player = this.player;
    if (!player.potions) {
      this.notify('No potions remaining.', 'warning');
      return;
    }
    if (!resolved && this.presentation) return this._queuePresentedAction('potion', () => this._potion(true), { soundId: 'potion' });
    if (!resolved) { this._setAnimation('potion', 0.34); this.emit('sound', { id: 'potion' }); }
    player.cooldowns.potion = 1;
    player.potions -= 1;
    this._failContractBonuses('noPotion');
    const heal = this.getStats().hp * 0.42;
    player.hp = clamp(player.hp + heal, 0, player.maxHp);
    player.status.potionWard = 1.2;
    if (this._hasReforgedSpecial('expedition-blood-price') && this.endgame?.expedition) {
      this.endgame.rewardHeat = Math.min(99, (this.endgame.rewardHeat ?? 0) + 1);
      this.notify('Blood Price answers the flask: expedition Heat rises.', 'warning');
      this._emitReforgedUpdate();
    }
    this._float(player.x, player.y - 35, `+${Math.round(heal)}`, '#9fe3aa', 'heal');
    this._emitBurst(player.x, player.y, '#9fe3aa', 14, 110);
  }

  _abilityTarget(maxDistance) {
    const player = this.player;
    const pointer = { x: this.input.pointer.worldX, y: this.input.pointer.worldY };
    if (!this.input.pointer.active || !Number.isFinite(pointer.x)) return { ...player };
    const dx = pointer.x - player.x;
    const dy = pointer.y - player.y;
    const d = Math.hypot(dx, dy) || 1;
    const limit = Math.min(d, maxDistance);
    const targetX = player.x + dx / d * limit;
    const targetY = player.y + dy / d * limit;
    const clipped = this.worldGeometry?.clipSegment?.(player.x, player.y, targetX, targetY, 8, this);
    return clipped ? { x: clipped.x, y: clipped.y } : { x: targetX, y: targetY };
  }

  _gainResource(amount, multiplier = 1) {
    const stats = this.getStats();
    this.player.resource = clamp(this.player.resource + amount * multiplier * stats.resourceGain, 0, this.player.maxResource);
  }

  _pushEffect(effect) {
    if (this.entities.effects.length >= MAX_EFFECTS) return null;
    this.entities.effects.push(effect);
    return effect;
  }

  _damageArc(origin, radius, arc, amount, options = {}) {
    let hits = 0;
    const originAngle = origin.facing ?? this.player.facing;
    this._pushEffect({ kind: 'arc', x: origin.x, y: origin.y, angle: originAngle, radius, arc, life: 0.2, maxLife: 0.2, color: options.color ?? '#ffffff' });
    this.entities.enemies.forEach((enemy) => {
      if (enemy.dead || distance(origin, enemy) > radius + enemy.radius) return;
      const difference = Math.abs(wrapAngle(angleTo(origin, enemy) - originAngle));
      if (difference > arc * 0.5) return;
      if (this.worldGeometry?.segmentBlocked?.(origin.x, origin.y, enemy.x, enemy.y, 4, this)) return;
      hits += this._damageEnemy(enemy, amount, { ...options, source: options.source ?? 'attack' }) ? 1 : 0;
    });
    (this.entities.destructibles ?? []).forEach((destructible) => {
      if (destructible.broken || distance(origin, destructible) > radius + destructible.radius) return;
      const difference = Math.abs(wrapAngle(angleTo(origin, destructible) - originAngle));
      if (difference > arc * 0.5) return;
      if (this.worldGeometry?.segmentBlocked?.(origin.x, origin.y, destructible.x, destructible.y, 4, this)) return;
      this._damageDestructible(destructible, (options.stagger ?? 0) >= 1.2 ? 2 : 1, options.source ?? 'attack');
    });
    if (hits) this.camera.shake = Math.max(this.camera.shake, Math.min(7, 2 + hits));
    return hits;
  }

  _createProjectile(data) {
    if (this.entities.projectiles.length >= MAX_PROJECTILES) return null;
    this.entities.projectiles.push({
      id: uid('projectile'), x: data.x, y: data.y, vx: Math.cos(data.angle) * data.speed, vy: Math.sin(data.angle) * data.speed,
      angle: data.angle, radius: data.radius ?? 8, life: data.life ?? 1, maxLife: data.life ?? 1, owner: data.owner,
      kind: data.kind ?? 'bolt', damage: data.damage ?? 1, pierce: data.pierce ?? 0, bounce: data.bounce ?? 0,
      split: data.split ?? 0, pull: data.pull ?? 0, mark: data.mark ?? 0, color: data.color ?? '#fff', hit: new Set(), homing: data.homing ?? 0,
      delay: data.delay ?? 0, repeatOnCrit: data.repeatOnCrit ?? false, executioner: data.executioner === true, sunder: data.sunder === true, elite: data.elite ?? false, eventId: data.eventId ?? null,
      noFatedProc: data.noFatedProc === true, affixForked: data.affixForked === true, impactProfile: data.impactProfile ?? null,
      ignoreGeometry: data.ignoreGeometry === true
    });
    return this.entities.projectiles[this.entities.projectiles.length - 1];
  }

  _createHazard(data) {
    if (this.entities.hazards.length >= MAX_HAZARDS) return null;
    this.entities.hazards.push({
      id: uid('hazard'), owner: data.owner, kind: data.kind ?? 'ground', x: data.x, y: data.y, radius: (data.radius ?? 80) * (data.owner === 'player' ? (this.getStats()?.area ?? 1) : 1),
      life: data.life ?? 3, maxLife: data.life ?? 3, tick: data.tick ?? 0.5, tickLeft: 0, damage: data.damage ?? 1,
      color: data.color ?? '#fff', slow: data.slow ?? 0, heal: data.heal ?? 0, barrier: data.barrier ?? 0,
      mark: data.mark ?? 0, knockdown: data.knockdown ?? 0, follow: data.follow ?? false, followEnemyId: data.followEnemyId ?? null,
      thornwall: data.thornwall ?? false, retaliationCount: integer(data.retaliationCount, 1, 1, 4),
      echoOnExpire: data.echoOnExpire === true, echoed: data.echoed === true,
      masteryEruption: data.masteryEruption === true, masteryPulsed: data.masteryPulsed === true,
      noFatedProc: data.noFatedProc === true
    });
    return this.entities.hazards[this.entities.hazards.length - 1];
  }

  _updateProjectiles(dt) {
    const player = this.player;
    const stats = this.getStats();
    this.entities.projectiles.forEach((projectile) => {
      if (projectile.delay > 0) {
        projectile.delay -= dt;
        return;
      }
      projectile.life -= dt;
      if (projectile.owner === 'player' && projectile.homing > 0) {
        const target = this.entities.enemies.filter((enemy) => !enemy.dead && !projectile.hit.has(enemy.id)).sort((a, b) => {
          const aPriority = (a.marked > 0 || a.cursed > 0) ? -170 : 0;
          const bPriority = (b.marked > 0 || b.cursed > 0) ? -170 : 0;
          return distance(projectile, a) + aPriority - (distance(projectile, b) + bPriority);
        })[0];
        if (target && distance(projectile, target) < 520) {
          const speed = Math.hypot(projectile.vx, projectile.vy);
          const desired = angleTo(projectile, target);
          projectile.angle += wrapAngle(desired - projectile.angle) * Math.min(1, projectile.homing * dt * 12);
          projectile.vx = Math.cos(projectile.angle) * speed;
          projectile.vy = Math.sin(projectile.angle) * speed;
        }
      }
      const previousX = projectile.x; const previousY = projectile.y;
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      projectile.angle = Math.atan2(projectile.vy, projectile.vx);
      if (!projectile.ignoreGeometry && this.worldGeometry?.segmentBlocked?.(previousX, previousY, projectile.x, projectile.y, Math.max(2, projectile.radius * .62), this)) {
        projectile.life = 0;
        this._pushEffect({ kind: 'wall-impact', x: previousX, y: previousY, angle: projectile.angle, life: .22, maxLife: .22, color: projectile.color });
        return;
      }
      if (projectile.owner === 'player') {
        let hitThisFrame = false;
        const breakable = (this.entities.destructibles ?? []).find((entry) => !entry.broken && !projectile.hit.has(entry.id) && distance(projectile, entry) <= projectile.radius + entry.radius);
        if (breakable) {
          projectile.hit.add(breakable.id);
          this._damageDestructible(breakable, projectile.kind.includes('harpoon') || projectile.kind.includes('javelin') ? 2 : 1, projectile.kind);
          if (projectile.pierce <= 0) projectile.life = 0;
          else projectile.pierce -= 1;
          hitThisFrame = true;
        }
        this.entities.enemies.forEach((enemy) => {
          if (hitThisFrame || enemy.dead || projectile.hit.has(enemy.id) || distance(projectile, enemy) > projectile.radius + enemy.radius) return;
          projectile.hit.add(enemy.id);
          hitThisFrame = true;
          this._damageEnemy(enemy, projectile.damage, {
            mark: projectile.mark, pull: projectile.pull, stagger: projectile.kind === 'harpoon' ? 1.5 : 0.65,
            source: projectile.kind, color: projectile.color, executioner: projectile.executioner, sunder: projectile.sunder, noFatedProc: projectile.noFatedProc, impactProfile: projectile.impactProfile
          });
          if (!projectile.affixForked && !projectile.noFatedProc && this._rollFatedProc('projectileFork', stats)) {
            projectile.affixForked = true;
            const forks = this.entities.enemies.filter((candidate) => !candidate.dead && candidate.id !== enemy.id && !projectile.hit.has(candidate.id) && distance(candidate, enemy) < 330)
              .sort((a, b) => distance(a, enemy) - distance(b, enemy)).slice(0, 2);
            forks.forEach((target, index) => this._createProjectile({ owner: 'player', kind: 'fated-fork', x: enemy.x, y: enemy.y, angle: angleTo(enemy, target) + (index ? 0.05 : -0.05), speed: 690, radius: 7, life: 0.68, damage: projectile.damage * 0.48, pierce: 0, color: '#c7a7ff', mark: Math.max(1.4, projectile.mark * 0.7), homing: 0.18, noFatedProc: true }));
            if (forks.length) this._pushEffect({ kind: 'affix-projectile-fork', x: enemy.x, y: enemy.y, life: 0.36, maxLife: 0.36, color: '#c7a7ff' });
          }
          if ((projectile.kind === 'harpoon' || projectile.kind === 'echo-harpoon') && this.getTalentRank('iron-march') && !projectile.concussed) {
            projectile.concussed = true;
            this._createHazard({ owner: 'player', kind: 'chain-concussion', x: enemy.x, y: enemy.y, radius: 76, life: 0.48, tick: 0.24, damage: projectile.damage * 0.4, color: projectile.color, slow: 0.22, knockdown: 0.12 });
          }
          if ((projectile.kind === 'harpoon' || projectile.kind === 'echo-harpoon') && this.hasPower('ram-hunger') && !projectile.ramBurst) {
            projectile.ramBurst = true;
            this._createHazard({ owner: 'player', kind: 'ram-hunger-burst', x: enemy.x, y: enemy.y, radius: 88, life: 0.5, tick: 0.2, damage: projectile.damage * 0.58, color: '#e8be6b', slow: 0.24, knockdown: 0.18 });
          }
          if (projectile.kind === 'spirit' && this.hasPower('bell-sunder') && !projectile.returned) {
            projectile.returned = true;
            this._createProjectile({ owner: 'player', kind: 'returning-spirit', x: enemy.x, y: enemy.y, angle: angleTo(enemy, player), speed: 720, radius: 9, life: 0.8, damage: projectile.damage * 0.72, pierce: 1, color: projectile.color, mark: 4.2 });
            this._pushEffect({ kind: 'chain-reprise', x: enemy.x, y: enemy.y, life: 0.4, maxLife: 0.4, color: projectile.color });
          }
          if (projectile.kind === 'returning-javelin' && !projectile.returned) {
            projectile.returned = true;
            this._createProjectile({ owner: 'player', kind: 'dawn-return', x: enemy.x, y: enemy.y, angle: angleTo(enemy, player), speed: 760, radius: 9, life: 0.76, damage: projectile.damage * 0.72, pierce: 2, color: projectile.color, mark: projectile.mark * 0.82, homing: 0.16 });
            this._pushEffect({ kind: 'sunflare', x: enemy.x, y: enemy.y, life: 0.38, maxLife: 0.38, color: projectile.color });
          }
          if ((projectile.kind === 'radiant-javelin' || projectile.kind === 'returning-javelin' || projectile.kind === 'dawn-return') && enemy.lastPlayerCritical && this.getTalentRank('dawn-horizon') > 0 && !projectile.horizonSplit) {
            projectile.horizonSplit = true;
            this._createProjectile({ owner: 'player', kind: 'horizon-spear', x: enemy.x, y: enemy.y, angle: projectile.angle + 0.28, speed: 690, radius: 8, life: 0.72, damage: projectile.damage * 0.55, pierce: 1, color: projectile.color, mark: projectile.mark * 0.7 });
          }
          if (projectile.repeatOnCrit && enemy.lastPlayerCritical) {
            projectile.repeatOnCrit = false;
            this._createProjectile({ owner: 'player', kind: 'glass-echo', x: enemy.x, y: enemy.y, angle: projectile.angle, speed: 640, radius: 7, life: 0.7, damage: projectile.damage * 0.62, pierce: 1, color: projectile.color, mark: projectile.mark });
            this._pushEffect({ kind: 'afterimage', x: enemy.x, y: enemy.y, angle: projectile.angle, life: 0.32, maxLife: 0.32, color: projectile.color });
          }
          if (projectile.split > 0) {
            const spread = projectile.split;
            for (let index = 0; index < spread; index += 1) {
              const angle = projectile.angle + (index - (spread - 1) / 2) * 0.42;
              this._createProjectile({ owner: 'player', kind: 'split-hex', x: enemy.x, y: enemy.y, angle, speed: 520, radius: 7, life: 0.65, damage: projectile.damage * 0.45, pierce: 0, color: projectile.color, mark: projectile.mark * 0.7 });
            }
            projectile.split = 0;
          }
          if (projectile.bounce > 0) {
            const target = this.entities.enemies.find((candidate) => !candidate.dead && !projectile.hit.has(candidate.id) && distance(candidate, enemy) < 400);
            if (target) {
              const direction = normalize(target.x - enemy.x, target.y - enemy.y);
              projectile.x = enemy.x;
              projectile.y = enemy.y;
              const speed = Math.hypot(projectile.vx, projectile.vy);
              projectile.vx = direction.x * speed;
              projectile.vy = direction.y * speed;
              projectile.bounce -= 1;
              projectile.pierce += 1;
            }
          }
          if (projectile.pierce <= 0) projectile.life = 0;
          else projectile.pierce -= 1;
        });
      } else if (player.deathTime <= 0 && projectile.life > 0 && distance(projectile, player) < projectile.radius + player.radius) {
        const ward = this.entities.hazards.find((hazard) => hazard.owner === 'player' && hazard.kind.startsWith('ward') && distance(hazard, player) < hazard.radius);
        if (ward && this.hasPower('sanctuary-mirror') && !projectile.reflected) {
          projectile.reflected = true;
          projectile.owner = 'player';
          projectile.vx *= -1;
          projectile.vy *= -1;
          projectile.angle = Math.atan2(projectile.vy, projectile.vx);
          projectile.life = Math.max(projectile.life, 0.9);
          projectile.damage *= 1.35;
          this._pushEffect({ kind: 'mirror-flash', x: player.x, y: player.y, life: 0.34, maxLife: 0.34, color: '#94e7df' });
          this.notify('Sanctuary Mirror returns the bolt.', 'quiet');
          return;
        }
        this._damagePlayer(projectile.damage, projectile.kind);
        if (projectile.elite && projectile.split > 0) {
          for (let index = 0; index < 2; index += 1) this._createProjectile({ owner: 'enemy', kind: 'split-bolt', x: projectile.x, y: projectile.y, angle: projectile.angle + (index ? 0.38 : -0.38), speed: 360, radius: 6, life: 0.68, damage: projectile.damage * 0.45, color: projectile.color });
        }
        projectile.life = 0;
      }
      if (projectile.x < -80 || projectile.y < -80 || projectile.x > WORLD_SIZE.width + 80 || projectile.y > WORLD_SIZE.height + 80) projectile.life = 0;
    });
    this.entities.projectiles = this.entities.projectiles.filter((projectile) => projectile.life > 0);
  }

  _updateHazards(dt) {
    const player = this.player;
    this.entities.hazards.forEach((hazard) => {
      hazard.life -= dt;
      hazard.tickLeft -= dt;
      if (hazard.life <= 0) {
        if (hazard.owner === 'player' && hazard.echoOnExpire && !hazard.echoed) {
          hazard.echoed = true;
          this._createHazard({ owner: 'player', kind: `${hazard.kind}-echo`, x: hazard.x, y: hazard.y, radius: hazard.radius * 0.84, life: Math.max(1.2, hazard.maxLife * 0.52), tick: hazard.tick, damage: hazard.damage * 0.55, color: hazard.color, slow: hazard.slow, heal: hazard.heal * 0.45, barrier: hazard.barrier * 0.45, mark: hazard.mark, knockdown: hazard.knockdown, follow: false, thornwall: hazard.thornwall, retaliationCount: hazard.retaliationCount, echoOnExpire: false });
          this._pushEffect({ kind: 'echo-ground', x: hazard.x, y: hazard.y, life: 0.62, maxLife: 0.62, color: hazard.color });
        }
        return;
      }
      if (hazard.follow && hazard.owner === 'player') {
        hazard.x = player.x;
        hazard.y = player.y;
      }
      if (hazard.followEnemyId) {
        const target = this.entities.enemies.find((enemy) => enemy.id === hazard.followEnemyId && !enemy.dead);
        if (target) {
          hazard.x = target.x;
          hazard.y = target.y;
        } else hazard.followEnemyId = null;
      }
      if (hazard.tickLeft > 0 || hazard.life <= 0) return;
      hazard.tickLeft = hazard.tick;
      if (hazard.owner === 'player') {
        let touched = 0;
        const eruption = hazard.masteryEruption && !hazard.masteryPulsed;
        this.entities.enemies.forEach((enemy) => {
          if (enemy.dead || distance(hazard, enemy) > hazard.radius + enemy.radius) return;
          touched += 1;
          enemy.slow = Math.max(enemy.slow ?? 0, hazard.slow);
          this._damageEnemy(enemy, hazard.damage * (eruption ? 1.7 : 1), { mark: hazard.mark, stagger: eruption ? 1.05 : 0.42, knockdown: hazard.knockdown, source: hazard.kind, color: hazard.color, noFatedProc: hazard.noFatedProc });
        });
        if (eruption && touched) {
          hazard.masteryPulsed = true;
          this._pushEffect({ kind: 'mastery-eruption', x: hazard.x, y: hazard.y, radius: hazard.radius, life: 0.5, maxLife: 0.5, color: hazard.color });
        }
        if (hazard.heal && distance(hazard, player) < hazard.radius) {
          player.hp = clamp(player.hp + hazard.heal, 0, player.maxHp);
          if (player.primary === 'thornseer' && this.getTalentRank('thorn-quickening')) this._gainResource(4 * this.getTalentRank('thorn-quickening'));
          if (this.clock % 0.8 < dt) this._float(player.x, player.y - 28, `+${hazard.heal}`, '#a5e6ad', 'heal');
        }
        if (hazard.barrier && distance(hazard, player) < hazard.radius) {
          player.barrier = Math.max(player.barrier, hazard.barrier);
          player.barrierTime = Math.max(player.barrierTime, 0.8);
        }
        if (player.primary === 'warden' && this.getTalentRank('warden-keep') && hazard.kind.startsWith('ward') && distance(hazard, player) < hazard.radius) {
          player.barrier = Math.max(player.barrier, player.maxHp * 0.045);
          player.barrierTime = Math.max(player.barrierTime, 0.9);
        }
        if (hazard.thornwall && touched && player.barrier > 0) {
          const attacker = this.entities.enemies.find((enemy) => !enemy.dead && distance(hazard, enemy) < hazard.radius * 1.6);
          if (attacker) {
            const count = hazard.retaliationCount ?? 1;
            for (let index = 0; index < count; index += 1) this._createProjectile({ owner: 'player', kind: 'retaliatory-briar', x: hazard.x, y: hazard.y, angle: angleTo(hazard, attacker) + (index - (count - 1) / 2) * 0.17, speed: 620, radius: 8, life: 0.6, damage: hazard.damage * 0.55, pierce: 0, color: hazard.color, mark: 2 });
          }
        }
        if (hazard.kind === 'ward' && hazard.buff === 'veilrunner' && this.hasPower('smoke-crown')) {
          const marked = this.entities.enemies.filter((enemy) => !enemy.dead && enemy.marked > 0 && distance(hazard, enemy) < hazard.radius * 2.3).sort((a, b) => distance(a, hazard) - distance(b, hazard))[0];
          if (marked && !hazard.smokeKnifeTick) {
            hazard.smokeKnifeTick = 2;
            this._createProjectile({ owner: 'player', kind: 'smoke-crown-knife', x: hazard.x, y: hazard.y, angle: angleTo(hazard, marked), speed: 690, radius: 7, life: 0.72, damage: hazard.damage * 1.4, pierce: 1, color: '#ff9a5d', mark: 2.5, homing: 0.14 });
          }
          hazard.smokeKnifeTick = Math.max(0, (hazard.smokeKnifeTick ?? 0) - hazard.tick);
        }
        if (player.primary === 'ironbound' && ['ward', 'ward-echo'].includes(hazard.kind) && distance(hazard, player) < hazard.radius && this.getTalentRank('iron-foundry')) this._gainResource(3 * this.getTalentRank('iron-foundry'));
      } else if (distance(hazard, player) < hazard.radius + player.radius) {
        this._damagePlayer(hazard.damage, hazard.kind);
      }
    });
    this.entities.hazards = this.entities.hazards.filter((hazard) => hazard.life > 0);
  }

  _updateEnemies(dt) {
    const player = this.player;
    const groups = new Map();
    this.entities.enemies.forEach((enemy) => {
      if (enemy.dead) {
        enemy.deathTime -= dt;
        return;
      }
      if (!groups.has(enemy.group)) groups.set(enemy.group, []);
      groups.get(enemy.group).push(enemy);
    });
    const directives = new Map();
    groups.forEach((group, id) => {
      const active = group.some((enemy) => enemy.engaged);
      if (!active) {
        directives.set(id, { morale: 1, activeAttackers: 0, attackCap: 1, formation: 'dormant', mobility: 1, cadence: 1 });
        return;
      }
      const tactical = this._coordinateGroup(id, group);
      const covenant = this.covenantSystem.resolve(this.player.covenant);
      const doctrine = this.enemyDirector.resolveGroup({
        groupId: id, factionId: group.find((enemy) => enemy.doctrineFaction)?.doctrineFaction ?? 'grave', group, enemies: group, player,
        corpses: this.entities.corpses ?? [], now: this.clock, covenant
      });
      const directive = { ...tactical, ...doctrine, activeAttackers: tactical.activeAttackers, attackCap: tactical.attackCap, morale: tactical.morale };
      group.forEach((enemy) => { enemy.packDirective = directive; });
      directives.set(id, directive);
    });
    this.entities.enemies.forEach((enemy) => {
      if (enemy.dead) return;
      const landedHard = this._applyGravity(enemy, dt);
      if (landedHard) this._emitBurst(enemy.x, enemy.y, enemy.color, enemy.boss ? 8 : 4, enemy.boss ? 105 : 58);
      enemy.bossIntroTime = Math.max(0, (enemy.bossIntroTime ?? 0) - dt);
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      enemy.justHit = Math.max(0, enemy.justHit - dt);
      enemy.marked = Math.max(0, enemy.marked - dt);
      enemy.cursed = Math.max(0, enemy.cursed - dt);
      enemy.slow = Math.max(0, (enemy.slow ?? 0) - dt * 0.45);
      enemy.buffTime = Math.max(0, enemy.buffTime - dt);
      if (enemy.knockdown > 0) {
        enemy.knockdown -= dt;
        enemy.state = 'knockdown';
        return;
      }
      if (!this._updateEnemyAwareness(enemy, groups.get(enemy.group) ?? [], dt)) return;
      if (this._enemyHasAffix(enemy, 'stormbound') && this.clock % 4.5 < dt) this._createHazard({ owner: 'enemy', kind: 'storm-pulse', x: enemy.x, y: enemy.y, radius: 115, life: 0.65, tick: 0.3, damage: enemy.damage * 0.45, color: '#87ceeb' });
      if (this._enemyHasAffix(enemy, 'shielded') && enemy.shield <= 0 && this.clock % 9 < dt) enemy.shield = enemy.maxHp * 0.12;
      if (this._enemyHasAffix(enemy, 'unstoppable') && enemy.stagger > 0 && this.clock % 6 < dt) enemy.stagger *= 0.25;
      enemy.frenzy = this._enemyHasAffix(enemy, 'frenzied') && enemy.hp <= enemy.maxHp * 0.5 ? 1.34 : 1;
      if (this._enemyHasAffix(enemy, 'suppressing') && this.clock % 6.5 < dt) this._createHazard({ owner: 'enemy', kind: 'suppressing-field', x: enemy.x, y: enemy.y, radius: 105, life: 2.4, tick: 0.36, damage: enemy.damage * 0.42, color: '#6ac7bb' });
      if (this._enemyHasAffix(enemy, 'mirrored') && !enemy.mirroredSpawned) {
        enemy.mirroredSpawned = true;
        const reflection = this._spawnEnemy(enemy.templateId, enemy.x + 68, enemy.y - 52, { level: enemy.level, group: enemy.group });
        if (reflection) {
          reflection.name = `${enemy.name} Reflection`;
          reflection.elite = false;
          reflection.affix = null;
          reflection.maxHp = Math.round(reflection.maxHp * 0.42);
          reflection.hp = reflection.maxHp;
          reflection.damage = Math.round(reflection.damage * 0.68);
          reflection.scoreValue *= 0.35;
        }
      }
      if (this._enemyHasAffix(enemy, 'oathbound') && this.clock % 8 < dt) {
        if (enemy.shield > 0) enemy.buffTime = Math.max(enemy.buffTime, 3.4);
        else enemy.shield = enemy.maxHp * 0.14;
      }
      if (enemy.hunterId) {
        if (enemy.corpseDenial && this.clock >= (enemy.hunterCorpseAt ?? 0)) {
          const corpse = (this.entities.corpses ?? []).filter((entry) => distance(entry, enemy) <= 120).sort((a, b) => distance(a, enemy) - distance(b, enemy))[0];
          if (corpse) {
            this.entities.corpses = this.entities.corpses.filter((entry) => entry !== corpse);
            enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * 0.05);
            enemy.hunterCorpseAt = this.clock + 2.4;
            this._pushEffect({ kind: 'hunter-corpse-denial', x: corpse.x, y: corpse.y, life: 0.42, maxLife: 0.42, color: '#7b6c85' });
          }
        }
        if (enemy.hunterHazard && this.clock >= (enemy.hunterHazardAt ?? 0)) {
          enemy.hunterHazardAt = this.clock + 6.2;
          this._createHazard({ owner: 'enemy', kind: 'hunter-scar-ground', x: enemy.x, y: enemy.y, radius: 88, life: 2.4, tick: 0.42, damage: enemy.damage * 0.34, color: '#8b4c61' });
        }
        if (enemy.hunterReinforcement && !enemy.hunterCalledReinforcement && enemy.hp <= enemy.maxHp * 0.7) {
          enemy.hunterCalledReinforcement = true;
          const ally = this._spawnEnemy(enemy.doctrineFaction === 'blood' ? 'bloodleech' : enemy.doctrineFaction === 'iron' ? 'ironwraith' : enemy.doctrineFaction === 'void' ? 'mirrorwisp' : 'mireling', enemy.x + 70, enemy.y + 45, { level: enemy.level, group: enemy.group, engaged: true, doctrineFaction: enemy.doctrineFaction });
          if (ally) { ally.name = `${enemy.name}'s Pursuer`; ally.scoreValue *= 0.55; }
        }
      }
      this._updateBossPhase(enemy);
      if (enemy.phaseTransition > 0) {
        enemy.phaseTransition = Math.max(0, enemy.phaseTransition - dt);
        enemy.state = 'phase-transition';
        enemy.windupLeft = 0;
        enemy.telegraph = null;
        if (!enemy.phaseTransition) enemy.recoveryLeft = Math.max(enemy.recoveryLeft, enemy.boss ? 0.42 : 0.24);
        return;
      }
      if (enemy.windupLeft > 0) {
        enemy.windupLeft -= dt;
        enemy.state = 'windup';
        if (enemy.windupLeft <= 0) this._resolveEnemyAttack(enemy);
        return;
      }
      enemy.recoveryLeft = Math.max(0, enemy.recoveryLeft - dt * (directives.get(enemy.group)?.cadence ?? 1) * (this._enemyHasAffix(enemy, 'relentless') || this.hasEndgameModifier('relentless') ? 1.35 : 1));
      if (enemy.recoveryLeft > 0) {
        enemy.state = 'recover';
        return;
      }
      this._enemyMoveAndChoose(enemy, groups.get(enemy.group) ?? [], directives.get(enemy.group), dt);
    });
    this.entities.enemies = this.entities.enemies.filter((enemy) => !enemy.dead || enemy.deathTime > 0);
    this._separateEnemyCrowds(groups);
    this._separatePlayerFromEnemies();
    for (const id of this.groupMemory.keys()) if (!groups.has(id)) this.groupMemory.delete(id);
  }

  _updateEnemyAwareness(enemy, group, dt) {
    const player = this.player;
    const distanceToPlayer = distance(enemy, player);
    const distanceFromSpawn = Math.hypot(enemy.x - enemy.spawnX, enemy.y - enemy.spawnY);
    const groupAlerted = group.some((ally) => ally !== enemy && ally.engaged && distance(ally, enemy) <= 430);
    const anotherAuthoredRoomIsActive = Boolean(
      enemy.roomId
      && this.encounter.activeGroupId
      && this.encounter.activeGroupId !== enemy.group
      && player.combatTargetId !== enemy.id
    );
    if (!enemy.engaged && anotherAuthoredRoomIsActive) {
      enemy.state = 'idle';
      return false;
    }
    if (!enemy.engaged && (distanceToPlayer <= enemy.awarenessRadius || groupAlerted || player.combatTargetId === enemy.id)) {
      this._engageEnemyGroup(enemy);
      enemy.state = 'alert';
      enemy.alert = 0.22;
      return true;
    }

    const cannotLeash = Boolean(this.endgame && enemy.group === this.endgame.id);
    const abandoned = !cannotLeash && enemy.engaged && (
      distanceToPlayer > enemy.leashRadius + 260
      || distanceFromSpawn > enemy.leashRadius && distanceToPlayer > enemy.awarenessRadius * 1.35
    );
    if (abandoned) {
      group.forEach((ally) => {
        ally.engaged = false;
        ally.windupLeft = 0;
        ally.recoveryLeft = 0;
        ally.telegraph = null;
        ally.state = 'return';
      });
    }

    if (enemy.engaged) {
      enemy.lastEngagedAt = this.clock;
      return true;
    }

    if (distanceFromSpawn > 12) {
      const home = normalize(enemy.spawnX - enemy.x, enemy.spawnY - enemy.y);
      const homeSteer = this.worldGeometry?.steer?.(enemy, enemy.spawnX, enemy.spawnY, this) ?? home;
      this._moveBodyWithGeometry(enemy,
        clamp(enemy.x + homeSteer.x * enemy.speed * 0.72 * dt, 25, WORLD_SIZE.width - 25),
        clamp(enemy.y + homeSteer.y * enemy.speed * 0.72 * dt, 25, WORLD_SIZE.height - 25));
      this._turnBody(enemy, Math.atan2(home.y, home.x), dt, 4.6);
      enemy.state = 'return';
      if (this.clock - enemy.lastEngagedAt > 2.5) enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * 0.18 * dt);
      return false;
    }

    this._moveBodyWithGeometry(enemy, enemy.spawnX, enemy.spawnY);
    enemy.patrolTime -= dt;
    if (enemy.patrolTime <= 0) {
      enemy.patrolTime = range(1.8, 4.5, this.random);
      enemy.patrolPhase += range(-1.1, 1.1, this.random);
    }
    this._turnBody(enemy, enemy.patrolPhase, dt, 3.2);
    enemy.state = 'idle';
    return false;
  }

  _coordinateGroup(id, group) {
    const memory = this.groupMemory.get(id) ?? { initial: group.length, lastCommand: -1_000_000_000, losses: 0 };
    memory.initial = Math.max(memory.initial, group.length);
    memory.losses = Math.max(0, memory.initial - group.length);
    const shield = group.find((enemy) => enemy.role === 'shield' && !enemy.dead);
    const commander = group.find((enemy) => enemy.role === 'commander' && !enemy.dead);
    const support = group.filter((enemy) => ['ranged', 'healer', 'commander', 'summoner'].includes(enemy.role) && !enemy.dead);
    support.forEach((enemy) => { enemy.protectedBy = shield?.id ?? null; });
    const morale = clamp(1 - memory.losses / Math.max(2, memory.initial) * 0.7 + (commander ? 0.12 : 0) + (shield ? 0.05 : 0), 0.18, 1.2);
    const activeAttackers = group.filter((enemy) => enemy.windupLeft > 0 || (enemy.recoveryLeft > 0 && ['melee', 'shield', 'brute', 'assassin', 'burrower'].includes(enemy.role))).length;
    const directive = {
      morale, shield, commander, activeAttackers,
      attackCap: group.length >= 6 ? 3 : group.length >= 3 ? 2 : 1,
      formation: shield ? 'guarded' : commander ? 'disciplined' : morale < 0.45 ? 'fractured' : 'pressing'
    };
    this.groupMemory.set(id, memory);
    group.forEach((enemy) => {
      enemy.morale = morale;
      enemy.directive = directive.formation;
      if (enemy.role === 'commander' && this.clock - memory.lastCommand > 5.5) {
        memory.lastCommand = this.clock;
        group.forEach((ally) => { if (ally !== enemy) ally.buffTime = Math.max(ally.buffTime, 2.5); });
        this._pushEffect({ kind: 'command-ring', x: enemy.x, y: enemy.y, life: 0.55, maxLife: 0.55, color: enemy.color });
      }
    });
    return directive;
  }

  _enemyMoveAndChoose(enemy, group, directive, dt) {
    const player = this.player;
    const toPlayer = { x: player.x - enemy.x, y: player.y - enemy.y };
    const distanceToPlayer = Math.hypot(toPlayer.x, toPlayer.y) || 1;
    const direction = { x: toPlayer.x / distanceToPlayer, y: toPlayer.y / distanceToPlayer };
    this._turnBody(enemy, Math.atan2(direction.y, direction.x), dt, 5.2);
    const role = enemy.role;
    const desired = roleRanges[role] ?? 70;
    const doctrinalSlot = directive?.slots?.find?.((slot) => slot.enemyId === enemy.id) ?? null;
    const combatSlot = ['melee', 'shield', 'brute', 'assassin', 'burrower', 'boss'].includes(role) ? (doctrinalSlot ?? this._assignCombatSlot(enemy, group)) : null;
    let targetX = combatSlot?.x ?? player.x;
    let targetY = combatSlot?.y ?? player.y;
    let shouldAttack = distanceToPlayer <= desired + enemy.radius + player.radius;

    if (role === 'shield') {
      const protectedUnit = group.find((ally) => ally.protectedBy === enemy.id && !ally.dead);
      if (protectedUnit) {
        targetX = protectedUnit.x + direction.x * 95;
        targetY = protectedUnit.y + direction.y * 95;
        shouldAttack = distanceToPlayer < 95;
      }
    } else if (role === 'ranged' || role === 'healer' || role === 'commander' || role === 'summoner') {
      if (distanceToPlayer < desired - 42) {
        targetX = enemy.x - direction.x * 135;
        targetY = enemy.y - direction.y * 135;
      } else if (distanceToPlayer > desired + 70) {
        targetX = player.x - direction.x * desired;
        targetY = player.y - direction.y * desired;
      } else {
        targetX = enemy.x;
        targetY = enemy.y;
      }
      if (role === 'healer') shouldAttack = group.some((ally) => !ally.dead && ally.hp < ally.maxHp * 0.72);
      if (role === 'commander') shouldAttack = group.filter((ally) => !ally.dead).length >= 2;
    } else if (role === 'assassin') {
      const flank = enemy.id.charCodeAt(enemy.id.length - 1) % 2 ? 1.25 : -1.25;
      targetX = player.x + Math.cos(enemy.facing + flank) * 95;
      targetY = player.y + Math.sin(enemy.facing + flank) * 95;
      shouldAttack = distanceToPlayer < 230;
    } else if (role === 'burrower') {
      shouldAttack = distanceToPlayer < 225;
    } else if (role === 'disruptor') {
      const ward = this.entities.hazards.find((hazard) => hazard.owner === 'player' && distance(hazard, enemy) < 260);
      if (ward) {
        targetX = ward.x;
        targetY = ward.y;
        shouldAttack = distance(enemy, ward) < 150;
      }
    }

    const dodgeable = ['ranged', 'healer', 'commander', 'assassin', 'burrower'].includes(role);
    const threat = dodgeable ? this.entities.projectiles.find((projectile) => {
      if (projectile.owner !== 'player' || projectile.delay > 0 || projectile.life <= 0 || distance(projectile, enemy) > 135) return false;
      const towardEnemy = normalize(enemy.x - projectile.x, enemy.y - projectile.y);
      const velocity = normalize(projectile.vx, projectile.vy);
      return towardEnemy.x * velocity.x + towardEnemy.y * velocity.y > 0.72;
    }) : null;
    if (threat) {
      const velocity = normalize(threat.vx, threat.vy);
      const side = enemy.id.charCodeAt(enemy.id.length - 1) % 2 ? 1 : -1;
      targetX += -velocity.y * 110 * side;
      targetY += velocity.x * 110 * side;
      enemy.state = 'evade';
    }
    if (directive?.morale < 0.42 && !this._enemyHasAffix(enemy, 'relentless') && !this.hasEndgameModifier('relentless') && ['healer', 'ranged', 'summoner'].includes(role) && distanceToPlayer < desired + 120) {
      targetX = enemy.x - direction.x * 180;
      targetY = enemy.y - direction.y * 180;
      shouldAttack = false;
    }

    const targetDistance = Math.hypot(targetX - enemy.x, targetY - enemy.y);
    if (targetDistance > 10 && !(role === 'ranged' && distanceToPlayer < desired - 40)) {
      const movement = this.worldGeometry?.steer?.(enemy, targetX, targetY, this) ?? normalize(targetX - enemy.x, targetY - enemy.y);
      const buff = enemy.buffTime > 0 ? 1.22 : 1;
      const slow = 1 - (enemy.slow ?? 0);
      const moraleSpeed = directive?.morale < 0.45 && ['melee', 'brute'].includes(role) ? 0.86 : 1;
      const frenzy = enemy.frenzy ?? 1;
      const doctrineMobility = directive?.mobility ?? 1;
      this._moveBodyWithGeometry(enemy,
        clamp(enemy.x + movement.x * enemy.speed * buff * slow * moraleSpeed * frenzy * doctrineMobility * dt, 25, WORLD_SIZE.width - 25),
        clamp(enemy.y + movement.y * enemy.speed * buff * slow * moraleSpeed * frenzy * doctrineMobility * dt, 25, WORLD_SIZE.height - 25));
      enemy.state = shouldAttack ? 'threaten' : 'move';
    }
    const supportRole = ['healer', 'commander', 'summoner'].includes(role);
    if (shouldAttack && (supportRole || !directive || directive.activeAttackers < directive.attackCap)) {
      this._startEnemyAttack(enemy);
      if (!supportRole && directive) directive.activeAttackers += 1;
    }
  }

  _separateEnemyCrowds(groups) {
    groups.forEach((group) => {
      for (let left = 0; left < group.length; left += 1) {
        for (let right = left + 1; right < group.length; right += 1) {
          const a = group[left];
          const b = group[right];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const separation = Math.hypot(dx, dy) || 0.01;
          const desired = Math.min(54, (a.radius + b.radius) * 0.72);
          if (separation >= desired) continue;
          const shift = Math.min(9, (desired - separation) * 0.3);
          const nx = dx / separation;
          const ny = dy / separation;
          this._moveBodyWithGeometry(a, a.x - nx * shift, a.y - ny * shift);
          this._moveBodyWithGeometry(b, b.x + nx * shift, b.y + ny * shift);
        }
      }
    });
  }

  _separatePlayerFromEnemies() {
    const player = this.player;
    if (!player || player.dash || player.deathTime > 0) return;
    this.entities.enemies.forEach((enemy) => {
      if (enemy.dead || !enemy.engaged || enemy.knockdown > 0) return;
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const separation = Math.hypot(dx, dy) || 0.01;
      const desired = player.radius + enemy.radius * (enemy.boss ? 0.72 : 0.62);
      if (separation >= desired) return;
      const overlap = desired - separation;
      const nx = dx / separation;
      const ny = dy / separation;
      const playerShare = enemy.boss ? 0.78 : 0.48;
      this._moveBodyWithGeometry(player, player.x + nx * overlap * playerShare, player.y + ny * overlap * playerShare);
      this._moveBodyWithGeometry(enemy, enemy.x - nx * overlap * (1 - playerShare), enemy.y - ny * overlap * (1 - playerShare));
    });
  }

  _startEnemyAttack(enemy) {
    const phaseMultiplier = (enemy.boss && enemy.phase === 3 ? 0.65 : enemy.boss && enemy.phase === 2 ? 0.8 : 1)
      * (this._enemyHasAffix(enemy, 'relentless') || this.hasEndgameModifier('relentless') ? 0.78 : 1)
      * (enemy.frenzy > 1 ? 0.82 : 1);
    enemy.windupLeft = enemy.windup * phaseMultiplier;
    enemy.recoveryLeft = enemy.recovery * phaseMultiplier;
    enemy.attackCount = (enemy.attackCount ?? 0) + 1;
    enemy.state = 'windup';
    if (enemy.role === 'brute' || enemy.role === 'boss') {
      enemy.verticalVelocity = Math.max(enemy.verticalVelocity ?? 0, enemy.boss ? 330 : 285);
      enemy.grounded = false;
    }
    this._spawnEnemyActionVfx(enemy, enemy.windupLeft + enemy.recoveryLeft);
    const targetX = this.player.x;
    const targetY = this.player.y;
    const melee = ['melee', 'shield', 'brute'].includes(enemy.role);
    const line = ['ranged', 'assassin', 'disruptor'].includes(enemy.role);
    enemy.telegraph = {
      x: melee ? enemy.x : targetX, y: melee ? enemy.y : targetY,
      targetX, targetY, fromX: enemy.x, fromY: enemy.y,
      angle: angleTo(enemy, this.player), shape: melee ? 'cone' : line ? 'line' : 'circle',
      radius: enemy.role === 'brute' || enemy.role === 'boss' ? 95 : melee ? 68 : 42,
      life: enemy.windupLeft, maxLife: enemy.windupLeft, kind: enemy.attack
    };
    this._pushEffect({ ...enemy.telegraph, kind: 'telegraph', attackKind: enemy.telegraph.kind, enemyId: enemy.id, color: enemy.color });
    this.presentation?.emit('combat:enemy-telegraph', {
      entityId: enemy.id, enemyId: enemy.templateId, role: enemy.role, attackId: enemy.attack,
      phase: enemy.phase ?? 1, telegraph: { ...enemy.telegraph }
    }, { source: 'enemy-combat', priority: enemy.boss ? 9 : enemy.elite ? 6 : 3 });
    this.emit('sound', { id: enemy.boss ? 'boss-windup' : enemy.role === 'ranged' ? 'projectile-windup' : 'enemy-windup', priority: enemy.boss ? 9 : 3 });
  }

  _playerInsideEnemyTelegraph(enemy) {
    const telegraph = enemy.telegraph;
    const player = this.player;
    if (!telegraph || !player) return false;
    if (telegraph.shape === 'circle') return Math.hypot(player.x - telegraph.targetX, player.y - telegraph.targetY) <= telegraph.radius + player.radius;
    if (telegraph.shape === 'line') {
      if (this.worldGeometry?.segmentBlocked?.(telegraph.fromX ?? enemy.x, telegraph.fromY ?? enemy.y, player.x, player.y, Math.max(3, player.radius * .2), this)) return false;
      const startX = telegraph.fromX ?? enemy.x;
      const startY = telegraph.fromY ?? enemy.y;
      const lineLength = Math.max(210, Math.hypot(telegraph.targetX - startX, telegraph.targetY - startY) + 85);
      const endX = startX + Math.cos(telegraph.angle) * lineLength;
      const endY = startY + Math.sin(telegraph.angle) * lineLength;
      const segmentX = endX - startX;
      const segmentY = endY - startY;
      const projection = clamp(((player.x - startX) * segmentX + (player.y - startY) * segmentY) / Math.max(1, segmentX * segmentX + segmentY * segmentY), 0, 1);
      const closestX = startX + segmentX * projection;
      const closestY = startY + segmentY * projection;
      return Math.hypot(player.x - closestX, player.y - closestY) <= player.radius + Math.max(18, telegraph.radius * 0.42);
    }
    if (this.worldGeometry?.segmentBlocked?.(enemy.x, enemy.y, player.x, player.y, Math.max(3, player.radius * .2), this)) return false;
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const reach = enemy.radius + player.radius + (enemy.role === 'brute' ? 75 : 42);
    if (Math.hypot(dx, dy) > reach) return false;
    return Math.abs(wrapAngle(Math.atan2(dy, dx) - telegraph.angle)) <= (enemy.role === 'brute' ? 0.82 : 0.68);
  }

  _resolveEnemyAttack(enemy) {
    const player = this.player;
    enemy.windupLeft = 0;
    enemy.state = 'attack';
    const role = enemy.role;
    const executioner = this.hasEndgameModifier('executioner') && player.hp <= player.maxHp * 0.45 ? 1.32 : 1;
    const bloodPrice = this.hasEndgameModifier('bloodprice') ? 1.12 : 1;
    const accuracy = (enemy.buffTime > 0 ? 1.1 : 1) * (enemy.frenzy ?? 1) * executioner * bloodPrice;
    this.presentation?.emit('combat:enemy-impact', {
      entityId: enemy.id, enemyId: enemy.templateId, role, attackId: enemy.attack,
      x: enemy.telegraph?.targetX ?? enemy.x, y: enemy.telegraph?.targetY ?? enemy.y, phase: enemy.phase ?? 1
    }, { source: 'enemy-combat', priority: enemy.boss ? 9 : enemy.elite ? 6 : 3 });
    this.emit('sound', { id: enemy.boss ? 'boss-attack' : role === 'brute' ? 'enemy-heavy' : 'enemy-attack', priority: enemy.boss ? 9 : 3 });
    if (role === 'melee' || role === 'shield' || role === 'brute') {
      const hit = this._playerInsideEnemyTelegraph(enemy) && this._damagePlayer(enemy.damage * accuracy, enemy.attack);
      if (hit && (this._enemyHasAffix(enemy, 'hungry') || this.hasEndgameModifier('hungry'))) enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * 0.06);
      if (role === 'brute') this._createHazard({ owner: 'enemy', kind: 'smash', x: enemy.telegraph?.targetX ?? player.x, y: enemy.telegraph?.targetY ?? player.y, radius: 88, life: 0.55, tick: 0.2, damage: enemy.damage * 0.5, color: enemy.color });
      this._emitBurst(enemy.x, enemy.y, enemy.color, 7, 95);
    } else if (role === 'ranged') {
      const lockedAngle = enemy.telegraph?.angle ?? angleTo(enemy, player);
      this._createProjectile({ owner: 'enemy', kind: enemy.attack === 'volley' ? 'crow-feather' : 'ash-bolt', x: enemy.x, y: enemy.y, angle: lockedAngle, speed: 385, radius: 9, life: 2.0, damage: enemy.damage * accuracy, color: enemy.color, elite: enemy.elite, split: this._enemyHasAffix(enemy, 'splitting') || this.hasEndgameModifier('splitting') ? 2 : 0 });
      if (enemy.attack === 'volley') [-0.22, 0.22].forEach((offset) => this._createProjectile({ owner: 'enemy', kind: 'crow-feather', x: enemy.x, y: enemy.y, angle: lockedAngle + offset, speed: 360, radius: 7, life: 1.7, damage: enemy.damage * 0.72, color: enemy.color }));
    } else if (role === 'healer') {
      const ally = this.entities.enemies.filter((candidate) => !candidate.dead && candidate.group === enemy.group).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (ally) {
        ally.hp = clamp(ally.hp + ally.maxHp * 0.16, 0, ally.maxHp);
        ally.shield += ally.maxHp * 0.06;
        this._pushEffect({ kind: 'heal-link', x: ally.x, y: ally.y, fromX: enemy.x, fromY: enemy.y, life: 0.5, maxLife: 0.5, color: enemy.color });
      }
    } else if (role === 'commander') {
      this.entities.enemies.forEach((ally) => { if (!ally.dead && ally.group === enemy.group) ally.buffTime = Math.max(ally.buffTime, 4.5); });
      this._createHazard({ owner: 'enemy', kind: 'echo-pulse', x: enemy.x, y: enemy.y, radius: 135, life: 0.55, tick: 0.24, damage: enemy.damage * 0.52, color: enemy.color });
    } else if (role === 'assassin') {
      const targetX = enemy.telegraph?.targetX ?? player.x;
      const targetY = enemy.telegraph?.targetY ?? player.y;
      const direction = normalize(targetX - enemy.x, targetY - enemy.y);
      const leapDistance = Math.min(170, Math.hypot(targetX - enemy.x, targetY - enemy.y));
      this._moveBodyWithGeometry(enemy, enemy.x + direction.x * leapDistance, enemy.y + direction.y * leapDistance);
      enemy.verticalVelocity = Math.max(enemy.verticalVelocity ?? 0, 245);
      enemy.grounded = false;
      const hit = distance(enemy, player) < enemy.radius + player.radius + 35 && this._damagePlayer(enemy.damage * 1.2 * accuracy, 'pounce');
      if (hit && (this._enemyHasAffix(enemy, 'hungry') || this.hasEndgameModifier('hungry'))) enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * 0.08);
      this._pushEffect({ kind: 'pounce', x: enemy.x, y: enemy.y, angle: enemy.facing, life: 0.35, maxLife: 0.35, color: enemy.color });
    } else if (role === 'burrower') {
      const targetX = enemy.telegraph?.targetX ?? player.x;
      const targetY = enemy.telegraph?.targetY ?? player.y;
      this._createHazard({ owner: 'enemy', kind: 'burrow', x: targetX, y: targetY, radius: 75, life: 0.72, tick: 0.38, damage: enemy.damage * 1.25, color: enemy.color });
      this._moveBodyWithGeometry(enemy, targetX + range(-90, 90, this.random), targetY + range(-90, 90, this.random));
      if (this.endgame?.blackRoad) this._constrainBlackRoadArena();
    } else if (role === 'summoner') {
      if (enemy.summonCount < 5) {
        enemy.summonCount += 2;
        for (let index = 0; index < 2; index += 1) this._spawnEnemy('mireling', enemy.x + range(-55, 55, this.random), enemy.y + range(-55, 55, this.random), { level: enemy.level, group: enemy.group, eventId: enemy.eventId });
      }
      this._pushEffect({ kind: 'portal', x: enemy.x, y: enemy.y, life: 0.8, maxLife: 0.8, color: enemy.color });
    } else if (role === 'disruptor') {
      if (this._playerInsideEnemyTelegraph(enemy)) {
        const ward = this.entities.hazards.find((hazard) => hazard.owner === 'player' && distance(hazard, enemy) < 180);
        if (ward) ward.life -= 2.4;
        player.resource = Math.max(0, player.resource - 14);
        this._damagePlayer(enemy.damage * 0.48, 'ward drain');
      }
    } else if (role === 'boss') {
      this._bossAttack(enemy);
    }
    enemy.telegraph = null;
  }

  _bossAttack(enemy) {
    const player = this.player;
    const targetX = enemy.telegraph?.targetX ?? player.x;
    const targetY = enemy.telegraph?.targetY ?? player.y;
    const lockedAngle = enemy.telegraph?.angle ?? angleTo(enemy, player);
    const chapterAbbot = enemy.campaignId === 'chapter-two-abbot';
    const boundChoir = chapterAbbot && enemy.choirVerdict === 'bind-choir';
    const severedChoir = chapterAbbot && enemy.choirVerdict === 'sever-choir';
    const expansionBoss = BOSS_PHASE_LINES[enemy.templateId];
    const bossRuntime = this.bossController.update(enemy, { covenant: this.covenantSystem.resolve(this.player.covenant), now: this.clock, variantOverride: this.endgame?.bossCovenantVariant ?? null });
    enemy.bossRuntime = bossRuntime;
    const bossMechanic = this.bossController.nextMechanic(enemy, bossRuntime);
    enemy.lastBossMechanic = bossMechanic.id;
    if (bossRuntime.affinity === 'grave' && enemy.attackCount % 3 === 0) this._createHazard({ owner: 'enemy', kind: 'grave-bound-boss', x: targetX, y: targetY, radius: 74, life: 1.1, tick: 0.4, damage: enemy.damage * 0.32, color: '#80958b' });
    else if (bossRuntime.affinity === 'void' && enemy.attackCount % 3 === 0) [-0.24, 0.24].forEach((offset) => this._createProjectile({ owner: 'enemy', kind: 'void-bound-boss', x: enemy.x, y: enemy.y, angle: lockedAngle + offset, speed: 470, radius: 8, life: 1.25, damage: enemy.damage * 0.42, color: '#7867a8' }));
    else if (bossRuntime.affinity === 'flame' && enemy.attackCount % 3 === 0) this._createHazard({ owner: 'enemy', kind: 'flame-bound-boss', x: targetX, y: targetY, radius: 70, life: 1.3, tick: 0.36, damage: enemy.damage * 0.36, color: '#d66a45' });
    const signatureMechanics = new Set(['crypt-procession','bloodroot-eruption','rising-blackwater','rolling-tomb','regent-chain','command-chain','mirror-step','mirror-lance','fifth-road-shard','erased-road','silent-wave','absolute-silence']);
    const signatureTurn = expansionBoss && signatureMechanics.has(bossMechanic.id);
    if (signatureTurn) {
      const minions = this.entities.enemies.filter((candidate) => !candidate.dead && candidate.group === enemy.group && !candidate.boss);
      if (enemy.templateId === 'cryptwarden') {
        for (let index = -2; index <= 2; index += 1) this._createHazard({ owner: 'enemy', kind: 'crypt-procession', x: targetX + index * 74, y: targetY + (index % 2) * 95, radius: 56, life: 1.4, tick: 0.38, damage: enemy.damage * 0.6, color: enemy.color });
        if (minions.length < 4) ['bonevulture', 'cairnguard'].forEach((id, index) => this._spawnEnemy(id, enemy.x + (index ? 100 : -100), enemy.y + 70, { level: enemy.level, group: enemy.group }));
      } else if (enemy.templateId === 'bloodmatron') {
        for (let index = 0; index < 5; index += 1) {
          const angle = index * Math.PI * 2 / 5 + enemy.facing;
          this._createHazard({ owner: 'enemy', kind: 'bloodroot-eruption', x: targetX + Math.cos(angle) * 118, y: targetY + Math.sin(angle) * 118, radius: 64, life: 2.1, tick: 0.4, damage: enemy.damage * 0.58, color: '#c84361' });
        }
        if (minions.length < 5) ['bloodleech', 'reedstalker'].forEach((id, index) => this._spawnEnemy(id, enemy.x + Math.cos(index * Math.PI) * 120, enemy.y + Math.sin(index * Math.PI) * 120, { level: enemy.level, group: enemy.group }));
      } else if (enemy.templateId === 'bogsovereign') {
        for (let index = 0; index < 4; index += 1) this._createHazard({ owner: 'enemy', kind: 'rising-blackwater', x: targetX + range(-170, 170, this.random), y: targetY + range(-150, 150, this.random), radius: 92, life: 3.2, tick: 0.48, damage: enemy.damage * 0.5, color: '#60756c', slow: 0.34 });
      } else if (enemy.templateId === 'burialengine') {
        for (let index = 0; index < 6; index += 1) {
          const angle = index * Math.PI / 3 + enemy.facing;
          this._createHazard({ owner: 'enemy', kind: 'rolling-tomb', x: enemy.x + Math.cos(angle) * 128, y: enemy.y + Math.sin(angle) * 128, radius: 68, life: 2.2, tick: 0.42, damage: enemy.damage * 0.58, color: enemy.color });
        }
        if (minions.length < 4) ['ossuarybehemoth', 'ashsmith'].forEach((id, index) => this._spawnEnemy(id, enemy.x + (index ? 130 : -130), enemy.y, { level: enemy.level, group: enemy.group }));
      } else if (enemy.templateId === 'chainregent') {
        for (let index = 0; index < 4; index += 1) {
          const angle = index * Math.PI / 2;
          this._createProjectile({ owner: 'enemy', kind: 'regent-chain', x: enemy.x, y: enemy.y, angle, speed: 470, radius: 13, life: 1.8, damage: enemy.damage * 0.78, color: enemy.color });
          this._createHazard({ owner: 'enemy', kind: 'command-chain', x: targetX + Math.cos(angle) * 112, y: targetY + Math.sin(angle) * 112, radius: 55, life: 1.6, tick: 0.38, damage: enemy.damage * 0.55, color: '#b59b68' });
        }
        if (minions.length < 4) ['ironwraith', 'siegeherald'].forEach((id, index) => this._spawnEnemy(id, enemy.x + (index ? 120 : -120), enemy.y, { level: enemy.level, group: enemy.group }));
      } else if (enemy.templateId === 'mirrorapostle') {
        const previousX = enemy.x;
        const previousY = enemy.y;
        this._moveBodyWithGeometry(enemy,
          clamp(targetX - Math.cos(lockedAngle) * 190, 40, WORLD_SIZE.width - 40),
          clamp(targetY - Math.sin(lockedAngle) * 190, 40, WORLD_SIZE.height - 40));
        this._pushEffect({ kind: 'afterimage', x: previousX, y: previousY, angle: enemy.facing, life: 0.55, maxLife: 0.55, color: enemy.color });
        for (let index = -2; index <= 2; index += 1) this._createProjectile({ owner: 'enemy', kind: 'mirror-lance', x: enemy.x, y: enemy.y, angle: angleTo(enemy, { x: targetX, y: targetY }) + index * 0.16, speed: 510, radius: 9, life: 1.5, damage: enemy.damage * 0.62, color: enemy.color });
      } else if (enemy.templateId === 'veiledoracle') {
        for (let index = 0; index < 7; index += 1) {
          const angle = index * Math.PI * 2 / 7 + this.clock * 0.15;
          this._createProjectile({ owner: 'enemy', kind: 'fifth-road-shard', x: enemy.x, y: enemy.y, angle, speed: 390 + index * 13, radius: 10, life: 2.1, damage: enemy.damage * 0.64, color: enemy.color });
        }
        this._createHazard({ owner: 'enemy', kind: 'erased-road', x: targetX, y: targetY, radius: 138, life: 1.7, tick: 0.38, damage: enemy.damage * 0.54, color: '#7954ca' });
      } else if (enemy.templateId === 'silenceincarnate') {
        for (let index = 0; index < 12; index += 1) this._createProjectile({ owner: 'enemy', kind: 'silent-wave', x: enemy.x, y: enemy.y, angle: index * Math.PI / 6, speed: index % 2 ? 310 : 410, radius: 12, life: 2.2, damage: enemy.damage * 0.7, color: enemy.color });
        this._createHazard({ owner: 'enemy', kind: 'absolute-silence', x: targetX, y: targetY, radius: 165, life: 2.3, tick: 0.42, damage: enemy.damage * 0.62, color: '#76c6c6' });
        if (Math.hypot(player.x - targetX, player.y - targetY) <= 165 + player.radius) player.resource = Math.max(0, player.resource - player.maxResource * 0.18);
      }
      this.camera.shake = Math.max(this.camera.shake, 9);
      this._emitBurst(enemy.x, enemy.y, enemy.color, 22, 210);
      return;
    }
    if (enemy.phase === 1) {
      const pattern = (enemy.attackCount - 1) % 3;
      if (pattern === 0) this._createProjectile({ owner: 'enemy', kind: 'bell-bolt', x: enemy.x, y: enemy.y, angle: lockedAngle, speed: 420, radius: 13, life: 2.1, damage: enemy.damage, color: enemy.color });
      else if (pattern === 1) this._createHazard({ owner: 'enemy', kind: 'bell-slam', x: targetX, y: targetY, radius: 110, life: 0.82, tick: 0.34, damage: enemy.damage * 1.05, color: enemy.color });
      else [-0.18, 0.18].forEach((offset) => this._createProjectile({ owner: 'enemy', kind: 'bell-bolt', x: enemy.x, y: enemy.y, angle: lockedAngle + offset, speed: 390, radius: 10, life: 1.9, damage: enemy.damage * 0.72, color: enemy.color }));
    } else if (enemy.phase === 2) {
      const pattern = (enemy.attackCount - 1) % 3;
      if (pattern === 0) {
        [-0.85, 0, 0.85].forEach((offset) => this._createHazard({ owner: 'enemy', kind: 'bellfire', x: targetX + Math.cos(lockedAngle + offset) * 105, y: targetY + Math.sin(lockedAngle + offset) * 105, radius: 88, life: 2.5, tick: 0.45, damage: enemy.damage * 0.65, color: '#f27d5c' }));
      } else if (pattern === 1) {
        const activeMinions = this.entities.enemies.filter((candidate) => !candidate.dead && candidate.group === enemy.group && !candidate.boss).length;
        if (boundChoir) {
          ['bellknight', 'gildedcantor'].slice(0, Math.max(0, 6 - activeMinions)).forEach((id, index) => this._spawnEnemy(id, enemy.x + Math.cos(index * Math.PI) * 115, enemy.y + Math.sin(index * Math.PI) * 115, { level: enemy.level, group: enemy.group, campaignId: enemy.campaignId }));
        } else if (severedChoir) {
          [-0.65, 0, 0.65].forEach((offset) => this._createHazard({ owner: 'enemy', kind: 'severed-toll', x: targetX + Math.cos(lockedAngle + offset) * 126, y: targetY + Math.sin(lockedAngle + offset) * 126, radius: 70, life: 1.6, tick: 0.36, damage: enemy.damage * 0.56, color: '#8dd4d1' }));
        } else {
          ['mireling', 'ashbow', 'riftstalker'].slice(0, Math.max(0, 12 - activeMinions)).forEach((id, index) => this._spawnEnemy(id, enemy.x + Math.cos(index * 2.1) * 115, enemy.y + Math.sin(index * 2.1) * 115, { level: enemy.level, group: enemy.group }));
        }
      } else {
        [-0.3, 0, 0.3].forEach((offset) => this._createProjectile({ owner: 'enemy', kind: 'bell-bolt', x: enemy.x, y: enemy.y, angle: lockedAngle + offset, speed: 445, radius: 11, life: 1.8, damage: enemy.damage * 0.82, color: enemy.color }));
      }
    } else {
      const pattern = (enemy.attackCount - 1) % 3;
      if (pattern === 0) for (let index = 0; index < 8; index += 1) this._createProjectile({ owner: 'enemy', kind: 'toll-wave', x: enemy.x, y: enemy.y, angle: index * Math.PI / 4, speed: 330, radius: 10, life: 1.8, damage: enemy.damage * 0.72, color: '#ffb15b' });
      else if (pattern === 1) this._createHazard({ owner: 'enemy', kind: 'bell-judgment', x: targetX, y: targetY, radius: 148, life: 0.85, tick: 0.25, damage: enemy.damage * 0.8, color: enemy.color });
      else {
        for (let index = 0; index < 4; index += 1) this._createHazard({ owner: 'enemy', kind: 'toll-prison', x: targetX + Math.cos(index * Math.PI / 2) * 118, y: targetY + Math.sin(index * Math.PI / 2) * 118, radius: 62, life: 1.45, tick: 0.36, damage: enemy.damage * 0.56, color: '#ffb15b' });
        this._createProjectile({ owner: 'enemy', kind: 'bell-bolt', x: enemy.x, y: enemy.y, angle: lockedAngle, speed: 520, radius: 15, life: 1.6, damage: enemy.damage * 1.12, color: enemy.color });
      }
    }
    this.camera.shake = Math.max(this.camera.shake, 7);
    this._emitBurst(enemy.x, enemy.y, enemy.color, 16, 180);
  }

  _updateBossPhase(enemy) {
    if (!enemy.boss) return;
    const previousPhase = enemy.phase ?? 1;
    const runtime = this.bossController.update(enemy, { covenant: this.covenantSystem.resolve(this.player.covenant), now: this.clock, variantOverride: this.endgame?.bossCovenantVariant ?? null });
    enemy.bossRuntime = runtime;
    const nextPhase = runtime.phase;
    if (nextPhase !== previousPhase) {
      enemy.phase = nextPhase;
      if (nextPhase !== enemy.phaseAnnounced) {
        enemy.phaseAnnounced = nextPhase;
        this.emit('boss-phase', { enemy, phase: nextPhase });
        if (enemy.expeditionBoss && this.endgame?.blackRoad) {
          enemy.phaseTransition = Math.max(enemy.phaseTransition ?? 0, runtime.intermission || (nextPhase === 3 ? 1.05 : 0.82));
          if (this.endgame.activeStage) this.endgame.activeStage.radius = Math.max(235, this.endgame.activeStage.radius - (nextPhase === 3 ? 32 : 24));
          const reinforcements = {
            gravewake: ['cairnguard', 'candlepriest'], redfen: ['reedstalker', 'fenwitch'],
            cairnreach: ['ironwraith', 'siegeherald'], 'veiled-road': ['veilblade', 'nullpriest'],
            bellscar: ['bellknight', 'hollowchorister']
          }[this.endgame.zoneId] ?? [];
          const count = nextPhase === 2 ? 2 : 1;
          reinforcements.slice(0, count).forEach((id, index) => {
            const angle = index ? Math.PI * 0.7 : -Math.PI * 0.7;
            const ally = this._spawnEnemy(id, enemy.x + Math.cos(angle) * 125, enemy.y + Math.sin(angle) * 125, {
              level: enemy.level, difficulty: this.endgame.tier, group: this.endgame.id, engaged: true
            });
            if (ally) {
              ally.expeditionStageId = this.endgame.activeStage?.id ?? null;
              this.endgame.activeStageTotal += 1;
              this.encounter.total += 1;
            }
          });
          if (nextPhase === 3) {
            for (let index = 0; index < 4; index += 1) {
              const angle = index * Math.PI / 2;
              this._createHazard({ owner: 'enemy', kind: 'black-road-collapse', x: enemy.x + Math.cos(angle) * 138, y: enemy.y + Math.sin(angle) * 138, radius: 54, life: 1.35, tick: 0.33, damage: enemy.damage * 0.54, color: enemy.color });
            }
          }
        }
        const witness = enemy.campaignId === 'chapter-one-witness';
        const chapterAbbot = enemy.campaignId === 'chapter-two-abbot';
        if (chapterAbbot && enemy.choirVerdict === 'bind-choir') {
          this.player.barrier += this.getStats().hp * 0.16 * this.getStats().ward;
          this.player.barrierTime = Math.max(this.player.barrierTime, 4.2);
          this.entities.hazards.filter((hazard) => hazard.owner === 'enemy' && distance(hazard, this.player) < 260).forEach((hazard) => { hazard.life = Math.min(hazard.life, 0.25); });
          this.notify(nextPhase === 2 ? 'The bound choir shelters the covenant, but answers the abbot with guardians.' : 'The bound choir holds the final toll at bay.', 'warning');
        } else if (chapterAbbot && enemy.choirVerdict === 'sever-choir') {
          enemy.stagger = Math.max(enemy.stagger, enemy.staggerMax * 0.58);
          this.notify(nextPhase === 2 ? 'The severed choir tears a weakness through Rath Vell’s guard.' : 'The last peal exposes the abbot to a final stagger.', 'warning');
        } else {
          const expansionLines = BOSS_PHASE_LINES[enemy.templateId];
          this.notify(nextPhase === 2
            ? witness ? 'The Bell-Witness pulls the field toward its chain.' : expansionLines?.[0] ?? 'The Abbot tolls — the citadel answers.'
            : witness ? 'Final toll — the witness breaks its own chain.' : expansionLines?.[1] ?? 'Final toll — survive the Bell-Broken.', 'warning');
        }
        enemy.punishWindow = Math.max(enemy.punishWindow ?? 0, runtime.punishWindow ?? 0);
        this.camera.flash = 0.42;
        this._pushEffect({ kind: 'boss-phase', x: enemy.x, y: enemy.y, life: 1.1, maxLife: 1.1, color: enemy.color });
        enemy.shield = Math.max(enemy.shield, enemy.maxHp * (nextPhase === 2 ? 0.08 : 0.12));
      }
    }
  }

  _triggerCombatReaction(enemy, options = {}) {
    if (!enemy || enemy.dead || options.noReaction) return false;
    const source = String(options.source ?? 'damage');
    if (source.startsWith('reaction-')) return false;
    enemy.reactionReady ??= {};
    const stats = this.getStats();
    const ready = (id) => (enemy.reactionReady[id] ?? 0) <= this.clock;
    const trigger = (id) => {
      const reaction = COMBAT_REACTIONS.find((entry) => entry.id === id);
      if (!reaction || !ready(id)) return null;
      enemy.reactionReady[id] = this.clock + reaction.cooldown;
      this._float(enemy.x, enemy.y - enemy.radius - 30, reaction.name.toUpperCase(), reaction.color, 'crit');
      this._pushEffect({ kind: 'affix-critical-burst', x: enemy.x, y: enemy.y, life: 0.48, maxLife: 0.48, color: reaction.color });
      this._recordReforgedProgress('reaction', { reactionId: reaction.id });
      return reaction;
    };
    if (source === 'execution' && (enemy.knockdown > 0 || enemy.marked > 0 || enemy.cursed > 0) && ready('red-harvest')) {
      const reaction = trigger('red-harvest');
      const heal = this.player.maxHp * 0.045 * stats.reactionPower;
      this.player.hp = clamp(this.player.hp + heal, 0, this.player.maxHp);
      this._createHazard({ owner: 'player', kind: 'reaction-red-harvest', x: enemy.x, y: enemy.y, radius: 104 * stats.area, life: 1.2, tick: 0.35, damage: stats.power * 0.55 * stats.reactionPower, color: reaction.color, mark: 2.4, noFatedProc: true });
      return true;
    }
    const hybridLike = /hybrid|confluence|orchid|anvil|citadel|mourning|sunward|gallows|procession/.test(source);
    if (hybridLike && (this.player.status.wardCharge ?? 0) > 0 && ready('ward-reversal')) {
      const reaction = trigger('ward-reversal');
      const stored = Math.min(this.player.status.wardCharge, this.player.maxHp * 0.35);
      this.player.status.wardCharge = 0;
      this._createHazard({ owner: 'player', kind: 'reaction-ward-reversal', x: enemy.x, y: enemy.y, radius: 118 * stats.area, life: 0.8, tick: 0.28, damage: (stats.power * 0.62 + stored * 0.42) * stats.reactionPower, color: reaction.color, stagger: 0.9, noFatedProc: true });
      return true;
    }
    if (enemy.marked > 0 && enemy.cursed > 0 && ready('gravebrand')) {
      const reaction = trigger('gravebrand');
      this._createHazard({ owner: 'player', kind: 'reaction-gravebrand', x: enemy.x, y: enemy.y, radius: 96 * stats.area, life: 0.72, tick: 0.24, damage: stats.power * 0.7 * stats.reactionPower, color: reaction.color, mark: 2.8, noFatedProc: true });
      return true;
    }
    if ((options.stagger ?? 0) >= 1.05 && (enemy.knockdown > 0 || enemy.stagger >= enemy.staggerMax * 0.62) && ready('bellbreak')) {
      const reaction = trigger('bellbreak');
      enemy.armor = Math.max(0, enemy.armor - Math.max(3, Math.ceil(enemy.armor * 0.22 * stats.reactionPower)));
      enemy.knockdown = Math.max(enemy.knockdown, enemy.boss ? 0.45 : 1.15);
      this._emitBurst(enemy.x, enemy.y, reaction.color, 16, 165);
      return true;
    }
    const projectileLike = /bolt|javelin|knife|comet|shard|spear|harpoon|spore|projectile|arrow|star/.test(source);
    if (projectileLike && enemy.cursed > 0 && ready('sunless-current')) {
      const reaction = trigger('sunless-current');
      const target = this.entities.enemies.filter((candidate) => !candidate.dead && candidate.id !== enemy.id && candidate.marked > 0).sort((a, b) => distance(a, enemy) - distance(b, enemy))[0];
      if (target) {
        this._createProjectile({ owner: 'player', kind: 'reaction-sunless-current', x: enemy.x, y: enemy.y, angle: angleTo(enemy, target), speed: 760, radius: 8, life: 0.8, damage: stats.power * 0.58 * stats.reactionPower, pierce: 1, color: reaction.color, mark: 2.4, homing: 0.2 });
      }
      return true;
    }
    return false;
  }

  _damageEnemy(enemy, rawDamage, options = {}) {
    if (!enemy || enemy.dead) return false;
    if (!Number.isFinite(rawDamage) || rawDamage <= 0) return false;
    this._engageEnemyGroup(enemy);
    let damage = rawDamage;
    const stats = this.getStats();
    const protectedUnit = enemy.protectedBy ? this.entities.enemies.find((candidate) => candidate.id === enemy.protectedBy && !candidate.dead) : null;
    if (protectedUnit && distance(protectedUnit, enemy) < 240) damage *= 0.68;
    const objectiveWardActive = (enemy.objectiveWardIds ?? []).some((id) => (this.entities.destructibles ?? []).some((entry) => entry.id === id && !entry.broken));
    if (objectiveWardActive) {
      damage *= 0.12;
      if (!enemy.objectiveWardNotified || this.clock - enemy.objectiveWardNotified > 2.2) {
        enemy.objectiveWardNotified = this.clock;
        this._float(enemy.x, enemy.y - enemy.radius - 24, 'RITUAL WARD', '#c48bdd', 'guard');
      }
    }
    if (enemy.elite) damage *= stats.eliteDamage;
    if (enemy.boss) damage *= stats.bossDamage;
    const family = bestiaryFamilyForRole(enemy.role);
    const familyState = this._reforged()?.bestiary?.[family.id];
    if (familyState?.insightId === 'anatomy') damage *= 1 + 0.035 + familyState.rank * 0.015;
    if (enemy.marked > 0) damage *= 1 + stats.marked + 0.1;
    if (enemy.marked > 0) damage *= stats.markedDamage;
    if (enemy.cursed > 0) damage *= 1.12;
    if (enemy.campaignId === 'chapter-two-abbot' && enemy.choirVerdict === 'sever-choir' && enemy.phase >= 2) damage *= 1.1;
    if (enemy.marked > 0 && this.getTalentRank('warden-penitent')) damage *= 1.18;
    if (enemy.marked > 0 && this.getTalentRank('warden-requiem')) damage *= 1.16;
    if (enemy.cursed > 0 && this.getTalentRank('thorn-plaguecrown')) damage *= 1.18;
    if (options.executioner && (enemy.marked > 0 || enemy.cursed > 0 || enemy.knockdown > 0)) damage *= 1.22;
    if (options.sunder && (enemy.marked > 0 || enemy.cursed > 0)) damage *= 1.14;
    const ambush = this.player.buffs.find((buff) => buff.id === 'ambush');
    if (ambush) damage *= 1 + this.getTalentRank('veil-ambush') * 0.2;
    const critical = this.random() < stats.crit;
    enemy.lastPlayerCritical = false;
    if (critical) damage *= stats.critMult;
    if (options.armorPierce) damage *= 100 / (100 + enemy.armor * (1 - options.armorPierce));
    else damage *= 100 / (100 + enemy.armor);
    if (enemy.shield > 0) {
      const absorbed = Math.min(enemy.shield, damage);
      enemy.shield -= absorbed;
      damage -= absorbed;
      if (!damage) this._float(enemy.x, enemy.y - enemy.radius - 12, 'BLOCK', '#b8e8ff', 'small');
    }
    if (damage <= 0) return false;
    const impactDirection = angleTo(this.player, enemy);
    const hitDirection = { x: Math.cos(impactDirection), y: Math.sin(impactDirection) };
    const hitResult = this.combatSystem.resolveHit({
      source: this.player, target: enemy, abilityId: options.abilityId ?? null, tags: options.tags ?? [],
      damage, damageType: options.damageType ?? options.source ?? 'physical',
      stagger: options.stagger ?? 0.56, poiseDamage: options.poiseDamage ?? damage * (options.stagger ?? 0.56) * stats.staggerMultiplier,
      impulse: options.impulse ?? (rawDamage > stats.power * 1.8 ? 180 : 70), guardDamage: options.guardDamage ?? 0,
      executePower: stats.executeThreshold, crit: critical, position: { x: enemy.x, y: enemy.y }, direction: hitDirection,
      covenantTags: this.covenantSystem?.resolve?.(this.player.covenant)?.primary ? [this.covenantSystem.resolve(this.player.covenant).primary] : []
    });
    damage = hitResult.damage;
    enemy.guard = hitResult.guardAfter;
    enemy.poise = hitResult.staggered ? enemy.poiseMax : hitResult.poiseAfter;
    enemy.hp -= damage;
    enemy.lastPlayerCritical = critical;
    this.domainEvents.emit('combat:hit-resolved', { enemyId: enemy.id, source: options.source ?? 'damage', result: hitResult });
    this._applyUniqueBehaviorEvent('combat-hit', { enemy, hitResult, source: options.source ?? 'damage' });
    if (enemy.hunterId && enemy.hunterRetaliation && !options.noHunterRetaliation && damage >= enemy.maxHp * 0.08 && enemy.hp > 0) {
      this._createHazard({ owner: 'enemy', kind: 'hunter-reprisal', x: enemy.x, y: enemy.y, radius: 76, life: 0.72, tick: 0.5, damage: enemy.damage * enemy.hunterRetaliation, color: '#c45c66' });
    }
    if (critical && enemy.marked > 0 && this.getTalentRank('warden-requiem')) this._gainResource(10);
    enemy.hitFlash = critical ? 0.18 : 0.11;
    enemy.justHit = 0.24;
    const launch = Boolean(hitResult.launch || options.knockdown || options.suspendElites || critical || rawDamage >= stats.power * 1.85 || (options.stagger ?? 0) >= 1.25);
    if (hitResult.knockback > 0 && !enemy.boss) {
      const push = Math.min(48, hitResult.knockback * 0.12);
      this._moveBodyWithGeometry(enemy, enemy.x + hitDirection.x * push, enemy.y + hitDirection.y * push);
    }
    if (hitResult.knockdown) enemy.knockdown = Math.max(enemy.knockdown, 1.05);
    if (launch) {
      const lift = enemy.boss ? 190 : options.knockdown || options.suspendElites ? 335 : 230;
      enemy.verticalVelocity = Math.max(enemy.verticalVelocity ?? 0, lift);
      enemy.grounded = false;
    }
    enemy.marked = Math.max(enemy.marked, options.mark ?? 0);
    if (options.source?.includes('hex') || options.source === 'orchid' || options.source === 'eclipse') {
      enemy.cursed = Math.max(enemy.cursed, 3.5 + stats.curseDuration);
      enemy.slow = Math.max(enemy.slow ?? 0, stats.curseSlow);
    }
    enemy.stagger += damage * (options.stagger ?? 0.56) * stats.staggerMultiplier;
    if (options.pull) {
      const direction = normalize(this.player.x - enemy.x, this.player.y - enemy.y);
      this._moveBodyWithGeometry(enemy, enemy.x + direction.x * options.pull, enemy.y + direction.y * options.pull);
      if (this.endgame?.blackRoad) this._constrainBlackRoadArena();
    }
    this.stats.damage += Math.round(damage);
    this._float(enemy.x, enemy.y - enemy.radius - 14, Math.round(damage), critical ? '#fff0a5' : '#f3d8d0', critical ? 'crit' : 'damage');
    this._emitBurst(enemy.x, enemy.y, options.color ?? '#f5c0bd', critical ? 10 : 5, critical ? 140 : 85);
    const actionProfile = this.player.presentation?.action?.profile;
    const impactProfile = critical ? 'critical' : options.impactProfile ?? actionProfile?.impactProfile ?? (rawDamage > stats.power * 1.8 ? 'heavy-cleave' : 'medium-slash');
    if (this.presentation) {
      this.presentation.animationDirector.reactEnemy(this, enemy, { amount: damage, direction: impactDirection, critical, damageType: options.damageType ?? options.source ?? 'physical' });
      this.presentation.requestImpact(impactProfile, {
        x: enemy.x, y: enemy.y, direction: impactDirection, priority: enemy.boss ? 8 : critical ? 7 : 4,
        musicAccent: enemy.boss && critical ? actionProfile?.musicAccentProfile : null
      });
      this.presentation.emit('combat:attack-impact', { entityId: enemy.id, enemyId: enemy.templateId, impactProfile, critical, damage }, { source: 'player-combat', priority: critical ? 7 : 4 });
    } else {
      this.hitStop = Math.max(this.hitStop, critical ? 0.055 : rawDamage > stats.power * 1.8 ? 0.028 : 0.012);
      if (critical || rawDamage > stats.power * 1.9) this.input.rumble?.(critical ? 0.09 : 0.06, critical ? 0.5 : 0.32, critical ? 0.22 : 0.14);
    }
    if (critical && options.source === 'orchid' && this.hasPower('night-orchid')) {
      this._createProjectile({ owner: 'player', kind: 'orchid-twin', x: enemy.x, y: enemy.y, angle: this.player.facing, speed: 500, radius: 9, life: 0.9, damage: stats.power * 0.82, pierce: 1, color: this.getHybrid().color, mark: 3 });
    }
    if (critical && !options.noFatedProc && this._rollFatedProc('criticalBurst', stats)) {
      this._createHazard({ owner: 'player', kind: 'fated-rupture', x: enemy.x, y: enemy.y, radius: 92, life: 0.62, tick: 0.24, damage: stats.power * 0.78, color: '#ffcf7d', mark: 2.4, noFatedProc: true });
      this._pushEffect({ kind: 'affix-critical-burst', x: enemy.x, y: enemy.y, life: 0.44, maxLife: 0.44, color: '#ffcf7d' });
    }
    if (enemy.stagger >= enemy.staggerMax && !this._enemyHasAffix(enemy, 'unstoppable')) {
      enemy.stagger = 0;
      enemy.knockdown = enemy.boss ? 1.0 : 1.4 + this.getTalentRank('veil-mercy') * 1.5;
      enemy.state = 'knockdown';
      enemy.verticalVelocity = Math.max(enemy.verticalVelocity ?? 0, enemy.boss ? 250 : 370);
      enemy.grounded = false;
      if (enemy.boss) this._recordReforgedProgress('boss-break', { role: enemy.role, enemyId: enemy.templateId });
      if (enemy.boss && this.presentation) {
        this.presentation.requestImpact('boss-stagger', { x: enemy.x, y: enemy.y, direction: impactDirection, priority: 10 });
        this.presentation.emit('combat:boss-stagger', { entityId: enemy.id, enemyId: enemy.templateId, phase: enemy.phase ?? 1 }, { source: 'boss-combat', priority: 10 });
      }
      this.notify(`${enemy.name} staggered — execution window!`, 'quiet');
      this._emitBurst(enemy.x, enemy.y, '#f5df8d', 14, 145);
      if (enemy.elite && this.hasPower('unbowed-pact')) {
        this.player.barrier += stats.hp * 0.1 * stats.ward;
        this.player.barrierTime = Math.max(this.player.barrierTime, 3.5);
        this.player.buffs.push({ id: 'speed', time: 2.8 });
        this.notify('Unbowed Pact answers the stagger.', 'accent');
      }
    }
    if (options.knockdown && this.random() < options.knockdown) enemy.knockdown = Math.max(enemy.knockdown, 0.7);
    if (options.suspendElites && enemy.elite) enemy.knockdown = Math.max(enemy.knockdown, 1.45);
    if (!enemy.boss && !enemy.executePrimed && enemy.hp > 0 && stats.executeThreshold > 0 && enemy.hp <= enemy.maxHp * stats.executeThreshold) {
      enemy.executePrimed = true;
      enemy.knockdown = Math.max(enemy.knockdown, 1.25);
      enemy.state = 'knockdown';
      this.notify(`${enemy.name} enters a relic execution window.`, 'quiet');
    }
    this._triggerCombatReaction(enemy, options);
    if (enemy.hp <= 0) this._killEnemy(enemy, options.source ?? 'damage');
    return true;
  }

  _damagePlayer(rawDamage, source = 'enemy') {
    const player = this.player;
    if (player.iframes > 0 || player.deathTime > 0) return false;
    const stats = this.getStats();
    let damage = rawDamage * 100 / (100 + stats.armor);
    let absorbedByBarrier = 0;
    const nearestAttacker = this.entities.enemies.filter((enemy) => !enemy.dead).sort((a, b) => distance(a, player) - distance(b, player))[0];
    if (nearestAttacker) {
      const family = bestiaryFamilyForRole(nearestAttacker.role);
      const familyState = this._reforged()?.bestiary?.[family.id];
      if (familyState?.insightId === 'survival') damage *= Math.max(0.72, 0.96 - familyState.rank * 0.012);
    }
    if (this.endgame?.expeditionBanes?.includes('fragile')) damage *= 1.2;
    if (player.status.potionWard) damage *= 0.68;
    if (player.status.umbra) damage *= Math.max(0.55, 1 - this.getTalentRank('veil-umbra') * 0.08);
    if (this.getTalentRank('iron-stand') && player.hp <= player.maxHp * 0.3) damage *= 0.75;
    const wardHazard = this.entities.hazards.some((hazard) => hazard.owner === 'player' && distance(hazard, player) < hazard.radius && ['ward', 'cairn', 'citadel', 'bastion', 'red-siege', 'night-siege'].some((kind) => hazard.kind === kind || hazard.kind.startsWith(`${kind}-`)));
    if (wardHazard) {
      damage *= 0.78 * Math.max(0.5, 1 - stats.wardDamageReduction);
      if (stats.wardArmor) damage *= (100 + stats.armor) / (100 + stats.armor * (1 + stats.wardArmor));
    }
    if (player.barrier > 0) {
      const absorbed = Math.min(player.barrier, damage);
      absorbedByBarrier += absorbed;
      player.barrier -= absorbed;
      damage -= absorbed;
      if (absorbed) player.status.wardCharge = Math.min(player.maxHp * 0.5, (player.status.wardCharge ?? 0) + absorbed);
      if (absorbed) this._float(player.x, player.y - 40, `-${Math.round(absorbed)}`, '#a9ecf1', 'small');
      const reprisal = this.getTalentRank('warden-reprisal');
      if (absorbed && reprisal) {
        const attackers = this.entities.enemies.filter((enemy) => !enemy.dead).sort((a, b) => distance(a, player) - distance(b, player)).slice(0, reprisal);
        attackers.forEach((attacker, index) => this._createProjectile({ owner: 'player', kind: 'reprisal-briar', x: player.x, y: player.y, angle: angleTo(player, attacker) + (index - (attackers.length - 1) / 2) * 0.1, speed: 700, radius: 8, life: 0.62, damage: stats.power * (0.58 + reprisal * 0.08), pierce: 0, color: '#79d9c6', mark: 2.5 }));
      }
      if (absorbed && this.getHybrid()?.id === 'dawn-aegis' && absorbed >= stats.hp * 0.03) {
        const target = this.entities.enemies.filter((enemy) => !enemy.dead && enemy.marked > 0).sort((a, b) => distance(a, player) - distance(b, player))[0] ?? this.entities.enemies.filter((enemy) => !enemy.dead).sort((a, b) => distance(a, player) - distance(b, player))[0];
        if (target) this._createProjectile({ owner: 'player', kind: 'aegis-javelin', x: player.x, y: player.y, angle: angleTo(player, target), speed: 760, radius: 8, life: 0.72, damage: stats.power * 0.64, pierce: 1, color: this.getHybrid().color, mark: 3.2, homing: 0.15 });
      }
      if (absorbed && this._rollFatedProc('wardPulse', stats)) {
        this._damageArc(player, 120, Math.PI * 2, stats.power * 0.72, { source: 'fated-ward-pulse', stagger: 0.74, mark: 2.3, color: '#8be6d3', noFatedProc: true });
        this._pushEffect({ kind: 'affix-ward-pulse', x: player.x, y: player.y, life: 0.46, maxLife: 0.46, color: '#8be6d3' });
      }
    }
    if (absorbedByBarrier > 0) this._applyUniqueBehaviorEvent('player-damaged', { absorbed: absorbedByBarrier, source });
    if (damage <= 0) return false;
    player.hp -= damage;
    if (damage >= player.maxHp * 0.08 || /smash|pounce|boss|slam|charge/i.test(source)) {
      player.verticalVelocity = Math.max(player.verticalVelocity ?? 0, damage >= player.maxHp * 0.18 ? 330 : 220);
      player.grounded = false;
    }
    if (player.primary === 'ironbound') this._gainClassMechanic('damage-taken', Math.min(30, 6 + (damage + absorbedByBarrier) / Math.max(1, player.maxHp) * 90));
    player.lastDamageSource = source;
    player.combatTime = 5;
    this._float(player.x, player.y - 40, Math.round(damage), '#ff8d8d', 'damage');
    if (this.presentation) {
      const impactProfile = damage >= player.maxHp * 0.18 ? 'heavy-blunt' : damage >= player.maxHp * 0.08 ? 'medium-blunt' : 'light-slash';
      const attackerAngle = nearestAttacker ? angleTo(nearestAttacker, player) : player.facing + Math.PI;
      this.presentation.requestImpact(impactProfile, { x: player.x, y: player.y, direction: attackerAngle, priority: 6, shakeScale: 0.82 });
      player.presentation ??= {};
      player.presentation.reaction = { direction: attackerAngle, time: impactProfile === 'heavy-blunt' ? 0.3 : 0.18, duration: impactProfile === 'heavy-blunt' ? 0.3 : 0.18, tier: impactProfile.startsWith('heavy') ? 'heavy' : 'light' };
    } else {
      this.camera.shake = Math.max(this.camera.shake, Math.min(10, 3 + damage * 0.15));
      this.input.rumble?.(0.12, 0.52, 0.35);
    }
    this._emitBurst(player.x, player.y, '#ff8d8d', 8, 100);
    this.emit('sound', { id: 'hurt' });
    if (player.hp <= 0) {
      const secondWind = this._secondWindCooldown();
      if (secondWind > 0 && (player.leveling?.secondWindCooldown ?? 0) <= 0) {
        player.leveling.secondWindCooldown = secondWind;
        player.hp = player.maxHp * (secondWind <= 75 ? 0.5 : 0.36);
        player.barrier = Math.max(player.barrier, player.maxHp * 0.22 * stats.ward);
        player.barrierTime = Math.max(player.barrierTime, 4.5);
        player.iframes = Math.max(player.iframes, 1.1);
        this._pushEffect({ kind: 'convergence', x: player.x, y: player.y, life: 1.2, maxLife: 1.2, color: '#f4d57c' });
        this._emitBurst(player.x, player.y, '#f4d57c', 32, 250);
        this.notify('The covenant refuses the toll.', 'accent');
      } else this._die();
    }
    return true;
  }

  _killEnemy(enemy, source) {
    if (enemy.dead) return;
    enemy.dead = true;
    enemy.deathTime = 0.56;
    enemy.state = 'dead';
    this._applyUniqueBehaviorEvent('enemy-killed', { enemy, source });
    const corpses = this.entities.corpses ?? (this.entities.corpses = []);
    corpses.push({
      id: uid('corpse'), templateId: enemy.templateId, x: enemy.x, y: enemy.y, groundElevation: enemy.groundElevation ?? 0,
      radius: enemy.radius, color: enemy.color, angle: enemy.facing,
      elite: enemy.elite, boss: enemy.boss, life: enemy.boss ? 38 : 24, maxLife: enemy.boss ? 38 : 24,
      deathProfile: enemy.boss ? 'authored-boss' : enemy.knockdown > 0 ? 'grounded-collapse' : /fire|burn/.test(source) ? 'scorched' : /ice|frost/.test(source) ? 'frozen' : 'directional',
      variant: Math.abs(Math.floor(enemy.x * 0.13 + enemy.y * 0.07)) % 3,
      impulse: enemy.boss ? 0 : Math.min(14, 2 + enemy.justHit * 18), source
    });
    this.presentation?.emit('animation:death', { entityId: enemy.id, enemyId: enemy.templateId, deathProfile: corpses.at(-1).deathProfile, source }, { source: 'enemy-death', priority: enemy.boss ? 10 : enemy.elite ? 6 : 2 });
    this._pushEffect({ kind: 'ground-decal', x: enemy.x, y: enemy.y + enemy.radius * .28, radius: enemy.boss ? 68 : enemy.elite ? 42 : 30, life: enemy.boss ? 34 : 20, maxLife: enemy.boss ? 34 : 20, color: /ice|frost/.test(source) ? '#9fd9e6' : /fire|burn/.test(source) ? '#4f2921' : '#5b1822', variant: Math.abs(Math.floor(enemy.x + enemy.y)) % 3 });
    if (corpses.length > MAX_CORPSES) corpses.splice(0, corpses.length - MAX_CORPSES);
    this.stats.kills += 1;
    this._recordLevelingProgress('kill', 1, { enemyId: enemy.templateId });
    if (enemy.elite) this._recordLevelingProgress('elite', 1, { enemyId: enemy.templateId });
    if (enemy.boss) this._recordLevelingProgress('boss', 1, { enemyId: enemy.templateId });
    const enemyZone = zoneAt(enemy.x, enemy.y);
    const enemyDistrict = districtAt(enemy.x, enemy.y);
    this._recordReforgedProgress('kill', { role: enemy.role, enemyId: enemy.templateId, zoneId: enemyZone.id, factionId: enemyDistrict?.factionId, elite: enemy.elite, boss: enemy.boss });
    const contractZoneId = this.endgame?.contractId ? this.endgame.zoneId : this.endgame?.delveId ? delveById(this.endgame.delveId)?.zoneId : this.endgame ? '__endgame__' : enemyZone.id;
    const contractContext = { zoneId: contractZoneId, contractId: this.endgame?.contractId ?? null, enemyId: enemy.templateId, role: enemy.role, amount: 1 };
    this._progressContracts('kill', contractContext);
    if (enemy.elite) this._progressContracts('elite', contractContext);
    if (enemy.boss) this._progressContracts('boss', contractContext);
    if (enemy.elite && !this.endgame) this._gainRenown(districtAt(enemy.x, enemy.y).factionId, enemy.boss ? 5 : 1, false);
    this._gainResource(5 + (enemy.elite ? 4 : 0));
    if (this.player.primary === 'gravebinder' && (enemy.marked > 0 || enemy.cursed > 0)) this._gainClassMechanic('harvest', enemy.elite ? 24 : 12);
    this._gainXp(Math.round(enemy.scoreValue));
    this._advanceRelicBonds(enemy);
    const lootStats = this.getStats();
    const family = bestiaryFamilyForRole(enemy.role);
    const harvestBonus = this._reforged()?.bestiary?.[family.id]?.insightId === 'harvest' ? 1 + 0.05 + (this._reforged().bestiary[family.id].rank ?? 0) * 0.025 : 1;
    this.player.gold += Math.round(range(enemy.gold[0], enemy.gold[1], this.random) * (enemy.elite ? 1.7 : 1) * (1 + lootStats.goldFind) * harvestBonus * this._worldOath().reward);
    if (enemy.elite) this.player.materials.shards = (this.player.materials.shards ?? 0) + (enemy.boss ? 3 : 1);
    if (enemy.boss) this.player.materials.echoes = (this.player.materials.echoes ?? 0) + 1;
    if (enemy.elite && this.hasPower('last-peal') && this.player.confluence < 3) {
      this.player.confluence += 1;
      this.notify('Last Peal restores a Confluence charge.', 'quiet');
    }
    if (enemy.elite && lootStats.soulLeech > 0) {
      const restored = this.player.maxHp * lootStats.soulLeech;
      this.player.barrier += restored;
      this.player.barrierTime = Math.max(this.player.barrierTime, 3.2);
      this._float(this.player.x, this.player.y - 44, `+${Math.round(restored)} ward`, '#b3e8d6', 'heal');
      this._pushEffect({ kind: 'affix-soul-leech', x: this.player.x, y: this.player.y, life: 0.5, maxLife: 0.5, color: '#b3e8d6' });
    }
    if (enemy.cursed > 0 && this.getStats().cursedKillHeal > 0) {
      const heal = this.player.maxHp * this.getStats().cursedKillHeal;
      this.player.hp = clamp(this.player.hp + heal, 0, this.player.maxHp);
      this._float(this.player.x, this.player.y - 34, `+${Math.round(heal)}`, '#b7e787', 'heal');
    }
    if (lootStats.lifeOnKill > 0) {
      const heal = this.player.maxHp * lootStats.lifeOnKill;
      this.player.hp = clamp(this.player.hp + heal, 0, this.player.maxHp);
      this._float(this.player.x, this.player.y - 34, `+${Math.round(heal)}`, '#c6efa6', 'heal');
    }
    if (enemy.cursed > 0 && this.getHybrid().id === 'nightbloom') this._createProjectile({ owner: 'player', kind: 'shade-seed', x: enemy.x, y: enemy.y, angle: this.player.facing, speed: 440, radius: 9, life: 0.9, damage: this.getStats().power * 0.82, pierce: 1, color: this.getHybrid().color, mark: 2.5 });
    if (enemy.cursed > 0 && this.getTalentRank('thorn-witchfire')) {
      const count = this.getTalentRank('thorn-witchfire');
      for (let index = 0; index < count; index += 1) this._createProjectile({ owner: 'player', kind: 'witchfire-spore', x: enemy.x, y: enemy.y, angle: this.player.facing + (index - (count - 1) / 2) * 0.28, speed: 500, radius: 7, life: 0.82, damage: this.getStats().power * 0.52, pierce: 1, color: '#bb8dff', mark: 2.2, homing: 0.2 });
    }
    if (enemy.cursed > 0 && enemy.elite && this.getTalentRank('thorn-gravetide')) this._createHazard({ owner: 'player', kind: 'gravetide', x: enemy.x, y: enemy.y, radius: 96, life: 3.4, tick: 0.38, damage: this.getStats().power * 0.72, color: '#bb8dff', slow: 0.3, mark: 2.6 });
    if (enemy.cursed > 0 && this.hasPower('mirewrit-censer')) {
      this.entities.enemies.filter((candidate) => !candidate.dead && candidate.id !== enemy.id && distance(candidate, enemy) < 260).sort((a, b) => distance(a, enemy) - distance(b, enemy)).slice(0, 2).forEach((candidate, index) => {
        candidate.cursed = Math.max(candidate.cursed, 4.5 + lootStats.curseDuration);
        candidate.slow = Math.max(candidate.slow ?? 0, 0.18);
        this._createProjectile({ owner: 'player', kind: 'mirewrit-hex', x: enemy.x, y: enemy.y, angle: angleTo(enemy, candidate), speed: 560, radius: 7, life: 0.54 + index * 0.06, damage: lootStats.power * 0.32, pierce: 0, color: '#bb8dff', mark: 2 });
      });
    }
    if (enemy.cursed > 0 && enemy.elite && this.getTalentRank('grave-famine')) {
      const count = this.getTalentRank('grave-famine');
      for (let index = 0; index < count; index += 1) this._createProjectile({ owner: 'player', kind: 'famine-hex', x: enemy.x, y: enemy.y, angle: this.player.facing + (index - (count - 1) / 2) * 0.22, speed: 590, radius: 8, life: 0.82, damage: lootStats.power * 0.58, pierce: 1, color: '#8cc8d8', mark: 2.6, homing: 0.22 });
    }
    if (enemy.cursed > 0 && enemy.elite && this.hasPower('grave-harvest')) {
      this._gainResource(this.player.maxResource * 0.12);
      const prey = this.entities.enemies.filter((candidate) => !candidate.dead && candidate.id !== enemy.id).sort((a, b) => distance(a, enemy) - distance(b, enemy))[0];
      if (prey) this._createProjectile({ owner: 'player', kind: 'harvest-hex', x: enemy.x, y: enemy.y, angle: angleTo(enemy, prey), speed: 700, radius: 8, life: 0.7, damage: lootStats.power * 0.72, pierce: 1, color: '#8cc8d8', mark: 3, homing: 0.2 });
    }
    if (enemy.marked > 0 && this.getTalentRank('dawn-cinder')) {
      const count = this.getTalentRank('dawn-cinder');
      for (let index = 0; index < count; index += 1) this._createProjectile({ owner: 'player', kind: 'cinder-spark', x: enemy.x, y: enemy.y, angle: this.player.facing + (index - (count - 1) / 2) * 0.26, speed: 620, radius: 7, life: 0.76, damage: lootStats.power * 0.5, pierce: 1, color: '#f3cd70', mark: 2.4, homing: 0.18 });
    }
    if (enemy.marked > 0 && enemy.cursed > 0 && this.getHybrid()?.id === 'requiem') {
      const heal = this.player.maxHp * 0.035;
      this.player.hp = clamp(this.player.hp + heal, 0, this.player.maxHp);
      this._createHazard({ owner: 'player', kind: 'requiem-hymn', x: enemy.x, y: enemy.y, radius: 78, life: 0.72, tick: 0.24, damage: lootStats.power * 0.55, color: this.getHybrid().color, slow: 0.2, mark: 2.2 });
      this._float(this.player.x, this.player.y - 34, `+${Math.round(heal)}`, '#d5d7a0', 'heal');
    }
    if (enemy.lastPlayerCritical && this.hasPower('gutter-star')) {
      this.player.cooldowns.dodge = Math.max(0, this.player.cooldowns.dodge - this.getPrimaryClass().abilities.dodge.cooldown * 0.18);
      [-0.16, 0.16].forEach((offset) => this._createProjectile({ owner: 'player', kind: 'gutter-knife', x: enemy.x, y: enemy.y, angle: this.player.facing + offset, speed: 700, radius: 7, life: 0.7, damage: lootStats.power * 0.42 * lootStats.projectileDamage, pierce: 1, color: '#ff9a5d', mark: 2 }));
    }
    this._dropLoot(enemy, Boolean(enemy.boss || enemy.targetDrop || enemy.nemesisId));
    if (enemy.elite && this.hasPower('black-lantern') && this.random() < 0.07) {
      const extra = this._generateItem({ enemy, sourceId: this._lootSourceForEnemy(enemy), elite: true, minRarity: 'relic' });
      if (extra) {
        const drop = { id: uid('lantern-loot'), x: enemy.x + range(-18, 18, this.random), y: enemy.y + range(-18, 18, this.random), item: extra, sourceId: extra.sourceId, life: 70, bob: this.random() * Math.PI * 2 };
        this.entities.loot.push(drop);
        this._presentLootSpawn(drop);
      }
    }
    this._emitBurst(enemy.x, enemy.y, enemy.color, enemy.boss ? 48 : 13, enemy.boss ? 280 : 145);
    this.emit('sound', { id: enemy.boss ? 'boss' : 'kill' });
    if (this._enemyHasAffix(enemy, 'sanguine') || this.hasEndgameModifier('sanguine')) this._createHazard({ owner: 'enemy', kind: 'sanguine', x: enemy.x, y: enemy.y, radius: 85, life: 4, tick: 0.54, damage: enemy.damage * 0.42, color: '#9e4151' });
    if (this._enemyHasAffix(enemy, 'volatile') || this.hasEndgameModifier('volatile') && enemy.elite) {
      this._createHazard({ owner: 'enemy', kind: 'volatile-death', x: enemy.x, y: enemy.y, radius: 104, life: 0.78, tick: 0.58, damage: enemy.damage * 1.05, color: '#ef9a62' });
      this._pushEffect({ kind: 'telegraph', x: enemy.x, y: enemy.y, radius: 104, life: 0.7, maxLife: 0.7, color: '#ef9a62' });
    }
    if ((source === 'hybrid' || source === 'execution') && enemy.elite && enemy.knockdown > 0 && this.hasPower('gallows-key')) {
      const hybrid = this.getHybrid();
      this.player.cooldowns.hybrid = Math.min(this.player.cooldowns.hybrid, hybrid.signature.cooldown * 0.5);
      this.notify('Gallows Key refunds half of Gallows Run.', 'quiet');
    }
    if (enemy.cursed > 0 && (source === 'soul-hex' || source === 'wraith-hex') && this.getHybrid()?.id === 'wraithblade' && this.hasPower('wraithblade-refund')) {
      const hybrid = this.getHybrid();
      this.player.cooldowns.hybrid = Math.min(this.player.cooldowns.hybrid, hybrid.signature.cooldown * 0.55);
      this.notify('Wraith Gallows returns a portion of Mourning Cut.', 'quiet');
    }
    this._onCampaignEnemyDefeated(enemy);
    if (enemy.boss) {
      this.stats.bosses += 1;
      const variantId = enemy.bossRuntime?.variantId;
      if (variantId && variantId !== 'base') {
        this.player.sanctuary.discoveries ??= [];
        const discovery = `boss:${enemy.templateId}:${variantId}`;
        if (!this.player.sanctuary.discoveries.includes(discovery)) this.player.sanctuary.discoveries.push(discovery);
      }
      this.emit('boss-defeated', { enemy });
      if (enemy.campaignBoss) {
        this.notify(`${enemy.name} falls. The campaign road advances.`, 'accent');
      } else {
        this._setObjective('The Bell-Broken falls', 'The citadel is silent. Return to Ashen Sanctuary.', 1, 1);
        this.notify('Rath Vell falls. A target-farmable cache is yours.', 'accent');
      }
    }
    if (enemy.nemesisId) {
      const nemesis = this.player.nemeses.find((entry) => entry.id === enemy.nemesisId);
      const vendetta = Math.max(1, nemesis?.bounty ?? 1);
      this._reforged().vendetta += vendetta;
      this.player.materials.marks += Math.max(1, Math.floor(vendetta / 3));
      this.player.gold += 120 * vendetta;
      this.player.nemeses = this.player.nemeses.filter((nemesis) => nemesis.id !== enemy.nemesisId);
      this.notify(`${enemy.name} is finally laid to rest · +${vendetta} Vendetta.`, 'accent');
      this._emitReforgedUpdate();
    }
    if (enemy.hunterId) {
      const index = this.player.hunters.findIndex((entry) => entry.id === enemy.hunterId);
      if (index >= 0) {
        const outcome = this.hunterSystem.recordDefeat(this.player.hunters[index], { now: this.clock });
        this.player.hunters[index] = outcome.hunter;
        const rewardDefinition = uniqueById(outcome.rewardId);
        if (rewardDefinition && this._isUniqueEligible(rewardDefinition)) {
          const reward = this._createUniqueItem(rewardDefinition, { sourceId: 'nemesis', itemLevel: Math.max(this.player.level, enemy.level) });
          this._awardItem(reward, `${enemy.name} bounty`);
        }
        this.player.materials.marks += 1;
        this.domainEvents.emit('hunter:defeated', { hunterId: enemy.hunterId, enemyId: enemy.id, rewardId: outcome.rewardId });
        this.notify(`${enemy.name} is finally broken. The known bounty is yours.`, 'accent');
      }
    }
    if (this.worldEvent?.id === enemy.eventId) {
      this.worldEvent.progress += 1;
      this._setObjective(this.worldEvent.name, this.worldEvent.objective, this.worldEvent.progress, this.worldEvent.target);
      if (this.worldEvent.progress >= this.worldEvent.target) this._completeWorldEvent();
    }
    if (enemy.persistentEventId) {
      const persistent = this._persistentWorldEventById(enemy.persistentEventId);
      if (persistent) {
        persistent.progress = Math.min(persistent.target, (persistent.progress ?? 0) + 1);
        const remaining = this.entities.enemies.some((candidate) => !candidate.dead && candidate.id !== enemy.id && candidate.persistentEventId === persistent.id);
        if (persistent.progress >= persistent.target || !remaining) this._resolvePersistentWorldEvent(persistent.id, 'defeated-presence');
      }
    }
    if (this.endgame && !enemy.boss) this.endgame.kills += 1;
  }

  _lootSourceForEnemy(enemy) {
    if (!enemy) return 'gravewake';
    if (enemy.nemesisId) return 'nemesis';
    if (this.endgame) {
      if (this.endgame.contractId) return this.player.contracts.active.find((entry) => entry.id === this.endgame.contractId)?.rewardSourceId ?? 'contracts';
      if (this.endgame.delveId) return 'delve';
      if (this.endgame.activity === 'hunt') return this.endgame.tier >= 25 ? 'mythic-hunt' : 'boss-hunt';
      if (this.endgame.activity === 'trial') return 'hybrid-trial';
      return this.endgame.activity;
    }
    if (enemy.campaignId === 'chapter-one-witness') return 'bell-witness';
    if (enemy.campaignId === 'chapter-two-abbot') return 'tolling-abbot';
    if (enemy.campaignId === 'chapter-three-boss') return 'blood-matron';
    if (enemy.campaignId === 'chapter-four-boss') return 'chain-regent';
    if (enemy.campaignId === 'chapter-five-boss') return 'veiled-oracle';
    if (enemy.eventId && this.worldEvent?.strongholdId) return 'stronghold';
    const zone = zoneAt(enemy.x, enemy.y);
    return lootSourceById(zone?.id)?.id ?? 'gravewake';
  }

  _dropLoot(enemy, guaranteed = false) {
    if (!enemy || !this.player) return;
    const sourceId = this._lootSourceForEnemy(enemy);
    const oathReward = this._worldOath().reward;
    const chance = guaranteed || enemy.boss ? 1 : Math.min(0.94, (enemy.elite ? 0.68 : 0.24) * Math.sqrt(oathReward));
    if (this.random() > chance) return;
    const drops = enemy.boss ? 2 + (this.random() < Math.min(0.8, 0.35 * oathReward) ? 1 : 0) : enemy.elite ? 1 + (this.random() < Math.min(0.62, 0.16 * oathReward) ? 1 : 0) : 1;
    for (let index = 0; index < drops; index += 1) {
      const item = this._generateItem({ forceUnique: guaranteed && index === 0, enemy, sourceId, boss: enemy.boss, elite: enemy.elite, bonus: index > 0 });
      if (!item) continue;
      const drop = { id: uid('loot'), x: enemy.x + range(-24, 24, this.random), y: enemy.y + range(-24, 24, this.random), item, sourceId, life: enemy.boss ? 100 : 55, bob: this.random() * Math.PI * 2 };
      this.entities.loot.push(drop);
      this._presentLootSpawn(drop);
    }
  }

  _presentLootSpawn(drop) {
    if (!drop?.item || !this.presentation) return;
    const score = RARITY_SCORE[drop.item.rarity] ?? 0;
    this.presentation.emit('loot:spawn', { dropId: drop.id, item: drop.item, x: drop.x, y: drop.y, rarity: drop.item.rarity }, { source: 'loot-presentation', priority: score });
    if (score >= RARITY_SCORE.relic) this.presentation.requestImpact(score >= RARITY_SCORE.unique ? 'medium-holy' : 'light-holy', { x: drop.x, y: drop.y, priority: Math.min(8, score), shakeScale: 0.35 });
  }

  _createUniqueItem(unique, options = {}) {
    if (!unique || !this.player) return null;
    const rarity = unique.rarity === 'mythic' ? 'mythic' : 'unique';
    const itemLevel = integer(options.itemLevel, this._lootItemLevel(options), 1, MAX_LEVEL);
    const base = ITEM_BASES.filter((entry) => entry.slot === unique.slot)[0] ?? null;
    const quality = rarity === 'mythic' ? 'exquisite' : this.random() < 0.26 ? 'exquisite' : 'superior';
    const sockets = Math.min(3, rarityById(rarity).sockets + (rarity === 'mythic' ? 1 : 0));
    return {
      id: uid('item'), rarity, name: unique.name, slot: unique.slot, icon: unique.icon, art: unique.art,
      baseId: base?.id, uniqueId: unique.id, affixes: this._rollAffixes(rarityById(rarity).affixes, true, { base, itemLevel, rarity, guaranteeFated: true }),
      implicit: base ? this._rollImplicit(base, itemLevel, quality) : null,
      quality, sockets, runeIds: [], runeId: undefined, setId: undefined,
      description: unique.effect, value: (rarity === 'mythic' ? 900 : 260) + itemLevel * (rarity === 'mythic' ? 55 : 25),
      itemLevel, masterwork: 0, masterworkFocus: 0, masterworkExalts: [], bondXp: 0, bondRank: 0, memories: [],
      forgeLockedAffix: -1, resonantSocketUsed: false, empoweredRunes: 0, heirloom: false,
      sourceId: options.sourceId ?? 'boss-hunt'
    };
  }

  _grantChapterTwoReward() {
    const state = this.getCampaign();
    if (!state || state.flags?.chapterTwoRewardClaimed) return false;
    const verdict = this.getChoirVerdict();
    const unique = UNIQUES.find((entry) => entry.campaignId === 'chapter-two' && entry.verdict === verdict);
    const item = this._createUniqueItem(unique, { sourceId: 'tolling-abbot' });
    if (!item) return false;
    const location = this._awardItem(item, 'Bellscar covenant reward');
    state.flags.chapterTwoRewardClaimed = true;
    this.player.materials = this._normalizeMaterials(this.player.materials);
    this.player.materials.cinders += 18;
    this.player.materials.echoes += 2;
    this.player.materials.marks += 1;
    this.notify(`${item.name} ${location ? `is secured in ${location === 'inventory' ? 'your pack' : 'the stash'}` : 'falls at your feet'}.`, 'accent');
    return true;
  }

  _grantExpansionChapterReward(act) {
    const state = this.getCampaign();
    const chapterId = state?.chapterId;
    if (!state || !act || state.flags?.chapterRewards?.[chapterId]) return false;
    const rewardIds = {
      'chapter-three': 'rootmother-heart',
      'chapter-four': 'regents-last-link',
      'chapter-five': 'map-of-five-edges'
    };
    const unique = uniqueById(rewardIds[chapterId]);
    const item = this._createUniqueItem(unique, { sourceId: act.rewardSourceId, itemLevel: Math.max(this.player.level, 20) });
    if (!item) return false;
    const location = this._awardItem(item, `${getCampaignChapter(chapterId).title} reward`);
    state.flags.chapterRewards ??= {};
    state.flags.chapterRewards[chapterId] = true;
    this.player.materials = this._normalizeMaterials(this.player.materials);
    this.player.materials.cinders += 24;
    this.player.materials.alloys += 3;
    this.player.materials.echoes += 2;
    this.player.materials.marks += 1;
    if (chapterId === 'chapter-five') this.player.materials.cores += 1;
    this._gainRenown(act.factionId, 55, false);
    this.notify(`${item.name} ${location ? `was secured in ${location === 'inventory' ? 'your pack' : 'the stash'}` : 'waits at your feet'}.`, 'accent');
    return true;
  }

  _lootItemLevel(context = {}) {
    const endgameBonus = this.endgame ? Math.floor((this.endgame.tier ?? 1) * 0.42) : 0;
    const enemyLevel = integer(context.enemy?.level, 0, 0, MAX_LEVEL);
    return clamp(Math.max(this.player?.level ?? 1, enemyLevel, (this.player?.level ?? 1) + endgameBonus), 1, MAX_LEVEL);
  }

  _eligibleUniques(sourceId, rarity = 'unique', options = {}) {
    return this.lootSystem.eligibleUniques({
      sourceId, rarity,
      isEligible: (unique) => this._isUniqueEligible(unique),
      targetFarm: options.targetFarm === true,
      preferredIds: options.preferredIds ?? []
    });
  }

  _rollRarity(context = {}) {
    const pity = this.player.lootPity ?? (this.player.lootPity = this._normalizeLootPity(null));
    const lootFind = this.getStats()?.lootFind ?? 0;
    const canRollMythic = this._eligibleUniques(context.sourceId, 'mythic').length > 0;
    if (context.forceUnique) {
      const rarity = canRollMythic && (pity.mythic >= 20 || this.random() < 0.035 + lootFind * 0.06) ? 'mythic' : 'unique';
      pity.boss = 0;
      pity.mythic = rarity === 'mythic' ? 0 : Math.min(199, pity.mythic + 1);
      return rarity;
    }
    const roll = this.random() / (1 + lootFind * 1.45);
    let rarity;
    if (context.boss) {
      if (canRollMythic && pity.mythic >= 24) rarity = 'mythic';
      else if (pity.boss >= 4) rarity = 'unique';
      else if (roll < 0.026 && canRollMythic) rarity = 'mythic';
      else if (roll < 0.255) rarity = 'unique';
      else if (roll < 0.63) rarity = 'relic';
      else rarity = 'rare';
      pity.boss = RARITY_SCORE[rarity] >= RARITY_SCORE.unique ? 0 : Math.min(99, pity.boss + 1);
      pity.mythic = rarity === 'mythic' ? 0 : Math.min(199, pity.mythic + 1);
      return rarity;
    }
    if (context.elite) {
      if (pity.elite >= 7) rarity = 'relic';
      else if (roll < 0.008 && canRollMythic) rarity = 'mythic';
      else if (roll < 0.075) rarity = 'unique';
      else if (roll < 0.29) rarity = 'relic';
      else if (roll < 0.77) rarity = 'rare';
      else rarity = 'magic';
      pity.elite = RARITY_SCORE[rarity] >= RARITY_SCORE.relic ? 0 : Math.min(99, pity.elite + 1);
      pity.mythic = rarity === 'mythic' ? 0 : Math.min(199, pity.mythic + 1);
      return rarity;
    }
    if (roll < 0.0015 && canRollMythic) rarity = 'mythic';
    else if (roll < 0.018) rarity = 'unique';
    else if (roll < 0.065) rarity = 'relic';
    else if (roll < 0.22) rarity = 'rare';
    else if (roll < 0.58) rarity = 'magic';
    else rarity = 'common';
    return rarity;
  }

  _generateItem(options = false) {
    if (!this.player) return null;
    const context = typeof options === 'boolean' ? { forceUnique: options } : { ...options };
    const sourceId = lootSourceById(context.sourceId)?.id ?? 'gravewake';
    const itemLevel = this._lootItemLevel(context);
    let rarity = ITEM_RARITIES.has(context.rarity) ? context.rarity : this._rollRarity({ ...context, sourceId });
    if (context.minRarity && (RARITY_SCORE[rarity] ?? 0) < (RARITY_SCORE[context.minRarity] ?? 0)) rarity = context.minRarity;
    if (rarity === 'unique' || rarity === 'mythic') {
      const unique = choose(this._eligibleUniques(sourceId, rarity), this.random);
      if (unique) return this._createUniqueItem(unique, { ...context, sourceId, itemLevel });
      rarity = 'relic';
    }
    const basePool = context.slot ? ITEM_BASES.filter((base) => base.slot === context.slot) : ITEM_BASES;
    const base = choose(basePool.length ? basePool : ITEM_BASES, this.random);
    const definition = rarityById(rarity);
    const quality = rarity === 'relic' && this.random() < 0.22 ? 'superior' : rarity === 'rare' && this.random() < 0.12 ? 'sturdy' : 'worn';
    const source = lootSourceById(sourceId);
    const eligibleSets = (source?.setIds ?? []).map((id) => setById(id)).filter((set) => set?.slots.includes(base.slot));
    const setChance = rarity === 'relic' ? 0.42 : rarity === 'rare' ? 0.12 : 0;
    const set = eligibleSets.length && this.random() < setChance ? choose(eligibleSets, this.random) : null;
    const prefix = rarity === 'relic' ? choose(['Reliquary', 'Starved', 'Covenant', 'Bellscar', 'Blackroad'], this.random) : rarity === 'rare' ? choose(['Dusk', 'Ashen', 'Hallowed', 'Gallows', 'Veiled'], this.random) : rarity === 'magic' ? choose(['Whispering', 'Harrowed', 'Cinder', 'Pale'], this.random) : '';
    const name = set ? `${set.name.split(' ')[0]} ${base.name}` : prefix ? `${prefix} ${base.name}` : base.name;
    const sockets = Math.min(3, definition.sockets + (quality === 'superior' ? 1 : 0));
    return {
      id: uid('item'), rarity, name, slot: base.slot, icon: base.icon, art: base.art,
      baseId: base.id, affixes: this._rollAffixes(definition.affixes, rarity === 'relic', { base, itemLevel, rarity, guaranteeFated: rarity === 'relic' }), implicit: this._rollImplicit(base, itemLevel, quality),
      setId: set?.id, quality, sockets, runeIds: [], runeId: undefined,
      description: set ? `${set.name} set relic. Find matching pieces to awaken its covenant bonuses.` : rarity === 'relic' ? 'A high-born relic carrying an extra affix and richer forge potential.' : 'A salvageable relic of the broken road.',
      value: Math.round((18 + itemLevel * 5) * (rarity === 'relic' ? 7 : rarity === 'rare' ? 3.4 : rarity === 'magic' ? 1.7 : 1)), itemLevel,
      masterwork: 0, masterworkFocus: 0, masterworkExalts: [], bondXp: 0, bondRank: 0, memories: [],
      forgeLockedAffix: -1, resonantSocketUsed: false, empoweredRunes: 0, heirloom: false, sourceId
    };
  }

  _rollImplicit(base, itemLevel, quality = 'worn') {
    if (!base?.implicit) return null;
    const qualityMultiplier = { worn: 1, sturdy: 1.04, superior: 1.09, exquisite: 1.16 }[quality] ?? 1;
    const scale = (1 + (itemLevel - 1) * 0.045) * qualityMultiplier;
    return { ...base.implicit, value: base.implicit.value * scale };
  }

  _rollAffixes(count, enhanced = false, options = {}) {
    const itemLevel = integer(options.itemLevel, this.player?.level ?? 1, 1, MAX_LEVEL);
    const slot = options.base?.slot;
    const pool = AFFIXES.filter((affix) => !slot || !affix.slots?.length || affix.slots.includes(slot));
    const affixes = [];
    for (let index = 0; index < count && pool.length; index += 1) {
      const totalWeight = pool.reduce((sum, affix) => sum + (affix.weight ?? 1), 0);
      let cursor = this.random() * totalWeight;
      let pickedIndex = 0;
      for (let candidate = 0; candidate < pool.length; candidate += 1) {
        cursor -= pool[candidate].weight ?? 1;
        if (cursor <= 0) { pickedIndex = candidate; break; }
      }
      const affix = pool.splice(pickedIndex, 1)[0];
      const tier = clamp(1 + Math.floor((itemLevel - 1) / 7) + (enhanced && this.random() < 0.55 ? 1 : 0), 1, 5);
      const scale = (0.82 + (itemLevel - 1) * 0.052) * (0.78 + tier * 0.12) * (enhanced ? 1.1 : 1);
      affixes.push({ stat: affix.stat, label: affix.label, value: range(affix.min, affix.max, this.random) * scale, percentage: affix.percentage, tier });
    }
    if (options.guaranteeFated && affixes.length && !affixes.some((affix) => FATED_AFFIX_STATS.has(affix.stat))) {
      const fatedPool = AFFIXES.filter((affix) => affix.kind === 'fated' && (!slot || !affix.slots?.length || affix.slots.includes(slot)));
      const fated = choose(fatedPool, this.random);
      if (fated) {
        const tier = clamp(1 + Math.floor((itemLevel - 1) / 7) + (this.random() < 0.6 ? 1 : 0), 1, 5);
        const scale = (0.82 + (itemLevel - 1) * 0.052) * (0.78 + tier * 0.12) * 1.1;
        affixes[affixes.length - 1] = { stat: fated.stat, label: fated.label, value: range(fated.min, fated.max, this.random) * scale, percentage: true, tier };
      }
    }
    return affixes;
  }

  _grantLevelReward(level) {
    const player = this.player;
    const leveling = player?.leveling;
    const reward = LEVEL_REWARDS[level - 1];
    if (!leveling || !reward || leveling.claimedLevels.includes(level)) return false;
    leveling.claimedLevels.push(level);
    if (reward.pillar) leveling.pillarPoints += 1;
    if (reward.cache) {
      player.materials = this._normalizeMaterials(player.materials);
      player.gold += 30 + level * 12;
      player.materials.cinders += 3 + Math.floor(level / 5);
      player.materials.shards += level >= 15 ? 1 : 0;
      player.materials.alloys += level >= 35 && level % 5 === 1 ? 1 : 0;
      player.materials.echoes += level >= 45 && level % 10 === 5 ? 1 : 0;
      if (level >= 65) player.materials.echoes += 1;
      if (level >= 81 && level % 5 === 1) player.materials.prisms += 1;
      if (level >= 95) player.materials.cores += 1;
    }
    if (reward.ascension) {
      const item = this._generateItem({ sourceId: level >= 40 ? 'hybrid-trial' : 'contracts', minRarity: level >= 25 ? 'relic' : 'rare', elite: true, forceUnique: level >= 100 || level >= 55 && this.random() < Math.min(0.7, 0.35 + Math.max(0, level - 60) * 0.007) });
      if (item) this._awardItem(item, `Level ${level} Ascension cache`);
    }
    this.emit('leveling-updated', this.getLevelingOverview());
    return true;
  }

  _gainParagonXp(amount) {
    const player = this.player;
    const leveling = player?.leveling;
    if (!leveling || player.level < MAX_LEVEL || !Number.isFinite(Number(amount)) || Number(amount) <= 0) return false;
    if (leveling.paragonRank >= PARAGON_MAX_RANK) return false;
    leveling.paragonXp += Math.round(Number(amount));
    let ranked = false;
    while (leveling.paragonRank < PARAGON_MAX_RANK && leveling.paragonXp >= paragonXpForRank(leveling.paragonRank)) {
      leveling.paragonXp -= paragonXpForRank(leveling.paragonRank);
      leveling.paragonRank += 1;
      leveling.paragonPoints += 1;
      leveling.paragonGlyphEmbers += 1 + Math.floor(leveling.paragonRank / 60);
      player.materials = this._normalizeMaterials(player.materials);
      player.materials.cinders += 8 + Math.floor(leveling.paragonRank / 5);
      if (leveling.paragonRank % 10 === 0) {
        leveling.pillarPoints += 1;
        player.materials.echoes += 1;
      }
      if (leveling.paragonRank % 20 === 0) player.materials.cores += 1;
      if (leveling.paragonRank % 25 === 0) player.materials.prisms += 1;
      ranked = true;
      this.notify(`Paragon Rank ${leveling.paragonRank}! An Atlas point has awakened.`, 'accent');
      this.emit('sound', { id: 'level' });
      this._emitBurst(player.x, player.y, '#e7a6ff', 34, 260);
    }
    if (leveling.paragonRank >= PARAGON_MAX_RANK) leveling.paragonXp = 0;
    if (ranked) this.emit('level-up', { level: player.level, paragonRank: leveling.paragonRank });
    this.emit('leveling-updated', this.getLevelingOverview());
    return true;
  }

  _gainLegacyXp(amount) {
    return this._gainParagonXp(amount);
  }

  _gainXp(amount) {
    const player = this.player;
    if (!player || !Number.isFinite(Number(amount)) || Number(amount) <= 0) return;
    if (player.level >= MAX_LEVEL) {
      this._gainParagonXp(amount);
      return;
    }
    player.xp += Math.round(Number(amount));
    while (player.level < MAX_LEVEL && player.xp >= LEVEL_XP[player.level - 1]) {
      player.xp -= LEVEL_XP[player.level - 1];
      player.level += 1;
      const levelReward = LEVEL_REWARDS[player.level - 1];
      if (levelReward?.skill) player.skillPoints += 1;
      this._grantLevelReward(player.level);
      this._reconcileMasteryRanks(true);
      this._refreshPlayerStats(true);
      player.hp = player.maxHp;
      player.resource = player.maxResource;
      player.potions = player.maxPotions;
      this.emit('level-up', { level: player.level });
      const rewardNotice = levelReward?.paragon ? 'The Paragon Atlas and Journey rewards are ready.' : levelReward?.skill ? 'Skill and Journey rewards are ready.' : 'Journey rewards are ready.';
      this.notify(`Level ${player.level}: ${levelReward?.name ?? 'the covenant grows'}. ${rewardNotice}`, 'accent');
      this.emit('sound', { id: 'level' });
      this._emitBurst(player.x, player.y, '#f3d27f', 30, 240);
    }
    if (player.level >= MAX_LEVEL && player.xp > 0) {
      const overflow = player.xp;
      player.xp = 0;
      this._gainParagonXp(overflow);
    }
  }

  _updateLoot(dt) {
    const filterScore = this.settings.lootFilter === 'unique' ? RARITY_SCORE.unique : this.settings.lootFilter === 'relic' ? RARITY_SCORE.relic : this.settings.lootFilter === 'rare' ? RARITY_SCORE.rare : this.settings.lootFilter === 'magic' ? RARITY_SCORE.magic : RARITY_SCORE.common;
    const pickupRadius = this.hasPower('black-lantern') ? 230 : 56;
    this.entities.loot.forEach((drop) => {
      drop.life -= dt;
      drop.bob += dt * 3;
      if (distance(drop, this.player) < pickupRadius && (RARITY_SCORE[drop.item.rarity] ?? 1) >= filterScore) this._pickup(drop);
    });
    this.entities.loot = this.entities.loot.filter((drop) => drop.life > 0 && !drop.picked);
  }

  _pickup(drop) {
    if (drop.picked) return;
    const location = this._storeItem(drop.item);
    if (!location) {
      if (!drop.fullNotice) {
        drop.fullNotice = true;
        this.notify('Pack and stash are full. Make room before claiming this relic.', 'warning');
      }
      return false;
    }
    drop.picked = true;
    this._registerLootDiscovery(drop.item, drop.sourceId ?? drop.item.sourceId);
    this.notify(`${drop.item.name} stored in ${location === 'inventory' ? 'your pack' : 'the sanctuary stash'}.`, RARITY_SCORE[drop.item.rarity] >= RARITY_SCORE.unique ? 'accent' : 'quiet');
    this.emit('loot', drop.item);
    this._recordTutorial('loot');
    this.save();
    return true;
  }

  _storeItem(item, preferred = 'inventory') {
    const player = this.player;
    const destinations = preferred === 'stash' ? ['stash', 'inventory'] : ['inventory', 'stash'];
    for (const destination of destinations) {
      const capacity = destination === 'inventory' ? INVENTORY_CAPACITY : STASH_CAPACITY;
      if (player[destination].length < capacity) {
        player[destination].unshift(item);
        return destination;
      }
    }
    return null;
  }

  _awardItem(item, source = 'Reward') {
    const location = this._storeItem(item);
    if (location) {
      this._registerLootDiscovery(item, item?.sourceId);
      return location;
    }
    this.entities.loot.push({ id: uid('overflow-loot'), x: this.player.x + range(-24, 24, this.random), y: this.player.y + range(-24, 24, this.random), item, sourceId: item?.sourceId, life: 120, bob: this.random() * Math.PI * 2, fullNotice: true });
    this.notify(`${source} dropped at your feet because both pack and stash are full.`, 'warning');
    return null;
  }

  _registerLootDiscovery(item, sourceId) {
    const player = this.player;
    if (!player || !item) return;
    const collection = player.lootCollection ?? (player.lootCollection = this._normalizeLootCollection(null));
    const add = (bucket, id) => {
      if (!id) return;
      bucket[id] = Math.min(9_999, (bucket[id] ?? 0) + 1);
    };
    add(collection.bases, item.baseId);
    add(collection.sets, item.setId);
    add(collection.uniques, item.uniqueId);
    add(collection.sources, lootSourceById(sourceId)?.id ?? item.sourceId);
    if (item.uniqueId || item.rarity === 'unique' || item.rarity === 'mythic') this._recordLevelingProgress('unique', 1, { uniqueId: item.uniqueId, rarity: item.rarity, sourceId });
  }

  _updateEffects(dt) {
    this.entities.effects.forEach((effect) => { effect.life -= dt; });
    this.entities.particles.forEach((particle) => {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.93;
      particle.vy *= 0.93;
    });
    (this.entities.corpses ??= []).forEach((corpse) => { corpse.life -= dt; });
    (this.entities.destructibles ??= []).forEach((destructible) => {
      destructible.hitTime = Math.max(0, (destructible.hitTime ?? 0) - dt);
      if (destructible.broken) destructible.life -= dt;
    });
    this.entities.effects = this.entities.effects.filter((effect) => effect.life > 0);
    this.entities.particles = this.entities.particles.filter((particle) => particle.life > 0);
    this.entities.corpses = this.entities.corpses.filter((corpse) => corpse.life > 0);
    this.entities.destructibles = this.entities.destructibles.filter((destructible) => !destructible.broken || destructible.life > 0);
    this.camera.shake = Math.max(0, this.camera.shake - dt * 26);
    this.camera.flash = Math.max(0, this.camera.flash - dt * 1.9);
  }

  _emitBurst(x, y, color, count, speed) {
    const reduced = this.settings.reducedVfx ? Math.ceil(count * 0.35) : count;
    const available = Math.max(0, MAX_PARTICLES - this.entities.particles.length);
    for (let index = 0; index < Math.min(reduced, available); index += 1) {
      const angle = this.random() * Math.PI * 2;
      const magnitude = range(speed * 0.2, speed, this.random);
      this.entities.particles.push({ x, y, vx: Math.cos(angle) * magnitude, vy: Math.sin(angle) * magnitude, life: range(0.22, 0.62, this.random), maxLife: 0.62, color, size: range(2, 5, this.random) });
    }
  }

  _damageDestructible(destructible, amount = 1, source = 'damage') {
    if (!destructible || destructible.broken) return false;
    const profile = DESTRUCTIBLE_PROFILES[destructible.profileId] ?? DESTRUCTIBLE_PROFILES.urn;
    destructible.health -= Math.max(1, Math.floor(amount));
    destructible.hitTime = 0.18;
    if (destructible.health > 0) {
      this.emit('sound', { id: 'destruction-hit', priority: 2 });
      return true;
    }
    destructible.broken = true;
    destructible.life = profile.cleanup;
    destructible.maxLife = profile.cleanup;
    this._emitBurst(destructible.x, destructible.y, destructible.kind === 'ritual-vessel' ? '#b879d7' : '#a98b69', profile.debris, 130);
    this._pushEffect({ kind: 'destruction', x: destructible.x, y: destructible.y, life: 0.5, maxLife: 0.5, radius: destructible.radius, color: destructible.kind === 'ritual-vessel' ? '#b879d7' : '#c7a779' });
    this.presentation?.requestImpact(profile.impactProfile, { x: destructible.x, y: destructible.y, priority: 3, shakeScale: destructible.kind === 'barricade' ? 1 : 0.65 });
    this.emit('sound', { id: 'destruction', priority: 4 });
    if (destructible.expeditionStageId && this.endgame?.blackRoad) {
      const remaining = (this.entities.destructibles ?? []).filter((entry) => !entry.broken && entry.expeditionStageId === destructible.expeditionStageId).length;
      this.notify(remaining ? `Ritual vessel shattered · ${remaining} remain.` : 'The ritual ward collapses.', remaining ? 'quiet' : 'accent');
      this.emit('requiem-updated', this.getRequiemOverview());
    }
    if (this.random() < profile.lootChance) {
      if (destructible.kind === 'ritual-vessel') this.player.materials.shards = (this.player.materials.shards ?? 0) + 1;
      else this.player.gold += Math.max(1, Math.round(3 + this.player.level * 0.35));
    }
    this.presentation?.emit('combat:attack-impact', { entityId: destructible.id, destructibleId: destructible.kind, impactProfile: profile.impactProfile, source }, { source: 'destruction', priority: 3 });
    return true;
  }

  _float(x, y, text, color, kind = 'damage') {
    if (this.entities.effects.length >= MAX_EFFECTS) return;
    this._pushEffect({ kind: 'float', x, y, text: String(text), color, life: kind === 'crit' ? 0.95 : 0.72, maxLife: kind === 'crit' ? 0.95 : 0.72, type: kind });
  }

  getPersistentWorldModifiers(zoneId = zoneAt(this.player?.x ?? 0, this.player?.y ?? 0).id) {
    if (!this.player) return this.worldStateManager.modifiersForRegion(this.worldStateManager.normalize(null), zoneId);
    this.player.worldV2 = this.worldStateManager.normalize(this.player.worldV2);
    return this.worldStateManager.modifiersForRegion(this.player.worldV2, zoneId);
  }

  getBlackRoadWorldModifiers(zoneId = this.endgame?.zoneId ?? zoneAt(this.player?.x ?? 0, this.player?.y ?? 0).id) {
    if (!this.player) return this.worldStateManager.blackRoadModifiers(this.worldStateManager.normalize(null), zoneId);
    this.player.worldV2 = this.worldStateManager.normalize(this.player.worldV2);
    return this.worldStateManager.blackRoadModifiers(this.player.worldV2, zoneId);
  }

  startPersistentWorldEvent(typeId, zoneId = null, context = {}) {
    if (!this.player) return false;
    this.player.worldV2 = this.worldStateManager.normalize(this.player.worldV2);
    const event = this.worldStateManager.startEvent(this.player.worldV2, typeId, { ...context, zoneId: zoneId ?? context.zoneId });
    if (!event) return false;
    this._spawnPersistentWorldPresence(event, true);
    this.domainEvents.emit('world:event-started', { eventId: event.id, typeId: event.typeId, zoneId: event.zoneId });
    this.notify(`${event.name} changes ${ZONES.find((zone) => zone.id === event.zoneId)?.name ?? event.zoneId}.`, 'warning');
    this.save();
    return true;
  }

  _persistentWorldEventById(eventId) {
    return this.player?.worldV2?.activeEvents?.find((event) => event.id === eventId) ?? null;
  }

  _persistentEventAnchor(event) {
    const zone = ZONES.find((entry) => entry.id === event.zoneId) ?? ZONES.find((entry) => !entry.safe);
    const area = zone?.encounter ?? zone;
    return {
      x: (area?.x ?? zone?.x ?? this.player.x) + (area?.width ?? 0) * 0.5,
      y: (area?.y ?? zone?.y ?? this.player.y) + (area?.height ?? 0) * 0.5
    };
  }

  _spawnPersistentWorldPresence(event, force = false) {
    if (!event || !this.player) return [];
    const existing = this.entities.enemies.filter((enemy) => !enemy.dead && enemy.persistentEventId === event.id);
    if (existing.length && !force) return existing;
    const anchor = this._persistentEventAnchor(event);
    const group = `persistent-${event.id}`;
    const level = Math.max(this.player.level, ZONES.find((zone) => zone.id === event.zoneId)?.level ?? 1);
    const spawned = [];
    if (event.typeId === 'blood-moon-hunt') {
      const hunter = this.hunterSystem.chooseIntrusion(this.player.hunters, { now: this.clock, zoneId: event.zoneId });
      if (hunter) {
        const enemy = this.intrudeHunter(hunter.id, { zoneId: event.zoneId, x: anchor.x, y: anchor.y, group });
        if (enemy) spawned.push(enemy);
      }
      if (!spawned.length) {
        const enemy = this._spawnEnemy('reedstalker', anchor.x, anchor.y, { level: level + 2, group, elite: true, engaged: true, doctrineFaction: 'blood' });
        if (enemy) spawned.push(enemy);
      }
    } else {
      const ids = event.typeId === 'black-procession'
        ? ['bellknight', 'gildedcantor', 'hollowchorister', 'bellknight', 'gildedcantor', 'bellknight', 'hollowchorister', 'bellknight']
        : ['candlepriest', 'bonevulture', 'chainwidow', 'cairnguard', 'bonevulture', 'candlepriest'];
      ids.slice(0, event.target).forEach((enemyId, index) => {
        const angle = index / Math.max(1, Math.min(event.target, ids.length)) * Math.PI * 2;
        const enemy = this._spawnEnemy(enemyId, anchor.x + Math.cos(angle) * (90 + (index % 2) * 42), anchor.y + Math.sin(angle) * (70 + (index % 3) * 26), {
          level, group, elite: index === 0 || (event.typeId === 'black-procession' && index === 3), engaged: true,
          doctrineFaction: event.typeId === 'black-procession' ? 'iron' : 'grave'
        });
        if (enemy) spawned.push(enemy);
      });
    }
    spawned.forEach((enemy) => { enemy.persistentEventId = event.id; enemy.eventId ??= null; });
    event.physicalSpawned = spawned.length > 0;
    event.progress = Math.max(event.progress ?? 0, 0);
    return spawned;
  }

  _resolvePersistentWorldEvent(eventId, outcome = 'cleared') {
    if (!this.player) return false;
    const event = this._persistentWorldEventById(eventId);
    if (!event) return false;
    const record = this.worldStateManager.resolveEvent(this.player.worldV2, eventId, { outcome });
    if (!record) return false;
    this.entities.enemies = this.entities.enemies.filter((enemy) => enemy.persistentEventId !== eventId || enemy.dead);
    this.stats.events += 1;
    this.player.gold += 70 + this.player.level * 6;
    this.player.materials.shards = (this.player.materials.shards ?? 0) + 2;
    this._progressContracts('event', { zoneId: record.zoneId, amount: 1 });
    this._recordLevelingProgress('event', 1, { zoneId: record.zoneId, eventId: record.typeId });
    this._applyUniqueBehaviorEvent('world-event-resolved', { eventId: record.typeId, zoneId: record.zoneId, outcome });
    this.domainEvents.emit('world:event-resolved', { eventId, typeId: record.typeId, zoneId: record.zoneId, outcome });
    this.notify(`${record.name} resolved. ${ZONES.find((zone) => zone.id === record.zoneId)?.name ?? record.zoneId} remembers the outcome.`, 'accent');
    this.save();
    return true;
  }

  _updatePersistentWorldState(dt) {
    if (!this.player?.worldV2) return;
    const beforeProcessionZone = this.player.worldV2.procession?.zoneId ?? null;
    this.worldStateManager.update(this.player.worldV2, dt);
    const afterProcessionZone = this.player.worldV2.procession?.zoneId ?? null;
    if (beforeProcessionZone && afterProcessionZone && beforeProcessionZone !== afterProcessionZone) {
      const event = this.player.worldV2.activeEvents.find((entry) => entry.id === this.player.worldV2.procession?.eventId);
      if (event) {
        this.entities.enemies = this.entities.enemies.filter((enemy) => enemy.persistentEventId !== event.id);
        this._spawnPersistentWorldPresence(event, true);
        this.domainEvents.emit('world:procession-moved', { eventId: event.id, from: beforeProcessionZone, to: afterProcessionZone });
      }
    }
    for (const event of [...this.player.worldV2.activeEvents]) {
      if (event.elapsed >= event.duration) {
        this.worldStateManager.failEvent(this.player.worldV2, event.id, { outcome: 'unopposed' });
        this.entities.enemies = this.entities.enemies.filter((enemy) => enemy.persistentEventId !== event.id);
        this.domainEvents.emit('world:event-failed', { eventId: event.id, typeId: event.typeId, zoneId: event.zoneId });
        continue;
      }
      if (!this.endgame && !this.entities.enemies.some((enemy) => !enemy.dead && enemy.persistentEventId === event.id)) this._spawnPersistentWorldPresence(event);
      if (event.typeId === 'gravewake-rising' && event.elapsed > 0 && Math.floor(event.elapsed) % 8 === 0) {
        const corpse = this.entities.corpses.find((entry) => !entry.worldResurrected && zoneAt(entry.x, entry.y).id === event.zoneId);
        if (corpse) {
          corpse.worldResurrected = true;
          const raised = this._spawnEnemy(corpse.templateId, corpse.x, corpse.y, { level: Math.max(this.player.level, ZONES.find((zone) => zone.id === event.zoneId)?.level ?? 1), group: `persistent-${event.id}`, engaged: true, doctrineFaction: 'grave' });
          if (raised) raised.persistentEventId = event.id;
        }
      }
    }
  }

  _updateWorldEvent(dt) {
    if (!this._campaignComplete()) return;
    if (this.worldEvent) {
      this.worldEvent.left -= dt;
      if (this.worldEvent.left <= 0) {
        const progress = this.getZoneProgress(this.worldEvent.zoneId);
        if (progress) progress.corruption = clamp(progress.corruption + 9, 0, 100);
        this._recordReforgedProgress('event-failed', { zoneId: this.worldEvent.zoneId, strongholdId: this.worldEvent.strongholdId });
        this.notify(`${this.worldEvent.name} faded before the covenant could finish it.`, 'warning');
        this.entities.enemies = this.entities.enemies.filter((enemy) => enemy.eventId !== this.worldEvent.id);
        this.worldEvent = null;
        this._setCampaignObjective();
      }
      return;
    }
    if (!this.endgame && this.clock > 20 && this.clock % 42 < dt && !zoneAt(this.player.x, this.player.y).safe) this._startWorldEvent();
  }

  _startWorldEvent(forcedType = null, context = {}) {
    let definition = forcedType ? WORLD_EVENTS.find((event) => event.id === forcedType) : choose(WORLD_EVENTS, this.random);
    // A random Nemesis Return without an actual nemesis used to create a
    // three-enemy pack whose one-kill objective immediately completed. Fall
    // back to a normal event instead, so every listed objective has a real
    // target and no leftover event enemies are orphaned in the world.
    if (definition?.id === 'nemesis' && !this.player.nemeses.length) {
      definition = choose(WORLD_EVENTS.filter((event) => event.id !== 'nemesis'), this.random);
    }
    const zone = ZONES.find((entry) => entry.id === context.zoneId) ?? zoneAt(this.player.x, this.player.y);
    if (!definition || zone.safe) return false;
    const progress = this.getZoneProgress(zone.id);
    const event = {
      ...definition, id: uid('event'), typeId: definition.id, left: definition.duration, progress: 0, zoneId: zone.id, strongholdId: context.strongholdId ?? null,
      target: definition.id === 'nemesis' ? 1 : Math.max(1, definition.target ?? 9),
      factionId: definition.factionId ?? districtAt(this.player.x, this.player.y).factionId,
      x: clamp(this.player.x + range(-360, 360, this.random), zone.x + 70, zone.x + zone.width - 70),
      y: clamp(this.player.y + range(-300, 300, this.random), zone.y + 70, zone.y + zone.height - 70)
    };
    if (progress?.calmUntil > this.clock && !context.strongholdId) return false;
    this.worldEvent = event;
    this._setObjective(event.name, event.objective, 0, event.target);
    this.notify(`${event.name} begins nearby.`, 'warning');
    const group = uid('event-pack');
    if (definition.id === 'nemesis' && this.player.nemeses.length) {
      const nemesis = choose(this.player.nemeses, this.random);
      const enemy = this._spawnEnemy(nemesis.templateId, event.x, event.y, { level: Math.max(zone.level + 2, nemesis.level + nemesis.victories), group, eventId: event.id, elite: true, nemesisId: nemesis.id });
      if (enemy) {
        enemy.name = nemesis.name;
        enemy.damage *= 1 + nemesis.victories * 0.08 + (nemesis.grudge ?? 1) * 0.025;
        enemy.maxHp = Math.round(enemy.maxHp * (1 + nemesis.victories * 0.12 + (nemesis.grudge ?? 1) * 0.035));
        enemy.hp = enemy.maxHp;
        if (nemesis.traits?.includes('ironhide')) enemy.armor += 16;
        if (nemesis.traits?.includes('vengeful')) enemy.damage *= 1.18;
        if (nemesis.traits?.includes('nullstep')) enemy.speed *= 1.14;
        if (nemesis.traits?.includes('bellbound')) enemy.shield = Math.max(enemy.shield, enemy.maxHp * 0.28);
        const traitAffixes = [nemesis.traits?.includes('mirrorborn') ? 'mirrored' : null, nemesis.traits?.includes('bloodfed') ? 'hungry' : null].filter(Boolean);
        traitAffixes.forEach((affixId) => {
          const definition = ELITE_AFFIXES.find((entry) => entry.id === affixId);
          if (definition && !enemy.affixes.some((entry) => entry.id === definition.id)) enemy.affixes.push(definition);
        });
        enemy.affix = enemy.affixes[0] ?? null;
        enemy.targetDrop = true;
      }
      return true;
    }
    const waves = Math.ceil(event.target / 3);
    let spawned = 0;
    for (let wave = 0; wave < waves; wave += 1) {
      const regional = definition.enemyIds?.length
        ? Array.from({ length: Math.max(3, definition.enemyIds.length) }, (_, index) => definition.enemyIds[index % definition.enemyIds.length])
        : choose(encountersForZone(zone.id), this.random);
      const template = regional;
      const remaining = event.target - spawned;
      template.slice(0, Math.min(3, remaining)).forEach((id, index) => {
        spawned += 1;
        const elite = spawned === event.target || definition.id === 'relic-hunt' && spawned % 2 === 0;
        this._spawnEnemy(id, event.x + Math.cos(index * 2.1 + wave) * (90 + wave * 35), event.y + Math.sin(index * 2.1 + wave) * (90 + wave * 35), { level: Math.max(zone.level + 1, this.player.level), group, eventId: event.id, elite });
      });
    }
    return true;
  }

  _completeWorldEvent() {
    const event = this.worldEvent;
    if (!event) return;
    const wasReclaimed = Boolean(event.strongholdId && this._reforged()?.world?.strongholds?.[event.strongholdId]?.reclaimed);
    this.stats.events += 1;
    const progress = this.getZoneProgress(event.zoneId);
    if (progress) {
      progress.events += 1;
      progress.corruption = Math.max(0, progress.corruption - (event.strongholdId ? 42 : 18));
      progress.calmUntil = this.clock + (event.strongholdId ? 300 : 150);
      if (event.strongholdId) {
        progress.liberated = true;
        this.player.worldProgress.strongholds[event.strongholdId] = true;
      }
    }
    const oathReward = this._worldOath().reward;
    this.player.gold += Math.round((60 + this.player.level * 7) * oathReward);
    this.player.materials = this._normalizeMaterials(this.player.materials);
    this.player.materials.shards += Math.max(2, Math.round((event.strongholdId ? 4 : 2) * Math.sqrt(oathReward)));
    if (event.strongholdId) this.player.materials.marks += 1;
    this._gainRenown(event.factionId, (event.renown ?? 12) + (event.strongholdId ? 18 : 0), false);
    this._progressContracts('event', { zoneId: event.zoneId, amount: 1 });
    if (event.strongholdId) this._progressContracts('stronghold', { zoneId: event.zoneId, amount: 1 });
    this._gainXp(120 + this.player.level * 18 + (event.strongholdId ? 240 : 0));
    this._recordLevelingProgress('event', 1, { zoneId: event.zoneId, eventId: event.definitionId });
    if (event.strongholdId) this._recordLevelingProgress('stronghold', 1, { zoneId: event.zoneId, strongholdId: event.strongholdId });
    this._recordReforgedProgress(event.strongholdId ? 'stronghold' : 'event', { zoneId: event.zoneId, factionId: event.factionId, strongholdId: event.strongholdId, stronghold: Boolean(event.strongholdId), defense: wasReclaimed });
    if (event.strongholdId) this._recordReforgedProgress('event', { zoneId: event.zoneId, factionId: event.factionId, strongholdId: event.strongholdId, stronghold: true });
    const item = this._generateItem({ forceUnique: this.random() < (event.strongholdId ? 0.3 : 0.12), sourceId: event.strongholdId ? 'stronghold' : event.zoneId, elite: Boolean(event.strongholdId) });
    const location = this._awardItem(item, event.reward);
    this.notify(`${event.name} complete${event.strongholdId ? ' — the stronghold is reclaimed' : ''}. ${event.reward} ${location ? `secured in ${location === 'inventory' ? 'your pack' : 'the stash'}` : 'awaits at your feet'}.`, 'accent');
    this._pushEffect({ kind: 'event-complete', x: event.x, y: event.y, life: 1.2, maxLife: 1.2, color: '#f4d57c' });
    this.emit(event.strongholdId ? 'stronghold-liberated' : 'world-event-complete', { event: { ...event }, item, location });
    this.worldEvent = null;
    this._setCampaignObjective();
    this.save();
  }

  _buildEndgameWavePlan(activity, tier, options = {}) {
    const delve = delveById(options.delveId);
    const crowded = (options.modifiers?.some((modifier) => modifier.id === 'crowded') || this.hasEndgameModifier('crowded')) ? 1 : 0;
    const density = 1 + Math.floor(tier / 18) + crowded;
    if (options.contractId) {
      const zoneId = options.contractZoneId;
      const apex = options.contractDifficultyId === 'apex';
      const contractDensity = density + (options.contractClauses?.includes('swarming') ? 1 : 0);
      const count = apex ? 7 : 5;
      const packs = Array.from({ length: count }, (_, index) => ({
        type: 'pack',
        zoneId,
        template: choose(encountersForZone(zoneId), this.random).slice(),
        elite: index % 2 === 1 || index === count - 1,
        density: contractDensity
      }));
      packs.push({ type: 'boss', enemyId: CONTRACT_BOSSES[zoneId] ?? 'cryptwarden', elite: true, zoneId });
      return packs;
    }
    if (delve) {
      const packs = Array.from({ length: Math.max(2, delve.waves - 1) }, (_, index) => ({
        type: 'pack',
        zoneId: delve.zoneId,
        template: choose(encountersForZone(delve.zoneId), this.random).slice(),
        elite: index === delve.waves - 2 || index % 2 === 1,
        density
      }));
      packs.push({ type: 'boss', enemyId: delve.bossId, elite: true, zoneId: delve.zoneId });
      return packs;
    }
    if (activity === 'hunt') {
      const bosses = tier >= 25
        ? ['tollingabbot', 'bloodmatron', 'chainregent', 'veiledoracle', 'silenceincarnate']
        : ['bellwitness', 'cryptwarden', 'bloodmatron', 'chainregent', 'mirrorapostle'];
      return [{ type: 'boss', enemyId: choose(bosses, this.random), elite: true }];
    }
    if (activity === 'gauntlet') {
      const bosses = tier >= 25
        ? ['bloodmatron', 'chainregent', 'veiledoracle', 'silenceincarnate']
        : ['bellwitness', 'cryptwarden', 'bloodmatron'];
      return bosses.map((enemyId) => ({ type: 'boss', enemyId, elite: true, zoneId: 'bellscar' }));
    }
    const activityDefinition = activityById(activity);
    const zoneId = activityDefinition.id === 'siege' ? 'cairnreach'
      : activityDefinition.id === 'ritual' ? 'redfen'
        : activityDefinition.id === 'echoes' ? 'veiled-road'
          : activityDefinition.id === 'arena' ? 'cairnreach'
            : null;
    const count = activityDefinition.id === 'arena' ? 6
      : activityDefinition.id === 'trial' ? 4
        : Math.max(5, activityDefinition.waves - (['siege', 'ritual', 'echoes'].includes(activityDefinition.id) ? 1 : 0)) + Math.min(3, Math.floor(tier / 16));
    const plan = Array.from({ length: count }, (_, index) => ({
      type: 'pack',
      zoneId,
      template: choose(zoneId ? encountersForZone(zoneId) : ENCOUNTER_TEMPLATES, this.random).slice(),
      elite: index === count - 1 || (tier >= 12 && index % 2 === 1),
      density
    }));
    if (activityDefinition.id === 'arena') plan.push({ type: 'elite', enemyId: 'thorncolossus', elite: true, zoneId: 'cairnreach' });
    if (activityDefinition.id === 'trial') plan.push({ type: 'elite', enemyId: 'riftstalker', elite: true });
    if (activityDefinition.id === 'siege') plan.push({ type: 'boss', enemyId: 'chainregent', elite: true, zoneId: 'cairnreach' });
    if (activityDefinition.id === 'ritual') plan.push({ type: 'boss', enemyId: 'bloodmatron', elite: true, zoneId: 'redfen' });
    if (activityDefinition.id === 'echoes') plan.push({ type: 'boss', enemyId: 'mirrorapostle', elite: true, zoneId: 'veiled-road' });
    return plan;
  }

  _maybeIntrudeBlackRoadHunter(force = false) {
    const endgame = this.endgame;
    if (!endgame?.blackRoad || endgame.completed || endgame.hunterIntruded || !endgame.activeStage) return null;
    const chance = Math.max(0, Math.min(0.95, Number(endgame.routeContext?.hunterChance) || 0));
    if (!force && (chance <= 0 || this.random() >= chance)) return null;
    let hunter = this.hunterSystem.chooseIntrusion(this.player.hunters, { now: this.clock, zoneId: endgame.zoneId });
    if (!hunter && force) {
      const stored = this.player.hunters.find((entry) => !entry.defeated);
      if (stored) { stored.nextEligibleAt = Math.min(stored.nextEligibleAt ?? 0, this.clock); hunter = this.hunterSystem.normalize(stored); }
    }
    if (!hunter) return null;
    const stage = endgame.activeStage;
    const enemy = this.intrudeHunter(hunter.id, { zoneId: endgame.zoneId, x: stage.x + stage.radius * 0.28, y: stage.y - stage.radius * 0.16, group: endgame.id });
    if (!enemy) return null;
    enemy.blackRoadHunter = true;
    enemy.expeditionStageId = stage.id;
    endgame.hunterIntruded = true;
    endgame.hunterId = hunter.id;
    endgame.activeStageTotal = Math.max(1, (endgame.activeStageTotal ?? 0) + 1);
    this.encounter.total = Math.max(this.encounter.total ?? 0, endgame.activeStageTotal);
    this.domainEvents.emit('hunter:black-road-intrusion', { hunterId: hunter.id, expeditionId: endgame.expeditionId, stageId: stage.id });
    return enemy;
  }

  _spawnEndgameWave() {
    const endgame = this.endgame;
    const wave = endgame?.wavePlan?.[endgame.waveIndex];
    if (!wave) return false;
    const waveNumber = endgame.waveIndex + 1;
    const baseLevel = Math.max(this.player.level, 5) + Math.floor(endgame.tier * 0.6) + Math.floor(endgame.waveIndex * 0.75);
    const blackRoad = endgame.blackRoad === true;
    const origin = blackRoad ? { x: wave.x, y: wave.y } : this.player;
    const spawn = (enemyId, offsetX, offsetY, options = {}) => {
      const enemy = this._spawnEnemy(enemyId, origin.x + offsetX, origin.y + offsetY, { level: baseLevel, difficulty: endgame.tier, group: endgame.id, ...options });
      if (enemy) enemy.endgameId = endgame.id;
      return enemy;
    };

    if (blackRoad) {
      this.entities.projectiles = [];
      this.entities.hazards = [];
      this.entities.effects = [];
      this.entities.particles = [];
      this.entities.corpses = [];
      this.entities.destructibles = (this.entities.destructibles ?? []).filter((entry) => !entry.expeditionStageId);
      this.groupMemory.clear();
      endgame.activeStage = { ...wave };
      endgame.stageClearedAt = 0;
      endgame.primaryTargetId = null;
      const entryX = wave.x - Math.min(145, wave.radius * 0.5);
      const entryY = wave.y + Math.min(38, wave.radius * 0.14);
      if (waveNumber > 1 || distance(this.player, wave) > wave.radius * 0.8) {
        this._moveBodyWithGeometry(this.player, entryX, entryY);
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * 0.12);
        this.player.resource = Math.min(this.player.maxResource, this.player.resource + this.player.maxResource * 0.22);
        this.player.moveCommand = null;
        this.player.combatTargetId = null;
        this.camera.flash = Math.max(this.camera.flash, 0.2);
        this._pushEffect({ kind: 'campaign-awaken', x: this.player.x, y: this.player.y, life: 0.75, maxLife: 0.75, color: BLACK_ROAD_BY_ID[endgame.expeditionId]?.color ?? '#d1b36d' });
        this._focusCamera(true);
      }

      const formation = [...(wave.formation ?? [])];
      const worldDensity = Math.max(1, Number(endgame.worldModifiers?.enemyDensity) || 1);
      const extraCount = Math.max(0, Math.min(4, Math.round((worldDensity - 1) * formation.length)));
      for (let index = 0; index < extraCount && formation.length; index += 1) formation.push(formation[index % formation.length]);
      const spawnFormation = formation.map((enemyId, index) => {
        const angle = -Math.PI * 0.42 + index * (Math.PI * 1.52 / Math.max(1, formation.length - 1));
        const radius = wave.type === 'boss' ? 150 + (index % 2) * 26 : 76 + (index % 2) * 58;
        const enemy = spawn(enemyId, Math.cos(angle) * radius, Math.sin(angle) * radius * 0.72, {
          elite: wave.type === 'lieutenant' ? index === (wave.eliteIndex ?? 0) : wave.type === 'ritual' && index === (wave.eliteIndex ?? -1),
          engaged: true,
          packName: wave.name,
          encounterTier: waveNumber
        });
        if (enemy) enemy.expeditionStageId = wave.id;
        return enemy;
      }).filter(Boolean);

      let boss = null;
      if (wave.type === 'boss' && wave.bossId) {
        boss = spawn(wave.bossId, 82, -18, { elite: true, engaged: true, targetDrop: true, campaignBoss: true, packName: wave.name, encounterTier: waveNumber });
        if (boss) {
          boss.expeditionStageId = wave.id;
          boss.expeditionBoss = true;
          boss.maxHp = Math.round(boss.maxHp * (1.32 + endgame.tier * 0.055));
          boss.hp = boss.maxHp;
          boss.damage = Math.round(boss.damage * (1.04 + endgame.tier * 0.025));
          boss.staggerMax *= 1.2;
          endgame.primaryTargetId = boss.id;
        }
      } else if (wave.type === 'lieutenant') {
        const lieutenant = spawnFormation.find((enemy) => enemy.elite) ?? spawnFormation[0];
        if (lieutenant) {
          lieutenant.maxHp = Math.round(lieutenant.maxHp * 1.45);
          lieutenant.hp = lieutenant.maxHp;
          lieutenant.targetDrop = true;
          lieutenant.name = `${lieutenant.name}, Road Captain`;
          endgame.primaryTargetId = lieutenant.id;
        }
      }

      const vesselCount = Math.max(0, Math.min(4, integer(wave.vessels, 0, 0, 4)));
      const vesselProfile = DESTRUCTIBLE_PROFILES['ritual-vessel'];
      const vesselIds = [];
      for (let index = 0; index < vesselCount; index += 1) {
        const angle = -Math.PI / 2 + index * Math.PI * 2 / vesselCount;
        const ritual = {
          id: uid('expedition-vessel'), kind: 'ritual-vessel', zoneId: endgame.zoneId, profileId: 'ritual-vessel',
          x: wave.x + Math.cos(angle) * wave.radius * 0.62,
          y: wave.y + Math.sin(angle) * wave.radius * 0.48,
          radius: vesselProfile.radius, health: vesselProfile.health, maxHealth: vesselProfile.health,
          broken: false, life: vesselProfile.cleanup, maxLife: vesselProfile.cleanup, hitTime: 0,
          variant: index, expeditionStageId: wave.id
        };
        this.entities.destructibles.push(ritual);
        vesselIds.push(ritual.id);
      }
      if (vesselIds.length) spawnFormation.forEach((enemy) => { enemy.objectiveWardIds = [...vesselIds]; });

      endgame.activeStageTotal = formation.length + vesselCount + (boss ? 1 : 0);
      endgame.waveIndex += 1;
      this.encounter = {
        activeRoomId: null, activeGroupId: endgame.id, state: 'engaged', remaining: endgame.activeStageTotal,
        total: endgame.activeStageTotal, roomStreak: this.encounter.roomStreak, announcedRoomId: wave.id, clearedAt: 0
      };
      this._setObjective(wave.name, `${wave.objective} · Room ${waveNumber}/${endgame.wavePlan.length}`, 0, Math.max(1, endgame.activeStageTotal));
      this.notify(`${wave.name} sealed · ${wave.objective}.`, wave.type === 'boss' ? 'warning' : 'quiet');
      this.presentation?.emit('music:stinger', { id: wave.type === 'boss' ? 'boss-phase' : 'encounter-start' }, { source: 'black-road', priority: wave.type === 'boss' ? 92 : 58 });
      if (wave.type === 'lieutenant') this._maybeIntrudeBlackRoadHunter(false);
      this.emit('requiem-updated', this.getRequiemOverview());
      return true;
    }

    if (this._hasReforgedSpecial('expedition-start-ward')) {
      this.player.barrier += this.player.maxHp * 0.18 * this.getStats().ward;
      this.player.barrierTime = Math.max(this.player.barrierTime, 5);
      this._pushEffect({ kind: 'expedition-ward', x: this.player.x, y: this.player.y, life: 0.9, maxLife: 0.9, color: '#8dd9cf' });
    }
    if (wave.type === 'boss') {
      const boss = spawn(wave.enemyId, 360, 0, { elite: true, targetDrop: true });
      if (boss) {
        boss.maxHp = Math.round(boss.maxHp * (1 + endgame.tier * 0.2));
        boss.hp = boss.maxHp;
        boss.damage = Math.round(boss.damage * (1 + endgame.tier * 0.08));
      }
    } else if (wave.type === 'elite') {
      spawn(wave.enemyId, 370, 0, { elite: true });
      const escort = choose(wave.zoneId ? encountersForZone(wave.zoneId) : ENCOUNTER_TEMPLATES, this.random).slice(0, 3);
      escort.forEach((enemyId, index) => spawn(enemyId, Math.cos(index * 2.1) * 190, Math.sin(index * 2.1) * 190, { elite: index === 0 && endgame.tier >= 18 }));
    } else {
      const baneDensity = (endgame.expeditionBanes ?? []).reduce((sum, id) => sum + (EXPEDITION_BANES.find((bane) => bane.id === id)?.density ?? 0), 0);
      const oathDensity = Math.floor(this._worldOath().density / 2);
      const roomDensity = Math.max(1, wave.density + baneDensity + oathDensity);
      const entries = wave.template.flatMap((enemyId) => Array.from({ length: roomDensity }, (_, duplicate) => ({ enemyId, duplicate })));
      entries.forEach(({ enemyId, duplicate }, index) => {
        const angle = index * 1.31 + endgame.waveIndex * 0.8;
        const radius = 210 + (index % 3) * 36 + duplicate * 42;
        spawn(enemyId, Math.cos(angle) * radius, Math.sin(angle) * radius, { elite: wave.elite && index === 0 });
      });
      if (this.hasEndgameModifier('mirrored')) {
        const mirrorPool = encountersForZone(wave.zoneId === 'veiled-road' ? 'cairnreach' : 'veiled-road');
        const mirroredId = choose(choose(mirrorPool, this.random), this.random);
        spawn(mirroredId, -330, 40, { elite: true });
      }
      if ((endgame.expeditionBoons ?? []).includes('hunter')) {
        const hunterPool = wave.zoneId ? encountersForZone(wave.zoneId) : ENCOUNTER_TEMPLATES;
        const hunterId = choose(choose(hunterPool, this.random), this.random);
        spawn(hunterId, -340, -55, { elite: true, targetDrop: true });
      }
    }
    endgame.waveIndex += 1;
    const modifierText = (endgame.modifiers ?? [endgame.modifier]).map((modifier) => modifier.name).join(' + ');
    this._setObjective(endgame.name ?? activityNames[endgame.activity], `${modifierText} · Wave ${waveNumber}/${endgame.wavePlan.length}`, waveNumber - 1, endgame.wavePlan.length);
    this.notify(`Wave ${waveNumber}/${endgame.wavePlan.length} approaches.`, waveNumber === endgame.wavePlan.length ? 'warning' : 'quiet');
    return true;
  }

  _finishEndgame() {
    const endgame = this.endgame;
    endgame.completed = true;
    if (endgame.blackRoad) {
      endgame.activeStage = { ...endgame.wavePlan.at(-1), objective: 'Expedition complete' };
      endgame.activeStageTotal = 1;
      endgame.stageClearedAt = this.clock;
    }
    const activityName = endgame.name ?? activityNames[endgame.activity];
    const targetTime = Math.max(42, endgame.wavePlan.length * 25 - endgame.tier * 0.22);
    const grade = endgame.elapsed <= targetTime * 0.72 ? 'S' : endgame.elapsed <= targetTime ? 'A' : endgame.elapsed <= targetTime * 1.45 ? 'B' : 'C';
    const warRoadHeat = this._hasReforgedSpecial('eclipse-war-road') && ['arena', 'siege', 'gauntlet'].includes(endgame.activity) ? 2 : 0;
    const heat = integer((endgame.rewardHeat ?? 0) + warRoadHeat, 0, 0, 99);
    const rewardScale = this._worldOath().reward * (1 + heat * 0.09);
    const forceUnique = endgame.pinnacle || endgame.activity === 'hunt' || endgame.contractId && grade === 'S' || endgame.delveId && grade === 'S' || (grade === 'S' && this.random() < Math.min(0.82, 0.42 + heat * 0.035)) || this.random() < Math.min(0.62, 0.06 + endgame.tier * 0.006 + heat * 0.02);
    const contractEntry = endgame.contractId ? this.player.contracts.active.find((entry) => entry.id === endgame.contractId) : null;
    const sourceId = endgame.blackRoad ? endgame.zoneId
      : endgame.contractId ? contractEntry?.rewardSourceId ?? 'contracts'
        : endgame.delveId ? 'delve'
          : endgame.activity === 'hunt' ? (endgame.tier >= 25 ? 'mythic-hunt' : 'boss-hunt')
            : endgame.activity === 'trial' ? 'hybrid-trial' : endgame.activity;
    let reward = null;
    if (endgame.blackRoad && endgame.targetRewardId) {
      const preferred = this._eligibleUniques(sourceId, 'unique', { targetFarm: true, preferredIds: [endgame.targetRewardId] });
      const target = preferred.find((unique) => unique.id === endgame.targetRewardId);
      if (target) reward = this._createUniqueItem(target, { sourceId, itemLevel: this._lootItemLevel({}) });
    }
    reward ??= this._generateItem({ forceUnique, sourceId, boss: endgame.blackRoad || ['hunt', 'gauntlet', 'delve'].includes(endgame.activity), elite: true, minRarity: grade === 'S' ? 'relic' : 'rare' });
    const location = this._awardItem(reward, `${activityName} reward`);
    this.player.gold += Math.round((90 + endgame.tier * 40 + (grade === 'S' ? 60 : 0)) * rewardScale);
    this.player.materials = this._normalizeMaterials(this.player.materials);
    this.player.materials.cinders += Math.round((8 + endgame.tier * 2) * rewardScale);
    this.player.materials.shards += Math.round((2 + Math.floor(endgame.tier / 6)) * Math.sqrt(rewardScale));
    this.player.materials.alloys += Math.round((1 + Math.floor(endgame.tier / 7) + (grade === 'S' ? 1 : 0)) * Math.sqrt(rewardScale));
    if (grade === 'S' || endgame.tier >= 15) this.player.materials.echoes += 1;
    if (endgame.activity === 'hunt' || grade === 'S') this.player.materials.marks += 1;
    if (endgame.tier >= 25 && grade === 'S') this.player.materials.prisms += 1;
    if (endgame.tier >= 20 && grade === 'S') this.player.materials.cores += 1;
    if (this.player.level >= MAX_LEVEL && endgame.tier >= 20) {
      this.player.leveling.paragonGlyphEmbers += 1 + Math.floor(endgame.tier / 25) + (grade === 'S' ? 1 : 0);
    }
    this._gainXp(180 + endgame.tier * 85 + Math.max(0, this.player.level - 60) * 35);
    this._recordLevelingProgress('operation', 1, { activity: endgame.activity, tier: endgame.tier, grade });
    if (endgame.tier >= 15) this._recordLevelingProgress('apex', 1, { activity: endgame.activity, tier: endgame.tier, grade });
    const record = this.player.endgameRecords[endgame.activity] ?? (this.player.endgameRecords[endgame.activity] = { bestTier: 0, fastest: 0, clears: 0 });
    record.bestTier = Math.max(record.bestTier, endgame.tier);
    record.clears += 1;
    record.fastest = record.fastest ? Math.min(record.fastest, endgame.elapsed) : endgame.elapsed;
    const activityDefinition = endgame.blackRoad ? BLACK_ROAD_BY_ID[endgame.expeditionId]
      : endgame.contractId ? contractEntry : endgame.delveId ? delveById(endgame.delveId) : activityById(endgame.activity);
    this._recordReforgedProgress('operation', { activity: endgame.activity, tier: endgame.tier, grade, factionId: activityDefinition?.factionId });
    if (endgame.expedition) {
      const expedition = this._reforged().expedition;
      expedition.mastery = Math.min(1_000_000, expedition.mastery + endgame.wavePlan.length + heat * 3 + (grade === 'S' ? 8 : 0));
      if (heat >= 6 && grade === 'S') expedition.keys = Math.min(9_999, expedition.keys + 1);
    }
    if (endgame.blackRoad) {
      const road = this.player.requiem.blackRoad;
      const roadRecord = road.records[endgame.expeditionId];
      road.totalClears += 1;
      road.bossesDefeated += 1;
      roadRecord.clears += 1;
      roadRecord.bestTime = roadRecord.bestTime ? Math.min(roadRecord.bestTime, endgame.elapsed) : endgame.elapsed;
      roadRecord.highestHeat = Math.max(roadRecord.highestHeat, heat);
      this._recordLevelingProgress('boss', 1, { enemyId: BLACK_ROAD_BY_ID[endgame.expeditionId]?.bossId, zoneId: endgame.zoneId, blackRoad: true });
      this._progressContracts('boss', { zoneId: endgame.zoneId, enemyId: BLACK_ROAD_BY_ID[endgame.expeditionId]?.bossId, amount: 1 });
    }
    if (endgame.pinnacle === 'worldscar') this._reforged().eclipse.worldscarClears += 1;
    if (endgame.pinnacle === 'final-bell') this._reforged().eclipse.finalBellClears += 1;
    if (activityDefinition?.factionId) this._gainRenown(activityDefinition.factionId, 20 + Math.floor(endgame.tier / 2) + (grade === 'S' ? 10 : 0), false);
    if (endgame.contractId) this._progressContracts('operation', { contractId: endgame.contractId, zoneId: endgame.zoneId, grade, amount: 1 });
    if (endgame.delveId) {
      const delve = delveById(endgame.delveId);
      const delveRecord = this.player.worldProgress.delves[endgame.delveId] ?? (this.player.worldProgress.delves[endgame.delveId] = { clears: 0, bestTier: 0, fastest: 0 });
      delveRecord.clears += 1;
      delveRecord.bestTier = Math.max(delveRecord.bestTier, endgame.tier);
      delveRecord.fastest = delveRecord.fastest ? Math.min(delveRecord.fastest, endgame.elapsed) : endgame.elapsed;
      this._progressContracts('delve', { zoneId: delve?.zoneId ?? '__delve__', amount: 1 });
      this._recordLevelingProgress('delve', 1, { delveId: endgame.delveId, zoneId: delve?.zoneId, tier: endgame.tier, grade });
    }
    endgame.grade = grade;
    this._setObjective(`${activityName} complete`, `Tier ${endgame.tier} · Grade ${grade} · ${Math.round(endgame.elapsed)} seconds`, 1, 1);
    this.notify(`${activityName} complete — Grade ${grade}. ${reward.name} ${location ? 'claimed' : 'awaits nearby'}.`, 'accent');
    this.emit('endgame-complete', { ...endgame, reward });
    if (endgame.blackRoad) this.emit('requiem-updated', this.getRequiemOverview());
    this._emitReforgedUpdate();
    this.save();
  }

  _updateEndgame(dt = 0) {
    if (!this.endgame || this.endgame.completed) return;
    this.endgame.elapsed += dt;
    const living = this.entities.enemies.some((enemy) => !enemy.dead && enemy.group === this.endgame.id);
    const objectiveAlive = this.endgame.blackRoad && this.endgame.activeStage
      ? (this.entities.destructibles ?? []).some((entry) => !entry.broken && entry.expeditionStageId === this.endgame.activeStage.id)
      : false;
    if (this.endgame.blackRoad && this.endgame.activeStage) {
      const remainingEnemies = this.entities.enemies.filter((enemy) => !enemy.dead && enemy.group === this.endgame.id).length;
      const remainingObjectives = (this.entities.destructibles ?? []).filter((entry) => !entry.broken && entry.expeditionStageId === this.endgame.activeStage.id).length;
      const remaining = remainingEnemies + remainingObjectives;
      this.encounter.remaining = remaining;
      this.encounter.state = this.entities.enemies.some((enemy) => !enemy.dead && enemy.windupLeft > 0) ? 'danger' : 'engaged';
      this.objective.progress = Math.max(0, this.endgame.activeStageTotal - remaining);
      this.objective.total = Math.max(1, this.endgame.activeStageTotal);
    }
    if (living || objectiveAlive) return;

    if (this.endgame.blackRoad && this.endgame.activeStage && !this.endgame.stageClearedAt) {
      const stage = this.endgame.activeStage;
      this.endgame.stageClearedAt = this.clock || 0.0001;
      this.endgame.completedStageIds ??= [];
      if (!this.endgame.completedStageIds.includes(stage.id)) this.endgame.completedStageIds.push(stage.id);
      const record = this.player.requiem.blackRoad.records[this.endgame.expeditionId];
      record.stagesCleared += 1;
      this.encounter.state = 'cleared';
      this.encounter.remaining = 0;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * 0.07);
      this.player.resource = Math.min(this.player.maxResource, this.player.resource + this.player.maxResource * 0.18);
      const stageXp = 45 + this.endgame.waveIndex * 25 + this.player.level * 3;
      const stageGold = 18 + this.endgame.waveIndex * 13 + this.player.level;
      this._gainXp(stageXp);
      this.player.gold += stageGold;
      this._setObjective(`${stage.name} cleared`, `Road secured · +${stageXp} XP · +${stageGold} gold`, 1, 1);
      this.notify(`${stage.name} cleared. The next seal is opening.`, 'accent');
      this.presentation?.emit('music:stinger', { id: 'encounter-clear' }, { source: 'black-road', priority: 82 });
      this.emit('requiem-updated', this.getRequiemOverview());
      this.save();
      return;
    }

    if (this.endgame.blackRoad && this.endgame.stageClearedAt) {
      if (this.clock - this.endgame.stageClearedAt < 1.45) return;
      this.endgame.activeStage = null;
      this.endgame.activeStageTotal = 0;
      this.endgame.stageClearedAt = 0;
      this.entities.destructibles = (this.entities.destructibles ?? []).filter((entry) => !entry.expeditionStageId);
      this.encounter.state = 'exploration';
    }
    if (this.endgame.pendingRoute) return;
    if (this.endgame.waveIndex < this.endgame.wavePlan.length) {
      const checkpoint = this.endgame.waveIndex;
      const shouldDraft = this.endgame.expedition && checkpoint > 0 && checkpoint < this.endgame.wavePlan.length
        && (this.endgame.blackRoad ? checkpoint === 2 : checkpoint % 2 === 0)
        && !this.endgame.routeCheckpoints.includes(checkpoint);
      if (shouldDraft) {
        const routeBonus = integer(this.endgame.routeContext?.eclipseControls?.extraRouteChoices, 0, 0, 3);
        const optionCount = (this._hasReforgedSpecial('faction-cache') || this._hasReforgedSpecial('eclipse-hidden-route') || this._hasReforgedSpecial('decree-five-roads') ? 4 : 3) + routeBonus;
        const pool = EXPEDITION_BOONS.filter((boon) => !(this.endgame.expeditionBoons ?? []).includes(boon.id));
        const choices = [];
        while (choices.length < Math.min(optionCount, pool.length)) choices.push(pool.splice(Math.floor(this.random() * pool.length), 1)[0].id);
        const metamorphosisChoices = this.endgame.blackRoad ? [...(this.endgame.routeContext?.metamorphosisChoiceIds ?? [])] : [];
        this.endgame.routeCheckpoints.push(checkpoint);
        this.endgame.pendingRoute = { checkpoint, room: checkpoint + 1, totalRooms: this.endgame.wavePlan.length, choices, metamorphosisChoices };
        this.notify(this.endgame.blackRoad ? 'Black Road junction reached · choose what follows you.' : 'Expedition junction reached · choose the next route.', 'accent');
        this._emitReforgedUpdate();
        this.emit('overlay', { panel: 'expedition-choice' });
        return;
      }
      this._spawnEndgameWave();
      return;
    }
    this._finishEndgame();
  }

  startEndgame(activity = 'abyss', tier = 1, options = {}) {
    if (!this.player || this.state !== 'playing') return false;
    if (this.endgame && !this.endgame.completed) {
      this.notify('Finish or leave the current operation before opening another.', 'warning');
      return false;
    }
    const contractEntry = options.contractId ? this.player.contracts?.active?.find((entry) => entry.id === options.contractId) : null;
    if (options.contractId && (!contractEntry || this._contractStep(contractEntry)?.type !== 'operation')) return false;
    if (!contractEntry && !this._campaignComplete()) {
      this.notify('Complete Chapter I before entering covenant endgame activities.', 'warning');
      return false;
    }
    const delve = options.delveId ? delveById(options.delveId) : null;
    if (options.delveId && !delve) return false;
    if (delve && this.player.level + 5 < delve.level) {
      this.notify(`Reach level ${Math.max(1, delve.level - 5)} before descending into ${delve.name}.`, 'warning');
      return false;
    }
    const validActivity = contractEntry ? 'contract' : delve ? 'delve' : activityNames[activity] ? activity : 'abyss';
    const safeTier = integer(tier, 1, 1, 50);
    const modifierCount = 1 + (safeTier >= 20 ? 1 : 0) + (safeTier >= 35 ? 1 : 0);
    const modifierPool = endgameModifiers.slice();
    const contractModifierIds = (options.contractClauses ?? []).map((id) => contractClauseById(id)?.modifierId).filter(Boolean);
    const modifiers = contractModifierIds.map((id) => endgameModifiers.find((entry) => entry.id === id)).filter(Boolean);
    while (modifiers.length < modifierCount && modifierPool.length) {
      const modifierIndex = Math.floor(this.random() * modifierPool.length);
      const candidate = modifierPool.splice(modifierIndex, 1)[0];
      if (!modifiers.some((entry) => entry.id === candidate.id)) modifiers.push(candidate);
    }
    const modifier = modifiers[0];
    this.entities.enemies = [];
    this.entities.projectiles = [];
    this.entities.hazards = [];
    this.entities.effects = [];
    this.entities.particles = [];
    this.entities.corpses = [];
    this.groupMemory.clear();
    const activityDefinition = contractEntry ?? delve ?? activityById(validActivity);
    this.endgame = {
      id: uid('endgame'),
      activity: validActivity,
      name: contractEntry ? `Sealed Writ: ${contractEntry.name}` : delve?.name ?? activityDefinition.name,
      delveId: delve?.id ?? null,
      contractId: contractEntry?.id ?? null,
      contractDifficultyId: contractEntry?.difficultyId ?? null,
      zoneId: contractEntry?.zoneId ?? delve?.zoneId ?? null,
      tier: safeTier,
      modifier,
      modifiers,
      kills: 0,
      completed: false,
      elapsed: 0,
      waveIndex: 0,
      wavePlan: [],
      expedition: !contractEntry,
      expeditionBoons: [],
      expeditionBanes: [],
      rewardHeat: 0,
      pendingRoute: null,
      routeCheckpoints: [],
      pinnacle: options.pinnacle ?? null
    };
    this.endgame.wavePlan = this._buildEndgameWavePlan(validActivity, safeTier, { ...options, delveId: delve?.id, modifiers });
    this.worldEvent = null;
    const destinationZone = ZONES.find((zone) => zone.id === (contractEntry?.zoneId ?? delve?.zoneId
      ?? (validActivity === 'siege' || validActivity === 'arena' ? 'cairnreach'
        : validActivity === 'ritual' ? 'redfen'
          : validActivity === 'gauntlet' ? 'bellscar'
            : validActivity === 'echoes' ? 'veiled-road'
              : 'veiled-road'))) ?? ZONES[0];
    this._moveBodyWithGeometry(this.player, destinationZone.x + destinationZone.width * 0.5, destinationZone.y + destinationZone.height * 0.5);
    this.player.hp = this.player.maxHp;
    this.player.resource = this.player.maxResource;
    this._spawnEndgameWave();
    this.notify(`${this.endgame.name} tier ${safeTier} opened — ${modifiers.map((entry) => entry.name).join(' + ')}.`, 'warning');
    this.emit('endgame-started', this.endgame);
    this._focusCamera(true);
    this.save();
    return true;
  }

  startPinnacle(type = 'worldscar') {
    const state = this._reforged();
    const definition = type === 'final-bell'
      ? { special: 'unlock-final-bell', activity: 'hunt', tier: 50, name: 'The Final Bell' }
      : { special: 'unlock-worldscar', activity: 'gauntlet', tier: 45, name: 'Worldscar Pinnacle' };
    if (!state || !this._hasReforgedSpecial(definition.special)) {
      this.notify(`${definition.name} is locked in the Eclipse Web.`, 'warning');
      return false;
    }
    if (state.eclipse.pinnacleKeys <= 0) {
      this.notify(`${definition.name} requires a Pinnacle Key.`, 'warning');
      return false;
    }
    const started = this.startEndgame(definition.activity, definition.tier, { pinnacle: type });
    if (!started) return false;
    state.eclipse.pinnacleKeys -= 1;
    this.endgame.name = definition.name;
    this.endgame.rewardHeat = type === 'final-bell' ? 10 : 7;
    this.endgame.modifiers = [...this.endgame.modifiers, ...endgameModifiers.filter((entry) => ['relentless', 'oathstorm'].includes(entry.id) && !this.endgame.modifiers.some((current) => current.id === entry.id))];
    this._emitReforgedUpdate();
    this.save();
    return true;
  }

  startDelve(delveId, tier = 1) {
    const delve = delveById(delveId);
    if (!delve || !this.player || this.state !== 'playing') return false;
    if (!this._campaignComplete()) {
      this.notify('Complete Chapter I before descending into regional delves.', 'warning');
      return false;
    }
    if (this.player.level + 5 < delve.level) {
      this.notify(`Reach level ${Math.max(1, delve.level - 5)} before descending into ${delve.name}.`, 'warning');
      return false;
    }
    return this.startEndgame('delve', tier, { delveId: delve.id });
  }

  returnToSanctuary() {
    if (!this.player) return;
    this.entities.enemies = [];
    this.entities.projectiles = [];
    this.entities.hazards = [];
    this.entities.effects = [];
    this.entities.particles = [];
    this.entities.corpses = [];
    this.entities.destructibles = [];
    this.groupMemory.clear();
    this.encounter = { activeRoomId: null, activeGroupId: null, state: 'exploration', remaining: 0, total: 0, roomStreak: 0, announcedRoomId: null, clearedAt: 0 };
    this.endgame = null;
    this.worldEvent = null;
    this._moveBodyWithGeometry(this.player, 700, 620);
    this.player.hp = Math.max(this.player.hp, this.player.maxHp * 0.7);
    this._spawnCampaignWorld();
    this.getSanctuaryState();
    this._setCampaignObjective();
    this._focusCamera(true);
    this.save();
  }

  _interactCampaignLandmark(landmark) {
    const state = this.getCampaign();
    if (!state || !landmark) return false;
    if (landmark.id === 'maelin') {
      const act = this._activeExpansionAct();
      if (this._isCampaignStage('meet-maelin')) {
        this._setCampaignStage('reach-waystone');
        this._queueCampaignDialogue('maelin-briefing');
      } else if (this._isCampaignStage('return-maelin')) {
        this._setCampaignStage('chapter-one-complete', 1);
        this._queueCampaignDialogue('maelin-return');
      } else if (this._isCampaignStage('chapter-one-complete')) {
        this._beginChapterTwo();
      } else if (this._isCampaignStage('maelin-bellscar-briefing')) {
        this._setCampaignStage('enter-bellscar');
        this._queueCampaignDialogue('maelin-bellscar-briefing');
      } else if (this._isCampaignStage('return-maelin-two')) {
        this._setCampaignStage('chapter-two-complete', 1);
        this._queueCampaignDialogue('maelin-return-two');
      } else if (act && this._isCampaignStage(act.firstStage)) {
        this._setCampaignStage(act.enterStage);
        this._queueCampaignDialogue(act.briefingDialogue);
      } else if (act && this._isCampaignStage(act.returnStage)) {
        this._setCampaignStage(act.completeStage, 1);
        this._queueCampaignDialogue(act.returnDialogue);
      } else if (state.completed || this._isCampaignStage('chapter-two-complete') || act && this._isCampaignStage(act.completeStage)) {
        if (!this._beginNextChapter()) this.notify('Every known campaign road is complete. Contracts, delves, strongholds, and the apex board remain.', 'accent');
      } else if (this._isCampaignChapter('chapter-two')) {
        this.notify('The citadel has already named your next step. Follow the current path.', 'quiet');
      } else if (act) {
        this.notify('The current act has already named your next step. Follow the marked campaign site.', 'quiet');
      } else {
        this.notify('The road has already been marked. Follow the current path.', 'quiet');
      }
      return true;
    }
    if (landmark.id === 'gravewake-waystone') {
      if (this._isCampaignStage('reach-waystone')) {
        this._setCampaignStage('clear-bell-risen');
        this._queueCampaignDialogue('waystone-awakens');
        this._spawnCampaignBellRisen();
      } else if (this._isCampaignStage('clear-bell-risen') || this._isCampaignStage('defeat-bell-witness')) {
        this.notify('The old stone hums with the toll beneath the earth.', 'warning');
      } else if (this._isCampaignStage('meet-maelin')) {
        this.notify('Sister Maelin must mark the road before you cross it.', 'warning');
      } else {
        this.notify('The waystone is quiet now.', 'quiet');
      }
      return true;
    }
    if (landmark.id === 'bell-gate') {
      if (this._isCampaignStage('enter-bellscar')) {
        this._setCampaignStage('break-choir-seals', this._choirSealCount());
        this._queueCampaignDialogue('bellscar-gate');
        this._spawnCampaignChoirSeals();
      } else if (!this._hasCompletedChapter('chapter-one')) {
        this.notify('The citadel does not yet know your name. Finish the road through Gravewake.', 'warning');
      } else if (!this._isCampaignChapter('chapter-two')) {
        this.notify('Sister Maelin must prepare the Bellscar road first.', 'warning');
      } else {
        this.notify('The gate stands open behind you. The choir seals wait within.', 'quiet');
      }
      return true;
    }
    if (CHOIR_SEALS.includes(landmark.id)) {
      if (!this._isCampaignStage('break-choir-seals')) {
        this.notify(this._hasBrokenChoirSeal(landmark.id) ? 'This choir has already fallen silent.' : 'The seal cannot answer until the Bellscar Gate is crossed.', 'quiet');
      } else if (this._hasBrokenChoirSeal(landmark.id)) {
        this.notify('This choir is already silent.', 'quiet');
      } else if (this._spawnCampaignChoirSeal(landmark.id)) {
        this.notify(`${landmark.label} answers the broken bell.`, 'warning');
      } else {
        this.notify('The choir is already gathering around its seal.', 'quiet');
      }
      return true;
    }
    if (landmark.id === 'reliquary-names') {
      if (!this._isCampaignStage('choose-the-toll')) {
        this.notify(this._choirSealCount() < CHOIR_SEALS.length ? 'The reliquary remains sealed while even one choir still sings.' : 'The reliquary is quiet for now.', 'warning');
      } else if (!state.dialogueSeen['reliquary-awakens']) {
        this._queueCampaignDialogue('reliquary-awakens');
      } else {
        this.emit('overlay', { panel: 'campaign-choice' });
      }
      return true;
    }
    if (landmark.id === 'abbot-vault') {
      if (!this._isCampaignStage('defeat-tolling-abbot')) {
        this.notify('The bell vault is barred until the choir has been answered.', 'warning');
      } else {
        const abbot = this.entities.enemies.find((enemy) => !enemy.dead && enemy.campaignId === 'chapter-two-abbot') ?? this._spawnCampaignTollingAbbot();
        if (abbot) {
          abbot.x = landmark.x;
          abbot.y = landmark.y;
          this._setObjective('Rath Vell, Tolling Abbot', 'Defeat the abbot before the final toll.', 0, 1);
          this.notify('The bell vault opens. Rath Vell answers.', 'warning');
        }
      }
      return true;
    }
    if (landmark.chapterId && EXPANSION_ACTS[landmark.chapterId]) return this._interactExpansionCampaignLandmark(landmark);
    return false;
  }

  _interactExpansionCampaignLandmark(landmark) {
    const state = this.getCampaign();
    const act = EXPANSION_ACTS[landmark.chapterId];
    if (!state || !act) return false;
    if (state.chapterId !== landmark.chapterId) {
      this.notify(chapterIsComplete(state, landmark.chapterId) ? 'This campaign site has already been answered.' : 'This road has not opened in the campaign yet.', 'quiet');
      return true;
    }
    if (landmark.nodeType === 'gate') {
      if (this._isCampaignStage(act.enterStage)) {
        this._setCampaignStage(act.nodeStage, this._expansionNodes().length);
        this._queueCampaignDialogue(act.gateDialogue);
        act.nodeIds.forEach((nodeId) => this._spawnExpansionNode(nodeId));
      } else {
        this.notify(this._isCampaignStage(act.firstStage) ? 'Speak with Sister Maelin before crossing this threshold.' : 'The campaign road remains open.', 'quiet');
      }
      return true;
    }
    if (landmark.nodeType === 'node') {
      if (!this._isCampaignStage(act.nodeStage)) {
        this.notify(this._hasClearedExpansionNode(landmark.id) ? 'This campaign seal has already been broken.' : 'The campaign has not reached this site yet.', 'quiet');
      } else if (this._hasClearedExpansionNode(landmark.id)) {
        this.notify('This campaign site is already clear.', 'quiet');
      } else if (this._spawnExpansionNode(landmark.id)) {
        this.notify(`${landmark.label} answers with a full warband.`, 'warning');
      } else {
        this.notify('The campaign warband is already active nearby.', 'quiet');
      }
      return true;
    }
    if (landmark.nodeType === 'boss') {
      if (!this._isCampaignStage(act.bossStage)) {
        this.notify('The boss arena remains sealed until every campaign objective is complete.', 'warning');
      } else {
        const boss = this.entities.enemies.find((enemy) => !enemy.dead && enemy.campaignId === act.bossCampaignId) ?? this._spawnExpansionBoss();
        if (boss) {
          boss.x = landmark.x;
          boss.y = landmark.y;
          this._setObjective(boss.name, getCampaignStage(state)?.detail ?? 'Defeat the campaign boss.', 0, 1);
          this.notify(`${boss.name} enters the arena.`, 'warning');
        }
      }
      return true;
    }
    return false;
  }

  _onCampaignEnemyDefeated(enemy) {
    const state = this.getCampaign();
    if (!state || !enemy?.campaignId) return;
    if (enemy.campaignId === 'chapter-one-bell-risen' && this._isCampaignStage('clear-bell-risen')) {
      state.progress = Math.min(8, state.progress + 1);
      this._setCampaignObjective();
      if (state.progress >= 8) {
        this._setCampaignStage('defeat-bell-witness');
        this._queueCampaignDialogue('witness-arrives');
        this._spawnCampaignBellWitness();
      }
      return;
    }
    if (enemy.campaignId === 'chapter-one-witness' && this._isCampaignStage('defeat-bell-witness')) {
      this._setCampaignStage('return-maelin');
      this._queueCampaignDialogue('witness-falls');
      return;
    }
    if (enemy.campaignId?.startsWith('chapter-two-seal:') && this._isCampaignStage('break-choir-seals')) {
      const sealId = enemy.campaignId.slice('chapter-two-seal:'.length);
      const stillStanding = this.entities.enemies.some((candidate) => !candidate.dead && candidate.campaignId === enemy.campaignId);
      if (!CHOIR_SEALS.includes(sealId) || stillStanding || this._hasBrokenChoirSeal(sealId)) return;
      state.flags.choirSeals.push(sealId);
      state.flags.choirSeals = [...new Set(state.flags.choirSeals)].filter((id) => CHOIR_SEALS.includes(id));
      state.progress = state.flags.choirSeals.length;
      const seal = this._chapterTwoLandmark(sealId);
      if (seal) this._pushEffect({ kind: 'campaign-awaken', x: seal.x, y: seal.y, life: 1.45, maxLife: 1.45, color: '#e8dfb2' });
      this._setCampaignObjective();
      if (state.progress >= CHOIR_SEALS.length) {
        this._setCampaignStage('choose-the-toll');
        this._queueCampaignDialogue('choir-seal-cleared');
      } else {
        this.notify(`${CHOIR_SEALS.length - state.progress} choir seal${CHOIR_SEALS.length - state.progress === 1 ? '' : 's'} remain.`, 'accent');
      }
      return;
    }
    if (enemy.campaignId === 'chapter-two-abbot' && this._isCampaignStage('defeat-tolling-abbot')) {
      this._setCampaignStage('return-maelin-two');
      this._grantChapterTwoReward();
      this._queueCampaignDialogue('abbot-falls');
      return;
    }
    const act = this._activeExpansionAct();
    const chapterId = this.getCampaign()?.chapterId;
    if (act && enemy.campaignId?.startsWith(`${chapterId}-node:`) && this._isCampaignStage(act.nodeStage)) {
      const nodeId = enemy.campaignId.slice(`${chapterId}-node:`.length);
      const stillStanding = this.entities.enemies.some((candidate) => !candidate.dead && candidate.campaignId === enemy.campaignId);
      if (!act.nodeIds.includes(nodeId) || stillStanding || this._hasClearedExpansionNode(nodeId)) return;
      state.flags.chapterNodes ??= {};
      state.flags.chapterNodes[chapterId] = [...new Set([...(state.flags.chapterNodes[chapterId] ?? []), nodeId])].filter((id) => act.nodeIds.includes(id));
      state.progress = state.flags.chapterNodes[chapterId].length;
      const node = this.entities.landmarks.find((landmark) => landmark.id === nodeId);
      if (node) this._pushEffect({ kind: 'campaign-awaken', x: node.x, y: node.y, life: 1.45, maxLife: 1.45, color: '#e8dfb2' });
      this._setCampaignObjective();
      if (state.progress >= act.nodeIds.length) {
        this._setCampaignStage(act.bossStage);
        this._queueCampaignDialogue(act.bossDialogue);
        this._spawnExpansionBoss();
      } else {
        this._queueCampaignDialogue(act.nodeDialogue);
        this.notify(`${act.nodeIds.length - state.progress} campaign site${act.nodeIds.length - state.progress === 1 ? '' : 's'} remain.`, 'accent');
      }
      return;
    }
    if (act && enemy.campaignId === act.bossCampaignId && this._isCampaignStage(act.bossStage)) {
      this._setCampaignStage(act.returnStage);
      this._grantExpansionChapterReward(act);
      this._queueCampaignDialogue(act.fallDialogue);
    }
  }

  interact() {
    if (!this.player) return false;
    const execution = this.entities.enemies
      .filter((enemy) => !enemy.dead && enemy.knockdown > 0.16 && distance(enemy, this.player) < enemy.radius + this.player.radius + 48)
      .sort((a, b) => distance(a, this.player) - distance(b, this.player))[0];
    if (execution) return this._executeEnemy(execution);
    const landmark = this.entities.landmarks.find((entry) => distance(entry, this.player) < 100);
    if (!landmark) {
      const drop = this.entities.loot.find((entry) => distance(entry, this.player) < 100);
      if (drop) this._pickup(drop);
      else this.notify('Nothing here answers the covenant.', 'quiet');
      return Boolean(drop);
    }
    if (landmark.kind === 'campaign') this._interactCampaignLandmark(landmark);
    else if (landmark.kind === 'endgame') this.emit('overlay', { panel: 'endgame' });
    else if (landmark.kind === 'forge') this.emit('overlay', { panel: 'inventory', forge: true });
    else if (landmark.kind === 'waypoint') {
      const waypoints = this.player.worldProgress.waypoints;
      if (!waypoints.includes(landmark.id)) {
        waypoints.push(landmark.id);
        this._gainRenown('ashen-accord', 8, false);
        this._gainXp(70 + zoneAt(landmark.x, landmark.y).level * 10);
        this._recordLevelingProgress('waypoint', 1, { zoneId: landmark.zoneId, waypointId: landmark.id });
        this.notify(`${landmark.label} attuned. Fast travel is now available from the world map.`, 'accent');
      } else {
        this.player.hp = Math.max(this.player.hp, this.player.maxHp * 0.78);
        this.player.resource = this.player.maxResource;
        this.notify(`${landmark.label} steadies the covenant.`, 'quiet');
      }
      this.save();
    } else if (landmark.kind === 'lore') {
      const lore = this.player.worldProgress.lore;
      if (lore.includes(landmark.id)) {
        this.notify(`${landmark.label} is already recorded in the World Chronicle.`, 'quiet');
      } else {
        lore.push(landmark.id);
        this._gainXp(55 + zoneAt(landmark.x, landmark.y).level * 8);
        this._gainRenown(districtAt(landmark.x, landmark.y).factionId, 7, false);
        this._recordLevelingProgress('lore', 1, { zoneId: landmark.zoneId, loreId: landmark.id });
        this.player.gold += 35 + zoneAt(landmark.x, landmark.y).level * 4;
        this.notify(`${landmark.label} recorded · ${lore.length}/${LANDMARKS.filter((entry) => entry.kind === 'lore').length} chronicles.`, 'accent');
        this.save();
      }
    } else if (landmark.kind === 'delve') {
      const delve = delveById(landmark.delveId);
      if (!delve || !this.getDelves().find((entry) => entry.id === delve.id)?.unlocked) this.notify(`Reach level ${delve?.level ?? 1} and complete Chapter I to enter this delve.`, 'warning');
      else this.startDelve(delve.id, Math.max(1, Math.floor(this.player.level / 5)));
    }
    else if (landmark.kind === 'stronghold') {
      const matchingDefence = this.player.contracts?.active?.some((entry) => !entry.ready && this._contractStep(entry)?.type === 'stronghold' && entry.zoneId === landmark.zoneId);
      const hold = this._reforged()?.world?.strongholds?.[landmark.id];
      const region = this._reforged()?.world?.regions?.[landmark.zoneId];
      const defenceReady = matchingDefence || hold?.stability < 70 || region?.threat >= 55;
      if (this.player.worldProgress.strongholds?.[landmark.id] && defenceReady) {
        if (this._startWorldEvent('invasion', { strongholdId: landmark.id, zoneId: landmark.zoneId })) this.notify(matchingDefence ? 'Stronghold defence begun for the active contract.' : 'Regional pressure has reached the walls. Stronghold defence begun.', 'warning');
      } else if (this.player.worldProgress.strongholds?.[landmark.id]) this.notify(`Stronghold stable at ${hold?.stability ?? 60}%. Reconstruction projects remain active.`, 'quiet');
      else if (this._startWorldEvent('invasion', { strongholdId: landmark.id, zoneId: landmark.zoneId })) this.notify('Stronghold assault begun.', 'warning');
    } else if (landmark.kind === 'boss') {
      if (!this._campaignComplete()) {
        this.notify('The Bellscar Gate remains sealed. Break the broken toll in Gravewake first.', 'warning');
        return true;
      }
      const boss = this.entities.enemies.find((enemy) => enemy.boss && !enemy.dead);
      if (boss) {
        boss.x = landmark.x;
        boss.y = landmark.y;
        this._setObjective('The Bell-Broken', 'Defeat Rath Vell, the Tolling Abbot.', 0, 1);
        this.notify('The bell answers your challenge.', 'warning');
      }
    }
    return true;
  }

  _executeEnemy(enemy, resolved = false) {
    if (!enemy || enemy.dead || enemy.knockdown <= 0) return false;
    const player = this.player;
    if (!resolved && this.presentation) {
      return this._queuePresentedAction('execution', () => this._executeEnemy(enemy, true), {
        soundId: 'execute', animationType: 'execution', angle: angleTo(player, enemy),
        onCommit: () => { player.iframes = Math.max(player.iframes, 0.42); this._alignPlayerAttack(enemy); }
      });
    }
    const stats = this.getStats();
    this._recordLevelingProgress('execution', 1, { enemyId: enemy.templateId, elite: enemy.elite, boss: enemy.boss });
    const executionZoneId = this.endgame?.contractId ? this.endgame.zoneId : this.endgame ? '__endgame__' : zoneAt(enemy.x, enemy.y).id;
    this._progressContracts('execution', { zoneId: executionZoneId, contractId: this.endgame?.contractId ?? null, enemyId: enemy.templateId, amount: 1 });
    player.iframes = Math.max(player.iframes, 0.34);
    if (!resolved) this._setAnimation('execution', 0.46, angleTo(player, enemy));
    const amount = enemy.boss ? Math.max(stats.power * 5.5, enemy.maxHp * 0.12) : Math.max(enemy.hp + 1, stats.power * 4.8);
    this._damageEnemy(enemy, amount, { source: 'execution', armorPierce: 0.8, stagger: 0, color: this.getHybrid().color });
    if (this._rollFatedProc('executionCascade', stats)) {
      this._damageArc({ x: enemy.x, y: enemy.y, facing: player.facing }, 162, Math.PI * 2, stats.power * 0.95, { source: 'fated-execution-cascade', stagger: 1.2, mark: 3.2, color: '#f2cf8a', noFatedProc: true });
      this._pushEffect({ kind: 'affix-execution-cascade', x: enemy.x, y: enemy.y, life: 0.58, maxLife: 0.58, color: '#f2cf8a' });
    }
    const heal = player.maxHp * stats.executionHeal;
    if (heal) {
      player.hp = clamp(player.hp + heal, 0, player.maxHp);
      player.barrier += player.maxHp * stats.executionBarrier;
      player.barrierTime = Math.max(player.barrierTime, 3.5);
      this._float(player.x, player.y - 36, `+${Math.round(heal)}`, '#a7e7be', 'heal');
    }
    if (this.getTalentRank('veil-shatterdance')) {
      const targets = this.entities.enemies.filter((candidate) => !candidate.dead && candidate.id !== enemy.id && distance(candidate, enemy) < 330).slice(0, 5);
      targets.forEach((target, index) => this._createProjectile({ owner: 'player', kind: 'shatterdance', x: enemy.x, y: enemy.y, angle: angleTo(enemy, target) + (index - (targets.length - 1) / 2) * 0.08, speed: 700, radius: 8, life: 0.65, damage: stats.power * 0.8, pierce: 0, color: '#ff9a5d', mark: 2.5 }));
    }
    this._emitBurst(enemy.x, enemy.y, this.getHybrid().color, 22, 205);
    this.input.rumble?.(0.16, 0.72, 0.38);
    if (!resolved) this.emit('sound', { id: 'execute' });
    return true;
  }

  equipItem(itemId) {
    const player = this.player;
    const owned = this._findOwnedItem(itemId);
    if (!owned || !['inventory', 'stash'].includes(owned.location)) return false;
    const item = owned.item;
    const previous = player.equipment[item.slot];
    player[owned.location].splice(owned.index, 1);
    player.equipment[item.slot] = item;
    if (previous && !this._storeItem(previous)) {
      player.equipment[item.slot] = previous;
      player[owned.location].splice(owned.index, 0, item);
      this.notify('Make room before swapping equipped relics.', 'warning');
      return false;
    }
    this._refreshPlayerStats(true);
    this.notify(`${item.name} attuned.`, item.rarity === 'unique' ? 'accent' : 'quiet');
    this.save();
    return true;
  }

  unequipItem(slot) {
    const player = this.player;
    const item = player.equipment[slot];
    if (!item) return false;
    if (!this._storeItem(item)) {
      this.notify('Pack and stash are full.', 'warning');
      return false;
    }
    delete player.equipment[slot];
    this._refreshPlayerStats(true);
    this.notify(`${item.name} returned to storage.`, 'quiet');
    this.save();
    return true;
  }

  stashItem(itemId) {
    const player = this.player;
    const index = player.inventory.findIndex((item) => item.id === itemId);
    if (index < 0 || player.stash.length >= STASH_CAPACITY) {
      this.notify(index < 0 ? 'That relic is not in your pack.' : 'The sanctuary stash is full.', 'warning');
      return false;
    }
    const [item] = player.inventory.splice(index, 1);
    player.stash.unshift(item);
    this.notify(`${item.name} moved to the sanctuary stash.`, 'quiet');
    this.save();
    return true;
  }

  retrieveItem(itemId) {
    const player = this.player;
    const index = player.stash.findIndex((item) => item.id === itemId);
    if (index < 0 || player.inventory.length >= INVENTORY_CAPACITY) {
      this.notify(index < 0 ? 'That relic is not in the stash.' : 'Your pack is full.', 'warning');
      return false;
    }
    const [item] = player.stash.splice(index, 1);
    player.inventory.unshift(item);
    this.notify(`${item.name} moved to your pack.`, 'quiet');
    this.save();
    return true;
  }

  toggleItemLock(itemId) {
    if (!this._findOwnedItem(itemId)) return false;
    const locks = this.player.itemLocks;
    if (locks[itemId]) {
      delete locks[itemId];
      this.notify('Relic unlocked.', 'quiet');
    } else {
      locks[itemId] = true;
      this.notify('Relic locked against salvage.', 'accent');
    }
    this.save();
    return true;
  }

  isItemLocked(itemId) {
    return Boolean(this.player?.itemLocks?.[itemId]);
  }

  sortInventory(mode = 'rarity') {
    const order = Object.fromEntries([...RARITIES].sort((a, b) => b.score - a.score).map((rarity, index) => [rarity.id, index]));
    const compare = (a, b) => {
      if (mode === 'slot') return a.slot.localeCompare(b.slot) || a.name.localeCompare(b.name);
      if (mode === 'name') return a.name.localeCompare(b.name);
      return (order[a.rarity] ?? 9) - (order[b.rarity] ?? 9) || a.slot.localeCompare(b.slot) || a.name.localeCompare(b.name);
    };
    this.player.inventory.sort(compare);
    this.player.stash.sort(compare);
    this.player.inventorySort = mode;
    this.notify(`Relics sorted by ${mode}.`, 'quiet');
    this.save();
    return true;
  }

  saveLoadout(index) {
    const player = this.player;
    if (!Number.isInteger(index) || index < 0 || index >= 3) return false;
    const entries = Object.entries(player.equipment).map(([slot, item]) => [slot, item.id]);
    if (!entries.length) {
      this.notify('Equip at least one relic before saving a loadout.', 'warning');
      return false;
    }
    player.loadouts[index] = Object.fromEntries(entries);
    this.notify(`Loadout ${index + 1} recorded.`, 'accent');
    this.save();
    return true;
  }

  applyLoadout(index) {
    const player = this.player;
    const loadout = player.loadouts?.[index];
    if (!loadout || !Object.keys(loadout).length) {
      this.notify(`Loadout ${index + 1} is empty.`, 'warning');
      return false;
    }
    const allItems = [...player.inventory, ...player.stash, ...Object.values(player.equipment)];
    const desired = {};
    for (const [slot, itemId] of Object.entries(loadout)) {
      const item = allItems.find((candidate) => candidate.id === itemId);
      if (!item || item.slot !== slot) {
        this.notify(`Loadout ${index + 1} is missing ${slot} gear.`, 'warning');
        return false;
      }
      desired[slot] = item;
    }
    const desiredIds = new Set(Object.values(desired).map((item) => item.id));
    const inventory = player.inventory.filter((item) => !desiredIds.has(item.id));
    const stash = player.stash.filter((item) => !desiredIds.has(item.id));
    const displaced = Object.entries(player.equipment).filter(([, item]) => !desiredIds.has(item.id)).map(([, item]) => item);
    for (const item of displaced) {
      if (inventory.length < INVENTORY_CAPACITY) inventory.unshift(item);
      else if (stash.length < STASH_CAPACITY) stash.unshift(item);
      else {
        this.notify('Make room before changing loadouts.', 'warning');
        return false;
      }
    }
    player.inventory = inventory;
    player.stash = stash;
    player.equipment = desired;
    this._refreshPlayerStats(true);
    this.notify(`Loadout ${index + 1} attuned.`, 'accent');
    this.save();
    return true;
  }

  reforgeItem(itemId) {
    const item = this._findOwnedItem(itemId)?.item;
    const cost = 40 + Math.max(0, (RARITY_SCORE[item?.rarity] ?? 1) - 1) * 18;
    if (!item || this.player.gold < cost) {
      this.notify(`Reforging requires ${cost} gold.`, 'warning');
      return false;
    }
    if (integer(item.masterwork, 0, 0, MASTERWORK_MAX_RANK) > 0) {
      this.notify('A Masterworked relic cannot be reforged. Its affix focus is committed to the Anvil.', 'warning');
      return false;
    }
    if (!Array.isArray(item.affixes)) item.affixes = [];
    this.player.gold -= cost;
    const base = ITEM_BASES.find((entry) => entry.id === item.baseId && entry.slot === item.slot);
    const reroll = this._rollAffixes(1, RARITY_SCORE[item.rarity] >= RARITY_SCORE.relic, { base, itemLevel: item.itemLevel, rarity: item.rarity })[0];
    const lockedIndex = integer(item.forgeLockedAffix, -1, -1, Math.max(-1, item.affixes.length - 1));
    const rerollable = item.affixes.map((_, index) => index).filter((index) => index !== lockedIndex);
    if (item.affixes.length && rerollable.length) item.affixes[choose(rerollable, this.random)] = reroll;
    else if (item.affixes.length && lockedIndex >= 0) {
      this.player.gold += cost;
      this.notify('Every affix is protected by the Oath Lock. Release it before reforging.', 'warning');
      return false;
    }
    else item.affixes = [reroll];
    this._gainForgeXp('reforge', 5);
    this._refreshPlayerStats(true);
    this._recordLevelingProgress('forge', 1, { action: 'reforge', rarity: item.rarity });
    this.notify(`${item.name} reforged.`, 'accent');
    this.save();
    return true;
  }

  salvageItem(itemId) {
    const player = this.player;
    const index = player.inventory.findIndex((item) => item.id === itemId);
    if (index < 0) {
      this.notify('Only items in your pack can be salvaged.', 'warning');
      return false;
    }
    if (this.isItemLocked(itemId)) {
      this.notify('Unlock this relic before salvaging it.', 'warning');
      return false;
    }
    const [item] = player.inventory.splice(index, 1);
    delete player.itemLocks[item.id];
    player.materials = this._normalizeMaterials(player.materials);
    const yieldByRarity = {
      common: { cinders: 2, shards: 0, echoes: 0, prisms: 0, alloys: 0, cores: 0 },
      magic: { cinders: 6, shards: 0, echoes: 0, prisms: 0, alloys: 0, cores: 0 },
      rare: { cinders: 14, shards: 1, echoes: 0, prisms: 0, alloys: 0, cores: 0 },
      relic: { cinders: 28, shards: 3, echoes: 0, prisms: 0, alloys: 1, cores: 0 },
      unique: { cinders: 42, shards: 5, echoes: 1, prisms: 0, alloys: 2, cores: 0 },
      mythic: { cinders: 80, shards: 10, echoes: 3, prisms: 1, alloys: 4, cores: 0 }
    };
    const reward = { ...(yieldByRarity[item.rarity] ?? yieldByRarity.common) };
    const masterworkRank = integer(item.masterwork, 0, 0, MASTERWORK_MAX_RANK);
    reward.alloys += Math.floor(masterworkRank / 2);
    if (masterworkRank >= MASTERWORK_MAX_RANK) reward.cores += 1;
    const reclamationRank = this._reforged()?.forge?.ranks?.reclamation ?? 0;
    if (reclamationRank >= 2) Object.keys(reward).forEach((key) => { reward[key] = Math.round(reward[key] * (1 + reclamationRank * 0.035)); });
    if (reclamationRank >= 2 && item.baseId && !this._reforged().forge.blueprints.includes(item.baseId) && RARITY_SCORE[item.rarity] >= RARITY_SCORE.relic && this.random() < Math.min(0.9, 0.18 + reclamationRank * 0.055)) {
      this._reforged().forge.blueprints.push(item.baseId);
      this.notify(`${ITEM_BASES.find((base) => base.id === item.baseId)?.name ?? item.name} blueprint recovered.`, 'accent');
    }
    Object.entries(reward).forEach(([key, value]) => { player.materials[key] = (player.materials[key] ?? 0) + value; });
    const refundedRunes = Array.isArray(item.runeIds) && item.runeIds.length ? item.runeIds : item.runeId ? [item.runeId] : [];
    refundedRunes.forEach((runeId) => { player.runes[runeId] = (player.runes[runeId] ?? 0) + 1; });
    const runeCount = item.rarity === 'mythic' ? 2 : item.rarity === 'unique' ? 1 : item.rarity === 'relic' && this.random() < 0.82 ? 1 : item.rarity === 'rare' && this.random() < 0.4 ? 1 : 0;
    const runes = Array.from({ length: runeCount }, () => choose(RUNES, this.random));
    runes.forEach((rune) => { player.runes[rune.id] = (player.runes[rune.id] ?? 0) + 1; });
    const materialText = [`+${reward.cinders} Cinders`, reward.shards ? `+${reward.shards} Forge Shards` : '', reward.alloys ? `+${reward.alloys} Tempering Alloy${reward.alloys === 1 ? '' : 's'}` : '', reward.echoes ? `+${reward.echoes} Oath Echo${reward.echoes === 1 ? '' : 'es'}` : '', reward.prisms ? `+${reward.prisms} Prism` : '', reward.cores ? `+${reward.cores} Apex Core${reward.cores === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ');
    const runeText = runes.length ? ` · ${runes.map((rune) => rune.name).join(', ')}` : refundedRunes.length ? ` · ${refundedRunes.length} socketed rune${refundedRunes.length === 1 ? '' : 's'} recovered` : '';
    this._recordLevelingProgress('forge', 1, { action: 'salvage', rarity: item.rarity });
    this._gainForgeXp('salvage', 2 + (RARITY_SCORE[item.rarity] ?? 0));
    this.notify(`Salvaged ${item.name}: ${materialText}${runeText}.`, 'quiet');
    this.save();
    return true;
  }

  temperItem(itemId) {
    const player = this.player;
    const item = this._findOwnedItem(itemId)?.item;
    if (!item) return false;
    if (integer(item.masterwork, 0, 0, MASTERWORK_MAX_RANK) > 0) {
      this.notify('A Masterworked relic can no longer be tempered. Reforge before committing it to the Anvil.', 'warning');
      return false;
    }
    if (!Array.isArray(item.affixes)) item.affixes = [];
    const cost = item.rarity === 'mythic' ? 30 : item.rarity === 'unique' ? 20 : item.rarity === 'relic' ? 14 : item.rarity === 'rare' ? 10 : 6;
    if (player.materials.cinders < cost) {
      this.notify(`Tempering requires ${cost} Cinders.`, 'warning');
      return false;
    }
    player.materials.cinders -= cost;
    if (!item.affixes.length) item.affixes = this._rollAffixes(1, RARITY_SCORE[item.rarity] >= RARITY_SCORE.relic, { base: ITEM_BASES.find((base) => base.id === item.baseId), itemLevel: item.itemLevel, rarity: item.rarity });
    const defenseStats = new Set(['hp', 'armor', 'barrier', 'ward', 'wardDamageReduction']);
    const utilityStats = new Set(['speed', 'cooldown', 'resourceGain', 'lifeOnKill', 'lootFind', 'goldFind', 'resonanceGain', 'masteryGain']);
    const guided = item.guidedTemper;
    const candidates = guided ? item.affixes.filter((entry) => guided === 'defense' ? defenseStats.has(entry.stat) : guided === 'utility' ? utilityStats.has(entry.stat) : !defenseStats.has(entry.stat) && !utilityStats.has(entry.stat)) : item.affixes;
    const affix = choose(candidates.length ? candidates : item.affixes, this.random);
    affix.value *= 1.28 + this.random() * 0.12;
    item.tempered = (item.tempered ?? 0) + 1;
    delete item.guidedTemper;
    this._gainForgeXp('temper', 5 + (RARITY_SCORE[item.rarity] ?? 0));
    this._refreshPlayerStats(true);
    this._recordLevelingProgress('forge', 1, { action: 'temper', rarity: item.rarity });
    this.notify(`${item.name} tempered: ${affix.label} rises.`, 'accent');
    this.save();
    return true;
  }

  corruptItem(itemId) {
    const player = this.player;
    const item = this._findOwnedItem(itemId)?.item;
    if (!item || item.corruption) {
      this.notify(item?.corruption ? 'This item has already been corrupted.' : 'Item not found.', 'warning');
      return false;
    }
    if (!Array.isArray(item.affixes)) item.affixes = [];
    const echoCost = item.rarity === 'unique' ? 2 : 1;
    if (player.materials.echoes < echoCost) {
      this.notify(`Corruption requires ${echoCost} Oath Echo${echoCost > 1 ? 'es' : ''}.`, 'warning');
      return false;
    }
    player.materials.echoes -= echoCost;
    const outcomes = [
      { boon: { stat: 'power', label: 'Corrupted power', value: 8 + player.level * 1.8 }, burden: { stat: 'hp', label: 'Withered vitality', value: -Math.max(6, player.maxHp * 0.05) } },
      { boon: { stat: 'crit', label: 'Forbidden precision', value: 0.07, percentage: true }, burden: { stat: 'armor', label: 'Fractured armor', value: -4 } },
      { boon: { stat: 'resourceGain', label: 'Hungry resource gain', value: 0.24, percentage: true }, burden: { stat: 'speed', label: 'Heavy stride', value: -0.06, percentage: true } }
    ];
    const outcome = choose(outcomes, this.random);
    item.affixes.push(outcome.boon, outcome.burden);
    item.corruption = `${outcome.boon.label}; ${outcome.burden.label}`;
    this._gainForgeXp('corrupt', 8);
    this._refreshPlayerStats(true);
    this._recordLevelingProgress('forge', 1, { action: 'corrupt', rarity: item.rarity });
    this.notify(`${item.name} was corrupted. Power always leaves a scar.`, 'warning');
    this.save();
    return true;
  }

  masterworkItem(itemId) {
    const player = this.player;
    const item = this._findOwnedItem(itemId)?.item;
    if (!item) return false;
    item.masterwork = integer(item.masterwork, 0, 0, MASTERWORK_MAX_RANK);
    const state = this.getMasterworkState(item);
    if (item.masterwork >= MASTERWORK_MAX_RANK) {
      this.notify(`${item.name} has reached Apex Masterwork.`, 'warning');
      return false;
    }
    if (!state.eligibility.ok) {
      this.notify(state.eligibility.reason, 'warning');
      return false;
    }
    player.materials = this._normalizeMaterials(player.materials);
    const costs = state.costs;
    const missing = Object.entries(costs).filter(([material, amount]) => (player.materials[material] ?? 0) < amount);
    if (missing.length) {
      const costCopy = [`${costs.cinders} Cinders`, `${costs.shards} Forge Shard${costs.shards === 1 ? '' : 's'}`, `${costs.alloys} Tempering Alloy${costs.alloys === 1 ? '' : 's'}`, costs.echoes ? `${costs.echoes} Oath Echo${costs.echoes === 1 ? '' : 'es'}` : '', costs.prisms ? `${costs.prisms} Prism${costs.prisms === 1 ? '' : 's'}` : '', costs.cores ? `${costs.cores} Apex Core${costs.cores === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ');
      this.notify(`${state.stage.name} Masterworking requires ${costCopy}.`, 'warning');
      return false;
    }
    Object.entries(costs).forEach(([material, amount]) => { player.materials[material] -= amount; });
    item.masterwork += 1;
    this._gainForgeXp('masterwork', 7 + item.masterwork * 2);
    if (MASTERWORK_MILESTONES.includes(item.masterwork)) {
      const validFocus = integer(item.masterworkFocus, 0, 0, Math.max(0, (item.affixes?.length ?? 1) - 1));
      const fallback = (item.affixes ?? []).reduce((best, affix, index) => Number(affix?.value ?? 0) > Number(item.affixes?.[best]?.value ?? -Infinity) ? index : best, 0);
      const focus = item.affixes?.[validFocus] ? validFocus : fallback;
      item.masterworkFocus = focus;
      item.masterworkExalts = Array.isArray(item.masterworkExalts) ? item.masterworkExalts.slice(0, MASTERWORK_MILESTONES.length - 1) : [];
      item.masterworkExalts.push(focus);
      const affix = item.affixes?.[focus];
      this.notify(`${state.stage.name} breakthrough: ${affix?.label ?? 'the focused affix'} is exalted by 25%.`, 'accent');
    } else {
      this.notify(`${item.name} becomes ${state.stage.name} Masterwork ${item.masterwork}/${MASTERWORK_MAX_RANK}.`, 'accent');
    }
    this._refreshPlayerStats(true);
    this._recordLevelingProgress('forge', 1, { action: 'masterwork', rarity: item.rarity, rank: item.masterwork });
    this._recordLevelingProgress('masterwork', 1, { rarity: item.rarity, rank: item.masterwork });
    this.save();
    return true;
  }

  inscribeRune(itemId, runeId) {
    const player = this.player;
    const item = this._findOwnedItem(itemId)?.item;
    const rune = runeById(runeId);
    if (!item || !rune) return false;
    if ((player.runes?.[runeId] ?? 0) <= 0) {
      this.notify(`No ${rune.name} is available. Salvage rare relics to find one.`, 'warning');
      return false;
    }
    item.sockets = integer(item.sockets, item.runeId ? 1 : rarityById(item.rarity).sockets, 0, 3);
    item.runeIds = Array.isArray(item.runeIds) ? item.runeIds.filter((id) => RUNE_IDS.has(id)).slice(0, item.sockets) : item.runeId ? [item.runeId] : [];
    if (item.runeIds.includes(runeId)) {
      this.notify(`${rune.name} is already inscribed in ${item.name}.`, 'quiet');
      return false;
    }
    if (item.runeIds.length >= item.sockets) {
      this.notify(`${item.name} has no empty rune socket. Use a Prism to open another or remove a rune first.`, 'warning');
      return false;
    }
    player.runes[runeId] -= 1;
    if (player.runes[runeId] <= 0) delete player.runes[runeId];
    item.runeIds.push(runeId);
    item.runeId = item.runeIds[0];
    this._gainForgeXp('rune', 5);
    this._refreshPlayerStats(true);
    this._recordLevelingProgress('forge', 1, { action: 'inscribe', rarity: item.rarity });
    this.notify(`${rune.name} inscribed in ${item.name} (${item.runeIds.length}/${item.sockets}).`, 'accent');
    this.save();
    return true;
  }

  unsocketRune(itemId, socketIndex) {
    const item = this._findOwnedItem(itemId)?.item;
    const index = integer(socketIndex, -1, -1, 2);
    if (!item || !Array.isArray(item.runeIds) || !item.runeIds[index]) return false;
    const [runeId] = item.runeIds.splice(index, 1);
    this.player.runes[runeId] = (this.player.runes[runeId] ?? 0) + 1;
    item.runeId = item.runeIds[0];
    this._refreshPlayerStats(true);
    this.notify(`${runeById(runeId)?.name ?? 'Rune'} returned to the satchel.`, 'quiet');
    this.save();
    return true;
  }

  openSocket(itemId) {
    const item = this._findOwnedItem(itemId)?.item;
    if (!item || item.sockets >= 3) {
      this.notify(item?.sockets >= 3 ? 'This relic already has three rune sockets.' : 'Relic not found.', 'warning');
      return false;
    }
    this.player.materials = this._normalizeMaterials(this.player.materials);
    const shardCost = 3 + item.sockets * 2;
    const prismCost = item.sockets >= 2 ? 1 : 0;
    if (this.player.materials.shards < shardCost || this.player.materials.prisms < prismCost) {
      this.notify(`Opening a socket requires ${shardCost} Forge Shards${prismCost ? ' and 1 Prism' : ''}.`, 'warning');
      return false;
    }
    this.player.materials.shards -= shardCost;
    this.player.materials.prisms -= prismCost;
    item.sockets += 1;
    this._gainForgeXp('socket', 7 + item.sockets * 2);
    this._recordLevelingProgress('forge', 1, { action: 'socket', rarity: item.rarity });
    this.notify(`${item.name} gains a rune socket.`, 'accent');
    this.save();
    return true;
  }

  infuseAffix(itemId) {
    const item = this._findOwnedItem(itemId)?.item;
    if (!item) return false;
    const capacity = rarityById(item.rarity).affixes;
    if ((item.affixes?.length ?? 0) >= capacity) {
      this.notify(`${item.name} already carries its full affix complement.`, 'warning');
      return false;
    }
    this.player.materials = this._normalizeMaterials(this.player.materials);
    const cinderCost = 14 + (item.affixes?.length ?? 0) * 9;
    const shardCost = RARITY_SCORE[item.rarity] >= RARITY_SCORE.rare ? 1 : 0;
    if (this.player.materials.cinders < cinderCost || this.player.materials.shards < shardCost) {
      this.notify(`Infusion requires ${cinderCost} Cinders${shardCost ? ' and 1 Forge Shard' : ''}.`, 'warning');
      return false;
    }
    this.player.materials.cinders -= cinderCost;
    this.player.materials.shards -= shardCost;
    const base = ITEM_BASES.find((entry) => entry.id === item.baseId && entry.slot === item.slot);
    const blocked = new Set((item.affixes ?? []).map((affix) => affix.stat));
    const candidate = this._rollAffixes(1, RARITY_SCORE[item.rarity] >= RARITY_SCORE.relic, { base, itemLevel: item.itemLevel, rarity: item.rarity }).find((affix) => !blocked.has(affix.stat));
    if (!candidate) {
      this.player.materials.cinders += cinderCost;
      this.player.materials.shards += shardCost;
      this.notify('No compatible affix could be found for this relic.', 'warning');
      return false;
    }
    item.affixes = [...(item.affixes ?? []), candidate];
    this._gainForgeXp('infuse', 8);
    this._refreshPlayerStats(true);
    this._recordLevelingProgress('forge', 1, { action: 'infuse', rarity: item.rarity });
    this.notify(`${candidate.label} is infused into ${item.name}.`, 'accent');
    this.save();
    return true;
  }

  selectLootTarget(uniqueId) {
    const unique = uniqueById(uniqueId);
    if (!unique || !this._isUniqueEligible(unique)) return false;
    this.player.lootTarget = this.player.lootTarget === uniqueId ? null : uniqueId;
    this.notify(this.player.lootTarget ? `${unique.name} marked for target crafting.` : 'Loot target cleared.', this.player.lootTarget ? 'accent' : 'quiet');
    this.save();
    return true;
  }

  craftLoot(kind = 'relic') {
    const player = this.player;
    player.materials = this._normalizeMaterials(player.materials);
    const recipes = {
      rune: { cinders: 0, shards: 3, echoes: 0, prisms: 0 },
      relic: { cinders: 60, shards: 6, echoes: 0, prisms: 0 },
      target: { cinders: 120, shards: 8, echoes: 3, prisms: 0 }
    };
    const cost = recipes[kind];
    if (!cost) return false;
    if (Object.entries(cost).some(([key, value]) => player.materials[key] < value)) {
      this.notify(`The ${kind === 'target' ? 'target forge' : kind} recipe lacks materials.`, 'warning');
      return false;
    }
    if (kind === 'target' && !player.lootTarget) {
      this.notify('Select an eligible unique in the Loot Codex before target crafting.', 'warning');
      return false;
    }
    Object.entries(cost).forEach(([key, value]) => { player.materials[key] -= value; });
    if (kind === 'rune') {
      const rune = choose(RUNES, this.random);
      player.runes[rune.id] = (player.runes[rune.id] ?? 0) + 1;
      this._gainForgeXp('rune', 7);
      this._recordLevelingProgress('forge', 1, { action: 'craft-rune' });
      this.notify(`${rune.name} forged into the rune satchel.`, 'accent');
      this.save();
      return true;
    }
    const targetUnique = kind === 'target' ? uniqueById(player.lootTarget) : null;
    const sourceId = kind === 'target' ? (targetUnique?.sources?.[0] ?? 'boss-hunt') : 'stronghold';
    const item = kind === 'target'
      ? this._createUniqueItem(targetUnique, { sourceId, itemLevel: Math.max(player.level, 10) })
      : this._generateItem({ sourceId, minRarity: 'relic', rarity: 'relic' });
    const location = this._awardItem(item, kind === 'target' ? 'Target forge' : 'Relic forge');
    this._gainForgeXp('craft', kind === 'target' ? 18 : 10);
    this._recordLevelingProgress('forge', 1, { action: `craft-${kind}`, rarity: item.rarity });
    this.notify(`${item.name} ${location ? 'is forged into your collection.' : 'falls beside the forge.'}`, 'accent');
    this.save();
    return true;
  }

  extractAspect(itemId) {
    const player = this.player;
    const index = player.inventory.findIndex((item) => item.id === itemId);
    if (index < 0) {
      this.notify('Move the unique relic into your pack before extracting its aspect.', 'warning');
      return false;
    }
    const item = player.inventory[index];
    if (!['unique', 'mythic'].includes(item.rarity) || !UNIQUE_IDS.has(item.uniqueId)) {
      this.notify('Only unique relics carry extractable covenant aspects.', 'warning');
      return false;
    }
    if (this.isItemLocked(item.id)) {
      this.notify('Unlock this relic before extracting its aspect.', 'warning');
      return false;
    }
    player.inventory.splice(index, 1);
    delete player.itemLocks[item.id];
    player.aspects[item.uniqueId] = true;
    player.materials = this._normalizeMaterials(player.materials);
    player.materials.echoes += item.rarity === 'mythic' ? 5 : 2;
    this._gainForgeXp('aspect', item.rarity === 'mythic' ? 18 : 10);
    (item.runeIds ?? (item.runeId ? [item.runeId] : [])).forEach((runeId) => { player.runes[runeId] = (player.runes[runeId] ?? 0) + 1; });
    const unique = UNIQUES.find((entry) => entry.id === item.uniqueId);
    this.notify(`${unique?.name ?? item.name} is now available in the Aspect Codex.`, 'accent');
    this.save();
    return true;
  }

  attuneAspect(uniqueId) {
    const player = this.player;
    const unique = uniqueById(uniqueId);
    if (!unique || !player.aspects?.[uniqueId] || !this._isUniqueEligible(unique)) return false;
    player.attunedAspects = Array.isArray(player.attunedAspects) ? player.attunedAspects : player.attunedAspect ? [player.attunedAspect] : [];
    const active = player.attunedAspects.includes(uniqueId);
    if (active) player.attunedAspects = player.attunedAspects.filter((id) => id !== uniqueId);
    else {
      while (player.attunedAspects.length >= this.getAspectSlots()) player.attunedAspects.shift();
      player.attunedAspects.push(uniqueId);
    }
    player.attunedAspect = player.attunedAspects[0] ?? null;
    this._refreshPlayerStats(true);
    this.notify(active ? `${unique.name} unattuned.` : `${unique.name} attuned (${player.attunedAspects.length}/${this.getAspectSlots()}).`, active ? 'quiet' : 'accent');
    this.save();
    return true;
  }

  _findOwnedItem(itemId) {
    const inventoryIndex = this.player.inventory.findIndex((item) => item.id === itemId);
    if (inventoryIndex >= 0) return { item: this.player.inventory[inventoryIndex], location: 'inventory', index: inventoryIndex };
    const stashIndex = this.player.stash.findIndex((item) => item.id === itemId);
    if (stashIndex >= 0) return { item: this.player.stash[stashIndex], location: 'stash', index: stashIndex };
    const slot = Object.keys(this.player.equipment).find((key) => this.player.equipment[key]?.id === itemId);
    return slot ? { item: this.player.equipment[slot], location: 'equipment', slot } : null;
  }

  getSkillNodes() {
    if (!this.player) return [];
    const primary = getClass(this.player.primary);
    const secondary = getClass(this.player.secondary);
    const hybrid = this.getHybrid();
    const hybridNodes = hybrid.board.map((desc, index) => ({
      id: `${hybrid.id}-${index}`,
      name: ['Oath Root', 'Confluence', 'Pact', 'Capstone'][index],
      max: 1,
      level: [4, 8, 12, 16][index],
      tier: index + 1,
      branch: 'Confluence',
      requires: index ? [{ id: `${hybrid.id}-${index - 1}`, rank: 1 }] : [],
      desc,
      className: hybrid.name,
      color: hybrid.color,
      hybrid: true
    }));
    return [
      ...primary.tree.map((node) => ({ ...node, className: primary.shortName, color: primary.color })),
      ...secondary.tree.map((node) => ({ ...node, className: secondary.shortName, color: secondary.color })),
      ...hybridNodes,
      {
        id: `${hybrid.id}-echo`, name: 'Oath Echo', max: 2, level: 10, tier: 3, branch: 'Confluence', requires: [{ id: `${hybrid.id}-1`, rank: 1 }],
        desc: 'Companion Technique damage increases by 12% per rank.', className: hybrid.name, color: hybrid.color, hybrid: true
      },
      {
        id: `${hybrid.id}-resonance`, name: 'Resonant Circuit', max: 1, level: 18, tier: 5, branch: 'Confluence', requires: [{ id: `${hybrid.id}-echo`, rank: 2 }, { id: `${hybrid.id}-3`, rank: 1 }],
        desc: 'Your companion and hybrid abilities gain 6% cooldown recovery.', className: hybrid.name, color: hybrid.color, hybrid: true
      },
      {
        id: `${hybrid.id}-aegis`, name: 'Concord of Aegis', max: 1, level: 22, tier: 5, branch: 'Aegis', requires: [{ id: `${hybrid.id}-3`, rank: 1 }], exclusiveGroup: `${hybrid.id}-capstone`,
        desc: 'Hybrid signatures create a larger ward and all barriers are strengthened.', className: hybrid.name, color: hybrid.color, hybrid: true
      },
      {
        id: `${hybrid.id}-ruin`, name: 'Concord of Ruin', max: 1, level: 22, tier: 5, branch: 'Ruin', requires: [{ id: `${hybrid.id}-3`, rank: 1 }], exclusiveGroup: `${hybrid.id}-capstone`,
        desc: 'Hybrid abilities deal 18% more damage and build toward a destructive endgame path.', className: hybrid.name, color: hybrid.color, hybrid: true
      }
    ];
  }

  getSkillLockReason(node) {
    if (!this.player || !node) return 'No active covenant.';
    if (this.player.level < (node.level ?? 1)) return `Requires level ${node.level}.`;
    const unmet = (node.requires ?? []).find((requirement) => this.getTalentRank(requirement.id) < (requirement.rank ?? 1));
    if (unmet) {
      const prerequisite = this.getSkillNodes().find((candidate) => candidate.id === unmet.id);
      return `Requires ${prerequisite?.name ?? 'a prior node'} ${unmet.rank ?? 1}/${prerequisite?.max ?? 1}.`;
    }
    if (node.exclusiveGroup) {
      const chosen = this.getSkillNodes().find((candidate) => candidate.id !== node.id && candidate.exclusiveGroup === node.exclusiveGroup && this.getTalentRank(candidate.id) > 0);
      if (chosen) return `Locked by ${chosen.name}; refund it to change this capstone.`;
    }
    return null;
  }

  getSkillNodeState(node) {
    const rank = this.getTalentRank(node.id);
    const lockReason = rank >= node.max ? null : this.getSkillLockReason(node);
    const dependent = this.getSkillNodes().find((candidate) => (candidate.requires ?? []).some((requirement) => requirement.id === node.id && this.getTalentRank(candidate.id) > 0 && rank - 1 < (requirement.rank ?? 1)));
    const refundCost = Math.max(8, (node.level ?? 1) * 3) * Math.max(1, rank);
    return {
      rank,
      lockReason,
      canBuy: Boolean(this.player?.skillPoints > 0 && rank < node.max && !lockReason),
      canRefund: rank > 0 && !dependent && this.player.gold >= refundCost,
      refundCost,
      refundReason: dependent ? `Refund ${dependent.name} first.` : rank > 0 && this.player.gold < refundCost ? `Requires ${refundCost} gold.` : null
    };
  }

  upgradeSkill(id) {
    const player = this.player;
    const node = this.getSkillNodes().find((entry) => entry.id === id);
    if (!node) return false;
    const state = this.getSkillNodeState(node);
    if (!state.canBuy) {
      this.notify(state.lockReason ?? (state.rank >= node.max ? `${node.name} is mastered.` : 'No skill points available.'), 'warning');
      return false;
    }
    const rank = state.rank;
    player.skillRanks[id] = rank + 1;
    player.skillPoints -= 1;
    this._refreshPlayerStats(true);
    this.notify(`${node.name} ${rank + 1}/${node.max}`, 'accent');
    this.save();
    return true;
  }

  refundSkill(id) {
    const player = this.player;
    const node = this.getSkillNodes().find((entry) => entry.id === id);
    if (!node) return false;
    const state = this.getSkillNodeState(node);
    if (!state.canRefund) {
      this.notify(state.refundReason ?? `${node.name} cannot be refunded.`, 'warning');
      return false;
    }
    const nextRank = state.rank - 1;
    player.gold -= state.refundCost;
    player.skillPoints += 1;
    if (nextRank) player.skillRanks[id] = nextRank;
    else delete player.skillRanks[id];
    this._refreshPlayerStats(true);
    this.notify(`${node.name} refunded for ${state.refundCost} gold.`, 'quiet');
    this.save();
    return true;
  }

  _die() {
    const player = this.player;
    if (player.deathTime > 0) return;
    const victor = this.entities.enemies.filter((enemy) => !enemy.dead && !enemy.boss && distance(enemy, player) < 230).sort((a, b) => distance(a, player) - distance(b, player))[0];
    const existingNemesis = victor?.templateId ? player.nemeses.find((nemesis) => nemesis.templateId === victor.templateId) : null;
    const source = text(player.lastDamageSource, victor?.attack ?? 'darkness', 48);
    const traitForSource = source.includes('projectile') || source.includes('bolt') || source.includes('volley') ? 'mirrorborn'
      : source.includes('fire') || source.includes('blood') ? 'bloodfed'
        : source.includes('ward') || source.includes('barrier') ? 'bellbound'
          : source.includes('rift') || source.includes('shadow') ? 'nullstep'
            : 'vengeful';
    if (existingNemesis) {
      existingNemesis.victories = Math.min(99, existingNemesis.victories + 1);
      existingNemesis.grudge = Math.min(99, (existingNemesis.grudge ?? 1) + 2);
      existingNemesis.level = Math.min(MAX_LEVEL + 20, Math.max(existingNemesis.level, victor.level) + 1);
      existingNemesis.bounty = Math.min(25, (existingNemesis.bounty ?? 1) + 1);
      existingNemesis.lastVictorSource = source;
      existingNemesis.traits = [...new Set([...(existingNemesis.traits ?? []), traitForSource])].slice(0, 4);
      this.notify(`${existingNemesis.name} wins again — Grudge ${existingNemesis.grudge}, Bounty ${existingNemesis.bounty}.`, 'warning');
    } else if (victor?.templateId) {
      const titles = ['Scarred', 'Graven', 'Hollow-Eyed', 'Bell-Marked'];
      const nemesis = {
        id: uid('nemesis'), name: `${choose(titles, this.random)} ${victor.name}`,
        templateId: victor.templateId, level: victor.level, victories: 1, damageType: victor.attack,
        grudge: 1, scars: [], traits: [traitForSource], lastVictorSource: source, bounty: 1
      };
      player.nemeses.unshift(nemesis);
      player.nemeses = player.nemeses.slice(0, 4);
      this.notify(`${nemesis.name} remembers your fall and may return.`, 'warning');
    }
    if (victor?.templateId) this.createHunterFromEnemy(victor, { source, damageType: source, barrierUsed: player.barrier > 0, corpseBuild: this.player.primary === 'gravebinder', burst: false });
    this._recordReforgedProgress('death', { zoneId: zoneAt(player.x, player.y).id, source });
    if (this.encounter.activeRoomId && player.requiem) {
      player.requiem.deathsByRoom[this.encounter.activeRoomId] = (player.requiem.deathsByRoom[this.encounter.activeRoomId] ?? 0) + 1;
      this.encounter.roomStreak = 0;
    }
    player.hp = 0;
    player.moveCommand = null;
    player.combatTargetId = null;
    player.deathTime = 2.6;
    player.animation = { type: 'death', time: 2.6, duration: 2.6, angle: player.facing };
    this.stats.deaths += 1;
    this._failContractBonuses('noDeath');
    this.notify(`The road takes you. ${player.lastDamageSource ?? 'Darkness'} will remember.`, 'warning');
    this.emit('player-dead', { source: player.lastDamageSource });
    this.camera.flash = 0.35;
  }

  _respawn() {
    const player = this.player;
    const zone = ZONES.find((entry) => entry.safe) ?? ZONES[0];
    this._moveBodyWithGeometry(player, zone.x + zone.width * 0.55, zone.y + zone.height * 0.58);
    player.hp = player.maxHp * 0.68;
    player.resource = player.maxResource;
    player.potions = player.maxPotions;
    player.deathTime = 0;
    player.iframes = 1.5;
    player.moveCommand = null;
    player.combatTargetId = null;
    this.player.gold = Math.max(0, Math.floor(this.player.gold * 0.92));
    this.returnToSanctuary();
    this.emit('respawned');
    this.notify('You awaken at Ashen Sanctuary.', 'quiet');
    this.save();
  }

  _focusCamera(snap) {
    if (!this.player || !this.renderer?.viewport) return;
    const viewport = this.renderer.viewport;
    const worldScale = viewport.scale * (this.camera.zoom ?? 1);
    const viewWidth = viewport.width / worldScale;
    const viewHeight = viewport.height / worldScale;
    const reducedMotion = this.settings?.reducedMotion === true;
    const aim = this.input?.getAimDirection?.();
    const moveSpeed = Math.hypot(this.player.moveX ?? 0, this.player.moveY ?? 0);
    const moveDirection = moveSpeed > 8 ? normalize(this.player.moveX, this.player.moveY) : { x: Math.cos(this.player.facing), y: Math.sin(this.player.facing) };
    const aimDirection = aim?.active === false || !aim ? moveDirection : aim;
    const targetLookX = reducedMotion ? 0 : (moveDirection.x * Math.min(78, moveSpeed * .24) + aimDirection.x * 28);
    const targetLookY = reducedMotion ? 0 : (moveDirection.y * Math.min(54, moveSpeed * .17) + aimDirection.y * 20);
    this.camera.lookAheadX += (targetLookX - (this.camera.lookAheadX ?? 0)) * (snap ? 1 : .08);
    this.camera.lookAheadY += (targetLookY - (this.camera.lookAheadY ?? 0)) * (snap ? 1 : .08);
    const boss = this.getBoss();
    const bossRelevant = boss && boss.engaged && Math.hypot(boss.x - this.player.x, boss.y - this.player.y) < 680;
    const targetBossBlend = bossRelevant && !reducedMotion ? clamp(1 - Math.hypot(boss.x - this.player.x, boss.y - this.player.y) / 760, .18, .68) : 0;
    this.camera.bossBlend += (targetBossBlend - (this.camera.bossBlend ?? 0)) * (snap ? 1 : .055);
    const focusX = bossRelevant ? this.player.x * (1 - this.camera.bossBlend) + ((this.player.x + boss.x) * .5) * this.camera.bossBlend : this.player.x;
    const focusY = bossRelevant ? this.player.y * (1 - this.camera.bossBlend) + ((this.player.y + boss.y) * .5) * this.camera.bossBlend : this.player.y;
    let desiredX = clamp(focusX + this.camera.lookAheadX - viewWidth / 2, 0, Math.max(0, WORLD_SIZE.width - viewWidth));
    let desiredY = clamp(focusY + this.camera.lookAheadY - viewHeight / 2 + (this.camera.offsetY ?? 0), 0, Math.max(0, WORLD_SIZE.height - viewHeight));
    if (snap) { this.camera.x = desiredX; this.camera.y = desiredY; return; }
    const dead = Math.max(0, Number(this.camera.deadZone ?? 34));
    const centerX = this.camera.x + viewWidth / 2;
    const centerY = this.camera.y + viewHeight / 2;
    const trackedFocusX = focusX + (this.camera.lookAheadX ?? 0);
    const trackedFocusY = focusY + (this.camera.lookAheadY ?? 0) + (this.camera.offsetY ?? 0);
    if (Math.abs(trackedFocusX - centerX) < dead) desiredX = this.camera.x;
    if (Math.abs(trackedFocusY - centerY) < dead * .72) desiredY = this.camera.y;
    const follow = clamp(Number(this.camera.follow ?? 0.11), 0.025, 0.35);
    this.camera.x += (desiredX - this.camera.x) * follow;
    this.camera.y += (desiredY - this.camera.y) * follow;
  }

  getBoss() {
    return this.entities.enemies.find((enemy) => enemy.boss && !enemy.dead) ?? null;
  }

  _restoreActiveOperation(operation) {
    const expedition = BLACK_ROAD_BY_ID[operation?.expeditionId];
    if (!expedition) return false;
    this.entities.enemies = [];
    this.entities.projectiles = [];
    this.entities.hazards = [];
    this.entities.effects = [];
    this.entities.particles = [];
    this.entities.corpses = [];
    this.entities.destructibles = [];
    this.groupMemory.clear();
    this.worldEvent = null;
    this.encounter = { activeRoomId: null, activeGroupId: null, state: 'exploration', remaining: 0, total: 0, roomStreak: 0, announcedRoomId: null, clearedAt: 0 };
    const completedStageIds = Array.isArray(operation.completedStageIds) ? operation.completedStageIds.filter((id) => expedition.stages.some((stage) => stage.id === id)) : [];
    this.endgame = {
      id: uid('black-road'), activity: 'black-road', name: expedition.name, expeditionId: expedition.id, zoneId: expedition.zoneId,
      tier: integer(operation.tier, 3, 1, 50),
      modifier: { id: 'sealed-rooms', name: 'Sealed rooms', text: 'Only the active encounter exists and its boundary remains closed until the objective is complete.' },
      modifiers: [{ id: 'sealed-rooms', name: 'Sealed rooms', text: 'Only the active encounter exists and its boundary remains closed until the objective is complete.' }],
      kills: 0, completed: false, elapsed: 0,
      waveIndex: completedStageIds.length,
      wavePlan: expedition.stages.map((stage) => ({ ...stage, formation: [...(stage.formation ?? [])] })),
      expedition: true, blackRoad: true,
      expeditionBoons: Array.isArray(operation.expeditionBoons) ? [...operation.expeditionBoons] : [],
      expeditionBanes: Array.isArray(operation.expeditionBanes) ? [...operation.expeditionBanes] : [],
      rewardHeat: finite(operation.rewardHeat, 0, 0, 99),
      pendingRoute: operation.pendingRoute ? JSON.parse(JSON.stringify(operation.pendingRoute)) : null,
      routeCheckpoints: Array.isArray(operation.routeCheckpoints) ? [...operation.routeCheckpoints] : [],
      activeStage: null, activeStageTotal: 0, stageClearedAt: 0,
      completedStageIds,
      worldModifiers: operation.worldModifiers ? JSON.parse(JSON.stringify(operation.worldModifiers)) : this.getBlackRoadWorldModifiers(expedition.zoneId),
      routeContext: operation.routeContext ? JSON.parse(JSON.stringify(operation.routeContext)) : null,
      bossCovenantVariant: operation.bossCovenantVariant ?? operation.routeContext?.bossVariantAffinity ?? null,
      metamorphosisBoons: Array.isArray(operation.metamorphosisBoons) ? [...operation.metamorphosisBoons] : [],
      metamorphosisRules: operation.metamorphosisRules ? JSON.parse(JSON.stringify(operation.metamorphosisRules)) : {},
      hunterIntruded: operation.hunterIntruded === true,
      hunterId: operation.hunterId ?? null,
      targetRewardId: operation.targetRewardId ?? null
    };
    const stageIndex = Math.min(completedStageIds.length, expedition.stages.length - 1);
    const stage = expedition.stages[stageIndex];
    this.player.x = stage.x - Math.min(135, stage.radius * 0.48);
    this.player.y = stage.y + Math.min(42, stage.radius * 0.16);
    this._moveBodyWithGeometry(this.player, this.player.x, this.player.y);
    if (!this.endgame.pendingRoute && completedStageIds.length < expedition.stages.length) this._spawnEndgameWave();
    return true;
  }

  _serializeActiveOperation() {
    if (!this.endgame?.blackRoad || this.endgame.completed) return null;
    const safe = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
    return {
      blackRoad: true,
      expeditionId: this.endgame.expeditionId,
      zoneId: this.endgame.zoneId,
      tier: this.endgame.tier,
      waveIndex: this.endgame.waveIndex,
      routeContext: safe(this.endgame.routeContext),
      worldModifiers: safe(this.endgame.worldModifiers),
      bossCovenantVariant: this.endgame.bossCovenantVariant ?? null,
      expeditionBoons: [...(this.endgame.expeditionBoons ?? [])],
      expeditionBanes: [...(this.endgame.expeditionBanes ?? [])],
      rewardHeat: this.endgame.rewardHeat ?? 0,
      routeCheckpoints: [...(this.endgame.routeCheckpoints ?? [])],
      pendingRoute: safe(this.endgame.pendingRoute),
      completedStageIds: [...(this.endgame.completedStageIds ?? [])],
      metamorphosisBoons: [...(this.endgame.metamorphosisBoons ?? [])],
      metamorphosisRules: safe(this.endgame.metamorphosisRules ?? {}),
      hunterIntruded: this.endgame.hunterIntruded === true,
      hunterId: this.endgame.hunterId ?? null,
      targetRewardId: this.endgame.targetRewardId ?? null
    };
  }

  snapshot() {
    if (!this.player) return null;
    const player = this.player;
    return {
      version: SAVE_SCHEMA_V19,
      primary: player.primary, secondary: player.secondary,
      player: {
        level: player.level, xp: player.xp, skillPoints: player.skillPoints, gold: player.gold, potions: player.potions,
        skillRanks: player.skillRanks, skillImprints: player.skillImprints, abilityMastery: player.abilityMastery, masteryDoctrines: player.masteryDoctrines, resonance: player.resonance, confluence: player.confluence, lastResonanceFamily: player.lastResonanceFamily,
        inventory: player.inventory, stash: player.stash, itemLocks: player.itemLocks, inventorySort: player.inventorySort, loadouts: player.loadouts, equipment: player.equipment, materials: player.materials,
        runes: player.runes, aspects: player.aspects, attunedAspect: player.attunedAspect, attunedAspects: player.attunedAspects, lootCollection: player.lootCollection, lootPity: player.lootPity, lootTarget: player.lootTarget,
        worldProgress: player.worldProgress, endgameRecords: player.endgameRecords, factions: player.factions, contracts: player.contracts, nemeses: player.nemeses, hunters: player.hunters, covenant: player.covenant, worldV2: player.worldV2, sanctuary: player.sanctuary, mutationProgress: player.mutationProgress, campaign: player.campaign, leveling: player.leveling, reforged: player.reforged, requiem: player.requiem,
        x: player.x, y: player.y, hp: player.hp, resource: player.resource
      },
      stats: this.stats,
      activeOperation: this._serializeActiveOperation(),
      savedAt: Date.now()
    };
  }

  save() {
    const snapshot = this.snapshot();
    if (!snapshot) return false;
    const saved = saveRun(snapshot);
    if (!saved && !this.saveWarningShown) {
      this.saveWarningShown = true;
      this.notify('Windows could not write this covenant locally. Keep this session open while you free storage.', 'warning');
    }
    if (saved) this.saveWarningShown = false;
    return saved;
  }
}
