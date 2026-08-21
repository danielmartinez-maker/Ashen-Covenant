const clone = (value) => JSON.parse(JSON.stringify(value));
const bounded = (value, min = 0, max = 1) => Math.max(min, Math.min(max, Number(value) || 0));

export const METAMORPHOSIS_BOONS = Object.freeze([
  { id: 'meta-flame-pyre', affinity: 'flame', name: 'Pyre Metamorphosis', heat: 2, description: 'Executions ignite the room and consume nearby corpses.', rules: { executionIgnition: true, corpseBurn: true, executeThresholdBonus: 0.04 } },
  { id: 'meta-grave-echo', affinity: 'grave', name: 'Grave Echo', heat: 2, description: 'The first corpse from each formation returns as an allied echo.', rules: { corpseEcho: true, corpseInteraction: true, echoLimit: 1 } },
  { id: 'meta-blood-tithe', affinity: 'blood', name: 'Blood Tithe', heat: 2, description: 'Wounded kills bank blood that can pay ability costs.', rules: { bloodBank: true, woundedThreshold: 0.35, resourceFromKill: 5 } },
  { id: 'meta-light-aegis', affinity: 'light', name: 'Aegis Metamorphosis', heat: 1, description: 'Perfect guard stores retaliation and rebuilds a small ward.', rules: { retaliationStorage: true, guardWard: true, wardRatio: 0.06 } },
  { id: 'meta-storm-skip', affinity: 'storm', name: 'Storm Skip', heat: 2, description: 'Dodges leave an arc lane and shorten the next recovery.', rules: { dodgeArc: true, recoveryFold: 0.18, movementEcho: true } },
  { id: 'meta-void-fold', affinity: 'void', name: 'Void Fold', heat: 3, description: 'Marked enemies collapse toward the last execution point.', rules: { spatialFold: true, markedPull: true, pullRadius: 180 } }
]);

export const ECLIPSE_CONTROLS = Object.freeze({
  'first-shadow': { rewardHeat: 1 },
  'war-road': { enemyDensity: 0.08, rewardHeat: 1 },
  'hidden-road': { extraRouteChoices: 1 },
  'red-moon': { factionPressure: 'blood', hazardBias: 'blood-moon' },
  'iron-eclipse': { openingWard: 0.08, eliteGuard: 0.08 },
  'mirror-eclipse': { mirroredHazards: true },
  'silent-eclipse': { bossPunishWindow: 0.18, bossTelegraphScale: 1.12 },
  'hunter-crown': { hunterIntrusion: 0.45, targetFarm: true },
  'choir-crown': { extraMetamorphosisChoices: 1 },
  worldscar: { extraModifier: 1, enemyDensity: 0.12, rewardHeat: 2 },
  'last-sanctuary': { openingWard: 0.16 },
  'final-bell': { mythicPityFloor: 0.12, rewardHeat: 2, bossAffinity: 'void' }
});

export function resolveEclipseControls(allocated = {}) {
  const out = {
    rewardHeat: 0, enemyDensity: 0, extraRouteChoices: 0, extraMetamorphosisChoices: 0,
    hunterIntrusion: 0, targetFarm: false, extraModifier: 0, openingWard: 0,
    factionPressure: null, hazardBias: null, bossAffinity: null, mythicPityFloor: 0,
    eliteGuard: 0, mirroredHazards: false, bossPunishWindow: 0, bossTelegraphScale: 1
  };
  for (const [id, enabled] of Object.entries(allocated ?? {})) {
    if (!enabled) continue;
    const control = ECLIPSE_CONTROLS[id];
    if (!control) continue;
    for (const [key, value] of Object.entries(control)) {
      if (typeof value === 'number') {
        if (key === 'bossTelegraphScale') out[key] = Math.max(out[key], value);
        else if (key === 'openingWard' || key === 'mythicPityFloor' || key === 'bossPunishWindow' || key === 'eliteGuard') out[key] = Math.max(out[key], value);
        else out[key] += value;
      } else if (typeof value === 'boolean') out[key] = out[key] || value;
      else if (value != null) out[key] = value;
    }
  }
  return out;
}

export class EndgameContextSystem {
  buildBlackRoadContext({ covenant = {}, worldModifiers = {}, eclipseAllocated = {}, zoneId = null, expeditionId = null } = {}) {
    const primary = covenant?.primary ?? null;
    const controls = resolveEclipseControls(eclipseAllocated);
    const rewardBias = [...new Set([...(covenant?.rewardTags ?? []), ...(worldModifiers?.lootBias ?? []), primary].filter(Boolean))];
    const hunterChance = bounded((worldModifiers?.hunterPressure ?? 0) + controls.hunterIntrusion, 0, 0.95);
    const affinity = controls.bossAffinity ?? primary ?? null;
    const choices = METAMORPHOSIS_BOONS.filter((boon) => !primary || boon.affinity === primary || boon.affinity === controls.factionPressure);
    const fallback = choices.length ? choices : METAMORPHOSIS_BOONS;
    const choiceCount = Math.min(fallback.length, 1 + Math.max(0, controls.extraMetamorphosisChoices));
    return {
      version: 1,
      expeditionId,
      zoneId,
      covenantAffix: primary,
      covenantStage: Math.max(0, Number(covenant?.stage) || 0),
      worldModifiers: clone(worldModifiers ?? {}),
      eclipseControls: clone(controls),
      hunterChance,
      bossVariantAffinity: affinity,
      rewardBias,
      metamorphosisChoiceIds: fallback.slice(0, choiceCount).map((entry) => entry.id)
    };
  }
  getMetamorphosisChoice(id) { return METAMORPHOSIS_BOONS.find((entry) => entry.id === id) ?? null; }
}
