// Ashen Covenant 2.0 systemic-overhaul data.  These definitions deliberately
// describe interactions and decisions rather than another set of isolated
// counters.  The runtime consumes them through one save-safe `reforged` state.

export const SYSTEM_DEPTH_AUDIT = [
  { id: 'combat', name: 'Combat reactions', before: 2, target: 5, overhaul: 'Six readable status reactions with enemy immunity windows, build scaling, and tactical counters.' },
  { id: 'hybrids', name: 'Hybrid identity', before: 2, target: 5, overhaul: 'Three mutation tiers and nine choices for every one of the fifteen dual-class hybrids.' },
  { id: 'mastery', name: 'Ability mastery', before: 2, target: 5, overhaul: 'Six five-rank evolution trees with mutually exclusive doctrines and mechanical capstones.' },
  { id: 'relics', name: 'Relic bonds', before: 1, target: 5, overhaul: 'Slot-specific Memory choices at every Bond rank instead of one automatic percentage bonus.' },
  { id: 'forge', name: 'Forge and economy', before: 2, target: 5, overhaul: 'Four artisan disciplines, deterministic techniques, blueprints, locked affixes, and material conversion.' },
  { id: 'factions', name: 'Factions', before: 1, target: 5, overhaul: 'Doctrines, repeatable directives, Favor shops, a single pledge, and world-facing faction effects.' },
  { id: 'world', name: 'Living world', before: 2, target: 5, overhaul: 'Regional threat, control, momentum, chain outcomes, secrets, and consequences for ignored pressure.' },
  { id: 'strongholds', name: 'Strongholds', before: 1, target: 5, overhaul: 'Three-tier reconstruction projects, stability, recurring defenses, and regional services.' },
  { id: 'events', name: 'World events', before: 1, target: 5, overhaul: 'Five three-stage regional arcs with branching finales and persistent outcomes.' },
  { id: 'delves', name: 'Delves', before: 1, target: 5, overhaul: 'Route drafts between encounters, boons, banes, reward heat, room roles, and expedition mastery.' },
  { id: 'difficulty', name: 'Difficulty', before: 1, target: 5, overhaul: 'Five World Oaths that change density, elite composition, hazards, recovery, and reward quality.' },
  { id: 'endgame', name: 'Endgame', before: 2, target: 5, overhaul: 'A routed Eclipse Web, activity seals, escalation, pinnacle keys, and two new pinnacle operations.' },
  { id: 'paragon', name: 'Paragon payoff', before: 2, target: 5, overhaul: 'Sixteen board constellations that reward deliberate routes with behavior-changing effects.' },
  { id: 'bestiary', name: 'Bestiary and bosses', before: 1, target: 5, overhaul: 'Role research, chosen counters, boss dossiers, break rewards, and visible mastery.' },
  { id: 'nemesis', name: 'Nemesis', before: 1, target: 5, overhaul: 'Adapting rivals with traits, grudges, scars, victories, vendetta rewards, and targeted hunts.' },
  { id: 'campaign', name: 'Campaign consequence', before: 2, target: 5, overhaul: 'A persistent Decree after every chapter that changes combat, factions, economy, or world recovery.' }
];

export const WORLD_OATHS = [
  { id: 'pilgrim', name: 'Pilgrim', icon: 'I', minLevel: 1, summary: 'Story-forward pressure with forgiving recovery.', enemyHp: 0, enemyDamage: 0, enemySpeed: 0, eliteChance: 0, density: 0, affixCount: 0, reward: 1, threatGain: 0.75 },
  { id: 'veteran', name: 'Veteran', icon: 'II', minLevel: 20, summary: 'Larger formations, faster supports, and better material drops.', enemyHp: 0.24, enemyDamage: 0.12, enemySpeed: 0.04, eliteChance: 0.06, density: 1, affixCount: 1, reward: 1.28, threatGain: 1 },
  { id: 'torment', name: 'Torment', icon: 'III', minLevel: 50, summary: 'Elite pairs, denser hazards, and reduced free recovery.', enemyHp: 0.58, enemyDamage: 0.28, enemySpeed: 0.08, eliteChance: 0.12, density: 2, affixCount: 2, reward: 1.62, threatGain: 1.25 },
  { id: 'nightmare', name: 'Nightmare', icon: 'IV', minLevel: 75, summary: 'Coordinated apex packs, double-affix elites, and aggressive regional threat.', enemyHp: 0.98, enemyDamage: 0.46, enemySpeed: 0.13, eliteChance: 0.2, density: 3, affixCount: 2, reward: 2.05, threatGain: 1.55 },
  { id: 'worldfall', name: 'Worldfall', icon: 'V', minLevel: 100, summary: 'Pinnacle rules: relentless packs, triple-affix champions, and maximum reward heat.', enemyHp: 1.55, enemyDamage: 0.7, enemySpeed: 0.18, eliteChance: 0.3, density: 4, affixCount: 3, reward: 2.75, threatGain: 1.9 }
];

export const worldOathById = (id) => WORLD_OATHS.find((entry) => entry.id === id) ?? WORLD_OATHS[0];

export const COMBAT_REACTIONS = [
  { id: 'gravebrand', name: 'Gravebrand', icon: '✦', color: '#b08bd9', cooldown: 2.6, description: 'Strike prey that is both Marked and Cursed to erupt a seeking grave pulse.', trigger: 'marked-cursed' },
  { id: 'bellbreak', name: 'Bellbreak', icon: '⬡', color: '#e2c277', cooldown: 3.1, description: 'A heavy hit against staggered prey strips armor and extends the execution window.', trigger: 'heavy-stagger' },
  { id: 'ward-reversal', name: 'Ward Reversal', icon: '◇', color: '#84d5c7', cooldown: 3.8, description: 'After Barrier absorbs damage, a Hybrid strike releases the stored force.', trigger: 'ward-hybrid' },
  { id: 'sunless-current', name: 'Sunless Current', icon: '◐', color: '#e4bd86', cooldown: 2.8, description: 'Projectile damage against Cursed prey chains toward a Marked target.', trigger: 'projectile-cursed' },
  { id: 'red-harvest', name: 'Red Harvest', icon: '†', color: '#d66f79', cooldown: 4.2, description: 'Execute controlled prey to heal and seed a damaging blood wake.', trigger: 'execution-control' },
  { id: 'concordant-echo', name: 'Concordant Echo', icon: '↻', color: '#9abde7', cooldown: 5.2, description: 'Alternating primary and Companion techniques echoes the second hit.', trigger: 'oath-alternation' }
];

