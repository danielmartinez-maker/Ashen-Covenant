import { clamp } from '../core/math.js';

export const PRESENTATION_DATA_VERSION = 1;

const timeline = ({ id, duration, startup, active, recovery, ...rest }) => ({
  id, duration, startup, active, recovery,
  cancelWindows: {
    dodge: [Math.min(duration, active + 0.035), duration],
    attack: [Math.min(duration, active + recovery * 0.42), duration],
    skill: [Math.min(duration, active + recovery * 0.68), duration]
  },
  events: [
    { id: 'CommitAttack', at: startup * 0.42 },
    { id: 'PlayWeaponWhoosh', at: Math.max(0.01, active - 0.045) },
    { id: 'EnableHitbox', at: active },
    { id: 'DisableHitbox', at: Math.min(duration, active + 0.025) },
    { id: 'AllowCancel', at: Math.min(duration, active + recovery * 0.42) },
    { id: 'EndAttack', at: duration }
  ],
  ...rest
});

const classProfile = ({
  id, weapon, acceleration, deceleration, turnRate, strideRate, strideAmplitude,
  posture, attackDurations, attackActive, attackArcs, attackRanges, impactProfiles,
  castGesture, dodgeStyle, weight
}) => ({
  id, weapon, locomotion: { acceleration, deceleration, turnRate, strideRate, strideAmplitude, posture },
  castGesture, dodgeStyle, weight,
  attacks: attackDurations.map((duration, index) => {
    const startup = attackActive[index] * (index === 2 ? 0.78 : 0.72);
    const active = attackActive[index];
    const recovery = Math.max(0.06, duration - active);
    return timeline({
      id: `${id}-basic-${index + 1}`,
      action: 'attack', comboIndex: index + 1, duration, startup, active, recovery,
      attackCategory: index === 2 ? 'finisher' : 'basic', weapon,
      movementPolicy: index === 2 ? 'committed' : 'grounded', rotationPolicy: 'soft-track',
      rootMotionPolicy: 'gameplay-authoritative', range: attackRanges[index], arc: attackArcs[index],
      impactProfile: impactProfiles[index], cameraProfile: index === 2 ? 'attack-heavy' : 'attack-light',
      audioProfile: `weapon-${weapon}-${index === 2 ? 'heavy' : 'light'}`, vfxProfile: `${weapon}-trail`,
      musicAccentProfile: index === 2 ? 'combo-finisher' : null
    });
  })
});

export const CLASS_PRESENTATION_PROFILES = {
  warden: classProfile({
    id: 'warden', weapon: 'longsword', acceleration: 1880, deceleration: 2320, turnRate: 12.5,
    strideRate: 10.4, strideAmplitude: 2.0, posture: 'disciplined', attackDurations: [0.31, 0.34, 0.43],
    attackActive: [0.12, 0.14, 0.21], attackArcs: [1.55, 1.7, 2.05], attackRanges: [84, 88, 101],
    impactProfiles: ['medium-slash', 'medium-slash', 'heavy-cleave'], castGesture: 'ritual-guard', dodgeStyle: 'chainstep', weight: 1.05
  }),
  thornseer: classProfile({
    id: 'thornseer', weapon: 'thorn-whip', acceleration: 2050, deceleration: 2480, turnRate: 14.2,
    strideRate: 11.6, strideAmplitude: 2.25, posture: 'ritual-low', attackDurations: [0.32, 0.34, 0.39],
    attackActive: [0.11, 0.12, 0.16], attackArcs: [0.3, 0.3, 0.42], attackRanges: [520, 540, 570],
    impactProfiles: ['light-magic', 'light-magic', 'medium-magic'], castGesture: 'constrictive', dodgeStyle: 'gloomstep', weight: 0.82
  }),
  ironbound: classProfile({
    id: 'ironbound', weapon: 'tower-shield', acceleration: 1540, deceleration: 2050, turnRate: 9.2,
    strideRate: 8.2, strideAmplitude: 1.75, posture: 'fortress', attackDurations: [0.39, 0.42, 0.54],
    attackActive: [0.18, 0.2, 0.29], attackArcs: [1.35, 1.48, 1.78], attackRanges: [93, 96, 108],
    impactProfiles: ['medium-blunt', 'heavy-blunt', 'critical-blunt'], castGesture: 'grounded-force', dodgeStyle: 'iron-rush', weight: 1.28
  }),
  veilrunner: classProfile({
    id: 'veilrunner', weapon: 'dual-blades', acceleration: 2440, deceleration: 2900, turnRate: 17.5,
    strideRate: 14.8, strideAmplitude: 2.55, posture: 'predatory-low', attackDurations: [0.24, 0.25, 0.31],
    attackActive: [0.085, 0.09, 0.125], attackArcs: [1.4, 1.55, 1.78], attackRanges: [86, 88, 94],
    impactProfiles: ['light-pierce', 'light-pierce', 'medium-pierce'], castGesture: 'asymmetric-fast', dodgeStyle: 'rift-step', weight: 0.72
  }),
  gravebinder: classProfile({
    id: 'gravebinder', weapon: 'war-scythe', acceleration: 1760, deceleration: 2180, turnRate: 10.8,
    strideRate: 9.3, strideAmplitude: 2.0, posture: 'ritual-asymmetric', attackDurations: [0.35, 0.38, 0.49],
    attackActive: [0.15, 0.17, 0.25], attackArcs: [1.62, 1.78, 2.22], attackRanges: [94, 98, 112],
    impactProfiles: ['medium-slash', 'medium-dark', 'heavy-dark'], castGesture: 'funereal', dodgeStyle: 'soul-slip', weight: 0.94
  }),
  dawnstrider: classProfile({
    id: 'dawnstrider', weapon: 'sun-staff', acceleration: 2180, deceleration: 2560, turnRate: 15.5,
    strideRate: 12.7, strideAmplitude: 2.35, posture: 'ceremonial-mobile', attackDurations: [0.28, 0.3, 0.38],
    attackActive: [0.1, 0.115, 0.17], attackArcs: [1.5, 1.58, 1.9], attackRanges: [88, 91, 104],
    impactProfiles: ['light-holy', 'medium-holy', 'heavy-holy'], castGesture: 'vertical-symmetric', dodgeStyle: 'lightstep', weight: 0.78
  })
};

