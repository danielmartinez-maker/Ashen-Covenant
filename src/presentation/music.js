import { clamp } from '../core/math.js';
import { MUSIC_CUES, MUSIC_STINGERS, REGION_MUSIC_IDENTITIES } from '../data/presentation.js';

const contextState = (context) => context?.musicOverride ?? context?.musicState ?? 'MainMenu';
const cueContext = (cue) => cue.contextTags?.[0] ?? 'Exploration';

export class MusicHistoryTracker {
  constructor(limit = 16) {
    this.limit = limit;
    this.cues = [];
    this.sections = [];
    this.counts = new Map();
    this.cooldowns = new Map();
  }

  recordCue(id, now = 0) {
    this.cues.unshift(id);
    this.cues.length = Math.min(this.cues.length, this.limit);
    this.counts.set(id, (this.counts.get(id) ?? 0) + 1);
    this.cooldowns.set(id, now);
  }

  recordSection(id) {
    this.sections.unshift(id);
    this.sections.length = Math.min(this.sections.length, this.limit);
  }

  penalty(cue, now) {
    const recentIndex = this.cues.indexOf(cue.id);
    const recency = recentIndex < 0 ? 0 : Math.max(0.12, 0.52 - recentIndex * 0.08);
    const cooldown = now - (this.cooldowns.get(cue.id) ?? -Infinity) < (cue.cooldown ?? 0) ? 0.5 : 0;
    const repeat = this.cues[0] === cue.id ? 0.45 : 0;
    return recency + cooldown + repeat;
  }
}

export class MusicCueDatabase {
  constructor(cues = MUSIC_CUES) {
    this.cues = cues;
    this.byId = new Map(cues.map((cue) => [cue.id, cue]));
  }

  get(id) {
    return this.byId.get(id) ?? null;
  }

  candidates(context) {
    const state = contextState(context);
    const region = context?.currentRegion ?? 'sanctuary';
    return this.cues.filter((cue) => {
      if (!cue.contextTags?.includes(state)) return false;
      if (state === 'Boss') return !cue.bossId || cue.bossId === context?.nearbyBoss;
      if (['Exploration', 'Combat', 'Dungeon', 'Settlement'].includes(state)) return cue.region === region;
      return true;
    });
  }

  select(context, history, now = 0) {
    let candidates = this.candidates(context);
    if (!candidates.length) {
      const fallbackState = context?.playerInCombat ? 'Combat' : context?.playerInTown ? 'Settlement' : 'Exploration';
      candidates = this.cues.filter((cue) => cue.contextTags?.includes(fallbackState) && cue.region === (context?.currentRegion ?? 'sanctuary'));
    }
    if (!candidates.length) return this.byId.get('mus-ui-main-menu') ?? this.cues[0] ?? null;
    const intensity = clamp(context?.musicIntensity ?? 0.2, 0, 1);
    return candidates
      .map((cue) => ({ cue, score: (cue.priority ?? 0) + (cue.weight ?? 1) * 4 - history.penalty(cue, now) * 12 - Math.abs(clamp(intensity, cue.minimumIntensity, cue.maximumIntensity) - intensity) * 8 + (cue.bossId === context?.nearbyBoss ? 30 : 0) }))
      .sort((a, b) => b.score - a.score)[0]?.cue ?? candidates[0];
  }
}

export class QuantizedTransitionScheduler {
  constructor() {
    this.pending = null;
  }

  schedule(cue, currentCue, now, mode = null) {
    const transitionMode = mode ?? cue?.transitionMode ?? 'next-bar';
    if (!currentCue || transitionMode === 'immediate') {
      this.pending = { cue, at: now, mode: 'immediate' };
      return this.pending;
    }
    const tempo = Math.max(30, currentCue.tempo ?? 60);
    const beat = 60 / tempo;
    const beatsPerBar = currentCue.timeSignature?.[0] ?? 4;
    const quantum = transitionMode === 'next-beat' ? beat
      : transitionMode === 'next-half-bar' ? beat * beatsPerBar * 0.5
        : transitionMode === 'next-two-bars' ? beat * beatsPerBar * 2
          : transitionMode === 'next-four-bars' ? beat * beatsPerBar * 4
            : beat * beatsPerBar;
    const at = Math.ceil((now + 0.025) / quantum) * quantum;
    this.pending = { cue, at, mode: transitionMode };
    return this.pending;
  }

