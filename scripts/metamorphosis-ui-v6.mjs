import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, value),
  removeItem: (key) => store.delete(key)
};

const { GameEngine } = await import('../src/systems/game.js');
const { GameUI } = await import('../src/ui/ui.js');
const input = { pointer: { active: false, worldX: 0, worldY: 0 }, tick() {}, updateWorldPointer() {}, getMove() { return { x: 0, y: 0, moving: false }; }, isHeld() { return false; }, consume() { return false; }, defer() {}, rumble() {} };
const game = new GameEngine(input, { viewport: { width: 1280, height: 720, scale: 1 } }, { reducedVfx: true });
assert(game.start('warden', 'thornseer'));
for (let i = 0; i < 6; i += 1) game.recordCovenantBehavior(['gravebound'], 10, { regionId: 'gravewake' });
game.player.hunters = [game.hunterSystem.normalize({ id: 'hunter-ui', name: 'Scarred Bell Knight', templateId: 'cairnguard', factionId: 'grave', adaptations: ['ironhide','grave-eater'], targetRewardId: 'vowbreaker', grudge: 7 })];
game.startPersistentWorldEvent('gravewake-rising', 'gravewake');
game.player.sanctuary.discoveries.push('boss:cryptwarden:grave-bound');

assert.equal(typeof game.getMetamorphosisSnapshot, 'function', 'GameEngine must expose one UI-safe Metamorphosis facade');
const snapshot = game.getMetamorphosisSnapshot();
assert.equal(snapshot.covenant.primary, 'grave');
assert(snapshot.covenant.stage >= 4);
assert(snapshot.mutations.abilities.length >= 5, 'Metamorphosis view must include primary-class mutation comparisons');
assert.equal(snapshot.hunters[0].name, 'Scarred Bell Knight');
assert(snapshot.regionalEvents.some((event) => event.typeId === 'gravewake-rising'));
assert(snapshot.bossDiscoveries.includes('boss:cryptwarden:grave-bound'));

const ui = { game, inputMethod: 'keyboard' };
const nav = GameUI.prototype.hubNavigationMarkup.call(ui);
assert(nav.includes('data-open-panel="metamorphosis"'), 'Covenant Hub must expose a dedicated Metamorphosis route');
const panel = GameUI.prototype.metamorphosisOverlay.call(ui);
assert(panel.title.includes('Metamorphosis'));
assert(panel.content.includes('Stage'));
assert(panel.content.includes('Scarred Bell Knight'));
assert(panel.content.includes('Gravewake Rising'));
assert(panel.content.includes('cryptwarden'));
const atlas = GameUI.prototype.mapOverlay.call(ui);
assert(atlas.content.includes('Gravewake Rising'), 'Atlas must mark active persistent regional pressure');
assert(atlas.content.includes('Hunter'), 'Atlas must expose Hunter pressure/dossiers in the affected road context');

console.log('Ashen Covenant Metamorphosis UI regression passed.');
