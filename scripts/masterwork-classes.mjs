import assert from 'node:assert/strict';
import { CLASS_IDS, allHybridPairs, getHybrid } from '../src/data/classes.js';
import { MASTERWORK_MAX_RANK, MASTERWORK_MILESTONES } from '../src/data/items.js';

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
const makeGame = (primary, secondary) => {
  const game = new GameEngine(input, renderer, { reducedVfx: true, lootFilter: 'all' });
  assert.ok(game.start(primary, secondary), `${primary} + ${secondary} must start a covenant`);
  return game;
};

assert.equal(CLASS_IDS.length, 6, 'the roster must expose six base classes');
assert.equal(allHybridPairs().length, 15, 'the six-class roster must cover every dual-oath pair');

// Every possible pair must produce a distinct playable hybrid signature and
// ultimate.  This catches data omissions that can otherwise strand a new
// selection at the menu or on an undefined combat branch.
for (let first = 0; first < CLASS_IDS.length; first += 1) {
  for (let second = first + 1; second < CLASS_IDS.length; second += 1) {
    const primary = CLASS_IDS[first];
    const secondary = CLASS_IDS[second];
    const game = makeGame(primary, secondary);
    const hybrid = game.getHybrid();
    assert.equal(hybrid?.id, getHybrid(primary, secondary)?.id, `${primary} + ${secondary} must resolve its authored hybrid`);
    game.player.resource = game.player.maxResource;
    game._hybridSignature();
    assert.ok(game.entities.hazards.length + game.entities.projectiles.length + game.entities.effects.length > 0, `${hybrid.name} needs a live signature action`);
    game.player.resource = game.player.maxResource;
    game._hybridUltimate();
    assert.ok(game.player.cooldowns.ultimate > 0, `${hybrid.name} needs a live ultimate action`);
  }
}

// Exercise each class as the primary oath so its core, skill, ward, dodge,
// and companion technique cannot be present only as menu data.
for (const primary of CLASS_IDS) {
  const secondary = CLASS_IDS.find((id) => id !== primary);
  const game = makeGame(primary, secondary);
  game.player.resource = game.player.maxResource;
  game._basicAttack();
  game.player.resource = game.player.maxResource;
  game._skillOne();
  game.player.resource = game.player.maxResource;
  game._skillTwo();
  game.player.cooldowns.dodge = 0;
  game._dodge();
  game.player.resource = game.player.maxResource;
  game._companionTechnique();
  assert.ok(game.entities.projectiles.length + game.entities.hazards.length + game.entities.effects.length > 0, `${primary} needs live combat output`);
}

const masterworkGame = makeGame('gravebinder', 'dawnstrider');
masterworkGame._setCampaignStage('chapter-one-complete');
masterworkGame.player.level = 30;
masterworkGame.player.endgameRecords.abyss.bestTier = 25;
masterworkGame.player.materials = { cinders: 100_000, shards: 10_000, alloys: 1_000, echoes: 1_000, prisms: 100, cores: 5, marks: 0 };
const masterworkRelic = masterworkGame._generateItem({ sourceId: 'gravewake', rarity: 'relic', slot: 'weapon' });
masterworkRelic.affixes = [
  { stat: 'power', label: 'Weapon power', value: 30, percentage: false, tier: 5 },
  { stat: 'crit', label: 'Critical chance', value: 0.05, percentage: true, tier: 5 },
  { stat: 'barrier', label: 'Barrier strength', value: 0.12, percentage: true, tier: 5 },
  { stat: 'cooldown', label: 'Cooldown recovery', value: 0.08, percentage: true, tier: 5 }
];
masterworkGame.player.equipment.weapon = masterworkRelic;
const baselinePower = masterworkGame.getStats().power;

for (let rank = 1; rank <= MASTERWORK_MAX_RANK; rank += 1) {
  if (rank <= 4) assert.ok(masterworkGame.setMasterworkFocus(masterworkRelic.id, 0));
  else if (rank <= 8) assert.ok(masterworkGame.setMasterworkFocus(masterworkRelic.id, 1));
  else assert.ok(masterworkGame.setMasterworkFocus(masterworkRelic.id, 2));
  assert.ok(masterworkGame.masterworkItem(masterworkRelic.id), `Masterwork rank ${rank} must be forgeable after its gate is earned`);
}

const masterworkState = masterworkGame.getMasterworkState(masterworkRelic);
assert.equal(masterworkRelic.masterwork, MASTERWORK_MAX_RANK, 'a fully developed item must reach Masterwork XII');
assert.deepEqual(masterworkRelic.masterworkExalts, [0, 1, 2], 'each breakpoint must exalt the affix focused for that stage');
assert.deepEqual(MASTERWORK_MILESTONES, [4, 8, 12]);
assert.equal(masterworkState.eligibility.ok, false, 'Apex gear must stop at its explicit cap');
assert.ok(masterworkGame.getStats().power > baselinePower * 1.15, 'Masterworking must be materially stronger than its unworked base item');
assert.ok(!masterworkGame.temperItem(masterworkRelic.id), 'a committed Masterwork cannot be randomly tempered afterward');
assert.ok(!masterworkGame.reforgeItem(masterworkRelic.id), 'a committed Masterwork cannot be reforged afterward');

// Explicit powers must activate whether their owner is equipped or extracted
// as an Aspect.  This protects the new data-driven class and hybrid uniques.
masterworkGame.player.equipment.offhand = { id: 'bone-codex-test', slot: 'offhand', rarity: 'unique', uniqueId: 'bone-codex', affixes: [] };
assert.ok(masterworkGame.hasPower('bone-comet-split'), 'a unique power alias must resolve through its equipped item');
masterworkGame.player.resource = masterworkGame.player.maxResource;
masterworkGame._skillOne();
assert.ok(masterworkGame.entities.projectiles.some((projectile) => projectile.kind === 'bone-hex' && projectile.split >= 2), 'Bone Codex must visibly upgrade Bone Comet');

assert.ok(masterworkGame.save());
const restored = new GameEngine(input, renderer, { reducedVfx: true, lootFilter: 'all' });
assert.ok(restored.continueRun(), 'new Masterwork state must survive a save/load round trip');
const restoredRelic = restored.player.equipment.weapon;
assert.equal(restoredRelic.masterwork, MASTERWORK_MAX_RANK);
assert.deepEqual(restoredRelic.masterworkExalts, [0, 1, 2]);
assert.equal(restored.getMasterworkState(restoredRelic).focusIndex, 2);

console.log('Ashen Covenant Masterwork and expanded-class test passed.');
