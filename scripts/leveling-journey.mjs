import assert from 'node:assert/strict';
import { LEVEL_XP, MAX_LEVEL } from '../src/core/constants.js';
import { ASCENSION_TIERS, JOURNEY_BANDS, LEVEL_REWARDS, PILLARS } from '../src/data/leveling.js';
import { PARAGON_BOARDS, PARAGON_GLYPHS, paragonXpForRank } from '../src/data/paragon.js';

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
const makeGame = () => {
  const game = new GameEngine(input, renderer, { reducedVfx: true, lootFilter: 'all', aimAssist: true });
  assert.ok(game.start('warden', 'thornseer'));
  return game;
};
const reachLevel = (game, target) => {
  while (game.player.level < target) game._gainXp(LEVEL_XP[game.player.level - 1]);
};
const reachParagon = (game, target) => {
  while (game.player.leveling.paragonRank < target) game._gainXp(paragonXpForRank(game.player.leveling.paragonRank));
};

assert.equal(MAX_LEVEL, 100, 'the mortal leveling road must reach 100');
assert.equal(LEVEL_REWARDS.length, 100, 'every level from 1-100 needs an authored reward');
assert.equal(JOURNEY_BANDS.length, 18, 'the upper road needs eight additional Journey chapters');
assert.equal(JOURNEY_BANDS.flatMap((band) => band.tasks).length, 108, 'the Journey needs 108 persistent trials');
assert.ok(JOURNEY_BANDS.every((band) => band.tasks.length === 6), 'every stage needs six different objectives');
assert.equal(PILLARS.length, 6, 'permanent growth needs six competing Pillars');
assert.ok(PILLARS.every((pillar) => pillar.maxRank === 15 && pillar.milestones.length === 4), 'Pillars need an apex rank-15 breakthrough');
assert.equal(ASCENSION_TIERS.length, 20, 'an Ascension choice should arrive every five levels through 100');
assert.ok(ASCENSION_TIERS.every((tier) => tier.choices.length === 3), 'each Ascension needs three alternatives');
assert.equal(PARAGON_BOARDS.length, 8, 'endgame needs eight distinct Paragon boards');
assert.equal(PARAGON_BOARDS.flatMap((board) => board.nodes).length, 120, 'the Atlas needs 120 routed nodes');
assert.equal(PARAGON_GLYPHS.length, 10, 'the Atlas needs ten upgradeable Glyphs');

const game = makeGame();
assert.equal(game.player.leveling.pillarPoints, 1, 'a new covenant should make an immediate Pillar choice');
const untrainedPower = game.getStats().power;
assert.ok(game.investPillar('might'));
assert.equal(game.player.leveling.pillarRanks.might, 1);
assert.ok(game.getStats().power > untrainedPower, 'Pillar ranks must alter live combat stats');

reachLevel(game, 10);
assert.equal(game.player.skillPoints, 9, 'the original skill-point cadence must be preserved');
assert.equal(game.player.leveling.pillarPoints, 5, 'even levels should add Pillar points after the starting investment');
assert.equal(game.player.maxPotions, game.player.baseStats.potions + 1, 'level 10 should reinforce the flask');
const preAscensionPower = game.getStats().power;
assert.ok(game.chooseAscension(5, 'first-flame'));
assert.ok(game.getStats().power > preAscensionPower * 1.09, 'Ascension choices must be build-shaping');
assert.ok(!game.chooseAscension(5, 'road-ward'), 'an Ascension tier can only make one choice');
assert.ok(!game.chooseAscension(65, 'vanguard-edge'), 'upper-road Ascensions must remain level-gated');

const firstBand = JOURNEY_BANDS[0];
firstBand.tasks.forEach((entry) => game._recordLevelingProgress(entry.type, entry.target, { tier: 50 }));
let bandState = game.getJourneyBandState(firstBand.id);
assert.equal(bandState.completed, 6);
assert.ok(bandState.cacheReady);
const priorInventory = game.player.inventory.length + game.player.stash.length;
assert.ok(game.claimJourneyReward(firstBand.id));
assert.ok(game.player.inventory.length + game.player.stash.length > priorInventory, 'Journey caches should grant real loot');
bandState = game.getJourneyBandState(firstBand.id);
assert.ok(bandState.masteryReady);
const priorPillarPoints = game.player.leveling.pillarPoints;
assert.ok(game.claimJourneyReward(firstBand.id, true));
assert.equal(game.player.leveling.pillarPoints, priorPillarPoints + 1, 'perfect chapters should add a bonus Pillar point');

reachLevel(game, 60);
const skillPointsAtSixty = game.player.skillPoints;
reachLevel(game, 61);
assert.equal(game.player.skillPoints, skillPointsAtSixty, 'levels 61-100 must not create unusable skill points');
assert.equal(game.getJourneyBandState('ashen-vanguard').unlocked, true, 'the veteran road should open at level 61');
reachLevel(game, MAX_LEVEL);
assert.equal(game.player.level, MAX_LEVEL);
assert.equal(game.player.skillPoints, 59, 'the complete class constellation keeps its original 59-point budget');
assert.ok(game.chooseAscension(100, 'hundredfold-flame'), 'level 100 needs a final build-defining Ascension');
assert.equal(game.getLevelingOverview().paragon.unlocked, true, 'the Paragon Atlas must open at level 100');

