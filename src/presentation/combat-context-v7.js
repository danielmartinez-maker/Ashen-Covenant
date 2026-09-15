import { clamp } from '../core/math.js';
import { zoneAt } from '../data/world.js';
import { getHybrid } from '../data/classes.js';
import { resolveCovenantPresentationIdentity } from './covenant-identity.js';

const FACING_STEP = Math.PI / 4;
const COVENANT_AFFINITIES = Object.freeze(['flame', 'grave', 'blood', 'light', 'storm', 'void']);
const EQUIPMENT_SLOTS = Object.freeze(['weapon', 'offhand', 'head', 'chest', 'gloves', 'pants', 'boots', 'amulet', 'ring']);
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const corruptionLevelFor = (item = {}) => {
  if (Number.isFinite(Number(item.corruptionRank))) return Math.max(0, Number(item.corruptionRank));
  if (Number.isFinite(Number(item.corruption))) return Math.max(0, Number(item.corruption));
  return typeof item.corruption === 'string' && item.corruption.trim() ? 1 : 0;
};
const laneFor = (angle = 0) => ((Math.round(finite(angle) / FACING_STEP) % 8) + 8) % 8;
const signatureIdFor = (item) => item?.visualSignatureId ?? (item?.uniqueId ? `unique:${item.uniqueId}` : null);
const nonPlayerCovenantFor = (actor, detail) => {
  if (isRecord(detail?.covenant)) return detail.covenant;
  if (isRecord(detail?.covenantContext)) return detail.covenantContext;
  if (isRecord(actor?.covenantPresentation)) {
    return {
      primary: actor.covenantPresentation.affinity ?? actor.covenantPresentation.primary ?? 'unbound',
      secondary: actor.covenantPresentation.secondary ?? null,
      stage: finite(actor.covenantPresentation.stage, 0),
      instability: finite(actor.covenantPresentation.instability, 0),
      ruptureActive: actor.covenantPresentation.ruptureActive === true,
      effects: actor.covenantPresentation.effects
    };
  }
  const bossAffinity = actor?.bossRuntime?.affinity;
  return bossAffinity && bossAffinity !== 'base' ? { primary: bossAffinity, stage: 0 } : {};
};
const covenantSnapshot = (state) => {
  const affinities = isRecord(state?.affinities) ? state.affinities : {};
  return Object.freeze({
    stage: finite(state?.stage, 0),
    instability: finite(state?.instability, 0),
    affinities: Object.freeze(COVENANT_AFFINITIES.map((id) => finite(affinities[id], 0)))
  });
};
const covenantSnapshotMatches = (state, snapshot) => {
  if (!snapshot) return false;
  if (snapshot.stage !== finite(state?.stage, 0) || snapshot.instability !== finite(state?.instability, 0)) return false;
  const affinities = isRecord(state?.affinities) ? state.affinities : {};
  for (let index = 0; index < COVENANT_AFFINITIES.length; index += 1) {
    if (snapshot.affinities[index] !== finite(affinities[COVENANT_AFFINITIES[index]], 0)) return false;
  }
  return true;
};
const SETTINGS_PRESETS = Object.freeze(Array.from({ length: 8 }, (_, bits) => Object.freeze({
  reducedMotion: Boolean(bits & 4),
  reducedFlashing: Boolean(bits & 2),
  reducedVfx: Boolean(bits & 1)
})));
const settingsContextFor = (settings = {}) => SETTINGS_PRESETS[
  (settings.reducedMotion === true ? 4 : 0)
  | (settings.reducedFlashing === true ? 2 : 0)
  | (settings.reducedVfx === true ? 1 : 0)
];
const snapshotItem = (item) => item ? Object.freeze({
  ref: item,
  id: item.id ?? null,
  slot: item.slot ?? null,
  baseId: item.baseId ?? null,
  uniqueId: item.uniqueId ?? null,
  visualSignatureId: item.visualSignatureId ?? null,
  rarity: item.rarity ?? 'common',
  masterworkRank: finite(item.masterworkRank ?? item.masterwork, 0),
  corruption: corruptionLevelFor(item)
}) : null;
const snapshotMatches = (item, snapshot) => {
  if (!item || !snapshot) return item === snapshot;
  return snapshot.ref === item
    && snapshot.id === (item.id ?? null)
    && snapshot.slot === (item.slot ?? null)
    && snapshot.baseId === (item.baseId ?? null)
    && snapshot.uniqueId === (item.uniqueId ?? null)
    && snapshot.visualSignatureId === (item.visualSignatureId ?? null)
    && snapshot.rarity === (item.rarity ?? 'common')
    && snapshot.masterworkRank === finite(item.masterworkRank ?? item.masterwork, 0)
    && snapshot.corruption === corruptionLevelFor(item);
};
const equipmentEmpty = (equipmentRecord) => {
  for (const slot of EQUIPMENT_SLOTS) if (equipmentRecord[slot]) return false;
  return true;
};

