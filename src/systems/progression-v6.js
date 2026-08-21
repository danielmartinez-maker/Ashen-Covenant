import { ABILITY_MUTATIONS, ABILITY_SLOTS, abilityIdFor, mutationByAnyId, mutationById } from '../data/ability-mutations.js';

const record = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const normalize = (player) => {
  const raw = record(player?.mutationProgress);
  return {
    credits: Math.max(0, Math.floor(Number(raw.credits) || 0)),
    selections: { ...record(raw.selections) },
    unlocked: Array.isArray(raw.unlocked) ? [...new Set(raw.unlocked.filter((id) => mutationByAnyId(id)))] : [],
    legacyConverted: raw.legacyConverted === true
  };
};

export class ProgressionSystem {
  convertLegacy(player, classId) {
    const state = normalize(player);
    if (state.legacyConverted) { player.mutationProgress = state; return state; }
    const imprintCredits = Object.values(record(player?.skillImprints)).filter(Boolean).length;
    const hybridCredits = Object.values(record(player?.reforged?.hybridMutations)).filter(Boolean).length;
    const masteryRanks = Object.values(record(player?.abilityMastery)).reduce((sum, entry) => sum + Math.floor((Number(entry?.rank) || 0) / 2), 0);
    const reforgedRanks = Object.values(record(player?.reforged?.mastery)).reduce((sum, entry) => sum + Math.floor((Number(entry?.rank) || 0) / 2), 0);
    state.credits += imprintCredits + hybridCredits + masteryRanks + reforgedRanks;
    state.legacyConverted = true;
    player.mutationProgress = state;
    void classId;
    return state;
  }
  unlock(player, mutationId) {
    const state = normalize(player);
    if (!mutationByAnyId(mutationId) || state.unlocked.includes(mutationId) || state.credits <= 0) return false;
    state.credits -= 1; state.unlocked.push(mutationId); player.mutationProgress = state; return true;
  }
  select(player, abilityId, mutationId = null) {
    const state = normalize(player);
    if (mutationId == null) { delete state.selections[abilityId]; player.mutationProgress = state; return true; }
    if (!state.unlocked.includes(mutationId) || !mutationById(abilityId, mutationId)) return false;
    state.selections[abilityId] = mutationId; player.mutationProgress = state; return true;
  }
  overview(player, classId) {
    const state = normalize(player);
    return { ...state, abilities: ABILITY_SLOTS.map((slot) => {
      const abilityId = abilityIdFor(classId, slot);
      return { abilityId, slot, selected: state.selections[abilityId] ?? null, mutations: (ABILITY_MUTATIONS[abilityId] ?? []).map((mutation) => ({ ...mutation, unlocked: state.unlocked.includes(mutation.id), selected: state.selections[abilityId] === mutation.id })) };
    }) };
  }
}
