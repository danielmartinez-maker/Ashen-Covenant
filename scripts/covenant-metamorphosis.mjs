import assert from 'node:assert/strict';
import { CovenantSystem, ALIGNMENT_IDS, WORLD_TORMENTS } from '../src/systems/covenant.js';
import { DomainEventBus } from '../src/systems/domain-events.js';
import { defaultCovenantState } from '../src/systems/save-migrator.js';

assert.deepEqual(ALIGNMENT_IDS, ['flame', 'grave', 'blood', 'light', 'storm', 'void']);
assert.equal(WORLD_TORMENTS.length, 5);
assert.equal(WORLD_TORMENTS[0].id, 'pilgrim');
assert.equal(WORLD_TORMENTS[0].family, 'World Torment');

const bus = new DomainEventBus();
const thresholds = [];
bus.on('covenant:threshold-crossed', (event) => thresholds.push(event.stage));
const system = new CovenantSystem(bus);
let state = defaultCovenantState();
for (let i = 0; i < 18; i += 1) state = system.applyBehavior(state, ['gravebound', 'defile'], 1.2, { regionId: 'gravewake' });
const grave = system.resolve(state);
assert.equal(grave.primary, 'grave');
assert(grave.stage >= 2);
assert(grave.effects.passives.corpseInteraction);
assert(grave.effects.spawnBias.grave > 0);
assert(grave.effects.presentation.aura);
assert(grave.effects.audio.motif);
assert(grave.effects.rewardTags.includes('grave'));
assert.equal(new Set(thresholds).size, thresholds.length, 'threshold events must be idempotent');

let flame = defaultCovenantState();
for (let i = 0; i < 28; i += 1) flame = system.applyBehavior(flame, ['flamebound', 'reckless'], 1.1);
const flameResolved = system.resolve(flame);
assert.equal(flameResolved.primary, 'flame');
assert.notEqual(flameResolved.effects.abilityMode, grave.effects.abilityMode);
assert.notEqual(flameResolved.effects.presentation.aura, grave.effects.presentation.aura);

let hybrid = defaultCovenantState();
for (let i = 0; i < 20; i += 1) hybrid = system.applyBehavior(hybrid, ['bloodbound', 'voidbound'], 1);
const dual = system.resolve(hybrid);
assert.equal(dual.primary, 'blood');
assert.equal(dual.secondary, 'void');
assert.equal(dual.hybrid?.id, 'blood-void');
assert(dual.hybrid.mechanic, 'hybrid alignment needs a unique mechanic');

let unstable = defaultCovenantState();
for (let i = 0; i < 18; i += 1) unstable = system.applyBehavior(unstable, ['purify', 'voidbound'], 1.1);
assert(system.resolve(unstable).instability > 0, 'incompatible alignment behavior should create instability');

const once = system.resolve(state).stage;
state = system.applyBehavior(state, ['gravebound'], 0.1);
assert.equal(system.resolve(state).stage, once);
console.log('Ashen Covenant Metamorphosis regression passed.');

const store = new Map();
globalThis.localStorage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value), removeItem: (key) => store.delete(key) };
const { GameEngine } = await import('../src/systems/game.js');
const input = { pointer: { active: false, worldX: 0, worldY: 0 }, tick() {}, updateWorldPointer() {}, getMove() { return { x: 0, y: 0, moving: false }; }, isHeld() { return false; }, consume() { return false; }, defer() {}, rumble() {} };
const game = new GameEngine(input, { viewport: { width: 1280, height: 720, scale: 1 } }, { reducedVfx: true });
assert.ok(game.start('warden', 'thornseer'));
for (let i = 0; i < 15; i += 1) game.recordCovenantBehavior(['gravebound', 'defile'], 1.3, { regionId: 'gravewake' });
assert.equal(game.getCovenantOverview().primary, 'grave');
assert(game.getCovenantOverview().stage >= 2);
assert.equal(game.snapshot().player.covenant.stage, game.player.covenant.stage);