const hybridFlavor = {
  'briar-oath': ['Verdant Sentence', 'Thorn-Shelter', 'Moonroot Cadence'],
  'cairn-covenant': ['Siegebreaker Oath', 'Walking Bastion', 'Stonebeat Cadence'],
  riftchain: ['Knife Horizon', 'Shadeguard', 'Chain Reprise'],
  'blood-bastion': ['Red Citadel', 'Hemlock Shelter', 'Sanguine Engine'],
  nightbloom: ['Eclipse Thorn', 'Moonpetal Shroud', 'Seed Reprise'],
  'black-rampart': ['Gallows Momentum', 'Moving Fortress', 'Countermarch'],
  graveguard: ['Pallbearer Verdict', 'Ossuary Shelter', 'Procession Cadence'],
  blightweaver: ['Carrion Testament', 'Rotting Garden', 'Gravetide Reprise'],
  ossuary: ['Marrow Siege', 'Cairn of Names', 'Bonewheel Cadence'],
  wraithblade: ['Mourning Sentence', 'Breathless Shroud', 'Spectral Reprise'],
  'dawn-aegis': ['Last Sunrise', 'Sunward Shelter', 'First-Watch Cadence'],
  'eclipse-chorus': ['Crown of Twilight', 'Vesper Sanctuary', 'Canticle Reprise'],
  sunforge: ['Noon Anvil', 'Forge-Shelter', 'Heated Cadence'],
  'gilded-shade': ['Glass Horizon', 'Golden Afterimage', 'Flashstep Reprise'],
  requiem: ['Unrung Judgment', 'Merciful Grave', 'Soul-Hymn Cadence']
};

const mutationTier = (hybridId, tier, level, names) => ({
  id: `${hybridId}:mutation-${tier}`,
  tier,
  level,
  name: ['First Mutation', 'Deep Mutation', 'Sovereign Mutation'][tier - 1],
  choices: [
    { id: `${hybridId}:ruin-${tier}`, name: names[0], icon: '✺', path: 'ruin', description: tier === 1 ? '+10% Hybrid damage; Hybrid hits build Reaction pressure.' : tier === 2 ? 'Reactions caused by Hybrid abilities gain area and armor pierce.' : 'Confluence triggers a second, reduced Hybrid aftermath.', modifiers: { hybridDamage: 0.07 + tier * 0.03, reactionPower: 0.06 * tier }, special: tier === 3 ? 'hybrid-cataclysm' : null },
    { id: `${hybridId}:aegis-${tier}`, name: names[1], icon: '⬡', path: 'aegis', description: tier === 1 ? '+12% Barrier; Hybrid casts grant a short ward.' : tier === 2 ? 'Ward Reversal stores more force and removes one hostile field.' : 'Confluence becomes a moving sanctuary and grants Unstoppable briefly.', modifiers: { ward: 0.08 + tier * 0.04, wardDamageReduction: 0.02 * tier }, special: tier === 3 ? 'hybrid-sanctuary' : null },
    { id: `${hybridId}:cadence-${tier}`, name: names[2], icon: '↻', path: 'cadence', description: tier === 1 ? '+8% Resonance and Companion damage.' : tier === 2 ? 'Alternating oaths shortens Hybrid cooldown and empowers Concordant Echo.' : 'Every third alternation repeats the Companion Technique at reduced power.', modifiers: { resonanceGain: 0.05 + tier * 0.03, companionDamage: 0.04 + tier * 0.03, cooldown: 0.015 * tier }, special: tier === 3 ? 'hybrid-reprise' : null }
  ]
});

export const HYBRID_MUTATIONS = Object.fromEntries(Object.entries(hybridFlavor).map(([hybridId, names]) => [hybridId, [
  mutationTier(hybridId, 1, 20, names), mutationTier(hybridId, 2, 45, names), mutationTier(hybridId, 3, 75, names)
]]));

export const hybridMutationById = (hybridId, choiceId) => HYBRID_MUTATIONS[hybridId]?.flatMap((tier) => tier.choices).find((choice) => choice.id === choiceId) ?? null;

const evolution = (id, name, icon, summary, perRank, milestone) => ({ id, name, icon, summary, maxRank: 5, perRank, milestone });

