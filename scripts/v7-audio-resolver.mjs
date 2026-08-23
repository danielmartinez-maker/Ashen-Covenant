import assert from 'node:assert/strict';
import { AudioPresentationResolver, semanticAudioEventFor } from '../src/presentation/audio-resolver-v7.js';

const resolver = new AudioPresentationResolver();
const context = Object.freeze({
  actorKind: 'player',
  weaponFamily: 'longsword',
  hitWeight: 'heavy',
  damageFamily: 'physical',
  contactMaterial: 'plate',
  guarded: false,
  guardBroken: true,
  poiseBroken: false,
  staggered: true,
  critical: true,
  execution: false,
  covenantPrimary: 'flame',
  covenantStage: 4,
  covenantInstability: 0,
  settings: Object.freeze({ reducedVfx: false }),
  movementIntensity: 1,
  surface: 'stone',
  region: 'bellscar'
});

assert.equal(semanticAudioEventFor('combat:attack-impact', { critical: true }, context), 'physical-impact');
const first = resolver.resolve('combat:attack-impact', { critical: true }, context, 'hit-42');
const second = resolver.resolve('combat:attack-impact', { critical: true }, context, 'hit-42');
assert.deepEqual(first, second, 'stable event key must pick deterministic variants');
assert.ok(first.layers.length >= 3 && first.layers.length <= 4);
assert.ok(first.layers.some((layer) => layer.assetId === 'impact-plate'));
assert.ok(first.layers.some((layer) => layer.assetId === 'guard-break'));
assert.ok(first.layers.some((layer) => layer.assetId === 'poise-break'));
assert.ok(first.layers.some((layer) => layer.assetId === 'cov-flame'));

const reduced = resolver.resolve('combat:attack-impact', { critical: true }, { ...context, settings: Object.freeze({ reducedVfx: true }) }, 'hit-42-reduced');
assert.ok(reduced.layers.length <= first.layers.length);
assert.ok(reduced.layers.some((layer) => layer.assetId === 'guard-break'), 'critical mechanical cue survives reduced density');
assert.ok(!reduced.layers.some((layer) => layer.assetId === 'cov-flame'), 'optional covenant density should drop below stage 5');

const swing = resolver.resolve('combat:attack-start', {}, { ...context, hitWeight: 'heavy' }, 'swing-7');
assert.equal(swing.semanticId, 'weapon-swing');
assert.match(swing.layers[0].assetId, /^swing-heavy-/);
assert.deepEqual(swing, resolver.resolve('combat:attack-start', {}, { ...context, hitWeight: 'heavy' }, 'swing-7'));

const foot = resolver.resolve('animation:footstep', { surface: 'stone', foot: 'left', speed: 0.7 }, context, 'foot-1');
assert.equal(foot.semanticId, 'footstep');
assert.equal(foot.layers[0].assetId, 'footstep-stone-v5');
assert.equal(foot.layers[0].category, 'footstep');

const boss = resolver.resolve('boss:signature-cue', { phase: 3 }, { ...context, actorKind: 'boss', covenantPrimary: 'grave', covenantStage: 5 }, 'boss-phase-3');
assert.equal(boss.semanticId, 'boss-phase');
assert.ok(boss.layers.some((layer) => layer.assetId === 'boss-phase'));

console.log('Ashen Covenant v7 semantic audio resolver regression passed.');
