import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { ENEMIES } from '../src/data/enemies.js';
import { GameEngine } from '../src/systems/game.js';

const percentile = (values, amount) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * amount))] ?? 0;
};
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
const seeded = (seed = 0x6a09e667) => () => {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return ((seed >>> 0) % 1_000_000) / 1_000_000;
};

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, value),
  removeItem: (key) => store.delete(key)
};

const move = { x: 0, y: 0, moving: false };
const input = {
  pointer: { active: false, worldX: 0, worldY: 0, down: false, commandDirty: false }, queue: [],
  tick() {}, updateWorldPointer() {}, getMove: () => move, getAimDirection: () => null,
  isHeld: () => false, consume: () => false, defer() {}, press() {}, rumble() {}
};
const renderer = { viewport: { width: 1920, height: 1080, scale: 1 } };
const game = new GameEngine(input, renderer, { reducedVfx: true, sound: false, graphicsQuality: 'high' });
assert(game.start('warden', 'thornseer'));
game.random = seeded();
game.entities.enemies = [];
game.entities.projectiles = [];
game.entities.hazards = [];
game.entities.effects = [];
game.entities.particles = [];
game.entities.corpses = [];
game.player.x = 2820;
game.player.y = 560;
game.player.level = 100;
game.player.maxHp = Math.max(game.player.maxHp, 25_000);
game.player.hp = game.player.maxHp;
game.player.mutationProgress.credits = Math.max(1, game.player.mutationProgress.credits ?? 0);
assert(game.unlockAbilityMutation('warden:spirit-nail:impaling-vow'), 'stress build must unlock a real authored mutation');
assert(game.selectAbilityMutation('skillOne', 'warden:spirit-nail:impaling-vow'), 'stress build must equip the authored mutation');
for (let index = 0; index < 22; index += 1) game.recordCovenantBehavior(['gravebound', 'defile'], 1.25, { regionId: 'redfen' });
const covenant = game.getCovenantOverview();
assert.equal(covenant.primary, 'grave');
assert.equal(covenant.stage, 5, 'stress certification requires stage-five Metamorphosis');
const resolvedSkill = game.getResolvedAbility('skillOne');
assert.equal(resolvedSkill.mutationId, 'warden:spirit-nail:impaling-vow');
assert.equal(resolvedSkill.shape, 'melee');
assert.equal(resolvedSkill.covenant, 'grave');

assert(game.startPersistentWorldEvent('blood-moon-hunt', 'redfen'), 'stress certification requires an active persistent world event');
const activeWorldEvent = game.player.worldV2.activeEvents.find((event) => event.typeId === 'blood-moon-hunt');
assert(activeWorldEvent, 'persistent world event must be present in v19 state');

const hunterSeed = game._spawnEnemy('reedstalker', 3010, 570, { level: 100, group: 'hunter-seed', engaged: true, elite: true, doctrineFaction: 'blood' });
const hunter = game.createHunterFromEnemy(hunterSeed, { source: 'projectile-fire', damageType: 'fire', burst: true, corpseBuild: true });
assert(hunter, 'stress certification requires a persistent Hunter');
const storedHunter = game.player.hunters.find((entry) => entry.id === hunter.id);
storedHunter.nextEligibleAt = 0;
storedHunter.adaptations = ['grave-eater', 'war-call', 'scar-ground', 'blood-reprisal', 'wardbreaker', 'nullstep'];
hunterSeed.dead = true;
const hunterEnemy = game.intrudeHunter(hunter.id, { zoneId: 'redfen', x: 2940, y: 590, group: 'stress-hunter' });
assert(hunterEnemy?.hunterId === hunter.id);