export const MASTERY_EVOLUTIONS = {
  attack: [
    evolution('relentless-form', 'Relentless Form', '↻', 'Basic attacks accelerate and reward uninterrupted strings.', { attackDamage: 0.025, resourceGain: 0.02 }, { rank: 5, name: 'Perfect String', special: 'attack-perfect-string' }),
    evolution('breaker-form', 'Breaker Form', '⬡', 'Direct blows build far more stagger and crack armor.', { staggerScale: 0.04, eliteDamage: 0.018 }, { rank: 5, name: 'Faultline', special: 'attack-faultline' }),
    evolution('reaper-form', 'Reaper Form', '†', 'Basic attacks widen execution windows and finish controlled prey.', { markedDamage: 0.025, executeThreshold: 0.008 }, { rank: 5, name: 'Final Measure', special: 'attack-final-measure' })
  ],
  skillOne: [
    evolution('piercing-script', 'Piercing Script', '↠', 'Projectiles and lines gain force, pierce, and boss pressure.', { projectileDamage: 0.035, bossDamage: 0.012 }, { rank: 5, name: 'Through the World', special: 'skill-one-pierce' }),
    evolution('forked-script', 'Forked Script', '⌁', 'Skill One branches into secondary targets and wider reactions.', { projectileFork: 0.018, area: 0.018 }, { rank: 5, name: 'Many Roads', special: 'skill-one-fork' }),
    evolution('sunder-script', 'Sunder Script', '◆', 'Skill One marks weaknesses and strips elite defenses.', { markedDamage: 0.025, eliteDamage: 0.018 }, { rank: 5, name: 'Open the Guard', special: 'skill-one-sunder' })
  ],
  skillTwo: [
    evolution('sanctuary-field', 'Sanctuary Field', '◇', 'Fields protect, follow longer, and strengthen Barrier.', { ward: 0.035, wardDamageReduction: 0.008 }, { rank: 5, name: 'Living Sanctuary', special: 'skill-two-sanctuary' }),
    evolution('devouring-field', 'Devouring Field', '◌', 'Fields gain damage, pull, and reaction power.', { area: 0.025, reactionPower: 0.025 }, { rank: 5, name: 'No Safe Ground', special: 'skill-two-devour' }),
    evolution('renewal-field', 'Renewal Field', '✚', 'Field ticks restore resources and reward standing your ground.', { resourceGain: 0.035, cooldown: 0.012 }, { rank: 5, name: 'Second Breath', special: 'skill-two-renewal' })
  ],
  companion: [
    evolution('answering-voice', 'Answering Voice', '↻', 'Companion Techniques echo and accelerate oath alternation.', { companionDamage: 0.035, resonanceGain: 0.03 }, { rank: 5, name: 'Answer Twice', special: 'companion-echo' }),
    evolution('guardian-voice', 'Guardian Voice', '⬡', 'The second oath grants Barrier and interrupts attackers.', { ward: 0.03, staggerScale: 0.025 }, { rank: 5, name: 'Intercession', special: 'companion-guard' }),
    evolution('sovereign-voice', 'Sovereign Voice', '♬', 'Companion Techniques become major damage and Confluence tools.', { companionDamage: 0.05, confluenceDamage: 0.025 }, { rank: 5, name: 'Third Voice', special: 'companion-sovereign' })
  ],
  hybrid: [
    evolution('hybrid-ruin', 'Pact of Ruin', '✺', 'Signatures detonate statuses and push elite damage.', { hybridDamage: 0.04, reactionPower: 0.03 }, { rank: 5, name: 'Covenant Cataclysm', special: 'signature-cataclysm' }),
    evolution('hybrid-aegis', 'Pact of Aegis', '⬡', 'Signatures generate wards and convert offense into protection.', { ward: 0.04, hybridDamage: 0.018 }, { rank: 5, name: 'Covenant Shelter', special: 'signature-shelter' }),
    evolution('hybrid-cadence', 'Pact of Cadence', '⌁', 'Signatures cycle faster through deliberate oath alternation.', { cooldown: 0.018, resonanceGain: 0.025 }, { rank: 5, name: 'Covenant Reprise', special: 'signature-reprise' })
  ],
  ultimate: [
    evolution('apex-ruin', 'Apex Ruin', '△', 'Ultimates become concentrated boss-killing events.', { ultimateDamage: 0.05, bossDamage: 0.025 }, { rank: 5, name: 'Final Weapon', special: 'ultimate-ruin' }),
    evolution('apex-domain', 'Apex Domain', '◎', 'Ultimates last longer, cover more ground, and shape the arena.', { ultimateDamage: 0.03, area: 0.035 }, { rank: 5, name: 'World Domain', special: 'ultimate-domain' }),
    evolution('apex-mercy', 'Apex Mercy', '✚', 'Ultimates restore the covenant and reset its rotation.', { cooldown: 0.018, ward: 0.03 }, { rank: 5, name: 'Refuse the Bell', special: 'ultimate-mercy' })
  ]
};

export const masteryEvolutionById = (slot, id) => MASTERY_EVOLUTIONS[slot]?.find((entry) => entry.id === id) ?? null;

export const RELIC_MEMORIES = {
  weapon: [
    { id: 'weapon-hunger', name: 'Hunger', icon: '†', description: 'Kills feed escalating power until you take damage.', modifiers: { attackDamage: 0.05 }, special: 'relic-hunger' },
    { id: 'weapon-echo', name: 'Echo', icon: '↻', description: 'Direct attacks can repeat at reduced force.', modifiers: { echoStrike: 0.06 }, special: 'relic-echo' },
    { id: 'weapon-verdict', name: 'Verdict', icon: '✺', description: 'Hybrid and Ultimate damage rises against bosses.', modifiers: { hybridDamage: 0.06, bossDamage: 0.05 }, special: 'relic-verdict' }
  ],
  offhand: [
    { id: 'offhand-choir', name: 'Choir', icon: '♬', description: 'Companion Techniques build more Resonance.', modifiers: { companionDamage: 0.06, resonanceGain: 0.06 } },
    { id: 'offhand-ward', name: 'Watch', icon: '◇', description: 'Companion casts grant a small Barrier.', modifiers: { ward: 0.06 }, special: 'relic-watch' },
    { id: 'offhand-fork', name: 'Many Hands', icon: '⌁', description: 'Projectiles gain fork chance.', modifiers: { projectileFork: 0.05 } }
  ],
  head: [
    { id: 'head-clarity', name: 'Clarity', icon: '☉', description: 'Cooldowns recover faster after a Reaction.', modifiers: { cooldown: 0.035 }, special: 'relic-clarity' },
    { id: 'head-hunt', name: 'Hunt', icon: '†', description: 'Elites are easier to execute.', modifiers: { eliteDamage: 0.05, executeThreshold: 0.025 } },
    { id: 'head-archive', name: 'Archive', icon: '◆', description: 'Bestiary and mastery progress faster.', modifiers: { masteryGain: 0.08 }, special: 'relic-archive' }
  ],
  chest: [
    { id: 'chest-bastion', name: 'Bastion', icon: '⬡', description: 'Maximum health, armor, and Barrier rise together.', modifiers: { hpScale: 0.045, armorScale: 0.045, ward: 0.05 } },
    { id: 'chest-reprisal', name: 'Reprisal', icon: '✦', description: 'Barrier absorption empowers Ward Reversal.', modifiers: { reactionPower: 0.07 }, special: 'relic-reprisal' },
    { id: 'chest-second-breath', name: 'Second Breath', icon: '✚', description: 'Potions briefly grant Unstoppable.', modifiers: { potionReduction: 0.04 }, special: 'relic-second-breath' }
  ],
  gloves: [
    { id: 'gloves-cadence', name: 'Cadence', icon: '↻', description: 'Attack strings gain critical chance.', modifiers: { crit: 0.025, attackDamage: 0.04 } },
    { id: 'gloves-breaker', name: 'Breaker', icon: '⬡', description: 'Heavy hits deal more stagger.', modifiers: { staggerScale: 0.08 } },
    { id: 'gloves-ritual', name: 'Ritual Hand', icon: '◌', description: 'Area and field effects become larger.', modifiers: { area: 0.07 } }
  ],
  boots: [
    { id: 'boots-rift', name: 'Riftstep', icon: '⇢', description: 'Dashes leave a damaging wake.', modifiers: { dashNova: 0.06, dashDamageScale: 0.06 } },
    { id: 'boots-pursuit', name: 'Pursuit', icon: '➶', description: 'Movement and marked-prey damage rise.', modifiers: { speed: 0.035, markedDamage: 0.04 } },
    { id: 'boots-anchor', name: 'Anchor', icon: '⬡', description: 'Standing in a friendly field grants armor.', modifiers: { armorScale: 0.055 }, special: 'relic-anchor' }
  ],
  amulet: [
    { id: 'amulet-confluence', name: 'Confluence', icon: '✹', description: 'Confluence gains damage and surge chance.', modifiers: { confluenceDamage: 0.07, confluenceSurge: 0.035 } },
    { id: 'amulet-domain', name: 'Domain', icon: '◎', description: 'Hybrid and Ultimate areas grow.', modifiers: { area: 0.06, ultimateDamage: 0.04 } },
    { id: 'amulet-oath', name: 'Twin Oath', icon: '♬', description: 'Companion and Hybrid damage rise together.', modifiers: { companionDamage: 0.05, hybridDamage: 0.05 } }
  ],
  ring: [
    { id: 'ring-fate', name: 'Fate', icon: '◆', description: 'Behavior-changing Fated affixes trigger more often.', modifiers: { fatedAmplifier: 0.035 } },
    { id: 'ring-harvest', name: 'Harvest', icon: '†', description: 'Executions heal and chain more often.', modifiers: { executionHeal: 0.025, executionCascade: 0.035 } },
    { id: 'ring-providence', name: 'Providence', icon: '✦', description: 'Loot and gold rewards improve.', modifiers: { lootFind: 0.04, goldFind: 0.06 } }
  ]
};

