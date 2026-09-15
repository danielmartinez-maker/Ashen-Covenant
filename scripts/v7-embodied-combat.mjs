import assert from 'node:assert/strict';
import { GameEngine } from '../src/systems/game.js';
import { GamePresentationSystem } from '../src/presentation/system.js';
import { ALIGNMENT_IDS } from '../src/systems/covenant.js';

const makeStore = () => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key)
  };
  return store;
};

const makeInput = () => ({
  pointer: { active: false, down: false, commandDirty: false, worldX: 0, worldY: 0 },
  tick() {},
  updateWorldPointer() {},
  getMove() { return { x: 0, y: 0, moving: false }; },
  getAimDirection() { return null; },
  isHeld() { return false; },
  consume() { return false; },
  defer() {},
  press() {},
  rumble() {}
});

const makeRenderer = () => ({
  viewport: { width: 1440, height: 900, scale: 1 },
  getAssetStatus: () => ({ ready: true, failed: [] })
});

const makeFixture = (primary = 'warden', secondary = 'thornseer', settings = {}) => {
  makeStore();
  const controls = makeInput();
  const played = [];
  const audio = {
    attach() {},
    update() {},
    playResolved(event) { played.push(event); return true; },
    debug() { return { activeVoices: 0, categoryVoices: { impact: 0, footstep: 0, enemyVocal: 0, ambience: 0 } }; }
  };
  const game = new GameEngine(controls, makeRenderer(), {
    sound: true,
    reducedVfx: false,
    reducedMotion: false,
    reducedFlashing: true,
    ...settings
  });
  const presentation = new GamePresentationSystem(game, {
    input: controls,
    settings: game.settings,
    audio,
    strictEvents: true
  });
  assert.equal(game.start(primary, secondary), true, `${primary}+${secondary} must start`);
  presentation.update(1 / 60);
  return { game, presentation, played };
};

const tuneAffinity = (game, affinity, minimumStage = 5) => {
  const tag = `${affinity}bound`;
  for (let attempt = 0; attempt < 40 && game.getCovenantOverview().stage < minimumStage; attempt += 1) {
    game.recordCovenantBehavior([tag], 10, { regionId: 'gravewake' });
  }
  game._refreshPlayerStats(true);
  const overview = game.getCovenantOverview();
  assert.equal(overview.primary, affinity, `${tag} must make ${affinity} dominant`);
  assert.ok(overview.stage >= minimumStage && overview.stage <= 5, `${tag} must reach stage ${minimumStage}..5`);
  return overview;
};

const pairings = [
  ['warden', 'thornseer'],
  ['thornseer', 'ironbound'],
  ['ironbound', 'veilrunner'],
  ['veilrunner', 'gravebinder'],
  ['gravebinder', 'dawnstrider'],
  ['dawnstrider', 'warden']
];

for (let index = 0; index < pairings.length; index += 1) {
  const [primary, secondary] = pairings[index];
  const affinity = ALIGNMENT_IDS[index];
  const { game, presentation, played } = makeFixture(primary, secondary, {
    reducedVfx: index % 2 === 1,
    reducedMotion: index % 3 === 1,
    reducedFlashing: true
  });
  const covenant = tuneAffinity(game, affinity, 5);
  presentation.update(1 / 60);

  assert.equal(game.player.presentation.combatContext.primaryClass, primary);
  assert.equal(game.player.presentation.combatContext.secondaryClass, secondary);
  assert.ok(game.player.presentation.resolvedClip.clipId.startsWith(`${primary}:`), `${primary} must resolve its v7 clip family`);
  assert.equal(game.player.covenantPresentation.affinity, affinity);
  assert.equal(game.player.covenantPresentation.stage, covenant.stage);
  assert.ok(game.player.presentation.equipmentAppearance, `${primary} must resolve equipment appearance`);
  assert.equal(presentation.eventBus.stats.listenerErrors, 0, `${primary}+${secondary} must have no presentation listener errors`);

  game.entities.enemies = [];
  const enemy = game._spawnEnemy('cairnguard', game.player.x + 52, game.player.y, {
    level: 20,
    group: `v7-${primary}`,
    engaged: true
  });
  enemy.guard = Math.max(1, enemy.guard ?? 1);
  game.presentation.emit('combat:attack-impact', {
    entityId: enemy.id,
    targetId: enemy.id,
    critical: true,
    hitResult: { weight: 'heavy', guarded: true, guardBroken: true, staggered: true },
    damageType: 'physical',
    material: 'plate'
  }, { source: 'v7-integrated-test' });
  assert.ok(played.some((event) => event.layers.some((layer) => layer.assetId === 'guard-break')), `${primary} impact must layer guard-break audio`);
  assert.ok(played.some((event) => event.layers.some((layer) => layer.assetId === 'poise-break')), `${primary} impact must layer poise-break audio`);
}

