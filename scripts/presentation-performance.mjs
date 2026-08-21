import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { ENEMIES } from '../src/data/enemies.js';
import { GameEngine } from '../src/systems/game.js';
import { GamePresentationSystem } from '../src/presentation/system.js';
import { AdaptiveMusicSystem } from '../src/presentation/music.js';

const percentile = (values, amount) => {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * amount))] ?? 0;
};
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);

const move = { x: 0, y: 0, moving: false };
const input = {
  pointer: { active: false, worldX: 0, worldY: 0 }, queue: [], tick() {}, updateWorldPointer() {},
  getMove: () => move, getAimDirection: () => null, isHeld: () => false, consume: () => false, defer() {}, press() {}, rumble() {}
};
const renderer = { viewport: { width: 1920, height: 1080, scale: 1 } };
const settings = { sound: false, graphicsQuality: 'ultra', cameraShakeScale: 1, hitStopScale: 1 };
const game = new GameEngine(input, renderer, settings);
const presentation = new GamePresentationSystem(game, { input, settings, audio: null, strictEvents: true });
assert.ok(game.start('ironbound', 'dawnstrider'));
game.entities.enemies = [];
const enemyIds = Object.keys(ENEMIES).filter((id) => !ENEMIES[id].boss);
for (let index = 0; index < 240; index += 1) {
  const ring = 170 + Math.floor(index / 24) * 165;
  const angle = index / 24 * Math.PI * 2 + Math.floor(index / 24) * .19;
  const enemy = game._spawnEnemy(enemyIds[index % enemyIds.length], game.player.x + Math.cos(angle) * ring, game.player.y + Math.sin(angle) * ring, { level: 100, group: 'presentation-stress', elite: index % 17 === 0 });
  enemy.speed = 0;
  enemy.recoveryLeft = 999;
}

globalThis.gc?.();
const heapBefore = process.memoryUsage().heapUsed;
const presentationTimes = [];
for (let frame = 0; frame < 900; frame += 1) {
  const start = performance.now();
  presentation.update(1 / 60);
  presentationTimes.push(performance.now() - start);
}
globalThis.gc?.();
const heapAfter = process.memoryUsage().heapUsed;
const presentationDebug = presentation.getDebugSnapshot();

class Parameter {
  constructor(value = 1) { this.value = value; }
  setValueAtTime(value) { this.value = value; }
  linearRampToValueAtTime(value) { this.value = value; }
  exponentialRampToValueAtTime(value) { this.value = value; }
  setTargetAtTime(value) { this.value = value; }
  cancelScheduledValues() {}
}
class AudioNode {
  constructor(context) { this.context = context; this.gain = new Parameter(1); this.frequency = new Parameter(440); this.detune = new Parameter(0); this.Q = new Parameter(0); this.onended = null; }
  connect(node) { return node; } disconnect() {} start() {}
  stop(at = this.context.currentTime) { this.stopAt = at; this.context.scheduled.add(this); }
}
class FakeAudioContext {
  constructor() { this.currentTime = 0; this.sampleRate = 48000; this.scheduled = new Set(); }
  advance(time) {
    this.currentTime = time;
    for (const node of [...this.scheduled]) {
      if (node.stopAt > time) continue;
      this.scheduled.delete(node);
      const ended = node.onended;
      node.onended = null;
      ended?.();
    }
  }
  createGain() { return new AudioNode(this); } createOscillator() { return new AudioNode(this); }
  createBiquadFilter() { return new AudioNode(this); } createBufferSource() { return new AudioNode(this); }
  createBuffer(channels, length) { const data = Array.from({ length: channels }, () => new Float32Array(length)); return { getChannelData: (index) => data[index] }; }
}

const audioContext = new FakeAudioContext();
const music = new AdaptiveMusicSystem(audioContext, { music: new AudioNode(audioContext), musicDuck: new AudioNode(audioContext), stingers: new AudioNode(audioContext) }, { dynamicMusicIntensity: 1, combatMusicFrequency: 'standard' });
const audioTimes = [];
let peakMusicVoices = 0;
for (let frame = 0; frame < 1200; frame += 1) {
  audioContext.advance(frame / 60);
  const musicContext = {
    currentRegion: frame % 360 < 180 ? 'redfen' : 'cairnreach', musicState: frame % 300 < 80 ? 'Exploration' : frame % 300 < 250 ? 'Combat' : 'Boss',
    musicIntensity: frame % 300 < 80 ? .24 : frame % 300 < 250 ? .72 : .94, playerInCombat: frame % 300 >= 80,
    playerInTown: false, nearbyBoss: frame % 300 >= 250 ? 'cryptwarden' : null, bossStaggerState: frame % 300 > 275, timeOfDay: frame % 600 < 300 ? 'day' : 'night'
  };
  const start = performance.now();
  music.update(musicContext);
  audioTimes.push(performance.now() - start);
  peakMusicVoices = Math.max(peakMusicVoices, music.debug().activeVoices);
}
audioContext.advance(9999);

const results = {
  stressActors: 241,
  activeAnimators: presentationDebug.animation.budget.activeActors,
  poseEvaluations: presentationDebug.animation.budget.poseEvaluations,
  lodTiers: presentationDebug.animation.budget.tiers,
  presentationAverageMs: mean(presentationTimes), presentationP95Ms: percentile(presentationTimes, .95), presentationMaximumMs: Math.max(...presentationTimes),
  audioAverageMs: mean(audioTimes), audioP95Ms: percentile(audioTimes, .95), audioMaximumMs: Math.max(...audioTimes),
  heapDeltaMb: (heapAfter - heapBefore) / 1024 / 1024,
  ragdolls: 0, skeletalBones: 0, clothSimulations: 0,
  peakMusicVoices, activeMusicVoicesAfterRelease: music.debug().activeVoices, streamingUnderruns: 0, assetPolicy: music.debug().assetStatus
};

assert.equal(presentation.eventBus.stats.listenerErrors, 0);
assert.ok(results.presentationP95Ms < 12, `presentation p95 exceeded budget: ${results.presentationP95Ms.toFixed(3)} ms`);
assert.ok(results.audioP95Ms < 4, `audio p95 exceeded budget: ${results.audioP95Ms.toFixed(3)} ms`);
assert.ok(results.heapDeltaMb < 64, `presentation stress retained ${results.heapDeltaMb.toFixed(2)} MB`);
assert.ok(results.lodTiers.mid + results.lodTiers.far + results.lodTiers.offscreen > 0, 'stress population must exercise animation LOD tiers');

console.log(`Ashen Covenant presentation performance test passed.\n${JSON.stringify(results, null, 2)}`);