export const relicMemoryById = (slot, id) => RELIC_MEMORIES[slot]?.find((entry) => entry.id === id) ?? null;

export const FORGE_DISCIPLINES = [
  { id: 'smithing', name: 'Cairn Smithing', icon: '⬡', color: '#b9c6ca', summary: 'Item bases, Tempering, affix locks, and Masterwork correction.', source: ['temper', 'masterwork', 'reforge'], techniques: [
    { rank: 2, id: 'lock-affix', name: 'Oath Lock', description: 'Lock one affix before reforging it; the other affixes cannot move.' },
    { rank: 5, id: 'guided-temper', name: 'Guided Temper', description: 'Choose offense, defense, or utility for the next Temper.' },
    { rank: 8, id: 'recenter-exalt', name: 'Recenter Exalt', description: 'Move the latest Masterwork exalt to the focused affix.' },
    { rank: 10, id: 'perfect-base', name: 'Perfect Base', description: 'Raise a non-Unique item to exquisite quality.' }
  ] },
  { id: 'runecraft', name: 'Unrung Runecraft', icon: '♬', color: '#e0c07a', summary: 'Sockets, rune synthesis, and Resonance inscriptions.', source: ['socket', 'rune', 'extract'], techniques: [
    { rank: 2, id: 'rune-synthesis', name: 'Rune Synthesis', description: 'Fuse three matching runes into an empowered inscription.' },
    { rank: 5, id: 'resonant-socket', name: 'Resonant Socket', description: 'Open a socket without consuming a Prism once per item.' },
    { rank: 8, id: 'echo-rune', name: 'Echo Rune', description: 'Duplicate one socketed rune at reduced force.' },
    { rank: 10, id: 'living-script', name: 'Living Script', description: 'Rune effects grow with Relic Bond rank.' }
  ] },
  { id: 'occult', name: 'Veiled Occultism', icon: '☾', color: '#aa91de', summary: 'Corruption, Fated affixes, Aspect control, and dangerous bargains.', source: ['corrupt', 'infuse', 'aspect'], techniques: [
    { rank: 2, id: 'purify', name: 'Purification', description: 'Remove corruption while preserving the item.' },
    { rank: 5, id: 'fated-choice', name: 'Fated Choice', description: 'Choose one of two behavior-changing affix families.' },
    { rank: 8, id: 'aspect-weave', name: 'Aspect Weave', description: 'Attuned Aspects gain a portion of their source item quality.' },
    { rank: 10, id: 'mythic-bargain', name: 'Mythic Bargain', description: 'Corrupt a Relic into a Mythic candidate with a real failure cost.' }
  ] },
  { id: 'reclamation', name: 'Accord Reclamation', icon: '✦', color: '#91d8c6', summary: 'Salvage efficiency, blueprints, conversions, and target crafting.', source: ['salvage', 'craft', 'contract'], techniques: [
    { rank: 2, id: 'careful-salvage', name: 'Careful Salvage', description: 'Locked items stay protected; salvaged Relics can reveal blueprints.' },
    { rank: 5, id: 'material-exchange', name: 'Material Exchange', description: 'Convert common materials into the exact resource a recipe needs.' },
    { rank: 8, id: 'source-blueprint', name: 'Source Blueprint', description: 'Craft a chosen item base from a mastered loot source.' },
    { rank: 10, id: 'heirloom', name: 'Heirloom Craft', description: 'Create one account-defining exquisite Relic per source.' }
  ] }
];

export const forgeDisciplineById = (id) => FORGE_DISCIPLINES.find((entry) => entry.id === id) ?? null;
export const FORGE_RANK_XP = [0, 20, 55, 105, 175, 270, 390, 540, 725, 950, 1220];

const doctrine = (id, name, icon, description, modifiers = {}, special = null) => ({ id, name, icon, description, modifiers, special });

