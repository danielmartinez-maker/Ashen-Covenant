import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ACTION_VFX_FRAME_COUNT, ACTION_VFX_SHEETS, playerActionVfx, enemyActionVfx } from '../src/data/action-vfx.js';
import { WorldGeometrySystem } from '../src/systems/world-geometry.js';
import { GameEngine } from '../src/systems/game.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const asset = (name) => path.join(root, 'public', 'assets', name);
const heroClasses = ['ironbound','thornseer','warden','veilrunner','gravebinder','dawnstrider'];
for (const id of heroClasses) {
  const file = asset(`hero-motion-${id}-v7.png`);
  assert.ok(existsSync(file) && statSync(file).size > 1_000_000, `${id} needs a release motion sheet`);
  const png = readFileSync(file);
  assert.equal(png.readUInt32BE(16), 1536, `${id} sheet must be 8 columns wide`);
  assert.equal(png.readUInt32BE(20), 15360, `${id} sheet must contain 10 states x 8 frames`);
}
for (const file of ['enemy-motion-a-v7.png','enemy-motion-b-v7.png','enemy-motion-c-v7.png','enemy-motion-d-v7.png']) {
  const png = readFileSync(asset(file));
  assert.equal(png.readUInt32BE(16), 1536);
  assert.equal(png.readUInt32BE(20), 3072);
}
assert.equal(ACTION_VFX_FRAME_COUNT, 8);
assert.equal(ACTION_VFX_SHEETS.player.rows, 54);
assert.equal(ACTION_VFX_SHEETS.enemy.rows, 11);
const wardenRows = new Set(['attack','execution','skillOne','skillTwo','companion','hybrid','ultimate'].map((action, i) => playerActionVfx('warden', action, action === 'attack' ? 1 : i).row));
assert.equal(wardenRows.size, 7, 'major Warden actions must not reuse a single VFX lane');
assert.notEqual(playerActionVfx('warden','attack',1).row, playerActionVfx('warden','attack',3).row, 'combo stages need distinct lanes');
assert.notEqual(enemyActionVfx('melee').row, enemyActionVfx('brute').row, 'enemy roles need distinct VFX lanes');

const sfx = ['attack-light.wav','attack-heavy.wav','boss-attack.wav','boss-stagger.wav','footstep-stone.wav','footstep-mud.wav','impact-heavy.wav','impact-magic.wav'];
for (const file of sfx) assert.ok(statSync(asset(`audio/v5/${file}`)).size > 2_000, `${file} sample missing`);

const rendererSource = readFileSync(path.join(root,'src/systems/renderer.js'),'utf8');
const gameSource = readFileSync(path.join(root,'src/systems/game.js'),'utf8');
const audioSource = readFileSync(path.join(root,'src/systems/audio.js'),'utf8');
assert.match(rendererSource, /PLAYER_FACING_ANGLES\s*=\s*\[0, Math\.PI \* \.25/, 'hero presentation needs eight facings');
assert.match(rendererSource, /hero-motion-.*-v7\.png/, 'hero renderer needs v7 motion sheets');
assert.match(rendererSource, /ground-decal/, 'renderer must support persistent ground decals');
assert.match(gameSource, /WorldGeometrySystem/, 'gameplay must own physical world geometry');
assert.match(gameSource, /_assignCombatSlot/, 'enemy choreography must use combat slots');
assert.match(gameSource, /lookAheadX/, 'camera must use look-ahead');
assert.match(gameSource, /bossBlend/, 'camera must frame bosses contextually');
assert.match(audioSource, /SAMPLE_BANK/, 'audio must include decoded sample-bank playback');
assert.match(audioSource, /procedural|_tone|_noise/, 'audio must retain offline procedural fallback');

const geometry = new WorldGeometrySystem();
const grave = geometry.geometryAt(1000, 1000, { endgame: null });
assert.ok(Array.isArray(grave.obstacles), 'world geometry must expose obstacles');

const store = new Map();
globalThis.localStorage = { getItem:(k)=>store.get(k)??null, setItem:(k,v)=>store.set(k,String(v)), removeItem:(k)=>store.delete(k) };
const input = { pointer:{active:false,down:false,commandDirty:false,worldX:0,worldY:0}, tick(){}, updateWorldPointer(){}, getAimDirection(){return null;}, getMove(){return {x:0,y:0,moving:false};}, consume(){return false;}, defer(){}, press(){}, rumble(){} };
const renderer = { viewport:{width:1280,height:720,scale:1}, getAssetStatus:()=>({ready:true,failed:[]}) };
const game = new GameEngine(input, renderer, { reducedVfx:true });
assert.ok(game.start('warden','thornseer'));
assert.ok(game.worldGeometry, 'live game must construct world geometry');
const brute = game._spawnEnemy('cinderbrute', game.player.x + 120, game.player.y, { level:4, group:'v5-test', engaged:true });
const slot = game._assignCombatSlot(brute, [brute]);
assert.ok(slot && Number.isFinite(slot.x) && Number.isFinite(slot.y), 'melee enemies need deterministic combat positions');

console.log('Ashen Covenant v5 production overhaul regression passed.');
