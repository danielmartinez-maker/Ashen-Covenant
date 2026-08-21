import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameEngine } from '../src/systems/game.js';
import { ITEM_BASES } from '../src/data/items.js';
import { RELIC_AWAKENINGS } from '../src/data/progression.js';
import { LANDMARKS } from '../src/data/world.js';
import { loadSettings, saveSettings } from '../src/systems/save.js';
import { SAVE_KEY, SETTINGS_KEY } from '../src/core/constants.js';

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key)
};

const createInput = (move = { x: 0, y: 0, moving: false }) => ({
  pointer: { active: false, worldX: 860, worldY: 620 },
  tick() {}, updateWorldPointer() {}, getMove() { return move; }, getAimDirection() { return null; },
  isHeld() { return false; }, consume() { return false; }, defer() {}, press() {}, rumble() {}
});
const renderer = { viewport: { width: 1280, height: 720, scale: 1 } };
const makeGame = (input = createInput()) => {
  const game = new GameEngine(input, renderer, { reducedVfx: true, graphicsQuality: 'high' });
  assert.ok(game.start('warden', 'thornseer'));
  return game;
};

// Valid pre-implicit items must migrate instead of rejecting the whole save.
const legacy = makeGame();
legacy.player.inventory = [{
  id: 'legacy-cleaver', rarity: 'common', name: 'Roadworn Cleaver', slot: 'weapon',
  icon: '⚔', art: 0, baseId: 'cleaver', affixes: [], quality: 'worn', itemLevel: 3
}];
assert.ok(legacy.save());
const restored = new GameEngine(createInput(), renderer, { reducedVfx: true });
assert.ok(restored.continueRun(), 'a valid legacy base item without an implicit should restore');
const cleaver = restored.player.inventory.find((item) => item.id === 'legacy-cleaver');
const cleaverBase = ITEM_BASES.find((item) => item.id === 'cleaver');
assert.equal(cleaver.implicit.stat, cleaverBase.implicit.stat);
assert.equal(cleaver.implicit.value, cleaverBase.implicit.value);
for (const slot of new Set(ITEM_BASES.map((item) => item.slot))) {
  assert.ok(RELIC_AWAKENINGS[slot], `${slot} items must have a Bond III awakening`);
}

// Corrupted collection keys and duplicate contracts are constrained at load.
const stronghold = LANDMARKS.find((landmark) => landmark.kind === 'stronghold');
assert.ok(stronghold, 'the world should define at least one stronghold');
const normalizedWorld = restored._normalizeWorldProgress({ strongholds: { [stronghold.id]: true, injected: true } });
assert.deepEqual(normalizedWorld.strongholds, { [stronghold.id]: true });
const contractId = 'gravewake-contract-1';
const normalizedContracts = restored._normalizeContracts({ active: [
  { id: contractId, progress: 2 }, { id: contractId, progress: 12 },
  { id: 'redfen-contract-1', progress: 1 }, { id: 'unknown-contract', progress: 999 }
] });
assert.deepEqual(normalizedContracts.active.map((entry) => entry.id), [contractId, 'redfen-contract-1']);

// A slow frame advances all elapsed time through bounded simulation steps.
const fast = makeGame(createInput({ x: 1, y: 0, moving: true }));
const slow = makeGame(createInput({ x: 1, y: 0, moving: true }));
[fast, slow].forEach((game) => {
  game.entities.enemies = [];
  game.entities.projectiles = [];
  game.entities.hazards = [];
  game.entities.loot = [];
  game.lastZoneId = 'sanctuary';
  game.lastDistrictId = 'lantern-ward';
});
const fastStart = fast.player.x;
const slowStart = slow.player.x;
for (let frame = 0; frame < 3; frame += 1) fast.update(1 / 60);
slow.update(1 / 20);
assert.ok(Math.abs(fast.clock - .05) < 1e-8 && Math.abs(slow.clock - .05) < 1e-8, '20 FPS and 60 FPS must advance equal game time');
assert.ok(Math.abs((fast.player.x - fastStart) - (slow.player.x - slowStart)) < .01, 'movement must not slow down when a frame exceeds 1/30 second');
const tenFps = makeGame(createInput({ x: 1, y: 0, moving: true }));
const reference = makeGame(createInput({ x: 1, y: 0, moving: true }));
[tenFps, reference].forEach((game) => { game.entities.enemies = []; game.lastZoneId = 'sanctuary'; game.lastDistrictId = 'lantern-ward'; });
const tenStart = tenFps.player.x;
const referenceStart = reference.player.x;
tenFps.update(.1);
for (let frame = 0; frame < 6; frame += 1) reference.update(1 / 60);
assert.ok(Math.abs((tenFps.player.x - tenStart) - (reference.player.x - referenceStart)) < .02, '10 FPS movement must match the equivalent six 60 FPS steps');
const safeClock = slow.clock;
slow.update(Number.NaN);
assert.equal(slow.clock, safeClock, 'non-finite frame deltas must not poison the run clock');

