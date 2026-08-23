import assert from 'node:assert/strict';
import { AudioDirector } from '../src/systems/audio.js';

class Parameter {
  constructor(value = 1) { this.value = value; }
  setValueAtTime(value) { this.value = value; }
  linearRampToValueAtTime(value) { this.value = value; }
  exponentialRampToValueAtTime(value) { this.value = value; }
  setTargetAtTime(value) { this.value = value; }
  cancelScheduledValues() {}
}

class Node {
  constructor() {
    this.gain = new Parameter(1);
    this.frequency = new Parameter(440);
    this.detune = new Parameter(0);
    this.Q = new Parameter(0);
    this.pan = new Parameter(0);
    this.playbackRate = new Parameter(1);
    this.threshold = new Parameter(-24);
    this.knee = new Parameter(30);
    this.ratio = new Parameter(12);
    this.attack = new Parameter(0.003);
    this.release = new Parameter(0.25);
    this.onended = null;
  }
  connect(node) { this.destination = node; return node; }
  disconnect() {}
  start() {}
  stop() {}
}

class FakeAudioContext {
  constructor() {
    this.currentTime = 0;
    this.sampleRate = 48000;
    this.state = 'running';
    this.destination = new Node();
  }
  createGain() { return new Node(); }
  createDynamicsCompressor() { return new Node(); }
  createOscillator() { return new Node(); }
  createBiquadFilter() { return new Node(); }
  createBufferSource() { return new Node(); }
  createStereoPanner() { return new Node(); }
  createBuffer(channels, length) {
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    return { duration: length / this.sampleRate, getChannelData: (index) => data[index] };
  }
  async decodeAudioData() { return { duration: 0.12 }; }
}

globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(64) });

const audio = new AudioDirector({ sound: true, masterVolume: 1, sfxVolume: 1, musicVolume: 0, ambienceVolume: 1 });
audio._createGraph(new FakeAudioContext());
assert.equal(await audio.preloadV7Required(), true);

const event = Object.freeze({
  id: 'test-hit',
  semanticId: 'physical-impact',
  priority: 8,
  duck: null,
  layers: Object.freeze([
    Object.freeze({ assetId: 'impact-plate', bus: 'impacts', priority: 8, concurrencyGroup: 'impact', category: 'impact', gain: 0.8, pitch: 1, pan: 0 }),
    Object.freeze({ assetId: 'guard-break', bus: 'impacts', priority: 9, concurrencyGroup: 'impact', category: 'impact', gain: 0.9, pitch: 1, pan: 0 })
  ])
});

assert.equal(audio.playResolved(event), true);
assert.equal(audio.debug().categoryVoices.impact, 2);
assert.equal(audio.playResolved({ ...event, id: 'same-frame-impact' }), false, 'authored semantic cooldown must reject an identical concurrency group in the same audio instant');
audio.context.currentTime = 0.021;
assert.equal(audio.playResolved({ ...event, id: 'post-cooldown-impact' }), true, 'semantic event must become admissible after its authored cooldown');
for (let index = 0; index < 20; index += 1) audio.playResolved({ ...event, id: `impact-${index}` });
assert.ok(audio.debug().categoryVoices.impact <= 10, 'impact category must stay within its voice cap');
assert.ok(audio.debug().activeVoices <= 36, 'global SFX voices must stay within the v7 budget');

const critical = Object.freeze({
  id: 'boss-critical', semanticId: 'boss-phase', priority: 10, duck: null,
  layers: Object.freeze([Object.freeze({ assetId: 'boss-phase', bus: 'enemyAbilities', priority: 10, concurrencyGroup: 'boss-phase', category: 'general', gain: 1, pitch: 1, pan: 0 })])
});
assert.equal(audio.playResolved(critical), true, 'critical boss cues must remain admissible under load');
assert.ok(audio.debug().activeVoices <= 36);

let failedFetches = 0;
globalThis.fetch = async () => {
  failedFetches += 1;
  return { ok: false, status: 503, arrayBuffer: async () => new ArrayBuffer(0) };
};
const failing = new AudioDirector({ sound: true });
failing.context = new FakeAudioContext();
assert.equal(await failing.preloadV7Required(), false, 'required decode/fetch failure must fail preload closed');
assert.ok(failing.sampleFailures.size > 0, 'failed required assets must be recorded');
const firstFailureFetches = failedFetches;
assert.equal(await failing.preloadV7Required(), false);
assert.equal(failedFetches, firstFailureFetches, 'known failed required assets must not be refetched repeatedly');

console.log('Ashen Covenant v7 audio director regression passed.');
