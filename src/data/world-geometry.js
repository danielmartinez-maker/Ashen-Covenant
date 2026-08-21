// Version 5 authored traversal data. Visual terrain remains painted, while this
// lightweight geometry layer gives the paintings physical meaning: collision,
// walkable lanes, elevation ramps, materials, occluders and room silhouettes.
export const WORLD_GEOMETRY_VERSION = 5;

const rect = (id, x, y, w, h, options = {}) => ({ id, shape: 'rect', x, y, w, h, solid: true, ...options });
const circle = (id, x, y, radius, options = {}) => ({ id, shape: 'circle', x, y, radius, solid: true, ...options });
const ramp = (id, x, y, w, h, axis, low, high, options = {}) => ({ id, shape: 'ramp', x, y, w, h, axis, low, high, solid: false, ...options });

export const ZONE_GEOMETRY = Object.freeze({
  sanctuary: {
    surface: 'stone',
    obstacles: [
      rect('sanctuary-smithy', 360, 560, 210, 122, { occluder: true, prop: 'tent', height: 78 }),
      rect('sanctuary-archive', 745, 160, 190, 118, { occluder: true, prop: 'broken-wall', height: 90 }),
      circle('sanctuary-well', 535, 360, 62, { prop: 'shrine', height: 38 }),
      rect('sanctuary-west-wall', 55, 420, 86, 330, { occluder: true, prop: 'broken-wall', height: 105 })
    ],
    ramps: [ramp('sanctuary-dais', 700, 480, 245, 185, 'y', 0, 24, { surface: 'stone' })]
  },
  gravewake: {
    surface: 'dirt',
    obstacles: [
      rect('gravewake-chapel', 1540, 100, 205, 130, { occluder: true, prop: 'broken-wall', height: 110 }),
      rect('gravewake-fence-a', 1260, 650, 260, 34, { prop: 'fence', height: 30 }),
      rect('gravewake-fence-b', 1930, 610, 245, 34, { prop: 'fence', height: 30 }),
      circle('gravewake-bell', 1790, 395, 72, { occluder: true, prop: 'broken-bell', height: 82 }),
      circle('gravewake-yew', 2140, 915, 74, { occluder: true, prop: 'dead-tree', height: 120 })
    ],
    ramps: [ramp('gravewake-mound', 1700, 700, 320, 230, 'y', 0, 34, { surface: 'dirt' })]
  },
  redfen: {
    surface: 'mud',
    obstacles: [
      circle('redfen-root-a', 2740, 260, 86, { occluder: true, prop: 'bloodroot', height: 118 }),
      circle('redfen-root-b', 3275, 310, 92, { occluder: true, prop: 'bloodroot', height: 126 }),
      rect('redfen-boardwalk-a', 2840, 720, 315, 44, { prop: 'fence', height: 20 }),
      rect('redfen-ruin', 3540, 580, 190, 150, { occluder: true, prop: 'broken-wall', height: 98 }),
      circle('redfen-pool', 2420, 870, 92, { solid: false, hazardSurface: 'water', height: 0 })
    ],
    ramps: [ramp('redfen-causeway', 2920, 500, 420, 170, 'x', 0, 22, { surface: 'wood' })]
  },
  cairnreach: {
    surface: 'stone',
    obstacles: [
      rect('cairnreach-wall-a', 110, 1270, 370, 58, { occluder: true, prop: 'broken-wall', height: 108 }),
      rect('cairnreach-wall-b', 940, 1510, 365, 58, { occluder: true, prop: 'broken-wall', height: 108 }),
      rect('cairnreach-barricade', 590, 1860, 255, 52, { prop: 'crates', height: 45 }),
      circle('cairnreach-tower', 1180, 2090, 92, { occluder: true, prop: 'buttress', height: 144 }),
      circle('cairnreach-rubble', 330, 2220, 75, { prop: 'bell-rubble', height: 54 })
    ],
    ramps: [
      ramp('cairnreach-stairs-a', 530, 1420, 250, 220, 'y', 0, 42, { surface: 'stone' }),
      ramp('cairnreach-stairs-b', 850, 2100, 260, 250, 'y', 8, 58, { surface: 'stone' })
    ]
  },
  'veiled-road': {
    surface: 'ash',
    obstacles: [
      rect('veil-arch-a', 1580, 1210, 170, 68, { occluder: true, prop: 'broken-wall', height: 118 }),
      circle('veil-rift-a', 1900, 1510, 92, { solid: false, hazardSurface: 'ash', prop: 'rift', height: 0 }),
      rect('veil-wall', 2160, 1720, 260, 54, { occluder: true, prop: 'broken-wall', height: 92 }),
      circle('veil-tree', 2470, 2050, 76, { occluder: true, prop: 'dead-tree', height: 120 })
    ],
    ramps: [ramp('veil-bridge', 1770, 2010, 430, 145, 'x', 12, 48, { surface: 'stone' })]
  },
  bellscar: {
    surface: 'stone',
    obstacles: [
      rect('bellscar-gatehouse', 2700, 1160, 280, 90, { occluder: true, prop: 'buttress', height: 138 }),
      rect('bellscar-nave-a', 2950, 1480, 80, 360, { occluder: true, prop: 'buttress', height: 152 }),
      rect('bellscar-nave-b', 3500, 1480, 80, 360, { occluder: true, prop: 'buttress', height: 152 }),
      circle('bellscar-bell-rubble', 3240, 2060, 88, { prop: 'bell-rubble', height: 68 }),
      rect('bellscar-broken-wall', 3620, 2220, 175, 72, { occluder: true, prop: 'broken-wall', height: 94 })
    ],
    ramps: [
      ramp('bellscar-ascent-a', 3050, 1260, 420, 230, 'y', 0, 48, { surface: 'stone' }),
      ramp('bellscar-ascent-b', 3180, 1870, 330, 270, 'y', 18, 72, { surface: 'stone' })
    ]
  }
});

