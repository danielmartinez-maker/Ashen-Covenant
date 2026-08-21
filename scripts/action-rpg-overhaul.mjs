import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolveAssetUrl, assetCssUrl } from '../src/core/assets.js';
import { GameEngine } from '../src/systems/game.js';

const packagedBase = 'file:///C:/Games/Ashen%20Covenant/resources/app.asar/dist/index.html';
const packagedEnemyAtlas = 'file:///C:/Games/Ashen%20Covenant/resources/app.asar/dist/assets/enemy-motion-a-v5.png';
assert.equal(resolveAssetUrl('/assets/enemy-motion-a-v5.png', packagedBase), packagedEnemyAtlas, 'Windows file:// builds must resolve creature art inside the packaged dist directory');
assert.equal(assetCssUrl('/assets/enemy-motion-a-v5.png', packagedBase), `url('${packagedEnemyAtlas}')`, 'CSS art must use the same packaged application-relative resolver');

const enemyAtlases = [
  new URL('../public/assets/enemy-motion-a-v5.png', import.meta.url),
  new URL('../public/assets/enemy-motion-b-v5.png', import.meta.url),
  new URL('../public/assets/enemy-motion-c-v5.png', import.meta.url),
  new URL('../public/assets/enemy-motion-d-v5.png', import.meta.url)
];
enemyAtlases.forEach((enemyAtlas) => {
  assert.ok(existsSync(enemyAtlas), 'every required animated enemy atlas must be packaged');
  assert.ok(statSync(enemyAtlas).size > 500_000, 'each enemy atlas must be production artwork, not a tiny placeholder');
});

const rendererSource = readFileSync(new URL('../src/systems/renderer.js', import.meta.url), 'utf8');
const stylesSource = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const uiSource = readFileSync(new URL('../src/ui/ui.js', import.meta.url), 'utf8');
const enemyRenderer = rendererSource.slice(rendererSource.indexOf('  _drawEnemy(enemy, game)'), rendererSource.indexOf('  _drawEnemyRole(enemy)'));
assert.match(enemyRenderer, /this\._enemySprite\(/, 'live enemies must resolve a creature from the common or elite atlas');
assert.match(rendererSource, /enemy-motion-a-v7\.png/, 'the renderer must use the first authored enemy-motion sheet');
assert.match(rendererSource, /enemy-motion-d-v7\.png/, 'the renderer must use the final authored enemy-motion sheet');
assert.match(enemyRenderer, /if \(!spriteDrawn\) \{ ctx\.restore\(\); return; \}/, 'missing enemy art must fail closed instead of substituting geometry');
assert.doesNotMatch(enemyRenderer, /createRadialGradient|const body/, 'enemy rendering must not contain the old radial-circle body fallback');
assert.doesNotMatch(stylesSource, /url\(["']\/assets\//, 'bundled CSS must not contain drive-root asset URLs');
assert.doesNotMatch(uiSource, /--terrain:url\('\$\{zone\.terrain\}/, 'map UI must not bypass the packaged asset resolver');

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, value),
  removeItem: (key) => store.delete(key)
};

const queue = [];
const input = {
  pointer: { active: true, down: false, commandDirty: false, worldX: 0, worldY: 0 },
  tick() {}, updateWorldPointer() {}, getAimDirection() { return null; },
  getMove() { return { x: 0, y: 0, moving: false }; },
  consume(action) { const index = queue.indexOf(action); if (index < 0) return false; queue.splice(index, 1); return true; },
  defer(action) { queue.push(action); }, press(action) { queue.push(action); }, rumble() {}
};
const renderer = { viewport: { width: 1280, height: 720, scale: 1 } };
const game = new GameEngine(input, renderer, { reducedVfx: true, aimAssist: true });
assert.ok(game.start('warden', 'thornseer'));
assert.ok(game.entities.enemies.length <= 110, 'the authored campaign must use a bounded encounter population');
assert.ok(game.entities.enemies.every((enemy) => !enemy.engaged), 'open-world packs must begin dormant instead of forming a screen-wide pursuing horde');

game.entities.enemies = [];
const home = { x: game.player.x, y: game.player.y };
const scout = game._spawnEnemy('mireling', home.x + 520, home.y, { level: 4, group: 'awareness-test' });
const ally = game._spawnEnemy('ashbow', home.x + 565, home.y + 25, { level: 4, group: 'awareness-test' });
const dormantX = scout.x;
game._updateEnemies(0.2);
assert.equal(scout.engaged, false, 'a distant pack must remain unaware');
assert.equal(scout.x, dormantX, 'dormant enemies must not home across the map');
game.player.x = scout.x - 240;
game.player.y = scout.y;
game._updateEnemies(0.05);
assert.ok(scout.engaged && ally.engaged, 'entering awareness range must alert the local pack together');

input.pointer.worldX = scout.x;
input.pointer.worldY = scout.y;
assert.ok(game._contextAction(), 'clicking an enemy must create a contextual combat command');
assert.equal(game.player.combatTargetId, scout.id, 'enemy clicks must select a visible combat target');
assert.equal(game.player.moveCommand.targetId, scout.id, 'out-of-range enemy clicks must approach the selected target');
input.pointer.worldX = home.x;
input.pointer.worldY = home.y;
game._contextAction();
assert.equal(game.player.combatTargetId, null, 'ground clicks must clear combat targeting and issue movement');
assert.equal(game.player.moveCommand.attackOnArrival, false, 'ground movement must not trigger automatic attacks');

game.entities.enemies = [];
game.player.x = 1_000;
game.player.y = 1_000;
game.player.hp = game.player.maxHp;
game.player.iframes = 0;
const melee = game._spawnEnemy('mireling', 1_045, 1_000, { level: 4, group: 'telegraph-test', engaged: true });
game._startEnemyAttack(melee);
const healthBeforeHit = game.player.hp;
game._resolveEnemyAttack(melee);
assert.ok(game.player.hp < healthBeforeHit, 'remaining inside a locked melee telegraph must take the hit');

game.player.hp = game.player.maxHp;
game.player.iframes = 0;
melee.x = 1_045;
melee.y = 1_000;
game._startEnemyAttack(melee);
game.player.y = 1_220;
const healthBeforeDodge = game.player.hp;
game._resolveEnemyAttack(melee);
assert.equal(game.player.hp, healthBeforeDodge, 'moving out after the wind-up must avoid the locked melee attack');

game.entities.projectiles = [];
game.player.x = 1_000;
game.player.y = 1_000;
const boss = game._spawnEnemy('bellwitness', 1_300, 1_000, { level: 8, group: 'boss-telegraph-test', engaged: true });
game._startEnemyAttack(boss);
const bossLockedAngle = boss.telegraph.angle;
game.player.y = 1_300;
game._resolveEnemyAttack(boss);
assert.ok(game.entities.projectiles.length > 0, 'boss attack must resolve its authored projectile pattern');
assert.ok(Math.abs(game.entities.projectiles[0].angle - bossLockedAngle) < 0.0001, 'boss projectiles must use the wind-up direction rather than tracking the player after commitment');

console.log('Ashen Covenant action-RPG combat and packaged-art regression passed.');
