import assert from 'node:assert/strict';
import { EndgameContextSystem, METAMORPHOSIS_BOONS } from '../src/systems/endgame-context.js';

const system = new EndgameContextSystem();
const context = system.buildBlackRoadContext({
  covenant: { primary: 'grave', stage: 4, rewardTags: ['grave'] },
  worldModifiers: { enemyDensity: 1.24, hunterPressure: 0.18, lootBias: ['grave'], bossModifier: 'gravewake' },
  eclipseAllocated: { 'first-shadow': true, 'hidden-road': true, 'hunter-crown': true, 'silent-eclipse': true },
  zoneId: 'gravewake', expeditionId: 'funeral-road'
});
assert.equal(context.covenantAffix, 'grave');
assert.equal(context.worldModifiers.enemyDensity, 1.24);
assert(context.eclipseControls.extraRouteChoices >= 1, 'Hidden Road must become an endgame condition control');
assert(context.hunterChance > 0.4, 'Hunter Crown must materially raise Hunter intrusion pressure');
assert.equal(context.bossVariantAffinity, 'grave', 'Covenant state must deterministically bias the boss variant');
assert(context.rewardBias.includes('grave'), 'route context must preserve Covenant reward bias');
assert(METAMORPHOSIS_BOONS.some((boon) => boon.affinity === 'grave' && boon.rules.corpseEcho), 'midpoint boons must alter rules, not only stats');

console.log('Ashen Covenant endgame context pure regression passed.');

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, value),
  removeItem: (key) => store.delete(key)
};
const { GameEngine } = await import('../src/systems/game.js');
const input = { pointer: { active: false, worldX: 0, worldY: 0 }, tick() {}, updateWorldPointer() {}, getMove() { return { x: 0, y: 0, moving: false }; }, isHeld() { return false; }, consume() { return false; }, defer() {}, rumble() {} };
const renderer = { viewport: { width: 1280, height: 720, scale: 1 } };
const make = () => new GameEngine(input, renderer, { reducedVfx: true });
const game = make();
game.random = () => 0.1;
assert(game.start('warden', 'thornseer'));
for (let i = 0; i < 5; i += 1) game.recordCovenantBehavior(['gravebound'], 10, { regionId: 'gravewake' });
const covenant = game.getCovenantOverview();
assert.equal(covenant.primary, 'grave');
const reforged = game._reforged();
for (const id of ['first-shadow', 'hidden-road', 'hunter-crown', 'silent-eclipse']) reforged.eclipse.allocated[id] = true;
game.player.hunters = [game.hunterSystem.normalize({ id: 'hunter-road-test', name: 'Bell-Marked Vagrant', templateId: 'cairnguard', factionId: 'grave', nextEligibleAt: 0, targetRewardId: 'vowbreaker', grudge: 5 })];
game.player.lootTarget = 'vowbreaker';
game.startPersistentWorldEvent('gravewake-rising', 'gravewake');
assert(game.startBlackRoadExpedition('funeral-road'));
assert.equal(game.endgame.routeContext.covenantAffix, 'grave', 'Black Road must freeze Covenant state at launch');
assert(game.endgame.routeContext.worldModifiers.corpseResurrection, 'Black Road must freeze persistent regional pressure at launch');
assert(game.endgame.routeContext.eclipseControls.extraRouteChoices >= 1, 'Black Road must freeze Eclipse controls at launch');
assert.equal(game.endgame.bossCovenantVariant, 'grave', 'route context must force the authored boss affinity');
assert(game.snapshot().activeOperation?.blackRoad, 'an active Black Road operation must serialize for reload without rerolling');

// A restored checkpoint can only represent an authored contiguous prefix. A
// corrupt save that claims a later room without its predecessors must resume at
// the first missing room instead of advancing by the number of claimed IDs.
const checkpointProbe = make();
checkpointProbe.random = () => 0.1;
assert(checkpointProbe.start('warden', 'thornseer'));
const noncontiguousSnapshot = structuredClone(game.snapshot());
noncontiguousSnapshot.activeOperation.completedStageIds = ['funeral-crypt'];
checkpointProbe._restoreSnapshot(noncontiguousSnapshot);
assert.deepEqual(
  checkpointProbe.endgame.completedStageIds,
  [],
  'Black Road restore must discard completed stages that are not a contiguous authored prefix'
);
assert.equal(checkpointProbe.endgame.activeStage?.id, 'funeral-gate', 'corrupt later-stage claims must resume at the first authored room');

const frozenContext = JSON.parse(JSON.stringify(game.endgame.routeContext));
game.save();
const restored = make();
restored.random = () => 0.99;
assert(restored.continueRun(), 'active v19 Black Road save must reload');
assert(restored.endgame?.blackRoad, 'active Black Road operation must be restored instead of discarded');
assert.deepEqual(restored.endgame.routeContext, frozenContext, 'reload must not reroll frozen Covenant/world/Eclipse route context');
assert.equal(restored.endgame.activeStage?.id, 'funeral-gate', 'reload must reconstruct the active authored room');
const intruder = restored._maybeIntrudeBlackRoadHunter?.(true);
assert(intruder?.hunterId === 'hunter-road-test', 'eligible Hunter must be able to intrude into the frozen Black Road route');
assert.equal(intruder.group, restored.endgame.id, 'Black Road Hunter must use the active encounter group so room completion stays authoritative');
assert.equal(intruder.blackRoadHunter, true, 'Black Road Hunter must be explicitly marked for route lifecycle handling');

const clearStage = () => {
  restored.entities.enemies.filter((enemy) => enemy.group === restored.endgame.id).forEach((enemy) => { enemy.dead = true; });
  restored.entities.destructibles.filter((entry) => entry.expeditionStageId === restored.endgame.activeStage?.id).forEach((entry) => { entry.broken = true; });
  restored._updateEndgame(0.05);
  restored.clock += 2;
  restored._updateEndgame(0.05);
};
clearStage();
assert.equal(restored.endgame.activeStage?.type, 'ritual');
clearStage();
const junction = restored.getExpeditionRouteChoice();
const graveChoice = junction?.choices?.find((choice) => choice.affinity === 'grave');
assert(graveChoice, 'midpoint junction must expose the frozen Covenant Metamorphosis choice');
assert(restored.chooseExpeditionRoute(graveChoice.id));
assert(restored.endgame.metamorphosisBoons.includes(graveChoice.id), 'chosen Metamorphosis must become active route state');
restored._updateEndgame(0.05);
assert.equal(restored.endgame.activeStage?.type, 'lieutenant');
clearStage();
assert.equal(restored.endgame.activeStage?.type, 'boss');
const boss = restored.entities.enemies.find((enemy) => enemy.group === restored.endgame.id && enemy.boss);
assert(boss, 'authored boss must spawn after the Metamorphosis junction');
const bossState = restored.bossController.update(boss, { covenant: restored.getCovenantOverview(), now: restored.clock, variantOverride: restored.endgame.bossCovenantVariant });
assert.equal(bossState.affinity, 'grave', 'frozen Covenant route must force authored boss affinity');
clearStage();
assert.equal(restored.endgame.completed, true);
const owned = [...restored.player.inventory, ...restored.player.stash];
assert(owned.some((item) => item.uniqueId === 'vowbreaker'), 'eligible explicit target farm must be honored by the final Black Road reward');
restored.returnToSanctuary();
assert.equal(restored.endgame, null, 'completed route must explicitly return to the Living Sanctuary');
assert(restored.getSanctuaryState().level >= 1);

console.log('Ashen Covenant Covenant/Black Road integration regression passed.');