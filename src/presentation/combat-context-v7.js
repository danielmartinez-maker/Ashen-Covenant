import { clamp } from '../core/math.js';
import { zoneAt } from '../data/world.js';
import { getHybrid } from '../data/classes.js';
import { resolveCovenantPresentationIdentity } from './covenant-identity.js';

const FACING_STEP = Math.PI / 4;
const freezeRecord = (value) => Object.freeze({ ...(value ?? {}) });
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const laneFor = (angle = 0) => ((Math.round(finite(angle) / FACING_STEP) % 8) + 8) % 8;

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
  critical: false, settings: freezeRecord({ reducedMotion: false, reducedFlashing: false, reducedVfx: false }),
  eventType: null
});

export class PresentationCombatContextResolver {
  resolve(game, detail = {}, { actor = game?.player, eventType = null, target = null } = {}) {
    try {
      if (!game || !actor) return neutralPresentationCombatContext();
      const player = game.player;
      const action = actor === player ? player?.presentation?.action : null;
      const profile = action?.profile ?? {};
      const duration = Math.max(0.0001, finite(profile.duration, finite(actor?.animation?.duration, 1)));
      const elapsed = finite(action?.elapsed, duration - finite(actor?.animation?.time, duration));
      const covenant = game.getCovenantOverview?.() ?? {};
      const covenantIdentity = resolveCovenantPresentationIdentity(covenant, { abilityId: detail.abilityId, mutationId: detail.mutationId });
      const equipment = Object.values(player?.equipment ?? {}).filter(Boolean);
      const visibleEquipment = equipment.map((item) => Object.freeze({
        id: item.id ?? null,
        slot: item.slot,
        baseId: item.baseId ?? null,
        uniqueId: item.uniqueId ?? null,
        visualSignatureId: item.visualSignatureId ?? item.uniqueId ?? null,
        rarity: item.rarity ?? 'common',
        masterworkRank: finite(item.masterworkRank ?? item.masterwork, 0),
        corruption: finite(item.corruption ?? item.corruptionRank, 0)
      }));
      const hit = detail.hitResult ?? detail.result ?? {};
      const zone = zoneAt(actor.x ?? player?.x ?? 0, actor.y ?? player?.y ?? 0);
      const hybrid = player ? getHybrid(player.primary, player.secondary) : null;
      const context = {
        actorId: actor.id ?? null,
        actorKind: actor === player ? 'player' : actor.boss ? 'boss' : actor.hunterId ? 'hunter' : 'enemy',
        enemyRole: actor.role ?? null, bossId: actor.boss ? actor.templateId ?? actor.id : null, hunterId: actor.hunterId ?? null,
        primaryClass: player?.primary ?? null, secondaryClass: player?.secondary ?? null, hybridId: hybrid?.id ?? null,
        actionId: detail.action ?? profile.action ?? actor.animation?.type ?? 'idle', profileId: detail.profileId ?? profile.id ?? actor.animation?.profileId ?? null,
        comboIndex: Math.max(0, Math.floor(finite(detail.comboIndex, profile.comboIndex ?? 0))), phase: detail.phase ?? action?.phase ?? 'idle',
        actionProgress: clamp(finite(detail.actionProgress, elapsed / duration), 0, 1), eventId: detail.eventId ?? null,
        facingLane: laneFor(actor.presentation?.visualFacing ?? actor.presentation?.locomotion?.visualFacing ?? actor.facing ?? 0), movementState: actor.presentation?.locomotion?.state ?? actor.state ?? 'idle',
        movementIntensity: clamp(finite(actor.presentation?.locomotion?.speedRatio, Math.hypot(actor.moveX ?? 0, actor.moveY ?? 0) / 250), 0, 1.5),
        elevation: Math.max(0, finite(actor.elevation, 0)), grounded: actor.grounded !== false, surface: actor.surface ?? 'stone', region: zone.id,
        weaponFamily: player?.presentation?.profile?.weapon ?? null, offhandFamily: player?.equipment?.offhand?.baseId ?? null,
        visibleEquipment: Object.freeze(visibleEquipment), rarity: detail.rarity ?? 'common', corruptionLevel: finite(detail.corruptionLevel, 0), masterworkRank: finite(detail.masterworkRank, 0),
        visualSignatureIds: Object.freeze(equipment.map((item) => item.visualSignatureId ?? item.uniqueId).filter(Boolean)),
        covenantPrimary: covenant.primary ?? 'unbound', covenantSecondary: covenant.secondary ?? null, covenantStage: finite(covenant.stage, 0),
        covenantInstability: finite(covenant.instability, 0), covenantRupture: Boolean(covenant.ruptureActive), covenantIdentity,
        hitWeight: detail.hitWeight ?? hit.weight ?? (detail.critical ? 'heavy' : 'light'), damageFamily: detail.damageFamily ?? detail.damageType ?? 'physical',
        contactMaterial: detail.contactMaterial ?? detail.material ?? target?.material ?? 'flesh', guarded: Boolean(hit.guarded ?? detail.guarded),
        guardBroken: Boolean(hit.guardBroken ?? detail.guardBroken), poiseBroken: Boolean(hit.poiseBroken ?? detail.poiseBroken), staggered: Boolean(hit.staggered ?? detail.staggered),
        knockdown: Boolean(hit.knockdown ?? detail.knockdown), execution: Boolean(detail.execution || detail.source === 'execution'), critical: Boolean(detail.critical),
        settings: freezeRecord({ reducedMotion: game.settings?.reducedMotion === true, reducedFlashing: game.settings?.reducedFlashing === true, reducedVfx: game.settings?.reducedVfx === true }),
        eventType
      };
      return Object.freeze(context);
    } catch (error) {
      game?.presentation?.eventBus?.emit?.('presentation:error', { subsystem: 'combat-context-v7', message: error?.message ?? String(error) }, { time: game?.clock ?? 0, source: 'combat-context-v7', priority: 100 });
      return neutralPresentationCombatContext();
    }
  }
}