for (let desiredStage = 1; desiredStage <= 5; desiredStage += 1) {
  const { game, presentation } = makeFixture('warden', 'thornseer');
  let applications = 0;
  while (game.getCovenantOverview().stage < desiredStage && applications < 40) {
    game.recordCovenantBehavior(['gravebound'], 2, { regionId: 'gravewake' });
    applications += 1;
  }
  game._refreshPlayerStats(true);
  const covenant = game.getCovenantOverview();
  assert.ok(covenant.stage >= desiredStage && covenant.stage <= 5, `behavior API must reach Covenant stage ${desiredStage}`);
  presentation.update(1 / 60);
  assert.equal(game.player.covenantPresentation.stage, covenant.stage);
  assert.equal(game.player.presentation.combatContext.covenantStage, covenant.stage);
  assert.equal(presentation.eventBus.stats.listenerErrors, 0);
}

{
  const { game, presentation } = makeFixture('warden', 'thornseer');
  for (let index = 0; index < 8; index += 1) {
    game.recordCovenantBehavior(['lightbound'], 3, { regionId: 'gravewake' });
    game.recordCovenantBehavior(['voidbound'], 3, { regionId: 'gravewake' });
  }
  game._refreshPlayerStats(true);
  const covenant = game.getCovenantOverview();
  assert.equal(covenant.unstable, true, 'light+void must resolve as an unstable dual affinity');
  assert.ok(covenant.instability > 0, 'unstable dual affinity must accumulate instability');
  presentation.update(1 / 60);
  assert.equal(game.player.presentation.combatContext.covenantInstability > 0, true);
  assert.equal(presentation.eventBus.stats.listenerErrors, 0);
}

{
  const { game, presentation } = makeFixture('warden', 'thornseer');
  tuneAffinity(game, 'grave', 5);
  game.entities.enemies = [];

  const seed = game._spawnEnemy('reedstalker', game.player.x + 160, game.player.y, {
    level: 40,
    group: 'v7-hunter-seed',
    engaged: true,
    elite: true,
    doctrineFaction: 'grave'
  });
  const hunter = game.createHunterFromEnemy(seed, { source: 'physical', damageType: 'physical', burst: true });
  assert.ok(hunter, 'a live elite must promote into a persistent Hunter');
  const stored = game.player.hunters.find((entry) => entry.id === hunter.id);
  assert.ok(stored, 'promoted Hunter must persist in player state');
  stored.nextEligibleAt = 0;
  seed.dead = true;
  const intruder = game.intrudeHunter(hunter.id, {
    zoneId: 'gravewake',
    x: game.player.x + 190,
    y: game.player.y,
    group: 'v7-hunter'
  });
  assert.ok(intruder, 'eligible Hunter must intrude');
  assert.equal(intruder.hunterId, hunter.id);
  presentation.update(1 / 60);
  assert.ok(presentation.eventBus.recent('hunter:intrusion', 1).length >= 1, 'Hunter intrusion must reach the presentation bus');

  const boss = game._spawnEnemy('cryptwarden', game.player.x + 320, game.player.y, { group: 'v7-boss', elite: true });
  boss.hp = boss.maxHp * 0.60;
  game._updateBossPhase(boss);
  assert.equal(boss.phase, 2, 'Cryptwarden must transition into phase two');
  assert.ok(presentation.eventBus.recent('boss:signature-cue', 1).length >= 1, 'boss phase transition must emit a signature cue');
  presentation.update(1 / 60);
  assert.equal(presentation.eventBus.stats.listenerErrors, 0);
}

