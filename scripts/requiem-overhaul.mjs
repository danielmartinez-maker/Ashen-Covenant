import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SAVE_KEY } from '../src/core/constants.js';
import { ENEMIES } from '../src/data/enemies.js';
import {
  BLACK_ROAD_EXPEDITIONS,
  CLASS_MECHANICS,
  DIFFICULTY_PROFILES,
  ENCOUNTER_ROOMS,
  REQUIEM_RELEASE,
  TUTORIAL_STEPS
} from '../src/data/requiem.js';
import { GameEngine } from '../src/systems/game.js';

assert.equal(REQUIEM_RELEASE.version, '6.0.0');
assert.equal(REQUIEM_RELEASE.saveVersion, 19);
assert.equal(Object.keys(CLASS_MECHANICS).length, 6, 'every base class needs a distinct live mechanic');
assert.equal(Object.keys(DIFFICULTY_PROFILES).length, 3, 'the deliberate combat model needs three verified road profiles');
assert.equal(TUTORIAL_STEPS.length, 8, 'Roadcraft must teach the complete input and covenant loop');
assert.equal(ENCOUNTER_ROOMS.length, 15, 'the five hostile regions need three authored battlefields each');
assert.equal(BLACK_ROAD_EXPEDITIONS.length, 5, 'the rebuilt game needs one dungeon expedition per hostile region');
assert.equal(BLACK_ROAD_EXPEDITIONS.flatMap((expedition) => expedition.stages).length, 20, 'five four-room routes must provide twenty sealed encounters');
BLACK_ROAD_EXPEDITIONS.forEach((expedition) => {
  assert.equal(expedition.stages.length, 4, `${expedition.id} needs a complete four-room arc`);
  assert.deepEqual(expedition.stages.map((stage) => stage.type), ['formation', 'ritual', 'lieutenant', 'boss'], `${expedition.id} must build toward its boss`);
  expedition.stages.forEach((stage) => {
    assert.ok(stage.radius >= 235 && stage.radius <= 330, `${stage.id} needs a bounded arena`);
    stage.formation.forEach((enemyId) => assert.ok(ENEMIES[enemyId], `${stage.id} references unknown enemy ${enemyId}`));
    if (stage.bossId) assert.ok(ENEMIES[stage.bossId]?.boss, `${stage.id} must reference a real boss`);
  });
});
assert.equal(new Set(ENCOUNTER_ROOMS.map((room) => room.id)).size, ENCOUNTER_ROOMS.length, 'encounter ids must remain unique');
for (const zoneId of ['gravewake', 'redfen', 'cairnreach', 'veiled-road', 'bellscar']) {
  assert.equal(ENCOUNTER_ROOMS.filter((room) => room.zoneId === zoneId).length, 3, `${zoneId} must own a three-room route`);
}
ENCOUNTER_ROOMS.forEach((room) => {
  assert.ok(room.radius >= 240 && room.radius <= 320, `${room.id} must have a bounded combat arena`);
  assert.ok(room.formation.length >= 4 && room.formation.length <= 5, `${room.id} must use a readable formation, not a horde`);
  room.formation.forEach((enemyId) => assert.ok(ENEMIES[enemyId], `${room.id} references unknown enemy ${enemyId}`));
});

