import assert from 'node:assert/strict';
import { AUDIO_ASSETS_V7 } from '../src/data/audio-v7.js';
import { AudioDirector } from '../src/systems/audio.js';
import { validatePresentationRuntime } from '../src/presentation/validator.js';

const requiredAsset = Object.values(AUDIO_ASSETS_V7).find((asset) => asset.required === true);
assert.ok(requiredAsset, 'v7 registry must contain at least one required audio asset');

const audio = new AudioDirector({ sound: false });
audio.sampleFailures.add(requiredAsset.id);
const debug = audio.debug();
assert.equal(
  debug.sampleBank.requiredFailed,
  1,
  'AudioDirector debug state must distinguish failed required v7 assets from optional/legacy failures'
);

const game = {
  player: { animation: {} },
  hitStop: 0,
  camera: { x: 0, y: 0, zoom: 1 },
  getBoss: () => null
};
const presentation = {
  eventBus: { stats: { listenerErrors: 0 } },
  audio
};
const validation = validatePresentationRuntime(game, presentation);
assert.equal(validation.valid, false, 'required v7 audio load/decode failure must invalidate runtime presentation certification');
assert.ok(
  validation.issues.some((entry) => entry.code === 'RUNTIME_V7_AUDIO_REQUIRED_LOAD'),
  'runtime validator must report a dedicated required-v7-audio failure'
);

console.log('Ashen Covenant v7 required audio load validation regression passed.');