export const FACTION_DOCTRINES = {
  'ashen-accord': [
    doctrine('accord-pathfinder', 'Pathfinder Corps', '⌖', 'Waypoints heal and regional discoveries reduce threat.', { speed: 0.025 }, 'faction-pathfinder'),
    doctrine('accord-quartermaster', 'Quartermaster Compact', '◆', 'Contract and salvage rewards gain extra materials.', { lootFind: 0.035 }, 'faction-quartermaster'),
    doctrine('accord-lantern', 'Lantern Guard', '◇', 'Entering a new district grants a temporary ward.', { ward: 0.055 }, 'faction-lantern')
  ],
  mirebound: [
    doctrine('mire-bloodroot', 'Bloodroot Rite', '✹', 'Cursed kills feed healing and event momentum.', { lifeOnKill: 0.006, markedDamage: 0.035 }, 'faction-bloodroot'),
    doctrine('mire-drowned', 'Drowned Patience', '≋', 'Fields last longer and slow more strongly.', { area: 0.055 }, 'faction-drowned'),
    doctrine('mire-herbalist', 'Scarlet Herbalism', '✚', 'Potions gain a brief regeneration tail.', { potionReduction: 0.035 }, 'faction-herbalist')
  ],
  'cairn-compact': [
    doctrine('cairn-wall', 'Last Wall', '⬡', 'Strongholds and Barrier grant more armor.', { armorScale: 0.055, ward: 0.035 }, 'faction-wall'),
    doctrine('cairn-siege', 'Siege Doctrine', '⚔', 'Stagger and boss damage rise in operations.', { staggerScale: 0.075, bossDamage: 0.035 }, 'faction-siege'),
    doctrine('cairn-forge', 'Foundry Compact', '◆', 'Tempering and Masterworking earn more artisan experience.', {}, 'faction-foundry')
  ],
  'veil-couriers': [
    doctrine('veil-route', 'Impossible Route', '☾', 'Dashes recover faster after Reactions.', { cooldown: 0.025, dashDamageScale: 0.05 }, 'faction-route'),
    doctrine('veil-cache', 'Hidden Cache', '◆', 'Delve route choices reveal a fourth option.', { lootFind: 0.03 }, 'faction-cache'),
    doctrine('veil-mirror', 'Mirror Dispatch', '◇', 'Companion Techniques can repeat a projectile.', { companionDamage: 0.045 }, 'faction-mirror')
  ],
  'unrung-choir': [
    doctrine('choir-harmony', 'Free Harmony', '♬', 'Resonance and Confluence gain accelerate.', { resonanceGain: 0.06, confluenceDamage: 0.045 }, 'faction-harmony'),
    doctrine('choir-silence', 'Weaponized Silence', '♮', 'Boss telegraphs last longer; punished attacks take extra damage.', { bossDamage: 0.045 }, 'faction-silence'),
    doctrine('choir-names', 'Keeper of Names', '☉', 'Relic Bonds and Bestiary insight grow faster.', { masteryGain: 0.055 }, 'faction-names')
  ]
};

export const factionDoctrineById = (factionId, id) => FACTION_DOCTRINES[factionId]?.find((entry) => entry.id === id) ?? null;

export const FACTION_OFFERS = [
  { id: 'road-cache', name: 'Road Cache', factionId: 'ashen-accord', cost: 4, description: 'A region-scaled Rare or Relic plus common materials.', reward: 'item' },
  { id: 'bloodroot-tonic', name: 'Bloodroot Tonic', factionId: 'mirebound', cost: 6, description: 'Refill potions and gain two Prisms.', reward: 'potion' },
  { id: 'tempering-crate', name: 'Tempering Crate', factionId: 'cairn-compact', cost: 7, description: 'Six Alloys and a chance at an Apex Core.', reward: 'alloys' },
  { id: 'courier-key', name: 'Courier Key', factionId: 'veil-couriers', cost: 8, description: 'One Expedition Key and three Oath Echoes.', reward: 'key' },
  { id: 'choir-reliquary', name: 'Choir Reliquary', factionId: 'unrung-choir', cost: 10, description: 'A guaranteed Relic with accelerated Bond growth.', reward: 'relic' }
];

export const STRONGHOLD_PROJECTS = [
  { id: 'watchtower', name: 'Watchtower', icon: '⌖', maxRank: 3, costs: [4, 9, 16], description: 'Lowers regional threat, reveals events, and improves defense preparation.', modifiers: { eliteDamage: 0.012 } },
  { id: 'forgeworks', name: 'Forgeworks', icon: '⬡', maxRank: 3, costs: [5, 10, 18], description: 'Improves regional salvage, Tempering, and material yields.', modifiers: { lootFind: 0.012 } },
  { id: 'wardhouse', name: 'Wardhouse', icon: '◇', maxRank: 3, costs: [4, 9, 16], description: 'Creates safe recovery, stronger waypoints, and defensive event boons.', modifiers: { ward: 0.015 } }
];

const eventArc = (zoneId, id, name, icon, stages, endings) => ({ zoneId, id, name, icon, stages, endings });