// UI locks are backed by engine validation, and tiers remain integral.
const gated = makeGame();
gated._setCampaignStage('chapter-one-complete');
gated.player.level = 1;
assert.equal(gated.startDelve('crypt-of-silence', 3), false, 'locked delves cannot be launched through the engine API');
assert.equal(gated.startEndgame('delve', 3, { delveId: 'crypt-of-silence' }), false, 'direct endgame calls cannot bypass delve level gates');
gated.player.level = 27;
assert.ok(gated.startEndgame('delve', 3.9, { delveId: 'crypt-of-silence' }));
assert.equal(gated.endgame.tier, 3, 'fractional operation tiers must normalize to integers');

// Attack warnings preserve their semantic shape and fixed impact location.
const combat = makeGame();
combat.entities.effects = [];
const archer = combat._spawnEnemy('ashbow', combat.player.x + 220, combat.player.y, { group: 'telegraph-test' });
combat._startEnemyAttack(archer);
const lineWarning = combat.entities.effects.at(-1);
assert.equal(lineWarning.kind, 'telegraph');
assert.equal(lineWarning.shape, 'line');
const brute = combat._spawnEnemy('cinderbrute', combat.player.x + 72, combat.player.y, { group: 'telegraph-test' });
combat._startEnemyAttack(brute);
const warned = { x: brute.telegraph.targetX, y: brute.telegraph.targetY };
combat.player.x += 500;
combat._resolveEnemyAttack(brute);
const smash = combat.entities.hazards.find((hazard) => hazard.kind === 'smash');
assert.deepEqual({ x: smash.x, y: smash.y }, warned, 'brute impacts must land at the warned location');

// Graphics presets survive settings persistence and reject unknown values.
assert.ok(saveSettings({ graphicsQuality: 'ultra', sound: true }));
assert.equal(loadSettings().graphicsQuality, 'ultra');
store.set(SETTINGS_KEY, JSON.stringify({ graphicsQuality: 'cinema' }));
assert.equal(loadSettings().graphicsQuality, 'high');

// New 2.5D art is release-grade RGBA at a safe animated-atlas size.
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const asset of ['hero-facing-atlas-v5.png', 'enemy-motion-a-v5.png', 'enemy-motion-b-v5.png', 'enemy-motion-c-v5.png', 'enemy-motion-d-v5.png', 'environment-props-v5.png', 'entrance-atlas-v5.png', 'npc-atlas-v5.png']) {
  const png = fs.readFileSync(path.join(projectRoot, 'public', 'assets', asset));
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.ok(png.readUInt32BE(16) >= 1_000);
  assert.ok(png.readUInt32BE(20) >= 1_000);
  assert.equal(png[25], 6, `${asset} must preserve an alpha channel`);
}
const terrainAtlas = fs.readFileSync(path.join(projectRoot, 'public', 'assets', 'terrain', 'terrain-atlas-v5.png'));
assert.equal(terrainAtlas.readUInt32BE(16), 1536);
assert.equal(terrainAtlas.readUInt32BE(20), 1024);
assert.equal(terrainAtlas[25], 2, 'terrain-atlas-v5.png must preserve full RGB terrain painting');
for (const asset of ['attack-vfx-martial-v6.png', 'attack-vfx-sorcery-v6.png', 'attack-vfx-enemy-v6.png']) {
  const png = fs.readFileSync(path.join(projectRoot, 'public', 'assets', asset));
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.ok(png.readUInt32BE(16) >= 1_600, `${asset} must have eight readable animation columns`);
  assert.ok(png.readUInt32BE(20) >= 700, `${asset} must have readable multi-row combat frames`);
  assert.equal(png[25], 6, `${asset} must preserve alpha for action compositing`);
}

assert.ok(store.has(SAVE_KEY), 'the migration test should retain a valid save');
console.log('Ashen Covenant deep regression passed.');
