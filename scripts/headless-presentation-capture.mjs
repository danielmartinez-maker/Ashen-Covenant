import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { GameEngine } from '../src/systems/game.js';
import { GamePresentationSystem } from '../src/presentation/system.js';
import { Renderer } from '../src/systems/renderer.js';

const runtime = process.env.CANVAS_RUNTIME;
if (!runtime) throw new Error('Set CANVAS_RUNTIME to a temporary Node project containing @napi-rs/canvas.');
const require = createRequire(path.join(runtime, 'package.json'));
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const output = path.resolve(process.env.VISUAL_OUT ?? '.visual-check-headless');
await mkdir(output, { recursive: true });

const width = 1500;
const height = 940;
const canvas = createCanvas(width, height);
canvas.getBoundingClientRect = () => ({ width, height, left: 0, top: 0, right: width, bottom: height });
globalThis.window = { innerWidth: width, innerHeight: height, devicePixelRatio: 1 };
globalThis.ResizeObserver = class { observe() {} disconnect() {} };

const renderer = new Renderer(canvas);
const asset = (relative) => loadImage(path.resolve('public', relative));
renderer.assets = {
  heroes: await asset('assets/hero-facing-atlas-v5.png'),
  enemyMotion: {
    a: await asset('assets/enemy-motion-a-v5.png'),
    b: await asset('assets/enemy-motion-b-v5.png'),
    c: await asset('assets/enemy-motion-c-v5.png'),
    d: await asset('assets/enemy-motion-d-v5.png')
  },
  props: await asset('assets/environment-props-v5.png'),
  entrances: await asset('assets/entrance-atlas-v5.png'),
  npcs: await asset('assets/npc-atlas-v5.png'),
  actionVfx: {
    martial: await asset('assets/attack-vfx-martial-v6.png'),
    sorcery: await asset('assets/attack-vfx-sorcery-v6.png'),
    enemy: await asset('assets/attack-vfx-enemy-v6.png')
  },
  items: await asset('assets/item-atlas-v2.png'),
  terrain: await asset('assets/terrain/terrain-atlas-v5.png')
};

const move = { x: 0, y: 0, moving: false };
const input = {
  pointer: { active: false, worldX: 0, worldY: 0 }, queue: [], tick() {}, updateWorldPointer() {},
  getMove: () => move, getAimDirection: () => null, isHeld: () => false, consume: () => false, defer() {}, press() {}, rumble() {}
};
const settings = { sound: false, graphicsQuality: 'ultra', cameraShakeScale: .55, hitStopScale: .65, reducedFlashing: true };
const game = new GameEngine(input, renderer, settings);
const presentation = new GamePresentationSystem(game, { input, settings, audio: null, strictEvents: true });
assert.ok(game.start('warden', 'gravebinder'));
game.player.x = 2980; game.player.y = 610; game.player.hp = game.player.maxHp;
game.entities.enemies = [];
const enemyIds = ['bloodleech', 'fenwitch', 'boghulk', 'reedstalker', 'drownedoracle', 'ashbow', 'riftmother'];
enemyIds.forEach((id, index) => {
  const angle = -1.32 + index * .42;
  const range = index % 2 ? 245 : 178;
  const enemy = game._spawnEnemy(id, game.player.x + Math.cos(angle) * range, game.player.y + Math.sin(angle) * range, { level: 36, group: 'visual-capture', elite: index === 2 });
  enemy.speed = 0; enemy.recoveryLeft = 9;
});
game._startEnemyAttack(game.entities.enemies[2]);
game._startEnemyAttack(game.entities.enemies[5]);
const item = game._generateItem({ sourceId: 'redfen', minRarity: 'relic', rarity: 'relic', elite: true });
const drop = { id: 'capture-relic', x: game.player.x + 104, y: game.player.y + 92, item, sourceId: 'redfen', life: 80, bob: 0 };
game.entities.loot.push(drop); game._presentLootSpawn(drop);
game._focusCamera(true); presentation.update(.1); renderer.render(game);
await writeFile(path.join(output, 'combat-telegraphs.png'), canvas.toBuffer('image/png'));

game.player.facing = -.2;
game._basicAttack();
for (let index = 0; index < 5; index += 1) { game.hitStop = 0; game.update(.03); presentation.update(.03); }
renderer.render(game);
await writeFile(path.join(output, 'player-contact-frame.png'), canvas.toBuffer('image/png'));

game.entities.enemies = [];
const boss = game._spawnEnemy('bloodmatron', game.player.x + 285, game.player.y - 30, { level: 44, group: 'visual-boss', elite: true });
boss.hp = boss.maxHp * .59;
game._updateBossPhase(boss);
presentation.update(.1); renderer.render(game);
await writeFile(path.join(output, 'boss-phase-transition.png'), canvas.toBuffer('image/png'));

game.returnToSanctuary();
assert.ok(game.startBlackRoadExpedition('funeral-road'));
game.entities.enemies.forEach((enemy, index) => {
  enemy.speed = 0;
  enemy.recoveryLeft = 7;
  if (index === 0) game._startEnemyAttack(enemy);
});
game.player.combatTargetId = game.entities.enemies[0]?.id ?? null;
presentation.update(.1); renderer.render(game);
await writeFile(path.join(output, 'black-road-formation.png'), canvas.toBuffer('image/png'));

game.entities.enemies.forEach((enemy) => { enemy.dead = true; });
game._updateEndgame(.05);
game.clock += 2;
game._updateEndgame(.05);
assert.equal(game.endgame.activeStage?.type, 'ritual');
game.entities.enemies.forEach((enemy) => { enemy.speed = 0; enemy.recoveryLeft = 7; });
presentation.update(.1); renderer.render(game);
await writeFile(path.join(output, 'black-road-ritual.png'), canvas.toBuffer('image/png'));

assert.equal(presentation.eventBus.stats.listenerErrors, 0);
console.log(`Ashen Covenant headless presentation capture passed: ${output}`);
