import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body><main id="root"></main><canvas id="game"></canvas><input id="tier-input"></body></html>', { url: 'http://localhost/' });
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  Element: dom.window.Element,
  Node: dom.window.Node,
  localStorage: dom.window.localStorage
});

const { GameUI } = await import('../src/ui/ui.js');
const { InputManager } = await import('../src/systems/input.js');

const listeners = new Map();
const player = {
  primary: 'warden', secondary: 'thornseer', level: 8, x: 700, y: 620, hp: 100, maxHp: 100, resource: 50, maxResource: 50,
  skillPoints: 0, cooldowns: {}, inventory: [], stash: [], equipment: {}, itemLocks: {}, skillImprints: {}, materials: { cinders: 0, echoes: 0 }, gold: 0, loadouts: [null, null, null]
};
const game = {
  player, clock: 1, state: 'playing', entities: { enemies: [], loot: [], landmarks: [] }, objective: { title: 'The road', detail: 'Begin', progress: 0, total: 1 },
  on(event, callback) { if (!listeners.has(event)) listeners.set(event, []); listeners.get(event).push(callback); },
  emit(event, detail) { (listeners.get(event) ?? []).forEach((callback) => callback(detail)); },
  hasSave() { return false; }, start() { return true; }, continueRun() { return false; }, save() {},
  getPrimaryClass() { return { name: 'Warden', color: '#fff', icon: 'W', resource: 'Resolve', abilities: { attack: { cooldown: 1 }, skillOne: { cooldown: 1 }, skillTwo: { cooldown: 1 }, dodge: { cooldown: 1 } } }; },
  getSecondaryClass() { return { name: 'Thornseer', color: '#6f9', icon: 'T' }; },
  getHybrid() { return { name: 'Briar Oath', color: '#f6c', icon: 'B', signature: { cooldown: 1 }, ultimate: { cooldown: 1 } }; },
  getStats() { return {}; }, getBoss() { return null; }, getSkillNodes() { return []; }, getImprintOptions() { return []; }, isItemLocked() { return false; }, startEndgame() { return false; },
  getContractBoard() {
    return {
      active: [], limit: 3, pinnedId: null,
      available: [{
        id: 'gravewake-contract-1~field~1', blueprintId: 'gravewake-contract-1', name: 'Count the Unburied', zoneId: 'gravewake', factionId: 'ashen-accord',
        flavor: 'Count what the road refuses to bury.', difficulty: 'Field Order', difficultyId: 'field', difficultyIcon: 'I', difficultyColor: '#9fc8b9', difficultyTier: 1,
        steps: [{ id: 'one', type: 'kill', name: 'Cull the Host', target: 14, unit: 'hostiles', description: 'Defeat hostile creatures.' }], stepIndex: 0, currentStep: { id: 'one', type: 'kill', name: 'Cull the Host', target: 14, unit: 'hostiles', description: 'Defeat hostile creatures.' },
        totalSteps: 1, stepNumber: 1, progress: 0, target: 14, clauses: [], clauseDetails: [], bonus: { id: 'unbroken', name: 'Unbroken Oath', type: 'noDeath', target: 1, progress: 0, description: 'Finish without dying.', failed: false, complete: false },
        gold: 180, renown: 24, seals: 1, material: 'shards', materialAmount: 2, completions: 0
      }],
      ledger: { rank: 0, maxRank: 10, name: 'Unsigned', reward: 'Field Orders', xp: 0, nextXp: 80, progress: 0, seals: 0, streak: 0, bestStreak: 0, freeRefreshes: 1, refreshCost: 0, cycle: 0, history: [], difficulties: [{ id: 'field', name: 'Field Order', icon: 'I', color: '#9fc8b9', stepCount: 1, clauseCount: 0, minLevel: 1, minRank: 0, unlocked: true }] },
      caches: []
    };
  },
  getFactionProgress() { return []; }, getDelves() { return []; }, getTrackedContract() { return null; }
};
const actions = [];
const uiInput = { press(action) { actions.push(`press:${action}`); }, hold(action) { actions.push(`hold:${action}`); }, release(action) { actions.push(`release:${action}`); }, consume(action) { actions.push(`consume:${action}`); return true; } };
const ui = new GameUI(document.querySelector('#root'), game, uiInput, { sound: false, reducedVfx: false });
ui.renderAbilities();