game._gainXp(paragonXpForRank(0));
assert.equal(game.player.leveling.paragonRank, 1, 'post-cap experience should advance Paragon ranks');
assert.equal(game.player.leveling.paragonPoints, 1, 'each Paragon rank should award one Atlas point');
const preEntryPower = game.getStats().power;
assert.ok(game.allocateParagonNode('covenant-heart:entry'));
assert.ok(game.getStats().power > preEntryPower, 'allocated Paragon nodes must affect live combat stats');

reachParagon(game, 15);
for (const nodeId of [
  'covenant-heart:right-one', 'covenant-heart:right-two', 'covenant-heart:right-rare',
  'covenant-heart:right-bridge', 'covenant-heart:legendary', 'covenant-heart:right-crown', 'covenant-heart:gate'
]) assert.ok(game.allocateParagonNode(nodeId), `${nodeId} should be reachable along a valid route`);
assert.equal(game.player.leveling.paragonBoardSigils, 1, 'a routed Gate should award a Board Sigil');
assert.ok(game.unlockParagonBoard('warpath'), 'a Board Sigil should attach a new eligible board');
assert.ok(game.player.leveling.paragonBoards.includes('warpath'));

assert.ok(game.allocateParagonNode('covenant-heart:socket'), 'the central Glyph socket should connect from either branch');
const beforeGlyph = game.getStats().power;
assert.ok(game.socketParagonGlyph('covenant-heart:socket', 'ember'));
assert.ok(game.getStats().power > beforeGlyph, 'socketed Glyph ranks must alter live stats');
assert.ok(game.upgradeParagonGlyph('ember'), 'Paragon ranks should provide enough Embers to upgrade a Glyph');
assert.equal(game.player.leveling.paragonGlyphs.ember, 2);

game.player.gold = 100_000;
assert.ok(game.respecParagon(), 'the full Atlas should be safely rekindled');
assert.deepEqual(game.player.leveling.paragonBoards, ['covenant-heart']);
assert.equal(Object.keys(game.player.leveling.paragonAllocated).length, 0);
assert.equal(game.player.leveling.paragonPoints, game.player.leveling.paragonRank);
assert.equal(game.player.leveling.paragonGlyphs.ember, 2, 'Glyph growth should survive an Atlas respec');

assert.ok(game.save());
const snapshot = game.snapshot();
assert.equal(snapshot.version, 19);
assert.ok(snapshot.player.leveling?.journeyProgress && snapshot.player.leveling?.paragonBoards, 'all new progression must serialize');
const restored = new GameEngine(input, renderer, { reducedVfx: true, lootFilter: 'all', aimAssist: true });
assert.ok(restored.continueRun());
assert.equal(restored.player.leveling.paragonRank, 15);
assert.equal(restored.player.leveling.paragonGlyphs.ember, 2);

const legacySnapshot = restored.snapshot();
legacySnapshot.version = 11;
legacySnapshot.player.level = 60;
legacySnapshot.player.xp = 0;
legacySnapshot.player.leveling.legacyRank = 12;
legacySnapshot.player.leveling.legacyXp = 700;
legacySnapshot.player.leveling.legacyPoints = 9;
legacySnapshot.player.leveling.legacyPaths['last-bell'] = 3;
delete legacySnapshot.player.leveling.paragonRank;
delete legacySnapshot.player.leveling.paragonXp;
delete legacySnapshot.player.leveling.paragonPoints;
delete legacySnapshot.player.leveling.paragonBoards;
delete legacySnapshot.player.leveling.paragonAllocated;
delete legacySnapshot.player.leveling.paragonBoardSigils;
delete legacySnapshot.player.leveling.paragonGlyphs;
delete legacySnapshot.player.leveling.paragonGlyphEmbers;
delete legacySnapshot.player.leveling.paragonSockets;
store.set('ashen-covenant.modular.save.v1', JSON.stringify(legacySnapshot));
const migratedLegacy = new GameEngine(input, renderer, { reducedVfx: true, lootFilter: 'all', aimAssist: true });
assert.ok(migratedLegacy.continueRun(), 'v1.1 Legacy saves must migrate safely');
assert.equal(migratedLegacy.player.leveling.paragonRank, 12, 'Legacy ranks should become banked Paragon ranks');
assert.equal(migratedLegacy.player.leveling.legacyPaths['last-bell'], 3, 'invested Legacy bonuses must remain as permanent Imprints');
assert.equal(migratedLegacy.getLevelingOverview().paragon.unlocked, false, 'banked Paragon points remain locked until level 100');
reachLevel(migratedLegacy, MAX_LEVEL);
assert.equal(migratedLegacy.player.leveling.paragonPoints, 12, 'banked Legacy ranks should become spendable at level 100');

const worldfallSnapshot = migratedLegacy.snapshot();
worldfallSnapshot.version = 10;
worldfallSnapshot.player.level = 60;
delete worldfallSnapshot.player.leveling;
store.set('ashen-covenant.modular.save.v1', JSON.stringify(worldfallSnapshot));
const migratedWorldfall = new GameEngine(input, renderer, { reducedVfx: true, lootFilter: 'all', aimAssist: true });
assert.ok(migratedWorldfall.continueRun(), 'Worldfall saves must migrate into the 100-level system');
assert.ok(migratedWorldfall.player.leveling.pillarPoints >= 31, 'level-60 Worldfall saves should receive catch-up Pillar points');
assert.equal(migratedWorldfall.getLevelingOverview().bands.length, 18);

console.log('Ashen Covenant 100-level Journey and Paragon Atlas test passed.');
