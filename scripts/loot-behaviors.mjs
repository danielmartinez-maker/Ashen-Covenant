import assert from 'node:assert/strict';
import { UNIQUES, LOOT_SOURCES } from '../src/data/items.js';
import { LootSystem, UNIQUE_BEHAVIORS } from '../src/systems/loot.js';

const formerStatOnly = [
  'rootmother-heart','regents-last-link','map-of-five-edges','cryptwardens-key',
  'drowned-sovereigns-crown','apostles-mirror','vessel-of-silence','accord-compass','worldspine'
];

assert.equal(Object.keys(UNIQUE_BEHAVIORS).length, UNIQUES.length, 'every Unique/Mythic must have one executable behavior hook');
for (const unique of UNIQUES) {
  const hook = UNIQUE_BEHAVIORS[unique.id];
  assert.ok(hook, `${unique.id} is missing a behavior hook`);
  assert.equal(typeof hook.apply, 'function', `${unique.id} behavior must be executable`);
  assert.ok(hook.id && hook.summary, `${unique.id} behavior must describe itself`);
  const result = hook.apply({ event: 'inspect', player: {}, unique });
  assert.ok(result && typeof result === 'object', `${unique.id} behavior must return a normalized action object`);
}

for (const id of formerStatOnly) {
  const hook = UNIQUE_BEHAVIORS[id];
  const result = hook.apply({ event: hook.trigger, player: { cooldowns: {} }, unique: UNIQUES.find((u) => u.id === id) });
  assert.ok(hook.trigger && hook.trigger !== 'inspect', `${id} must have a real gameplay trigger`);
  assert.ok(Array.isArray(result.actions) && result.actions.length > 0, `${id} must produce a concrete gameplay action`);
}

const loot = new LootSystem();
const gravewake = LOOT_SOURCES.find((source) => source.id === 'gravewake');
const ordinary = loot.eligibleUniques({
  sourceId: 'gravewake', rarity: 'unique', isEligible: () => true
});
const expected = gravewake.uniqueIds
  .map((id) => UNIQUES.find((u) => u.id === id))
  .filter(Boolean)
  .filter((u) => u.rarity !== 'mythic')
  .map((u) => u.id);
assert.deepEqual(ordinary.map((u) => u.id), expected, 'ordinary source rolls must preserve authored source order exactly');

const targetFarm = loot.eligibleUniques({
  sourceId: 'gravewake', rarity: 'unique', isEligible: () => true,
  targetFarm: true, preferredIds: ['daybreak-lance']
});
assert.deepEqual(new Set(targetFarm.map((u) => u.id)), new Set(expected), 'target farming may bias order but cannot delete authored eligibility');
assert.equal(targetFarm[0]?.id, 'daybreak-lance', 'explicit target farming should bias the eligible target to the front');

const equipped = {
  weapon: { uniqueId: 'worldspine', rarity: 'mythic', slot: 'weapon', name: 'Worldspine' },
  head: { uniqueId: 'drowned-sovereigns-crown', rarity: 'unique', slot: 'head', name: 'Drowned Sovereign’s Crown' }
};
const presentation = loot.presentationForEquipment(equipped, { primary: 'void', secondary: 'storm' });
assert.equal(presentation.heroKey, 'worldspine');
assert.equal(presentation.weaponKey, 'worldspine-rupture');
assert.equal(presentation.auraKey, 'drowned-sovereign-ward');

const hooks = loot.abilityHooks(equipped, 'warden:spirit-nail');
assert.ok(Array.isArray(hooks));
assert.ok(hooks.some((hook) => hook.source === 'worldspine'), 'equipped Uniques must participate in the ability resolver through normalized hooks');

console.log(`loot behaviors: ${UNIQUES.length} uniques, ${formerStatOnly.length} chase mechanics, source ordering and presentation verified`);
