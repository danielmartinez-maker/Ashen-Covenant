export const AUDIO_CATEGORY_BUDGETS = Object.freeze({ total: 36, enemyVocal: 6, footstep: 8, impact: 10, ambience: 4 });

const generated = [
  'swing-light-a', 'swing-light-b', 'swing-heavy-a', 'swing-heavy-b',
  'impact-flesh', 'impact-plate', 'impact-stone', 'impact-bone', 'guard-impact', 'guard-break', 'poise-break',
  'projectile-launch', 'projectile-pass', 'projectile-impact', 'spell-cast', 'spell-release', 'spell-impact', 'spell-field', 'summon',
  'dodge-cloth', 'execution-start', 'execution-contact', 'execution-finish',
  'enemy-effort', 'enemy-hurt', 'enemy-death', 'enemy-command',
  'hunter-intrusion', 'hunter-signature', 'boss-telegraph', 'boss-phase', 'boss-signature', 'boss-stagger', 'boss-death',
  'destruction', 'loot-drop', 'loot-pickup', 'unique-reveal', 'ui-confirm', 'ui-error', 'ui-warning',
  'ambience-ash', 'ambience-fog', 'ambience-rain', 'ambience-wind', 'ambience-rift', 'ambience-storm',
  'cov-flame', 'cov-grave', 'cov-blood', 'cov-light', 'cov-storm', 'cov-void'
];

export const AUDIO_ASSETS_V7 = Object.freeze(Object.fromEntries([
  ...generated.map((id) => [id, Object.freeze({ id, src: `/assets/audio/v7/${id}.wav`, required: true, legacy: false })]),
  ['footstep-stone-v5', Object.freeze({ id: 'footstep-stone-v5', src: '/assets/audio/v5/footstep-stone.wav', required: true, legacy: true })],
  ['footstep-mud-v5', Object.freeze({ id: 'footstep-mud-v5', src: '/assets/audio/v5/footstep-mud.wav', required: true, legacy: true })],
  ['footstep-water-v5', Object.freeze({ id: 'footstep-water-v5', src: '/assets/audio/v5/footstep-water.wav', required: true, legacy: true })],
  ['footstep-ash-v5', Object.freeze({ id: 'footstep-ash-v5', src: '/assets/audio/v5/footstep-ash.wav', required: true, legacy: true })]
]));

export const AUDIO_REQUIRED_EVENT_FAMILIES = Object.freeze([
  'weapon-swing', 'projectile-launch', 'projectile-pass', 'projectile-impact', 'physical-impact', 'guard-impact', 'guard-break',
  'armor-impact', 'poise-break', 'stagger', 'knockdown', 'spell-cast', 'spell-sustain', 'spell-release', 'spell-impact', 'spell-field', 'summon',
  'covenant-accent', 'dodge', 'execution-start', 'execution-contact', 'execution-finish', 'enemy-effort', 'enemy-hurt', 'enemy-death', 'enemy-command',
  'hunter-intrusion', 'hunter-signature', 'boss-telegraph', 'boss-phase', 'boss-signature', 'boss-stagger', 'boss-death', 'footstep', 'destruction',
  'loot-drop', 'loot-pickup', 'unique-reveal', 'ui-confirm', 'ui-error', 'ui-warning', 'regional-ambience'
]);

const def = (id, assets, extra = {}) => Object.freeze({
  id,
  assets: Object.freeze(assets),
  bus: 'abilities',
  priority: 3,
  concurrencyGroup: id,
  cooldown: 0.02,
  gain: 0.75,
  pitch: Object.freeze([0.96, 1.04]),
  spatial: 'actor',
  category: 'general',
  required: true,
  maxLayers: 1,
  ...extra
});

