import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { GameEngine } from '../src/systems/game.js';
import { GameUI } from '../src/ui/ui.js';

const dom = new JSDOM('<!doctype html><html><body><main id="root"></main></body></html>', { url: 'http://localhost/' });
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  Element: dom.window.Element,
  Node: dom.window.Node,
  localStorage: dom.window.localStorage,
  Blob: dom.window.Blob,
  URL: dom.window.URL
});

const actions = [];
const input = {
  lastInputMethod: 'keyboardMouse', pointer: { active: false, down: false, commandDirty: false, worldX: 0, worldY: 0 },
  getInputMethod() { return this.lastInputMethod; },
  press(action) { actions.push(action); }, hold() {}, release() {}, defer(action) { actions.push(action); }, rumble() {}, tick() {}, updateWorldPointer() {},
  getMove() { return { x: 0, y: 0, moving: false }; }, getAimDirection() { return null; }, isHeld() { return false; },
  consume(action) { const index = actions.indexOf(action); if (index < 0) return false; actions.splice(index, 1); return true; },
  consumeUi() { return false; }
};
const settings = {
  sound: false, reducedVfx: true, aimAssist: true, graphicsQuality: 'high', lootFilter: 'all', uiScale: 1,
  hudMode: 'full', hudOpacity: .92, highContrast: false, showMinimap: true, showControlHints: true,
  masterVolume: .82, musicVolume: .62, sfxVolume: .82, dialogueVolume: .9, ambienceVolume: .7,
  dynamicMusicIntensity: 1, cameraShakeScale: 1, hitStopScale: 1, reducedMotion: false, reducedFlashing: false,
  backgroundAudio: false, muteWhenUnfocused: true, combatMusicFrequency: 'standard', streamerSafeMusic: true, presentationDebug: false
};
const renderer = { viewport: { width: 1500, height: 940, scale: 1 } };
const game = new GameEngine(input, renderer, settings);
game.random = () => .99;
const ui = new GameUI(document.querySelector('#root'), game, input, settings, null);

assert.match(document.querySelector('.title-masthead').textContent, /Black Road/i);
document.querySelector('[data-class-id="warden"]').click();
document.querySelector('[data-class-id="ironbound"]').click();
document.querySelector('#new-run').click();
ui.hideOverlay(true);

document.querySelector('#map-button').click();
assert.match(document.querySelector('#overlay-title').textContent, /Atlas of the Black Road/);
assert.equal(document.querySelectorAll('.black-road-zone').length, 5, 'the Atlas must show all five dungeon routes');
assert.equal(document.querySelectorAll('.expedition-stage-list li').length, 20, 'the Atlas must show all twenty authored rooms');
assert.equal(document.querySelectorAll('[data-black-road]:not([disabled])').length, 1, 'a new covenant must receive one level-appropriate starting route');
assert.equal(document.querySelectorAll('[data-black-road][disabled]').length, 4, 'later routes must communicate their level gates');

document.querySelector('[data-black-road="funeral-road"]').click();
assert.equal(game.endgame?.expeditionId, 'funeral-road');
assert.ok(document.querySelector('#overlay').classList.contains('is-hidden'));
assert.match(document.querySelector('#encounter-kicker').textContent, /Room 1\/4 · Formation/);
assert.match(document.querySelector('#encounter-hint').textContent, /Break the shield line/);

const clearRoom = () => {
  game.entities.enemies.filter((enemy) => enemy.group === game.endgame.id).forEach((enemy) => { enemy.dead = true; });
  game.entities.destructibles.filter((entry) => entry.expeditionStageId === game.endgame.activeStage?.id).forEach((entry) => { entry.broken = true; });
  game._updateEndgame(.05);
  assert.equal(document.querySelector('#encounter-count').textContent, 'ROOM CLEARED');
  game.clock += 2;
  game._updateEndgame(.05);
};

clearRoom();
assert.equal(game.endgame.activeStage.type, 'ritual');
assert.match(document.querySelector('#encounter-kicker').textContent, /Room 2\/4 · Objective chamber/);
assert.match(document.querySelector('#encounter-count').textContent, /3 wards/);
assert.match(document.querySelector('#encounter-hint').textContent, /funeral censers/i);

clearRoom();
assert.equal(ui.overlay, 'expedition-choice');
assert.match(document.querySelector('#overlay-title').textContent, /Black Road divides/);
assert.ok(document.querySelectorAll('[data-expedition-route]').length >= 3);
document.querySelector('[data-expedition-route]').click();
game._updateEndgame(.05);
assert.equal(game.endgame.activeStage.type, 'lieutenant');
assert.match(document.querySelector('#encounter-kicker').textContent, /Room 3\/4 · Lieutenant/);

clearRoom();
assert.equal(game.endgame.activeStage.type, 'boss');
const boss = game.entities.enemies.find((enemy) => enemy.boss);
assert.ok(boss);
ui.updateHud(true);
assert.match(document.querySelector('#boss-name').textContent, /Cryptwarden/);

clearRoom();
assert.equal(game.endgame.completed, true);
assert.equal(document.querySelector('#encounter-count').textContent, 'EXPEDITION CLEARED');
assert.ok(!document.querySelector('#expedition-return').classList.contains('is-hidden'));
document.querySelector('#expedition-return').click();
assert.equal(game.endgame, null);
assert.equal(game.entities.enemies.length, 0);

console.log('Ashen Covenant Black Road interface and full-route UI regression passed.');
