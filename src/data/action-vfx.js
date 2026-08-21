// Version 5 presentation lanes. Gameplay timing remains authoritative, but
// visible attacks no longer reuse one class lane for every action.
export const ACTION_VFX_FRAME_COUNT = 8;

export const ACTION_VFX_SHEETS = {
  player: { id: 'player', src: '/assets/attack-vfx-player-v7.png', rows: 54 },
  enemy: { id: 'enemy', src: '/assets/attack-vfx-enemy-v7.png', rows: 11 }
};

const CLASS_ORDER = ['ironbound', 'thornseer', 'warden', 'veilrunner', 'gravebinder', 'dawnstrider'];
const ACTION_ORDER = ['attack1', 'attack2', 'attack3', 'execution', 'skillOne', 'skillTwo', 'companion', 'hybrid', 'ultimate'];
const ENEMY_ORDER = ['melee', 'shield', 'ranged', 'assassin', 'brute', 'burrower', 'healer', 'commander', 'summoner', 'disruptor', 'boss'];

const ACTION_MODIFIERS = {
  attack1: { scale: .96, durationFloor: .24, anchor: 30 },
  attack2: { scale: 1.04, durationFloor: .26, anchor: 32 },
  attack3: { scale: 1.18, durationFloor: .32, anchor: 36 },
  execution: { scale: 1.42, durationFloor: .56, anchor: 42 },
  skillOne: { scale: 1.12, durationFloor: .38, anchor: 38 },
  skillTwo: { scale: 1.28, durationFloor: .52, anchor: 40 },
  companion: { scale: 1.2, durationFloor: .5, anchor: 40 },
  hybrid: { scale: 1.45, durationFloor: .66, anchor: 44 },
  ultimate: { scale: 1.78, durationFloor: 1.08, anchor: 52 }
};

const normalizePlayerAction = (action, comboIndex = 1) => {
  if (action === 'attack') return `attack${Math.max(1, Math.min(3, Math.floor(comboIndex) || 1))}`;
  if (action === 'cast') return 'skillOne';
  if (action === 'ward') return 'skillTwo';
  return ACTION_ORDER.includes(action) ? action : 'skillOne';
};

export const playerActionVfx = (classId, action = 'attack', comboIndex = 1) => {
  const classIndex = CLASS_ORDER.indexOf(classId);
  if (classIndex < 0) return null;
  const resolvedAction = normalizePlayerAction(action, comboIndex);
  const actionIndex = ACTION_ORDER.indexOf(resolvedAction);
  if (actionIndex < 0) return null;
  return {
    sheet: 'player', row: classIndex * ACTION_ORDER.length + actionIndex,
    frames: ACTION_VFX_FRAME_COUNT, action: resolvedAction,
    ...ACTION_MODIFIERS[resolvedAction]
  };
};

export const enemyActionVfx = (role = 'melee', boss = false) => {
  const resolved = boss ? 'boss' : ENEMY_ORDER.includes(role) ? role : 'melee';
  return {
    sheet: 'enemy', row: ENEMY_ORDER.indexOf(resolved), frames: ACTION_VFX_FRAME_COUNT,
    scale: resolved === 'boss' ? 1.7 : resolved === 'brute' ? 1.34 : resolved === 'assassin' ? .94 : 1.04,
    anchor: resolved === 'boss' ? 24 : resolved === 'ranged' ? 32 : 24,
    durationFloor: resolved === 'boss' ? .74 : .34
  };
};
