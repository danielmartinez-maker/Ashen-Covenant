import assert from 'node:assert/strict';
import { MUSIC_CUES, MUSIC_STINGERS, REGION_MUSIC_IDENTITIES } from '../src/data/presentation.js';
import {
  AdaptiveMusicSystem, MusicCueDatabase, MusicHistoryTracker, QuantizedTransitionScheduler, ThreatIntensityEvaluator
} from '../src/presentation/music.js';
import { PresentationEventBus } from '../src/presentation/event-bus.js';

class Parameter {
  constructor(value = 1) { this.value = value; }
  setValueAtTime(value) { this.value = value; }
  linearRampToValueAtTime(value) { this.value = value; }
  exponentialRampToValueAtTime(value) { this.value = value; }
  setTargetAtTime(value) { this.value = value; }
  cancelScheduledValues() {}
}
class Node {
  constructor() { this.gain = new Parameter(1); this.frequency = new Parameter(440); this.detune = new Parameter(0); this.Q = new Parameter(0); this.onended = null; }
  connect(node) { this.destination = node; return node; } disconnect() {} start() {} stop() {}
}
class FakeAudioContext {
  constructor() { this.currentTime = 0; this.sampleRate = 48000; }
  createGain() { return new Node(); } createOscillator() { return new Node(); } createBiquadFilter() { return new Node(); }
  createBufferSource() { return new Node(); }
  createBuffer(channels, length) { const data = Array.from({ length: channels }, () => new Float32Array(length)); return { getChannelData: (index) => data[index] }; }
}

const database = new MusicCueDatabase();
const history = new MusicHistoryTracker();
const base = {
  currentRegion: 'redfen', musicState: 'Exploration', musicIntensity: .24, playerInCombat: false, playerInTown: false,
  nearbyBoss: null, bossStaggerState: false, timeOfDay: 'day'
};
assert.equal(database.select(base, history, 0).id, 'mus-redfen-exploration');
assert.equal(database.select({ ...base, musicState: 'Combat', musicIntensity: .7, playerInCombat: true }, history, 0).id, 'mus-redfen-combat');
assert.equal(database.select({ ...base, musicState: 'Boss', nearbyBoss: 'cryptwarden', musicIntensity: .8 }, history, 0).id, 'mus-boss-cryptwarden');
assert.equal(database.select({ ...base, musicState: 'Narrative' }, history, 0).id, 'mus-narrative-names');

const scheduler = new QuantizedTransitionScheduler();
const current = { tempo: 60, timeSignature: [4, 4] };
assert.equal(scheduler.schedule({ id: 'next' }, current, .13, 'next-bar').at, 4);
assert.equal(scheduler.schedule({ id: 'beat' }, current, .13, 'next-beat').at, 1);
assert.equal(scheduler.consume(.9), null);
assert.equal(scheduler.consume(1).cue.id, 'beat');

const evaluator = new ThreatIntensityEvaluator();
assert.equal(evaluator.evaluate({ musicIntensity: 1.4, intensityBand: 'Climax' }), 1);
assert.equal(evaluator.band, 'Climax');

const cueIds = new Set();
MUSIC_CUES.forEach((cue) => {
  assert.ok(!cueIds.has(cue.id)); cueIds.add(cue.id);
  assert.equal(cue.assetStatus, 'procedural-placeholder-original');
  assert.ok(cue.stems.length >= 2 && cue.tempo >= 30 && cue.timeSignature.length === 2);
});
assert.equal(Object.keys(REGION_MUSIC_IDENTITIES).length, 6);
assert.ok(Object.keys(MUSIC_STINGERS).length >= 12);

const context = new FakeAudioContext();
const buses = Object.fromEntries(['music', 'musicDuck', 'stingers'].map((id) => [id, new Node()]));
const bus = new PresentationEventBus({ strict: true });
const music = new AdaptiveMusicSystem(context, buses, { dynamicMusicIntensity: 1, combatMusicFrequency: 'standard' }, bus);
music.update(base);
assert.equal(music.currentCue.id, 'mus-redfen-exploration');
assert.ok(music.layers.activeStemIds.includes('drone'));
const firstCue = music.currentCue;
context.currentTime = 1;
music.update({ ...base, musicState: 'Combat', musicIntensity: .78, playerInCombat: true });
assert.equal(music.currentCue, firstCue, 'non-critical transitions must wait for a musical boundary');
assert.ok(music.transitions.pending);
context.currentTime = music.transitions.pending.at;
music.update({ ...base, musicState: 'Combat', musicIntensity: .78, playerInCombat: true });
assert.equal(music.currentCue.id, 'mus-redfen-combat');
assert.ok(music.layers.activeStemIds.includes('percussion'));

context.currentTime += 4;
music.update({ ...base, musicState: 'Boss', nearbyBoss: 'cryptwarden', musicIntensity: .86, playerInCombat: true });
context.currentTime = music.transitions.pending?.at ?? context.currentTime;
music.update({ ...base, musicState: 'Boss', nearbyBoss: 'cryptwarden', musicIntensity: .86, playerInCombat: true });
const revealTime = music.stingers.lastPlayed.get('boss-reveal');
context.currentTime += 4;
music.update({ ...base, musicState: 'PlayerDeath', nearbyBoss: 'cryptwarden', musicIntensity: .2, playerInCombat: true });
context.currentTime += 3;
music.update({ ...base, musicState: 'Boss', nearbyBoss: 'cryptwarden', musicIntensity: .86, playerInCombat: true });
assert.equal(music.stingers.lastPlayed.get('boss-reveal'), revealTime, 'revival in the same boss phase must not replay the reveal sting');
assert.equal(music.transitions.pending, null, 'returning from death must restore the current boss cue immediately');

bus.emit('music:stinger', { id: 'boss-defeat' });
assert.ok(music.postBossSilenceUntil > context.currentTime);
assert.equal(music.playStinger('boss-defeat'), false, 'stinger cooldowns must block duplicates');
const debug = music.debug();
assert.equal(debug.assetStatus, 'procedural-placeholder-original');
assert.ok(debug.history.length >= 2 && debug.transitions >= 2);

console.log('Ashen Covenant adaptive music test passed.');