  consume(now) {
    if (!this.pending || now + 0.002 < this.pending.at) return null;
    const pending = this.pending;
    this.pending = null;
    return pending;
  }
}

export class ThreatIntensityEvaluator {
  constructor() {
    this.value = 0;
    this.band = 'Silence';
  }

  evaluate(context) {
    this.value = clamp(context?.musicIntensity ?? context?.enemyThreatScore ?? 0, 0, 1);
    this.band = context?.intensityBand ?? (this.value < 0.45 ? 'Exploration' : this.value < 0.75 ? 'Combat' : 'HeavyCombat');
    return this.value;
  }
}

const modeSemitone = (degree, mode) => {
  if (!Number.isFinite(degree)) return 0;
  const length = mode.length;
  const octave = Math.floor(degree / length);
  const index = ((degree % length) + length) % length;
  return mode[index] + octave * 12;
};

const CLASS_MOTIF_OFFSETS = { warden: 0, thornseer: 1, ironbound: -2, veilrunner: 4, gravebinder: -1, dawnstrider: 5 };

export class MusicLayerController {
  constructor(audioContext, destination) {
    this.context = audioContext;
    this.destination = destination;
    this.cue = null;
    this.cueGain = null;
    this.nextStepTime = 0;
    this.stepIndex = 0;
    this.activeVoices = 0;
    this.activeStemIds = [];
    this.section = 'intro';
    this.sectionBar = 0;
    this.noiseBuffer = this._makeNoiseBuffer();
  }

  _makeNoiseBuffer() {
    const length = Math.max(1, Math.floor(this.context.sampleRate * 0.8));
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const channel = buffer.getChannelData(0);
    let last = 0;
    for (let index = 0; index < length; index += 1) {
      const white = Math.random() * 2 - 1;
      last = last * 0.82 + white * 0.18;
      channel[index] = last;
    }
    return buffer;
  }

  start(cue, now, { fade = 0.65 } = {}) {
    this.stop(now, fade * 0.7);
    this.cue = cue;
    this.cueGain = this.context.createGain();
    this.cueGain.gain.setValueAtTime(0.0001, now);
    this.cueGain.gain.exponentialRampToValueAtTime(1, now + Math.max(0.03, fade));
    this.cueGain.connect(this.destination);
    this.nextStepTime = now + 0.035;
    this.stepIndex = 0;
    this.section = 'intro';
    this.sectionBar = 0;
  }