export const DEFAULT_CLASS_PRESENTATION = CLASS_PRESENTATION_PROFILES.warden;

const actionTimeline = ({ id, action, animationType, duration, startup, active, recovery, cancelWindows = {}, ...rest }) => ({
  id, action, animationType, duration, startup, active, recovery, cancelWindows,
  events: [
    { id: 'CommitAction', at: Math.min(duration, startup * 0.55) },
    { id: 'PlayActionSound', at: Math.max(0.01, active - 0.04) },
    { id: 'ResolveAction', at: active },
    { id: 'AllowCancel', at: Math.min(duration, Math.min(...Object.values(cancelWindows).map((window) => window[0]), duration)) },
    { id: 'EndAction', at: duration }
  ],
  ...rest
});

export const PLAYER_ACTION_PROFILES = {
  skillOne: actionTimeline({ id: 'player-skill-one', action: 'skillOne', animationType: 'cast', duration: 0.38, startup: 0.16, active: 0.2, recovery: 0.18, cancelWindows: { dodge: [0.25, 0.38], skill: [0.33, 0.38] } }),
  skillTwo: actionTimeline({ id: 'player-skill-two', action: 'skillTwo', animationType: 'ward', duration: 0.52, startup: 0.2, active: 0.28, recovery: 0.24, cancelWindows: { dodge: [0.37, 0.52], skill: [0.45, 0.52] } }),
  companion: actionTimeline({ id: 'player-companion', action: 'companion', animationType: 'companion', duration: 0.5, startup: 0.19, active: 0.27, recovery: 0.23, cancelWindows: { dodge: [0.35, 0.5] } }),
  hybrid: actionTimeline({ id: 'player-hybrid', action: 'hybrid', animationType: 'hybrid', duration: 0.66, startup: 0.25, active: 0.36, recovery: 0.3, cancelWindows: { dodge: [0.48, 0.66] } }),
  ultimate: actionTimeline({ id: 'player-ultimate', action: 'ultimate', animationType: 'ultimate', duration: 1.08, startup: 0.42, active: 0.58, recovery: 0.5, cancelWindows: {} }),
  execution: actionTimeline({ id: 'player-execution', action: 'execution', animationType: 'execution', duration: 0.72, startup: 0.26, active: 0.38, recovery: 0.34, cancelWindows: {}, range: 110, arc: 1.35, movementPolicy: 'committed' }),
  potion: actionTimeline({ id: 'player-potion', action: 'potion', animationType: 'potion', duration: 0.34, startup: 0.09, active: 0.14, recovery: 0.2, cancelWindows: { dodge: [0.18, 0.34] } }),
  dodge: actionTimeline({ id: 'player-dodge', action: 'dodge', animationType: 'dodge', duration: 0.22, startup: 0, active: 0.02, recovery: 0.2, cancelWindows: { attack: [0.18, 0.22], skill: [0.2, 0.22] } }),
  death: actionTimeline({ id: 'player-death', action: 'death', animationType: 'death', duration: 2.6, startup: 0, active: 0.2, recovery: 2.4, cancelWindows: {} }),
  resurrection: actionTimeline({ id: 'player-resurrection', action: 'resurrection', animationType: 'resurrection', duration: 1.1, startup: 0.35, active: 0.58, recovery: 0.52, cancelWindows: {} })
};

export const resolvePlayerActionProfile = (classId, action, comboIndex = 1) => {
  const profile = CLASS_PRESENTATION_PROFILES[classId] ?? DEFAULT_CLASS_PRESENTATION;
  if (action === 'attack') return profile.attacks[clamp(Math.floor(comboIndex) - 1, 0, profile.attacks.length - 1)];
  const aliases = { cast: 'skillOne', ward: 'skillTwo' };
  return PLAYER_ACTION_PROFILES[aliases[action] ?? action] ?? actionTimeline({ id: `player-${action}`, action, animationType: action, duration: 0.3, startup: 0.1, active: 0.15, recovery: 0.15 });
};