{
  const { game, presentation, played } = makeFixture('warden', 'thornseer');
  tuneAffinity(game, 'grave', 5);
  game.player.equipment.weapon = {
    id: 'v7-bell',
    slot: 'weapon',
    baseId: 'cleaver',
    rarity: 'unique',
    uniqueId: 'bell-sunder',
    masterwork: 8
  };
  game.player.equipment.amulet = {
    id: 'v7-heart',
    slot: 'amulet',
    baseId: 'obelisk-charm',
    rarity: 'mythic',
    uniqueId: 'heart-of-the-unrung',
    masterwork: 12
  };
  game._refreshPlayerStats(true);
  presentation.update(1 / 60);
  const appearance = game.player.presentation.equipmentAppearance;
  assert.ok(appearance.signatureIds.includes('unique:bell-sunder'), 'Unique weapon signature must remain visible');
  assert.ok(appearance.signatureIds.includes('unique:heart-of-the-unrung'), 'Mythic amulet signature must remain visible');

  game.entities.enemies = [];
  const target = game._spawnEnemy('mireling', game.player.x + 35, game.player.y, { group: 'v7-execution' });
  target.knockdown = 1;
  assert.equal(game._executeEnemy(target), true, 'knocked-down enemy must remain execution-eligible');
  for (let step = 0; step < 20 && !target.dead; step += 1) {
    presentation.updateGameplay(0.1);
    presentation.update(1 / 60);
  }
  assert.equal(target.dead, true, 'execution must resolve authoritative gameplay state after its authored presentation window');
  game.presentation.emit('combat:attack-start', { action: 'execution', execution: true }, { source: 'v7-integrated-test' });
  game.presentation.emit('combat:attack-impact', {
    entityId: target.id,
    targetId: target.id,
    action: 'execution',
    execution: true,
    source: 'execution',
    material: 'flesh',
    hitResult: { weight: 'heavy', knockdown: true }
  }, { source: 'v7-integrated-test' });
  assert.ok(played.some((event) => event.semanticId === 'execution-start' && event.layers.some((layer) => layer.assetId === 'execution-start')), 'execution must resolve start audio');
  assert.ok(played.some((event) => event.semanticId === 'execution-contact' && event.layers.some((layer) => layer.assetId === 'execution-contact')), 'execution must resolve contact audio');
  assert.equal(presentation.eventBus.stats.listenerErrors, 0);
}

{
  const { game, presentation } = makeFixture('warden', 'thornseer');
  presentation.update(1 / 60);
  assert.equal(presentation.getContext().playerInTown, true, 'fresh run must present Sanctuary as town context');
  assert.equal(game.startBlackRoadExpedition('funeral-road'), true, 'authored Funeral Road expedition must launch');
  presentation.update(1 / 60);
  assert.notEqual(presentation.getContext().currentDungeon, null, 'Black Road must resolve a dungeon context');
  assert.ok(game.entities.enemies.length >= 1, 'Black Road must populate a live formation');
  assert.ok(game.player.presentation.resolvedClip, 'v7 body clip must survive expedition transition');
  assert.ok(game.player.presentation.equipmentAppearance, 'equipment appearance must survive expedition transition');
  assert.equal(presentation.eventBus.stats.listenerErrors, 0);
}

console.log('Ashen Covenant v7 embodied combat integration regression passed.');