import { clamp } from '../core/math.js';

export const CLASS_IDS = ['warden', 'thornseer', 'ironbound', 'veilrunner', 'gravebinder', 'dawnstrider'];

// Imprints are intentionally broad enough to make every primary class feel
// different without turning the UI into four copies of the same skill screen.
// One imprint can be attuned to each active ability family at a time.
export const SKILL_IMPRINTS = {
  skillOne: [
    { id: 'forked', name: 'Forked Oath', level: 3, icon: '⌇', desc: 'Skill One also launches two lighter side projectiles.' },
    { id: 'splinter', name: 'Splintering Rite', level: 8, icon: '✦', desc: 'The first target struck releases two damaging shards.' },
    { id: 'piercing', name: 'Unbroken Line', level: 15, icon: '↠', desc: 'Skill One gains two pierces and 12% more damage.' },
    { id: 'seeker', name: 'Hunting Thread', level: 22, icon: '◈', desc: 'Skill One steers toward marked or cursed prey and deals 18% more damage to it.' }
  ],
  skillTwo: [
    { id: 'expanse', name: 'Widened Circle', level: 4, icon: '◉', desc: 'Ground abilities cover 35% more area for 10% less damage.' },
    { id: 'lasting', name: 'Lingering Vow', level: 10, icon: '⌁', desc: 'Ground abilities last 55% longer.' },
    { id: 'sentinel', name: 'Sentinel Sigil', level: 17, icon: '▣', desc: 'Your ground ability retaliates while you are shielded.' },
    { id: 'echoing', name: 'Echoing Ground', level: 22, icon: '⌁', desc: 'When your ground ability expires, it repeats once at 55% power.' }
  ],
  hybrid: [
    { id: 'overcharge', name: 'Confluence Overcharge', level: 7, icon: '✹', desc: 'Hybrid signature damage is increased by 26%.' },
    { id: 'bulwark', name: 'Oathguard Echo', level: 12, icon: '⬡', desc: 'Using a hybrid signature grants an additional barrier.' },
    { id: 'refraction', name: 'Veil Refraction', level: 20, icon: '✧', desc: 'Hybrid signatures release a three-way spectral burst.' },
    { id: 'confluence', name: 'Confluence Engine', level: 24, icon: '☉', desc: 'Every third hybrid signature instantly refreshes its cooldown and empowers the next companion technique.' }
  ],
  ultimate: [
    { id: 'cataclysm', name: 'Bellbreaker', level: 18, icon: '✺', desc: 'Hybrid ultimate damage is increased by 22%.' },
    { id: 'aftershock', name: 'Lasting Judgment', level: 25, icon: '☾', desc: 'Hybrid ultimates leave a delayed covenant aftershock.' },
    { id: 'ascendant', name: 'Ascendant Oath', level: 28, icon: '✷', desc: 'Hybrid ultimates summon a short-lived covenant avatar that fights beside you.' }
  ]
};