export const ENEMY_PRESENTATION_PROFILES = {
  melee: { turnRate: 8.8, anticipation: 1, recoveryWeight: 1, attackPose: 'weapon-draw', reactionScale: 1 },
  shield: { turnRate: 6.4, anticipation: 1.15, recoveryWeight: 1.2, attackPose: 'guard-break', reactionScale: 0.7 },
  brute: { turnRate: 3.8, anticipation: 1.35, recoveryWeight: 1.5, attackPose: 'whole-body-slam', reactionScale: 0.55 },
  ranged: { turnRate: 7.6, anticipation: 1.1, recoveryWeight: 0.9, attackPose: 'draw-release', reactionScale: 1 },
  healer: { turnRate: 6.8, anticipation: 1.2, recoveryWeight: 1.1, attackPose: 'ritual-channel', reactionScale: 0.9 },
  commander: { turnRate: 5.2, anticipation: 1.25, recoveryWeight: 1.15, attackPose: 'command-strike', reactionScale: 0.75 },
  assassin: { turnRate: 10.8, anticipation: 0.9, recoveryWeight: 0.7, attackPose: 'coiled-lunge', reactionScale: 1.1 },
  burrower: { turnRate: 5.4, anticipation: 1.15, recoveryWeight: 0.95, attackPose: 'burrow-surge', reactionScale: 0.8 },
  summoner: { turnRate: 5.8, anticipation: 1.3, recoveryWeight: 1.2, attackPose: 'summon-rite', reactionScale: 0.85 },
  disruptor: { turnRate: 6.6, anticipation: 1.15, recoveryWeight: 1.05, attackPose: 'null-cast', reactionScale: 0.9 },
  boss: { turnRate: 2.55, anticipation: 1.4, recoveryWeight: 1.55, attackPose: 'boss-commit', reactionScale: 0.34 }
};

export const IMPACT_PROFILES = {
  'light-slash': { hitStop: 0.008, shake: 1.2, flash: 0.02, rumble: [0.035, 0.1, 0.04], particles: 4, sound: 'impact-slash-light' },
  'medium-slash': { hitStop: 0.014, shake: 2.5, flash: 0.035, rumble: [0.05, 0.22, 0.08], particles: 7, sound: 'impact-slash-medium' },
  'heavy-cleave': { hitStop: 0.032, shake: 5.5, flash: 0.07, rumble: [0.09, 0.46, 0.2], particles: 12, sound: 'impact-heavy' },
  'light-pierce': { hitStop: 0.006, shake: 0.9, flash: 0.015, rumble: [0.028, 0.06, 0.03], particles: 3, sound: 'impact-pierce' },
  'medium-pierce': { hitStop: 0.012, shake: 2.1, flash: 0.03, rumble: [0.045, 0.18, 0.07], particles: 6, sound: 'impact-pierce' },
  'medium-blunt': { hitStop: 0.019, shake: 3.8, flash: 0.05, rumble: [0.07, 0.35, 0.14], particles: 9, sound: 'impact-blunt' },
  'heavy-blunt': { hitStop: 0.034, shake: 6.8, flash: 0.08, rumble: [0.11, 0.55, 0.26], particles: 14, sound: 'impact-heavy' },
  'critical-blunt': { hitStop: 0.048, shake: 9, flash: 0.12, rumble: [0.14, 0.72, 0.38], particles: 18, sound: 'impact-critical' },
  'light-magic': { hitStop: 0.004, shake: 0.7, flash: 0.02, rumble: [0.02, 0.03, 0.05], particles: 5, sound: 'impact-magic' },
  'medium-magic': { hitStop: 0.01, shake: 1.8, flash: 0.045, rumble: [0.04, 0.08, 0.16], particles: 9, sound: 'impact-magic' },
  'medium-dark': { hitStop: 0.014, shake: 2.7, flash: 0.05, rumble: [0.06, 0.18, 0.18], particles: 9, sound: 'impact-dark' },
  'heavy-dark': { hitStop: 0.032, shake: 6.2, flash: 0.09, rumble: [0.1, 0.45, 0.34], particles: 15, sound: 'impact-dark-heavy' },
  'light-holy': { hitStop: 0.007, shake: 1, flash: 0.04, rumble: [0.025, 0.05, 0.08], particles: 5, sound: 'impact-holy' },
  'medium-holy': { hitStop: 0.013, shake: 2.4, flash: 0.07, rumble: [0.05, 0.15, 0.18], particles: 9, sound: 'impact-holy' },
  'heavy-holy': { hitStop: 0.03, shake: 5.8, flash: 0.12, rumble: [0.09, 0.36, 0.38], particles: 15, sound: 'impact-holy-heavy' },
  critical: { hitStop: 0.045, shake: 8, flash: 0.12, rumble: [0.13, 0.68, 0.34], particles: 18, sound: 'impact-critical' },
  'boss-stagger': { hitStop: 0.055, shake: 11, flash: 0.16, rumble: [0.17, 0.82, 0.46], particles: 24, sound: 'boss-stagger' },
  execution: { hitStop: 0.07, shake: 12, flash: 0.18, rumble: [0.2, 0.9, 0.5], particles: 28, sound: 'execution' },
  'environment-break': { hitStop: 0.012, shake: 2.4, flash: 0.02, rumble: [0.04, 0.2, 0.06], particles: 10, sound: 'destruction' }
};

