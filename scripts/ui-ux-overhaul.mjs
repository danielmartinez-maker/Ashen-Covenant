import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { GameEngine } from '../src/systems/game.js';
import { GameUI } from '../src/ui/ui.js';
import { FocusNavigator } from '../src/ui/focus.js';
import { GAMEPAD_ACTIONS, GAMEPAD_LABELS } from '../src/systems/input.js';
import { loadSettings } from '../src/systems/save.js';

const dom = new JSDOM('<!doctype html><html><body><main id="root"></main></body></html>', { url: 'http://localhost/' });
Object.assign(globalThis, {
  window: dom.window, document: dom.window.document,
  HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, Node: dom.window.Node,
  localStorage: dom.window.localStorage, Blob: dom.window.Blob, URL: dom.window.URL
});

const actionQueue = [];
const uiQueue = [];
const input = {
  lastInputMethod: 'keyboardMouse', pointer: { active: false, worldX: 0, worldY: 0 },
  getInputMethod() { return this.lastInputMethod; },
  press(action) { actionQueue.push(action); }, hold() {}, release() {}, defer() {}, rumble() {}, tick() {}, updateWorldPointer() {},
  getMove() { return { x: 0, y: 0, moving: false }; }, getAimDirection() { return null; }, isHeld() { return false; },
  consume(action) { const index = actionQueue.indexOf(action); if (index < 0) return false; actionQueue.splice(index, 1); return true; },
  consumeUi(action) { const index = uiQueue.indexOf(action); if (index < 0) return false; uiQueue.splice(index, 1); return true; }
};
const settings = {
  sound: false, reducedVfx: false, aimAssist: true, graphicsQuality: 'high', lootFilter: 'all', uiScale: 1,
  hudMode: 'full', hudOpacity: .92, highContrast: false, showMinimap: true, showControlHints: true,
  masterVolume: .82, musicVolume: .62, sfxVolume: .82, dialogueVolume: .9, ambienceVolume: .7,
  dynamicMusicIntensity: 1, cameraShakeScale: 1, hitStopScale: 1, reducedMotion: false, reducedFlashing: false,
  backgroundAudio: false, muteWhenUnfocused: true, combatMusicFrequency: 'standard', streamerSafeMusic: true, presentationDebug: false
};
const renderer = { viewport: { width: 1500, height: 940, scale: 1 } };
const game = new GameEngine(input, renderer, settings);
const ui = new GameUI(document.querySelector('#root'), game, input, settings, null);

// Title hierarchy and explicit dual-oath creation.
assert.equal(document.querySelectorAll('.selection-steps li').length, 3);
assert.equal(document.querySelectorAll('.class-card.is-selected').length, 0);
assert.ok(document.querySelector('#continue-run').disabled);
assert.match(document.querySelector('#continue-run').textContent, /No journey saved/);
document.querySelector('[data-class-id="warden"]').click();
assert.match(document.querySelector('[data-selection-step="secondary"]').className, /is-active/);
document.querySelector('[data-class-id="thornseer"]').click();
assert.match(document.querySelector('[data-selection-step="hybrid"]').className, /is-active/);
assert.match(document.querySelector('#new-run').textContent, /Briar Oath/);
document.querySelector('#new-run').click();
ui.hideOverlay(true); // Dismiss the opening campaign dialogue for isolated UI checks.

// Complete combat input coverage and automatic prompt switching.
assert.equal(GAMEPAD_ACTIONS[4], 'companion');
assert.equal(GAMEPAD_ACTIONS[7], 'ultimate');
assert.equal(GAMEPAD_LABELS.companion, 'LB');
input.lastInputMethod = 'gamepad';
ui.syncInputMethod();
assert.equal(document.querySelector('.ability-companion kbd').textContent, 'LB');
assert.equal(document.querySelector('.ability-ultimate kbd').textContent, 'RT');
input.lastInputMethod = 'keyboardMouse';
ui.syncInputMethod();
assert.equal(document.querySelector('.ability-companion kbd').textContent, 'C');

// Focus isolation, Hub routing, shortcut routing, and restoration.
const inventoryButton = document.querySelector('#inventory-button');
inventoryButton.focus();
inventoryButton.click();
assert.equal(document.querySelectorAll('#overlay-navigation [data-open-panel]').length, 8);
assert.equal(document.querySelector('#overlay-navigation [data-open-panel="inventory"]').getAttribute('aria-current'), 'page');
assert.equal(document.querySelector('#hud').getAttribute('aria-hidden'), 'true');
assert.ok(document.querySelector('#overlay').contains(document.activeElement));
const modalFocusables = ui.focusNavigator.focusables();
modalFocusables.at(-1).focus();
window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Tab', code: 'Tab', bubbles: true, cancelable: true }));
assert.equal(document.activeElement, modalFocusables[0], 'Tab should wrap inside the modal scope');
window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'm', code: 'KeyM', bubbles: true, cancelable: true }));
assert.equal(ui.overlay, 'map');
assert.equal(document.querySelector('#overlay-navigation [data-open-panel="map"]').getAttribute('aria-current'), 'page');
window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }));
assert.equal(document.activeElement, inventoryButton, 'closing the Hub should restore the opener');
assert.equal(document.querySelector('#hud').hasAttribute('aria-hidden'), false);