  stop(now, fade = 0.45) {
    if (!this.cueGain) return;
    const gain = this.cueGain;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value || 1), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.03, fade));
    globalThis.setTimeout?.(() => {
      try { gain.disconnect(); } catch { /* The retired cue may already be disconnected. */ }
    }, Math.ceil((Math.max(0.03, fade) + 0.08) * 1000));
    this.cueGain = null;
    this.cue = null;
  }

  schedule(intensity, context, horizon = 0.14) {
    if (!this.cue || !this.cueGain) return;
    const now = this.context.currentTime;
    const tempo = Math.max(30, this.cue.tempo ?? 60);
    const sixteenth = 60 / tempo / 4;
    const beatsPerBar = this.cue.timeSignature?.[0] ?? 4;
    const stepsPerBar = beatsPerBar * 4;
    const identity = REGION_MUSIC_IDENTITIES[context?.currentRegion] ?? REGION_MUSIC_IDENTITIES.sanctuary;
    while (this.nextStepTime < now + horizon) {
      const step = this.stepIndex;
      const phase = step % stepsPerBar;
      const bar = Math.floor(step / stepsPerBar);
      if (bar !== this.sectionBar) {
        this.sectionBar = bar;
        const sections = this.cue.sections ?? ['a'];
        this.section = sections[Math.floor(bar / 2) % sections.length];
      }
      this.activeStemIds = [];
      for (const stem of this.cue.stems ?? []) {
        const threshold = stem.minIntensity ?? 0;
        if (intensity + 0.001 < threshold) continue;
        const layerStrength = threshold <= 0 ? 1 : clamp((intensity - threshold) / Math.max(0.08, 1 - threshold), 0.12, 1);
        const pattern = stem.pattern ?? [];
        const value = stem.role === 'drone' ? phase === 0 ? pattern[0] : null : pattern[phase % pattern.length];
        if (value === null || value === undefined) continue;
        this.activeStemIds.push(stem.id);
        if (typeof value === 'string') this._schedulePercussion(this.nextStepTime, stem, value, layerStrength);
        else {
          const classColor = stem.id === 'class-color' ? CLASS_MOTIF_OFFSETS[context?.playerClass] ?? 0 : 0;
          const covenantColor = Number(context?.covenantSemitoneOffset) || 0;
          const degree = Number(value) + (this.cue.motifOffset ?? 0) + classColor + covenantColor;
          const semitone = modeSemitone(degree, identity.mode) + (stem.octave ?? 0) * 12;
          const frequency = identity.root * 2 ** (semitone / 12);
          const duration = stem.role === 'drone' ? sixteenth * stepsPerBar * 1.05 : stem.role === 'harmony' || stem.role === 'choir' ? sixteenth * 3.4 : sixteenth * 0.82;
          this._scheduleTone(this.nextStepTime, duration, frequency, stem.wave, stem.gain * layerStrength, stem.role);
        }
      }
      this.nextStepTime += sixteenth;
      this.stepIndex += 1;
    }
  }

  _scheduleTone(at, duration, frequency, wave = 'sine', gainValue = 0.02, role = 'harmony') {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    oscillator.type = ['sine', 'triangle', 'sawtooth', 'square'].includes(wave) ? wave : 'sine';
    oscillator.frequency.setValueAtTime(clamp(frequency, 24, 4000), at);
    if (role === 'texture') oscillator.detune.setValueAtTime((Math.random() - 0.5) * 18, at);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(role === 'brass' ? 750 : role === 'choir' ? 1200 : role === 'climax' ? 1600 : 980, at);
    const attack = Math.min(0.08, duration * 0.22);
    const release = Math.min(0.16, duration * 0.32);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainValue), at + attack);
    gain.gain.setValueAtTime(Math.max(0.0002, gainValue * 0.82), Math.max(at + attack, at + duration - release));
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    oscillator.connect(filter); filter.connect(gain); gain.connect(this.cueGain);
    this.activeVoices += 1;
    oscillator.onended = () => { this.activeVoices = Math.max(0, this.activeVoices - 1); try { oscillator.disconnect(); filter.disconnect(); gain.disconnect(); } catch { /* Nodes can already be collected. */ } };
    oscillator.start(at); oscillator.stop(at + duration + 0.02);
  }

  _schedulePercussion(at, stem, kind, strength) {
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    source.buffer = this.noiseBuffer;
    filter.type = kind === 'kick' ? 'lowpass' : 'bandpass';
    filter.frequency.setValueAtTime(kind === 'kick' ? 160 : 1800, at);
    filter.Q.value = kind === 'kick' ? 0.7 : 1.8;
    const duration = kind === 'kick' ? 0.18 : 0.055;
    const volume = stem.gain * strength * (kind === 'kick' ? 1 : 0.48);
    gain.gain.setValueAtTime(Math.max(0.0002, volume), at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(filter); filter.connect(gain); gain.connect(this.cueGain);
    this.activeVoices += 1;
    source.onended = () => { this.activeVoices = Math.max(0, this.activeVoices - 1); try { source.disconnect(); filter.disconnect(); gain.disconnect(); } catch { /* Nodes can already be collected. */ } };
    source.start(at, Math.random() * 0.2, duration); source.stop(at + duration + 0.01);
  }
}

export class MusicStingerController {
  constructor(audioContext, destination, settings = {}) {
    this.context = audioContext;
    this.destination = destination;
    this.settings = settings;
    this.lastPlayed = new Map();
    this.lastPriority = 0;
    this.activeVoices = 0;
  }

  play(id, root = 55) {
    const spec = MUSIC_STINGERS[id];
    if (!spec || this.settings.reducedStingers === true && spec.priority < 85) return false;
    const now = this.context.currentTime;
    if (now - (this.lastPlayed.get(id) ?? -Infinity) < spec.cooldown) return false;
    if (this.lastPriority > spec.priority && now - (this.lastPlayed.get('__any') ?? -Infinity) < 0.45) return false;
    this.lastPlayed.set(id, now);
    this.lastPlayed.set('__any', now);
    this.lastPriority = spec.priority;
    const spacing = spec.duration / Math.max(1, spec.notes.length + 1);
    spec.notes.forEach((note, index) => this._note(now + index * spacing, root * 2 ** (note / 12), Math.max(0.12, spec.duration - index * spacing), spec.wave, spec.gain * (1 - index * 0.08)));
    return true;
  }

