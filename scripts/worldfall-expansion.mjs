import assert from 'node:assert/strict';
import { CAMPAIGN_CHAPTERS, CAMPAIGN_DIALOGUES, EXPANSION_ACTS } from '../src/data/campaign.js';
import { ELITE_AFFIXES, ENCOUNTER_TEMPLATES, ENEMIES, ZONE_ENCOUNTER_TEMPLATES } from '../src/data/enemies.js';
import { CONTRACTS, DELVES, DISTRICTS, ENDGAME_ACTIVITIES, ENDGAME_MODIFIERS, FACTIONS } from '../src/data/expansion.js';
import { LANDMARKS, WORLD_EVENTS, ZONES } from '../src/data/world.js';

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key)
};

const { GameEngine } = await import('../src/systems/game.js');

assert.equal(ZONES.length, 6, 'the painted world should retain all six major regions');
assert.equal(DISTRICTS.length, 30, 'each region should contain five named districts');
assert.equal(CONTRACTS.length, 30, 'the board should expose thirty repeatable regional contracts');
assert.equal(DELVES.length, 10, 'the world should contain ten authored delves');
assert.equal(ENDGAME_ACTIVITIES.length, 8, 'the endgame should expose eight structurally different modes');
assert.equal(ENDGAME_MODIFIERS.length, 15, 'high tiers need a broad modifier pool');
assert.equal(FACTIONS.length, 5, 'regional play should advance five persistent factions');
assert.equal(WORLD_EVENTS.length, 18, 'the ambient world-event pool should be substantially expanded');
assert.ok(LANDMARKS.length >= 60, 'the map should contain dense campaign, exploration, delve, and travel landmarks');
assert.equal(CAMPAIGN_CHAPTERS.length, 5, 'the campaign should continue through five playable chapters');
assert.ok(CAMPAIGN_CHAPTERS.reduce((total, chapter) => total + chapter.stages.length, 0) >= 30, 'the expanded campaign needs at least thirty persistent stages');
assert.ok(Object.keys(CAMPAIGN_DIALOGUES).length >= 35, 'the five acts should have authored narrative beats');
assert.ok(Object.keys(ENEMIES).length >= 40, 'the regional bestiary should contain at least forty enemies and bosses');
assert.ok(ENCOUNTER_TEMPLATES.length >= 30, 'the encounter director should have dozens of compositions');
assert.ok(ELITE_AFFIXES.length >= 12, 'elite packs should support a broad mechanical modifier pool');

Object.entries(ZONE_ENCOUNTER_TEMPLATES).forEach(([zoneId, templates]) => {
  assert.ok(ZONES.some((zone) => zone.id === zoneId), `${zoneId} encounter templates need a valid region`);
  assert.ok(templates.length >= 2, `${zoneId} needs multiple encounter compositions`);
  templates.flat().forEach((enemyId) => assert.ok(ENEMIES[enemyId], `${zoneId} references missing enemy ${enemyId}`));
});
DELVES.forEach((delve) => {
  assert.ok(ZONES.some((zone) => zone.id === delve.zoneId), `${delve.id} needs a valid region`);
  assert.ok(ENEMIES[delve.bossId]?.boss, `${delve.id} needs a valid boss`);
});
WORLD_EVENTS.flatMap((event) => event.enemyIds ?? []).forEach((enemyId) => assert.ok(ENEMIES[enemyId], `world event references missing enemy ${enemyId}`));
Object.values(EXPANSION_ACTS).forEach((act) => {
  assert.ok(ENEMIES[act.bossId]?.boss, `${act.bossId} must remain a phase-driven boss`);
  Object.values(act.formations).flat().forEach((enemyId) => assert.ok(ENEMIES[enemyId], `campaign formation references missing enemy ${enemyId}`));
});

const input = {
  pointer: { active: true, worldX: 820, worldY: 620 },
  tick() {}, updateWorldPointer() {}, getMove() { return { x: 0, y: 0, moving: false }; },
  getAimDirection() { return null; }, isHeld() { return false; }, consume() { return false; },
  defer() {}, press() {}, rumble() {}
};
const renderer = { viewport: { width: 1280, height: 720, scale: 1 } };
const game = new GameEngine(input, renderer, { reducedVfx: true, lootFilter: 'all', aimAssist: true });
assert.ok(game.start('gravebinder', 'dawnstrider'));
game.player.level = 60;
game.player.skillPoints = 59;
game.player.gold = 100_000;
game._refreshPlayerStats(true);

const maelin = game.entities.landmarks.find((landmark) => landmark.id === 'maelin');
assert.ok(maelin);
const interactAt = (landmarkId) => {
  const landmark = game.entities.landmarks.find((entry) => entry.id === landmarkId);
  assert.ok(landmark, `${landmarkId} must exist in the live world`);
  game.player.x = landmark.x;
  game.player.y = landmark.y;
  assert.ok(game.interact(), `${landmarkId} must support interaction`);
};
const killCampaignGroup = (campaignId) => {
  const group = game.entities.enemies.filter((enemy) => !enemy.dead && enemy.campaignId === campaignId);
  assert.ok(group.length, `${campaignId} should spawn a live encounter`);
  group.forEach((enemy) => game._damageEnemy(enemy, enemy.maxHp * 50, { source: 'worldfall-test', armorPierce: 1, stagger: 0 }));
};

