import assert from 'node:assert/strict';
import { ABILITY_MUTATIONS, abilityIdFor, mutationById } from '../src/data/ability-mutations.js';
import { AbilitySystem } from '../src/systems/abilities.js';
import { CovenantSystem } from '../src/systems/covenant.js';
import { defaultCovenantState } from '../src/systems/save-migrator.js';
import { CLASSES, CLASS_IDS } from '../src/data/classes.js';

const slots = ['attack', 'skillOne', 'skillTwo', 'dodge', 'ultimate'];
assert.equal(Object.keys(ABILITY_MUTATIONS).length, 30, 'six classes x five combat actions');
for (const classId of CLASS_IDS) {
  for (const slot of slots) {
    const abilityId = abilityIdFor(classId, slot);
    const mutations = ABILITY_MUTATIONS[abilityId];
    assert(mutations?.length >= 4 && mutations.length <= 6, `${abilityId} needs 4-6 mutations`);
    assert.equal(new Set(mutations.map((m) => JSON.stringify(m.rules))).size, mutations.length, `${abilityId} mutation rules must be distinct`);
    mutations.forEach((mutation) => {
      assert(mutation.id && mutation.name && mutation.description);
      assert(Object.keys(mutation.rules).some((key) => !['damageMultiplier', 'cooldownMultiplier'].includes(key)), `${mutation.id} must change a gameplay rule`);
    });
  }
}
assert.equal(abilityIdFor('warden', 'skillOne'), 'warden:spirit-nail');
assert.equal(abilityIdFor('gravebinder', 'skillOne'), 'gravebinder:bone-comet');
const impale = mutationById('warden:spirit-nail', 'warden:spirit-nail:impaling-vow');
assert.equal(impale.rules.shape, 'melee');
const revenant = mutationById('gravebinder:bone-comet', 'gravebinder:bone-comet:revenant-comet');
assert.equal(revenant.rules.corpseInteraction, 'raise-revenant');

const abilities = new AbilitySystem();
let covenant = defaultCovenantState();
const covenants = new CovenantSystem();
for (let i = 0; i < 20; i += 1) covenant = covenants.applyBehavior(covenant, ['gravebound'], 1.2);
const baseAbility = CLASSES.warden.abilities.skillOne;
const resolved = abilities.resolve({ classId: 'warden', slot: 'skillOne', base: baseAbility, selectedMutationId: impale.id, covenant, equipmentHooks: [{ id: 'test-fork', rules: { projectileCount: 3 } }], lateModifiers: { cooldownMultiplier: 0.9 } });
assert.equal(resolved.id, 'warden:spirit-nail');
assert.equal(resolved.shape, 'melee');
assert.equal(resolved.damageType, 'grave');
assert.equal(resolved.corpseInteraction, 'grave-mark');
assert.equal(resolved.projectileCount, 3, 'equipment layer resolves after Covenant mutation');
assert(resolved.cooldown < baseAbility.cooldown);
assert(resolved.presentationKey.includes('grave'));
console.log('Ashen Covenant authored ability mutation regression passed.');

const store2 = new Map();
globalThis.localStorage = { getItem: (key) => store2.get(key) ?? null, setItem: (key, value) => store2.set(key, value), removeItem: (key) => store2.delete(key) };
const { GameEngine } = await import('../src/systems/game.js');
const { ENEMIES } = await import('../src/data/enemies.js');
const input2 = { pointer: { active: false, worldX: 0, worldY: 0 }, tick() {}, updateWorldPointer() {}, getMove() { return { x: 0, y: 0, moving: false }; }, isHeld() { return false; }, consume() { return false; }, defer() {}, rumble() {} };
const game2 = new GameEngine(input2, { viewport: { width: 1280, height: 720, scale: 1 } }, { reducedVfx: true });
assert(game2.start('warden', 'thornseer'));
game2.player.mutationProgress.credits = 1;
assert(game2.unlockAbilityMutation(impale.id));
assert(game2.selectAbilityMutation('skillOne', impale.id));
const enemyId = Object.values(ENEMIES).find((entry) => !entry.boss)?.id;
const enemy = game2._spawnEnemy(enemyId, game2.player.x + 55, game2.player.y, { engaged: true, level: 1 });
game2.player.facing = 0;
game2.player.resource = game2.player.maxResource;
const beforeProjectile = game2.entities.projectiles.length;
const beforeHp = enemy.hp;
game2._skillOne();
assert.equal(game2.entities.projectiles.length, beforeProjectile, 'Impaling Vow must replace projectile execution');
assert(enemy.hp < beforeHp, 'Impaling Vow must execute a melee hit');
