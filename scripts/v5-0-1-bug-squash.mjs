import assert from 'node:assert/strict';
import { WorldGeometrySystem } from '../src/systems/world-geometry.js';
import { BLACK_ROAD_EXPEDITIONS } from '../src/data/requiem.js';
import { CLASS_IDS } from '../src/data/classes.js';
import { GameEngine } from '../src/systems/game.js';
import { PresentationContextResolver } from '../src/presentation/context.js';

const makeInput = () => {
  const queued = [];
  return {
    pointer: { active: false, down: false, commandDirty: false, worldX: 0, worldY: 0 },
    move: { x: 0, y: 0, moving: false },
    tick() {}, updateWorldPointer() {},
    getAimDirection() { return null; },
    getMove() { return this.move; },
    isHeld() { return false; },
    consume(action) { const index = queued.indexOf(action); if (index < 0) return false; queued.splice(index, 1); return true; },
    defer() {}, press(action) { queued.push(action); }, rumble() {}
  };
};

const makeGame = (primary = 'warden', secondary = 'thornseer') => {
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  const input = makeInput();
  const renderer = { viewport: { width: 1280, height: 720, scale: 1 }, getAssetStatus: () => ({ ready: true, failed: [] }) };
  const game = new GameEngine(input, renderer, { reducedVfx: true });
  assert.ok(game.start(primary, secondary));
  return { game, input };
};

const geometry = new WorldGeometrySystem();
assert.equal(geometry.segmentBlocked(430, 360, 650, 360, 4, null), true, 'solid sanctuary well must block line traces');
const clipped = geometry.clipSegment(430, 360, 650, 360, 8, null);
assert.ok(clipped.blocked && clipped.x < 535 - 62, 'ground targets must clip before solid geometry');
const rectBody = { id: 'rect-center-regression', x: 465, y: 621, radius: 18 };
const rectResolved = geometry.resolveMove(rectBody, rectBody.x, rectBody.y, null);
assert.ok(!geometry.collides(rectResolved.x, rectResolved.y, rectBody.radius * .72, null), 'rectangle resolution must finish outside inclusive collision bounds');

const firstStage = BLACK_ROAD_EXPEDITIONS[0].stages[0];
const actor = { x: firstStage.x + firstStage.radius * .95, y: firstStage.y, radius: 18 };
geometry.constrainArena(actor, firstStage.id, 0, firstStage.radius * .5);
assert.ok(Math.hypot(actor.x - firstStage.x, actor.y - firstStage.y) <= firstStage.radius * .5 - actor.radius + 1, 'dynamic arena contraction must override the authored maximum radius');

{
  const { game } = makeGame();
  const enemy = game._spawnEnemy('cinderbrute', 535, 360, { level: 4, group: 'geometry-spawn', engaged: true });
  assert.ok(enemy && !game.worldGeometry.collides(enemy.x, enemy.y, enemy.radius * .72, game), 'enemy spawns must resolve out of solid props');

  game.entities.enemies = [];
  game._moveBodyWithGeometry(game.player, 430, 360);
  game.player.facing = 0;
  const blockedEnemy = game._spawnEnemy('cinderbrute', 650, 360, { level: 4, group: 'los', engaged: true });
  const hpBefore = blockedEnemy.hp;
  const arcHits = game._damageArc(game.player, 300, 1.2, 10, { source: 'los-regression' });
  assert.equal(arcHits, 0, 'melee arcs must not hit through solid props');
  assert.equal(blockedEnemy.hp, hpBefore);

  game.entities.enemies = [];
  game.entities.projectiles = [];
  game._createProjectile({ owner: 'player', kind: 'geometry-test', x: 430, y: 360, angle: 0, speed: 900, radius: 8, life: 1, damage: 1 });
  game._updateProjectiles(.25);
  assert.equal(game.entities.projectiles.length, 0, 'projectiles must not tunnel through solid world geometry');

  game._moveBodyWithGeometry(game.player, 450, 360);
  game.player.moveCommand = { targetId: null, x: 700, y: 360, attackOnArrival: false };
  const steered = game._commandMove();
  assert.ok(steered.moving && Math.abs(steered.y) > .01, 'click movement must steer around an immediate obstacle');

  game.endgame = { activity: 'arena', waveIndex: 3, wavePlan: Array.from({ length: 6 }, (_, i) => ({ id: `wave-${i}` })), tier: 3 };
  const context = new PresentationContextResolver({ emit() {} }, { sampleInterval: .01 });
  const resolved = context.update(game, .02);
  assert.equal(resolved.currentEndgameActivity, 'arena', 'presentation context must preserve string endgame activity IDs');
  assert.equal(resolved.encounterWave, 3, 'presentation context must use waveIndex');
  assert.equal(resolved.currentDungeonDepth, 3, 'presentation depth must use waveIndex');

  game.endgame = null;
  game.camera.x = game.player.x - 640;
  game.camera.y = Math.max(0, game.player.y - 360);
  game.camera.lookAheadX = 60;
  game.camera.lookAheadY = 0;
  game.camera.deadZone = 34;
  game.camera.follow = .2;
  const beforeCameraX = game.camera.x;
  game._focusCamera(false);
  assert.ok(game.camera.x > beforeCameraX, 'camera dead-zone must account for look-ahead displacement');
}

// Deterministic combat fuzz: every primary class gets a Black Road run with
// movement and repeated actions. The invariant checks specifically guard the
// geometry paths that previously allowed actors to escape/clip through props.
let seed = 0x5a17f00d;
const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0x100000000; };
for (let index = 0; index < CLASS_IDS.length; index += 1) {
  const primary = CLASS_IDS[index];
  const secondary = CLASS_IDS[(index + 1) % CLASS_IDS.length];
  const { game, input } = makeGame(primary, secondary);
  assert.ok(game.startBlackRoadExpedition('funeral-road'));
  game.player.maxHp *= 20; game.player.hp = game.player.maxHp;
  game.player.resource = game.player.maxResource;
  for (let frame = 0; frame < 900; frame += 1) {
    if (frame % 24 === 0) {
      const angle = random() * Math.PI * 2;
      input.move = { x: Math.cos(angle), y: Math.sin(angle), moving: true };
    }
    if (frame % 72 === 0) input.press('attack');
    if (frame % 180 === 30) input.press('skillOne');
    if (frame % 210 === 70) input.press('skillTwo');
    if (frame % 240 === 120) input.press('dodge');
    if (frame % 300 === 150) { game.player.resource = game.player.maxResource; input.press('hybrid'); }
    game.update(1 / 60);
    assert.ok(Number.isFinite(game.player.x) && Number.isFinite(game.player.y), `${primary}: player position must stay finite`);
    assert.ok(!game.worldGeometry.collides(game.player.x, game.player.y, game.player.radius * .68, game), `${primary}: player must not settle inside solid geometry`);
    for (const enemy of game.entities.enemies) {
      if (enemy.dead) continue;
      assert.ok(Number.isFinite(enemy.x) && Number.isFinite(enemy.y), `${primary}: enemy position must stay finite`);
      assert.ok(!game.worldGeometry.collides(enemy.x, enemy.y, enemy.radius * .68, game), `${primary}: enemy ${enemy.templateId} must not settle inside solid geometry`);
    }
  }
}

console.log('Ashen Covenant v5.0.1 geometry, presentation-context, projectile, camera, LOS, and combat-fuzz regression passed.');
