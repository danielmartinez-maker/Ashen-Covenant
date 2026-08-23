import { clamp } from '../core/math.js';
import { AUDIO_ASSETS_V7, AUDIO_CATEGORY_BUDGETS, audioAsset, audioDefinition } from '../data/audio-v7.js';
import { SOUND_PROFILES, SURFACE_AUDIO } from '../data/presentation.js';
import { AdaptiveMusicSystem } from '../presentation/music.js';
import { resolveAssetUrl } from '../core/assets.js';

const SAMPLE_ROOT = '/assets/audio/v5';
const SAMPLE_BANK = {
  attack: 'attack-light.wav',
  projectile: 'projectile.wav',
  companion: 'companion.wav', ward: 'ward.wav', potion: 'potion.wav', dodge: 'dodge.wav', hybrid: 'hybrid.wav', ultimate: 'ultimate.wav',
  hurt: 'hurt.wav', kill: 'kill.wav', level: 'level.wav', boss: 'boss.wav', execute: 'execute.wav', execution: 'execute.wav',
  'enemy-windup': 'enemy-windup.wav', 'projectile-windup': 'enemy-windup.wav', 'boss-windup': 'boss.wav',
  'enemy-attack': 'enemy-attack.wav', 'enemy-heavy': 'attack-heavy.wav', 'boss-attack': 'boss-attack.wav',
  'impact-slash-light': 'impact-light.wav', 'impact-slash-medium': 'impact-medium.wav', 'impact-pierce': 'impact-light.wav',
  'impact-blunt': 'impact-medium.wav', 'impact-heavy': 'impact-heavy.wav', 'impact-critical': 'impact-heavy.wav',
  'impact-magic': 'impact-magic.wav', 'impact-dark': 'impact-magic.wav', 'impact-dark-heavy': 'impact-heavy.wav',
  'impact-holy': 'impact-magic.wav', 'impact-holy-heavy': 'impact-heavy.wav', 'boss-stagger': 'boss-stagger.wav',
  destruction: 'destruction.wav', 'destruction-hit': 'destruction.wav'
};
const WEAPON_SAMPLE = (id) => id.includes('heavy') ? 'attack-heavy.wav' : 'attack-light.wav';
const FOOTSTEP_SAMPLE = {
  stone: 'footstep-stone.wav', wood: 'footstep-dirt.wav', metal: 'footstep-metal.wav', dirt: 'footstep-dirt.wav', grass: 'footstep-dirt.wav',
  mud: 'footstep-mud.wav', water: 'footstep-water.wav', snow: 'footstep-ash.wav', sand: 'footstep-dirt.wav', bone: 'footstep-stone.wav', ash: 'footstep-ash.wav', ice: 'footstep-stone.wav'
};
const MIGRATED_LEGACY_SOUND_IDS = new Set([
  'dodge',
  'enemy-windup', 'projectile-windup', 'boss-windup',
  'enemy-attack', 'enemy-heavy', 'boss-attack'
]);
const isMigratedLegacySound = (id) => typeof id === 'string' && (MIGRATED_LEGACY_SOUND_IDS.has(id) || id.startsWith('weapon-'));

const BUS_NAMES = ['music', 'exploration', 'combat', 'boss', 'stingers', 'cinematic', 'ui', 'dialogue', 'abilities', 'enemyAbilities', 'ambience', 'footsteps', 'impacts', 'destruction'];
const AUDIO_DEBUG_CATEGORIES = ['enemyVocal', 'footstep', 'impact', 'ambience', 'general'];
export const MAX_SFX_VOICES = AUDIO_CATEGORY_BUDGETS.total;

export class AudioDirector {
  constructor(settings = {}) {
    this.settings = settings;
    this.context = null;
    this.master = null;
    this.compressor = null;
    this.musicDuck = null;
    this.buses = {};
    this.music = null;
    this.bus = null;
    this.game = null;
    this.lastSound = new Map();
    this.lastResolvedSound = new Map();
    this.activeVoices = [];
    this.maxSfxVoices = MAX_SFX_VOICES;
    this.noiseBuffer = null;
    this.samples = new Map();
    this.sampleLoads = new Map();
    this.sampleFailures = new Set();
    this.unsubscribers = [];
    this._visibilityBound = false;
  }