ui.showOverlay('endgame');
assert.equal(document.querySelectorAll('[data-operations-view]').length, 3, 'the board should expose Contracts, Operations, and Factions views');
assert.equal(document.querySelectorAll('[data-contract-accept]').length, 1, 'the Contracts home should render rotating writ offers');
document.querySelector('[data-operations-view="operations"]').click();
assert.equal(document.querySelectorAll('[data-endgame]').length, 8, 'the operations board should expose all eight endgame modes');
const tier = document.querySelector('#endgame-tier');
tier.value = '27';
game.clock = 1.2;
ui.updateHud();
assert.equal(document.querySelector('#endgame-tier').value, '27', 'HUD refresh must not overwrite the active tier input');
assert.equal(game.state, 'paused', 'full overlays must pause a single-player desktop run');
ui.hideOverlay();
assert.equal(game.state, 'playing', 'closing an overlay must restore play');

ui.showOverlay('endgame');
window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { bubbles: true, cancelable: true, code: 'Escape' }));
assert.ok(document.querySelector('#overlay').classList.contains('is-hidden'), 'Escape must close a paused overlay without waiting for the paused game loop');
assert.equal(game.state, 'playing', 'Escape dismissal must resume the game');
assert.ok(actions.includes('consume:pause'), 'Escape dismissal must consume the queued pause action');

ui.showOverlay('death');
game.emit('respawned');
assert.ok(document.querySelector('#overlay').classList.contains('is-hidden'), 'death overlay must dismiss after respawn');

const ability = document.querySelector('[data-game-action="attack"]');
ability.dispatchEvent(new dom.window.MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }));
window.dispatchEvent(new dom.window.MouseEvent('pointerup', { bubbles: true, button: 0 }));
assert.equal(actions.at(-1), 'press:attack', 'ability-bar attacks must commit once instead of becoming an automatic held attack');
assert.ok(!actions.includes('hold:attack'), 'the desktop HUD must not turn basic attacks into Vampire-Survivors-style auto fire');

const unsafeMarkup = ui.itemMarkup({ id: 'unsafe\" data-x=\"injected', rarity: 'rare', slot: 'weapon', icon: '<', name: '<unsafe>', affixes: [{ label: '<bad>', value: 2 }], description: '<unsafe>' }, 'Pack', { canEquip: true });
assert.match(unsafeMarkup, /&lt;bad&gt;/, 'item affix labels must be escaped before rendering');
assert.match(unsafeMarkup, /data-equip-id="unsafe&quot; data-x=&quot;injected"/, 'item ids must be escaped before rendering into data attributes');

const canvas = document.querySelector('#game');
canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 });
canvas.focus = () => {};
const input = new InputManager(canvas);
canvas.dispatchEvent(new dom.window.MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 12, clientY: 12 }));
window.dispatchEvent(new dom.window.MouseEvent('pointerup', { bubbles: true, button: 0, clientX: 140, clientY: 140 }));
assert.equal(input.isHeld('attack'), false, 'canvas attacks must release after the pointer leaves the canvas');
assert.ok(input.consume('contextAction'), 'left-click must queue a contextual move-or-attack command');

const editable = document.querySelector('#tier-input');
input.reset();
editable.dispatchEvent(new dom.window.KeyboardEvent('keydown', { bubbles: true, code: 'KeyE' }));
assert.equal(input.queue.length, 0, 'typing in a UI input must not trigger a combat ability');

console.log('Ashen Covenant input/UI regression passed.');
