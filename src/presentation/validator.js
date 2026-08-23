import {
  CAMERA_PROFILES, CLASS_PRESENTATION_PROFILES, IMPACT_PROFILES, MUSIC_CUES, MUSIC_STINGERS,
  PRESENTATION_FALLBACKS, SOUND_PROFILES, DESTRUCTIBLE_PROFILES, PLAYER_ACTION_PROFILES
} from '../data/presentation.js';
import { ANIMATION_SEMANTIC_STATES, HERO_MOTION_ASSETS, PLAYER_ANIMATION_CLIPS } from '../data/animation-v7.js';
import { MAX_SFX_VOICES } from '../systems/audio.js';

const issue = (severity, code, message, target = null) => ({ severity, code, message, target });

export const validateV7AnimationData = () => {
  const issues = [];
  for (const [classId, asset] of Object.entries(HERO_MOTION_ASSETS)) {
    if (!asset.required || !asset.src.startsWith('/assets/hero-motion-') || !asset.src.endsWith('-v7.png')) {
      issues.push(issue('error', 'V7_ANIM_ASSET', `${classId} has an invalid required body asset.`, classId));
    }
    for (const semantic of ANIMATION_SEMANTIC_STATES) {
      const clip = PLAYER_ANIMATION_CLIPS[`${classId}:${semantic}`];
      if (!clip) {
        issues.push(issue('error', 'V7_ANIM_CLIP', `${classId}:${semantic} is missing.`, classId));
        continue;
      }
      if (!Array.isArray(clip.frameWindow) || clip.frameWindow.length !== 2 || clip.frameWindow.some((value) => !Number.isInteger(value) || value < 0 || value > 7)) {
        issues.push(issue('error', 'V7_ANIM_CLIP', `${clip.id} has an invalid frame window.`, clip.id));
      }
      if (!clip.anchors?.body || !clip.anchors?.hand || !clip.anchors?.feet) {
        issues.push(issue('error', 'V7_ANIM_ANCHOR', `${clip.id} is missing required anchors.`, clip.id));
      }
      if (clip.marker !== null && !(clip.marker >= 0 && clip.marker <= 1)) {
        issues.push(issue('error', 'V7_ANIM_MARKER', `${clip.id} has invalid marker timing.`, clip.id));
      }
    }
  }
  return {
    valid: !issues.some((entry) => entry.severity === 'error'),
    issues,
    summary: { assets: Object.keys(HERO_MOTION_ASSETS).length, clips: Object.keys(PLAYER_ANIMATION_CLIPS).length }
  };
};