export const AUDIO_SEMANTIC_DEFINITIONS = Object.freeze({
  'weapon-swing': def('weapon-swing', ['swing-light-a', 'swing-light-b'], { bus: 'abilities', category: 'impact', maxLayers: 2 }),
  'projectile-launch': def('projectile-launch', ['projectile-launch']),
  'projectile-pass': def('projectile-pass', ['projectile-pass'], { priority: 1, gain: 0.42 }),
  'projectile-impact': def('projectile-impact', ['projectile-impact'], { bus: 'impacts', category: 'impact', maxLayers: 3 }),
  'physical-impact': def('physical-impact', ['impact-flesh'], { bus: 'impacts', priority: 4, category: 'impact', maxLayers: 4 }),
  'guard-impact': def('guard-impact', ['guard-impact'], { bus: 'impacts', priority: 5, category: 'impact' }),
  'guard-break': def('guard-break', ['guard-break'], { bus: 'impacts', priority: 8, category: 'impact', gain: 0.9 }),
  'armor-impact': def('armor-impact', ['impact-plate'], { bus: 'impacts', category: 'impact' }),
  'poise-break': def('poise-break', ['poise-break'], { bus: 'impacts', priority: 7, category: 'impact' }),
  'stagger': def('stagger', ['poise-break'], { bus: 'impacts', priority: 6, category: 'impact' }),
  'knockdown': def('knockdown', ['impact-stone'], { bus: 'impacts', priority: 7, category: 'impact' }),
  'spell-cast': def('spell-cast', ['spell-cast'], { bus: 'abilities' }),
  'spell-sustain': def('spell-sustain', ['spell-field'], { bus: 'abilities', gain: 0.42, priority: 1 }),
  'spell-release': def('spell-release', ['spell-release'], { bus: 'abilities', priority: 4 }),
  'spell-impact': def('spell-impact', ['spell-impact'], { bus: 'impacts', priority: 5, category: 'impact', maxLayers: 3 }),
  'spell-field': def('spell-field', ['spell-field'], { bus: 'abilities', priority: 2 }),
  'summon': def('summon', ['summon'], { bus: 'abilities', priority: 5 }),
  'covenant-accent': def('covenant-accent', ['cov-void'], { bus: 'abilities', priority: 2, gain: 0.36 }),
  'dodge': def('dodge', ['dodge-cloth'], { bus: 'abilities', priority: 2 }),
  'execution-start': def('execution-start', ['execution-start'], { bus: 'impacts', priority: 9, category: 'impact' }),
  'execution-contact': def('execution-contact', ['execution-contact'], { bus: 'impacts', priority: 10, category: 'impact' }),
  'execution-finish': def('execution-finish', ['execution-finish'], { bus: 'impacts', priority: 10, category: 'impact' }),
  'enemy-effort': def('enemy-effort', ['enemy-effort'], { bus: 'enemyAbilities', category: 'enemyVocal', priority: 2 }),
  'enemy-hurt': def('enemy-hurt', ['enemy-hurt'], { bus: 'enemyAbilities', category: 'enemyVocal', priority: 2 }),
  'enemy-death': def('enemy-death', ['enemy-death'], { bus: 'enemyAbilities', category: 'enemyVocal', priority: 3 }),
  'enemy-command': def('enemy-command', ['enemy-command'], { bus: 'enemyAbilities', category: 'enemyVocal', priority: 5 }),
  'hunter-intrusion': def('hunter-intrusion', ['hunter-intrusion'], { bus: 'enemyAbilities', priority: 9 }),
  'hunter-signature': def('hunter-signature', ['hunter-signature'], { bus: 'enemyAbilities', priority: 8 }),
  'boss-telegraph': def('boss-telegraph', ['boss-telegraph'], { bus: 'enemyAbilities', priority: 7 }),
  'boss-phase': def('boss-phase', ['boss-phase'], { bus: 'enemyAbilities', priority: 10 }),
  'boss-signature': def('boss-signature', ['boss-signature'], { bus: 'enemyAbilities', priority: 9 }),
  'boss-stagger': def('boss-stagger', ['boss-stagger'], { bus: 'impacts', category: 'impact', priority: 9 }),
  'boss-death': def('boss-death', ['boss-death'], { bus: 'impacts', category: 'impact', priority: 10 }),
  'footstep': def('footstep', ['footstep-stone-v5'], { bus: 'footsteps', category: 'footstep', priority: 1, gain: 0.5 }),
  'destruction': def('destruction', ['destruction'], { bus: 'destruction', category: 'impact', priority: 4 }),
  'loot-drop': def('loot-drop', ['loot-drop'], { bus: 'ui', priority: 2, spatial: 'world' }),
  'loot-pickup': def('loot-pickup', ['loot-pickup'], { bus: 'ui', priority: 3, spatial: 'none' }),
  'unique-reveal': def('unique-reveal', ['unique-reveal'], { bus: 'ui', priority: 9, spatial: 'none' }),
  'ui-confirm': def('ui-confirm', ['ui-confirm'], { bus: 'ui', priority: 2, spatial: 'none' }),
  'ui-error': def('ui-error', ['ui-error'], { bus: 'ui', priority: 5, spatial: 'none' }),
  'ui-warning': def('ui-warning', ['ui-warning'], { bus: 'ui', priority: 6, spatial: 'none' }),
  'regional-ambience': def('regional-ambience', ['ambience-ash'], { bus: 'ambience', category: 'ambience', priority: 1, spatial: 'none', gain: 0.32 })
});

export const audioAsset = (id) => AUDIO_ASSETS_V7[id] ?? null;
export const audioDefinition = (id) => AUDIO_SEMANTIC_DEFINITIONS[id] ?? null;
