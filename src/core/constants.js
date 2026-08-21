export const GAME_TITLE = 'Ashen Covenant';
export const WORLD_SIZE = { width: 3840, height: 2520 };
export const TICK_LIMIT = 1 / 30;
export const SAVE_KEY = 'ashen-covenant.modular.save.v1';
export const SETTINGS_KEY = 'ashen-covenant.modular.settings.v1';
export const MAX_LEVEL = 100;
export const SKILL_POINT_LEVEL_CAP = 60;
export const LEVEL_XP = Array.from({ length: MAX_LEVEL }, (_, index) => {
  if (index < 60) return Math.floor(90 + index * 70 + index * index * 15);
  const apexStep = index - 59;
  return Math.floor(56_435 + apexStep * 1_200 + apexStep * apexStep * 20);
});
export const RARITY_COLORS = {
  common: '#bfc8cd',
  magic: '#6ca7ff',
  rare: '#f1c969',
  relic: '#ff9b62',
  unique: '#d77bff',
  mythic: '#f06fca'
};
export const KEYBINDINGS = {
  attack: ['Mouse0', 'KeyJ'],
  skillOne: ['KeyQ'],
  skillTwo: ['KeyE'],
  dodge: ['Space'],
  hybrid: ['KeyF'],
  companion: ['KeyC'],
  ultimate: ['KeyR'],
  potion: ['KeyG'],
  interact: ['KeyX'],
  inventory: ['KeyI'],
  skills: ['KeyK'],
  journey: ['KeyP'],
  chronicle: ['KeyH'],
  campaign: ['KeyL'],
  contracts: ['KeyO'],
  map: ['KeyM'],
  debug: ['F3'],
  pause: ['Escape']
};
