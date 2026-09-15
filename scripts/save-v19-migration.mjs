import assert from 'node:assert/strict';
import { DomainEventBus, DOMAIN_EVENTS } from '../src/systems/domain-events.js';
import { SaveMigrator, SAVE_SCHEMA_V19 } from '../src/systems/save-migrator.js';

const bus = new DomainEventBus();
let heard = null;
const off = bus.on('covenant:threshold-crossed', (detail) => { heard = detail; });
bus.emit('covenant:threshold-crossed', { stage: 2 });
assert.deepEqual(heard, { stage: 2 });
off();
heard = null;
bus.emit('covenant:threshold-crossed', { stage: 3 });
assert.equal(heard, null);
assert(DOMAIN_EVENTS.has('hunter:defeated'));

const legacy = {
  version: 18,
  primary: 'warden',
  secondary: 'thornseer',
  player: {
    level: 47,
    inventory: [{ id: 'item-1', uniqueId: 'vowbreaker' }],
    equipment: { weapon: { id: 'item-2', uniqueId: 'bell-sunder' } },
    skillImprints: { skillOne: 'legacy-imprint' },
    abilityMastery: { skillOne: { xp: 55, rank: 3 } },
    reforged: { world: { oathId: 'veteran', regions: { gravewake: { threat: 41 } } } },
    nemeses: [{ id: 'nem-1', name: 'Harrow Venn', factionId: 'grave', level: 9, wins: 2, losses: 1 }],
    campaign: { chapterId: 'chapter-two' },
    leveling: { paragonRank: 11 },
    endgameRecords: { blackRoad: { clears: 4 } }
  },
  stats: { kills: 101 }
};
const migrated = SaveMigrator.migrate(legacy);
assert.equal(migrated.version, SAVE_SCHEMA_V19);
assert.equal(migrated.player.level, 47);
assert.equal(migrated.player.inventory[0].uniqueId, 'vowbreaker');
assert.equal(migrated.player.equipment.weapon.uniqueId, 'bell-sunder');
assert.equal(migrated.player.covenant.stage, 0);
assert.equal(migrated.player.covenant.affinities.grave, 0);
assert.equal(migrated.player.hunters[0].legacyNemesisId, 'nem-1');
assert.equal(migrated.player.nemeses[0].id, 'nem-1', 'legacy nemeses retained for one compatibility release');
assert.equal(migrated.player.worldV2.regions.gravewake.threat, 41);
assert.equal(migrated.player.sanctuary.level, 1);
assert.equal(migrated.stats.kills, 101);

// Migration is a trust boundary. A save that claims to already be v19 must not
// bypass normalization and leak hostile/non-finite numeric values downstream.
const hostileCurrent = SaveMigrator.migrate({
  version: SAVE_SCHEMA_V19,
  player: {
    covenant: { affinities: { grave: 'Infinity' }, stage: 'Infinity', instability: '-Infinity' },
    worldV2: { regions: {}, activeEvents: [], resolvedEvents: [], procession: null, tick: 'Infinity' },
    sanctuary: { level: 'Infinity', flags: {}, merchants: {}, npcs: {}, architecture: [], discoveries: [] },
    hunters: [],
    mutationProgress: { credits: 'Infinity', selections: {}, unlocked: [], legacyConverted: true }
  }
});
assert.equal(hostileCurrent.version, SAVE_SCHEMA_V19);
assert.ok(Number.isFinite(hostileCurrent.player.worldV2.tick), 'current-schema world tick must remain finite');
assert.ok(hostileCurrent.player.worldV2.tick >= 0 && hostileCurrent.player.worldV2.tick <= Number.MAX_SAFE_INTEGER);
assert.ok(Number.isSafeInteger(hostileCurrent.player.mutationProgress.credits), 'current-schema mutation credits must remain a safe integer');
assert.ok(hostileCurrent.player.mutationProgress.credits >= 0 && hostileCurrent.player.mutationProgress.credits <= 1_000_000);
assert.ok(Number.isFinite(hostileCurrent.player.sanctuary.level) && hostileCurrent.player.sanctuary.level >= 1 && hostileCurrent.player.sanctuary.level <= 5);
assert.ok(Number.isFinite(hostileCurrent.player.covenant.affinities.grave) && hostileCurrent.player.covenant.affinities.grave >= 0 && hostileCurrent.player.covenant.affinities.grave <= 100);
assert.ok(Number.isFinite(hostileCurrent.player.covenant.instability) && hostileCurrent.player.covenant.instability >= 0 && hostileCurrent.player.covenant.instability <= 100);
const hostileCurrentSecond = SaveMigrator.migrate(hostileCurrent);
assert.deepEqual(hostileCurrentSecond, hostileCurrent, 'hostile current-schema normalization must be idempotent');

const second = SaveMigrator.migrate(migrated);
assert.deepEqual(second, migrated, 'v19 migration must be idempotent');
console.log('Ashen Covenant v19 migration/domain-event regression passed.');

const store = new Map();
globalThis.localStorage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value), removeItem: (key) => store.delete(key) };
const { GameEngine } = await import('../src/systems/game.js');
const input = { pointer: { active: false, worldX: 0, worldY: 0 }, tick() {}, updateWorldPointer() {}, getMove() { return { x: 0, y: 0, moving: false }; }, isHeld() { return false; }, consume() { return false; }, defer() {}, rumble() {} };
const game = new GameEngine(input, { viewport: { width: 1280, height: 720, scale: 1 } }, { reducedVfx: true });
assert.ok(game.start('warden', 'thornseer'));
assert.equal(game.snapshot().version, SAVE_SCHEMA_V19);
assert.ok(game.player.covenant);
assert.ok(Array.isArray(game.player.hunters));
assert.ok(game.domainEvents instanceof DomainEventBus);
