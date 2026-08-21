import assert from 'node:assert/strict';
import {
  BESTIARY_FAMILIES, CAMPAIGN_DECREES, COMBAT_REACTIONS, ECLIPSE_WEB, EVENT_ARCS,
  EXPEDITION_BOONS, FACTION_DOCTRINES, FORGE_DISCIPLINES, HYBRID_MUTATIONS,
  MASTERY_EVOLUTIONS, PARAGON_CONSTELLATIONS, RELIC_MEMORIES, STRONGHOLD_PROJECTS,
  SYSTEM_DEPTH_AUDIT, WORLD_OATHS, activeParagonConstellations
} from '../src/data/reforged.js';
import { FACTIONS } from '../src/data/expansion.js';
import { ITEM_BASES } from '../src/data/items.js';
import { LANDMARKS } from '../src/data/world.js';

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key)
};

const { GameEngine } = await import('../src/systems/game.js');
const input = {
  pointer: { active: true, worldX: 820, worldY: 620 },
  tick() {}, updateWorldPointer() {}, getMove() { return { x: 0, y: 0, moving: false }; },
  getAimDirection() { return null; }, isHeld() { return false; }, consume() { return false; },
  defer() {}, press() {}, rumble() {}
};
const renderer = { viewport: { width: 1280, height: 720, scale: 1 } };

assert.equal(SYSTEM_DEPTH_AUDIT.length, 16, 'the audit must cover every formerly shallow player-facing loop');
assert.equal(Object.keys(HYBRID_MUTATIONS).length, 15);
Object.values(HYBRID_MUTATIONS).forEach((tiers) => {
  assert.equal(tiers.length, 3);
  assert.ok(tiers.every((tier) => tier.choices.length === 3));
});
assert.equal(Object.keys(MASTERY_EVOLUTIONS).length, 6);
assert.ok(Object.values(MASTERY_EVOLUTIONS).every((paths) => paths.length === 3 && paths.every((path) => path.maxRank === 5)));
assert.equal(Object.keys(RELIC_MEMORIES).length, new Set(ITEM_BASES.map((base) => base.slot)).size);
assert.ok(Object.values(RELIC_MEMORIES).every((memories) => memories.length === 3));
assert.equal(FORGE_DISCIPLINES.length, 4);
assert.ok(FORGE_DISCIPLINES.every((discipline) => discipline.techniques.length === 4));
assert.equal(Object.keys(FACTION_DOCTRINES).length, FACTIONS.length);
assert.equal(WORLD_OATHS.length, 5);
assert.equal(EVENT_ARCS.length, 5);
assert.equal(STRONGHOLD_PROJECTS.length, 3);
assert.equal(EXPEDITION_BOONS.length, 8);
assert.equal(ECLIPSE_WEB.length, 12);
assert.equal(PARAGON_CONSTELLATIONS.length, 16);
assert.equal(BESTIARY_FAMILIES.length, 8);
assert.equal(Object.keys(CAMPAIGN_DECREES).length, 5);
assert.equal(COMBAT_REACTIONS.length, 6);

const game = new GameEngine(input, renderer, { reducedVfx: true, graphicsQuality: 'high' });
assert.ok(game.start('warden', 'thornseer'));
game.player.level = 100;
game.player.gold = 1_000_000;
game.player.materials = { cinders: 10_000, echoes: 1_000, shards: 1_000, prisms: 100, marks: 100, alloys: 1_000, cores: 100 };
game._refreshPlayerStats(true);

assert.ok(game.setWorldOath('worldfall'));
assert.equal(game.getReforgedOverview().oath.id, 'worldfall');
for (const tier of HYBRID_MUTATIONS[game.getHybrid().id]) assert.ok(game.chooseHybridMutation(tier.tier, tier.choices[0].id));
assert.equal(Object.keys(game.player.reforged.hybridMutations).length, 3);

game.player.abilityMastery.attack = { xp: 100_000, rank: 5 };
game.player.reforged.mastery.attack = { pathId: null, rank: 0, earned: 5, points: 5 };
for (let rank = 0; rank < 5; rank += 1) assert.ok(game.investMasteryEvolution('attack', MASTERY_EVOLUTIONS.attack[0].id));
assert.equal(game.player.reforged.mastery.attack.rank, 5);
assert.ok(game._hasReforgedSpecial(MASTERY_EVOLUTIONS.attack[0].milestone.special));

const relic = game._generateItem({ rarity: 'relic', minRarity: 'relic', slot: 'weapon', sourceId: 'stronghold' });
relic.bondXp = 10_000;
relic.bondRank = 3;
game.player.inventory.push(relic);
for (const memory of RELIC_MEMORIES.weapon) assert.ok(game.chooseRelicMemory(relic.id, memory.id));
assert.equal(relic.memories.length, 3);

Object.keys(game.player.reforged.forge.ranks).forEach((id) => {
  game.player.reforged.forge.ranks[id] = 10;
  game.player.reforged.forge.xp[id] = 2_000;
});
assert.ok(game.useForgeTechnique('lock-affix', { itemId: relic.id, index: 0 }));
assert.equal(relic.forgeLockedAffix, 0);
assert.ok(game.useForgeTechnique('guided-temper', { itemId: relic.id, family: 'offense' }));
assert.equal(relic.guidedTemper, 'offense');
assert.ok(game.temperItem(relic.id));
assert.equal(relic.guidedTemper, undefined);
assert.ok(game.useForgeTechnique('perfect-base', { itemId: relic.id }));
assert.equal(relic.quality, 'exquisite');
relic.sockets = Math.min(2, relic.sockets);
assert.ok(game.useForgeTechnique('resonant-socket', { itemId: relic.id }));
assert.ok(relic.resonantSocketUsed);
assert.ok(game.useForgeTechnique('material-exchange'));