export const CAMERA_PROFILES = {
  menu: { zoom: 1, follow: 0.08, offsetY: 0, deadZone: 0, shakeScale: 0 },
  exploration: { zoom: 1, follow: 0.11, offsetY: 0, deadZone: 42, shakeScale: 0.8 },
  settlement: { zoom: 1.035, follow: 0.09, offsetY: -8, deadZone: 52, shakeScale: 0.55 },
  combat: { zoom: 0.97, follow: 0.14, offsetY: -10, deadZone: 28, shakeScale: 1 },
  elite: { zoom: 0.945, follow: 0.15, offsetY: -14, deadZone: 22, shakeScale: 1.05 },
  boss: { zoom: 0.9, follow: 0.16, offsetY: -22, deadZone: 16, shakeScale: 1.1 },
  'world-boss': { zoom: 0.84, follow: 0.17, offsetY: -28, deadZone: 12, shakeScale: 1.08 },
  dialogue: { zoom: 1.05, follow: 0.08, offsetY: -12, shakeScale: 0.25 },
  death: { zoom: 1.09, follow: 0.055, offsetY: 8, shakeScale: 0.35 },
  victory: { zoom: 1.02, follow: 0.075, offsetY: -8, shakeScale: 0.35 }
};

export const SOUND_PROFILES = {
  attack: { category: 'abilities', priority: 3, cooldown: 0.018, layers: [['tone', 'triangle', 132, 74, 0.09, 0.03], ['noise', 0.055, 0.016, 1600]] },
  projectile: { category: 'abilities', priority: 3, cooldown: 0.018, layers: [['tone', 'sine', 330, 180, 0.14, 0.026], ['noise', 0.08, 0.012, 2600]] },
  companion: { category: 'abilities', priority: 5, cooldown: 0.06, layers: [['tone', 'triangle', 205, 470, 0.2, 0.034], ['tone', 'sine', 102, 188, 0.24, 0.018]] },
  ward: { category: 'abilities', priority: 4, cooldown: 0.04, layers: [['tone', 'sine', 170, 510, 0.26, 0.035], ['tone', 'triangle', 85, 128, 0.32, 0.015]] },
  potion: { category: 'ui', priority: 5, cooldown: 0.12, layers: [['noise', 0.08, 0.014, 1300], ['tone', 'sine', 260, 470, 0.18, 0.022]] },
  dodge: { category: 'footsteps', priority: 3, cooldown: 0.04, layers: [['noise', 0.11, 0.025, 1900], ['tone', 'triangle', 240, 510, 0.1, 0.018]] },
  hybrid: { category: 'abilities', priority: 6, cooldown: 0.09, layers: [['tone', 'sawtooth', 190, 610, 0.34, 0.035], ['tone', 'sine', 95, 152, 0.46, 0.02]] },
  ultimate: { category: 'abilities', priority: 9, cooldown: 0.25, layers: [['tone', 'sawtooth', 88, 700, 0.62, 0.05], ['noise', 0.48, 0.035, 720], ['tone', 'sine', 44, 67, 0.8, 0.035]] },
  hurt: { category: 'impacts', priority: 6, cooldown: 0.055, layers: [['tone', 'square', 150, 72, 0.16, 0.036], ['noise', 0.08, 0.025, 900]] },
  kill: { category: 'impacts', priority: 3, cooldown: 0.035, layers: [['tone', 'triangle', 150, 285, 0.15, 0.022]] },
  level: { category: 'ui', priority: 8, cooldown: 0.5, layers: [['tone', 'sine', 310, 790, 0.52, 0.038], ['tone', 'triangle', 155, 395, 0.58, 0.018]] },
  boss: { category: 'boss', priority: 10, cooldown: 0.3, layers: [['tone', 'sawtooth', 74, 43, 0.48, 0.05], ['noise', 0.35, 0.04, 420]] },
  execute: { category: 'impacts', priority: 9, cooldown: 0.15, layers: [['tone', 'sawtooth', 92, 46, 0.25, 0.05], ['noise', 0.18, 0.04, 520]] },
  'weapon-longsword-light': { category: 'abilities', priority: 3, cooldown: 0.02, layers: [['noise', 0.08, 0.022, 2400], ['tone', 'triangle', 180, 105, 0.1, 0.014]] },
  'weapon-longsword-heavy': { category: 'abilities', priority: 5, cooldown: 0.04, layers: [['noise', 0.15, 0.032, 1550], ['tone', 'triangle', 142, 72, 0.18, 0.022]] },
  'weapon-thorn-whip-light': { category: 'abilities', priority: 3, cooldown: 0.02, layers: [['noise', 0.1, 0.016, 3100], ['tone', 'sine', 280, 150, 0.13, 0.016]] },
  'weapon-thorn-whip-heavy': { category: 'abilities', priority: 5, cooldown: 0.04, layers: [['noise', 0.17, 0.028, 2400], ['tone', 'sawtooth', 180, 76, 0.24, 0.026]] },
  'weapon-tower-shield-light': { category: 'abilities', priority: 4, cooldown: 0.03, layers: [['noise', 0.1, 0.024, 820], ['tone', 'square', 118, 68, 0.12, 0.018]] },
  'weapon-tower-shield-heavy': { category: 'abilities', priority: 5, cooldown: 0.04, layers: [['noise', 0.14, 0.03, 650], ['tone', 'square', 92, 54, 0.14, 0.022]] },
  'weapon-dual-blades-light': { category: 'abilities', priority: 3, cooldown: 0.012, layers: [['noise', 0.055, 0.016, 3500], ['tone', 'triangle', 260, 180, 0.065, 0.012]] },
  'weapon-dual-blades-heavy': { category: 'abilities', priority: 5, cooldown: 0.025, layers: [['noise', 0.11, 0.023, 2900], ['tone', 'triangle', 220, 112, 0.12, 0.018]] },
  'weapon-war-scythe-light': { category: 'abilities', priority: 4, cooldown: 0.025, layers: [['noise', 0.09, 0.022, 1950], ['tone', 'sawtooth', 146, 82, 0.13, 0.017]] },
  'weapon-war-scythe-heavy': { category: 'abilities', priority: 5, cooldown: 0.035, layers: [['noise', 0.13, 0.026, 1800], ['tone', 'sawtooth', 116, 61, 0.18, 0.024]] },
  'weapon-sun-staff-light': { category: 'abilities', priority: 3, cooldown: 0.02, layers: [['tone', 'sine', 310, 540, 0.12, 0.021], ['noise', 0.07, 0.01, 3800]] },
  'weapon-sun-staff-heavy': { category: 'abilities', priority: 5, cooldown: 0.04, layers: [['tone', 'triangle', 190, 670, 0.28, 0.03], ['noise', 0.14, 0.021, 2600]] },
  'enemy-windup': { category: 'enemyAbilities', priority: 3, cooldown: 0.05, layers: [['tone', 'triangle', 104, 72, 0.16, 0.018], ['noise', 0.07, 0.012, 1150]] },
  'projectile-windup': { category: 'enemyAbilities', priority: 3, cooldown: 0.05, layers: [['tone', 'sine', 188, 320, 0.17, 0.016], ['noise', 0.06, 0.01, 2500]] },
  'boss-windup': { category: 'boss', priority: 9, cooldown: 0.16, layers: [['tone', 'sawtooth', 62, 91, 0.42, 0.038], ['noise', 0.28, 0.034, 390]] },
  'enemy-attack': { category: 'enemyAbilities', priority: 4, cooldown: 0.04, layers: [['noise', 0.1, 0.023, 1250], ['tone', 'triangle', 122, 64, 0.13, 0.016]] },
  'enemy-heavy': { category: 'enemyAbilities', priority: 6, cooldown: 0.08, layers: [['noise', 0.2, 0.038, 440], ['tone', 'square', 86, 38, 0.24, 0.034]] },
  'boss-attack': { category: 'boss', priority: 10, cooldown: 0.12, layers: [['noise', 0.34, 0.05, 300], ['tone', 'sawtooth', 76, 29, 0.38, 0.052]] },
  'impact-slash-light': { category: 'impacts', priority: 3, cooldown: 0.018, layers: [['noise', 0.05, 0.018, 2200]] },
  'impact-slash-medium': { category: 'impacts', priority: 4, cooldown: 0.022, layers: [['noise', 0.085, 0.026, 1500], ['tone', 'triangle', 116, 72, 0.1, 0.015]] },
  'impact-pierce': { category: 'impacts', priority: 3, cooldown: 0.018, layers: [['noise', 0.045, 0.017, 3300], ['tone', 'sine', 440, 220, 0.07, 0.009]] },
  'impact-blunt': { category: 'impacts', priority: 5, cooldown: 0.03, layers: [['noise', 0.13, 0.03, 520], ['tone', 'sine', 72, 42, 0.16, 0.03]] },
  'impact-heavy': { category: 'impacts', priority: 7, cooldown: 0.045, layers: [['noise', 0.2, 0.04, 420], ['tone', 'sine', 63, 35, 0.24, 0.04]] },
  'impact-critical': { category: 'impacts', priority: 9, cooldown: 0.07, layers: [['noise', 0.24, 0.048, 320], ['tone', 'sawtooth', 84, 38, 0.28, 0.042], ['tone', 'sine', 510, 820, 0.12, 0.012]] },
  'impact-magic': { category: 'impacts', priority: 4, cooldown: 0.022, layers: [['tone', 'sine', 420, 210, 0.15, 0.022], ['noise', 0.09, 0.012, 3800]] },
  'impact-dark': { category: 'impacts', priority: 5, cooldown: 0.03, layers: [['tone', 'sawtooth', 142, 58, 0.2, 0.026], ['noise', 0.13, 0.02, 720]] },
  'impact-dark-heavy': { category: 'impacts', priority: 7, cooldown: 0.05, layers: [['tone', 'sawtooth', 94, 34, 0.32, 0.038], ['noise', 0.22, 0.036, 480]] },
  'impact-holy': { category: 'impacts', priority: 4, cooldown: 0.025, layers: [['tone', 'sine', 310, 620, 0.18, 0.023], ['noise', 0.08, 0.012, 4100]] },
  'impact-holy-heavy': { category: 'impacts', priority: 7, cooldown: 0.05, layers: [['tone', 'triangle', 160, 640, 0.34, 0.035], ['noise', 0.18, 0.026, 2100]] },
  'boss-stagger': { category: 'boss', priority: 10, cooldown: 0.25, layers: [['noise', 0.5, 0.055, 240], ['tone', 'sawtooth', 62, 29, 0.55, 0.055]] },
  execution: { category: 'impacts', priority: 10, cooldown: 0.2, layers: [['noise', 0.34, 0.055, 330], ['tone', 'sawtooth', 96, 33, 0.4, 0.05]] },
  destruction: { category: 'destruction', priority: 4, cooldown: 0.04, layers: [['noise', 0.28, 0.034, 540], ['tone', 'triangle', 88, 42, 0.22, 0.021]] },
  'destruction-hit': { category: 'destruction', priority: 2, cooldown: 0.035, layers: [['noise', 0.08, 0.014, 780], ['tone', 'triangle', 120, 82, 0.08, 0.009]] },
  footstep: { category: 'footsteps', priority: 1, cooldown: 0.075, layers: [['noise', 0.055, 0.011, 760], ['tone', 'sine', 72, 58, 0.055, 0.006]] }
};

