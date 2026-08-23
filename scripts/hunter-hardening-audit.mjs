import assert from 'node:assert/strict';
import { SAVE_KEY } from '../src/core/constants.js';
import { HunterSystem } from '../src/systems/hunters.js';
import { GameEngine } from '../src/systems/game.js';

const system = new HunterSystem();
const hostileHunter = {
  id: '<hostile-hunter>',
  name: 42,
  templateId: null,
  factionId: {},
  level: 'Infinity',
  victories: 'Infinity',
  defeats: -999,
  grudge: 'Infinity',
  adaptations: 'not-an-array',
  scars: { nope: true },
  knowledge: { damageTypes: {}, sources: 'not-an-array', covenants: null },
  targetRewardId: {},
  nextEligibleAt: 'Infinity',
  lastSeenAt: 'Infinity',
  defeated: 'yes'
};

let normalized;
assert.doesNotThrow(() => { normalized = system.normalize(hostileHunter); }, 'hostile nested Hunter state must normalize without throwing');
assert.ok(Number.isFinite(normalized.level), 'Hunter level must be finite');
assert.ok(Number.isFinite(normalized.victories), 'Hunter victories must be finite');
assert.ok(Number.isFinite(normalized.grudge), 'Hunter grudge must be finite');
assert.ok(Number.isFinite(normalized.nextEligibleAt), 'Hunter nextEligibleAt must be finite');
assert.ok(Number.isFinite(normalized.lastSeenAt), 'Hunter lastSeenAt must be finite');
assert.ok(Array.isArray(normalized.adaptations), 'Hunter adaptations must normalize to an array');
assert.ok(Array.isArray(normalized.scars), 'Hunter scars must normalize to an array');
assert.ok(Array.isArray(normalized.knowledge.damageTypes), 'Hunter damage knowledge must normalize to an array');
assert.ok(Array.isArray(normalized.knowledge.sources), 'Hunter source knowledge must normalize to an array');
assert.ok(Array.isArray(normalized.knowledge.covenants), 'Hunter Covenant knowledge must normalize to an array');
assert.ok(normalized.level <= 120, 'Hunter level must be bounded to the supported level range');
assert.ok(normalized.victories <= 1_000_000, 'Hunter victories must be bounded');
assert.ok(normalized.grudge <= 99, 'Hunter grudge must remain within the runtime grudge scale');
assert.equal(normalized.defeated, false, 'only an explicit boolean true may mark a Hunter defeated');

const forgedRewardHunter = system.normalize({
  factionId: 'iron',
  targetRewardId: 'definitely-not-a-real-hunter-bounty'
});
assert.equal(
  forgedRewardHunter.targetRewardId,
  'unbowed-pact',
  'persisted Hunter bounty IDs must normalize to an authored reward for the normalized faction'
);
assert.equal(
  system.recordDefeat(forgedRewardHunter, { now: 1 }).rewardId,
  'unbowed-pact',
  'a forged persisted Hunter bounty must not suppress the authored defeat reward'
);

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key)
};
const input = {
  pointer: { active: false, down: false, commandDirty: false, worldX: 0, worldY: 0 },
  tick() {}, updateWorldPointer() {}, getMove() { return { x: 0, y: 0, moving: false }; },
  getAimDirection() { return null; }, isHeld() { return false; }, consume() { return false; }, defer() {}, press() {}, rumble() {}, reset() {}
};
const renderer = { viewport: { width: 1280, height: 720, scale: 1 }, getAssetStatus: () => ({ ready: true, failed: [] }) };
const seed = new GameEngine(input, renderer, { sound: false, reducedVfx: true });
assert(seed.start('warden', 'thornseer'));
const snapshot = structuredClone(seed.snapshot());
snapshot.player.hunters = [null, hostileHunter, { id: 'second', knowledge: { sources: 12 }, adaptations: { bogus: true } }];
store.set(SAVE_KEY, JSON.stringify(snapshot));
const restored = new GameEngine(input, renderer, { sound: false, reducedVfx: true });
assert.equal(restored.continueRun(), true, 'malformed persisted Hunters must not reject the entire character save');
assert.equal(restored.player.hunters.length, 3, 'Hunter history length should survive normalization');
for (const [index, hunter] of restored.player.hunters.entries()) {
  assert.ok(Number.isFinite(hunter.level), `hunter ${index} level finite`);
  assert.ok(Number.isFinite(hunter.grudge), `hunter ${index} grudge finite`);
  assert.ok(Array.isArray(hunter.adaptations), `hunter ${index} adaptations array`);
}

console.log('Ashen Covenant Hunter persistence hardening audit passed.');