game._setCampaignStage('chapter-two-complete', 1, 'chapter-two');
for (const [chapterId, act] of Object.entries(EXPANSION_ACTS)) {
  game.player.x = maelin.x;
  game.player.y = maelin.y;
  assert.ok(game.interact(), `${chapterId} should begin at Maelin`);
  assert.equal(game.getCampaign().chapterId, chapterId);
  assert.equal(game.getCampaign().stageId, act.firstStage);
  assert.ok(game.isCampaignLandmarkTarget('maelin'), `${chapterId} should visibly mark its briefing`);
  assert.ok(game.interact(), `${chapterId} briefing should advance`);
  assert.equal(game.getCampaign().stageId, act.enterStage);
  interactAt(act.gateId);
  assert.equal(game.getCampaign().stageId, act.nodeStage);
  act.nodeIds.forEach((nodeId) => killCampaignGroup(`${chapterId}-node:${nodeId}`));
  assert.equal(game.getCampaign().stageId, act.bossStage);
  const boss = game.entities.enemies.find((enemy) => !enemy.dead && enemy.campaignId === act.bossCampaignId);
  assert.ok(boss?.boss && boss.campaignBoss, `${chapterId} must culminate in a live campaign boss`);
  boss.shield = 0;
  game._damageEnemy(boss, boss.maxHp * 50, { source: 'worldfall-test', armorPierce: 1, stagger: 0 });
  assert.equal(game.getCampaign().stageId, act.returnStage);
  game.player.x = maelin.x;
  game.player.y = maelin.y;
  assert.ok(game.interact(), `${chapterId} should conclude at Maelin`);
  assert.equal(game.getCampaign().stageId, act.completeStage);
}
assert.equal(game.getCampaign().chapterId, 'chapter-five');
assert.equal(game.getCampaign().completed, true);
assert.ok(game.getCampaignJournal().chapters.every((chapter) => chapter.completed), 'all five chapters should be represented as complete in the journal');
['rootmother-heart', 'regents-last-link', 'map-of-five-edges'].forEach((uniqueId) => {
  assert.ok([...game.player.inventory, ...game.player.stash].some((item) => item.uniqueId === uniqueId), `${uniqueId} should be awarded by its campaign act`);
});

const atlasBefore = game.getWorldAtlas();
assert.equal(atlasBefore.districts.length, 30);
assert.equal(atlasBefore.waypoints.length, 6);
assert.equal(atlasBefore.lore.length, 18);
assert.equal(atlasBefore.delves.length, 10);
const remoteDistrict = atlasBefore.districts.find((district) => district.zoneId === 'redfen');
assert.ok(game._discoverDistrict(remoteDistrict));
assert.ok(game.getWorldAtlas().districts.find((district) => district.id === remoteDistrict.id)?.discovered);

assert.ok(game.acceptContract('gravewake-contract-1'));
const activeContract = game.getContractBoard().active[0];
game._progressContracts(activeContract.type, { zoneId: activeContract.zoneId, amount: activeContract.target });
assert.ok(game.getContractBoard().active[0].ready, 'contract progress should become claimable');
const priorRenown = game.player.factions['ashen-accord'].renown;
assert.ok(game.claimContract(activeContract.id));
assert.ok(game.player.factions['ashen-accord'].renown > priorRenown, 'contract claims should advance faction renown');

game.entities.loot.push({ id: 'worldfall-sentinel-loot', x: game.player.x, y: game.player.y, item: game._generateItem(false), life: 99, bob: 0 });
assert.ok(game.startDelve('ossuary-steps', 36));
assert.equal(game.endgame.activity, 'delve');
assert.equal(game.endgame.delveId, 'ossuary-steps');
assert.equal(game.endgame.modifiers.length, 3, 'tier 35+ activities should combine three modifiers');
assert.equal(game.endgame.wavePlan.length, DELVES.find((delve) => delve.id === 'ossuary-steps').waves);
assert.equal(game.endgame.wavePlan.at(-1).enemyId, 'cryptwarden');
assert.ok(game.entities.loot.some((drop) => drop.id === 'worldfall-sentinel-loot'), 'entering an activity must not erase uncollected loot');

for (const activity of ENDGAME_ACTIVITIES) {
  game.returnToSanctuary();
  assert.ok(game.startEndgame(activity.id, 22), `${activity.name} should launch`);
  assert.equal(game.endgame.activity, activity.id);
  assert.equal(game.endgame.modifiers.length, 2, 'tier 20+ activities should combine two modifiers');
  assert.ok(game.endgame.wavePlan.length >= 1, `${activity.name} should create a bounded wave plan`);
}

game.returnToSanctuary();
game.entities.enemies = [];
game.populationTimer = 0;
game.player.x = 1700;
game.player.y = 700;
game._updatePopulation(89);
assert.equal(game.entities.enemies.length, 0, 'authored roads must not refill on the old survival-game cadence');
game._updatePopulation(1);
assert.equal(game.entities.enemies.length, 0, 'the population director must remain disabled until the player commits to a sealed expedition room');

assert.ok(game.save());
const saved = game.snapshot();
assert.equal(saved.version, 19);
assert.ok(saved.player.factions && saved.player.contracts && saved.player.worldProgress.discoveredDistricts, 'expanded progression must be serialized');
const restored = new GameEngine(input, renderer, { reducedVfx: true, lootFilter: 'all', aimAssist: true });
assert.ok(restored.continueRun());
assert.equal(restored.getCampaign().stageId, 'chapter-five-complete');
assert.ok(restored.player.worldProgress.discoveredDistricts.includes(remoteDistrict.id));
assert.ok(restored.player.factions['ashen-accord'].renown > 0);

console.log('Ashen Covenant Worldfall expansion test passed.');