export const SURFACE_AUDIO = {
  stone: { pitch: 1, filter: 1500 }, wood: { pitch: 1.12, filter: 950 }, metal: { pitch: 1.45, filter: 2600 },
  dirt: { pitch: 0.86, filter: 620 }, grass: { pitch: 0.92, filter: 880 }, mud: { pitch: 0.7, filter: 430 },
  water: { pitch: 1.08, filter: 1300 }, snow: { pitch: 1.22, filter: 1900 }, sand: { pitch: 0.78, filter: 540 },
  bone: { pitch: 1.5, filter: 2200 }, ash: { pitch: 0.82, filter: 580 }, ice: { pitch: 1.65, filter: 3400 }
};

const stem = (id, role, wave, gain, pattern, octave = 0, minIntensity = 0) => ({ id, role, wave, gain, pattern, octave, minIntensity });
const sparse = [0, null, null, null, 4, null, null, null, 2, null, null, null, 5, null, null, null];
const pulse = [0, null, 0, null, 2, null, 0, null, 4, null, 2, null, 5, null, 4, null];
const driving = [0, 0, null, 2, 0, 0, 4, null, 0, 2, 0, 4, 5, 4, 2, null];
const drums = ['kick', null, 'tick', null, 'kick', null, 'tick', 'tick', 'kick', null, 'tick', null, 'kick', 'tick', 'tick', null];