export const validatePresentationData = () => {
  const issues = [];
  const ids = new Set();
  for (const [classId, profile] of Object.entries(CLASS_PRESENTATION_PROFILES)) {
    if (!profile.weapon) issues.push(issue('error', 'ANIM_MISSING_WEAPON', `${classId} has no weapon identity.`, classId));
    if (!profile.attacks?.length) issues.push(issue('error', 'ANIM_MISSING_ATTACKS', `${classId} has no attack profiles.`, classId));
    for (const attack of profile.attacks ?? []) {
      if (ids.has(attack.id)) issues.push(issue('error', 'DUPLICATE_ID', `Duplicate presentation id ${attack.id}.`, attack.id));
      ids.add(attack.id);
      if (!(attack.startup >= 0 && attack.active >= attack.startup && attack.duration >= attack.active)) issues.push(issue('error', 'ANIM_INVALID_TIMING', `${attack.id} phase timing is invalid.`, attack.id));
      const events = attack.events ?? [];
      const eventIds = new Set();
      const hitOn = events.find((event) => event.id === 'EnableHitbox');
      const hitOff = events.find((event) => event.id === 'DisableHitbox');
      if (!hitOn || !hitOff || hitOn.at > hitOff.at) issues.push(issue('error', 'ANIM_INVALID_HITBOX', `${attack.id} needs an ordered hitbox window.`, attack.id));
      for (const event of events) {
        if (eventIds.has(event.id)) issues.push(issue('error', 'ANIM_DUPLICATE_EVENT', `${attack.id} repeats ${event.id}.`, attack.id));
        eventIds.add(event.id);
        if (event.at < 0 || event.at > attack.duration + 0.0001) issues.push(issue('error', 'ANIM_EVENT_OUT_OF_RANGE', `${attack.id}/${event.id} lies outside the timeline.`, attack.id));
      }
      Object.entries(attack.cancelWindows ?? {}).forEach(([name, window]) => {
        if (!Array.isArray(window) || window.length !== 2 || window[0] < 0 || window[1] < window[0] || window[1] > attack.duration + 0.0001) issues.push(issue('error', 'ANIM_INVALID_CANCEL', `${attack.id}/${name} has an invalid cancel window.`, attack.id));
      });
      if (!IMPACT_PROFILES[attack.impactProfile]) issues.push(issue('error', 'ANIM_INVALID_IMPACT', `${attack.id} references ${attack.impactProfile}.`, attack.id));
      if (!SOUND_PROFILES[attack.audioProfile]) issues.push(issue('error', 'ANIM_INVALID_AUDIO', `${attack.id} references ${attack.audioProfile}.`, attack.id));
    }
  }
  for (const [actionId, profile] of Object.entries(PLAYER_ACTION_PROFILES)) {
    if (ids.has(profile.id)) issues.push(issue('error', 'DUPLICATE_ID', `Duplicate presentation id ${profile.id}.`, profile.id));
    ids.add(profile.id);
    if (!(profile.startup >= 0 && profile.active >= profile.startup && profile.duration >= profile.active)) issues.push(issue('error', 'ACTION_INVALID_TIMING', `${actionId} phase timing is invalid.`, actionId));
    const eventIds = new Set();
    for (const event of profile.events ?? []) {
      if (eventIds.has(event.id)) issues.push(issue('error', 'ACTION_DUPLICATE_EVENT', `${actionId} repeats ${event.id}.`, actionId));
      eventIds.add(event.id);
      if (event.at < 0 || event.at > profile.duration + 0.0001) issues.push(issue('error', 'ACTION_EVENT_OUT_OF_RANGE', `${actionId}/${event.id} lies outside the timeline.`, actionId));
    }
    ['CommitAction', 'PlayActionSound', 'ResolveAction', 'EndAction'].forEach((eventId) => {
      if (!eventIds.has(eventId)) issues.push(issue('error', 'ACTION_MISSING_EVENT', `${actionId} is missing ${eventId}.`, actionId));
    });
    Object.entries(profile.cancelWindows ?? {}).forEach(([name, window]) => {
      if (!Array.isArray(window) || window.length !== 2 || window[0] < profile.active || window[1] < window[0] || window[1] > profile.duration + 0.0001) issues.push(issue('error', 'ACTION_INVALID_CANCEL', `${actionId}/${name} has an invalid cancel window.`, actionId));
    });
  }
  const cueIds = new Set();
  for (const cue of MUSIC_CUES) {
    if (!cue.id || cueIds.has(cue.id)) issues.push(issue('error', 'MUSIC_DUPLICATE_CUE', `Invalid or duplicate cue id ${cue.id}.`, cue.id));
    cueIds.add(cue.id);
    if (!Number.isFinite(cue.tempo) || cue.tempo < 30 || cue.tempo > 240) issues.push(issue('error', 'MUSIC_INVALID_TEMPO', `${cue.id} has invalid tempo.`, cue.id));
    if (!Array.isArray(cue.timeSignature) || cue.timeSignature.length !== 2 || cue.timeSignature.some((value) => !Number.isInteger(value) || value <= 0)) issues.push(issue('error', 'MUSIC_INVALID_METER', `${cue.id} has invalid meter.`, cue.id));
    if (!cue.stems?.length) issues.push(issue('error', 'MUSIC_MISSING_STEMS', `${cue.id} has no stems.`, cue.id));
    if (!(cue.minimumIntensity >= 0 && cue.maximumIntensity <= 1 && cue.minimumIntensity <= cue.maximumIntensity)) issues.push(issue('error', 'MUSIC_INVALID_INTENSITY', `${cue.id} has invalid intensity bounds.`, cue.id));
    if (!['immediate', 'next-beat', 'next-half-bar', 'next-bar', 'next-two-bars', 'next-four-bars'].includes(cue.transitionMode)) issues.push(issue('error', 'MUSIC_INVALID_TRANSITION', `${cue.id} has unsupported transition mode ${cue.transitionMode}.`, cue.id));
    if (!cue.assetStatus || !cue.streamingPolicy || !cue.preloadingPolicy || !cue.loudnessMetadata) issues.push(issue('error', 'MUSIC_MISSING_METADATA', `${cue.id} is missing production metadata.`, cue.id));
    const stemIds = new Set();
    for (const stem of cue.stems ?? []) {
      if (!stem.id || !Array.isArray(stem.pattern) || !stem.pattern.length) issues.push(issue('error', 'MUSIC_INVALID_STEM', `${cue.id} contains an invalid stem.`, cue.id));
      if (stemIds.has(stem.id)) issues.push(issue('error', 'MUSIC_DUPLICATE_STEM', `${cue.id} repeats stem ${stem.id}.`, cue.id));
      stemIds.add(stem.id);
      if (!Number.isFinite(stem.gain) || stem.gain <= 0 || stem.gain > 0.25) issues.push(issue('error', 'MUSIC_INVALID_STEM_GAIN', `${cue.id}/${stem.id} has invalid gain.`, cue.id));
    }
  }
  if (!MUSIC_CUES.some((cue) => cue.id === 'mus-ui-main-menu')) issues.push(issue('error', 'MUSIC_MISSING_FALLBACK', 'Main-menu music fallback is missing.'));
  ['MainMenu', 'CharacterCreation', 'Loading', 'Exploration', 'Settlement', 'Dungeon', 'Combat', 'Boss', 'Narrative', 'PlayerDeath', 'Victory', 'Credits'].forEach((context) => {
    if (!MUSIC_CUES.some((cue) => cue.contextTags?.includes(context))) issues.push(issue('error', 'MUSIC_MISSING_CONTEXT', `No cue covers ${context}.`, context));
  });
  Object.entries(MUSIC_STINGERS).forEach(([id, stinger]) => {
    if (!stinger.notes?.length || !Number.isFinite(stinger.duration)) issues.push(issue('error', 'MUSIC_INVALID_STINGER', `${id} is invalid.`, id));
  });
  Object.entries(SOUND_PROFILES).forEach(([id, sound]) => {
    if (!sound.category || !sound.layers?.length) issues.push(issue('error', 'AUDIO_INVALID_PROFILE', `${id} is invalid.`, id));
  });
  Object.entries(DESTRUCTIBLE_PROFILES).forEach(([id, profile]) => {
    if (!Number.isFinite(profile.health) || profile.health <= 0 || !IMPACT_PROFILES[profile.impactProfile]) issues.push(issue('error', 'DESTRUCTIBLE_INVALID_PROFILE', `${id} is invalid.`, id));
  });
  if (!IMPACT_PROFILES[PRESENTATION_FALLBACKS.impact]) issues.push(issue('error', 'IMPACT_MISSING_FALLBACK', 'Impact fallback is missing.'));
  if (!CAMERA_PROFILES[PRESENTATION_FALLBACKS.camera]) issues.push(issue('error', 'CAMERA_MISSING_FALLBACK', 'Camera fallback is missing.'));
  if (!SOUND_PROFILES[PRESENTATION_FALLBACKS.sound]) issues.push(issue('error', 'AUDIO_MISSING_FALLBACK', 'Sound fallback is missing.'));
  return { valid: !issues.some((entry) => entry.severity === 'error'), issues, summary: { classes: Object.keys(CLASS_PRESENTATION_PROFILES).length, attacks: Object.values(CLASS_PRESENTATION_PROFILES).reduce((sum, profile) => sum + profile.attacks.length, 0), actions: Object.keys(PLAYER_ACTION_PROFILES).length, cues: MUSIC_CUES.length, stems: MUSIC_CUES.reduce((sum, cue) => sum + cue.stems.length, 0), stingers: Object.keys(MUSIC_STINGERS).length, sounds: Object.keys(SOUND_PROFILES).length, impacts: Object.keys(IMPACT_PROFILES).length, cameras: Object.keys(CAMERA_PROFILES).length } };
};

