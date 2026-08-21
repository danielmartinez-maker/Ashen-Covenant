import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ACTION_VFX_FRAME_COUNT, ACTION_VFX_SHEETS, enemyActionVfx, playerActionVfx } from '../src/data/action-vfx.js';
import { CLASS_IDS } from '../src/data/classes.js';
import { ENEMIES } from '../src/data/enemies.js';
import { GameEngine } from '../src/systems/game.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readPng = (file) => readFileSync(path.join(root, 'public', 'assets', file));
const assetLayouts = {
  player: { file: 'attack-vfx-player-v7.png', rows: 54 },
  enemy: { file: 'attack-vfx-enemy-v7.png', rows: 11 }
};

assert.equal(ACTION_VFX_FRAME_COUNT, 8, 'every authored action VFX sheet must expose eight frames');
for (const [id, layout] of Object.entries(assetLayouts)) {
  const png = readPng(layout.file);
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${layout.file} must be a PNG`);
  assert.equal(png[25], 6, `${layout.file} must preserve RGBA pixels for compositing`);
  assert.ok(png.readUInt32BE(16) >= 1_536, `${layout.file} must provide readable eight-column cells`);
  assert.ok(png.readUInt32BE(20) >= 700, `${layout.file} must provide readable animation rows`);
  assert.equal(ACTION_VFX_SHEETS[id].rows, layout.rows, `${id} sheet must declare its real row count`);
}

const playerActions = ['attack', 'execution', 'skillOne', 'cast', 'skillTwo', 'ward', 'companion', 'hybrid', 'ultimate'];
for (const classId of CLASS_IDS) {
  for (const action of playerActions) {
    const sequence = playerActionVfx(classId, action);
    assert.ok(sequence, `${classId} ${action} needs an authored action VFX lane`);
    assert.ok(sequence.frames >= 7, `${classId} ${action} needs at least seven animation frames`);
    assert.ok(ACTION_VFX_SHEETS[sequence.sheet], `${classId} ${action} must point to a shipped sheet`);
  }
}
for (const role of new Set(Object.values(ENEMIES).map((enemy) => enemy.role))) {
  const sequence = enemyActionVfx(role, role === 'boss');
  assert.ok(sequence.frames >= 7, `${role} enemy attacks need at least seven frames`);
  assert.equal(sequence.sheet, 'enemy', `${role} enemy attacks must use the generated enemy sheet`);
}
assert.equal(enemyActionVfx('boss', true).frames, 8, 'boss attacks need the complete authored eight-frame sequence');

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key)
};
const input = {
  pointer: { active: false, down: false, commandDirty: false, worldX: 0, worldY: 0 },
  tick() {}, updateWorldPointer() {}, getAimDirection() { return null; }, getMove() { return { x: 0, y: 0, moving: false }; },
  consume() { return false; }, defer() {}, press() {}, rumble() {}
};
const renderer = { viewport: { width: 1280, height: 720, scale: 1 }, getAssetStatus: () => ({ ready: true, failed: [] }) };
const game = new GameEngine(input, renderer, { reducedVfx: false });
assert.ok(game.start('warden', 'thornseer'));

const playerSequence = game._spawnPlayerActionVfx('attack', 0.31, 1);
assert.equal(playerSequence.kind, 'action-sequence', 'player attacks must spawn a renderer-driven sequence effect');
assert.equal(playerSequence.frames, 8, 'the player action effect must retain all eight frames');
assert.equal(playerSequence.sheet, 'player', 'the Warden must use the generated player sheet');
assert.equal(playerSequence.row, 18, 'the Warden must use its authored first-attack lane');

const enemy = game._spawnEnemy('ashbow', game.player.x + 160, game.player.y, { level: 4, group: 'animation-test' });
game._startEnemyAttack(enemy);
const enemySequence = game.entities.effects.find((effect) => effect.kind === 'action-sequence' && effect.source === 'enemy');
assert.ok(enemySequence, 'enemy windups must spawn a renderer-driven sequence effect');
assert.equal(enemySequence.frames, 8, 'enemy action effects must retain all eight frames');
assert.equal(enemySequence.sheet, 'enemy', 'enemy windups must use the generated enemy sheet');

const rendererSource = readFileSync(path.join(root, 'src', 'systems', 'renderer.js'), 'utf8');
const gameSource = readFileSync(path.join(root, 'src', 'systems', 'game.js'), 'utf8');
assert.match(rendererSource, /ACTION_VFX_SHEETS/, 'the live renderer must consume the shared authored-sequence manifest');
assert.match(rendererSource, /this\.assets\.actionVfx/, 'the live renderer must load the generated sequence sheets');
for (const { file } of Object.values(assetLayouts)) {
  assert.ok(
    Object.values(ACTION_VFX_SHEETS).some((sheet) => sheet.src.endsWith(file)),
    `${file} must be declared in the shared authored-sequence manifest`
  );
}
assert.match(rendererSource, /effect\.kind === 'action-sequence'/, 'the renderer must draw frame-based action sequences');
assert.match(rendererSource, /Math\.floor\(progress \* frames\)/, 'the renderer must advance through distinct authored frames over action life');
assert.match(gameSource, /_spawnPlayerActionVfx/, 'the game must create player action sequences');
assert.match(gameSource, /_spawnEnemyActionVfx/, 'the game must create enemy action sequences');

console.log('Ashen Covenant eight-frame spell and attack animation regression passed.');
