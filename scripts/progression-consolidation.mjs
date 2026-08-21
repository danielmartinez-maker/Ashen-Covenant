import assert from 'node:assert/strict';
import { ProgressionSystem } from '../src/systems/progression-v6.js';
import { ABILITY_MUTATIONS, abilityIdFor } from '../src/data/ability-mutations.js';

const system = new ProgressionSystem();
const player = {
  skillImprints: { skillOne: 'forked', skillTwo: 'lasting', ultimate: 'cataclysm' },
  abilityMastery: { attack: { rank: 4 }, skillOne: { rank: 5 }, skillTwo: { rank: 2 } },
  reforged: { hybridMutations: { 1: 'x', 2: 'y' }, mastery: { skillOne: { rank: 3, pathId: 'piercing-script' } } },
  mutationProgress: { credits: 0, selections: {}, unlocked: [], legacyConverted: false }
};
const first = system.convertLegacy(player, 'warden');
assert(first.credits >= 8, 'legacy choices/ranks must retain meaningful value');
assert.equal(first.legacyConverted, true);
const credits = first.credits;
const second = system.convertLegacy(player, 'warden');
assert.equal(second.credits, credits, 'legacy conversion must be idempotent');

const abilityId = abilityIdFor('warden', 'skillOne');
const mutation = ABILITY_MUTATIONS[abilityId][0];
player.mutationProgress = first;
assert(system.unlock(player, mutation.id));
assert(system.select(player, abilityId, mutation.id));
assert.equal(player.mutationProgress.selections[abilityId], mutation.id);
assert(!system.select(player, abilityId, 'unknown'));
const overview = system.overview(player, 'warden');
assert.equal(overview.abilities.length, 5);
assert(overview.abilities.find((entry) => entry.abilityId === abilityId).mutations.some((entry) => entry.selected));
console.log('Ashen Covenant progression consolidation regression passed.');

const store = new Map();
globalThis.localStorage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value), removeItem: (key) => store.delete(key) };
const { GameEngine } = await import('../src/systems/game.js');
const input = { pointer: { active: false, worldX: 900, worldY: 620 }, tick() {}, updateWorldPointer() {}, getMove() { return { x: 0, y: 0, moving: false }; }, isHeld() { return false; }, consume() { return false; }, defer() {}, rumble() {} };
const game = new GameEngine(input, { viewport: { width: 1280, height: 720, scale: 1 } }, { reducedVfx: true });
assert.ok(game.start('warden', 'thornseer'));
const liveAbilityId = abilityIdFor('warden', 'skillOne');
const liveMutation = ABILITY_MUTATIONS[liveAbilityId][0];
game.player.mutationProgress.credits = 1;
assert(game.unlockAbilityMutation(liveMutation.id));
assert(game.selectAbilityMutation('skillOne', liveMutation.id));
assert.equal(game.getResolvedAbility('skillOne').shape, liveMutation.rules.shape);
assert.equal(game.snapshot().player.mutationProgress.selections[liveAbilityId], liveMutation.id);
