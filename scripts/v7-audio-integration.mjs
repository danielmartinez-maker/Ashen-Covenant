import assert from 'node:assert/strict';
import { GameEngine } from '../src/systems/game.js';
import { GamePresentationSystem } from '../src/presentation/system.js';

const played = [];
const audio = {
  attach() {},
  update() {},
  playResolved(event) { played.push(event); return true; },
  debug() { return { activeVoices: 0, categoryVoices: {} }; }
};
const input = {
  pointer: { active: false, worldX: 0, worldY: 0 },
  tick() {}, updateWorldPointer() {},
  getMove() { return { x: 0, y: 0, moving: false }; },
  getAimDirection() { return null; },
  isHeld() { return false; }, consume() { return false; }, consumeUi() { return false; },
  defer() {}, press() {}, hold() {}, release() {}, rumble() {}
};
const renderer = { viewport: { width: 1280, height: 720, scale: 1 }, getAssetStatus: () => ({ ready: true, failed: [] }) };
const game = new GameEngine(input, renderer, { sound: true, reducedVfx: false });
const presentation = new GamePresentationSystem(game, { input, settings: game.settings, audio, strictEvents: true });
assert.equal(game.start('warden', 'thornseer'), true);

// Player attack-impact events identify the struck entity. Audio orchestration must
// keep the player as source actor and use entityId as the contact target.
const impactTarget = game._spawnEnemy('mireling', game.player.x + 48, game.player.y, { group: 'audio-impact-target', level: 1 });
impactTarget.material = 'plate';
const originalContextResolve = presentation.combatContextResolver.resolve.bind(presentation.combatContextResolver);
let lastContextInputs = null;
presentation.combatContextResolver.resolve = (currentGame, detail, options = {}) => {
  lastContextInputs = { actor: options.actor, target: options.target, eventType: options.eventType };
  return originalContextResolve(currentGame, detail, options);
};
presentation.eventBus.emit('combat:attack-impact', {
  entityId: impactTarget.id,
  critical: true,
  hitResult: { weight: 'heavy', guardBroken: true },
  damageType: 'physical'
}, { time: game.clock, source: 'player-combat' });

assert.equal(lastContextInputs.actor, game.player, 'player attack impact must retain the player as semantic audio actor');
assert.equal(lastContextInputs.target, impactTarget, 'player attack impact entityId must resolve as the struck target');
assert.equal(played.length, 1, 'mapped live presentation events must resolve exactly once');
assert.equal(played[0].semanticId, 'physical-impact');
assert.ok(played[0].layers.some((layer) => layer.assetId === 'impact-plate'), 'target material must drive the impact contact layer');
assert.ok(played[0].layers.some((layer) => layer.assetId === 'guard-break'));
assert.equal(presentation.eventBus.recent('audio:semantic-resolved', 1).length, 1);

presentation.eventBus.emit('animation:footstep', {
  entityId: game.player.id, surface: 'stone', foot: 'left', speed: 0.7
}, { time: game.clock, source: 'test' });
assert.equal(played.filter((event) => event.semanticId === 'footstep').length, 1, 'footstep semantic audio must resolve once');

const beforeAmbience = played.length;
presentation.eventBus.emit('context:changed', {
  currentRegion: presentation.getContext().currentRegion
}, { time: game.clock, source: 'test-context' });
assert.equal(played.length, beforeAmbience + 1, 'context changes must reach the required regional ambience semantic family');
assert.equal(played.at(-1)?.semanticId, 'regional-ambience', 'context changes must resolve regional ambience');
assert.equal(played.at(-1)?.layers[0]?.category, 'ambience', 'regional ambience must use the ambience voice budget');

console.log('Ashen Covenant v7 audio orchestration regression passed.');