export const REGION_MUSIC_IDENTITIES = {
  sanctuary: { name: 'Ashen Sanctuary', root: 55, mode: [0, 2, 5, 7, 9, 12], texture: 'civilization', daySilence: [34, 82], nightSilence: [52, 108] },
  gravewake: { name: 'Gravewake', root: 49, mode: [0, 1, 5, 6, 10, 12], texture: 'brittle-bells', daySilence: [24, 70], nightSilence: [38, 94] },
  redfen: { name: 'Redfen', root: 46.25, mode: [0, 1, 3, 6, 8, 12], texture: 'wet-reeds', daySilence: [18, 55], nightSilence: [27, 72] },
  cairnreach: { name: 'Cairnreach', root: 51.91, mode: [0, 2, 5, 6, 7, 12], texture: 'iron-chains', daySilence: [20, 62], nightSilence: [32, 84] },
  'veiled-road': { name: 'Veiled Road', root: 58.27, mode: [0, 1, 4, 6, 9, 12], texture: 'glass-whispers', daySilence: [14, 48], nightSilence: [22, 64] },
  bellscar: { name: 'Bellscar', root: 43.65, mode: [0, 1, 5, 6, 11, 12], texture: 'broken-choir', daySilence: [12, 42], nightSilence: [18, 56] }
};

