// Item data is deliberately data-first.  The game system can use these
// definitions to roll drops, surface target farming information, and keep a
// player's collection save-safe without making the renderer depend on item
// implementation details.

export const RARITIES = [
  { id: 'common', name: 'Common', score: 1, affixes: 1, sockets: 1, color: '#bfc8cd' },
  { id: 'magic', name: 'Magic', score: 2, affixes: 2, sockets: 1, color: '#6ca7ff' },
  { id: 'rare', name: 'Rare', score: 3, affixes: 3, sockets: 1, color: '#f1c969' },
  { id: 'relic', name: 'Relic', score: 4, affixes: 4, sockets: 2, color: '#ff9b62' },
  { id: 'unique', name: 'Unique', score: 5, affixes: 4, sockets: 2, color: '#d77bff' },
  { id: 'mythic', name: 'Mythic', score: 6, affixes: 5, sockets: 3, color: '#f06fca' }
];

export const rarityById = (id) => RARITIES.find((rarity) => rarity.id === id) ?? RARITIES[0];

// Masterworking is intentionally an endgame craft rather than another early
// upgrade button.  Each stage carries a different account-wide activity gate
// and every fourth rank exalts the affix the player has focused on.
export const MASTERWORK_MAX_RANK = 12;
export const MASTERWORK_MILESTONES = [4, 8, 12];
export const MASTERWORK_STAGES = [
  { id: 'foundry', name: 'Foundry', ranks: [1, 4], level: 15, tier: 0, material: 'Tempering Alloy', detail: 'Unlock after the Bell-Broken Road; strengthen an endgame Relic.' },
  { id: 'starlit', name: 'Starlit', ranks: [5, 8], level: 21, tier: 10, material: 'Oath Echo', detail: 'Requires a Tier 10 endgame clear and begins spending Oath Echoes.' },
  { id: 'apex', name: 'Apex', ranks: [9, 12], level: 26, tier: 20, material: 'Apex Core', detail: 'Requires a Tier 20 endgame clear; rank 12 creates the final exalt.' }
];

export const ITEM_BASES = [
  { id: 'cleaver', name: 'Roadworn Cleaver', slot: 'weapon', icon: '⚔', art: 0, tags: ['martial', 'cleave'], implicit: { stat: 'power', label: 'Cleave damage', value: 3 } },
  { id: 'focus', name: 'Whispering Focus', slot: 'weapon', icon: '✧', art: 1, tags: ['arcane', 'projectile'], implicit: { stat: 'projectileDamage', label: 'Projectile force', value: 0.05, percentage: true } },
  { id: 'bell-flail', name: 'Bellscar Flail', slot: 'weapon', icon: '☉', art: 2, tags: ['martial', 'stagger'], implicit: { stat: 'stagger', label: 'Stagger force', value: 0.08, percentage: true } },
  { id: 'grave-sabre', name: 'Grave Sabre', slot: 'weapon', icon: '†', art: 3, tags: ['martial', 'precision'], implicit: { stat: 'crit', label: 'Keen edge', value: 0.018, percentage: true } },
  { id: 'cinder-mask', name: 'Cinder Mask', slot: 'head', icon: '◈', art: 4, tags: ['ward'], implicit: { stat: 'armor', label: 'Mask plating', value: 2 } },
  { id: 'thorn-circlet', name: 'Thorn Circlet', slot: 'head', icon: '✹', art: 5, tags: ['curse'], implicit: { stat: 'area', label: 'Ritual reach', value: 0.04, percentage: true } },
  { id: 'veiled-hood', name: 'Veiled Hood', slot: 'head', icon: '☾', art: 6, tags: ['shadow'], implicit: { stat: 'cooldown', label: 'Veil recovery', value: 0.018, percentage: true } },
  { id: 'iron-vow-coat', name: 'Iron Vow Coat', slot: 'chest', icon: '▣', art: 7, tags: ['ward'], implicit: { stat: 'hp', label: 'Oathbound vitality', value: 12 } },
  { id: 'cairn-plate', name: 'Cairn Plate', slot: 'chest', icon: '⬡', art: 8, tags: ['armor'], implicit: { stat: 'armor', label: 'Cairn plating', value: 4 } },
  { id: 'mourning-raiment', name: 'Mourning Raiment', slot: 'chest', icon: '♮', art: 9, tags: ['ritual'], implicit: { stat: 'barrier', label: 'Ritual ward', value: 0.04, percentage: true } },
  { id: 'tethered-gauntlets', name: 'Tethered Gauntlets', slot: 'gloves', icon: '⌘', art: 10, tags: ['martial'], implicit: { stat: 'attackDamage', label: 'Strike force', value: 0.045, percentage: true } },
  { id: 'hexweave-gloves', name: 'Hexweave Gloves', slot: 'gloves', icon: '⌇', art: 11, tags: ['curse', 'projectile'], implicit: { stat: 'projectileDamage', label: 'Hex force', value: 0.04, percentage: true } },
  { id: 'quickdraw-grips', name: 'Quickdraw Grips', slot: 'gloves', icon: '↯', art: 12, tags: ['shadow'], implicit: { stat: 'companionDamage', label: 'Echo force', value: 0.04, percentage: true } },
  { id: 'roadworn-boots', name: 'Roadworn Boots', slot: 'boots', icon: '⌁', art: 13, tags: ['travel'], implicit: { stat: 'speed', label: 'Roadstride', value: 0.025, percentage: true } },
  { id: 'gallows-treads', name: 'Gallows Treads', slot: 'boots', icon: '⛓', art: 14, tags: ['execution'], implicit: { stat: 'executeThreshold', label: 'Execution reach', value: 0.012, percentage: true } },
  { id: 'rift-sandals', name: 'Rift Sandals', slot: 'boots', icon: '⇢', art: 15, tags: ['shadow'], implicit: { stat: 'dashDamage', label: 'Rift impact', value: 0.05, percentage: true } },
  { id: 'obelisk-charm', name: 'Obelisk Charm', slot: 'amulet', icon: '◉', art: 0, tags: ['ward'], implicit: { stat: 'barrier', label: 'Obelisk ward', value: 0.05, percentage: true } },
  { id: 'choir-rosary', name: 'Choir Rosary', slot: 'amulet', icon: '♬', art: 1, tags: ['confluence'], implicit: { stat: 'resonanceGain', label: 'Resonance gain', value: 0.06, percentage: true } },
  { id: 'redfen-locket', name: 'Redfen Locket', slot: 'amulet', icon: '✚', art: 2, tags: ['sustain'], implicit: { stat: 'lifeOnKill', label: 'Mire recovery', value: 0.006, percentage: true } },
  { id: 'veilbreaker-ring', name: 'Veilbreaker Ring', slot: 'ring', icon: '◌', art: 3, tags: ['precision'], implicit: { stat: 'crit', label: 'Veil precision', value: 0.012, percentage: true } },
  { id: 'cairn-signet', name: 'Cairn Signet', slot: 'ring', icon: '◆', art: 4, tags: ['stagger'], implicit: { stat: 'stagger', label: 'Cairn impact', value: 0.05, percentage: true } },
  { id: 'bell-band', name: 'Bell Band', slot: 'ring', icon: '☍', art: 5, tags: ['boss'], implicit: { stat: 'bossDamage', label: 'Bellbreaker force', value: 0.035, percentage: true } },
  { id: 'oath-bulwark', name: 'Oath Bulwark', slot: 'offhand', icon: '▤', art: 6, tags: ['ward'], implicit: { stat: 'barrier', label: 'Bulwark strength', value: 0.07, percentage: true } },
  { id: 'cinder-censer', name: 'Cinder Censer', slot: 'offhand', icon: '♨', art: 7, tags: ['ritual'], implicit: { stat: 'area', label: 'Cinder reach', value: 0.06, percentage: true } },
  { id: 'rift-mirror', name: 'Rift Mirror', slot: 'offhand', icon: '◇', art: 8, tags: ['shadow'], implicit: { stat: 'cooldown', label: 'Mirror recovery', value: 0.025, percentage: true } }
];

