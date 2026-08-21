import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { BLACK_ROAD_EXPEDITIONS } from '../src/data/requiem.js';
import { GameEngine } from '../src/systems/game.js';

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, value),
  removeItem: (key) => store.delete(key)
};

const queue = [];
const input = {
  pointer: { active: false, down: false, commandDirty: false, worldX: 0, worldY: 0 },
  tick() {}, updateWorldPointer() {}, getAimDirection() { return null; },
  getMove() { return { x: 0, y: 0, moving: false }; },
  consume(action) { const index = queue.indexOf(action); if (index < 0) return false; queue.splice(index, 1); return true; },
  defer(action) { queue.push(action); }, press(action) { queue.push(action); }, rumble() {}
};
const renderer = { viewport: { width: 1280, height: 720, scale: 1 } };
const game = new GameEngine(input, renderer, { reducedVfx: true, aimAssist: true });
game.random = () => 0.99;

assert.equal(BLACK_ROAD_EXPEDITIONS.length, 5);
assert.equal(new Set(BLACK_ROAD_EXPEDITIONS.map((entry) => entry.zoneId)).size, 5);
assert.equal(new Set(BLACK_ROAD_EXPEDITIONS.flatMap((entry) => entry.stages.map((stage) => stage.id))).size, 20);

for (const asset of ['../public/assets/enemy-motion-a-v5.png', '../public/assets/enemy-motion-b-v5.png', '../public/assets/enemy-motion-c-v5.png', '../public/assets/enemy-motion-d-v5.png']) {
  const url = new URL(asset, import.meta.url);
  const bytes = readFileSync(url);
  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${asset} must be a real PNG`);
  assert.ok(statSync(url).size > 1_000_000, `${asset} must contain production creature art`);
  assert.ok(bytes.readUInt32BE(16) >= 1_000, `${asset} must have a four-cell-safe width`);
  assert.ok(bytes.readUInt32BE(20) >= 1_000, `${asset} must have a four-cell-safe height`);
  assert.equal(bytes[25], 6, `${asset} must preserve RGBA transparency`);
}

assert.ok(game.start('warden', 'ironbound'));
assert.equal(game.entities.enemies.filter((enemy) => enemy.roomId).length, 0, 'new campaigns must not look like a pre-spawned survival arena');
assert.ok(game.startBlackRoadExpedition('funeral-road'));
assert.equal(game.endgame.waveIndex, 1);
assert.equal(game.endgame.activeStage.id, 'funeral-gate');

const arena = game.getActiveExpeditionArena();
game.player.x = arena.x + arena.radius * 2;
game.player.y = arena.y;
game._constrainBlackRoadArena();
assert.ok(Math.hypot(game.player.x - arena.x, game.player.y - arena.y) <= arena.radius - 20, 'sealed rooms must constrain the player');

const clearActiveStage = () => {
  game.entities.enemies.filter((enemy) => enemy.group === game.endgame.id).forEach((enemy) => { enemy.dead = true; });
  game.entities.destructibles.filter((entry) => entry.expeditionStageId === game.endgame.activeStage?.id).forEach((entry) => { entry.broken = true; });
  game._updateEndgame(0.05);
  assert.equal(game.encounter.state, 'cleared');
  game.clock += 2;
  game._updateEndgame(0.05);
};

clearActiveStage();
assert.equal(game.endgame.activeStage.type, 'ritual');
assert.equal(game.entities.destructibles.filter((entry) => !entry.broken).length, 3);

const wardedEnemy = game.entities.enemies.find((enemy) => !enemy.dead);
const hpBeforeWard = wardedEnemy.hp;
game._damageEnemy(wardedEnemy, 100, { source: 'test', noReaction: true, noFatedProc: true });
assert.ok(hpBeforeWard - wardedEnemy.hp < 25, 'ritual vessels must materially ward their formation');

clearActiveStage();
const choice = game.getExpeditionRouteChoice();
assert.ok(choice && choice.choices.length >= 3, 'the midpoint must create a branching route choice');
assert.ok(game.chooseExpeditionRoute(choice.choices[0].id));
game._updateEndgame(0.05);
assert.equal(game.endgame.activeStage.type, 'lieutenant');
assert.ok(game.entities.enemies.some((enemy) => enemy.elite && enemy.targetDrop), 'room three needs a named elite target');

clearActiveStage();
assert.equal(game.endgame.activeStage.type, 'boss');
const boss = game.entities.enemies.find((enemy) => enemy.boss);
assert.ok(boss?.expeditionBoss, 'the fourth room needs an expedition boss');
assert.ok(boss.maxHp > boss.hp * 0.99, 'boss health must be initialized to its scaled maximum');
const openingRadius = game.getActiveExpeditionArena().radius;
boss.hp = boss.maxHp * 0.6;
game._updateBossPhase(boss);
assert.equal(boss.phase, 2, 'the expedition boss must enter its second authored phase');
assert.ok(game.getActiveExpeditionArena().radius < openingRadius, 'phase two must shrink the sealed arena');
boss.hp = boss.maxHp * 0.3;
game._updateBossPhase(boss);
assert.equal(boss.phase, 3, 'the expedition boss must enter its final authored phase');
assert.equal(game.entities.hazards.filter((hazard) => hazard.kind === 'black-road-collapse').length, 4, 'the final phase must place four collapse hazards');

clearActiveStage();
assert.equal(game.endgame.completed, true);
assert.equal(game.player.requiem.blackRoad.totalClears, 1);
assert.equal(game.player.requiem.blackRoad.bossesDefeated, 1);
assert.equal(game.player.requiem.blackRoad.records['funeral-road'].clears, 1);
assert.equal(game.player.requiem.blackRoad.records['funeral-road'].stagesCleared, 4);
assert.equal(game.getRequiemOverview().blackRoad.completed, true);

game.returnToSanctuary();
assert.equal(game.endgame, null);
assert.equal(game.player.x, 700);
assert.equal(game.player.y, 620);
assert.ok(game.getBlackRoadAtlas().find((entry) => entry.id === 'funeral-road').record.clears === 1);

console.log('Ashen Covenant Black Road full-route regression passed.');
