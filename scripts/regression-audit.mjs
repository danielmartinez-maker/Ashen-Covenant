import assert from 'node:assert/strict';
import { GameEngine } from '../src/systems/game.js';
import { loadSettings } from '../src/systems/save.js';
import { CLASS_IDS } from '../src/data/classes.js';

const store = new Map();
let failWrites = false;
globalThis.localStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => {
    if (failWrites) throw new Error('storage unavailable');
    store.set(key, String(value));
  },
  removeItem: (key) => store.delete(key)
};

const createInput = () => ({
  pointer: { active: true, worldX: 860, worldY: 620 },
  tick() {}, updateWorldPointer() {}, getMove() { return { x: 0, y: 0, moving: false }; }, getAimDirection() { return null; },
  isHeld() { return false; }, consume() { return false; }, defer() {}, press() {}
});
const renderer = { viewport: { width: 1280, height: 720, scale: 1 } };
const makeGame = (primary = 'warden', secondary = 'thornseer') => {
  const game = new GameEngine(createInput(), renderer, { reducedVfx: true });
  assert.ok(game.start(primary, secondary));
  return game;
};
const equipUnique = (game, uniqueId, slot) => {
  game.player.equipment[slot] = { id: `${uniqueId}-test`, slot, rarity: 'unique', uniqueId, name: uniqueId, icon: '◇', affixes: [] };
};

store.set('ashen-covenant.modular.settings.v1', '"bad settings"');
assert.equal(loadSettings().sound, true, 'non-object settings must fall back safely');

const sanctuaryGame = makeGame();
sanctuaryGame.returnToSanctuary();
assert.equal(sanctuaryGame.entities.enemies.length, 0, 'returning to Sanctuary must leave the road clear instead of rebuilding an ambient horde');
sanctuaryGame.entities.loot.push({ id: 'kept-loot', x: 0, y: 0, item: sanctuaryGame._generateItem(false), life: 30, bob: 0 });
// Endgame is now earned by finishing the authored Chapter I route.  This
// audit is about preserving loot during the transition, so unlock it without
// duplicating the campaign-specific integration test.
sanctuaryGame._setCampaignStage('chapter-one-complete');
assert.ok(sanctuaryGame.startEndgame('arena', 1));
assert.ok(sanctuaryGame.entities.loot.some((drop) => drop.id === 'kept-loot'), 'opening endgame must not silently delete uncollected loot');

const bossGame = makeGame();
bossGame._setCampaignStage('chapter-one-complete');
assert.ok(bossGame._beginChapterTwo());
bossGame._setCampaignStage('defeat-tolling-abbot');
assert.ok(bossGame._spawnCampaignTollingAbbot());
const boss = bossGame.entities.enemies.find((enemy) => enemy.campaignId === 'chapter-two-abbot');
assert.ok(boss, 'the Chapter II Bellscar vault must surface the campaign boss');
boss.hp = boss.maxHp * 0.5;
bossGame.player.x = boss.x - 48;
bossGame.player.y = boss.y;
bossGame.player.iframes = Infinity;
for (let frame = 0; frame < 8000; frame += 1) bossGame.update(1 / 60);
const livingBossMinions = bossGame.entities.enemies.filter((enemy) => !enemy.dead && enemy.group === boss.group && !enemy.boss).length;
assert.ok(livingBossMinions <= 12, 'phase-two boss summons must remain bounded');
assert.ok(bossGame.entities.projectiles.length <= 180 && bossGame.entities.hazards.length <= 90 && bossGame.entities.particles.length <= 760, 'long combat must obey renderer safety ceilings');