export const neutralPresentationCombatContext = () => Object.freeze({
  actorId: null, actorKind: 'unknown', enemyRole: null, bossId: null, hunterId: null,
  primaryClass: null, secondaryClass: null, hybridId: null,
  actionId: 'idle', profileId: null, comboIndex: 0, phase: 'idle', actionProgress: 0, eventId: null,
  facingLane: 0, movementState: 'idle', movementIntensity: 0, elevation: 0, grounded: true,
  surface: 'stone', region: 'sanctuary', weaponFamily: null, offhandFamily: null,
  visibleEquipment: Object.freeze([]), rarity: 'common', corruptionLevel: 0, masterworkRank: 0,
  visualSignatureIds: Object.freeze([]), covenantPrimary: 'unbound', covenantSecondary: null,
  covenantStage: 0, covenantInstability: 0, covenantRupture: false,
  covenantIdentity: resolveCovenantPresentationIdentity({}, {}),
  hitWeight: 'light', damageFamily: 'physical', contactMaterial: 'flesh', guarded: false,
  guardBroken: false, poiseBroken: false, staggered: false, knockdown: false, execution: false,
  critical: false, settings: SETTINGS_PRESETS[0], eventType: null
});

export class PresentationCombatContextResolver {
  constructor() {
    this.playerCovenantCache = { state: null, snapshot: null, overview: null };
    this.equipmentCache = { record: null, snapshots: null, summary: null, empty: false };
    this.zoneCache = { actor: null, x: NaN, y: NaN, zone: null };
    this.hybridCache = new Map();
  }
  _playerCovenant(game, player) {
    const state = player?.covenant ?? null;
    if (this.playerCovenantCache.state === state && this.playerCovenantCache.overview && covenantSnapshotMatches(state, this.playerCovenantCache.snapshot)) {
      return this.playerCovenantCache.overview;
    }
    const overview = game.getCovenantOverview?.() ?? {};
    this.playerCovenantCache = { state, snapshot: covenantSnapshot(state), overview };
    return overview;
  }
  _equipmentSummary(equipmentRecord) {
    const cached = this.equipmentCache;
    if (cached.record === equipmentRecord && cached.summary) {
      if (cached.empty && equipmentEmpty(equipmentRecord)) return cached.summary;
      if (cached.snapshots) {
        let unchanged = true;
        for (const slot of EQUIPMENT_SLOTS) {
          if (!snapshotMatches(equipmentRecord[slot] ?? null, cached.snapshots[slot] ?? null)) { unchanged = false; break; }
        }
        if (unchanged) return cached.summary;
      }
    }

    const snapshots = {};
    const visibleEquipment = [];
    const visualSignatureIds = [];
    let masterworkRank = 0;
    let corruptionLevel = 0;
    for (const slot of EQUIPMENT_SLOTS) {
      const item = equipmentRecord[slot];
      if (!isRecord(item)) { snapshots[slot] = null; continue; }
      const snapshot = snapshotItem(item);
      snapshots[slot] = snapshot;
      const visualSignatureId = signatureIdFor(item);
      const visible = Object.freeze({
        id: snapshot.id,
        slot: snapshot.slot,
        baseId: snapshot.baseId,
        uniqueId: snapshot.uniqueId,
        visualSignatureId,
        rarity: snapshot.rarity,
        masterworkRank: snapshot.masterworkRank,
        corruption: snapshot.corruption
      });
      visibleEquipment.push(visible);
      if (visualSignatureId) visualSignatureIds.push(visualSignatureId);
      masterworkRank = Math.max(masterworkRank, visible.masterworkRank);
      corruptionLevel = Math.max(corruptionLevel, visible.corruption);
    }
    const summary = Object.freeze({
      visibleEquipment: Object.freeze(visibleEquipment),
      visualSignatureIds: Object.freeze(visualSignatureIds),
      masterworkRank,
      corruptionLevel,
      offhandFamily: equipmentRecord.offhand?.baseId ?? null
    });
    this.equipmentCache = { record: equipmentRecord, snapshots, summary, empty: visibleEquipment.length === 0 };
    return summary;
  }
  _zone(actor, player) {
    const x = actor.x ?? player?.x ?? 0;
    const y = actor.y ?? player?.y ?? 0;
    const cached = this.zoneCache;
    if (cached.actor === actor && cached.x === x && cached.y === y && cached.zone) return cached.zone;
    const zone = zoneAt(x, y);
    this.zoneCache = { actor, x, y, zone };
    return zone;
  }
  _hybrid(primaryClass, secondaryClass) {
    if (!primaryClass || !secondaryClass) return null;
    const key = `${primaryClass}:${secondaryClass}`;
    if (!this.hybridCache.has(key)) this.hybridCache.set(key, getHybrid(primaryClass, secondaryClass));
    return this.hybridCache.get(key) ?? null;
  }
  resolve(game, detail = {}, { actor = game?.player, eventType = null, target = null } = {}) {
    try {
      if (!game || !actor) return neutralPresentationCombatContext();
      const player = game.player;
      const playerActor = actor === player;
      const action = actor.presentation?.action ?? null;
      const profile = action?.profile ?? {};
      const duration = Math.max(0.0001, finite(profile.duration, finite(actor?.animation?.duration, 1)));
      const elapsed = finite(action?.elapsed, duration - finite(actor?.animation?.time, duration));
      const covenant = playerActor ? this._playerCovenant(game, player) : nonPlayerCovenantFor(actor, detail);
      const covenantIdentity = playerActor && !detail.abilityId && !detail.mutationId && actor.covenantPresentation
        ? actor.covenantPresentation
        : resolveCovenantPresentationIdentity(covenant, { abilityId: detail.abilityId, mutationId: detail.mutationId });
      const equipmentRecord = isRecord(actor.equipment) ? actor.equipment : {};
      const equipment = this._equipmentSummary(equipmentRecord);
      const hit = detail.hitResult ?? detail.result ?? {};
      const zone = this._zone(actor, player);
      const primaryClass = typeof actor.primary === 'string' ? actor.primary : null;
      const secondaryClass = typeof actor.secondary === 'string' ? actor.secondary : null;
      const hybrid = this._hybrid(primaryClass, secondaryClass);
      const context = {
        actorId: actor.id ?? null,
        actorKind: playerActor ? 'player' : actor.boss ? 'boss' : actor.hunterId ? 'hunter' : 'enemy',
        enemyRole: actor.role ?? null, bossId: actor.boss ? actor.templateId ?? actor.id : null, hunterId: actor.hunterId ?? null,
        primaryClass, secondaryClass, hybridId: hybrid?.id ?? null,
        actionId: detail.action ?? profile.action ?? actor.animation?.type ?? 'idle', profileId: detail.profileId ?? profile.id ?? actor.animation?.profileId ?? null,
        comboIndex: Math.max(0, Math.floor(finite(detail.comboIndex, profile.comboIndex ?? 0))), phase: detail.phase ?? action?.phase ?? 'idle',
        actionProgress: clamp(finite(detail.actionProgress, elapsed / duration), 0, 1), eventId: detail.eventId ?? null,
        facingLane: laneFor(actor.presentation?.visualFacing ?? actor.presentation?.locomotion?.visualFacing ?? actor.facing ?? 0), movementState: actor.presentation?.locomotion?.state ?? actor.state ?? 'idle',
        movementIntensity: clamp(finite(actor.presentation?.locomotion?.speedRatio, Math.hypot(actor.moveX ?? 0, actor.moveY ?? 0) / 250), 0, 1.5),
        elevation: Math.max(0, finite(actor.elevation, 0)), grounded: actor.grounded !== false, surface: actor.surface ?? 'stone', region: zone.id,
        weaponFamily: actor.presentation?.profile?.weapon ?? null, offhandFamily: equipment.offhandFamily,
        visibleEquipment: equipment.visibleEquipment, rarity: detail.rarity ?? 'common',
        corruptionLevel: Math.max(equipment.corruptionLevel, finite(detail.corruptionLevel, 0)),
        masterworkRank: Math.max(equipment.masterworkRank, finite(detail.masterworkRank, 0)),
        visualSignatureIds: equipment.visualSignatureIds,
        covenantPrimary: covenant.primary ?? 'unbound', covenantSecondary: covenant.secondary ?? null, covenantStage: finite(covenant.stage, 0),
        covenantInstability: finite(covenant.instability, 0), covenantRupture: Boolean(covenant.ruptureActive), covenantIdentity,
        hitWeight: detail.hitWeight ?? hit.weight ?? (detail.critical ? 'heavy' : 'light'), damageFamily: detail.damageFamily ?? detail.damageType ?? 'physical',
        contactMaterial: detail.contactMaterial ?? detail.material ?? target?.material ?? 'flesh', guarded: Boolean(hit.guarded ?? detail.guarded),
        guardBroken: Boolean(hit.guardBroken ?? detail.guardBroken), poiseBroken: Boolean(hit.poiseBroken ?? detail.poiseBroken), staggered: Boolean(hit.staggered ?? detail.staggered),
        knockdown: Boolean(hit.knockdown ?? detail.knockdown), execution: Boolean(detail.execution || detail.source === 'execution'), critical: Boolean(detail.critical),
        settings: settingsContextFor(game.settings), eventType
      };
      return Object.freeze(context);
    } catch (error) {
      game?.presentation?.eventBus?.emit?.('presentation:error', { subsystem: 'combat-context-v7', message: error?.message ?? String(error) }, { time: game?.clock ?? 0, source: 'combat-context-v7', priority: 100 });
      return neutralPresentationCombatContext();
    }
  }
}