const rendererSource = readFileSync(new URL('../src/systems/renderer.js', import.meta.url), 'utf8');
const uiSource = readFileSync(new URL('../src/ui/ui.js', import.meta.url), 'utf8');
const playerRenderer = rendererSource.slice(rendererSource.indexOf('  _drawPlayer(player, game)'), rendererSource.indexOf('  _drawPlayerGesture('));
assert.match(rendererSource, /actors\.sort\(\(left, right\) => left\.y - right\.y/, 'actors must share one depth-sorted isometric queue');
assert.match(rendererSource, /_drawEncounterRooms\(game\)/, 'authored battlefields must be visible in the world');
assert.match(rendererSource, /enemy-motion-a-v7\.png/, 'normal enemies must use the new animated creature atlas');
assert.match(rendererSource, /enemy-motion-d-v7\.png/, 'elites and bosses must use the final animated creature atlas');
assert.match(rendererSource, /_drawExpeditionArena\(game\)/, 'sealed expedition arenas need a visible world boundary');
assert.match(rendererSource, /_drawMoveCommand\(game\)/, 'click movement needs world-space confirmation');
assert.match(playerRenderer, /if \(!spriteDrawn\) \{ ctx\.restore\(\); return; \}/, 'missing hero art must fail closed');
assert.doesNotMatch(playerRenderer, /createLinearGradient\(-20|-circle-and-rectangle/, 'the prototype geometric hero fallback must stay deleted');
assert.match(uiSource, /id="encounter-hud"/, 'the HUD must expose authored encounter state');
assert.match(uiSource, /id="class-mechanic-readout"/, 'the HUD must expose the class-specific build-and-spend mechanic');
assert.match(uiSource, /id="roadcraft-card"/, 'onboarding must be present in the combat HUD');
assert.match(uiSource, /data-black-road/, 'the Atlas must launch Black Road expeditions directly');

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
assert.equal(game.player.requiem.difficulty, 'veteran');
assert.equal(game.snapshot().version, 19);
assert.ok(game.getRequiemOverview().route, 'a new covenant must receive an explicit expedition destination');
assert.equal(game.entities.enemies.filter((enemy) => enemy.roomId).length, 0, 'the overworld must not pre-spawn all fifteen packs');

assert.ok(game.startBlackRoadExpedition('funeral-road'));
assert.equal(game.endgame.blackRoad, true);
assert.equal(game.endgame.wavePlan.length, 4);
assert.equal(game.endgame.activeStage.type, 'formation');
assert.ok(game.getActiveExpeditionArena()?.sealed, 'the active room must constrain combat');
assert.ok(game.entities.enemies.length >= 4 && game.entities.enemies.length <= 6, 'only one readable formation may be alive');
assert.ok(game.entities.enemies.every((enemy) => enemy.engaged && enemy.group === game.endgame.id), 'the sealed formation must fight as one encounter');
game.entities.enemies.forEach((enemy) => { enemy.dead = true; });
const goldBeforeRoom = game.player.gold;
game._updateEndgame(0.01);
assert.equal(game.encounter.state, 'cleared');
assert.ok(game.player.gold > goldBeforeRoom, 'sealed rooms must grant deterministic progress rewards');
game.clock += 2;
game._updateEndgame(0.01);
assert.equal(game.endgame.waveIndex, 2, 'the next authored room must open after the transition');
assert.equal(game.endgame.activeStage.type, 'ritual');
assert.equal(game.entities.destructibles.filter((entry) => !entry.broken && entry.expeditionStageId).length, 3, 'ritual rooms must add attackable objectives');

game.player.requiem.classMechanic.value = 0;
game.player.requiem.classMechanic.ready = false;
assert.ok(game._gainClassMechanic('attack', 100));
assert.equal(game.player.requiem.classMechanic.ready, true);
assert.ok(game._consumeClassMechanic('finisher'));
assert.equal(game.player.requiem.classMechanic.ready, false, 'an empowered finisher must spend its class mechanic');

for (const step of TUTORIAL_STEPS) assert.ok(game._recordTutorial(step.event, step.target));
assert.equal(game.player.requiem.tutorial.complete, true, 'Roadcraft must finish after every authored teaching beat');

game.random = () => 0.99;
game.setRequiemDifficulty('veteran');
const veteran = game._spawnEnemy('mireling', 1500, 500, { level: 5, group: 'veteran-check' });
game.setRequiemDifficulty('penitent');
const penitent = game._spawnEnemy('mireling', 1500, 550, { level: 5, group: 'penitent-check' });
assert.ok(penitent.maxHp > veteran.maxHp && penitent.damage > veteran.damage, 'Penitent must materially change combat pressure');

const legacy = structuredClone(game.snapshot());
legacy.version = 14;
delete legacy.player.requiem.blackRoad;
store.set(SAVE_KEY, JSON.stringify(legacy));
const restored = new GameEngine(input, renderer, { reducedVfx: true });
assert.ok(restored.continueRun(), 'v3 saves must migrate into The Black Road');
assert.equal(restored.player.requiem.difficulty, 'penitent', 'v3 difficulty must survive the migration');
assert.equal(restored.player.requiem.blackRoad.totalClears, 0);
assert.equal(restored.snapshot().version, 19);

console.log('Ashen Covenant Black Road migration regression passed.');