const enemyIds = Object.keys(ENEMIES).filter((id) => !ENEMIES[id].boss);
const factions = ['grave', 'blood', 'iron', 'void', 'storm'];
for (let index = 0; index < 224; index += 1) {
  const groupIndex = Math.floor(index / 8);
  const angle = index / 28 * Math.PI * 2;
  const ring = 190 + (groupIndex % 7) * 78;
  const enemy = game._spawnEnemy(
    enemyIds[index % enemyIds.length],
    game.player.x + Math.cos(angle) * ring,
    game.player.y + Math.sin(angle) * ring * 0.72,
    { level: 100, group: `v6-stress-${groupIndex}`, engaged: true, elite: index % 23 === 0, doctrineFaction: factions[groupIndex % factions.length] }
  );
  assert(enemy, `stress actor ${index} must spawn`);
  enemy.damage = 0;
  enemy.speed = Math.min(46, enemy.speed);
  enemy.recoveryLeft = 999;
  enemy.cooldown = 999;
}
for (const enemy of game.entities.enemies) {
  enemy.damage = 0;
  enemy.recoveryLeft = Math.max(enemy.recoveryLeft ?? 0, 30);
  enemy.cooldown = Math.max(enemy.cooldown ?? 0, 30);
}

const liveActorsBefore = game.entities.enemies.filter((enemy) => !enemy.dead).length + 1;
assert(liveActorsBefore >= 226, `v6 stress requires 225+ live actors, got ${liveActorsBefore}`);
assert(game.entities.enemies.some((enemy) => enemy.hunterId === hunter.id), 'Hunter must remain in active stress population');
assert(game.player.worldV2.activeEvents.some((event) => event.id === activeWorldEvent.id), 'persistent event must remain active before stress loop');

// Keep this certification focused on the v6 systems under load, not on ambient
// campaign repopulation. All normal engine update stages still run.
game.populationTimer = -1_000_000;
game.autoSave = -1_000_000;

const times = [];
globalThis.gc?.();
const heapBefore = process.memoryUsage().heapUsed;
const recomputesBefore = game.enemyDirector.stats.recomputes;
for (let frame = 0; frame < 480; frame += 1) {
  const start = performance.now();
  game.update(1 / 60);
  // Force the actual authored ability/Covenant resolver into the same frame budget.
  game.getResolvedAbility('skillOne');
  if (frame % 30 === 0) game.getMetamorphosisSnapshot();
  times.push(performance.now() - start);
}
globalThis.gc?.();
const heapAfter = process.memoryUsage().heapUsed;
const recomputes = game.enemyDirector.stats.recomputes - recomputesBefore;
const liveActorsAfter = game.entities.enemies.filter((enemy) => !enemy.dead).length + 1;

const result = {
  frames: times.length,
  actorsBefore: liveActorsBefore,
  actorsAfter: liveActorsAfter,
  updateAverageMs: mean(times),
  updateP95Ms: percentile(times, 0.95),
  updateMaxMs: Math.max(...times),
  heapDeltaMb: (heapAfter - heapBefore) / 1024 / 1024,
  doctrineRecomputes: recomputes,
  covenantStage: game.getCovenantOverview().stage,
  covenantPrimary: game.getCovenantOverview().primary,
  activeWorldEvents: game.player.worldV2.activeEvents.length,
  hunters: game.player.hunters.length,
  liveHunterEnemies: game.entities.enemies.filter((enemy) => !enemy.dead && enemy.hunterId).length,
  selectedMutation: game.getResolvedAbility('skillOne').mutationId
};

assert.equal(result.covenantStage, 5);
assert.equal(result.covenantPrimary, 'grave');
assert.equal(result.selectedMutation, 'warden:spirit-nail:impaling-vow');
assert(result.activeWorldEvents >= 1, 'persistent regional state must stay active through stress loop');
assert(result.hunters >= 1 && result.liveHunterEnemies >= 1, 'Named Hunter must coexist with stress population');
assert(result.actorsAfter >= 200, `stress population collapsed below 200 live actors: ${result.actorsAfter}`);
assert(result.doctrineRecomputes < 5_000, `pack doctrines were recomputed too often: ${result.doctrineRecomputes}`);
assert(result.updateP95Ms < 16, `integrated v6 simulation p95 exceeded 16 ms: ${result.updateP95Ms.toFixed(3)} ms`);
assert(result.updateMaxMs < 80, `integrated v6 simulation max frame exceeded 80 ms: ${result.updateMaxMs.toFixed(3)} ms`);
assert(result.heapDeltaMb < 96, `integrated v6 stress retained ${result.heapDeltaMb.toFixed(2)} MB`);

console.log(`Ashen Covenant v6 integrated performance certification passed.\n${JSON.stringify(result, null, 2)}`);
