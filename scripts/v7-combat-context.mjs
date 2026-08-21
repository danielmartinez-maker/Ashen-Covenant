import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key)
};

const { GameEngine } = await import('../src/systems/game.js');
const { PresentationCombatContextResolver, neutralPresentationCombatContext } = await import('../src/presentation/combat-context-v7.js');

const input = {
  pointer: { active: false, down: false, commandDirty: false, worldX: 0, worldY: 0 },
  tick() {}, updateWorldPointer() {}, getAimDirection() { return null; },
  getMove() { return { x: 0, y: 0, moving: false }; },
  isHeld() { return false; }, consume() { return false; }, defer() {}, press() {}, rumble() {}
};
const renderer = {
  viewport: { width: 1280, height: 720, scale: 1 },
  getAssetStatus: () => ({ ready: true, pending: 0, failed: [] })
};
const settings = { reducedVfx: true, reducedMotion: true, reducedFlashing: true, sound: false };
const game = new GameEngine(input, renderer, settings);
assert.equal(game.start('warden', 'thornseer'), true);

for (let i = 0; i < 24; i += 1) game.recordCovenantBehavior(['gravebound'], 1.5, { regionId: 'gravewake' });
game._refreshPlayerStats(true);

game.player.equipment.weapon = {
  id: 'context-weapon', slot: 'weapon', baseId: 'iron-cleaver', rarity: 'unique', uniqueId: 'bell-sunder', masterwork: 8, corruption: 2
};
game.player.facing = Math.PI / 2;
game.player.presentation = game.player.presentation ?? {};
game.player.presentation.locomotion = { state: 'combat-run', speedRatio: 0.8 };
game.player.presentation.action = { elapsed: 0.31, phase: 'active', profile: { id: 'warden-attack-2', action: 'attack', duration: 0.62, comboIndex: 2 } };

const enemy = game._spawnEnemy('cinderbrute', game.player.x + 70, game.player.y, { level: 10, group: 'v7-context-test', elite: true });
enemy.material = 'plate';
const resolver = new PresentationCombatContextResolver();
const context = resolver.resolve(game, {
  eventType: 'combat:attack-impact', actor: game.player, target: enemy, action: 'attack', comboIndex: 2,
  hitWeight: 'heavy', damageType: 'physical', critical: true,
  hitResult: { guarded: true, guardBroken: true, poiseBroken: true, staggered: true, knockdown: false }
});

assert.equal(Object.isFrozen(context), true);
assert.equal(context.actorKind, 'player');
assert.equal(context.primaryClass, 'warden');
assert.equal(context.secondaryClass, 'thornseer');
assert.ok(context.hybridId);
assert.equal(context.actionId, 'attack');
assert.equal(context.comboIndex, 2);
assert.equal(context.phase, 'active');
assert.ok(context.actionProgress > 0 && context.actionProgress < 1);
assert.equal(context.facingLane, 2);
assert.equal(context.movementState, 'combat-run');
assert.equal(context.contactMaterial, 'plate');
assert.equal(context.hitWeight, 'heavy');
assert.equal(context.guardBroken, true);
assert.equal(context.poiseBroken, true);
assert.equal(context.staggered, true);
assert.equal(context.critical, true);
assert.equal(context.covenantPrimary, 'grave');
assert.ok(context.covenantStage >= 1);
assert.equal(context.settings.reducedMotion, true);
assert.equal(context.settings.reducedFlashing, true);
assert.equal(context.settings.reducedVfx, true);
assert.equal(Object.isFrozen(context.visibleEquipment), true);
assert.ok(context.visibleEquipment.some((item) => item.slot === 'weapon' && item.uniqueId === 'bell-sunder'));
assert.ok(context.visualSignatureIds.includes('bell-sunder'));

const neutral = neutralPresentationCombatContext();
assert.equal(Object.isFrozen(neutral), true);
assert.equal(neutral.actorKind, 'unknown');
assert.equal(neutral.covenantPrimary, 'unbound');
assert.equal(neutral.actionProgress, 0);
assert.equal(neutral.settings.reducedMotion, false);

console.log('Ashen Covenant v7 presentation combat context regression passed.');