export const EVENT_ARCS = [
  eventArc('gravewake', 'unburied-procession', 'The Unburied Procession', '†', [
    ['Count the Nameless', 'Defeat grave-marked scouts and recover their tally.'],
    ['Break the Bell Cart', 'Destroy the escort before it reaches Widow’s Mile.'],
    ['Judge the Procession', 'Choose whether the dead are released or enlisted.']
  ], [
    { id: 'release', name: 'Release the Nameless', description: 'Lower threat sharply and strengthen healing at Gravewake waypoints.', modifiers: { lifeOnKill: 0.004 }, special: 'gravewake-release' },
    { id: 'enlist', name: 'Enlist the Procession', description: 'World events gain an allied grave pulse but regional threat recovers faster.', modifiers: { reactionPower: 0.045 }, special: 'gravewake-enlist' }
  ]),
  eventArc('redfen', 'rootmother-hunger', 'The Rootmother’s Hunger', '✹', [
    ['Drain the Sluice', 'Clear bloodleeches from the iron floodgates.'],
    ['Burn the Heartroots', 'Hold ritual circles while roots close around them.'],
    ['Name the Hunger', 'Preserve the old root or cut it from the fen.']
  ], [
    { id: 'preserve', name: 'Bind the Old Root', description: 'Fields and curses grow stronger; events carry denser reinforcements.', modifiers: { area: 0.035, markedDamage: 0.025 }, special: 'redfen-preserve' },
    { id: 'sever', name: 'Sever the Rootmother', description: 'Threat falls and potion resources improve in Redfen.', modifiers: { potionReduction: 0.025 }, special: 'redfen-sever' }
  ]),
  eventArc('cairnreach', 'crownless-muster', 'The Crownless Muster', '⬡', [
    ['Steal the Muster Rolls', 'Break commander formations and recover their orders.'],
    ['Sabotage the Chainworks', 'Destroy siege cohorts before the engines awaken.'],
    ['Choose the New Wall', 'Arm the Compact or turn the engines against every army.']
  ], [
    { id: 'compact', name: 'Arm the Compact', description: 'Stronghold defenses begin with allied wards and higher stability.', modifiers: { armorScale: 0.035 }, special: 'cairnreach-compact' },
    { id: 'scuttle', name: 'Scuttle the Engines', description: 'Bosses lose armor; forge yields are slightly lower.', modifiers: { bossDamage: 0.045 }, special: 'cairnreach-scuttle' }
  ]),
  eventArc('veiled-road', 'letters-unopened', 'Letters Never Opened', '☾', [
    ['Gather the Dispatches', 'Defeat rift couriers carrying impossible letters.'],
    ['Cross the False Mile', 'Survive mirrored packs while the route changes.'],
    ['Deliver or Burn', 'Choose whether the messages reach their dead recipients.']
  ], [
    { id: 'deliver', name: 'Deliver the Letters', description: 'Delve routes reveal more boon choices and waypoints restore resources.', modifiers: { cooldown: 0.025 }, special: 'veil-deliver' },
    { id: 'burn', name: 'Burn the Letters', description: 'Rift enemies drop more Echoes and become more aggressive.', modifiers: { lootFind: 0.035 }, special: 'veil-burn' }
  ]),
  eventArc('bellscar', 'last-free-name', 'The Last Free Name', '♬', [
    ['Find the Missing Note', 'Hunt cantors who carry a stolen name.'],
    ['Silence the Counter-Choir', 'Break three coordinated Bellscar formations.'],
    ['Speak or Guard', 'Give the name a voice or hide it beyond the bell.']
  ], [
    { id: 'speak', name: 'Let the Name Speak', description: 'Confluence and boss rewards improve; Bellscar events escalate faster.', modifiers: { confluenceDamage: 0.04 }, special: 'bellscar-speak' },
    { id: 'guard', name: 'Guard the Name', description: 'Barriers resist boss attacks and Bellscar threat falls.', modifiers: { wardDamageReduction: 0.035 }, special: 'bellscar-guard' }
  ])
];

export const eventArcByZone = (zoneId) => EVENT_ARCS.find((entry) => entry.zoneId === zoneId) ?? null;

export const EXPEDITION_BOONS = [
  { id: 'hunter-route', name: 'Hunter’s Route', icon: '†', description: '+18% elite and boss damage; the next room adds an elite.', modifiers: { eliteDamage: 0.18, bossDamage: 0.12 }, heat: 1 },
  { id: 'warded-route', name: 'Warded Route', icon: '◇', description: '+24% Barrier and a ward at the start of every room.', modifiers: { ward: 0.24 }, special: 'expedition-start-ward', heat: 0 },
  { id: 'echo-route', name: 'Echo Route', icon: '↻', description: 'Attacks and Companion Techniques echo more often.', modifiers: { echoStrike: 0.1, companionDamage: 0.12 }, heat: 1 },
  { id: 'blood-route', name: 'Blood Route', icon: '✚', description: 'Executions heal, but potion use adds reward heat.', modifiers: { executionHeal: 0.05, executeThreshold: 0.04 }, special: 'expedition-blood-price', heat: 2 },
  { id: 'fated-route', name: 'Fated Route', icon: '◆', description: 'Fated effects surge and rewards improve.', modifiers: { fatedAmplifier: 0.07, lootFind: 0.08 }, heat: 2 },
  { id: 'ruin-route', name: 'Ruin Route', icon: '✺', description: '+22% Hybrid and Ultimate damage; incoming damage rises.', modifiers: { hybridDamage: 0.22, ultimateDamage: 0.22 }, bane: 'fragile', heat: 3 },
  { id: 'swift-route', name: 'Courier Route', icon: '➶', description: '+9% speed and +12% cooldown recovery.', modifiers: { speed: 0.09, cooldown: 0.12 }, heat: 1 },
  { id: 'breaker-route', name: 'Breaker Route', icon: '⬡', description: '+25% stagger and reactions strip armor.', modifiers: { staggerScale: 0.25, reactionPower: 0.12 }, heat: 2 }
];

export const EXPEDITION_BANES = [
  { id: 'fragile', name: 'Fragile Covenant', description: 'Incoming damage +20%.', enemyDamage: 0.2 },
  { id: 'swarming', name: 'Swarming Dark', description: 'Every remaining formation gains two bodies.', density: 2 },
  { id: 'armored', name: 'Iron Host', description: 'Enemies gain 12 armor.', armor: 12 },
  { id: 'hungry-depth', name: 'Hungry Depth', description: 'Enemies heal when they hit the covenant.', modifierId: 'hungry' },
  { id: 'volatile-depth', name: 'Volatile Depth', description: 'Elite deaths erupt.', modifierId: 'volatile' },
  { id: 'oathstorm-depth', name: 'Oathstorm Depth', description: 'Rift pulses cross every room.', modifierId: 'oathstorm' }
];

const eclipseNode = (id, name, icon, x, y, requires, cost, description, modifiers = {}, special = null) => ({ id, name, icon, x, y, requires, cost, description, modifiers, special });

