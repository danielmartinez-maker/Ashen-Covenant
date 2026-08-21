import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body><main id="app"></main></body></html>', { url: 'http://localhost/' });
Object.assign(globalThis, {
  window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  Element: dom.window.Element, Node: dom.window.Node, localStorage: dom.window.localStorage,
  Blob: dom.window.Blob, URL: dom.window.URL
});

const { GameEngine } = await import('../src/systems/game.js');
const { GamePresentationSystem } = await import('../src/presentation/system.js');
const { GameUI } = await import('../src/ui/ui.js');
const { loadSettings } = await import('../src/systems/save.js');
const { KEYBINDINGS } = await import('../src/core/constants.js');

const queued = [];
const input = {
  pointer: { active: false, worldX: 0, worldY: 0 }, queue: queued,
  tick() {}, updateWorldPointer() {}, getMove() { return { x: 0, y: 0, moving: false }; }, getAimDirection() { return null; }, isHeld() { return false; },
  consume(action) { const index = queued.indexOf(action); if (index < 0) return false; queued.splice(index, 1); return true; },
  consumeUi() { return false; }, press(action) { queued.push(action); }, hold() {}, release() {}, defer() {}, rumble() {}
};
const renderer = { viewport: { width: 1500, height: 940, scale: 1 } };
const settings = {
  sound: false, reducedVfx: false, aimAssist: true, graphicsQuality: 'high', lootFilter: 'all',
  masterVolume: .82, musicVolume: .62, sfxVolume: .82, dialogueVolume: .9, ambienceVolume: .7,
  dynamicMusicIntensity: 1, cameraShakeScale: 1, hitStopScale: 1, muteWhenUnfocused: true,
  streamerSafeMusic: true, presentationDebug: false
};
const game = new GameEngine(input, renderer, settings);
const presentation = new GamePresentationSystem(game, { input, settings, audio: null });
const ui = new GameUI(document.querySelector('#app'), game, input, settings, null);
assert.ok(game.start('warden', 'thornseer'));
assert.deepEqual(KEYBINDINGS.debug, ['F3']);

ui.showOverlay('pause');
assert.equal(document.querySelectorAll('.settings-panel').length, 6, 'settings should separate session, interface, audio, soundtrack, accessibility, and controls');
assert.equal(document.querySelectorAll('.settings-panel input[type="range"]').length, 10, 'settings should expose audio, presentation, UI scale, and HUD opacity ranges');
assert.match(document.querySelector('#overlay-content').textContent, /Adaptive score/);
const musicVolume = document.querySelector('#music-volume');
musicVolume.value = '.35';
musicVolume.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
assert.equal(settings.musicVolume, .35);
assert.equal(loadSettings().musicVolume, .35);
const debugToggle = document.querySelector('#presentation-debug-toggle');
debugToggle.checked = true;
debugToggle.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
assert.equal(settings.presentationDebug, true);
ui.hideOverlay();

assert.equal(presentation.toggleDebug(true), true);
ui.showOverlay('presentation-debug');
assert.equal(document.querySelectorAll('.debug-grid > section').length, 4);
assert.ok(document.querySelector('[data-debug-impact="critical"]'));
assert.ok(document.querySelector('[data-debug-export]'));
document.querySelector('[data-debug-impact="critical"]').click();
assert.equal(presentation.getDebugSnapshot().impact.activeProfile, 'critical');
const intensity = document.querySelector('#debug-music-intensity');
intensity.value = '0.75';
intensity.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
assert.equal(presentation.debugOverrides.musicIntensity, .75);
ui.hideOverlay();
assert.equal(presentation.debugEnabled, false);

settings.presentationDebug = false;
presentation.releaseDebugAllowed = false;
assert.equal(presentation.toggleDebug(true), false, 'release debug tools must remain disabled until explicitly enabled');

console.log('Ashen Covenant presentation settings and debug UI test passed.');