export const CLASSES = {
  warden: {
    id: 'warden', name: 'Oathbound Warden', shortName: 'Warden', icon: '⌁', color: '#69d4c2', resource: 'Resolve',
    identity: 'A disciplined guardian who converts close-range strikes into rites, wards, and retaliation.',
    stats: { hp: 174, power: 23, armor: 13, speed: 245, crit: 0.06, critMult: 1.7, resource: 45, potions: 4 },
    abilities: {
      attack: { name: 'Grave Hew', icon: '⌁', hint: 'Cleave and generate Resolve.', cooldown: 0.38, resource: 12 },
      skillOne: { name: 'Spirit Nail', icon: '✦', hint: 'Piercing nail that marks enemies.', cooldown: 1.1, cost: 18 },
      skillTwo: { name: 'Warding Circle', icon: '◉', hint: 'Damage and shelter in a ritual circle.', cooldown: 7.5, cost: 28 },
      dodge: { name: 'Chainstep', icon: '↠', hint: 'A violent evasive chain-step.', cooldown: 3.7 },
      ultimate: { name: 'Last Oath', icon: '✺', hint: 'A covenant of protection and judgment.', cooldown: 28, cost: 70 }
    },
    tree: [
      { id: 'warden-edge', name: 'Tempered Edge', max: 3, level: 1, tier: 1, branch: 'Retribution', desc: '+8% direct damage per rank.', kind: 'power' },
      { id: 'warden-vow', name: 'Unbroken Vow', max: 2, level: 1, tier: 1, branch: 'Aegis', desc: '+14% barrier strength per rank.', kind: 'ward' },
      { id: 'warden-judgment', name: 'Judgment Road', max: 2, level: 3, tier: 2, branch: 'Retribution', requires: [{ id: 'warden-edge', rank: 1 }], desc: 'Marked foes take +10% damage per rank.', kind: 'mark' },
      { id: 'warden-iron', name: 'Iron Mercy', max: 1, level: 3, tier: 2, branch: 'Aegis', requires: [{ id: 'warden-vow', rank: 1 }], desc: 'Potions grant 1.2 s of damage reduction.', kind: 'potion' },
      { id: 'warden-nailstorm', name: 'Nailstorm Litany', max: 2, level: 7, tier: 3, branch: 'Retribution', requires: [{ id: 'warden-judgment', rank: 2 }], desc: 'Spirit Nail gains one extra splinter per rank.', kind: 'skill' },
      { id: 'warden-sentinel', name: 'Sentinel Circle', max: 2, level: 7, tier: 3, branch: 'Aegis', requires: [{ id: 'warden-iron', rank: 1 }], desc: 'Warding Circle gains 14% radius per rank.', kind: 'ward' },
      { id: 'warden-reprisal', name: 'Thorned Reprisal', max: 2, level: 12, tier: 4, branch: 'Aegis', requires: [{ id: 'warden-sentinel', rank: 2 }], desc: 'Barrier absorption fires a retaliatory briar per rank.', kind: 'reaction' },
      { id: 'warden-penitent', name: 'Penitent Verdict', max: 1, level: 18, tier: 5, branch: 'Retribution', requires: [{ id: 'warden-nailstorm', rank: 2 }], exclusiveGroup: 'warden-capstone', desc: 'Marked prey takes 18% more damage from your covenant.', kind: 'keystone' },
      { id: 'warden-oathforge', name: 'Oathforge Bastion', max: 1, level: 18, tier: 5, branch: 'Aegis', requires: [{ id: 'warden-reprisal', rank: 2 }], exclusiveGroup: 'warden-capstone', desc: '+18% armor and a larger barrier whenever you invoke a hybrid skill.', kind: 'keystone' },
      { id: 'warden-crescent', name: 'Crescent Reprieve', max: 2, level: 10, tier: 4, branch: 'Retribution', requires: [{ id: 'warden-nailstorm', rank: 1 }], desc: 'The third Grave Hew releases a returning covenant crescent per rank.', kind: 'skill' },
      { id: 'warden-intercession', name: 'Intercession', max: 2, level: 14, tier: 4, branch: 'Aegis', requires: [{ id: 'warden-sentinel', rank: 1 }], desc: 'Executions restore 3% health and reinforce your barrier per rank.', kind: 'execution' },
      { id: 'warden-requiem', name: 'Righteous Requiem', max: 1, level: 24, tier: 6, branch: 'Retribution', requires: [{ id: 'warden-penitent', rank: 1 }], desc: 'Critical hits against marked prey gain 16% more damage and 10 Resolve.', kind: 'ascension' },
      { id: 'warden-keep', name: 'The Living Keep', max: 1, level: 24, tier: 6, branch: 'Aegis', requires: [{ id: 'warden-oathforge', rank: 1 }], desc: 'Standing in a ward grants 12% armor and sustains a small barrier.', kind: 'ascension' }
    ]
  },
  thornseer: {
    id: 'thornseer', name: 'Thornseer', shortName: 'Thornseer', icon: '✧', color: '#bb8dff', resource: 'Focus',
    identity: 'A thorn witch whose curses bloom across the battlefield and reward methodical positioning.',
    stats: { hp: 138, power: 25, armor: 6, speed: 266, crit: 0.1, critMult: 1.82, resource: 62, potions: 3 },
    abilities: {
      attack: { name: 'Briar Lash', icon: '⌇', hint: 'Ranged lash that restores Focus.', cooldown: 0.42, resource: 13 },
      skillOne: { name: 'Hex Bolt', icon: '✧', hint: 'Splitting curse that weakens prey.', cooldown: 1.0, cost: 20 },
      skillTwo: { name: 'Blood Bloom', icon: '✹', hint: 'A perilous bloom of thorns and healing.', cooldown: 8.5, cost: 31 },
      dodge: { name: 'Gloom Step', icon: '⇢', hint: 'Slip through the veil and leave a thorn trail.', cooldown: 3.25 },
      ultimate: { name: 'Moonfall', icon: '☾', hint: 'Rain lunar thorns across a cursed field.', cooldown: 28, cost: 82 }
    },
    tree: [
      { id: 'thorn-needle', name: 'Needle Study', max: 3, level: 1, tier: 1, branch: 'Hexcraft', desc: '+8% projectile damage per rank.', kind: 'power' },
      { id: 'thorn-bloom', name: 'Living Bloom', max: 2, level: 1, tier: 1, branch: 'Bloodroot', desc: '+18% bloom radius per rank.', kind: 'ward' },
      { id: 'thorn-curse', name: 'Rotting Hex', max: 2, level: 3, tier: 2, branch: 'Hexcraft', requires: [{ id: 'thorn-needle', rank: 1 }], desc: 'Curses last +1.2 s per rank.', kind: 'mark' },
      { id: 'thorn-sap', name: 'Sanguine Sap', max: 1, level: 3, tier: 2, branch: 'Bloodroot', requires: [{ id: 'thorn-bloom', rank: 1 }], desc: 'Killing cursed foes restores 6% health.', kind: 'sustain' },
      { id: 'thorn-barbs', name: 'Barbed Spiral', max: 2, level: 7, tier: 3, branch: 'Hexcraft', requires: [{ id: 'thorn-curse', rank: 2 }], desc: 'Hex Bolt gains one extra splitting shard per rank.', kind: 'skill' },
      { id: 'thorn-vitalbloom', name: 'Vital Thicket', max: 2, level: 7, tier: 3, branch: 'Bloodroot', requires: [{ id: 'thorn-sap', rank: 1 }], desc: 'Blood Bloom heals +2 health per tick per rank.', kind: 'ward' },
      { id: 'thorn-moonroot', name: 'Moonroot Snare', max: 2, level: 12, tier: 4, branch: 'Hexcraft', requires: [{ id: 'thorn-barbs', rank: 2 }], desc: 'Your curses slow enemies by 8% per rank.', kind: 'control' },
      { id: 'thorn-plaguecrown', name: 'Plague Crown', max: 1, level: 18, tier: 5, branch: 'Hexcraft', requires: [{ id: 'thorn-moonroot', rank: 2 }], exclusiveGroup: 'thorn-capstone', desc: 'Cursed prey takes 18% more damage from all your attacks.', kind: 'keystone' },
      { id: 'thorn-bloodmoon', name: 'Bloodmoon Covenant', max: 1, level: 18, tier: 5, branch: 'Bloodroot', requires: [{ id: 'thorn-vitalbloom', rank: 2 }], exclusiveGroup: 'thorn-capstone', desc: 'Blood Bloom grants a 12% maximum-health barrier while standing within it.', kind: 'keystone' },
      { id: 'thorn-witchfire', name: 'Witchfire Spores', max: 2, level: 10, tier: 4, branch: 'Hexcraft', requires: [{ id: 'thorn-barbs', rank: 1 }], desc: 'Cursed kills release a seeking spore per rank.', kind: 'reaction' },
      { id: 'thorn-quickening', name: 'Root Quickening', max: 2, level: 14, tier: 4, branch: 'Bloodroot', requires: [{ id: 'thorn-vitalbloom', rank: 1 }], desc: 'Blood Bloom ticks restore 4 Focus per rank while you stand within it.', kind: 'sustain' },
      { id: 'thorn-gravetide', name: 'Gravetide', max: 1, level: 24, tier: 6, branch: 'Hexcraft', requires: [{ id: 'thorn-plaguecrown', rank: 1 }], desc: 'Cursed elites leave a hostile briar collapse when they die.', kind: 'ascension' },
      { id: 'thorn-heartroot', name: 'Heartroot Vow', max: 1, level: 24, tier: 6, branch: 'Bloodroot', requires: [{ id: 'thorn-bloodmoon', rank: 1 }], desc: 'Blood Bloom amplifies your direct damage by 14% while inside it.', kind: 'ascension' }
    ]
  },
  ironbound: {
    id: 'ironbound', name: 'Ironbound', shortName: 'Ironbound', icon: '⬡', color: '#e8be6b', resource: 'Guard',
    identity: 'A moving fortress who hoards Guard, breaks formations, and converts pressure into armor.',
    stats: { hp: 218, power: 20, armor: 24, speed: 215, crit: 0.04, critMult: 1.6, resource: 50, potions: 5 },
    abilities: {
      attack: { name: 'Shield Break', icon: '⬡', hint: 'Crushing shield strike that stores Guard.', cooldown: 0.48, resource: 14 },
      skillOne: { name: 'Chain Harpoon', icon: '⛓', hint: 'Hook a foe or pull to the destination.', cooldown: 2.0, cost: 17 },
      skillTwo: { name: 'Bulwark', icon: '▣', hint: 'Fortify a ground you can defend.', cooldown: 9.0, cost: 30 },
      dodge: { name: 'Iron Rush', icon: '⇥', hint: 'Shoulder through enemies and stagger them.', cooldown: 4.2 },
      ultimate: { name: 'Siege Heart', icon: '✺', hint: 'Turn defense into a crushing storm.', cooldown: 30, cost: 72 }
    },
    tree: [
      { id: 'iron-core', name: 'Cairn Core', max: 3, level: 1, tier: 1, branch: 'Siege', desc: '+9% stagger damage per rank.', kind: 'power' },
      { id: 'iron-rampart', name: 'Deep Rampart', max: 2, level: 1, tier: 1, branch: 'Bulwark', desc: '+11% armor per rank.', kind: 'ward' },
      { id: 'iron-chain', name: 'Chain Dominion', max: 2, level: 3, tier: 2, branch: 'Siege', requires: [{ id: 'iron-core', rank: 1 }], desc: 'Harpoon gains +20% pull force per rank.', kind: 'control' },
      { id: 'iron-stand', name: 'Hold the Line', max: 1, level: 3, tier: 2, branch: 'Bulwark', requires: [{ id: 'iron-rampart', rank: 1 }], desc: 'Gain 25% damage reduction below 30% health.', kind: 'sustain' },
      { id: 'iron-shatter', name: 'Shattermarch', max: 2, level: 7, tier: 3, branch: 'Siege', requires: [{ id: 'iron-chain', rank: 2 }], desc: 'Shield Break deals 35% more stagger per rank.', kind: 'skill' },
      { id: 'iron-citadel', name: 'Citadel Heart', max: 2, level: 7, tier: 3, branch: 'Bulwark', requires: [{ id: 'iron-stand', rank: 1 }], desc: 'Bulwark grants 10% more barrier and radius per rank.', kind: 'ward' },
      { id: 'iron-vanguard', name: 'Vanguard Rush', max: 2, level: 12, tier: 4, branch: 'Siege', requires: [{ id: 'iron-shatter', rank: 2 }], desc: 'Iron Rush deals 25% more damage per rank and leaves a shockwave.', kind: 'control' },
      { id: 'iron-colossus', name: 'Colossus Oath', max: 1, level: 18, tier: 5, branch: 'Bulwark', requires: [{ id: 'iron-citadel', rank: 2 }], exclusiveGroup: 'iron-capstone', desc: '+20% maximum health and armor; Bulwark follows you briefly.', kind: 'keystone' },
      { id: 'iron-chainlord', name: 'Chainlord', max: 1, level: 18, tier: 5, branch: 'Siege', requires: [{ id: 'iron-vanguard', rank: 2 }], exclusiveGroup: 'iron-capstone', desc: 'Chain Harpoon chains once to a nearby enemy after its first impact.', kind: 'keystone' },
      { id: 'iron-galvanize', name: 'Galvanized Impact', max: 2, level: 10, tier: 4, branch: 'Siege', requires: [{ id: 'iron-shatter', rank: 1 }], desc: 'Shield Break grants a 2% maximum-health barrier per rank when it strikes two foes.', kind: 'skill' },
      { id: 'iron-foundry', name: 'Foundry Discipline', max: 2, level: 14, tier: 4, branch: 'Bulwark', requires: [{ id: 'iron-citadel', rank: 1 }], desc: 'While inside Bulwark, regain 3 Guard and 2% stagger resistance per rank each tick.', kind: 'sustain' },
      { id: 'iron-march', name: 'March of Chains', max: 1, level: 24, tier: 6, branch: 'Siege', requires: [{ id: 'iron-chainlord', rank: 1 }], desc: 'Chain Harpoon causes a concussive burst on its first impact.', kind: 'ascension' },
      { id: 'iron-everwall', name: 'Everwall', max: 1, level: 24, tier: 6, branch: 'Bulwark', requires: [{ id: 'iron-colossus', rank: 1 }], desc: 'Bulwark follows you longer and absorbs 12% more incoming damage.', kind: 'ascension' }
    ]
  },
  veilrunner: {
    id: 'veilrunner', name: 'Veilrunner', shortName: 'Veilrunner', icon: '✦', color: '#ff9a5d', resource: 'Momentum',
    identity: 'A lethal skirmisher who turns movement, weak points, and clean executions into Momentum.',
    stats: { hp: 148, power: 24, armor: 8, speed: 294, crit: 0.14, critMult: 1.95, resource: 64, potions: 3 },
    abilities: {
      attack: { name: 'Twin Cut', icon: '✦', hint: 'Fast cuts that build Momentum while moving.', cooldown: 0.29, resource: 13 },
      skillOne: { name: 'Veil Knife', icon: '†', hint: 'A ricocheting blade for exposed prey.', cooldown: 1.25, cost: 19 },
      skillTwo: { name: 'Smoke Veil', icon: '◌', hint: 'Break sight, slow enemies, and open a window.', cooldown: 8.0, cost: 27 },
      dodge: { name: 'Rift Step', icon: '↯', hint: 'Blink through danger and leave a shade.', cooldown: 2.8 },
      ultimate: { name: 'Heartseeker', icon: '✷', hint: 'Hunt every marked weak point at once.', cooldown: 27, cost: 80 }
    },
    tree: [
      { id: 'veil-edge', name: 'Razor Tempo', max: 3, level: 1, tier: 1, branch: 'Assassin', desc: '+7% critical damage per rank.', kind: 'power' },
      { id: 'veil-smoke', name: 'Deep Smoke', max: 2, level: 1, tier: 1, branch: 'Shade', desc: '+14% veil duration per rank.', kind: 'ward' },
      { id: 'veil-rift', name: 'Rift Hunger', max: 2, level: 3, tier: 2, branch: 'Assassin', requires: [{ id: 'veil-edge', rank: 1 }], desc: 'Rift Step restores 8 Momentum per rank.', kind: 'control' },
      { id: 'veil-mercy', name: 'Quiet Mercy', max: 1, level: 3, tier: 2, branch: 'Shade', requires: [{ id: 'veil-smoke', rank: 1 }], desc: 'Execution windows last 1.5 s longer.', kind: 'execution' },
      { id: 'veil-fan', name: 'Knife Fan', max: 2, level: 7, tier: 3, branch: 'Assassin', requires: [{ id: 'veil-rift', rank: 2 }], desc: 'Veil Knife throws one additional side blade per rank.', kind: 'skill' },
      { id: 'veil-ghost', name: 'Ghost Thread', max: 2, level: 7, tier: 3, branch: 'Shade', requires: [{ id: 'veil-mercy', rank: 1 }], desc: 'Rift Step leaves a delayed shadow knife per rank.', kind: 'reaction' },
      { id: 'veil-ambush', name: 'Ambush Window', max: 2, level: 12, tier: 4, branch: 'Assassin', requires: [{ id: 'veil-fan', rank: 2 }], desc: 'Dodging grants 20% attack damage for 1.4 s per rank.', kind: 'control' },
      { id: 'veil-tempest', name: 'Tempest of Glass', max: 1, level: 18, tier: 5, branch: 'Assassin', requires: [{ id: 'veil-ambush', rank: 2 }], exclusiveGroup: 'veil-capstone', desc: 'Critical Veil Knives repeat once against marked enemies.', kind: 'keystone' },
      { id: 'veil-phantom', name: 'Phantom Road', max: 1, level: 18, tier: 5, branch: 'Shade', requires: [{ id: 'veil-ghost', rank: 2 }], exclusiveGroup: 'veil-capstone', desc: '+12% critical chance; every third dodge refunds 45% of its cooldown.', kind: 'keystone' },
      { id: 'veil-quickdraw', name: 'Quickdraw', max: 2, level: 10, tier: 4, branch: 'Assassin', requires: [{ id: 'veil-fan', rank: 1 }], desc: 'Every third Twin Cut throws an extra knife per rank.', kind: 'skill' },
      { id: 'veil-umbra', name: 'Umbra Step', max: 2, level: 14, tier: 4, branch: 'Shade', requires: [{ id: 'veil-ghost', rank: 1 }], desc: 'Rift Step grants 8% critical chance and damage reduction per rank for 1.2 seconds.', kind: 'reaction' },
      { id: 'veil-shatterdance', name: 'Shatterdance', max: 1, level: 24, tier: 6, branch: 'Assassin', requires: [{ id: 'veil-tempest', rank: 1 }], desc: 'Executions release a fan of glass knives at nearby prey.', kind: 'ascension' },
      { id: 'veil-silent-road', name: 'Silent Road', max: 1, level: 24, tier: 6, branch: 'Shade', requires: [{ id: 'veil-phantom', rank: 1 }], desc: 'Every third dodge leaves a shade that repeats your basic attack.', kind: 'ascension' }
    ]
  },
  gravebinder: {
    id: 'gravebinder', name: 'Gravebinder', shortName: 'Gravebinder', icon: '☠', color: '#8cc8d8', resource: 'Essence',
    identity: 'A death-scribe who turns fallen enemies into curses, bone rites, and a patient tide of spirits.',
    stats: { hp: 162, power: 26, armor: 9, speed: 252, crit: 0.08, critMult: 1.82, resource: 68, potions: 3 },
    abilities: {
      attack: { name: 'Grave Scythe', icon: '☠', hint: 'Sweep nearby prey and gather Essence.', cooldown: 0.4, resource: 13 },
      skillOne: { name: 'Bone Comet', icon: '✦', hint: 'Launch a piercing shard that curses what it strikes.', cooldown: 1.2, cost: 19 },
      skillTwo: { name: 'Mourning Ground', icon: '◌', hint: 'Raise a grave field that drains enemies and shelters you.', cooldown: 8.2, cost: 30 },
      dodge: { name: 'Soul Slip', icon: '⇢', hint: 'Pass through danger and leave an unquiet wake.', cooldown: 3.15 },
      ultimate: { name: 'Legion’s Toll', icon: '✺', hint: 'Call a procession of hungry spirits across the field.', cooldown: 29, cost: 80 }
    },
    tree: [
      { id: 'grave-edge', name: 'Ossified Edge', max: 3, level: 1, tier: 1, branch: 'Reaping', desc: '+8% direct and bone damage per rank.', kind: 'power' },
      { id: 'grave-shroud', name: 'Pallbearer Shroud', max: 2, level: 1, tier: 1, branch: 'Mourning', desc: '+12% armor and ward strength per rank.', kind: 'ward' },
      { id: 'grave-marrow', name: 'Marrow Script', max: 2, level: 3, tier: 2, branch: 'Reaping', requires: [{ id: 'grave-edge', rank: 1 }], desc: 'Bone Comet gains one pierce per rank.', kind: 'skill' },
      { id: 'grave-siphon', name: 'Soul Tithe', max: 1, level: 3, tier: 2, branch: 'Mourning', requires: [{ id: 'grave-shroud', rank: 1 }], desc: 'Cursed kills restore 5% health.', kind: 'sustain' },
      { id: 'grave-reaper', name: 'Reaper’s Measure', max: 2, level: 7, tier: 3, branch: 'Reaping', requires: [{ id: 'grave-marrow', rank: 2 }], desc: 'Every third Grave Scythe releases a soul blade per rank.', kind: 'skill' },
      { id: 'grave-ossuary', name: 'Open Ossuary', max: 2, level: 7, tier: 3, branch: 'Mourning', requires: [{ id: 'grave-siphon', rank: 1 }], desc: 'Mourning Ground gains 12% radius and stronger healing per rank.', kind: 'ward' },
      { id: 'grave-famine', name: 'Famine Bell', max: 2, level: 12, tier: 4, branch: 'Reaping', requires: [{ id: 'grave-reaper', rank: 2 }], desc: 'Cursed elites spawn a seeking wraith on death per rank.', kind: 'reaction' },
      { id: 'grave-legion', name: 'March of the Unnamed', max: 1, level: 18, tier: 5, branch: 'Reaping', requires: [{ id: 'grave-famine', rank: 2 }], exclusiveGroup: 'grave-capstone', desc: 'Bone Comet and Legion’s Toll gain 18% damage and an extra spirit.', kind: 'keystone' },
      { id: 'grave-sanctum', name: 'Sanctum of Bone', max: 1, level: 18, tier: 5, branch: 'Mourning', requires: [{ id: 'grave-ossuary', rank: 2 }], exclusiveGroup: 'grave-capstone', desc: 'Standing in Mourning Ground grants a powerful barrier and damage reduction.', kind: 'keystone' },
      { id: 'grave-cairn', name: 'Cairn Hunger', max: 2, level: 10, tier: 4, branch: 'Reaping', requires: [{ id: 'grave-reaper', rank: 1 }], desc: 'Grave Scythe hits against cursed prey build extra stagger per rank.', kind: 'control' },
      { id: 'grave-quiet', name: 'Quiet Procession', max: 2, level: 14, tier: 4, branch: 'Mourning', requires: [{ id: 'grave-ossuary', rank: 1 }], desc: 'Soul Slip leaves a longer grave wake and restores Essence per rank.', kind: 'sustain' },
      { id: 'grave-requiem', name: 'Black Requiem', max: 1, level: 24, tier: 6, branch: 'Reaping', requires: [{ id: 'grave-legion', rank: 1 }], desc: 'Your first cursed kill after a hybrid signature detonates nearby curses.', kind: 'ascension' },
      { id: 'grave-crypt', name: 'The Living Crypt', max: 1, level: 24, tier: 6, branch: 'Mourning', requires: [{ id: 'grave-sanctum', rank: 1 }], desc: 'Mourning Ground follows you briefly and continually restores a small barrier.', kind: 'ascension' }
    ]
  },
  dawnstrider: {
    id: 'dawnstrider', name: 'Dawnstrider', shortName: 'Dawnstrider', icon: '☼', color: '#f3cd70', resource: 'Fervor',
    identity: 'A radiant wayfarer who turns precise javelins, movement, and consecrated ground into a moving sunrise.',
    stats: { hp: 154, power: 25, armor: 11, speed: 278, crit: 0.11, critMult: 1.88, resource: 62, potions: 4 },
    abilities: {
      attack: { name: 'Sunstaff', icon: '☼', hint: 'A swift staff strike that kindles Fervor.', cooldown: 0.34, resource: 13 },
      skillOne: { name: 'Radiant Javelin', icon: '↠', hint: 'Throw a searing javelin through marked prey.', cooldown: 1.05, cost: 20 },
      skillTwo: { name: 'Solar Chorus', icon: '✷', hint: 'Consecrate the ground with a protective, burning hymn.', cooldown: 7.8, cost: 29 },
      dodge: { name: 'Lightstep', icon: '⇥', hint: 'Dash in a flare that exposes nearby enemies.', cooldown: 2.95 },
      ultimate: { name: 'Dawnfall', icon: '✺', hint: 'Call a falling sun that leaves a radiant battlefield.', cooldown: 28, cost: 78 }
    },
    tree: [
      { id: 'dawn-edge', name: 'First Light', max: 3, level: 1, tier: 1, branch: 'Lancer', desc: '+8% direct and javelin damage per rank.', kind: 'power' },
      { id: 'dawn-halo', name: 'Pilgrim Halo', max: 2, level: 1, tier: 1, branch: 'Chorus', desc: '+14% barrier and consecrated radius per rank.', kind: 'ward' },
      { id: 'dawn-brand', name: 'Daybreak Brand', max: 2, level: 3, tier: 2, branch: 'Lancer', requires: [{ id: 'dawn-edge', rank: 1 }], desc: 'Radiant Javelin marks prey for +1.3 seconds per rank.', kind: 'mark' },
      { id: 'dawn-mercy', name: 'Wayfarer Mercy', max: 1, level: 3, tier: 2, branch: 'Chorus', requires: [{ id: 'dawn-halo', rank: 1 }], desc: 'Killing marked prey restores 5% health.', kind: 'sustain' },
      { id: 'dawn-lance', name: 'Lance Choir', max: 2, level: 7, tier: 3, branch: 'Lancer', requires: [{ id: 'dawn-brand', rank: 2 }], desc: 'Radiant Javelin gains one extra pierce per rank.', kind: 'skill' },
      { id: 'dawn-chorus', name: 'Gathered Chorus', max: 2, level: 7, tier: 3, branch: 'Chorus', requires: [{ id: 'dawn-mercy', rank: 1 }], desc: 'Solar Chorus heals and shields more strongly per rank.', kind: 'ward' },
      { id: 'dawn-cinder', name: 'Cinder Psalm', max: 2, level: 12, tier: 4, branch: 'Lancer', requires: [{ id: 'dawn-lance', rank: 2 }], desc: 'Marked kills scatter a radiant shard per rank.', kind: 'reaction' },
      { id: 'dawn-ascendant', name: 'Ascendant Road', max: 1, level: 18, tier: 5, branch: 'Lancer', requires: [{ id: 'dawn-cinder', rank: 2 }], exclusiveGroup: 'dawn-capstone', desc: 'Radiant Javelin returns once and deals 18% more damage to bosses.', kind: 'keystone' },
      { id: 'dawn-shelter', name: 'Hearth of Noon', max: 1, level: 18, tier: 5, branch: 'Chorus', requires: [{ id: 'dawn-chorus', rank: 2 }], exclusiveGroup: 'dawn-capstone', desc: 'Solar Chorus follows you briefly and reduces incoming damage.', kind: 'keystone' },
      { id: 'dawn-quickstep', name: 'Radiant Footwork', max: 2, level: 10, tier: 4, branch: 'Lancer', requires: [{ id: 'dawn-lance', rank: 1 }], desc: 'Lightstep releases a marked flare with +20% damage per rank.', kind: 'control' },
      { id: 'dawn-orison', name: 'Burning Orison', max: 2, level: 14, tier: 4, branch: 'Chorus', requires: [{ id: 'dawn-chorus', rank: 1 }], desc: 'Solar Chorus restores 4 Fervor per pulse per rank.', kind: 'sustain' },
      { id: 'dawn-horizon', name: 'Horizon Split', max: 1, level: 24, tier: 6, branch: 'Lancer', requires: [{ id: 'dawn-ascendant', rank: 1 }], desc: 'Critical Javelins create a second sun-spear at 55% power.', kind: 'ascension' },
      { id: 'dawn-crown', name: 'Crown of the Road', max: 1, level: 24, tier: 6, branch: 'Chorus', requires: [{ id: 'dawn-shelter', rank: 1 }], desc: 'Dawnfall grants a lasting barrier and refreshes a potion charge.', kind: 'ascension' }
    ]
  }
};