const rawCorrupt = {
  primary: 'warden', secondary: 'thornseer',
  player: {
    level: 1, hp: 77, resource: 21, inventory: 'not an array', stash: [{ slot: 'weapon' }],
    equipment: { weapon: { id: 'broken-weapon', slot: 'weapon', affixes: 'not an array' } },
    skillRanks: { 'warden-edge': 99 }, materials: { cinders: 'nope', echoes: -8 }
  }
};
store.set('ashen-covenant.modular.save.v1', JSON.stringify(rawCorrupt));
const recoveredGame = new GameEngine(createInput(), renderer, { reducedVfx: true });
assert.ok(recoveredGame.hasSave());
assert.ok(recoveredGame.continueRun(), 'partially malformed saves should recover without throwing');
assert.equal(recoveredGame.player.hp, 77, 'valid saved health must restore exactly rather than being ratio-shifted');
assert.equal(recoveredGame.player.equipment.weapon.affixes.length, 0, 'invalid affix collections must normalize safely');
assert.equal(recoveredGame.getTalentRank('warden-edge'), 0, 'save data cannot grant impossible skill ranks');
assert.equal(recoveredGame.player.materials.echoes, 0, 'negative materials must not survive recovery');

const unplayableRaw = JSON.stringify({ primary: 'warden', secondary: 'thornseer' });
store.set('ashen-covenant.modular.save.v1', unplayableRaw);
const invalidGame = new GameEngine(createInput(), renderer, { reducedVfx: true });
assert.equal(invalidGame.hasSave(), false);
assert.equal(invalidGame.continueRun(), false);
assert.equal(store.get('ashen-covenant.modular.save.v1'), unplayableRaw, 'unplayable saves must not be overwritten while loading');

const saveFailureGame = makeGame();
failWrites = true;
assert.equal(saveFailureGame.save(), false, 'storage write failures must not crash the game loop');
failWrites = false;

const speedGame = makeGame();
const baseSpeed = speedGame.getStats().speed;
speedGame.player.equipment.boots = { id: 'quick-boots', slot: 'boots', rarity: 'rare', affixes: [{ stat: 'speed', value: 0.12, percentage: true }] };
assert.ok(speedGame.getStats().speed > baseSpeed * 1.11, 'percentage speed affixes must affect movement as percentages');

const ironGame = makeGame('ironbound', 'warden');
ironGame.player.skillRanks['iron-core'] = 2;
assert.equal(ironGame.getStats().staggerMultiplier, 1.18, 'Cairn Core must increase stagger damage');
equipUnique(ironGame, 'cairnheart', 'chest');
ironGame._canSpend(1);
assert.ok(ironGame.entities.effects.some((effect) => effect.kind === 'arc'), 'Cairnheart must pulse when Guard is spent');

const veilGame = makeGame('veilrunner', 'warden');
veilGame.player.skillRanks['veil-rift'] = 1;
veilGame.player.resource = 0;
veilGame._dodge();
assert.equal(veilGame.player.resource, 8, 'Rift Hunger must restore Momentum after a dodge');
equipUnique(veilGame, 'riftglass', 'weapon');
veilGame.player.cooldowns.dodge = 0;
veilGame._dodge();
assert.ok(veilGame.entities.projectiles.some((projectile) => projectile.kind === 'riftglass-echo'), 'Riftglass must create a delayed Veil Knife echo');

const wardenGame = makeGame();
equipUnique(wardenGame, 'bell-sunder', 'weapon');
wardenGame.entities.enemies = [];
wardenGame._spawnEnemy('mireling', wardenGame.player.x + 58, wardenGame.player.y, { group: 'test' });
wardenGame.player.facing = 0;
wardenGame._skillOne();
wardenGame._updateProjectiles(0.11);
assert.ok(wardenGame.entities.projectiles.some((projectile) => projectile.kind === 'returning-spirit'), 'Bell-Sunder must create a returning Spirit Nail');
equipUnique(wardenGame, 'briar-writ', 'amulet');
wardenGame.player.resource = wardenGame.player.maxResource;
wardenGame._hybridSignature();
const thornwall = wardenGame.entities.hazards.find((hazard) => hazard.kind === 'thornwall');
assert.equal(thornwall.retaliationCount, 3, 'Briar Writ must triple Thornwall retaliation');
assert.ok(thornwall.life > 8.7, 'Briar Writ must extend Thornwall duration');

