import { abilityIdFor, mutationById } from '../data/ability-mutations.js';
import { CovenantSystem } from './covenant.js';

const mergeRules = (descriptor, rules = {}) => {
  for (const [key, value] of Object.entries(rules ?? {})) {
    if (key === 'damageMultiplier' || key === 'cooldownMultiplier') continue;
    descriptor[key] = value;
  }
  if (Number.isFinite(rules.damageMultiplier)) descriptor.damageMultiplier *= rules.damageMultiplier;
  if (Number.isFinite(rules.cooldownMultiplier)) descriptor.cooldownMultiplier *= rules.cooldownMultiplier;
  return descriptor;
};

export class AbilitySystem {
  constructor() { this.covenants = new CovenantSystem(); }
  resolve({ classId, slot, base = {}, selectedMutationId = null, covenant = null, equipmentHooks = [], lateModifiers = {} }) {
    const id = abilityIdFor(classId, slot);
    const descriptor = {
      id, classId, slot, name: base.name ?? id, cooldown: Number(base.cooldown) || 0, cost: Number(base.cost) || 0,
      resourceGain: Number(base.resource) || 0, damageMultiplier: 1, cooldownMultiplier: 1,
      damageType: 'physical', shape: slot === 'attack' ? 'arc' : slot === 'skillTwo' ? 'field' : slot === 'dodge' ? 'dash' : slot === 'ultimate' ? 'arena' : 'projectile',
      projectileCount: slot === 'skillOne' ? 1 : 0, tags: [classId, slot], mutationId: null, equipmentHooks: []
    };
    const mutation = selectedMutationId ? mutationById(id, selectedMutationId) : null;
    if (mutation) { mergeRules(descriptor, mutation.rules); descriptor.mutationId = mutation.id; }
    const resolvedCovenant = covenant ? this.covenants.resolve(covenant) : null;
    if (resolvedCovenant?.primary) {
      descriptor.damageType = resolvedCovenant.primary;
      descriptor.covenant = resolvedCovenant.primary;
      descriptor.covenantStage = resolvedCovenant.stage;
      descriptor.tags.push(`covenant:${resolvedCovenant.primary}`);
      if (resolvedCovenant.primary === 'grave') descriptor.corpseInteraction = 'grave-mark';
      if (resolvedCovenant.primary === 'storm' && slot === 'dodge') descriptor.onArrival = descriptor.onArrival ?? 'lightning-chain';
      if (resolvedCovenant.primary === 'flame') descriptor.terrainInteraction = descriptor.terrainInteraction ?? 'burning-ground';
      if (resolvedCovenant.primary === 'light' && slot === 'skillTwo') descriptor.cleanse = true;
      if (resolvedCovenant.primary === 'void' && slot === 'dodge') descriptor.movement = 'teleport';
      if (resolvedCovenant.primary === 'blood') descriptor.status = descriptor.status ?? 'bleed';
    }
    for (const hook of equipmentHooks ?? []) {
      mergeRules(descriptor, hook.rules ?? hook);
      if (hook.id) descriptor.equipmentHooks.push(hook.id);
    }
    mergeRules(descriptor, lateModifiers);
    descriptor.cooldown = Math.max(0.05, descriptor.cooldown * descriptor.cooldownMultiplier);
    descriptor.presentationKey = `${id}:${descriptor.covenant ?? 'base'}:${descriptor.mutationId ? descriptor.mutationId.split(':').at(-1) : 'base'}`;
    return descriptor;
  }
}