  _note(at, frequency, duration, wave, volume) {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, at);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    oscillator.connect(gain); gain.connect(this.destination);
    this.activeVoices += 1;
    oscillator.onended = () => { this.activeVoices = Math.max(0, this.activeVoices - 1); try { oscillator.disconnect(); gain.disconnect(); } catch { /* Nodes can already be collected. */ } };
    oscillator.start(at); oscillator.stop(at + duration + 0.02);
  }
}

export class MusicMixController {
  constructor(audioContext, musicBus) {
    this.context = audioContext;
    this.musicBus = musicBus;
    this.duck = 1;
    this.targetDuck = 1;
    this.overrideDuck = null;
  }

  setDialogue(active, critical = false) {
    this.targetDuck = active ? critical ? 0.32 : 0.58 : 1;
  }

  setOverride(active, amount = 1) {
    this.overrideDuck = active ? clamp(Number(amount) || 1, 0.1, 1) : null;
  }

  setContext(context) {
    this.targetDuck = this.overrideDuck ?? (context?.cinematicActive ? 0.32 : context?.gamePaused ? 0.72 : 1);
  }

  update() {
    const now = this.context.currentTime;
    this.duck += (this.targetDuck - this.duck) * 0.16;
    this.musicBus.gain.cancelScheduledValues(now);
    this.musicBus.gain.setTargetAtTime(Math.max(0.0001, this.duck), now, this.targetDuck < this.duck ? 0.08 : 0.32);
  }
}

export class AdaptiveMusicSystem {
  constructor(audioContext, buses, settings = {}, bus = null) {
    this.context = audioContext;
    this.buses = buses;
    this.settings = settings;
    this.bus = bus;
    this.database = new MusicCueDatabase();
    this.history = new MusicHistoryTracker();
    this.transitions = new QuantizedTransitionScheduler();
    this.threat = new ThreatIntensityEvaluator();
    this.layers = new MusicLayerController(audioContext, buses.music);
    this.stingers = new MusicStingerController(audioContext, buses.stingers, settings);
    this.mix = new MusicMixController(audioContext, buses.musicDuck ?? buses.music);
    this.currentCue = null;
    this.desiredCue = null;
    this.state = 'Boot';
    this.lastState = 'Boot';
    this.lastSection = null;
    this.silenceUntil = 0;
    this.nextSilenceAt = 0;
    this.transitionCount = 0;
    this.postBossSilenceUntil = 0;
    this.revealedBossId = null;
    this.lastContext = null;
    this.bus?.on('music:stinger', (event) => {
      if (event.detail.id === 'boss-defeat') this.postBossSilenceUntil = this.context.currentTime + 2.15;
      this.playStinger(event.detail.id);
    });
    this.bus?.on('legacy:player-dead', () => this.playStinger('death'));
    this.bus?.on('legacy:respawned', () => this.playStinger('resurrection'));
    this.bus?.on('legacy:level-up', () => this.playStinger('level'));
    this.bus?.on('legacy:stronghold-liberated', () => this.playStinger('stronghold-liberated'));
    this.bus?.on('legacy:endgame-complete', () => this.playStinger('operation-victory'));
    this.bus?.on('loot:spawn', (event) => {
      const rarity = event.detail?.item?.rarity;
      if (['relic', 'unique', 'mythic'].includes(rarity)) this.playStinger(rarity === 'relic' ? 'legendary' : rarity);
    });
    this.bus?.on('music:duck', (event) => this.mix.setOverride(event.detail.active, event.detail.amount));
  }

