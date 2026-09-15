const CLASS_IDS = Object.freeze(['warden', 'thornseer', 'ironbound', 'veilrunner', 'gravebinder', 'dawnstrider']);

export const HERO_MOTION_ASSETS = Object.freeze(Object.fromEntries(
  CLASS_IDS.map((classId) => [classId, Object.freeze({
    id: `hero-motion-${classId}-v7`,
    classId,
    src: `/assets/hero-motion-${classId}-v7.png`,
    columns: 8,
    facingLanes: 8,
    sourceStates: 10,
    required: true
  })])
));

export const ANIMATION_SEMANTIC_STATES = Object.freeze([
  'idle', 'walk', 'run', 'turn', 'dodge', 'attack1', 'attack2', 'attack3', 'heavy', 'cast',
  'companion', 'hybrid', 'ultimate', 'guard', 'hit-light', 'hit-heavy', 'knockdown', 'rise', 'execution', 'death'
]);

const SOURCE_STATE_ROWS = Object.freeze({ idle: 0, run: 1, attack1: 2, attack2: 3, attack3: 4, cast: 5, dodge: 6, hit: 7, death: 8, ultimate: 9 });
const DEFINITIONS = Object.freeze({
  idle: Object.freeze(['idle', [0, 7], true, 0.50]),
  walk: Object.freeze(['run', [0, 5], true, 0.42]),
  run: Object.freeze(['run', [0, 7], true, 0.56]),
  turn: Object.freeze(['idle', [2, 5], false, 0.28]),
  dodge: Object.freeze(['dodge', [0, 7], false, 0.48]),
  attack1: Object.freeze(['attack1', [0, 7], false, 0.52]),
  attack2: Object.freeze(['attack2', [0, 7], false, 0.56]),
  attack3: Object.freeze(['attack3', [0, 7], false, 0.62]),
  heavy: Object.freeze(['attack3', [1, 7], false, 0.66]),
  cast: Object.freeze(['cast', [0, 7], false, 0.58]),
  companion: Object.freeze(['cast', [1, 7], false, 0.62]),
  hybrid: Object.freeze(['cast', [0, 6], false, 0.64]),
  ultimate: Object.freeze(['ultimate', [0, 7], false, 0.82]),
  guard: Object.freeze(['idle', [1, 6], true, 0.40]),
  'hit-light': Object.freeze(['hit', [0, 4], false, 0.24]),
  'hit-heavy': Object.freeze(['hit', [2, 7], false, 0.34]),
  knockdown: Object.freeze(['death', [0, 4], false, 0.42]),
  rise: Object.freeze(['death', [7, 3], false, 0.48]),
  execution: Object.freeze(['attack3', [0, 7], false, 0.72]),
  death: Object.freeze(['death', [0, 7], false, 0.90])
});

const BASE_ANCHORS = Object.freeze({
  body: Object.freeze([0, -0.26]), hand: Object.freeze([0.38, -0.08]), offhand: Object.freeze([-0.30, -0.02]),
  head: Object.freeze([0, -0.58]), torso: Object.freeze([0, -0.23]), feet: Object.freeze([0, 0.42])
});
const CLASS_ANCHOR_OFFSETS = Object.freeze({
  warden: Object.freeze({ hand: [0.40, -0.07], offhand: [-0.34, -0.03] }),
  thornseer: Object.freeze({ hand: [0.34, -0.13], offhand: [-0.27, -0.09] }),
  ironbound: Object.freeze({ hand: [0.42, -0.04], offhand: [-0.36, -0.02] }),
  veilrunner: Object.freeze({ hand: [0.36, -0.05], offhand: [-0.24, -0.04] }),
  gravebinder: Object.freeze({ hand: [0.33, -0.12], offhand: [-0.29, -0.08] }),
  dawnstrider: Object.freeze({ hand: [0.41, -0.10], offhand: [-0.25, -0.05] })
});
const anchorsFor = (classId) => Object.freeze({
  ...BASE_ANCHORS,
  ...Object.fromEntries(Object.entries(CLASS_ANCHOR_OFFSETS[classId] ?? {}).map(([key, value]) => [key, Object.freeze(value)]))
});

export const PLAYER_ANIMATION_CLIPS = Object.freeze(Object.fromEntries(
  CLASS_IDS.flatMap((classId) => ANIMATION_SEMANTIC_STATES.map((semantic) => {
    const [sourceState, frameWindow, loop, nominalDuration] = DEFINITIONS[semantic];
    const marker = semantic.startsWith('attack') || semantic === 'heavy' || semantic === 'execution'
      ? 0.52
      : ['cast', 'companion', 'hybrid', 'ultimate'].includes(semantic) ? 0.60 : null;
    return [`${classId}:${semantic}`, Object.freeze({
      id: `${classId}:${semantic}`,
      classId,
      semantic,
      assetId: HERO_MOTION_ASSETS[classId].id,
      sourcePath: HERO_MOTION_ASSETS[classId].src,
      sourceState,
      rowBase: SOURCE_STATE_ROWS[sourceState],
      frameWindow: Object.freeze([...frameWindow]),
      frameCount: Math.abs(frameWindow[1] - frameWindow[0]) + 1,
      loop,
      nominalDuration,
      marker,
      anchors: anchorsFor(classId),
      required: true
    })];
  }))
));

export const clipById = (id) => PLAYER_ANIMATION_CLIPS[id] ?? PLAYER_ANIMATION_CLIPS['warden:idle'];