  attach(game, presentationBus = null) {
    this.game = game;
    this.bus = presentationBus;
    this.unsubscribers.forEach((unsubscribe) => unsubscribe?.());
    this.unsubscribers = [];
    if (presentationBus) {
      this.unsubscribers.push(presentationBus.on('legacy:sound', (event) => {
        if (isMigratedLegacySound(event.detail?.id)) return;
        this.play(event.detail.id, event.detail);
      }));
    } else if (game?.on) this.unsubscribers.push(game.on('sound', ({ id, ...detail }) => this.play(id, detail)));
  }

  async unlock() {
    if (!this.settings.sound) return false;
    const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContext) return false;
    if (!this.context) this._createGraph(new AudioContext({ latencyHint: 'interactive', sampleRate: 48000 }));
    if (this.context.state === 'suspended') await this.context.resume();
    this.applySettings();
    return this.context.state === 'running';
  }

  _createGraph(context) {
    this.context = context;
    this.master = context.createGain();
    this.compressor = context.createDynamicsCompressor();
    this.compressor.threshold.value = -13;
    this.compressor.knee.value = 16;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.006;
    this.compressor.release.value = 0.22;
    this.master.connect(this.compressor);
    this.compressor.connect(context.destination);
    BUS_NAMES.forEach((name) => {
      const gain = context.createGain();
      gain.gain.value = 1;
      gain.connect(this.master);
      this.buses[name] = gain;
    });
    this.musicDuck = context.createGain();
    this.musicDuck.gain.value = 1;
    this.buses.music.disconnect();
    this.buses.music.connect(this.musicDuck);
    this.musicDuck.connect(this.master);
    this.buses.exploration.disconnect(); this.buses.exploration.connect(this.buses.music);
    this.buses.combat.disconnect(); this.buses.combat.connect(this.buses.music);
    this.buses.boss.disconnect(); this.buses.boss.connect(this.buses.music);
    this.buses.cinematic.disconnect(); this.buses.cinematic.connect(this.buses.music);
    this.buses.stingers.disconnect(); this.buses.stingers.connect(this.buses.music);
    this.music = new AdaptiveMusicSystem(context, { ...this.buses, musicDuck: this.musicDuck }, this.settings, this.bus);
    this.noiseBuffer = this._makeNoiseBuffer();
    this._preloadCoreSamples();
    void this.preloadV7Required();
    if (!this._visibilityBound && typeof document !== 'undefined') {
      this._visibilityBound = true;
      document.addEventListener('visibilitychange', () => this._applyFocusState());
      globalThis.addEventListener?.('blur', () => this._applyFocusState(false));
      globalThis.addEventListener?.('focus', () => this._applyFocusState(true));
    }
  }

  _sampleFileFor(id, detail = {}) {
    if (id === 'footstep') return FOOTSTEP_SAMPLE[detail.surface] ?? FOOTSTEP_SAMPLE.stone;
    if (id.startsWith('weapon-')) return WEAPON_SAMPLE(id);
    return SAMPLE_BANK[id] ?? null;
  }

  _preloadCoreSamples() {
    const files = new Set([...Object.values(SAMPLE_BANK), ...Object.values(FOOTSTEP_SAMPLE), 'attack-heavy.wav', 'attack-light.wav']);
    files.forEach((file) => this._loadSample(file));
  }

  async _loadSample(file) {
    if (!file || !this.context || this.samples.has(file) || this.sampleFailures.has(file)) return this.samples.get(file) ?? null;
    if (this.sampleLoads.has(file)) return this.sampleLoads.get(file);
    const promise = (async () => {
      try {
        const response = await fetch(resolveAssetUrl(`${SAMPLE_ROOT}/${file}`));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const bytes = await response.arrayBuffer();
        const buffer = await this.context.decodeAudioData(bytes.slice(0));
        this.samples.set(file, buffer);
        return buffer;
      } catch {
        this.sampleFailures.add(file);
        return null;
      } finally {
        this.sampleLoads.delete(file);
      }
    })();
    this.sampleLoads.set(file, promise);
    return promise;
  }

  async preloadV7Required() {
    const required = Object.values(AUDIO_ASSETS_V7).filter((asset) => asset.required);
    const results = await Promise.all(required.map((asset) => this._loadV7Asset(asset.id)));
    return results.every(Boolean);
  }

  async _loadV7Asset(assetId) {
    const asset = audioAsset(assetId);
    if (!asset || !this.context || this.samples.has(assetId) || this.sampleFailures.has(assetId)) return this.samples.get(assetId) ?? null;
    if (this.sampleLoads.has(assetId)) return this.sampleLoads.get(assetId);
    const promise = (async () => {
      try {
        const response = await fetch(resolveAssetUrl(asset.src));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const bytes = await response.arrayBuffer();
        const buffer = await this.context.decodeAudioData(bytes.slice(0));
        this.samples.set(assetId, buffer);
        return buffer;
      } catch {
        this.sampleFailures.add(assetId);
        return null;
      } finally {
        this.sampleLoads.delete(assetId);
      }
    })();
    this.sampleLoads.set(assetId, promise);
    return promise;
  }

  _sample(at, key, destination, priority, pitch, gainScale, pan = 0, metadata = {}) {
    const buffer = this.samples.get(key);
    if (!buffer) {
      if (audioAsset(key)) this._loadV7Asset(key);
      else this._loadSample(key);
      return false;
    }
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = buffer;
    source.playbackRate.setValueAtTime(clamp(Number(pitch) || 1, 0.68, 1.55), at);
    gain.gain.setValueAtTime(Math.max(0.0001, gainScale), at);
    source.connect(gain);
    const spatial = this._connectSpatial(gain, destination, pan);
    const duration = Math.max(0.025, buffer.duration / Math.max(0.68, Number(pitch) || 1));
    const voice = { source, end: at + duration + 0.015, priority, stopped: false, sampled: true, category: metadata.category ?? 'general', concurrencyGroup: metadata.concurrencyGroup ?? null };
    this.activeVoices.push(voice);
    source.onended = () => { voice.stopped = true; try { source.disconnect(); gain.disconnect(); if (spatial !== destination) spatial.disconnect(); } catch { /* Nodes may already be collected. */ } };
    source.start(at);
    return true;
  }

  _makeNoiseBuffer() {
    const length = Math.max(1, Math.floor(this.context.sampleRate * 0.7));
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const channel = buffer.getChannelData(0);
    let brown = 0;
    for (let index = 0; index < length; index += 1) {
      brown = brown * 0.86 + (Math.random() * 2 - 1) * 0.14;
      channel[index] = brown;
    }
    return buffer;
  }

  _applyFocusState(focused = typeof document === 'undefined' ? true : !document.hidden) {
    if (!this.context || !this.master) return;
    const allowBackground = this.settings.backgroundAudio === true;
    const mute = !focused && this.settings.muteWhenUnfocused !== false && !allowBackground;
    const now = this.context.currentTime;
    const target = mute || !this.settings.sound ? 0.0001 : clamp(Number(this.settings.masterVolume ?? 0.82), 0.001, 1);
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(target, now, 0.08);
  }

  applySettings() {
    if (!this.context) return;
    const now = this.context.currentTime;
    const set = (bus, value) => {
      if (!bus) return;
      bus.gain.cancelScheduledValues(now);
      bus.gain.setTargetAtTime(Math.max(0.0001, clamp(Number(value), 0, 1)), now, 0.045);
    };
    set(this.master, this.settings.sound === false ? 0 : this.settings.masterVolume ?? 0.82);
    set(this.buses.music, this.settings.musicVolume ?? 0.62);
    set(this.buses.ui, this.settings.sfxVolume ?? 0.82);
    set(this.buses.abilities, this.settings.sfxVolume ?? 0.82);
    set(this.buses.enemyAbilities, this.settings.sfxVolume ?? 0.82);
    set(this.buses.footsteps, (this.settings.sfxVolume ?? 0.82) * 0.78);
    set(this.buses.impacts, this.settings.sfxVolume ?? 0.82);
    set(this.buses.destruction, this.settings.sfxVolume ?? 0.82);
    set(this.buses.dialogue, this.settings.dialogueVolume ?? 0.9);
    set(this.buses.ambience, this.settings.ambienceVolume ?? 0.7);
    if (this.music) this.music.settings = this.settings;
  }

  update(context) {
    if (!this.context || this.context.state !== 'running') return;
    this.applySettings();
    this.music?.update(context);
    this.activeVoices = this.activeVoices.filter((voice) => voice.end > this.context.currentTime && !voice.stopped);
  }

  playResolved(resolved = {}) {
    if (!this.settings.sound || !this.context || this.context.state !== 'running' || !Array.isArray(resolved.layers) || !resolved.layers.length) return false;
    const now = this.context.currentTime;
    const definition = audioDefinition(resolved.semanticId);
    const concurrencyGroup = resolved.layers.find((layer) => layer?.concurrencyGroup)?.concurrencyGroup ?? definition?.concurrencyGroup ?? resolved.semanticId ?? 'general';
    const cooldown = Math.max(0, Number(definition?.cooldown) || 0);
    const last = this.lastResolvedSound.get(concurrencyGroup) ?? -Infinity;
    if (now >= last && now - last < cooldown) return false;
    let played = false;
    for (const layer of resolved.layers.slice(0, 4)) {
      const assetId = layer?.assetId;
      if (!audioAsset(assetId)) continue;
      if (!this.samples.has(assetId)) {
        this._loadV7Asset(assetId);
        continue;
      }
      const priority = Number.isFinite(Number(layer.priority)) ? Number(layer.priority) : Number(resolved.priority) || 1;
      const category = layer.category ?? 'general';
      const layerConcurrencyGroup = layer.concurrencyGroup ?? resolved.semanticId ?? null;
      if (!this._reserveVoices(1, priority, { category, concurrencyGroup: layerConcurrencyGroup })) continue;
      const destination = this.buses[layer.bus] ?? this.buses.abilities;
      played = this._sample(now, assetId, destination, priority, layer.pitch ?? 1, clamp(Number(layer.gain ?? 1), 0, 1.5), layer.pan ?? 0, { category, concurrencyGroup: layerConcurrencyGroup }) || played;
    }
    if (played) this.lastResolvedSound.set(concurrencyGroup, now);
    return played;
  }

  play(id, detail = {}) {
    if (!this.settings.sound || !this.context || this.context.state !== 'running') return false;
    const spec = SOUND_PROFILES[id] ?? SOUND_PROFILES.attack;
    if (!spec) return false;
    const now = this.context.currentTime;
    const last = this.lastSound.get(id) ?? -Infinity;
    if (now - last < (spec.cooldown ?? 0.02)) return false;
    this.lastSound.set(id, now);
    const priority = detail.priority ?? spec.priority ?? 1;
    const pitch = clamp(Number(detail.pitch ?? 1), 0.55, 1.8);
    const gainScale = clamp(Number(detail.gain ?? 1), 0, 1.5);
    const destination = this.buses[spec.category] ?? this.buses.abilities;
    const sampleFile = this._sampleFileFor(id, detail);
    if (sampleFile && this.samples.has(sampleFile)) {
      if (!this._reserveVoices(1, priority)) return false;
      return this._sample(now, sampleFile, destination, priority, pitch, gainScale, detail.pan);
    }
    if (sampleFile) this._loadSample(sampleFile);
    if (!this._reserveVoices(spec.layers.length, priority)) return false;
    spec.layers.forEach((layer, index) => {
      const at = now + index * 0.006;
      if (layer[0] === 'tone') this._tone(at, layer, destination, priority, pitch, gainScale, detail.pan);
      else if (layer[0] === 'noise') this._noise(at, layer, destination, priority, gainScale, detail.pan, detail.filter);
    });
    return true;
  }

  playFootstep(detail = {}) {
    const surface = SURFACE_AUDIO[detail.surface] ?? SURFACE_AUDIO.stone;
    const weight = clamp(Number(detail.weight ?? 1), 0.5, 1.5);
    const speed = clamp(Number(detail.speed ?? 0.5), 0.15, 1.3);
    const armor = detail.armor === 'heavy' ? 1.18 : detail.armor === 'light' ? 0.86 : 1;
    return this.play('footstep', { surface: detail.surface ?? 'stone', pitch: surface.pitch * (detail.foot === 'right' ? 1.025 : 0.985) / Math.sqrt(armor), gain: (0.45 + speed * 0.4) * weight * armor, priority: 1, filter: surface.filter });
  }

  _stopVoice(voice) {
    if (!voice) return;
    voice.stopped = true;
    try { voice.source.stop(); } catch { /* A scheduled source can already have ended. */ }
    this.activeVoices = this.activeVoices.filter((entry) => entry !== voice);
  }

  _lowestPriorityVoice(entries) {
    return entries.slice().sort((left, right) => left.priority - right.priority || left.end - right.end)[0] ?? null;
  }

  _reserveVoices(count, priority, { category = 'general', concurrencyGroup = null } = {}) {
    if (!this.context || count <= 0) return false;
    this.activeVoices = this.activeVoices.filter((voice) => voice.end > this.context.currentTime && !voice.stopped);
    const categoryCap = AUDIO_CATEGORY_BUDGETS[category];
    if (Number.isFinite(categoryCap)) {
      if (count > categoryCap) return false;
      while (this.activeVoices.filter((voice) => voice.category === category).length + count > categoryCap) {
        const candidate = this._lowestPriorityVoice(this.activeVoices.filter((voice) => voice.category === category));
        if (!candidate || candidate.priority > priority) return false;
        this._stopVoice(candidate);
      }
    }
    while (this.activeVoices.length + count > this.maxSfxVoices) {
      const candidate = this._lowestPriorityVoice(this.activeVoices);
      if (!candidate || candidate.priority > priority) return false;
      this._stopVoice(candidate);
    }
    void concurrencyGroup;
    return true;
  }

  _connectSpatial(source, destination, pan = 0) {
    if (!this.context.createStereoPanner) {
      source.connect(destination);
      return destination;
    }
    const panner = this.context.createStereoPanner();
    panner.pan.value = clamp(Number(pan) || 0, -1, 1);
    source.connect(panner); panner.connect(destination);
    return panner;
  }

  _tone(at, layer, destination, priority, pitch, gainScale, pan) {
    const [, wave, from, to, duration, volume] = layer;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(Math.max(22, from * pitch), at);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(22, to * pitch), at + duration);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume * gainScale), at + 0.009);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    oscillator.connect(gain);
    const spatial = this._connectSpatial(gain, destination, pan);
    const voice = { source: oscillator, end: at + duration + 0.025, priority, stopped: false, category: 'general', concurrencyGroup: null };
    this.activeVoices.push(voice);
    oscillator.onended = () => { voice.stopped = true; try { oscillator.disconnect(); gain.disconnect(); if (spatial !== destination) spatial.disconnect(); } catch { /* Nodes may already be collected. */ } };
    oscillator.start(at); oscillator.stop(voice.end);
  }

  _noise(at, layer, destination, priority, gainScale, pan, filterOverride = null) {
    const [, duration, volume, cutoff] = layer;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = this.noiseBuffer;
    const frequency = Number.isFinite(Number(filterOverride)) ? Number(filterOverride) : cutoff;
    filter.type = frequency < 900 ? 'lowpass' : 'bandpass';
    filter.frequency.setValueAtTime(frequency, at);
    filter.Q.value = frequency < 900 ? 0.65 : 1.15;
    gain.gain.setValueAtTime(Math.max(0.0002, volume * gainScale), at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(filter); filter.connect(gain);
    const spatial = this._connectSpatial(gain, destination, pan);
    const voice = { source, end: at + duration + 0.02, priority, stopped: false, category: 'general', concurrencyGroup: null };
    this.activeVoices.push(voice);
    source.onended = () => { voice.stopped = true; try { source.disconnect(); filter.disconnect(); gain.disconnect(); if (spatial !== destination) spatial.disconnect(); } catch { /* Nodes may already be collected. */ } };
    source.start(at, Math.random() * 0.25, duration); source.stop(voice.end);
  }

  debug() {
    const live = this.activeVoices.filter((voice) => !voice.stopped && (!this.context || voice.end > this.context.currentTime));
    return {
      unlocked: Boolean(this.context),
      state: this.context?.state ?? 'locked',
      activeVoices: live.length,
      maxSfxVoices: this.maxSfxVoices,
      categoryVoices: Object.fromEntries(AUDIO_DEBUG_CATEGORIES.map((category) => [category, live.filter((voice) => (voice.category ?? 'general') === category).length])),
      sampleBank: { decoded: this.samples.size, loading: this.sampleLoads.size, failed: this.sampleFailures.size },
      buses: Object.keys(this.buses),
      music: this.music?.debug() ?? { state: 'locked', cueId: null, activeVoices: 0 }
    };
  }
}
