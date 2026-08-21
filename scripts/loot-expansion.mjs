import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key)
};

const { GameEngine } = await import('../src/systems/game.js');

const input = {
  pointer: { active: true, worldX: 860, worldY: 620 },
  tick() {}, updateWorldPointer() {}, getMove() { return { x: 0, y: 0, moving: false }; }, getAimDirection() { return null; },
  isHeld() { return false; }, consume() { return false; }, defer() {}, press() {}, rumble() {}
};
const renderer = { viewport: { width: 1280, height: 720, scale: 1 } };
const game = new GameEngine(input, renderer, { reducedVfx: true, lootFilter: 'all' });

assert.ok(game.start('warden', 'thornseer'));
game.player.level = 30;
game.player.gold = 50_000;
game.player.materials = { cinders: 5_000, echoes: 100, shards: 200, prisms: 20, marks: 10, alloys: 100, cores: 5 };
game._refreshPlayerStats(true);

// Deterministic zero rolls make set assignment and Mythic access explicit in
// this test without weakening the live weighted rolls.
game.random = () => 0;
const relic = game._generateItem({ sourceId: 'gravewake', rarity: 'relic', slot: 'head' });
assert.equal(relic.rarity, 'relic');
assert.equal(relic.itemLevel, 30);
assert.ok(relic.implicit, 'all base-driven loot must carry an implicit');
assert.equal(relic.affixes.length, 4, 'Relics must roll their full affix budget');
assert.equal(relic.sockets, 3, 'a superior Relic should expose its bonus socket');
assert.equal(relic.setId, 'gravewake-regalia', 'region sources should be able to roll their authored set');
game.player.inventory.push(relic);
game._registerLootDiscovery(relic, relic.sourceId);

game.player.runes['cinder-rune'] = 1;
game.player.runes['ward-rune'] = 1;
game.player.runes['rift-rune'] = 1;
assert.ok(game.inscribeRune(relic.id, 'cinder-rune'));
assert.ok(game.inscribeRune(relic.id, 'ward-rune'));
assert.ok(game.inscribeRune(relic.id, 'rift-rune'));
assert.equal(relic.runeIds.length, 3, 'multi-socket relics must retain every rune');
assert.ok(game.unsocketRune(relic.id, 1));
assert.equal(relic.runeIds.length, 2, 'individual sockets must be removable without destroying the item');

const infusionTarget = game._generateItem({ sourceId: 'gravewake', rarity: 'rare', slot: 'gloves' });
infusionTarget.affixes = [];
game.player.inventory.push(infusionTarget);
assert.ok(game.infuseAffix(infusionTarget.id), 'the forge must add a valid slot-compatible affix when capacity remains');
assert.equal(infusionTarget.affixes.length, 1);

// Equip a three-piece set and ensure its bonuses become real stats, not only
// collection text.
const setChest = game._generateItem({ sourceId: 'gravewake', rarity: 'relic', slot: 'chest' });
const setBoots = game._generateItem({ sourceId: 'gravewake', rarity: 'relic', slot: 'boots' });
game._registerLootDiscovery(setChest, setChest.sourceId);
game._registerLootDiscovery(setBoots, setBoots.sourceId);
game.player.equipment = { head: relic, chest: setChest, boots: setBoots };
const activeSets = game.getActiveSetBonuses();
assert.ok(activeSets.some((bonus) => bonus.setId === 'gravewake-regalia' && bonus.pieces === 3), 'equipped set pieces must unlock their authored 3-piece bonus');
assert.ok(game.getStats().area > 1, 'set bonuses must change live combat statistics');

const sourceUnique = game._generateItem({ forceUnique: true, sourceId: 'bell-witness', boss: true });
assert.equal(sourceUnique.rarity, 'unique');
assert.equal(sourceUnique.sourceId, 'bell-witness');
assert.ok(['bell-sunder', 'sanctuary-mirror', 'vowbreaker'].includes(sourceUnique.uniqueId), 'boss source pools must constrain unique drops');

const mythic = game._generateItem({ forceUnique: true, sourceId: 'mythic-hunt', boss: true });
assert.equal(mythic.rarity, 'mythic', 'Mythic Hunt must have a real Mythic outcome');
assert.equal(mythic.sourceId, 'mythic-hunt');

assert.ok(game.selectLootTarget('bell-sunder'));
const beforeTargetForge = game.player.inventory.length;
assert.ok(game.craftLoot('target'));
const targetForged = game.player.inventory.find((item) => item.uniqueId === 'bell-sunder');
assert.ok(targetForged, 'target forge must create the marked unique');
assert.equal(targetForged.sourceId, 'bell-witness', 'target-forged relics must retain their authored source');
assert.ok(game.player.inventory.length >= beforeTargetForge + 1);

const codex = game.getLootCodex();
assert.ok(codex.sources.find((source) => source.id === 'bell-witness')?.entries.some((entry) => entry.id === 'bell-sunder' && entry.found), 'unique discoveries must persist in the Loot Codex');
assert.ok(codex.sets.find((set) => set.id === 'gravewake-regalia')?.found >= 3, 'set-piece discoveries must persist in the Loot Codex');
const trialEntries = codex.sources.find((source) => source.id === 'hybrid-trial')?.entries ?? [];
assert.ok(trialEntries.some((entry) => entry.id === 'briar-writ'));
assert.ok(!trialEntries.some((entry) => entry.id === 'covenant-anvil'), 'the Codex must not advertise a different hybrid’s unique');

// Level 22 unlocks the second Aspect slot. Extract two valid finds and verify
// that both their passive profiles survive a save/load round trip.
assert.ok(game.extractAspect(targetForged.id));
const secondAspect = game._generateItem({ forceUnique: true, sourceId: 'gravewake' });
game.player.inventory.push(secondAspect);
assert.ok(game.extractAspect(secondAspect.id));
assert.ok(game.attuneAspect('bell-sunder'));
assert.ok(game.attuneAspect('vowbreaker'));
assert.equal(game.player.attunedAspects.length, 2, 'high-level covenants should attune two extracted aspects');

assert.ok(game.save());
const restored = new GameEngine(input, renderer, { reducedVfx: true, lootFilter: 'unique' });
assert.ok(restored.continueRun());
assert.equal(restored.player.lootTarget, 'bell-sunder');
assert.equal(restored.player.attunedAspects.length, 2);
assert.ok(restored.player.lootCollection.uniques['bell-sunder'] >= 1);
assert.ok(restored.player.lootCollection.sets['gravewake-regalia'] >= 3);
assert.equal(restored.getInventoryCapacities().pack, 60);
assert.equal(restored.getInventoryCapacities().stash, 180);

console.log('Ashen Covenant loot expansion test passed.');
