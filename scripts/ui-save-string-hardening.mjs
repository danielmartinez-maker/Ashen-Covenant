import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body><main id="root"></main></body></html>', {
  url: 'http://localhost/',
  runScripts: 'outside-only'
});
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
  pointer: { active: true, down: false, commandDirty: false, worldX: 860, worldY: 620 },
  tick() {}, updateWorldPointer() {}, getMove() { return { x: 0, y: 0, moving: false }; }, getAimDirection() { return null; },
  isHeld() { return false; }, consume() { return false; }, consumeUi() { return false; }, defer() {}, press() {}, hold() {}, release() {}, rumble() {}, reset() {}
};
const renderer = { viewport: { width: 1280, height: 720, scale: 1 } };
const settings = { reducedVfx: true, lootFilter: 'all', sound: false };
const seed = new GameEngine(input, renderer, settings);
assert(seed.start('warden', 'thornseer'));
seed.random = () => 0;
const relic = seed._generateItem({ sourceId: 'gravewake', rarity: 'relic', slot: 'head' });
relic.name = '<img id="injected-name" src=x onerror="globalThis.__uiInjected=1">';
relic.description = '<script id="injected-script">globalThis.__uiInjected=2</script><b id="injected-description">owned</b>';
relic.corruption = '<svg id="injected-corruption" onload="globalThis.__uiInjected=3"></svg>';
relic.affixes = [{ stat: 'hp', label: '<i id="injected-affix" onmouseover="globalThis.__uiInjected=4">bad</i>', value: 12, percentage: false, tier: 1 }];
relic.implicit = { stat: 'armor', label: '" autofocus onfocus="globalThis.__uiInjected=5', value: 4, percentage: false };
seed.player.inventory = [relic];
assert.equal(seed.save(), true, 'hostile-looking but valid item text must save');

const game = new GameEngine(input, renderer, settings);
assert.equal(game.continueRun(), true, 'saved item text must survive a real restore path');
const restored = game.player.inventory[0];
assert.match(restored.name, /injected-name/, 'fixture name must survive normalization for the UI test to be meaningful');

const ui = new GameUI(document.querySelector('#root'), game, input, settings);
const assertNoInjectedMarkup = (label) => {
  const root = document.querySelector('#root');
  assert.equal(globalThis.__uiInjected, undefined, `${label}: hostile save text must never execute`);
  for (const id of ['injected-name', 'injected-script', 'injected-description', 'injected-corruption', 'injected-affix']) {
    assert.equal(root.querySelector(`#${id}`), null, `${label}: hostile save text must not create #${id}`);
  }
  assert.equal(root.querySelector('[onerror],[onload],[onfocus],[onmouseover]'), null, `${label}: hostile save text must not create event-handler attributes`);
};

ui.showOverlay('inventory');
assertNoInjectedMarkup('inventory-loadout');
assert.match(document.querySelector('#overlay-content').textContent, /injected-name/, 'escaped hostile item name should remain visible as literal text');

for (const mode of ['bag', 'forge', 'codex', 'loadout']) {
  const button = document.querySelector(`[data-inventory-mode="${mode}"]`);
  if (button) button.click();
  assertNoInjectedMarkup(`inventory-${mode}`);
}

// Exercise tooltip rendering too: its data attributes originate from generated inventory markup.
const tooltipTrigger = document.querySelector('[data-tooltip-title]');
if (tooltipTrigger) {
  ui.maybeShowTooltip(tooltipTrigger);
  assertNoInjectedMarkup('inventory-tooltip');
}

console.log('Ashen Covenant save-controlled UI string hardening audit passed.');
