import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body><main id="root"></main></body></html>', { url: 'http://localhost/' });
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  Element: dom.window.Element,
  Node: dom.window.Node,
  localStorage: dom.window.localStorage
});

const [{ GameEngine }, { GameUI }] = await Promise.all([
  import('../src/systems/game.js'),
  import('../src/ui/ui.js')
]);

const input = {
  pointer: { active: true, worldX: 860, worldY: 620 },
  tick() {}, updateWorldPointer() {}, getMove() { return { x: 0, y: 0, moving: false }; }, getAimDirection() { return null; },
  isHeld() { return false; }, consume() { return false; }, consumeUi() { return false; }, defer() {}, press() {}, hold() {}, release() {}, rumble() {}
};
const renderer = { viewport: { width: 1280, height: 720, scale: 1 } };
const game = new GameEngine(input, renderer, { reducedVfx: true, lootFilter: 'all' });
assert.ok(game.start('warden', 'thornseer'));
game.player.level = 30;
game.player.materials = { cinders: 1_000, echoes: 30, shards: 100, prisms: 5, marks: 0, alloys: 25, cores: 2 };
game.player.runes['cinder-rune'] = 1;
game.random = () => 0;
const relic = game._generateItem({ sourceId: 'gravewake', rarity: 'relic', slot: 'head' });
game._awardItem(relic, 'test');

const ui = new GameUI(document.querySelector('#root'), game, input, { reducedVfx: false, sound: false, lootFilter: 'all' });
ui.showOverlay('inventory');
assert.match(document.querySelector('#overlay-title').textContent, /Relics and covenant craft/);
assert.ok(document.querySelector('[data-inventory-mode="loadout"]'));
document.querySelector('[data-inventory-mode="codex"]').click();
assert.match(document.querySelector('#overlay-content').textContent, /Loot Codex/);
assert.ok(document.querySelector('[data-loot-target="bell-sunder"]'), 'the UI must expose eligible source-targeted uniques');
document.querySelector('[data-inventory-mode="forge"]').click();
assert.ok(document.querySelector('[data-craft-loot="target"]'), 'the UI must expose target forging');

document.querySelector('[data-rune-id="cinder-rune"]').click();
document.querySelector(`[data-inscribe-item-id="${relic.id}"]`).click();
assert.ok(relic.runeIds.includes('cinder-rune'), 'selected runes must be inscribed through the desktop inventory UI');
assert.ok(document.querySelector(`[data-unsocket-item-id="${relic.id}"]`), 'socketed runes must expose a removal control');
document.querySelector(`[data-unsocket-item-id="${relic.id}"]`).click();
assert.equal(relic.runeIds.length, 0, 'desktop rune removal must update the live item');

game._setCampaignStage('chapter-one-complete');
const focusControl = document.querySelector(`[data-masterwork-focus-id="${relic.id}"][data-masterwork-focus-index="1"]`);
assert.ok(focusControl, 'eligible items must expose a Masterwork affix focus control');
focusControl.click();
assert.equal(relic.masterworkFocus, 1, 'the desktop forge must retain the selected Masterwork focus');
document.querySelector(`[data-masterwork-id="${relic.id}"]`).click();
assert.equal(relic.masterwork, 1, 'the desktop forge must apply a Foundry Masterwork rank');

document.querySelector('[data-inventory-mode="codex"]').click();
document.querySelector('[data-loot-target="bell-sunder"]').click();
assert.equal(game.player.lootTarget, 'bell-sunder', 'the Codex must select a target-farm unique');
const targetCount = game.player.inventory.filter((item) => item.uniqueId === 'bell-sunder').length;
document.querySelector('[data-inventory-mode="forge"]').click();
document.querySelector('[data-craft-loot="target"]').click();
assert.equal(game.player.inventory.filter((item) => item.uniqueId === 'bell-sunder').length, targetCount + 1, 'target forge must be reachable through the desktop inventory UI');

ui.showOverlay('pause');
assert.ok(document.querySelector('#loot-filter option[value="relic"]'));
assert.ok(document.querySelector('#loot-filter option[value="unique"]'));
console.log('Ashen Covenant loot UI smoke test passed.');
