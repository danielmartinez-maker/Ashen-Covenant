import assert from 'node:assert/strict';
import { SaveMigrator, SAVE_SCHEMA_V19 } from '../src/systems/save-migrator.js';

const artifact = (id, uniqueId, masterwork = 0) => ({
  id, name: uniqueId ?? id, slot: 'weapon', rarity: uniqueId ? 'unique' : 'relic', uniqueId,
  masterwork, runeIds: ['ember-rune'], itemLevel: 72, affixes: [{ stat: 'power', value: 17 }]
});

const representativePlayer = () => ({
  level: 83,
  gold: 129443,
  inventory: [artifact('inv-unique', 'vowbreaker', 8)],
  stash: [artifact('stash-relic', null, 4)],
  equipment: { weapon: artifact('eq-unique', 'bell-sunder', 12) },
  runes: { 'ember-rune': 4, 'grave-rune': 2 },
  aspects: { vowbreaker: 2 },
  skillImprints: { skillOne: 'split-volley' },
  abilityMastery: { skillOne: { xp: 455, rank: 7 } },
  masteryDoctrines: { skillOne: 'ruin' },
  campaign: { chapterId: 'chapter-five', stageId: 'return-maelin-five', choices: { choir: 'mercy' }, flags: { chapterRewards: { 'chapter-four': true } } },
  leveling: { journey: { completed: { firstBlood: true } }, paragonRank: 19, paragonXp: 3112, paragon: { nodes: ['warden-entry'] } },
  factions: { 'bell-keepers': { renown: 415, rank: 4 } },
  contracts: { completed: 27, ledgerXp: 810, active: null },
  reforged: { world: { regions: { gravewake: { threat: 61, control: 33 } } }, eclipse: { allocated: ['black-procession'] } },
  requiem: { difficulty: 'veteran', tutorial: { completed: true }, classMechanics: { warden: { learned: true } } },
  endgameRecords: { 'black-road': { clears: 14, bestTier: 23 }, funeralRoad: { clears: 5, grade: 'S' } },
  nemeses: [{ id: 'nem-harrow', name: 'Harrow Venn', factionId: 'grave', level: 44, wins: 3, losses: 1 }],
  mutationProgress: { credits: 7, selections: { 'warden:spirit-nail': 'impaling-vow' }, unlocked: ['impaling-vow'], legacyConverted: true },
  covenant: { affinities: { grave: 76, flame: 14 }, stage: 4, instability: 8, thresholdsSeen: [1,2,3,4], mutationsUnlocked: ['impaling-vow'] },
  worldV2: { regions: { gravewake: { threat: 61, control: 33 } }, activeEvents: [{ id: 'evt-1', type: 'gravewake-rising', regionId: 'gravewake' }], resolvedEvents: ['evt-old'], tick: 91 },
  sanctuary: { level: 4, flags: { forge: true }, merchants: { reliquary: true }, npcs: { maelin: true }, architecture: ['ossuary-arch'], discoveries: ['boss:cryptwarden:grave'] }
});

const matrix = [
  { version: 13, label: 'pre-Requiem era', removeV6: true },
  { version: 14, label: 'Requiem era', removeV6: true },
  { version: 18, label: 'Black Road era', removeV6: true },
  { version: 19, label: 'v19 current', removeV6: false }
];

for (const entry of matrix) {
  const player = representativePlayer();
  if (entry.removeV6) {
    delete player.covenant;
    delete player.worldV2;
    delete player.sanctuary;
    delete player.mutationProgress;
  }
  const source = { version: entry.version, primary: 'warden', secondary: 'thornseer', player, stats: { kills: 700, bosses: 31, deaths: 4 }, activeOperation: null };
  const migrated = SaveMigrator.migrate(source);
  assert.equal(migrated.version, SAVE_SCHEMA_V19, `${entry.label} must migrate to v19`);
  assert.equal(migrated.player.inventory[0].uniqueId, 'vowbreaker');
  assert.equal(migrated.player.inventory[0].masterwork, 8);
  assert.deepEqual(migrated.player.inventory[0].runeIds, ['ember-rune']);
  assert.equal(migrated.player.equipment.weapon.uniqueId, 'bell-sunder');
  assert.equal(migrated.player.equipment.weapon.masterwork, 12);
  assert.equal(migrated.player.stash[0].masterwork, 4);
  assert.equal(migrated.player.campaign.chapterId, 'chapter-five');
  assert.equal(migrated.player.leveling.paragonRank, 19);
  assert.equal(migrated.player.factions['bell-keepers'].renown, 415);
  assert.equal(migrated.player.contracts.completed, 27);
  assert.equal(migrated.player.requiem.difficulty, 'veteran');
  assert.equal(migrated.player.endgameRecords['black-road'].clears, 14);
  assert.equal(migrated.player.nemeses[0].id, 'nem-harrow', 'legacy Nemesis record must remain readable');
  assert.equal(migrated.player.hunters[0].legacyNemesisId, 'nem-harrow', 'legacy Nemesis must seed persistent Hunter continuity');
  assert.ok(migrated.player.covenant);
  assert.ok(migrated.player.worldV2);
  assert.ok(migrated.player.sanctuary);
  assert.ok(migrated.player.mutationProgress);
  if (!entry.removeV6) {
    assert.equal(migrated.player.covenant.stage, 4);
    assert.equal(migrated.player.mutationProgress.selections['warden:spirit-nail'], 'impaling-vow');
    assert.equal(migrated.player.worldV2.activeEvents[0].type, 'gravewake-rising');
    assert.ok(migrated.player.sanctuary.discoveries.includes('boss:cryptwarden:grave'));
  }
  const second = SaveMigrator.migrate(migrated);
  assert.deepEqual(second, migrated, `${entry.label} migration must be idempotent`);
}

console.log(`Ashen Covenant v6 migration matrix passed (${matrix.length} representative schema generations).`);