export const validatePresentationRuntime = (game, presentation) => {
  const issues = [];
  if (!game) issues.push(issue('error', 'RUNTIME_NO_GAME', 'Game engine is missing.'));
  if (!presentation?.eventBus) issues.push(issue('error', 'RUNTIME_NO_BUS', 'Presentation event bus is missing.'));
  if (game?.player && !game.player.animation) issues.push(issue('error', 'RUNTIME_NO_PLAYER_ANIMATION', 'Player animation state is missing.'));
  if (game?.getBoss?.()?.phaseTransition < 0) issues.push(issue('error', 'RUNTIME_INVALID_BOSS_TRANSITION', 'Boss phase transition became negative.'));
  if (game?.hitStop < 0 || !Number.isFinite(game?.hitStop ?? 0)) issues.push(issue('error', 'RUNTIME_INVALID_HITSTOP', 'Hit stop became invalid.'));
  if (game?.camera && (![game.camera.x, game.camera.y, game.camera.zoom].every(Number.isFinite) || game.camera.zoom <= 0)) issues.push(issue('error', 'RUNTIME_INVALID_CAMERA', 'Camera state became invalid.'));
  if ((presentation?.eventBus?.stats?.listenerErrors ?? 0) > 0) issues.push(issue('error', 'RUNTIME_EVENT_ERROR', 'A presentation listener raised an error.'));
  if (presentation?.audio?.debug?.().activeVoices > MAX_SFX_VOICES) issues.push(issue('warning', 'RUNTIME_SFX_BUDGET', 'SFX voice budget was exceeded.'));
  return { valid: !issues.some((entry) => entry.severity === 'error'), issues };
};
