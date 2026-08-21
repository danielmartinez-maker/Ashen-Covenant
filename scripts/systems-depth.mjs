import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key)
};

const { GameEngine } = await import('../src/systems/game.js');

const input = {
  pointer: { active: true, worldX: 860, worldY: 620 },
  tick() {}, updateWorldPointer() {}, getMove() { return { x: 0, y: 0, moving: false }; }, getAimDirection() { return null; },
  isHeld() { return false; }, consume() { return false; }, defer() {}, press() {}, rumble() {}
};
const renderer = { viewport: { width: 1280, height: 720, scale: 1 } };
const game = new GameEngine(input, renderer, { reducedVfx: true, lootFilter: 'all', aimAssist: true });

assert.ok(game.start('warden', 'thornseer'));
// The systemic/endgame checks begin after the Chapter I campaign gate.
game._setCampaignStage('chapter-one-complete');
game.player.level = 30;
game.player.skillPoints = 60;
game.player.gold = 20_000;
game.player.materials = { cinders: 500, echoes: 20, shards: 50, prisms: 10, marks: 0, alloys: 20, cores: 0 };
game._refreshPlayerStats(true);

const companion = game.getCompanionTechnique();
assert.match(companion.name, /Echo: Hex Bolt/, 'the selected companion oath must expose a live technique');
game.player.resource = game.player.maxResource;
game._companionTechnique();
assert.ok(game.entities.projectiles.some((projectile) => projectile.kind === 'echo-hex'), 'the companion technique must create an actual combat projectile');

const hybridId = game.getHybrid().id;
const echoNode = game.getSkillNodes().find((node) => node.id === `${hybridId}-echo`);
const resonanceNode = game.getSkillNodes().find((node) => node.id === `${hybridId}-resonance`);
assert.ok(echoNode && resonanceNode, 'hybrid progression must include companion and resonance branches');
game.player.skillRanks[`${hybridId}-1`] = 1;
assert.ok(game.upgradeSkill(echoNode.id));
assert.ok(game.upgradeSkill(echoNode.id));
game.player.skillRanks[`${hybridId}-3`] = 1;
assert.ok(game.upgradeSkill(resonanceNode.id), 'resonance should unlock after its explicit hybrid prerequisites');

const relic = game._generateItem({ rarity: 'relic', sourceId: 'gravewake' });
game.player.inventory.push(relic);
game.player.runes['cinder-rune'] = 1;
assert.ok(game.inscribeRune(relic.id, 'cinder-rune'), 'a rune should inscribe into a live relic');
assert.equal(relic.runeId, 'cinder-rune');
assert.ok(game.masterworkItem(relic.id), 'a relic should progress through the masterwork forge');
assert.equal(relic.masterwork, 1);

const unique = game._generateItem(true);
game.player.inventory.push(unique);
assert.ok(game.extractAspect(unique.id), 'unique relics should be extractable into the Aspect Codex');
assert.ok(game.player.aspects[unique.uniqueId]);
assert.ok(game.attuneAspect(unique.uniqueId), 'an extracted aspect should be attunable');
assert.ok(game.hasPower(unique.uniqueId), 'an attuned aspect must activate its gameplay power');

game.entities.enemies = [];
const executionTarget = game._spawnEnemy('mireling', game.player.x + 35, game.player.y, { group: 'execution' });
executionTarget.knockdown = 1;
assert.ok(game._executeEnemy(executionTarget), 'staggered enemies should support a dedicated execution action');
assert.ok(executionTarget.dead, 'a normal execution should resolve the target');

const cairn = game.getZoneProgress('cairnreach');
const priorCorruption = cairn.corruption;
assert.ok(game._startWorldEvent('invasion', { strongholdId: 'trial', zoneId: 'cairnreach' }), 'a stronghold should start a persistent world event');
game._completeWorldEvent();
assert.ok(game.player.worldProgress.strongholds.trial, 'world events should permanently reclaim strongholds');
assert.ok(cairn.corruption < priorCorruption, 'clearing a stronghold should lower regional corruption');

game.worldEvent = null;
game.player.nemeses = [];
// The stronghold clear deliberately creates a calm period; expire it here so
// this independent event-accounting check exercises the normal spawn path.
cairn.calmUntil = 0;
assert.ok(game._startWorldEvent('caravan', { zoneId: 'cairnreach' }), 'a normal world event should start with an exact objective count');
assert.equal(game.entities.enemies.filter((enemy) => enemy.eventId === game.worldEvent.id).length, game.worldEvent.target, 'world events must not leave untracked enemies after their objective completes');
game.worldEvent = null;
game.entities.enemies = [];
assert.ok(game._startWorldEvent('nemesis', { zoneId: 'cairnreach' }), 'a missing nemesis should safely fall back to a normal event');
assert.notEqual(game.worldEvent.name, 'Nemesis Return', 'a Nemesis Return requires a recorded nemesis');
game.worldEvent = null;
game.entities.enemies = [];

assert.ok(game.startEndgame('arena', 4));
assert.equal(game.endgame.waveIndex, 1, 'endgame should start with one bounded wave instead of spawning every wave at once');
game.entities.enemies.filter((enemy) => !enemy.dead).forEach((enemy) => game._damageEnemy(enemy, enemy.maxHp * 4, { source: 'test', stagger: 0 }));
game._updateEndgame(1);
assert.equal(game.endgame.waveIndex, 2, 'clearing a wave should advance the activity instead of finishing it immediately');

game.endgame = null;
game.entities.enemies = [];
const victor = game._spawnEnemy('ashbow', game.player.x + 32, game.player.y, { group: 'nemesis' });
game.player.deathTime = 0;
game._die();
assert.ok(game.player.nemeses.some((nemesis) => nemesis.templateId === victor.templateId), 'a nearby killer should be recorded as a returning nemesis');

game.player.deathTime = 0;
game.player.hp = game.player.maxHp;
assert.ok(game.save());
const restored = new GameEngine(input, renderer, { reducedVfx: true });
assert.ok(restored.continueRun(), 'expanded progression state must survive a save/load round trip');
assert.ok(restored.player.worldProgress.strongholds.trial, 'world progress must persist through saves');
assert.ok(restored.player.aspects[unique.uniqueId], 'aspect codex entries must persist through saves');

console.log('Ashen Covenant core-system depth test passed.');