export const ECLIPSE_WEB = [
  eclipseNode('first-shadow', 'First Shadow', '◐', 50, 92, [], 1, 'Begin the Eclipse Web. Operations gain +5% rewards.', { lootFind: 0.05 }),
  eclipseNode('war-road', 'War Road', '⚔', 28, 78, ['first-shadow'], 1, 'Arena and Siege clears award extra heat.', { eliteDamage: 0.06 }),
  eclipseNode('hidden-road', 'Hidden Road', '☾', 72, 78, ['first-shadow'], 1, 'Delves reveal one extra route choice.', { cooldown: 0.03 }, 'eclipse-hidden-route'),
  eclipseNode('red-moon', 'Red Moon', '✹', 18, 58, ['war-road'], 2, 'Reactions gain power; Redfen events escalate.', { reactionPower: 0.08 }),
  eclipseNode('iron-eclipse', 'Iron Eclipse', '⬡', 38, 58, ['war-road'], 2, 'Staggering an elite grants a temporary ward.', { staggerScale: 0.1 }, 'eclipse-iron-ward'),
  eclipseNode('mirror-eclipse', 'Mirror Eclipse', '◇', 62, 58, ['hidden-road'], 2, 'Companion Techniques can echo.', { companionDamage: 0.1, echoStrike: 0.05 }),
  eclipseNode('silent-eclipse', 'Silent Eclipse', '♮', 82, 58, ['hidden-road'], 2, 'Boss telegraphs are longer and punishment damage rises.', { bossDamage: 0.1 }, 'eclipse-silence'),
  eclipseNode('hunter-crown', 'Hunter Crown', '†', 26, 36, ['red-moon', 'iron-eclipse'], 3, 'Executions and boss hunts award more seals.', { executeThreshold: 0.06, bossDamage: 0.12 }, 'eclipse-hunter'),
  eclipseNode('choir-crown', 'Choir Crown', '♬', 74, 36, ['mirror-eclipse', 'silent-eclipse'], 3, 'Confluence surges can repeat the last Companion Technique.', { confluenceSurge: 0.08, resonanceGain: 0.1 }, 'eclipse-choir'),
  eclipseNode('worldscar', 'Worldscar', '△', 50, 22, ['hunter-crown', 'choir-crown'], 4, 'Unlock Worldscar Pinnacle and a fourth operation modifier.', { ultimateDamage: 0.14, hybridDamage: 0.14 }, 'unlock-worldscar'),
  eclipseNode('last-sanctuary', 'Last Sanctuary', '◇', 34, 6, ['worldscar'], 4, 'Pinnacle rooms begin with a powerful moving ward.', { ward: 0.16 }, 'pinnacle-sanctuary'),
  eclipseNode('final-bell', 'The Final Bell', '✺', 66, 6, ['worldscar'], 4, 'Unlock the Final Bell confrontation and Mythic pity floor.', { bossDamage: 0.18, lootFind: 0.12 }, 'unlock-final-bell')
];

export const eclipseNodeById = (id) => ECLIPSE_WEB.find((entry) => entry.id === id) ?? null;

const constellation = (boardId, id, name, icon, keys, description, modifiers = {}, special = null) => ({ boardId, id: `${boardId}:${id}`, name, icon, keys, description, modifiers, special });

export const PARAGON_CONSTELLATIONS = [
  constellation('covenant-heart', 'two-voices', 'Two Voices', '♬', ['left-rare', 'right-rare', 'socket'], 'Routing both sides of the Heart makes alternating oaths echo.', { resonanceGain: 0.08 }, 'constellation-two-voices'),
  constellation('covenant-heart', 'unbroken-center', 'Unbroken Center', '◇', ['left-bridge', 'right-bridge', 'legendary'], 'The center route grants a ward after every Confluence.', { ward: 0.08 }, 'constellation-heart-ward'),
  constellation('warpath', 'red-geometry', 'Red Geometry', '✺', ['left-rare', 'left-bridge', 'legendary'], 'Critical bursts leave a second delayed rupture.', { criticalBurst: 0.08 }, 'constellation-red-geometry'),
  constellation('warpath', 'bellbreaker', 'Bellbreaker', '⬡', ['right-rare', 'right-bridge', 'right-crown'], 'Boss staggers last longer and remove armor.', { staggerScale: 0.12, bossDamage: 0.08 }, 'constellation-bellbreaker'),
  constellation('unbroken-aegis', 'living-wall', 'Living Wall', '◇', ['left-rare', 'socket', 'legendary'], 'Barrier creation pulses and restores a small amount of health.', { wardPulse: 0.07 }, 'constellation-living-wall'),
  constellation('unbroken-aegis', 'refusal', 'Refusal', '✚', ['right-rare', 'right-bridge', 'keystone'], 'Second Wind also clears hostile hazards.', { ward: 0.08 }, 'constellation-refusal'),
  constellation('twin-oath', 'third-voice', 'Third Voice', '♬', ['left-rare', 'socket', 'legendary'], 'Companion echoes build Confluence directly.', { companionDamage: 0.12 }, 'constellation-third-voice'),
  constellation('twin-oath', 'perfect-rotation', 'Perfect Rotation', '↻', ['right-rare', 'right-bridge', 'keystone'], 'Oath alternation shortens every non-Ultimate cooldown.', { cooldown: 0.08 }, 'constellation-perfect-rotation'),
  constellation('stormstride', 'forked-horizon', 'Forked Horizon', '↠', ['left-rare', 'left-bridge', 'legendary'], 'Forked projectiles seek Marked or Cursed targets.', { projectileFork: 0.08 }, 'constellation-forked-horizon'),
  constellation('stormstride', 'never-still', 'Never Still', '➶', ['right-rare', 'right-bridge', 'keystone'], 'Dashing at full resource releases two rift wakes.', { dashNova: 0.09 }, 'constellation-never-still'),
  constellation('predator-throne', 'red-sentence', 'Red Sentence', '†', ['left-rare', 'left-bridge', 'legendary'], 'Executions cascade to a second controlled target.', { executionCascade: 0.09 }, 'constellation-red-sentence'),
  constellation('predator-throne', 'apex-stalker', 'Apex Stalker', '△', ['right-rare', 'right-bridge', 'keystone'], 'Boss phase breaks refresh the Hybrid signature.', { bossDamage: 0.12 }, 'constellation-apex-stalker'),
  constellation('relic-weaver', 'living-arsenal', 'Living Arsenal', '◆', ['left-rare', 'socket', 'legendary'], 'Bonded items gain stronger selected Memories.', { masteryGain: 0.1 }, 'constellation-living-arsenal'),
  constellation('relic-weaver', 'sovereign-chance', 'Sovereign Chance', '✦', ['right-rare', 'right-bridge', 'keystone'], 'Every third Fated trigger repeats at reduced power.', { fatedAmplifier: 0.07 }, 'constellation-sovereign-chance'),
  constellation('worldfall-dominion', 'endless-siege', 'Endless Siege', '⬡', ['left-rare', 'left-crown', 'legendary'], 'Operation room clears leave a recovery ward.', { area: 0.1, ward: 0.08 }, 'constellation-endless-siege'),
  constellation('worldfall-dominion', 'final-toll', 'Final Toll', '✺', ['right-rare', 'right-crown', 'keystone'], 'Ultimates repeat their final impact against bosses.', { ultimateDamage: 0.18 }, 'constellation-final-toll')
];