const cue = ({ id, region = 'global', context, min = 0, max = 1, priority, tempo, meter = [4, 4], stems, ...rest }) => ({
  id, displayName: id.replaceAll('-', ' '), region, biome: region, contextTags: [context],
  minimumIntensity: min, maximumIntensity: max, priority, tempo, timeSignature: meter,
  bars: 8, loopStart: 0, loopEnd: 8, transitionMode: 'next-bar', sections: ['intro', 'a', 'b', 'release'],
  cooldown: 24, minimumPlayTime: 12, maximumRepeatCount: 2, weight: 1,
  streamingPolicy: 'procedural-resident', preloadingPolicy: 'always', loudnessMetadata: { targetLufs: -19 },
  assetStatus: 'procedural-placeholder-original', stems, ...rest
});

const exploreStems = () => [
  stem('drone', 'drone', 'sine', 0.07, [0], -2, 0),
  stem('texture', 'texture', 'triangle', 0.022, sparse, 1, 0.12),
  stem('low-strings', 'harmony', 'sawtooth', 0.018, sparse, -1, 0.24),
  stem('uneasy-pulse', 'pulse', 'triangle', 0.018, pulse, 0, 0.32)
];
const combatStems = () => [
  stem('drone', 'drone', 'sine', 0.055, [0], -2, 0),
  stem('ostinato', 'pulse', 'triangle', 0.028, driving, -1, 0.38),
  stem('percussion', 'percussion', 'noise', 0.07, drums, 0, 0.46),
  stem('low-brass', 'brass', 'sawtooth', 0.026, [0, null, null, null, 4, null, null, null], -2, 0.64),
  stem('choir', 'choir', 'sine', 0.019, [0, null, 1, null, 4, null, 6, null], 0, 0.78),
  stem('climax', 'climax', 'square', 0.012, [0, null, 6, null, 5, null, 1, null], 1, 0.9)
];

const regionCues = Object.keys(REGION_MUSIC_IDENTITIES).flatMap((region) => [
  cue({ id: `mus-${region}-exploration`, region, context: region === 'sanctuary' ? 'Settlement' : 'Exploration', min: 0.08, max: 0.52, priority: region === 'sanctuary' ? 42 : 30, tempo: region === 'redfen' ? 54 : region === 'veiled-road' ? 66 : 58, stems: exploreStems() }),
  cue({ id: `mus-${region}-combat`, region, context: 'Combat', min: 0.42, max: 1, priority: 65, tempo: region === 'cairnreach' ? 84 : region === 'veiled-road' ? 96 : 78, stems: combatStems() }),
  cue({ id: `mus-${region}-dungeon`, region, context: 'Dungeon', min: 0.18, max: 0.76, priority: 55, tempo: 62, stems: [...exploreStems(), stem('depth', 'depth', 'sawtooth', 0.016, pulse, -2, 0.42)] })
]);

const BOSS_IDS = ['bellwitness', 'tollingabbot', 'cryptwarden', 'bloodmatron', 'bogsovereign', 'burialengine', 'chainregent', 'mirrorapostle', 'veiledoracle', 'silenceincarnate'];
const bossCues = BOSS_IDS.map((bossId, index) => cue({
  id: `mus-boss-${bossId}`, region: 'boss', context: 'Boss', min: 0.62, max: 1, priority: 92,
  tempo: 76 + index % 4 * 6, meter: index % 3 === 2 ? [5, 4] : [4, 4],
  bossId, motifOffset: index % 6, minimumPlayTime: 4, cooldown: 0,
  stems: [...combatStems(), stem('boss-motif', 'motif', 'triangle', 0.032, [0, null, 1, null, 6, null, 5, null, 0, null, 4, null, 1, null, 6, null], 0, 0.64)]
}));

export const MUSIC_CUES = [
  cue({ id: 'mus-ui-main-menu', context: 'MainMenu', min: 0, max: 0.35, priority: 20, tempo: 52, stems: exploreStems(), minimumPlayTime: 18 }),
  cue({ id: 'mus-ui-character-creation', context: 'CharacterCreation', min: 0, max: 0.4, priority: 24, tempo: 58, stems: [...exploreStems(), stem('class-color', 'motif', 'sine', 0.02, sparse, 1, 0.1)] }),
  cue({ id: 'mus-loading-embers', context: 'Loading', min: 0, max: 0.3, priority: 80, tempo: 48, transitionMode: 'immediate', stems: [stem('loading-drone', 'drone', 'sine', 0.045, [0], -3), stem('loading-breath', 'texture', 'triangle', 0.012, sparse, 0, 0.1)] }),
  cue({ id: 'mus-narrative-names', context: 'Narrative', min: 0, max: 0.55, priority: 96, tempo: 50, transitionMode: 'next-beat', stems: [stem('narrative-drone', 'drone', 'sine', 0.042, [0], -2), stem('names-motif', 'motif', 'triangle', 0.018, [0, null, null, null, 1, null, 5, null, 4, null, null, null, 1, null, 0, null], 0, 0.1)] }),
  ...regionCues,
  ...bossCues,
  cue({ id: 'mus-player-death', context: 'PlayerDeath', min: 0, max: 1, priority: 97, tempo: 44, stems: [stem('death-drone', 'drone', 'sine', 0.055, [0], -3), stem('death-bell', 'motif', 'triangle', 0.026, [0, null, null, null, 1, null, null, null], 0)] }),
  cue({ id: 'mus-victory-release', context: 'Victory', min: 0, max: 1, priority: 86, tempo: 58, stems: [stem('release', 'harmony', 'sine', 0.04, [0, null, 4, null, 5, null, 2, null], 0), stem('civilization', 'motif', 'triangle', 0.024, sparse, 1)] }),
  cue({ id: 'mus-credits-covenant-endures', context: 'Credits', min: 0, max: 1, priority: 100, tempo: 56, stems: [...exploreStems(), stem('world-motif', 'motif', 'triangle', 0.036, [0, null, 2, null, 5, null, 4, null, 1, null, 0, null, 6, null, 5, null], 1)] })
];

