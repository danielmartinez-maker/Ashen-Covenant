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
game.player.level = 30;
game.player.skillPoints = 60;
game.player.gold = 20_000;
game.player.materials = { cinders: 500, echoes: 20 };
game._refreshPlayerStats(true);

// A nearby enemy is required: mastery cannot be farmed in an empty sanctuary.
game.entities.enemies = [];
game._spawnEnemy('mireling', game.player.x + 120, game.player.y, { group: 'mastery' });
for (let index = 0; index < 55; index += 1) game._recordCombatAction('skillOne');
assert.ok(game.getMastery('skillOne').rank >= 3, 'using First Rite in combat should earn mastery ranks');
assert.ok(game.selectMasteryDoctrine('skillOne', 'sunder'), 'rank III mastery should unlock a selectable doctrine');
assert.equal(game.getMasteryDoctrine('skillOne').id, 'sunder');

game.player.resource = game.player.maxResource;
game._skillOne();
assert.ok(game.entities.projectiles.some((projectile) => projectile.sunder), 'the Sundering Thread doctrine must alter the live projectile');

// Alternating combat families forms a bounded Confluence charge.
for (let index = 0; index < 8; index += 1) {
  game._recordCombatAction('skillOne');
  game._recordCombatAction('companion');
  game._recordCombatAction('hybrid');
  game._recordCombatAction('ultimate');
}
assert.ok(game.player.confluence > 0, 'varied combat actions should build Confluence charges');

game.player.abilityMastery.hybrid.xp = 10_000;
game._reconcileMasteryRanks();
assert.ok(game.selectMasteryDoctrine('hybrid', 'ruin'), 'hybrid mastery should support a doctrine choice');
game.player.confluence = 1;
game.player.resource = game.player.maxResource;
game._hybridSignature();
assert.ok(game.entities.hazards.some((hazard) => hazard.kind === 'resonant-rupture'), 'a charged Ruin signature must create its extra combat aftermath');

const relic = game._generateItem(false);
game.player.inventory.push(relic);
assert.ok(game.equipItem(relic.id), 'a relic should equip before it can develop a bond');
for (let index = 0; index < 9; index += 1) game._advanceRelicBonds({ boss: true, elite: true });
const equipped = game.player.equipment[relic.slot];
assert.equal(game.getRelicBond(equipped).rank, 3, 'equipped relics should awaken after repeated meaningful kills');
assert.ok(game.getRelicBond(equipped).awakening, 'Bond III should unlock a slot-specific awakening');

assert.ok(game.save());
const restored = new GameEngine(input, renderer, { reducedVfx: true, lootFilter: 'all', aimAssist: true });
assert.ok(restored.continueRun(), 'dynamic progression state must survive a save/load round trip');
assert.ok(restored.getMastery('skillOne').rank >= 3, 'ability mastery should persist');
assert.equal(restored.getMasteryDoctrine('skillOne').id, 'sunder', 'mastery doctrines should persist');
assert.equal(restored.getRelicBond(restored.player.equipment[relic.slot]).rank, 3, 'relic bonds should persist');

console.log('Ashen Covenant dynamic progression test passed.');
