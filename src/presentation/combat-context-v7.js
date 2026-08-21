const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, Number.isFinite(Number(value)) ? Number(value) : min));
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const freezeRecord = (value = {}) => Object.freeze({ ...value });
const freezeArray = (value = []) => Object.freeze(value.map((entry) => entry && typeof entry === 'object' ? Object.freeze({ ...entry }) : entry));
const laneFor = (angle = 0) => ((Math.round(finite(angle, 0) / (Math.PI / 4)) % 8) + 8) % 8;

export const neutralPresentationCombatContext = () => Object.freeze({
  actorId: null,
  actorKind: 'unknown',
  enemyRole: null,
  bossId: null,
  hunterId: null,
  primaryClass: null,
  secondaryClass: null,
  hybridId: null,
  actionId: 'idle',
  profileId: null,
  comboIndex: 0,
  phase: 'idle',
  actionProgress: 0,
  eventId: null,
  facingLane: 0,
  movementState: 'idle',
  movementIntensity: 0,
  elevation: 0,
  grounded: true,
  surface: 'stone',
  region: 'sanctuary',
  weaponFamily: null,
  offhandFamily: null,
  visibleEquipment: Object.freeze([]),
  rarity: 'common',
  corruptionLevel: 0,
  masterworkRank: 0,
  visualSignatureIds: Object.freeze([]),
  covenantPrimary: 'unbound',
  covenantSecondary: null,
  covenantStage: 0,
  covenantInstability: 0,
  covenantRupture: false,
  covenantIdentity: Object.freeze({ affinity: 'unbound', stage: 0 }),
  hitWeight: 'light',
  damageFamily: 'physical',
  contactMaterial: 'flesh',
  guarded: false,
  guardBroken: false,
  poiseBroken: false,
  staggered: false,
  knockdown: false,
  execution: false,
  critical: false,
  settings: Object.freeze({ reducedMotion: false, reducedFlashing: false, reducedVfx: false }),
  eventType: null
});

const actorKindFor = (actor, player) => {
  if (!actor) return 'unknown';
  if (actor === player || actor.id && player?.id && actor.id === player.id) return 'player';
  if (actor.boss) return 'boss';
  if (actor.hunterId) return 'hunter';
  return 'enemy';
};

const equipmentSnapshot = (equipment = {}) => Object.entries(equipment)
  .filter(([, item]) => Boolean(item))
  .map(([slot, item]) => Object.freeze({
    id: item.id ?? null,
    slot: item.slot ?? slot,
    baseId: item.baseId ?? null,
    uniqueId: item.uniqueId ?? null,
    visualSignatureId: item.visualSignatureId ?? item.uniqueId ?? null,
    rarity: item.rarity ?? 'common',
    masterworkRank: finite(item.masterworkRank ?? item.masterwork, 0),
    corruption: finite(item.corruption ?? item.corruptionRank, 0)
  }));

export class PresentationCombatContextResolver {
  resolve(game, detail = {}) {
    try {
      const player = game?.player ?? null;
      const actor = detail.actor ?? player;
      const target = detail.target ?? null;
      const action = actor?.presentation?.action ?? player?.presentation?.action ?? null;
      const profile = action?.profile ?? {};
      const elapsed = finite(action?.elapsed, 0);
      const duration = Math.max(0.0001, finite(profile.duration, 1));
      const equipment = equipmentSnapshot(player?.equipment ?? {});
      const covenant = game?.getCovenantOverview?.() ?? {};
      const hybrid = game?.getHybrid?.() ?? null;
      const covenantIdentity = player?.covenantPresentation ?? Object.freeze({ affinity: covenant.primary ?? 'unbound', stage: finite(covenant.stage, 0) });
      const hit = detail.hitResult ?? detail.result ?? {};
      const movement = actor?.presentation?.locomotion ?? player?.presentation?.locomotion ?? {};
      const context = {
        actorId: actor?.id ?? null,
        actorKind: actorKindFor(actor, player),
        enemyRole: actor?.role ?? null,
        bossId: actor?.boss ? actor.templateId ?? actor.id ?? null : null,
        hunterId: actor?.hunterId ?? null,
        primaryClass: player?.primary ?? null,
        secondaryClass: player?.secondary ?? null,
        hybridId: hybrid?.id ?? null,
        actionId: detail.action ?? profile.action ?? actor?.animation?.type ?? 'idle',
        profileId: detail.profileId ?? profile.id ?? actor?.animation?.profileId ?? null,
        comboIndex: Math.max(0, Math.floor(finite(detail.comboIndex, profile.comboIndex ?? 0))),
        phase: detail.phase ?? action?.phase ?? 'idle',
        actionProgress: clamp(detail.actionProgress ?? elapsed / duration, 0, 1),
        eventId: detail.eventId ?? null,
        facingLane: laneFor(movement.visualFacing ?? actor?.facing ?? 0),
        movementState: movement.state ?? actor?.state ?? 'idle',
        movementIntensity: clamp(movement.speedRatio ?? Math.hypot(actor?.moveX ?? 0, actor?.moveY ?? 0) / 250, 0, 1.5),
        elevation: Math.max(0, finite(actor?.elevation, 0)),
        grounded: actor?.grounded !== false,
        surface: detail.surface ?? actor?.surface ?? 'stone',
        region: detail.regionId ?? game?.lastZoneId ?? 'sanctuary',
        weaponFamily: player?.presentation?.profile?.weapon ?? player?.equipment?.weapon?.baseId ?? null,
        offhandFamily: player?.equipment?.offhand?.baseId ?? null,
        visibleEquipment: freezeArray(equipment),
        rarity: detail.rarity ?? 'common',
        corruptionLevel: finite(detail.corruptionLevel, 0),
        masterworkRank: finite(detail.masterworkRank, 0),
        visualSignatureIds: Object.freeze(equipment.map((item) => item.visualSignatureId).filter(Boolean)),
        covenantPrimary: covenant.primary ?? 'unbound',
        covenantSecondary: covenant.secondary ?? null,
        covenantStage: finite(covenant.stage, 0),
        covenantInstability: finite(covenant.instability, 0),
        covenantRupture: Boolean(covenant.ruptureActive),
        covenantIdentity,
        hitWeight: detail.hitWeight ?? hit.weight ?? (detail.critical ? 'heavy' : 'light'),
        damageFamily: detail.damageFamily ?? detail.damageType ?? 'physical',
        contactMaterial: detail.contactMaterial ?? detail.material ?? target?.material ?? 'flesh',
        guarded: Boolean(hit.guarded ?? detail.guarded),
        guardBroken: Boolean(hit.guardBroken ?? detail.guardBroken),
        poiseBroken: Boolean(hit.poiseBroken ?? detail.poiseBroken),
        staggered: Boolean(hit.staggered ?? detail.staggered),
        knockdown: Boolean(hit.knockdown ?? detail.knockdown),
        execution: Boolean(detail.execution || detail.source === 'execution'),
        critical: Boolean(detail.critical),
        settings: freezeRecord({
          reducedMotion: game?.settings?.reducedMotion === true,
          reducedFlashing: game?.settings?.reducedFlashing === true,
          reducedVfx: game?.settings?.reducedVfx === true
        }),
        eventType: detail.eventType ?? null
      };
      return Object.freeze(context);
    } catch (error) {
      game?.presentation?.eventBus?.emit?.('presentation:error', {
        subsystem: 'combat-context-v7', message: error?.message ?? String(error)
      }, { time: game?.clock ?? 0, source: 'combat-context-v7', priority: 100 });
      return neutralPresentationCombatContext();
    }
  }
}
