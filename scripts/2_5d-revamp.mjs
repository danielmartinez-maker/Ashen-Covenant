import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENEMIES } from '../src/data/enemies.js';
import { GameEngine } from '../src/systems/game.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const png = (relative) => readFileSync(path.join(root, 'public', 'assets', relative));
const animatedAssets = [
  'hero-facing-atlas-v5.png', 'enemy-motion-a-v5.png', 'enemy-motion-b-v5.png', 'enemy-motion-c-v5.png', 'enemy-motion-d-v5.png',
  'environment-props-v5.png', 'entrance-atlas-v5.png', 'npc-atlas-v5.png'
];

for (const asset of animatedAssets) {
  const bytes = png(asset);
  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${asset} must be a PNG`);
  assert.ok(bytes.readUInt32BE(16) >= 1_000 && bytes.readUInt32BE(20) >= 1_000, `${asset} must be a release-scale atlas`);
  assert.equal(bytes[25], 6, `${asset} must preserve transparent sprite pixels`);
}
const terrain = png('terrain/terrain-atlas-v5.png');
assert.equal(terrain.readUInt32BE(16), 1536, 'terrain atlas must contain three generated cells per row');
assert.equal(terrain.readUInt32BE(20), 1024, 'terrain atlas must contain two generated rows');

const rendererSource = readFileSync(path.join(root, 'src', 'systems', 'renderer.js'), 'utf8');
const gameSource = readFileSync(path.join(root, 'src', 'systems', 'game.js'), 'utf8');
const mappingStart = rendererSource.indexOf('const ENEMY_SPRITES = {');
const mappingEnd = rendererSource.indexOf('\n};', mappingStart);
const mappingSource = rendererSource.slice(mappingStart, mappingEnd);
const mappedEnemyIds = new Set([...mappingSource.matchAll(/\b([a-z][a-z0-9]*): \['[a-d]'/g)].map((match) => match[1]));
Object.keys(ENEMIES).forEach((id) => assert.ok(mappedEnemyIds.has(id), `${id} needs authored enemy-motion art`));
assert.match(rendererSource, /terrain-atlas-v5\.png/, 'live terrain must use the generated painted atlas');
assert.match(rendererSource, /entrance-atlas-v5\.png/, 'live landmarks must use generated entrance art');
assert.match(rendererSource, /environment-props-v5\.png/, 'live world props must use generated art');
assert.match(rendererSource, /npc-atlas-v5\.png/, 'ambient NPCs must use generated art');
assert.match(rendererSource, /HERO_MOTION_ASSETS/, 'hero bodies must use the required v7 fixed-facing manifest');
assert.match(rendererSource, /resolvedClip\.row \* 8 \+ resolvedClip\.frame/, 'hero bodies must render the presentation-resolved fixed-facing frame');
assert.doesNotMatch(rendererSource, /hero-facing-atlas-v5\.png/, 'live hero rendering must not fall back to the v5 static body atlas');
assert.doesNotMatch(rendererSource, /ctx\.rotate\(player\.facing\)/, 'the player body must not freely rotate 360 degrees');
assert.match(gameSource, /const GRAVITY = 1520/, 'a shared gravity constant must drive combat elevation');
assert.match(gameSource, /const FACING_STEP = Math\.PI \/ 4/, 'body facing must use discrete 2.5D stances');

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
const game = new GameEngine(input, renderer, { reducedVfx: true });
assert.ok(game.start('warden', 'thornseer'));

const player = game.player;
player.elevation = 96;
player.verticalVelocity = 0;
player.grounded = false;
for (let step = 0; step < 24; step += 1) game._applyGravity(player, .05);
assert.equal(player.elevation, 0, 'a lifted player must settle on the ground');
assert.equal(player.verticalVelocity, 0, 'a grounded player must lose vertical velocity');
assert.equal(player.grounded, true, 'a settled player must report grounded');

player.facing = 0;
player.turnCooldown = 0;
game._turnBody(player, Math.PI, .01);
assert.ok(Math.abs(player.facing - Math.PI / 4) < .0001, 'one turn update may advance only one 45-degree authored stance');
assert.notEqual(player.facing, Math.PI, 'body turns must not snap to arbitrary 360-degree aim');

game._dodge();
assert.ok(player.verticalVelocity > 0 && !player.grounded, 'a dodge must enter the shared airborne gravity state');
const enemy = game._spawnEnemy('cinderbrute', player.x + 90, player.y, { level: 4, group: '2.5d-test' });
assert.ok(enemy && enemy.grounded && enemy.elevation === 0, 'spawned enemies must begin in a valid grounded state');
game._damageEnemy(enemy, 10, { source: '2.5d-test', stagger: 1.5, knockdown: 1, noFatedProc: true });
assert.ok(enemy.verticalVelocity > 0 && !enemy.grounded, 'heavy enemy impacts must enter the gravity state');
game._applyGravity(enemy, .1);
assert.ok(enemy.elevation > 0, 'an airborne enemy must visibly gain elevation before landing');

console.log('Ashen Covenant 2.5D animation, art, gravity, and stance regression passed.');
