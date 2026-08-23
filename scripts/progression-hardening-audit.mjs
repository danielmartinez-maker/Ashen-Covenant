import assert from 'node:assert/strict';
import { ProgressionSystem } from '../src/systems/progression-v6.js';

const system = new ProgressionSystem();
const hostilePlayer = {
  skillImprints: { attack: true, skillOne: true },
  abilityMastery: {
    attack: { rank: 'Infinity' },
    skillOne: { rank: -999 },
    skillTwo: { rank: 'not-a-number' },
    ultimate: null
  },
  reforged: {
    hybridMutations: { one: true, two: false, three: 'legacy' },
    mastery: {
      skillOne: { rank: 'Infinity' },
      skillTwo: { rank: 1e99 },
      ultimate: { rank: -100 }
    }
  },
  mutationProgress: { credits: 3, selections: {}, unlocked: [], legacyConverted: false }
};

const converted = system.convertLegacy(hostilePlayer, 'warden');
assert.ok(Number.isFinite(converted.credits), 'legacy conversion must never create non-finite mutation credits');
assert.ok(Number.isSafeInteger(converted.credits), 'legacy conversion credits must remain a safe integer');
assert.ok(converted.credits >= 0 && converted.credits <= 1_000_000, 'legacy conversion credits must remain bounded');
assert.equal(converted.legacyConverted, true);
const firstCredits = converted.credits;
assert.equal(system.convertLegacy(hostilePlayer, 'warden').credits, firstCredits, 'hostile legacy conversion remains idempotent');

const invalidRanksPlayer = {
  abilityMastery: {
    attack: { rank: 'Infinity' },
    skillOne: { rank: -999 },
    skillTwo: { rank: 'not-a-number' }
  },
  reforged: { mastery: { ultimate: { rank: -100 } } },
  mutationProgress: { credits: 7, selections: {}, unlocked: [], legacyConverted: false }
};
assert.equal(system.convertLegacy(invalidRanksPlayer, 'warden').credits, 7, 'invalid and negative legacy mastery ranks must not create or remove credits');

const extremeFinitePlayer = {
  abilityMastery: { attack: { rank: 1e99 } },
  mutationProgress: { credits: 5, selections: {}, unlocked: [], legacyConverted: false }
};
assert.equal(system.convertLegacy(extremeFinitePlayer, 'warden').credits, 1_000_000, 'extreme finite legacy ranks must saturate at the mutation credit ceiling');

const ordinaryPlayer = {
  abilityMastery: { attack: { rank: 4 }, skillOne: { rank: 3 } },
  reforged: { mastery: { skillTwo: { rank: 2 } } },
  mutationProgress: { credits: 1, selections: {}, unlocked: [], legacyConverted: false }
};
assert.equal(system.convertLegacy(ordinaryPlayer, 'warden').credits, 5, 'ordinary legacy mastery conversion must preserve existing half-rank credit behavior');

const malformedContainers = {
  skillImprints: 'bad',
  abilityMastery: ['bad'],
  reforged: { hybridMutations: 'bad', mastery: ['bad'] },
  mutationProgress: { credits: 'Infinity', selections: [], unlocked: {}, legacyConverted: false }
};
assert.doesNotThrow(() => system.convertLegacy(malformedContainers, 'warden'), 'malformed legacy containers must not crash conversion');
assert.ok(Number.isFinite(malformedContainers.mutationProgress.credits), 'malformed legacy containers must still yield finite credits');

console.log('Ashen Covenant legacy progression hardening audit passed.');