const thornGame = makeGame('thornseer', 'warden');
equipUnique(thornGame, 'last-briar', 'head');
const cursedTarget = thornGame._spawnEnemy('mireling', thornGame.player.x + 80, thornGame.player.y, { group: 'test', engaged: true });
cursedTarget.cursed = 4;
thornGame._skillTwo();
assert.equal(thornGame.entities.hazards.at(-1).followEnemyId, cursedTarget.id, 'Crown of the Last Briar must follow cursed prey');

const cairnGame = makeGame('ironbound', 'warden');
equipUnique(cairnGame, 'covenant-anvil', 'weapon');
cairnGame._hybridSignature();
assert.ok(cairnGame.entities.hazards.some((hazard) => hazard.kind === 'armor-shard'), 'Covenant Anvil must leave an armor-shard trail');

const orchidGame = makeGame('thornseer', 'veilrunner');
equipUnique(orchidGame, 'night-orchid', 'ring');
orchidGame.entities.enemies = [];
const orchidTarget = orchidGame._spawnEnemy('cinderbrute', orchidGame.player.x + 80, orchidGame.player.y, { group: 'test' });
orchidGame.random = () => 0;
orchidGame._damageEnemy(orchidTarget, 1, { source: 'orchid', color: '#fff' });
assert.ok(orchidGame.entities.projectiles.some((projectile) => projectile.kind === 'orchid-twin'), 'Night Orchid must create a second shade seed on critical hits');

const gallowsGame = makeGame('ironbound', 'veilrunner');
equipUnique(gallowsGame, 'gallows-key', 'amulet');
gallowsGame.entities.enemies = [];
const elite = gallowsGame._spawnEnemy('mireling', gallowsGame.player.x + 40, gallowsGame.player.y, { group: 'test', elite: true });
gallowsGame.player.facing = 0;
gallowsGame._hybridSignature();
assert.ok(elite.knockdown >= 1.45, 'Gallows Key must suspend elites hit by Gallows Run');
gallowsGame._damageEnemy(elite, 100000, { source: 'hybrid', color: '#fff' });
assert.ok(gallowsGame.player.cooldowns.hybrid <= gallowsGame.getHybrid().signature.cooldown * 0.5, 'Gallows Key must refund hybrid cooldown on an elite execution');

const assertFiniteTree = (value, label = 'state') => {
  if (typeof value === 'number') assert.ok(Number.isFinite(value), `${label} contains a non-finite number`);
  else if (Array.isArray(value)) value.forEach((entry, index) => assertFiniteTree(entry, `${label}[${index}]`));
  else if (value && typeof value === 'object' && !(value instanceof Set)) Object.entries(value).forEach(([key, entry]) => assertFiniteTree(entry, `${label}.${key}`));
};
const classPairs = CLASS_IDS.flatMap((primary, index) => CLASS_IDS.slice(index + 1).map((secondary) => [primary, secondary]));
for (const pair of classPairs) {
  const stressGame = makeGame(...pair);
  stressGame._setCampaignStage('chapter-one-complete');
  stressGame.player.iframes = 1_000_000;
  const actions = ['attack', 'skillOne', 'skillTwo', 'dodge', 'hybrid', 'ultimate'];
  for (let frame = 0; frame < 2_500; frame += 1) {
    if (frame % 31 === 0) {
      stressGame.player.resource = stressGame.player.maxResource;
      stressGame._performAction(actions[Math.floor(frame / 31) % actions.length]);
    }
    stressGame.update(1 / 60);
    if (frame === 700) {
      stressGame.startEndgame('arena', 5);
      stressGame.player.iframes = 1_000_000;
    }
    if (frame === 1_500) {
      stressGame.returnToSanctuary();
      stressGame.player.iframes = 1_000_000;
    }
  }
  assertFiniteTree(stressGame.player, `${pair.join('+')} player`);
  assertFiniteTree(stressGame.entities, `${pair.join('+')} entities`);
  assert.ok(stressGame.entities.projectiles.length <= 180 && stressGame.entities.hazards.length <= 90 && stressGame.entities.effects.length <= 260 && stressGame.entities.particles.length <= 760, `${pair.join('+')} must remain within performance ceilings`);
}

console.log('Ashen Covenant regression audit passed.');