const HYBRID_LIST = [
  {
    ids: ['warden', 'thornseer'], id: 'briar-oath', name: 'Briar Oath', icon: '✹', color: '#9ce77b',
    passive: 'Aegis in Bloom', passiveText: 'Wards grow thorns. Each barrier hit fires a retaliatory briar at the attacker.',
    signature: { name: 'Thornwall', icon: '✹', hint: 'Raise a living barrier that lashes nearby prey.', cooldown: 12 },
    ultimate: { name: 'Verdant Verdict', icon: '☾', hint: 'Bind the arena in a judging briar storm.', cooldown: 42 },
    board: ['Briar barriers retaliate', 'Marked prey feeds barriers', 'Moonfall casts from wards', 'Verdant Verdict roots elites']
  },
  {
    ids: ['ironbound', 'warden'], id: 'cairn-covenant', name: 'Cairn Covenant', icon: '⬡', color: '#d9e0a4',
    passive: 'Oathplate', passiveText: 'Blocking and staggering foes converts Guard into temporary Resolve armor.',
    signature: { name: 'Covenant Ram', icon: '⬡', hint: 'A shielded rush that cracks enemy formations.', cooldown: 11 },
    ultimate: { name: 'Unyielding Road', icon: '▣', hint: 'Turn the ground into a crushing bastion.', cooldown: 44 },
    board: ['Block produces Resolve', 'Stagger detonates armor shards', 'Harpoon anchors to wards', 'Bastion reflects projectiles']
  },
  {
    ids: ['veilrunner', 'warden'], id: 'riftchain', name: 'Riftchain', icon: '↯', color: '#62e1df',
    passive: 'Chain Reflex', passiveText: 'Dodging through a marked foe leaves a linked shade that repeats your next strike.',
    signature: { name: 'Chain Reprise', icon: '↯', hint: 'Leap through the target and replay a spectral cleave.', cooldown: 9 },
    ultimate: { name: 'Road of Knives', icon: '✺', hint: 'Dash between every marked enemy in a killing chain.', cooldown: 39 },
    board: ['Afterimages inherit crit', 'Marks chain on execution', 'Wards slow chased prey', 'Road of Knives ignores armor']
  },
  {
    ids: ['ironbound', 'thornseer'], id: 'blood-bastion', name: 'Blood Bastion', icon: '✦', color: '#df5d77',
    passive: 'Sanguine Plate', passiveText: 'Spending health or Focus hardens your armor and makes Bulwarks bleed nearby enemies.',
    signature: { name: 'Hemlock Citadel', icon: '✧', hint: 'Plant a bleeding fortress that drinks enemy strength.', cooldown: 13 },
    ultimate: { name: 'Red Siege', icon: '✺', hint: 'A fortified blood moon that turns damage into retaliation.', cooldown: 45 },
    board: ['Blooms inherit armor', 'Guard heals from bleed', 'Harpoon spreads hexes', 'Red Siege resurrects a bulwark']
  },
  {
    ids: ['thornseer', 'veilrunner'], id: 'nightbloom', name: 'Nightbloom', icon: '☾', color: '#aa75ff',
    passive: 'Poisoned Shadow', passiveText: 'Cursed kills create shade seeds that chase the next enemy you strike.',
    signature: { name: 'Night Orchid', icon: '☾', hint: 'Plant a seeking bloom then blink to its victim.', cooldown: 10 },
    ultimate: { name: 'Eclipse Garden', icon: '✷', hint: 'Fill the field with hunting shades and lunar thorns.', cooldown: 40 },
    board: ['Shades spread curse', 'Crits bloom poison', 'Rift steps trigger seeds', 'Eclipse Garden duplicates attacks']
  },
  {
    ids: ['ironbound', 'veilrunner'], id: 'black-rampart', name: 'Black Rampart', icon: '⛓', color: '#9aa5d5',
    passive: 'Momentum Guard', passiveText: 'Movement turns Guard into speed; parrying at full Momentum creates a counter window.',
    signature: { name: 'Gallows Run', icon: '⛓', hint: 'Hook forward in a black-iron rush and suspend enemies.', cooldown: 10 },
    ultimate: { name: 'Night Siege', icon: '✷', hint: 'Create a moving fortress of blades and chains.', cooldown: 41 },
    board: ['Parries refresh dash', 'Momentum converts to armor', 'Harpoon creates weak points', 'Night Siege executes staggered targets']
  },
  {
    ids: ['warden', 'gravebinder'], id: 'graveguard', name: 'Graveguard', icon: '⚚', color: '#9ccbc7',
    passive: 'Ossuary Aegis', passiveText: 'Barriers preserve bone. When a ward expires, it leaves a grave pulse that curses nearby enemies.',
    signature: { name: 'Pallbearer Wall', icon: '⚚', hint: 'Raise a bone ward that shelters allies and lashes the unquiet.', cooldown: 12 },
    ultimate: { name: 'Citadel of Names', icon: '✺', hint: 'Turn the battlefield into a marching fortress of bone and oath.', cooldown: 43 },
    board: ['Wards leave cursed graves', 'Resolve feeds bone barriers', 'Scythe cleaves marked prey', 'Citadel calls a guardian procession']
  },
  {
    ids: ['thornseer', 'gravebinder'], id: 'blightweaver', name: 'Blightweaver', icon: '☠', color: '#8dbb87',
    passive: 'Rotting Testament', passiveText: 'Curses and bone rites share their duration; a cursed enemy spreads both ailments when it falls.',
    signature: { name: 'Carrion Bloom', icon: '☠', hint: 'Plant a hungry bloom that fires bone thorns through cursed prey.', cooldown: 11 },
    ultimate: { name: 'Funeral Garden', icon: '☾', hint: 'Raise an entire field of blooms, graves, and hunting spirits.', cooldown: 42 },
    board: ['Curses split on death', 'Blooms feed on graves', 'Bone Comet seeds thorns', 'Funeral Garden consumes elites']
  },
  {
    ids: ['ironbound', 'gravebinder'], id: 'ossuary', name: 'Ossuary', icon: '▣', color: '#c6baa2',
    passive: 'Marrow Plate', passiveText: 'Staggering a foe sheds armor fragments that orbit you, then burst on your next heavy hit.',
    signature: { name: 'Cairn Procession', icon: '▣', hint: 'Drive a line of bone bulwarks through enemy formations.', cooldown: 12 },
    ultimate: { name: 'Bone Siege', icon: '✺', hint: 'Call a rolling ossuary that crushes and curses everything in its path.', cooldown: 45 },
    board: ['Stagger feeds armor fragments', 'Harpoon pins cursed prey', 'Bulwark gains marrow thorns', 'Bone Siege follows the covenant']
  },
  {
    ids: ['veilrunner', 'gravebinder'], id: 'wraithblade', name: 'Wraithblade', icon: '†', color: '#9fa8ef',
    passive: 'Stolen Breath', passiveText: 'Dodging through cursed prey creates a wraith that repeats your next damaging technique.',
    signature: { name: 'Mourning Cut', icon: '†', hint: 'Blink through the target and leave a delayed spectral execution.', cooldown: 9 },
    ultimate: { name: 'Procession of Knives', icon: '✷', hint: 'A host of wraiths hunts every marked and cursed enemy.', cooldown: 40 },
    board: ['Wraiths inherit critical chance', 'Curses follow Rift Step', 'Executions release bone knives', 'Procession repeats on elites']
  },
  {
    ids: ['warden', 'dawnstrider'], id: 'dawn-aegis', name: 'Dawn Aegis', icon: '☼', color: '#f2d683',
    passive: 'First Watch', passiveText: 'Barriers catch the sunrise: blocking damage fires a radiant javelin at the nearest marked foe.',
    signature: { name: 'Sunward', icon: '☼', hint: 'Plant a radiant bulwark that burns enemies and hardens your guard.', cooldown: 11 },
    ultimate: { name: 'Last Sunrise', icon: '✺', hint: 'Call a shielded dawn that grants the covenant a burning safe haven.', cooldown: 42 },
    board: ['Barriers fire sun spears', 'Resolve reinforces Fervor', 'Wards expose prey', 'Last Sunrise protects the road']
  },
  {
    ids: ['thornseer', 'dawnstrider'], id: 'eclipse-chorus', name: 'Eclipse Chorus', icon: '◐', color: '#e2a9d9',
    passive: 'Twilight Canticle', passiveText: 'Marked and cursed prey takes a second pulse of damage whenever either status is refreshed.',
    signature: { name: 'Vesper Bloom', icon: '◐', hint: 'Create a lunar-solar bloom that curses, marks, and slows its victims.', cooldown: 11 },
    ultimate: { name: 'Crown of Eclipse', icon: '☾', hint: 'Cover the arena in a moving eclipse of thorns and sunfire.', cooldown: 41 },
    board: ['Marks ignite curses', 'Blooms gain radiant reach', 'Javelins split through hexes', 'Eclipse repeats its final pulse']
  },
  {
    ids: ['ironbound', 'dawnstrider'], id: 'sunforge', name: 'Sunforge', icon: '⬡', color: '#efb861',
    passive: 'Heated Iron', passiveText: 'Spending Guard or Fervor heats your armor; at full heat, your next dash releases a solar shockwave.',
    signature: { name: 'Anvilflare', icon: '⬡', hint: 'Slam a radiant anvil into the ground and scatter armor-shattering sparks.', cooldown: 12 },
    ultimate: { name: 'Noon Siege', icon: '✺', hint: 'March beneath a moving forge that burns foes and refuses to break.', cooldown: 44 },
    board: ['Heat grants stagger', 'Javelins anchor to harpoons', 'Bulwark catches sunfire', 'Noon Siege restores Guard']
  },
  {
    ids: ['veilrunner', 'dawnstrider'], id: 'gilded-shade', name: 'Gilded Shade', icon: '✷', color: '#f3c98c',
    passive: 'Reflected Noon', passiveText: 'Critical hits leave a flash-step echo that repeats your last projectile at reduced power.',
    signature: { name: 'Goldleaf Step', icon: '✷', hint: 'Dash to a target, fan out radiant knives, and leave a blinding flare.', cooldown: 9 },
    ultimate: { name: 'Road of Glass', icon: '✺', hint: 'Dance through the field as every step calls a volley of sun-knives.', cooldown: 39 },
    board: ['Crits repeat javelins', 'Dodge marks prey', 'Shades inherit Fervor', 'Road of Glass pierces armor']
  },
  {
    ids: ['gravebinder', 'dawnstrider'], id: 'requiem', name: 'Requiem', icon: '♮', color: '#d5d7a0',
    passive: 'Merciful Toll', passiveText: 'A marked enemy that dies while cursed releases a soul hymn that heals you and damages nearby foes.',
    signature: { name: 'Litany of Ash', icon: '♮', hint: 'Create a consecrated grave that draws souls into a radiant explosion.', cooldown: 11 },
    ultimate: { name: 'Choir of the Unrung', icon: '✺', hint: 'Summon a cathedral-wide requiem of gravefire, souls, and judgment.', cooldown: 43 },
    board: ['Soul hymns heal the covenant', 'Javelins curse on return', 'Graves become consecrated', 'The Choir revives a fallen ward']
  }
];

export const pairKey = (first, second) => [first, second].sort().join('|');
export const HYBRIDS = Object.fromEntries(HYBRID_LIST.map((hybrid) => [pairKey(...hybrid.ids), hybrid]));
export const getClass = (id) => CLASSES[id];
export const getHybrid = (first, second) => HYBRIDS[pairKey(first, second)] ?? null;
export const allHybridPairs = () => HYBRID_LIST.slice();
export const classMixStats = (primary, secondary) => {
  const a = getClass(primary).stats;
  const b = getClass(secondary).stats;
  return {
    hp: Math.round(a.hp + b.hp * 0.22),
    power: Math.round(a.power + b.power * 0.18),
    armor: Math.round(a.armor + b.armor * 0.22),
    speed: Math.round(a.speed + b.speed * 0.12),
    crit: clamp(a.crit + b.crit * 0.18, 0, 0.55),
    critMult: a.critMult + (b.critMult - 1.5) * 0.15,
    resource: Math.round(a.resource + b.resource * 0.18),
    potions: a.potions
  };
};
