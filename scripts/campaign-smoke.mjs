import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key)
};

const { GameEngine } = await import('../src/systems/game.js');

const input = {
  pointer: { active: true, worldX: 820, worldY: 620 },
  tick() {}, updateWorldPointer() {}, getMove() { return { x: 0, y: 0, moving: false }; }, getAimDirection() { return null; }, isHeld() { return false; }, consume() { return false; }, defer() {}, press() {}, rumble() {}
};
const renderer = { viewport: { width: 1280, height: 720, scale: 1 } };
const killGroup = (game, campaignId) => {
  const group = game.entities.enemies.filter((enemy) => enemy.campaignId === campaignId && !enemy.dead);
  assert.ok(group.length > 0, `${campaignId} must create a live authored encounter`);
  group.forEach((enemy) => game._damageEnemy(enemy, enemy.maxHp * 4, { source: 'campaign-test', stagger: 0 }));
};

const game = new GameEngine(input, renderer, { reducedVfx: true, lootFilter: 'all', aimAssist: true });
assert.ok(game.start('warden', 'thornseer'));
assert.equal(game.getCampaign().stageId, 'meet-maelin', 'new covenants should start Chapter I at the Sanctuary Gate');

const maelin = game.entities.landmarks.find((entry) => entry.id === 'maelin');
game.player.x = maelin.x; game.player.y = maelin.y;
assert.ok(game.interact());
assert.equal(game.getCampaign().stageId, 'reach-waystone');

const waystone = game.entities.landmarks.find((entry) => entry.id === 'gravewake-waystone');
game.player.x = waystone.x; game.player.y = waystone.y;
assert.ok(game.interact());
assert.equal(game.getCampaign().stageId, 'clear-bell-risen');
killGroup(game, 'chapter-one-bell-risen');
assert.equal(game.getCampaign().stageId, 'defeat-bell-witness');
const witness = game.entities.enemies.find((enemy) => enemy.campaignId === 'chapter-one-witness' && !enemy.dead);
assert.ok(witness?.boss && witness.campaignBoss, 'the Bell-Witness must remain a phase-driven campaign boss');
game._damageEnemy(witness, witness.maxHp * 4, { source: 'campaign-test', stagger: 0 });
assert.equal(game.getCampaign().stageId, 'return-maelin');

game.player.x = maelin.x; game.player.y = maelin.y;
assert.ok(game.interact());
assert.equal(game.getCampaign().stageId, 'chapter-one-complete');
assert.equal(game.getCampaign().completed, true);
assert.equal(game.entities.enemies.some((enemy) => enemy.campaignId === 'chapter-two-abbot'), false, 'Rath Vell must not be a free-roam boss before Chapter II begins');

// Start Chapter II from the Chapter I handoff, then receive Maelin's Bellscar briefing.
assert.ok(game.interact());
assert.equal(game.getCampaign().chapterId, 'chapter-two');
assert.equal(game.getCampaign().stageId, 'maelin-bellscar-briefing');
assert.ok(game.acknowledgeCampaignDialogue('chapter-two-opening'));
assert.ok(game.interact());
assert.equal(game.getCampaign().stageId, 'enter-bellscar');

const gate = game.entities.landmarks.find((entry) => entry.id === 'bell-gate');
game.player.x = gate.x; game.player.y = gate.y;
assert.ok(game.interact());
assert.equal(game.getCampaign().stageId, 'break-choir-seals');

for (const sealId of ['golden-choir', 'ashen-choir', 'hollow-choir']) killGroup(game, `chapter-two-seal:${sealId}`);
assert.equal(game.getCampaign().stageId, 'choose-the-toll', 'all three seals must advance to the Reliquary choice');
assert.deepEqual(new Set(game.getCampaign().flags.choirSeals), new Set(['golden-choir', 'ashen-choir', 'hollow-choir']));

const reliquary = game.entities.landmarks.find((entry) => entry.id === 'reliquary-names');
game.player.x = reliquary.x; game.player.y = reliquary.y;
assert.ok(game.interact());
assert.ok(game.acknowledgeCampaignDialogue('reliquary-awakens'));
assert.ok(game.chooseChoirVerdict('sever-choir'));
assert.equal(game.getChoirVerdict(), 'sever-choir');
assert.equal(game.getCampaign().stageId, 'defeat-tolling-abbot');

const abbot = game.entities.enemies.find((enemy) => enemy.campaignId === 'chapter-two-abbot' && !enemy.dead);
assert.ok(abbot?.boss && abbot.campaignBoss, 'Rath Vell must be a live chapter boss');
assert.equal(abbot.choirVerdict, 'sever-choir');
abbot.shield = 0;
abbot.hp = abbot.maxHp * 0.6;
game._updateBossPhase(abbot);
assert.equal(abbot.phase, 2, 'the Abbot must enter a distinct second phase');
game._damageEnemy(abbot, abbot.maxHp * 4, { source: 'campaign-test', stagger: 0 });
assert.equal(game.getCampaign().stageId, 'return-maelin-two');
assert.ok([...game.player.inventory, ...game.player.stash].some((item) => item.uniqueId === 'last-peal'), 'the selected verdict must award its matching unique relic');

game.player.x = maelin.x; game.player.y = maelin.y;
assert.ok(game.interact());
assert.equal(game.getCampaign().stageId, 'chapter-two-complete');
assert.equal(game.getCampaign().completed, true);

assert.ok(game.save());
const restored = new GameEngine(input, renderer, { reducedVfx: true, lootFilter: 'all', aimAssist: true });
assert.ok(restored.continueRun());
assert.equal(restored.getCampaign().chapterId, 'chapter-two');
assert.equal(restored.getCampaign().stageId, 'chapter-two-complete', 'Chapter II state and its verdict must survive save/load');
assert.equal(restored.getChoirVerdict(), 'sever-choir');
assert.ok(restored.getCampaignJournal().chapters.find((chapter) => chapter.id === 'chapter-one')?.completed, 'the journal must retain Chapter I completion after advancing');
assert.ok(restored.getCampaignJournal().chapters.find((chapter) => chapter.id === 'chapter-two')?.completed, 'the journal must retain Chapter II completion after saving');

// The alternative verdict is a real branch, not a cosmetic label.
const alternate = new GameEngine(input, renderer, { reducedVfx: true });
assert.ok(alternate.start('ironbound', 'veilrunner'));
alternate._setCampaignStage('chapter-one-complete', 1);
assert.ok(alternate._beginChapterTwo());
alternate._setCampaignStage('choose-the-toll');
assert.ok(alternate.chooseChoirVerdict('bind-choir'));
assert.equal(alternate.getChoirVerdict(), 'bind-choir');
assert.ok(alternate.getStats().ward > 1, 'binding the choir must grant a persistent defensive mechanical change');
assert.equal(alternate.entities.enemies.find((enemy) => enemy.campaignId === 'chapter-two-abbot')?.choirVerdict, 'bind-choir');

console.log('Ashen Covenant Chapter II campaign smoke test passed.');
