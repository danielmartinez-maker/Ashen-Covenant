import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { ENEMIES } from '../src/data/enemies.js';
import { seeded } from '../src/core/math.js';
import { GameEngine } from '../src/systems/game.js';
import { GamePresentationSystem } from '../src/presentation/system.js';

const percentile = (values, amount) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * amount))] ?? 0;
};
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
const measure = (frames, callback) => {
  const values = [];
  for (let frame = 0; frame < frames; frame += 1) {
    const start = performance.now();
    callback(frame);
    values.push(performance.now() - start);
  }
  return { average: mean(values), p95: percentile(values, .95), max: Math.max(...values) };
};

const makeInput = () => ({
  pointer: { active: false, down: false, commandDirty: false, worldX: 0, worldY: 0 }, queue: [],
  tick() {}, updateWorldPointer() {},
  getMove() { return { x: 0, y: 0, moving: false }; },
  getAimDirection() { return null; },
  isHeld() { return false; }, consume() { return false; }, defer() {}, press() {}, rumble() {}
});
const renderer = { viewport: { width: 1920, height: 1080, scale: 1 }, getAssetStatus: () => ({ ready: true, failed: [] }) };
const settings = { sound: false, graphicsQuality: 'ultra', cameraShakeScale: 1, hitStopScale: 1, reducedVfx: false, reducedMotion: false };
const enemyIds = Object.keys(ENEMIES).filter((id) => !ENEMIES[id].boss);

const makeFixture = () => {
  const input = makeInput();
  const game = new GameEngine(input, renderer, { ...settings });
  const presentation = new GamePresentationSystem(game, { input, settings: game.settings, audio: null, strictEvents: true });
  assert.ok(game.start('ironbound', 'dawnstrider'));
  game.seed = 424242;
  game.random = seeded(game.seed);
  game.entities.enemies = [];
  for (let index = 0; index < 240; index += 1) {
    const ring = 170 + Math.floor(index / 24) * 165;
    const angle = index / 24 * Math.PI * 2 + Math.floor(index / 24) * .19;
    const enemy = game._spawnEnemy(
      enemyIds[index % enemyIds.length],
      game.player.x + Math.cos(angle) * ring,
      game.player.y + Math.sin(angle) * ring,
      { level: 100, group: 'v7-performance', elite: index % 17 === 0 }
    );
    enemy.id = `v7-performance-${index}`;
    enemy.speed = 0;
    enemy.recoveryLeft = 999;
  }
  return { game, presentation };
};

const legacyFixture = makeFixture();
const v7Fixture = makeFixture();
const legacyUpdate = () => {
  const { game, presentation } = legacyFixture;
  presentation.settingsController.normalize();
  const context = presentation.contextResolver.update(game, 1 / 60);
  presentation.animationDirector.update(game, 1 / 60, context);
  presentation.impactSystem.update(game, 1 / 60, context);
  presentation.cinematic.update(game);
};
const v7Update = () => v7Fixture.presentation.update(1 / 60);

for (let frame = 0; frame < 120; frame += 1) legacyUpdate();
for (let frame = 0; frame < 120; frame += 1) v7Update();

globalThis.gc?.();
const heapBefore = process.memoryUsage().heapUsed;
const legacy = measure(900, legacyUpdate);
const embodied = measure(900, v7Update);
globalThis.gc?.();
const heapAfter = process.memoryUsage().heapUsed;

const ratio = embodied.p95 / Math.max(0.001, legacy.p95);
const heapDeltaMb = (heapAfter - heapBefore) / 1024 / 1024;
const equipmentCache = v7Fixture.presentation.equipmentAppearanceResolver.debug();
const debug = v7Fixture.presentation.getDebugSnapshot();
const actorCount = v7Fixture.game.entities.enemies.filter((enemy) => !enemy.dead).length;
const results = {
  legacy,
  embodied,
  ratio,
  actorCount,
  animationBudget: debug.animation.budget,
  equipmentCache,
  audio: debug.audio,
  heapDeltaMb
};

assert.ok(ratio <= 1.15, `v7 presentation p95 regressed ${(ratio * 100 - 100).toFixed(1)}%: legacy=${legacy.p95.toFixed(3)}ms v7=${embodied.p95.toFixed(3)}ms`);
assert.ok(actorCount >= 240, 'performance gate may not reduce actor population');
assert.ok(equipmentCache.hits > equipmentCache.misses * 20, `appearance cache must remain hot: ${JSON.stringify(equipmentCache)}`);
assert.equal(debug.eventBus.listenerErrors, 0, 'presentation listeners must remain error-free under stress');
assert.ok(heapDeltaMb < 64, `v7 presentation retained ${heapDeltaMb.toFixed(2)} MB`);

console.log(`Ashen Covenant v7 presentation performance budget passed.\n${JSON.stringify(results, null, 2)}`);