export const AFFIXES = [
  { stat: 'power', label: 'Weapon power', min: 3, max: 10, slots: ['weapon', 'gloves', 'offhand'], weight: 12 },
  { stat: 'hp', label: 'Vital mark', min: 14, max: 42, slots: ['head', 'chest', 'amulet'], weight: 11 },
  { stat: 'armor', label: 'Armor', min: 2, max: 8, slots: ['head', 'chest', 'gloves', 'offhand'], weight: 10 },
  { stat: 'resource', label: 'Maximum resource', min: 5, max: 15, slots: ['head', 'amulet', 'ring', 'offhand'], weight: 8 },
  { stat: 'crit', label: 'Critical chance', min: 0.01, max: 0.045, percentage: true, slots: ['weapon', 'gloves', 'ring'], weight: 9 },
  { stat: 'speed', label: 'Move speed', min: 0.03, max: 0.12, percentage: true, slots: ['boots', 'ring'], weight: 8 },
  { stat: 'resourceGain', label: 'Resource gained', min: 0.06, max: 0.2, percentage: true, slots: ['amulet', 'ring', 'offhand'], weight: 7 },
  { stat: 'cooldown', label: 'Cooldown recovery', min: 0.03, max: 0.09, percentage: true, slots: ['head', 'gloves', 'amulet', 'offhand'], weight: 8 },
  { stat: 'attackDamage', label: 'Core attack damage', min: 0.07, max: 0.2, percentage: true, slots: ['weapon', 'gloves'], weight: 9 },
  { stat: 'projectileDamage', label: 'Projectile damage', min: 0.07, max: 0.2, percentage: true, slots: ['weapon', 'gloves', 'offhand'], weight: 8 },
  { stat: 'companionDamage', label: 'Companion damage', min: 0.07, max: 0.2, percentage: true, slots: ['gloves', 'amulet', 'offhand'], weight: 7 },
  { stat: 'hybridDamage', label: 'Hybrid damage', min: 0.07, max: 0.19, percentage: true, slots: ['weapon', 'amulet', 'ring'], weight: 7 },
  { stat: 'ultimateDamage', label: 'Ultimate damage', min: 0.08, max: 0.23, percentage: true, slots: ['weapon', 'amulet', 'ring'], weight: 6 },
  { stat: 'area', label: 'Ability area', min: 0.055, max: 0.17, percentage: true, slots: ['head', 'chest', 'amulet', 'offhand'], weight: 7 },
  { stat: 'barrier', label: 'Barrier strength', min: 0.055, max: 0.17, percentage: true, slots: ['chest', 'amulet', 'offhand'], weight: 8 },
  { stat: 'stagger', label: 'Stagger damage', min: 0.07, max: 0.2, percentage: true, slots: ['weapon', 'gloves', 'ring'], weight: 7 },
  { stat: 'markedDamage', label: 'Damage to marked prey', min: 0.07, max: 0.2, percentage: true, slots: ['weapon', 'ring', 'amulet'], weight: 7 },
  { stat: 'eliteDamage', label: 'Damage to elites', min: 0.07, max: 0.19, percentage: true, slots: ['weapon', 'gloves', 'ring'], weight: 6 },
  { stat: 'bossDamage', label: 'Damage to bosses', min: 0.055, max: 0.16, percentage: true, slots: ['weapon', 'amulet', 'ring'], weight: 6 },
  { stat: 'executeThreshold', label: 'Execution threshold', min: 0.008, max: 0.028, percentage: true, slots: ['weapon', 'boots', 'ring'], weight: 5 },
  { stat: 'lifeOnKill', label: 'Life on kill', min: 0.004, max: 0.016, percentage: true, slots: ['chest', 'amulet', 'ring'], weight: 6 },
  { stat: 'resonanceGain', label: 'Resonance gain', min: 0.04, max: 0.14, percentage: true, slots: ['amulet', 'ring', 'offhand'], weight: 5 },
  { stat: 'masteryGain', label: 'Mastery gain', min: 0.04, max: 0.12, percentage: true, slots: ['head', 'amulet', 'ring'], weight: 5 },
  { stat: 'lootFind', label: 'Relic find', min: 0.04, max: 0.13, percentage: true, slots: ['head', 'amulet', 'ring'], weight: 4 },
  { stat: 'goldFind', label: 'Gold find', min: 0.06, max: 0.2, percentage: true, slots: ['boots', 'ring', 'amulet'], weight: 4 },

  // Fated affixes add an authored combat rule rather than another passive
  // number.  Relics, Uniques, and Mythics are guaranteed to roll one, so each
  // serious drop can redirect a build's play pattern.
  { stat: 'echoStrike', label: 'Echoing strike', min: 0.022, max: 0.05, percentage: true, slots: ['weapon', 'gloves'], weight: 3, kind: 'fated', effect: 'Core attacks can repeat as a spectral arc for 55% damage.' },
  { stat: 'projectileFork', label: 'Forking shot', min: 0.017, max: 0.04, percentage: true, slots: ['weapon', 'gloves', 'offhand'], weight: 3, kind: 'fated', effect: 'Projectile hits can fork toward two nearby enemies.' },
  { stat: 'criticalBurst', label: 'Rupturing critical', min: 0.02, max: 0.045, percentage: true, slots: ['weapon', 'ring', 'amulet'], weight: 3, kind: 'fated', effect: 'Critical hits can erupt, damaging and marking nearby prey.' },
  { stat: 'wardPulse', label: 'Reprisal ward', min: 0.025, max: 0.055, percentage: true, slots: ['chest', 'amulet', 'offhand'], weight: 3, kind: 'fated', effect: 'Barrier absorbs can send a damaging pulse back through nearby enemies.' },
  { stat: 'dashNova', label: 'Rift afterstep', min: 0.025, max: 0.055, percentage: true, slots: ['boots', 'ring'], weight: 3, kind: 'fated', effect: 'Dashes can leave a damaging rift at the departure point.' },
  { stat: 'executionCascade', label: 'Execution cascade', min: 0.025, max: 0.06, percentage: true, slots: ['weapon', 'boots', 'ring'], weight: 2, kind: 'fated', effect: 'Executions release a shockwave that marks and staggers nearby enemies.' },
  { stat: 'soulLeech', label: 'Soul siphon', min: 0.015, max: 0.04, percentage: true, slots: ['chest', 'amulet', 'ring'], weight: 3, kind: 'fated', effect: 'Elite kills restore a portion of maximum health as Barrier.' },
  { stat: 'confluenceSurge', label: 'Confluence surge', min: 0.018, max: 0.045, percentage: true, slots: ['head', 'amulet', 'offhand'], weight: 2, kind: 'fated', effect: 'Forming Confluence can immediately generate a second charge.' }
];