const faction = FACTIONS[0];
game.player.factions[faction.id] = { rank: 4, renown: 999 };
assert.ok(game.chooseFactionDoctrine(faction.id, FACTION_DOCTRINES[faction.id][0].id));
assert.ok(game.pledgeFaction(faction.id));
const directive = game._directiveDefinitions(faction.id)[0];
game.player.reforged.factions[faction.id].directiveProgress[directive.type] = directive.target;
assert.ok(game.claimFactionDirective(faction.id, directive.id));
assert.ok(game.player.reforged.factions[faction.id].favor > 0);

const stronghold = LANDMARKS.find((landmark) => landmark.kind === 'stronghold');
game.player.worldProgress.strongholds[stronghold.id] = true;
game.player.reforged.world.strongholds[stronghold.id].reclaimed = true;
game.player.reforged.world.strongholds[stronghold.id].stability = 60;
assert.ok(game.investStronghold(stronghold.id, STRONGHOLD_PROJECTS[0].id));
assert.equal(game.player.reforged.world.strongholds[stronghold.id].projects[STRONGHOLD_PROJECTS[0].id], 1);

const arc = EVENT_ARCS[0];
for (let stage = 0; stage < arc.stages.length; stage += 1) game._recordReforgedProgress('event', { zoneId: arc.zoneId });
assert.equal(game.player.reforged.world.pendingArcId, arc.id);
assert.ok(game.chooseEventArcOutcome(arc.id, arc.endings[0].id));
assert.equal(game.player.reforged.world.arcs[arc.id].outcomeId, arc.endings[0].id);

game._setCampaignStage('chapter-one-complete', 1);
game.player.reforged.worldOath = 'pilgrim';
game.endgame = null;
assert.ok(game.startEndgame('arena', 12));
game.entities.enemies = [];
game._updateEndgame(1);
assert.equal(game.endgame.waveIndex, 2);
game.entities.enemies = [];
game._updateEndgame(1);
assert.ok(game.endgame.pendingRoute, 'the third room must branch through an expedition junction');
const route = game.getExpeditionRouteChoice();
assert.equal(route.choices.length, 3);
assert.ok(game.chooseExpeditionRoute(route.choices[0].id));
assert.equal(game.endgame.expeditionBoons.length, 1);
assert.equal(game.endgame.pendingRoute, null);

game.returnToSanctuary();
game.player.reforged.eclipse.points = 30;
game.player.reforged.eclipse.pointsEarned = 30;
for (const id of ['first-shadow', 'war-road', 'hidden-road']) assert.ok(game.allocateEclipseNode(id));
assert.ok(game.player.reforged.eclipse.allocated['hidden-road']);

const family = BESTIARY_FAMILIES[0];
game.player.reforged.bestiary[family.id].kills = family.thresholds[2];
game.player.reforged.bestiary[family.id].rank = 2;
assert.ok(game.chooseBestiaryInsight(family.id, 'anatomy'));
assert.equal(game.player.reforged.bestiary[family.id].insightId, 'anatomy');

assert.ok(game.chooseCampaignDecree('chapter-one', CAMPAIGN_DECREES['chapter-one'][0].id));
assert.equal(game.player.reforged.decrees['chapter-one'], CAMPAIGN_DECREES['chapter-one'][0].id);

const allocated = {};
for (const key of PARAGON_CONSTELLATIONS[0].keys) allocated[`${PARAGON_CONSTELLATIONS[0].boardId}:${key}`] = true;
assert.equal(activeParagonConstellations(allocated)[0].id, PARAGON_CONSTELLATIONS[0].id);

const rival = game._spawnEnemy('ashbow', game.player.x + 40, game.player.y, { level: 100, elite: true });
game.player.lastDamageSource = 'projectile volley';
game._die();
assert.ok(game.player.nemeses.some((entry) => entry.templateId === rival.templateId && entry.traits.includes('mirrorborn')));

game.player.deathTime = 0;
game.player.hp = game.player.maxHp;
game.endgame = null;
assert.ok(game.save());
const snapshot = game.snapshot();
assert.ok(snapshot.player.reforged, 'the v2 systemic state must be persisted in the existing save envelope');
const restored = new GameEngine(input, renderer, { reducedVfx: true, graphicsQuality: 'high' });
assert.ok(restored.continueRun());
assert.equal(restored.player.reforged.worldOath, 'pilgrim');
assert.equal(restored.player.reforged.decrees['chapter-one'], CAMPAIGN_DECREES['chapter-one'][0].id);
assert.equal(restored.player.reforged.world.arcs[arc.id].outcomeId, arc.endings[0].id);
assert.equal(restored.player.reforged.mastery.attack.rank, 5);
assert.ok(restored.player.nemeses.length > 0);

console.log('Ashen Covenant systemic overhaul test passed.');
