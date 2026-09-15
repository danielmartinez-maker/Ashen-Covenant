import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AUDIO_ASSETS_V7 } from '../src/data/audio-v7.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public', 'assets', 'audio', 'v7');
fs.mkdirSync(out, { recursive: true });

const rate = 48000;
const hash = (text) => [...text].reduce((value, char) => ((value * 33) ^ char.charCodeAt(0)) >>> 0, 5381);
const seeded = (seed) => () => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return ((seed >>> 0) % 1_000_000) / 1_000_000;
};
const envelope = (t, duration, attack = 0.008, release = 0.16) => Math.min(1, t / attack) * Math.min(1, Math.max(0, duration - t) / release);
const noise = (random) => random() * 2 - 1;
const tone = (t, hz) => Math.sin(t * Math.PI * 2 * hz);

const writeWav = (file, samples) => {
  const bytes = Buffer.alloc(44 + samples.length * 2);
  bytes.write('RIFF', 0);
  bytes.writeUInt32LE(36 + samples.length * 2, 4);
  bytes.write('WAVE', 8);
  bytes.write('fmt ', 12);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(rate, 24);
  bytes.writeUInt32LE(rate * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36);
  bytes.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((sample, index) => bytes.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(sample * 32767))), 44 + index * 2));
  fs.writeFileSync(file, bytes);
};

const render = (id, duration, voice) => {
  const count = Math.floor(rate * duration);
  const random = seeded(hash(id));
  const samples = new Float32Array(count);
  for (let index = 0; index < count; index += 1) {
    const t = index / rate;
    samples[index] = Math.max(-1, Math.min(1, voice(t, duration, random) * envelope(t, duration)));
  }
  return samples;
};

const profileFor = (id) => {
  if (id.startsWith('swing-light')) return [0.16, (t, d, random) => noise(random) * 0.28 + tone(t, 220 + 480 * (1 - t / d)) * 0.18];
  if (id.startsWith('swing-heavy')) return [0.24, (t, d, random) => noise(random) * 0.34 + tone(t, 92 + 170 * (1 - t / d)) * 0.32];
  if (id === 'impact-plate' || id === 'guard-impact' || id === 'guard-break' || id === 'poise-break') return [0.30, (t, d, random) => tone(t, 160) * 0.34 + tone(t, 320) * 0.18 + noise(random) * 0.20];
  if (id.startsWith('impact-')) return [0.24, (t, d, random) => noise(random) * 0.42 + tone(t, id.includes('flesh') ? 88 : 130) * 0.24];
  if (id === 'projectile-launch') return [0.18, (t, d, random) => tone(t, 190 + 310 * (1 - t / d)) * 0.18 + noise(random) * 0.14];
  if (id === 'projectile-pass') return [0.18, (t, d, random) => noise(random) * 0.22 + tone(t, 520 - 220 * t / d) * 0.08];
  if (id === 'projectile-impact') return [0.22, (t, d, random) => noise(random) * 0.34 + tone(t, 120) * 0.18];
  if (id.startsWith('cov-flame')) return [0.34, (t, d, random) => noise(random) * (0.18 + 0.2 * Math.sin(t * 90) ** 2) + tone(t, 260) * 0.12];
  if (id.startsWith('cov-grave')) return [0.46, (t) => tone(t, 72) * 0.30 + tone(t, 144) * 0.10];
  if (id.startsWith('cov-blood')) return [0.42, (t) => tone(t, 54 + Math.sin(t * 12) * 8) * 0.34];
  if (id.startsWith('cov-light')) return [0.46, (t) => tone(t, 660) * 0.16 + tone(t, 990) * 0.08];
  if (id.startsWith('cov-storm')) return [0.28, (t, d, random) => noise(random) * 0.34 * Math.max(0, Math.sin(t * 75)) + tone(t, 210) * 0.14];
  if (id.startsWith('cov-void')) return [0.50, (t, d, random) => tone(t, 44 + 90 * t / d) * 0.32 + noise(random) * 0.08];
  if (id.startsWith('ambience-')) return [0.85, (t, d, random) => noise(random) * 0.10 + tone(t, 38 + (hash(id) % 30)) * 0.08];
  if (id.startsWith('boss-') || id.startsWith('hunter-') || id.startsWith('execution-')) return [0.58, (t, d, random) => tone(t, 48 + 90 * (1 - t / d)) * 0.40 + noise(random) * 0.16];
  if (id.startsWith('enemy-')) return [0.34, (t, d, random) => tone(t, 105 + Math.sin(t * 23) * 30) * 0.24 + noise(random) * 0.18];
  if (id.startsWith('spell-') || id === 'summon') return [0.44, (t, d, random) => tone(t, 240 + 380 * t / d) * 0.20 + noise(random) * 0.10];
  if (id === 'dodge-cloth') return [0.18, (t, d, random) => noise(random) * 0.24 * (1 - t / d) + tone(t, 310) * 0.05];
  if (id === 'destruction') return [0.42, (t, d, random) => noise(random) * 0.44 + tone(t, 74 + 46 * (1 - t / d)) * 0.24];
  if (id.startsWith('ui-') || id.startsWith('loot-') || id === 'unique-reveal') return [0.22, (t) => tone(t, id === 'ui-error' ? 170 : 520) * 0.22 + tone(t, id === 'unique-reveal' ? 780 : 0) * 0.10];
  return [0.28, (t, d, random) => noise(random) * 0.18 + tone(t, 180) * 0.16];
};

const generated = Object.values(AUDIO_ASSETS_V7).filter((asset) => !asset.legacy);
for (const asset of generated) {
  const [duration, voice] = profileFor(asset.id);
  writeWav(path.join(out, `${asset.id}.wav`), render(asset.id, duration, voice));
}

console.log(`Generated ${generated.length} v7 WAV assets.`);
