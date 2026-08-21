import assert from 'node:assert/strict';

const { SanctuarySystem } = await import('../src/systems/sanctuary.js');
const sanctuary = new SanctuarySystem();
const base = {
  sanctuary: { level: 1, flags: {}, merchants: {}, npcs: {}, architecture: [], discoveries: ['boss:cryptwarden:grave-resonant'] },
  worldProgress: { strongholds: { 'mourner-redoubt': true, 'trial': true } },
  factions: { 'ashen-accord': { rank: 3 }, 'mirebound': { rank: 1 } },
  hunters: [{ id: 'hunter-1', defeated: true }],
  worldV2: { resolvedEvents: [{ id: 'event-1', typeId: 'gravewake-rising', zoneId: 'gravewake', outcome: 'cleared' }], activeEvents: [] },
  campaign: { chapters: { 'chapter-one': { complete: true }, 'chapter-two': { complete: true } } }
};
const grave = sanctuary.resolve({ ...base, covenant: { primary: 'grave', stage: 4, instability: 8 } });
const flame = sanctuary.resolve({ ...base, covenant: { primary: 'flame', stage: 4, instability: 8 } });
assert(grave.level >= 3, 'strongholds and Covenant evolution must raise Sanctuary level');
assert.notDeepEqual(grave.architecture, flame.architecture, 'Covenant alignment must visibly change Sanctuary architecture');
assert.notEqual(grave.lighting.id, flame.lighting.id, 'Covenant alignment must change Sanctuary lighting');
assert(grave.services.some((service) => service.id === 'mutation-shrine'), 'advanced Metamorphosis must unlock a mutation service');
assert(grave.services.some((service) => service.id === 'hunter-dossiers'), 'Hunter history must unlock Hunter services');
assert(grave.npcs.some((npc) => npc.id === 'scar-chronicler'), 'Hunter history must change NPC presence');
assert(grave.questHooks.some((hook) => hook.kind === 'world-memory'), 'resolved world events must create Sanctuary quest hooks');
assert(grave.discoveries.some((entry) => entry.includes('cryptwarden')), 'boss discoveries must remain visible in Sanctuary state');
assert(grave.merchants.some((merchant) => merchant.id === 'covenant-vendor' && merchant.offers.length), 'Covenant progression must unlock a real merchant inventory');
const presentation = sanctuary.presentation(grave);
assert.equal(presentation.props.length, grave.architecture.length, 'every resolved architecture element must receive a deterministic world placement');
assert.equal(presentation.npcs.length, grave.npcs.length, 'every resolved NPC must receive a deterministic world placement');

const store = new Map();
globalThis.localStorage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value), removeItem: (key) => store.delete(key) };
const { GameEngine } = await import('../src/systems/game.js');
const input = { pointer: { active: false, worldX: 0, worldY: 0 }, tick() {}, updateWorldPointer() {}, getMove() { return { x: 0, y: 0, moving: false }; }, isHeld() { return false; }, consume() { return false; }, defer() {}, rumble() {} };
const game = new GameEngine(input, { viewport: { width: 1280, height: 720, scale: 1 } }, { reducedVfx: true });
assert(game.start('warden', 'thornseer'));
for (let i = 0; i < 12; i += 1) game.recordCovenantBehavior('gravebound', 4);
game.player.worldProgress.strongholds['mourner-redoubt'] = true;
game.player.factions['ashen-accord'].renown = 500;
game.player.factions['ashen-accord'].rank = 4;
game.player.hunters.push({ id: 'test-hunter', name: 'Test Hunter', templateId: 'cairnguard', factionId: 'grave', level: 12, victories: 2, defeats: 1, grudge: 2, adaptations: [], scars: [], knowledge: { damageTypes: [], sources: [], covenants: [] }, targetRewardId: 'black-lantern', nextEligibleAt: 0, lastSeenAt: 0, defeated: true });
const state = game.getSanctuaryState();
assert(state.merchants.length >= 2, 'GameEngine must expose resolved Sanctuary merchants');
const merchant = state.merchants.find((entry) => entry.offers.length);
const offer = merchant.offers[0];
game.player.gold = Math.max(game.player.gold, offer.cost + 1000);
const ownedBefore = game.player.inventory.length + game.player.stash.length + game.entities.loot.length;
assert(game.buySanctuaryCache(merchant.id, offer.id), 'Sanctuary merchant offers must execute through real item-award routes');
const ownedAfter = game.player.inventory.length + game.player.stash.length + game.entities.loot.length;
assert(ownedAfter > ownedBefore, 'Sanctuary purchase must award an actual item');
game.save();
const restored = new GameEngine(input, { viewport: { width: 1280, height: 720, scale: 1 } }, { reducedVfx: true });
assert(restored.continueRun());
assert(restored.getSanctuaryState().level >= state.level, 'Living Sanctuary state must reconstruct after save/reload');

console.log('Ashen Covenant Living Sanctuary regression passed.');
