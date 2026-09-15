import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameEngine } from '../src/systems/game.js';
import { GamePresentationSystem } from '../src/presentation/system.js';
import { SaveMigrator, SAVE_SCHEMA_V19 } from '../src/systems/save-migrator.js';
import { saveRun, loadSave } from '../src/systems/save.js';
import { validateV7PresentationData } from '../src/presentation/validator.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key)
};

const input = {
  pointer: { active: false, down: false, commandDirty: false, worldX: 0, worldY: 0 },
  tick() {}, updateWorldPointer() {},
  getMove() { return { x: 0, y: 0, moving: false }; },
  getAimDirection() { return null; },
  isHeld() { return false; }, consume() { return false; }, defer() {}, rumble() {}
};
const renderer = {
  viewport: { width: 1280, height: 720, scale: 1 },
  getAssetStatus: () => ({ ready: true, failed: [] })
};
const audio = {
  attach() {}, update() {}, playResolved() { return true; },
  debug() { return { activeVoices: 0, categoryVoices: { impact: 0, footstep: 0, enemyVocal: 0, ambience: 0 } }; }
};

const item = {
  id: 'eq-unique', name: 'Bell-Sunder', slot: 'weapon', baseId: 'cleaver', rarity: 'unique', uniqueId: 'bell-sunder',
  masterwork: 12, corruption: 'grave-taint', runeIds: ['ember-rune'], itemLevel: 72, affixes: [{ stat: 'power', value: 17 }]
};
const source = SaveMigrator.migrate({
  version: 19, primary: 'warden', secondary: 'thornseer', stats: { kills: 700, bosses: 31, deaths: 4 }, activeOperation: null,
  player: {
    level: 83, gold: 129443, inventory: [], stash: [], equipment: { weapon: item }, runes: { 'ember-rune': 4 }, aspects: {}, skillImprints: {}, abilityMastery: {}, masteryDoctrines: {},
    campaign: { chapterId: 'chapter-five', stageId: 'return-maelin-five', choices: {}, flags: {} }, leveling: { journey: { completed: {} }, paragonRank: 19, paragonXp: 3112, paragon: { nodes: [] } },
    factions: {}, contracts: { completed: 27, ledgerXp: 810, active: null }, reforged: {}, requiem: { difficulty: 'veteran', tutorial: { completed: true }, classMechanics: {} },
    endgameRecords: { 'black-road': { clears: 14, bestTier: 23 } }, nemeses: [], hunters: [], mutationProgress: { credits: 7, selections: {}, unlocked: [], legacyConverted: true },
    covenant: { affinities: { grave: 76, flame: 14, blood: 0, light: 0, storm: 0, void: 0 }, stage: 4, instability: 8, thresholdsSeen: [1, 2, 3, 4], mutationsUnlocked: [] },
    worldV2: { regions: {}, activeEvents: [], resolvedEvents: [], tick: 91 }, sanctuary: { level: 4, flags: {}, merchants: {}, npcs: {}, architecture: [], discoveries: [] }
  }
});
assert.equal(source.version, SAVE_SCHEMA_V19);
assert.equal(saveRun(source), true);

const game = new GameEngine(input, renderer, { sound: false, reducedVfx: false, reducedMotion: false, reducedFlashing: true });
const presentation = new GamePresentationSystem(game, { input, settings: game.settings, audio, strictEvents: true });
assert.equal(game.continueRun(), true, 'representative v19 save must load through the real GameEngine path');
presentation.update(0.1);
assert.equal(game.player.level, 83);
assert.equal(game.player.equipment.weapon.uniqueId, 'bell-sunder');
assert.equal(game.player.equipment.weapon.masterwork, 12);
assert.equal(game.player.equipment.weapon.corruption, 'grave-taint');
assert.ok(game.player.presentation.resolvedClip, 'loaded player must resolve a v7 animation clip');
assert.ok(game.player.presentation.equipmentAppearance, 'loaded equipment must resolve v7 appearance state');
assert.ok(game.player.presentation.equipmentAppearance.signatureIds.includes('unique:bell-sunder'), 'loaded Unique identity must remain visible');
assert.equal(game.player.presentation.equipmentAppearance.corruptionTier, 1, 'persisted corruption marker must still affect v7 appearance');
assert.equal(game.save(), true);

const roundTrip = loadSave();
assert.equal(roundTrip.version, SAVE_SCHEMA_V19);
assert.equal(roundTrip.player.equipment.weapon.uniqueId, 'bell-sunder');
assert.equal(roundTrip.player.equipment.weapon.masterwork, 12);
assert.equal(roundTrip.player.equipment.weapon.corruption, 'grave-taint');
assert.equal(roundTrip.player.level, 83);
assert.equal(roundTrip.player.covenant.stage, 4);
const serialized = JSON.stringify(roundTrip);
for (const forbidden of ['resolvedClip', 'equipmentAppearance', 'combatContext', 'assetId', 'sourcePath', 'categoryVoices']) {
  assert.equal(serialized.includes(forbidden), false, `save must not persist ${forbidden}`);
}

const presentationDir = path.join(root, 'src', 'presentation');
for (const name of fs.readdirSync(presentationDir).filter((entry) => entry.endsWith('.js'))) {
  const text = fs.readFileSync(path.join(presentationDir, name), 'utf8');
  assert.equal(/from\s+['"][^'"]*systems\/game\.js['"]/.test(text), false, `${name} must not reverse-import GameEngine`);
}
for (const name of ['renderer.js', 'audio.js']) {
  const text = fs.readFileSync(path.join(root, 'src', 'systems', name), 'utf8');
  assert.equal(/from\s+['"][^'"]*(save(?:-migrator)?|combat|covenant)\.js['"]/.test(text), false, `${name} must not import gameplay/save ownership`);
}
for (const name of ['combat-context-v7.js', 'animation-clips-v7.js', 'equipment-appearance-v7.js', 'audio-resolver-v7.js']) {
  const text = fs.readFileSync(path.join(presentationDir, name), 'utf8');
  assert.equal(/\bgame\.[A-Za-z_$][\w$]*\s*=/.test(text), false, `${name} must not mutate game`);
  assert.equal(/\bplayer\.[A-Za-z_$][\w$]*\s*=/.test(text), false, `${name} must not mutate player`);
}

const validation = validateV7PresentationData();
assert.equal(validation.valid, true, validation.issues.map((entry) => `${entry.code}: ${entry.message}`).join('\n'));
assert.equal(validation.summary.animation.assets, 6, 'all six hero body asset contracts must be certified');
assert.ok(validation.summary.equipment.signatures >= 1, 'equipment signature catalog must be certified');
assert.ok(validation.summary.audio.assets >= 1, 'v7 audio asset catalog must be certified');

console.log('Ashen Covenant v7 save and architecture compatibility passed.');