// Directional focus follows visual geometry instead of DOM order.
const focusGrid = document.createElement('section');
focusGrid.innerHTML = '<button id="focus-a">A</button><button id="focus-b">B</button><button id="focus-c">C</button><button id="focus-d">D</button>';
document.body.append(focusGrid);
const positions = { 'focus-a': [0, 0], 'focus-b': [100, 0], 'focus-c': [0, 100], 'focus-d': [100, 100] };
for (const button of focusGrid.querySelectorAll('button')) {
  const [left, top] = positions[button.id];
  button.getBoundingClientRect = () => ({ left, top, right: left + 60, bottom: top + 40, width: 60, height: 40 });
}
const spatial = new FocusNavigator(focusGrid);
spatial.activate(focusGrid, '#focus-a');
spatial.move('right');
assert.equal(document.activeElement.id, 'focus-b');
spatial.move('down');
assert.equal(document.activeElement.id, 'focus-d');
spatial.deactivate({ restore: false });
focusGrid.remove();

// Settings persist and visibly affect the interface.
ui.showOverlay('pause');
const uiScale = document.querySelector('#ui-scale');
uiScale.value = '1.2';
uiScale.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
assert.equal(settings.uiScale, 1.2);
assert.equal(loadSettings().uiScale, 1.2);
assert.equal(document.documentElement.style.fontSize, '19.2px');
const hudMode = document.querySelector('#hud-mode');
hudMode.value = 'minimal';
hudMode.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
assert.equal(document.querySelector('#root').dataset.hudMode, 'minimal');
const contrast = document.querySelector('#high-contrast-toggle');
contrast.checked = true;
contrast.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
assert.ok(document.querySelector('#root').classList.contains('ui-high-contrast'));
const minimap = document.querySelector('#minimap-toggle');
minimap.checked = false;
minimap.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
assert.ok(document.querySelector('#root').classList.contains('ui-hide-minimap'));
ui.hideOverlay();

// Search, filtering, comparison, and guarded destructive actions.
const equipped = game._generateItem({ rarity: 'rare', slot: 'weapon' });
const candidate = game._generateItem({ rarity: 'rare', slot: 'weapon' });
const other = game._generateItem({ rarity: 'magic', slot: 'helm' });
equipped.name = 'Equipped Ashblade'; equipped.itemLevel = 5;
candidate.name = 'Cinder Needle'; candidate.itemLevel = 12;
other.name = 'Quiet Hood';
game.player.equipment.weapon = equipped;
game.player.inventory.push(candidate, other);
ui.selectedItemId = candidate.id;
ui.inventoryMode = 'loadout';
ui.showOverlay('inventory');
assert.match(document.querySelector('.item-comparison').textContent, /\+7 item levels/);
const search = document.querySelector('#inventory-search');
search.value = 'needle';
search.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
assert.match(document.querySelector('.inventory-filterbar output').textContent, /1 of 2/);
const rarity = document.querySelector('#inventory-rarity-filter');
rarity.value = 'rare';
rarity.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
assert.equal(ui.inventoryRarityFilter, 'rare');
document.querySelector('[data-clear-inventory-filters]').click();
assert.equal(ui.inventoryQuery, '');
document.querySelector(`[data-inspect-item-id="${candidate.id}"]`).click();
document.querySelector(`[data-salvage-id="${candidate.id}"]`).click();
assert.equal(ui.overlay, 'confirm-action');
assert.ok(game.player.inventory.some((item) => item.id === candidate.id), 'opening confirmation cannot mutate the item');
document.querySelector('[data-cancel-action]').click();
assert.equal(ui.overlay, 'inventory');
assert.ok(game.player.inventory.some((item) => item.id === candidate.id));
document.querySelector(`[data-inspect-item-id="${candidate.id}"]`).click();
document.querySelector(`[data-salvage-id="${candidate.id}"]`).click();
document.querySelector('[data-confirm-action]').click();
assert.equal(ui.overlay, 'inventory');
assert.ok(!game.player.inventory.some((item) => item.id === candidate.id), 'confirmed salvage should complete once');
ui.hideOverlay();

// Toasts deduplicate and remain bounded.
ui.toast('Repeated notice', 'accent');
ui.toast('Repeated notice', 'accent');
assert.equal([...document.querySelectorAll('.toast')].filter((toast) => toast.dataset.message === 'Repeated notice').length, 1);
for (let index = 0; index < 6; index += 1) ui.toast(`Notice ${index}`);
assert.ok(document.querySelectorAll('.toast').length <= 4);

// Returning to title exposes a useful save summary and keeps a title-level settings route.
ui.showOverlay('pause');
document.querySelector('[data-overlay-action="title"]').click();
assert.equal(document.querySelector('#continue-run').disabled, false);
assert.match(document.querySelector('#continue-run').textContent, /Briar Oath · Level/);
document.querySelector('#title-settings').click();
assert.equal(ui.overlay, 'settings');
assert.ok(document.querySelector('#overlay').classList.contains('is-standalone'));
ui.hideOverlay();

assert.equal(document.querySelector('.touch-controls'), null);
assert.doesNotMatch(document.body.textContent, /Install Game/);
dom.window.close();
console.log('Ashen Covenant v2.2 UI/UX overhaul regression passed.');