export const RUNES = [
  { id: 'cinder-rune', name: 'Cinder Rune', icon: '✦', stat: 'power', value: 5, desc: '+5 weapon power.' },
  { id: 'ward-rune', name: 'Ward Rune', icon: '⬡', stat: 'barrier', value: 0.1, percentage: true, desc: '+10% barrier strength.' },
  { id: 'rift-rune', name: 'Rift Rune', icon: '↯', stat: 'cooldown', value: 0.045, percentage: true, desc: '+4.5% cooldown recovery.' },
  { id: 'glass-rune', name: 'Glass Rune', icon: '◈', stat: 'crit', value: 0.035, percentage: true, desc: '+3.5% critical chance.' },
  { id: 'vital-rune', name: 'Vital Rune', icon: '✚', stat: 'hp', value: 24, desc: '+24 maximum health.' },
  { id: 'hunter-rune', name: 'Hunter Rune', icon: '◉', stat: 'eliteDamage', value: 0.1, percentage: true, desc: '+10% damage to elites.' },
  { id: 'toll-rune', name: 'Toll Rune', icon: '♬', stat: 'bossDamage', value: 0.08, percentage: true, desc: '+8% damage to bosses.' },
  { id: 'chain-rune', name: 'Chain Rune', icon: '⛓', stat: 'stagger', value: 0.1, percentage: true, desc: '+10% stagger damage.' },
  { id: 'briar-rune', name: 'Briar Rune', icon: '✹', stat: 'markedDamage', value: 0.09, percentage: true, desc: '+9% damage to marked prey.' },
  { id: 'echo-rune', name: 'Echo Rune', icon: '⌇', stat: 'companionDamage', value: 0.1, percentage: true, desc: '+10% companion damage.' },
  { id: 'moon-rune', name: 'Moon Rune', icon: '☾', stat: 'ultimateDamage', value: 0.1, percentage: true, desc: '+10% ultimate damage.' },
  { id: 'road-rune', name: 'Road Rune', icon: '⌁', stat: 'speed', value: 0.045, percentage: true, desc: '+4.5% movement speed.' },
  { id: 'reliquary-rune', name: 'Reliquary Rune', icon: '◇', stat: 'lootFind', value: 0.08, percentage: true, desc: '+8% Relic Find.' },
  { id: 'soul-rune', name: 'Soul Rune', icon: '♮', stat: 'lifeOnKill', value: 0.009, percentage: true, desc: 'Restore 0.9% health on kill.' },
  { id: 'matron-rune', name: 'Matron Rune', icon: '✹', stat: 'area', value: 0.08, percentage: true, desc: '+8% ability area.' },
  { id: 'regent-rune', name: 'Regent Rune', icon: '⬡', stat: 'armor', value: 7, desc: '+7 armor.' },
  { id: 'oracle-rune', name: 'Oracle Rune', icon: '☾', stat: 'resourceGain', value: 0.1, percentage: true, desc: '+10% resource gain.' },
  { id: 'accord-rune', name: 'Accord Rune', icon: '✦', stat: 'masteryGain', value: 0.09, percentage: true, desc: '+9% combat mastery gain.' },
  { id: 'delver-rune', name: 'Delver Rune', icon: '⌄', stat: 'eliteDamage', value: 0.12, percentage: true, desc: '+12% damage to elites.' },
  { id: 'world-rune', name: 'World Rune', icon: '◉', stat: 'hybridDamage', value: 0.11, percentage: true, desc: '+11% hybrid damage.' }
];