export const activeParagonConstellations = (allocated = {}) => PARAGON_CONSTELLATIONS.filter((entry) => entry.keys.every((key) => allocated[`${entry.boardId}:${key}`] === true));

export const BESTIARY_FAMILIES = [
  { id: 'melee', name: 'Ravagers', icon: '⚔', roles: ['melee'], thresholds: [0, 20, 65, 150, 300], summary: 'Fast front-line bodies that punish immobility.' },
  { id: 'bulwarks', name: 'Bulwarks', icon: '⬡', roles: ['shield', 'brute'], thresholds: [0, 18, 55, 125, 260], summary: 'Armored hosts, guards, and crushing war-beasts.' },
  { id: 'marksmen', name: 'Marksmen', icon: '↠', roles: ['ranged'], thresholds: [0, 18, 55, 125, 260], summary: 'Projectile formations and evasive ranged pressure.' },
  { id: 'ritualists', name: 'Ritualists', icon: '◌', roles: ['healer', 'summoner'], thresholds: [0, 16, 48, 110, 230], summary: 'Supports that heal, summon, or reshape the battlefield.' },
  { id: 'commanders', name: 'Commanders', icon: '♬', roles: ['commander'], thresholds: [0, 14, 42, 95, 200], summary: 'Pack leaders that create formations and morale.' },
  { id: 'hunters', name: 'Hunters', icon: '†', roles: ['assassin', 'burrower'], thresholds: [0, 18, 55, 125, 260], summary: 'Mobile predators that flank, vanish, and pounce.' },
  { id: 'disruptors', name: 'Disruptors', icon: '♮', roles: ['disruptor'], thresholds: [0, 14, 42, 95, 200], summary: 'Ward eaters and null-priests that attack resources and safety.' },
  { id: 'bosses', name: 'Apex Dossiers', icon: '△', roles: ['boss'], thresholds: [0, 3, 10, 24, 50], summary: 'Named enemies, phase breaks, and pinnacle counters.' }
];

export const BESTIARY_INSIGHTS = [
  { id: 'anatomy', name: 'Anatomy', icon: '†', description: 'Deal more damage and stagger to this family.', modifiers: { familyDamage: 0.08, familyStagger: 0.08 } },
  { id: 'survival', name: 'Survival', icon: '◇', description: 'Take less damage from this family and read telegraphs earlier.', modifiers: { familyDefense: 0.06 } },
  { id: 'harvest', name: 'Harvest', icon: '◆', description: 'This family drops more gold and crafting materials.', modifiers: { familyLoot: 0.1 } }
];

export const bestiaryFamilyForRole = (role) => BESTIARY_FAMILIES.find((family) => family.roles.includes(role)) ?? BESTIARY_FAMILIES[0];

export const CAMPAIGN_DECREES = {
  'chapter-one': [
    doctrine('open-road', 'The Open Road', '⌖', 'World discoveries and waypoints grant more experience and lower threat.', { speed: 0.02 }, 'decree-open-road'),
    doctrine('hunters-law', 'The Hunter’s Law', '†', 'Elites and Nemeses become stronger but carry better rewards.', { eliteDamage: 0.04, lootFind: 0.025 }, 'decree-hunters-law'),
    doctrine('sanctuary-first', 'Sanctuary First', '◇', 'Stronghold recovery and defensive projects improve.', { ward: 0.045 }, 'decree-sanctuary-first')
  ],
  'chapter-two': [
    doctrine('names-are-free', 'Names Are Free', '♬', 'Faction Favor and Companion mastery grow faster.', { companionDamage: 0.035, masteryGain: 0.04 }, 'decree-names-free'),
    doctrine('names-are-arms', 'Names Are Arms', '✺', 'Confluence and boss stagger improve.', { confluenceDamage: 0.05, staggerScale: 0.05 }, 'decree-names-arms'),
    doctrine('names-are-warded', 'Names Are Warded', '◇', 'Barrier and world-event recovery improve.', { wardDamageReduction: 0.025 }, 'decree-names-warded')
  ],
  'chapter-three': [
    doctrine('fen-restored', 'Restore the Fen', '✚', 'Potions, fields, and Redfen control improve.', { potionReduction: 0.025, area: 0.025 }, 'decree-fen-restored'),
    doctrine('fen-weaponized', 'Weaponize the Fen', '✹', 'Curses and Reactions gain power at higher threat.', { markedDamage: 0.04, reactionPower: 0.035 }, 'decree-fen-weaponized'),
    doctrine('fen-sealed', 'Seal the Fen', '⬡', 'Enemy density falls but crafting yields improve.', { armorScale: 0.025, lootFind: 0.02 }, 'decree-fen-sealed')
  ],
  'chapter-four': [
    doctrine('walls-for-all', 'Walls for All', '⬡', 'All stronghold projects cost less and grant more stability.', { armorScale: 0.035 }, 'decree-walls-all'),
    doctrine('march-outward', 'March Outward', '⚔', 'Operations begin with more reward heat and one extra elite.', { eliteDamage: 0.05 }, 'decree-march-outward'),
    doctrine('break-the-chains', 'Break Every Chain', '✦', 'Boss armor and hostile ward strength are reduced.', { bossDamage: 0.055 }, 'decree-break-chains')
  ],
  'chapter-five': [
    doctrine('one-road', 'One Road', '⌖', 'World Oath rewards rise and regional threat changes more slowly.', { lootFind: 0.035 }, 'decree-one-road'),
    doctrine('five-roads', 'Five Roads', '☾', 'Expeditions show more route choices and grant more mastery.', { masteryGain: 0.055 }, 'decree-five-roads'),
    doctrine('no-road', 'No Road', '△', 'Pinnacle damage and Eclipse seals improve at maximum threat.', { bossDamage: 0.06, ultimateDamage: 0.05 }, 'decree-no-road')
  ]
};

export const campaignDecreeById = (chapterId, id) => CAMPAIGN_DECREES[chapterId]?.find((entry) => entry.id === id) ?? null;

