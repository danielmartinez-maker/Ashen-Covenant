import { SAVE_KEY, SETTINGS_KEY } from '../core/constants.js';

const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const safeParse = (value, fallback) => {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
};

const bounded = (value, fallback, min = 0, max = 1) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(min, Math.min(max, numeric)) : fallback;
};

const read = (key) => {
  try { return typeof localStorage === 'undefined' ? null : localStorage.getItem(key); } catch { return null; }
};

const write = (key, value) => {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

const remove = (key) => {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

export const loadSettings = () => {
  const stored = safeParse(read(SETTINGS_KEY), {});
  const settings = isRecord(stored) ? stored : {};
  return {
    reducedVfx: settings.reducedVfx === true,
    sound: settings.sound !== false,
    aimAssist: settings.aimAssist !== false,
    graphicsQuality: ['low', 'high', 'ultra'].includes(settings.graphicsQuality) ? settings.graphicsQuality : 'high',
    lootFilter: ['all', 'magic', 'rare', 'relic', 'unique'].includes(settings.lootFilter) ? settings.lootFilter : 'all',
    uiScale: bounded(settings.uiScale, 1, 0.8, 1.3),
    hudMode: ['full', 'focused', 'minimal'].includes(settings.hudMode) ? settings.hudMode : 'full',
    hudOpacity: bounded(settings.hudOpacity, 0.92, 0.6, 1),
    highContrast: settings.highContrast === true,
    showMinimap: settings.showMinimap !== false,
    combatHudFocus: settings.combatHudFocus !== false,
    showControlHints: settings.showControlHints !== false,
    masterVolume: bounded(settings.masterVolume, 0.82), musicVolume: bounded(settings.musicVolume, 0.62),
    sfxVolume: bounded(settings.sfxVolume, 0.82), dialogueVolume: bounded(settings.dialogueVolume, 0.9),
    ambienceVolume: bounded(settings.ambienceVolume, 0.7), dynamicMusicIntensity: bounded(settings.dynamicMusicIntensity, 1, 0, 1.25),
    reducedStingers: settings.reducedStingers === true, cameraShakeScale: bounded(settings.cameraShakeScale, 1),
    hitStopScale: bounded(settings.hitStopScale, 1), reducedMotion: settings.reducedMotion === true,
    reducedFlashing: settings.reducedFlashing === true, backgroundAudio: settings.backgroundAudio === true,
    muteWhenUnfocused: settings.muteWhenUnfocused !== false,
    combatMusicFrequency: ['reduced', 'standard', 'frequent'].includes(settings.combatMusicFrequency) ? settings.combatMusicFrequency : 'standard',
    streamerSafeMusic: settings.streamerSafeMusic !== false, presentationDebug: settings.presentationDebug === true
  };
};

export const saveSettings = (settings) => write(SETTINGS_KEY, JSON.stringify({
  reducedVfx: settings?.reducedVfx === true,
  sound: settings?.sound !== false,
  aimAssist: settings?.aimAssist !== false,
  graphicsQuality: ['low', 'high', 'ultra'].includes(settings?.graphicsQuality) ? settings.graphicsQuality : 'high',
  lootFilter: ['all', 'magic', 'rare', 'relic', 'unique'].includes(settings?.lootFilter) ? settings.lootFilter : 'all',
  uiScale: bounded(settings?.uiScale, 1, 0.8, 1.3),
  hudMode: ['full', 'focused', 'minimal'].includes(settings?.hudMode) ? settings.hudMode : 'full',
  hudOpacity: bounded(settings?.hudOpacity, 0.92, 0.6, 1),
  highContrast: settings?.highContrast === true,
  showMinimap: settings?.showMinimap !== false,
  combatHudFocus: settings?.combatHudFocus !== false,
  showControlHints: settings?.showControlHints !== false,
  masterVolume: bounded(settings?.masterVolume, 0.82), musicVolume: bounded(settings?.musicVolume, 0.62),
  sfxVolume: bounded(settings?.sfxVolume, 0.82), dialogueVolume: bounded(settings?.dialogueVolume, 0.9),
  ambienceVolume: bounded(settings?.ambienceVolume, 0.7), dynamicMusicIntensity: bounded(settings?.dynamicMusicIntensity, 1, 0, 1.25),
  reducedStingers: settings?.reducedStingers === true, cameraShakeScale: bounded(settings?.cameraShakeScale, 1),
  hitStopScale: bounded(settings?.hitStopScale, 1), reducedMotion: settings?.reducedMotion === true,
  reducedFlashing: settings?.reducedFlashing === true, backgroundAudio: settings?.backgroundAudio === true,
  muteWhenUnfocused: settings?.muteWhenUnfocused !== false,
  combatMusicFrequency: ['reduced', 'standard', 'frequent'].includes(settings?.combatMusicFrequency) ? settings.combatMusicFrequency : 'standard',
  streamerSafeMusic: settings?.streamerSafeMusic !== false, presentationDebug: settings?.presentationDebug === true
}));

export const loadSave = () => {
  const snapshot = safeParse(read(SAVE_KEY), null);
  return isRecord(snapshot) ? snapshot : null;
};

export const saveRun = (run) => {
  try { return write(SAVE_KEY, JSON.stringify(run)); } catch { return false; }
};
export const clearSave = () => remove(SAVE_KEY);