export const runeById = (id) => RUNES.find((rune) => rune.id === id) ?? null;

// Every unique has an explicit source and a mechanical expression.  Simple
// bonuses are supplied by statBonuses; ids with a power field are also read by
// the combat system for a visible, build-altering trigger.
export const UNIQUES = [
  { id: 'bell-sunder', name: 'Bell-Sunder', classId: 'warden', slot: 'weapon', icon: '⚔', art: 8, sources: ['bell-witness', 'boss-hunt'], effect: 'Spirit Nail returns after its first impact and rings marked prey.', statBonuses: { projectileDamage: 0.12, markedDamage: 0.08 }, power: 'nail-return' },
  { id: 'vowbreaker', name: 'Vowbreaker Edge', classId: 'warden', slot: 'weapon', icon: '⚔', art: 9, sources: ['gravewake', 'arena'], effect: 'Your third Grave Hew releases a judging crescent that marks every enemy hit.', statBonuses: { attackDamage: 0.14, stagger: 0.08 }, power: 'warden-crescent' },
  { id: 'sanctuary-mirror', name: 'Sanctuary Mirror', classId: 'warden', slot: 'offhand', icon: '◇', art: 10, sources: ['stronghold', 'boss-hunt'], effect: 'Warding Circle turns the first enemy bolt it touches back on its owner.', statBonuses: { barrier: 0.12, cooldown: 0.05 }, power: 'ward-reflect' },
  { id: 'last-briar', name: 'Crown of the Last Briar', classId: 'thornseer', slot: 'head', icon: '✹', art: 9, sources: ['redfen', 'boss-hunt'], effect: 'Blood Bloom follows your most recently cursed enemy.', statBonuses: { area: 0.12, lifeOnKill: 0.008 }, power: 'bloom-follow' },
  { id: 'mirewrit-censer', name: 'Mirewrit Censer', classId: 'thornseer', slot: 'offhand', icon: '♨', art: 11, sources: ['redfen', 'abyss'], effect: 'Cursed kills spread a fresh hex to two nearby enemies.', statBonuses: { projectileDamage: 0.12, markedDamage: 0.1 }, power: 'curse-spread' },
  { id: 'bloodroot-idol', name: 'Bloodroot Idol', classId: 'thornseer', slot: 'amulet', icon: '✚', art: 12, sources: ['trial', 'boss-hunt'], effect: 'Blood Bloom consumes nearby curses for a stronger healing pulse.', statBonuses: { barrier: 0.08, companionDamage: 0.1 }, power: 'bloom-consume' },
  { id: 'cairnheart', name: 'Cairnheart Plate', classId: 'ironbound', slot: 'chest', icon: '▣', art: 10, sources: ['cairnreach', 'boss-hunt'], effect: 'Bulwark pulses a shield slam whenever you spend Guard.', statBonuses: { armor: 12, barrier: 0.12 }, power: 'bulwark-slam' },
  { id: 'ram-hunger', name: 'Ram-Hunger Chain', classId: 'ironbound', slot: 'weapon', icon: '⛓', art: 13, sources: ['cairnreach', 'arena'], effect: 'Chain Harpoon creates a concussive burst at the point of impact.', statBonuses: { stagger: 0.16, eliteDamage: 0.1 }, power: 'harpoon-burst' },
  { id: 'unbowed-pact', name: 'Unbowed Pact', classId: 'ironbound', slot: 'ring', icon: '◆', art: 14, sources: ['stronghold', 'trial'], effect: 'Staggering an elite grants a brief barrier and 15% move speed.', statBonuses: { armor: 8, bossDamage: 0.08 }, power: 'stagger-ward' },
  { id: 'riftglass', name: 'Riftglass Stiletto', classId: 'veilrunner', slot: 'weapon', icon: '†', art: 11, sources: ['veiled-road', 'boss-hunt'], effect: 'Rift Step leaves a shadow that repeats Veil Knife.', statBonuses: { crit: 0.06, dashDamage: 0.12 }, power: 'shadow-knife' },
  { id: 'gutter-star', name: 'Gutter Star', classId: 'veilrunner', slot: 'ring', icon: '✷', art: 15, sources: ['veiled-road', 'abyss'], effect: 'Critical kills partially refresh Rift Step and scatter a fan of knives.', statBonuses: { crit: 0.07, attackDamage: 0.1 }, power: 'crit-step' },
  { id: 'smoke-crown', name: 'Smoke Crown', classId: 'veilrunner', slot: 'head', icon: '☾', art: 8, sources: ['trial', 'arena'], effect: 'Smoke Veil repeatedly fires at marked enemies from its edge.', statBonuses: { cooldown: 0.08, projectileDamage: 0.12 }, power: 'smoke-knives' },
  { id: 'briar-writ', name: 'Briar Writ', hybridId: 'briar-oath', slot: 'amulet', icon: '✹', art: 12, sources: ['hybrid-trial', 'boss-hunt'], effect: 'Thornwall fires three retaliatory briars and gains 35% duration.', statBonuses: { hybridDamage: 0.14, barrier: 0.1 }, power: 'thornwall-retaliate' },
  { id: 'covenant-anvil', name: 'Covenant Anvil', hybridId: 'cairn-covenant', slot: 'weapon', icon: '⬡', art: 13, sources: ['hybrid-trial', 'arena'], effect: 'Covenant Ram leaves an enduring armor-shard trail.', statBonuses: { hybridDamage: 0.14, stagger: 0.1 }, power: 'ram-trail' },
  { id: 'chain-refrain', name: 'Chain Refrain', hybridId: 'riftchain', slot: 'ring', icon: '↯', art: 14, sources: ['hybrid-trial', 'abyss'], effect: 'Chain Reprise repeats once against the lowest-health marked enemy.', statBonuses: { hybridDamage: 0.13, markedDamage: 0.12 }, power: 'chain-repeat' },
  { id: 'red-bastion', name: 'Red Bastion', hybridId: 'blood-bastion', slot: 'chest', icon: '▣', art: 15, sources: ['hybrid-trial', 'stronghold'], effect: 'Hemlock Citadel heals for each bleeding enemy it touches.', statBonuses: { barrier: 0.13, area: 0.1 }, power: 'citadel-heal' },
  { id: 'night-orchid', name: 'Night Orchid', hybridId: 'nightbloom', slot: 'ring', icon: '☾', art: 14, sources: ['hybrid-trial', 'abyss'], effect: 'Night Orchid creates a second shade seed on critical hits.', statBonuses: { hybridDamage: 0.15, crit: 0.04 }, power: 'orchid-twin' },
  { id: 'gallows-key', name: 'Gallows Key', hybridId: 'black-rampart', slot: 'amulet', icon: '⛓', art: 15, sources: ['hybrid-trial', 'arena'], effect: 'Gallows Run suspends elites and refunds half its cooldown on execution.', statBonuses: { hybridDamage: 0.14, executeThreshold: 0.02 }, power: 'gallows-refund' },
  { id: 'choir-vigil', name: 'Vigil of the Bound Choir', campaignId: 'chapter-two', verdict: 'bind-choir', slot: 'amulet', icon: '♮', art: 12, sources: ['tolling-abbot'], effect: 'Your Companion Technique grants a barrier. Confluence calls a choir ward that erodes nearby enemy hazards.', statBonuses: { companionDamage: 0.12, barrier: 0.14 }, power: 'choir-ward' },
  { id: 'last-peal', name: 'Last Peal of Bellscar', campaignId: 'chapter-two', verdict: 'sever-choir', slot: 'ring', icon: '♬', art: 14, sources: ['tolling-abbot'], effect: 'Hybrid signatures build much more stagger. Elite kills restore one Confluence charge when the bell is quiet.', statBonuses: { hybridDamage: 0.14, stagger: 0.16 }, power: 'last-peal' },
  { id: 'heart-of-the-unrung', name: 'Heart of the Unrung', rarity: 'mythic', slot: 'amulet', icon: '☉', art: 15, sources: ['mythic-hunt', 'abyss'], effect: 'A Confluence-charged signature repeats at 45% power after a short delay.', statBonuses: { hybridDamage: 0.2, resonanceGain: 0.14, bossDamage: 0.1 }, power: 'confluence-repeat' },
  { id: 'crown-of-noon', name: 'Crown of Noon', rarity: 'mythic', slot: 'head', icon: '✹', art: 13, sources: ['mythic-hunt', 'arena'], effect: 'Your ultimate leaves a smaller, second aftershock regardless of doctrine.', statBonuses: { ultimateDamage: 0.22, cooldown: 0.08, area: 0.12 }, power: 'ultimate-aftershock' },
  { id: 'black-lantern', name: 'Black Lantern of the Road', rarity: 'mythic', slot: 'offhand', icon: '◇', art: 10, sources: ['mythic-hunt', 'nemesis'], effect: 'Elite kills pull nearby drops to you and add a small chance for an extra Relic.', statBonuses: { lootFind: 0.22, eliteDamage: 0.12, goldFind: 0.16 }, power: 'lantern-plunder' },
  { id: 'bone-codex', name: 'Codex of the Last Marrow', classId: 'gravebinder', slot: 'weapon', icon: '☠', art: 1, sources: ['redfen', 'abyss'], effect: 'Bone Comet fractures into two seeking shards when it first strikes a cursed enemy.', statBonuses: { projectileDamage: 0.14, markedDamage: 0.1 }, power: 'bone-comet-split' },
  { id: 'pall-crown', name: 'Pall Crown of the Unnamed', classId: 'gravebinder', slot: 'head', icon: '☠', art: 6, sources: ['stronghold', 'boss-hunt'], effect: 'Mourning Ground periodically sends a wraith at the lowest-health cursed enemy.', statBonuses: { area: 0.13, barrier: 0.1 }, power: 'ossuary-wraiths' },
  { id: 'sepulcher-lantern', name: 'Sepulcher Lantern', classId: 'gravebinder', slot: 'offhand', icon: '♮', art: 7, sources: ['trial', 'arena'], effect: 'Cursed elite kills restore Essence and send a soul shard toward a nearby foe.', statBonuses: { companionDamage: 0.13, lifeOnKill: 0.01 }, power: 'grave-harvest' },
  { id: 'daybreak-lance', name: 'Daybreak Lance', classId: 'dawnstrider', slot: 'weapon', icon: '↠', art: 2, sources: ['gravewake', 'boss-hunt'], effect: 'Radiant Javelin returns after its first impact and pierces marked prey.', statBonuses: { projectileDamage: 0.14, bossDamage: 0.1 }, power: 'daybreak-return' },
  { id: 'halo-of-ash', name: 'Halo of Ash', classId: 'dawnstrider', slot: 'head', icon: '☼', art: 5, sources: ['stronghold', 'arena'], effect: 'Solar Chorus gains a second flare at its edge and grants a stronger initial barrier.', statBonuses: { area: 0.12, barrier: 0.12 }, power: 'halo-flare' },
  { id: 'orison-chain', name: 'Chain of the Burning Orison', classId: 'dawnstrider', slot: 'amulet', icon: '✷', art: 12, sources: ['trial', 'abyss'], effect: 'Lightstep leaves a radiant afterimage that repeats Sunstaff against the nearest marked enemy.', statBonuses: { dashDamage: 0.16, crit: 0.04 }, power: 'orison-step' },
  { id: 'graveguard-sigil', name: 'Sigil of the Graveguard', hybridId: 'graveguard', slot: 'chest', icon: '⚚', art: 9, sources: ['hybrid-trial', 'stronghold'], effect: 'Pallbearer Wall leaves an extra cursed grave and grants a heavier barrier.', statBonuses: { hybridDamage: 0.14, barrier: 0.14 }, power: 'graveguard-ward' },
  { id: 'carrion-psalter', name: 'Carrion Psalter', hybridId: 'blightweaver', slot: 'offhand', icon: '☠', art: 11, sources: ['hybrid-trial', 'abyss'], effect: 'Carrion Bloom fires an extra thorn at every cursed elite it touches.', statBonuses: { hybridDamage: 0.15, markedDamage: 0.1 }, power: 'blightweaver-spread' },
  { id: 'ossuary-anchor', name: 'Ossuary Anchor', hybridId: 'ossuary', slot: 'weapon', icon: '▣', art: 13, sources: ['hybrid-trial', 'arena'], effect: 'Cairn Procession ends in a concussive marrow pulse that pulls enemies together.', statBonuses: { hybridDamage: 0.14, stagger: 0.14 }, power: 'ossuary-pulse' },
  { id: 'wraith-gallows', name: 'Wraith Gallows', hybridId: 'wraithblade', slot: 'ring', icon: '†', art: 15, sources: ['hybrid-trial', 'nemesis'], effect: 'Mourning Cut refunds part of its cooldown when it executes cursed prey.', statBonuses: { hybridDamage: 0.15, executeThreshold: 0.018 }, power: 'wraithblade-refund' },
  { id: 'sunwall-vigil', name: 'Vigil of the Sunwall', hybridId: 'dawn-aegis', slot: 'amulet', icon: '☼', art: 12, sources: ['hybrid-trial', 'boss-hunt'], effect: 'Sunward fires a radiant counter-javelin whenever its barrier absorbs a heavy hit.', statBonuses: { hybridDamage: 0.14, barrier: 0.12 }, power: 'dawn-aegis-ward' },
  { id: 'eclipse-censer', name: 'Eclipse Censer', hybridId: 'eclipse-chorus', slot: 'offhand', icon: '◐', art: 7, sources: ['hybrid-trial', 'abyss'], effect: 'Vesper Bloom releases a prism bolt whenever it refreshes both mark and curse.', statBonuses: { hybridDamage: 0.14, area: 0.12 }, power: 'eclipse-chorus-prism' },
  { id: 'first-anvil', name: 'First Anvil of Noon', hybridId: 'sunforge', slot: 'chest', icon: '⬡', art: 10, sources: ['hybrid-trial', 'arena'], effect: 'Anvilflare creates an armor-shard field that restores Guard/Fervor while standing inside it.', statBonuses: { hybridDamage: 0.14, armor: 10 }, power: 'sunforge-anvil' },
  { id: 'golden-veil', name: 'Golden Veil', hybridId: 'gilded-shade', slot: 'head', icon: '✷', art: 8, sources: ['hybrid-trial', 'veiled-road'], effect: 'Goldleaf Step fans an additional set of sun-knives and marks every target hit.', statBonuses: { hybridDamage: 0.15, crit: 0.05 }, power: 'gilded-shade-fan' },
  { id: 'unrung-reliquary', name: 'Reliquary of the Unrung', hybridId: 'requiem', slot: 'ring', icon: '♮', art: 14, sources: ['hybrid-trial', 'mythic-hunt'], effect: 'Litany of Ash heals for each marked and cursed enemy it consumes.', statBonuses: { hybridDamage: 0.15, lifeOnKill: 0.012 }, power: 'requiem-revive' },
  { id: 'rootmother-heart', name: 'Heart of the Rootmother', slot: 'amulet', icon: '✹', art: 12, sources: ['blood-matron', 'ritual', 'delve'], effect: 'Avarra’s severed root swells ritual reach, recovery, and damage against marked bosses.', statBonuses: { area: 0.18, lifeOnKill: 0.014, bossDamage: 0.11 } },
  { id: 'regents-last-link', name: 'The Regent’s Last Link', slot: 'weapon', icon: '⛓', art: 13, sources: ['chain-regent', 'siege', 'gauntlet'], effect: 'The broken command chain turns armor and stagger into relentless forward pressure.', statBonuses: { stagger: 0.2, eliteDamage: 0.13, hybridDamage: 0.12 } },
  { id: 'map-of-five-edges', name: 'Map of Five Edges', slot: 'offhand', icon: '◇', art: 8, sources: ['veiled-oracle', 'echoes', 'delve'], effect: 'Every surviving route sharpens critical timing and returns abilities more quickly.', statBonuses: { cooldown: 0.1, crit: 0.065, resourceGain: 0.12 } },
  { id: 'cryptwardens-key', name: 'Cryptwarden’s Key', slot: 'ring', icon: '†', art: 14, sources: ['delve', 'gravewake'], effect: 'A key cut for doors beneath the dead road strengthens execution and elite hunting.', statBonuses: { executeThreshold: 0.022, eliteDamage: 0.14, lootFind: 0.1 } },
  { id: 'drowned-sovereigns-crown', name: 'Drowned Sovereign’s Crown', slot: 'head', icon: '≋', art: 13, sources: ['delve', 'redfen'], effect: 'The crown keeps a deep-water ward around the wearer and feeds on cursed kills.', statBonuses: { barrier: 0.16, lifeOnKill: 0.012, area: 0.1 } },
  { id: 'apostles-mirror', name: 'The Apostle’s Mirror', slot: 'offhand', icon: '◇', art: 10, sources: ['delve', 'echoes'], effect: 'A reflected oath amplifies companion techniques and projectile paths.', statBonuses: { companionDamage: 0.16, projectileDamage: 0.14, cooldown: 0.06 } },
  { id: 'vessel-of-silence', name: 'Vessel of Silence', rarity: 'mythic', slot: 'chest', icon: '♮', art: 15, sources: ['delve', 'gauntlet', 'mythic-hunt'], effect: 'Silence given shape hardens every Barrier and magnifies the next Confluence signature.', statBonuses: { barrier: 0.22, hybridDamage: 0.2, resonanceGain: 0.14 } },
  { id: 'accord-compass', name: 'Compass of the Ashen Accord', slot: 'boots', icon: '⌁', art: 13, sources: ['contracts', 'stronghold'], effect: 'The needle points toward unfinished work, improving movement and the quality of road spoils.', statBonuses: { speed: 0.1, lootFind: 0.13, goldFind: 0.16 } },
  { id: 'worldspine', name: 'Worldspine', rarity: 'mythic', slot: 'weapon', icon: '✦', art: 15, sources: ['gauntlet', 'mythic-hunt'], effect: 'A splinter from every broken region binds both oaths into one apex weapon.', statBonuses: { power: 22, ultimateDamage: 0.2, hybridDamage: 0.22, bossDamage: 0.13 } }
];

