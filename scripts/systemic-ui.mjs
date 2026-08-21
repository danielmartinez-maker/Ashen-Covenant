import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body><main id="app"></main></body></html>', { url: 'http://localhost/' });
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  Element: dom.window.Element,
  Node: dom.window.Node,
  localStorage: dom.window.localStorage
});

const { GameEngine } = await import('../src/systems/game.js');
const { GameUI } = await import('../src/ui/ui.js');
const { KEYBINDINGS } = await import('../src/core/constants.js');

const queued = [];
const input = {
  pointer: { active: true, worldX: 820, worldY: 620 },
  tick() {}, updateWorldPointer() {}, getMove() { return { x: 0, y: 0, moving: false }; },
  getAimDirection() { return null; }, isHeld() { return false; },
  consume(action) { const index = queued.indexOf(action); if (index < 0) return false; queued.splice(index, 1); return true; },
  consumeUi() { return false; }, defer() {}, press(action) { queued.push(action); }, hold() {}, release() {}, rumble() {}
};
const renderer = { viewport: { width: 1500, height: 940, scale: 1 } };
const game = new GameEngine(input, renderer, { reducedVfx: true, graphicsQuality: 'high', lootFilter: 'all' });
const ui = new GameUI(document.querySelector('#app'), game, input, { sound: false, reducedVfx: true, graphicsQuality: 'high', lootFilter: 'all' });
assert.ok(game.start('warden', 'thornseer'));
assert.deepEqual(KEYBINDINGS.chronicle, ['KeyH']);
assert.ok(document.querySelector('#chronicle-button'));

game.player.level = 100;
game.player.gold = 100_000;
game.player.materials = { cinders: 1_000, echoes: 100, shards: 100, prisms: 20, marks: 20, alloys: 100, cores: 20 };
game._refreshPlayerStats(true);
const relic = game._generateItem({ rarity: 'relic', minRarity: 'relic', sourceId: 'stronghold' });
relic.bondXp = 10_000;
relic.bondRank = 3;
game.player.inventory.push(relic);

ui.showOverlay('chronicle');
assert.equal(ui.overlay, 'chronicle');
assert.equal(document.querySelectorAll('[data-chronicle-view]').length, 8);
assert.equal(document.querySelectorAll('[data-world-oath]').length, 5);
assert.equal(document.querySelectorAll('[data-hybrid-choice]').length, 9);
assert.equal(document.querySelectorAll('.reaction-card').length, 6);

document.querySelector('[data-chronicle-view="mastery"]').click();
assert.equal(ui.chronicleView, 'mastery');
assert.equal(document.querySelectorAll('.mastery-evolution').length, 6);
assert.ok(document.querySelectorAll('[data-relic-memory]').length >= 3);

document.querySelector('[data-chronicle-view="forge"]').click();
assert.equal(document.querySelectorAll('.forge-discipline').length, 4);
assert.equal(document.querySelectorAll('[data-forge-technique]').length, 16);

document.querySelector('[data-chronicle-view="factions"]').click();
assert.equal(document.querySelectorAll('.faction-system').length, 5);
document.querySelector('[data-chronicle-view="world"]').click();
assert.equal(document.querySelectorAll('.region-state').length, 5);
assert.ok(document.querySelectorAll('.stronghold-system').length >= 1);
assert.equal(document.querySelectorAll('.event-arc').length, 5);
document.querySelector('[data-chronicle-view="endgame"]').click();
assert.equal(document.querySelectorAll('.eclipse-node').length, 12);
document.querySelector('[data-chronicle-view="bestiary"]').click();
assert.equal(document.querySelectorAll('.bestiary-family').length, 8);
document.querySelector('[data-chronicle-view="decrees"]').click();
assert.equal(document.querySelectorAll('.decree-card').length, 5);

ui.hideOverlay(true);
game._setCampaignStage('chapter-one-complete', 1);
assert.ok(game.startEndgame('arena', 12));
game.entities.enemies = [];
game._updateEndgame(1);
game.entities.enemies = [];
game._updateEndgame(1);
assert.equal(ui.overlay, 'expedition-choice');
assert.equal(game.state, 'paused');
assert.equal(document.querySelectorAll('[data-expedition-route]').length, 3);
document.querySelector('[data-expedition-route]').click();
assert.equal(ui.overlay, null);
assert.equal(game.state, 'playing');
assert.equal(game.endgame.expeditionBoons.length, 1);

console.log('Ashen Covenant Systemic Chronicle UI test passed.');