  update(context) {
    this.lastContext = context;
    const previousState = this.lastState;
    this.state = contextState(context);
    if (this.state === 'Boss' && context?.nearbyBoss && this.revealedBossId !== context.nearbyBoss) {
      this.revealedBossId = context.nearbyBoss;
      this.playStinger('boss-reveal');
    } else if (!context?.nearbyBoss && !['PlayerDeath', 'Cinematic'].includes(this.state)) this.revealedBossId = null;
    const now = this.context.currentTime;
    const frequency = this.settings.combatMusicFrequency === 'reduced' ? 0.72 : this.settings.combatMusicFrequency === 'frequent' ? 1.12 : 1;
    let intensity = clamp(this.threat.evaluate(context) * clamp(Number(this.settings.dynamicMusicIntensity ?? 1), 0, 1.25) * (this.state === 'Combat' ? frequency : 1), 0, 1);
    if (context?.bossStaggerState) intensity = Math.min(intensity, 0.56);
    const desired = this.database.select({ ...context, musicIntensity: intensity }, this.history, now);
    this.desiredCue = desired;
    if (desired && desired.id !== this.currentCue?.id && this.transitions.pending?.cue?.id !== desired.id) {
      const immediate = ['PlayerDeath', 'Cinematic'].includes(this.state) || !this.currentCue || previousState === 'PlayerDeath' || previousState === 'Boss' && this.state !== 'Boss';
      this.transitions.schedule(desired, this.currentCue, now, immediate ? 'immediate' : desired.transitionMode);
    }
    const pending = this.transitions.consume(now);
    if (pending) this._transition(pending.cue, pending.at);
    this._updateSilence(context, now);
    const silence = now < this.postBossSilenceUntil || now < this.silenceUntil && ['Exploration', 'Settlement'].includes(this.state);
    if (!silence) this.layers.schedule(intensity, context);
    if (this.layers.section && this.layers.section !== this.lastSection) {
      this.lastSection = this.layers.section;
      this.history.recordSection(this.layers.section);
    }
    if (this.layers.cueGain) {
      const target = silence ? 0.0001 : 1;
      this.layers.cueGain.gain.setTargetAtTime(target, now, silence ? 0.9 : 1.8);
    }
    this.mix.setContext(context);
    this.mix.update();
    this.lastState = this.state;
  }

  _transition(cue, at) {
    this.layers.start(cue, at, { fade: this.currentCue ? 0.7 : 0.25 });
    this.currentCue = cue;
    this.history.recordCue(cue.id, at);
    this.transitionCount += 1;
    this.silenceUntil = 0;
    this.nextSilenceAt = at + Math.max(28, cue.minimumPlayTime ?? 12) + 18;
    this.bus?.emit('music:state', { state: this.state, cueId: cue.id, transitionMode: cue.transitionMode }, { source: 'adaptive-music' });
  }

  _updateSilence(context, now) {
    if (!['Exploration', 'Settlement'].includes(this.state) || context?.musicIntensity > 0.34) {
      this.silenceUntil = 0;
      this.nextSilenceAt = now + 30;
      return;
    }
    if (this.silenceUntil > now || now < this.nextSilenceAt) return;
    const identity = REGION_MUSIC_IDENTITIES[context?.currentRegion] ?? REGION_MUSIC_IDENTITIES.sanctuary;
    const range = context?.timeOfDay === 'night' ? identity.nightSilence : identity.daySilence;
    const deterministic = (Math.sin((this.history.cues.length + 1) * 12.9898 + now * 0.01) + 1) * 0.5;
    this.silenceUntil = now + range[0] + (range[1] - range[0]) * deterministic;
    this.nextSilenceAt = this.silenceUntil + 38;
  }

  playStinger(id) {
    const region = this.lastContext?.currentRegion ?? 'sanctuary';
    const identity = REGION_MUSIC_IDENTITIES[region] ?? REGION_MUSIC_IDENTITIES.sanctuary;
    return this.stingers.play(id, identity.root);
  }

  debug() {
    return {
      state: this.state, cueId: this.currentCue?.id ?? null, desiredCueId: this.desiredCue?.id ?? null,
      section: this.layers.section, activeStems: [...this.layers.activeStemIds], intensity: this.threat.value,
      band: this.threat.band, transitionAt: this.transitions.pending?.at ?? null, transitions: this.transitionCount,
      activeVoices: this.layers.activeVoices + this.stingers.activeVoices, silenceRemaining: Math.max(0, this.silenceUntil - this.context.currentTime, this.postBossSilenceUntil - this.context.currentTime),
      history: this.history.cues.slice(0, 6), assetStatus: 'procedural-placeholder-original'
    };
  }
}