export const UNIQUE_VISUAL_SIGNATURE_IDS = Object.freeze(Object.fromEntries(
  UNIQUES.map((unique) => [unique.id, `unique:${unique.id}`])
));

export const uniqueById = (id) => UNIQUES.find((unique) => unique.id === id) ?? null;

export const SET_COLLECTIONS = [
  {
    id: 'gravewake-regalia', name: 'Gravewake Regalia', source: 'gravewake', slots: ['head', 'chest', 'boots'],
    bonuses: [
      { pieces: 2, label: 'Mourner’s Wake', stats: { markedDamage: 0.12, lifeOnKill: 0.008 } },
      { pieces: 3, label: 'Open Grave', stats: { area: 0.16, lootFind: 0.1 } }
    ]
  },
  {
    id: 'bellscar-vestments', name: 'Bellscar Vestments', source: 'bellscar', slots: ['head', 'chest', 'amulet'],
    bonuses: [
      { pieces: 2, label: 'Choral Guard', stats: { barrier: 0.14, companionDamage: 0.1 } },
      { pieces: 3, label: 'Unbroken Chorus', stats: { resonanceGain: 0.16, hybridDamage: 0.12 } }
    ]
  },
  {
    id: 'chainborne-panoply', name: 'Chainborne Panoply', source: 'cairnreach', slots: ['weapon', 'gloves', 'ring'],
    bonuses: [
      { pieces: 2, label: 'Weight of Iron', stats: { stagger: 0.14, eliteDamage: 0.1 } },
      { pieces: 3, label: 'March Without End', stats: { attackDamage: 0.14, bossDamage: 0.1 } }
    ]
  },
  {
    id: 'veiled-wayfarer', name: 'Veiled Wayfarer', source: 'veiled-road', slots: ['offhand', 'boots', 'ring'],
    bonuses: [
      { pieces: 2, label: 'Road Between Shadows', stats: { speed: 0.08, cooldown: 0.06 } },
      { pieces: 3, label: 'Stolen Moment', stats: { crit: 0.07, dashDamage: 0.16 } }
    ]
  },
  {
    id: 'mirebound-rites', name: 'Mirebound Rites', source: 'redfen', slots: ['head', 'amulet', 'offhand'],
    bonuses: [
      { pieces: 2, label: 'Bloodroot Memory', stats: { area: 0.14, lifeOnKill: 0.009 } },
      { pieces: 3, label: 'Matron Starved', stats: { markedDamage: 0.16, bossDamage: 0.11 } }
    ]
  },
  {
    id: 'fifth-road-raiment', name: 'Fifth Road Raiment', source: 'veiled-road', slots: ['chest', 'gloves', 'boots'],
    bonuses: [
      { pieces: 2, label: 'Unchosen Route', stats: { speed: 0.09, resourceGain: 0.1 } },
      { pieces: 3, label: 'Five-Edged Map', stats: { cooldown: 0.08, hybridDamage: 0.15 } }
    ]
  }
];