const stagePattern = (stage, stageIndex = 0) => {
  const r = stage.radius;
  const rotation = stageIndex % 2 ? Math.PI * .25 : 0;
  const point = (angle, radius) => ({ x: stage.x + Math.cos(angle + rotation) * radius, y: stage.y + Math.sin(angle + rotation) * radius });
  const obstacles = [];
  const occluders = [];
  if (stage.type === 'formation') {
    const a = point(Math.PI * .5, r * .53); const b = point(-Math.PI * .5, r * .53);
    obstacles.push(circle(`${stage.id}-pillar-a`, a.x, a.y, 31, { prop: 'buttress', height: 84 }));
    obstacles.push(circle(`${stage.id}-pillar-b`, b.x, b.y, 31, { prop: 'buttress', height: 84 }));
  } else if (stage.type === 'ritual') {
    for (let i = 0; i < 3; i += 1) {
      const p = point(-Math.PI / 2 + i * Math.PI * 2 / 3, r * .48);
      obstacles.push(circle(`${stage.id}-ritual-plinth-${i}`, p.x, p.y, 27, { prop: 'shrine', height: 52 }));
    }
  } else if (stage.type === 'lieutenant') {
    const a = point(.1, r * .56); const b = point(Math.PI + .1, r * .56);
    obstacles.push(rect(`${stage.id}-cover-a`, a.x - 46, a.y - 22, 92, 44, { prop: 'broken-wall', height: 55 }));
    obstacles.push(rect(`${stage.id}-cover-b`, b.x - 46, b.y - 22, 92, 44, { prop: 'broken-wall', height: 55 }));
  } else if (stage.type === 'boss') {
    for (let i = 0; i < 4; i += 1) {
      const p = point(Math.PI / 4 + i * Math.PI / 2, r * .61);
      const pillar = circle(`${stage.id}-boss-pillar-${i}`, p.x, p.y, 34, { prop: 'buttress', height: 112, occluder: true });
      obstacles.push(pillar); occluders.push(pillar);
    }
  }
  return {
    id: stage.id,
    shape: stage.type === 'boss' ? 'octagon' : stage.type === 'ritual' ? 'hexagon' : 'round',
    center: { x: stage.x, y: stage.y },
    radius: r,
    obstacles,
    occluders,
    ramp: ramp(`${stage.id}-threshold`, stage.x - r * .62, stage.y + r * .54, r * 1.24, 62, 'y', 0, 14, { surface: 'stone' })
  };
};

export const buildBlackRoadGeometry = (expeditions = []) => Object.fromEntries(
  expeditions.flatMap((expedition, expeditionIndex) => expedition.stages.map((stage, stageIndex) => [stage.id, stagePattern(stage, expeditionIndex + stageIndex)]))
);