export const MUSIC_STINGERS = {
  'boss-reveal': { id: 'boss-reveal', priority: 95, cooldown: 2, notes: [0, 1, 6], duration: 1.2, gain: 0.07, wave: 'sawtooth' },
  'boss-phase': { id: 'boss-phase', priority: 92, cooldown: 1.2, notes: [0, 6, 5], duration: 0.8, gain: 0.06, wave: 'triangle' },
  'boss-defeat': { id: 'boss-defeat', priority: 98, cooldown: 2, notes: [6, 5, 2, 0], duration: 1.5, gain: 0.075, wave: 'sine' },
  death: { id: 'death', priority: 100, cooldown: 2, notes: [0, -1, -6], duration: 1.2, gain: 0.07, wave: 'triangle' },
  resurrection: { id: 'resurrection', priority: 96, cooldown: 2, notes: [0, 5, 7, 12], duration: 1.1, gain: 0.055, wave: 'sine' },
  legendary: { id: 'legendary', priority: 68, cooldown: 3.5, notes: [0, 7, 12], duration: 0.75, gain: 0.04, wave: 'triangle' },
  unique: { id: 'unique', priority: 76, cooldown: 4.5, notes: [0, 5, 9, 12], duration: 0.95, gain: 0.05, wave: 'sine' },
  mythic: { id: 'mythic', priority: 88, cooldown: 6, notes: [0, 1, 7, 12, 13], duration: 1.2, gain: 0.06, wave: 'triangle' },
  level: { id: 'level', priority: 72, cooldown: 1, notes: [0, 4, 7, 12], duration: 0.7, gain: 0.04, wave: 'sine' },
  'stronghold-liberated': { id: 'stronghold-liberated', priority: 84, cooldown: 6, notes: [0, 5, 7, 9, 12], duration: 1.4, gain: 0.055, wave: 'triangle' },
  'operation-victory': { id: 'operation-victory', priority: 79, cooldown: 2.5, notes: [0, 5, 9, 7, 12], duration: 1, gain: 0.046, wave: 'sine' },
  'encounter-start': { id: 'encounter-start', priority: 58, cooldown: 1.5, notes: [0, -1, 5], duration: 0.58, gain: 0.032, wave: 'triangle' },
  'encounter-clear': { id: 'encounter-clear', priority: 74, cooldown: 2.4, notes: [0, 4, 7, 9], duration: 0.86, gain: 0.044, wave: 'sine' },
  'combo-finisher': { id: 'combo-finisher', priority: 36, cooldown: 0.45, notes: [0, 7], duration: 0.22, gain: 0.018, wave: 'sine' },
  ultimate: { id: 'ultimate', priority: 86, cooldown: 2.5, notes: [0, 1, 6, 12], duration: 0.9, gain: 0.052, wave: 'triangle' }
};

export const MUSIC_STATE_PRIORITY = ['Cinematic', 'Narrative', 'Boss', 'PlayerDeath', 'Combat', 'Settlement', 'Dungeon', 'Exploration', 'MainMenu'];

export const DESTRUCTIBLE_PROFILES = {
  urn: { health: 1, radius: 19, breakAnimation: 'shatter', debris: 5, impactProfile: 'environment-break', cleanup: 7, lootChance: 0.07 },
  barricade: { health: 3, radius: 34, breakAnimation: 'splinter', debris: 9, impactProfile: 'environment-break', cleanup: 10, lootChance: 0.16 },
  'ritual-vessel': { health: 5, radius: 28, breakAnimation: 'rupture', debris: 7, impactProfile: 'environment-break', cleanup: 8, lootChance: 0.24 }
};

export const PRESENTATION_FALLBACKS = {
  animation: ['exact', 'class-compatible', 'shared', 'idle'],
  music: ['exact', 'regional', 'generic-context', 'ambient', 'silence'],
  impact: 'medium-slash', camera: 'exploration', sound: 'attack'
};