export const setById = (id) => SET_COLLECTIONS.find((set) => set.id === id) ?? null;

// Sources deliberately overlap.  That lets the player make a meaningful
// target-farming decision without making a desired build unavailable in one
// unlucky activity.
export const LOOT_SOURCES = [
  { id: 'gravewake', name: 'Gravewake Fields', detail: 'Campaign and world packs in the first region.', uniqueIds: ['vowbreaker', 'bell-sunder', 'daybreak-lance'], setIds: ['gravewake-regalia'] },
  { id: 'redfen', name: 'Redfen Mire', detail: 'Cursed packs, rituals, and mire events.', uniqueIds: ['last-briar', 'mirewrit-censer', 'bone-codex'], setIds: ['gravewake-regalia'] },
  { id: 'cairnreach', name: 'Cairnreach', detail: 'Strongholds, guards, and heavy elites.', uniqueIds: ['cairnheart', 'ram-hunger'], setIds: ['chainborne-panoply'] },
  { id: 'veiled-road', name: 'Veiled Road', detail: 'Assassins, shades, and rift incursions.', uniqueIds: ['riftglass', 'gutter-star', 'golden-veil'], setIds: ['veiled-wayfarer'] },
  { id: 'bell-witness', name: 'The Bell-Witness', detail: 'Chapter I boss and Boss Hunt rotation.', uniqueIds: ['bell-sunder', 'sanctuary-mirror', 'vowbreaker', 'daybreak-lance'], setIds: ['gravewake-regalia'] },
  { id: 'tolling-abbot', name: 'Rath Vell, Tolling Abbot', detail: 'Chapter II boss with a verdict-specific reward.', uniqueIds: ['choir-vigil', 'last-peal'], setIds: ['bellscar-vestments'] },
  { id: 'stronghold', name: 'Reclaimed Strongholds', detail: 'High-density coordinated encounters.', uniqueIds: ['sanctuary-mirror', 'unbowed-pact', 'red-bastion', 'pall-crown', 'halo-of-ash', 'graveguard-sigil'], setIds: ['chainborne-panoply'] },
  { id: 'abyss', name: 'Abyss Delve', detail: 'Scaling delves with broad Relic and Mythic access.', uniqueIds: ['mirewrit-censer', 'gutter-star', 'chain-refrain', 'night-orchid', 'heart-of-the-unrung', 'bone-codex', 'orison-chain', 'carrion-psalter', 'eclipse-censer'], setIds: ['gravewake-regalia', 'veiled-wayfarer'] },
  { id: 'arena', name: 'Covenant Arena', detail: 'Wave survival with martial and Mythic rewards.', uniqueIds: ['vowbreaker', 'ram-hunger', 'smoke-crown', 'covenant-anvil', 'gallows-key', 'crown-of-noon', 'sepulcher-lantern', 'halo-of-ash', 'ossuary-anchor', 'first-anvil'], setIds: ['chainborne-panoply'] },
  { id: 'hybrid-trial', name: 'Hybrid Class Trial', detail: 'Build-focused trials that favor your paired oath.', uniqueIds: ['briar-writ', 'covenant-anvil', 'chain-refrain', 'red-bastion', 'night-orchid', 'gallows-key', 'graveguard-sigil', 'carrion-psalter', 'ossuary-anchor', 'wraith-gallows', 'sunwall-vigil', 'eclipse-censer', 'first-anvil', 'golden-veil', 'unrung-reliquary'], setIds: ['bellscar-vestments'] },
  { id: 'boss-hunt', name: 'Boss Hunt', detail: 'Rotating target farm for class and hybrid uniques.', uniqueIds: ['bell-sunder', 'sanctuary-mirror', 'last-briar', 'bloodroot-idol', 'cairnheart', 'riftglass', 'briar-writ', 'pall-crown', 'daybreak-lance', 'sunwall-vigil'], setIds: [] },
  { id: 'nemesis', name: 'Nemesis Return', detail: 'A fallen foe returns carrying rare road spoils.', uniqueIds: ['black-lantern', 'unbowed-pact', 'wraith-gallows'], setIds: ['veiled-wayfarer'] },
  { id: 'mythic-hunt', name: 'Mythic Hunt', detail: 'High-tier Boss Hunts and S-rank endgame completions.', uniqueIds: ['heart-of-the-unrung', 'crown-of-noon', 'black-lantern', 'unrung-reliquary', 'vessel-of-silence', 'worldspine'], setIds: [] },
  { id: 'blood-matron', name: 'Avarra, Blood Matron', detail: 'Chapter III boss and Redfen Ritual finale.', uniqueIds: ['rootmother-heart', 'last-briar', 'bloodroot-idol'], setIds: ['mirebound-rites'] },
  { id: 'chain-regent', name: 'Odran, Chain Regent', detail: 'Chapter IV boss and Cairn Siege finale.', uniqueIds: ['regents-last-link', 'cairnheart', 'ram-hunger'], setIds: ['chainborne-panoply'] },
  { id: 'veiled-oracle', name: 'Noxara, Oracle of the Fifth Road', detail: 'Chapter V boss and Veiled Echoes finale.', uniqueIds: ['map-of-five-edges', 'riftglass', 'golden-veil'], setIds: ['fifth-road-raiment', 'veiled-wayfarer'] },
  { id: 'delve', name: 'Regional Delves', detail: 'Ten authored regional delves with rotating bosses.', uniqueIds: ['cryptwardens-key', 'drowned-sovereigns-crown', 'apostles-mirror', 'vessel-of-silence', 'rootmother-heart', 'map-of-five-edges'], setIds: ['gravewake-regalia', 'mirebound-rites', 'fifth-road-raiment'] },
  { id: 'siege', name: 'Cairn Siege', detail: 'Heavy endgame formations and Chain Regent rewards.', uniqueIds: ['regents-last-link', 'ram-hunger', 'cairnheart', 'worldspine'], setIds: ['chainborne-panoply'] },
  { id: 'ritual', name: 'Redfen Ritual', detail: 'Ritual waves ending in a Blood Matron confrontation.', uniqueIds: ['rootmother-heart', 'last-briar', 'mirewrit-censer'], setIds: ['mirebound-rites'] },
  { id: 'gauntlet', name: 'Bellscar Gauntlet', detail: 'Successive bosses and apex chase rewards.', uniqueIds: ['regents-last-link', 'vessel-of-silence', 'worldspine', 'heart-of-the-unrung'], setIds: ['bellscar-vestments'] },
  { id: 'echoes', name: 'Veiled Echoes', detail: 'Assassin packs, mirrored elites, and Fifth Road rewards.', uniqueIds: ['map-of-five-edges', 'apostles-mirror', 'gutter-star', 'golden-veil'], setIds: ['fifth-road-raiment', 'veiled-wayfarer'] },
  { id: 'contracts', name: 'Covenant Contracts', detail: 'Faction work completed across the broken world.', uniqueIds: ['accord-compass', 'black-lantern'], setIds: [] }
];

export const lootSourceById = (id) => LOOT_SOURCES.find((source) => source.id === id) ?? null;
