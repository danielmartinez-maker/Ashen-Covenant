// The Covenant Journey gives every part of the 1-100 road a purpose. Levels
// still unlock the skill constellations, while Journey chapters ask the player
// to use the campaign, exploration, crafting, and operations systems instead
// of levelling through one repeated activity.

const task = (id, type, target, name, description, icon, context = {}) => ({ id, type, target, name, description, icon, ...context });

export const JOURNEY_BANDS = [
  {
    id: 'first-embers', number: 1, name: 'First Embers', minLevel: 1, maxLevel: 6, color: '#d8b36b',
    focus: 'Learn both oaths and open the Bell-Broken Road.', recommended: 'Chapter I · Gravewake Fields',
    tasks: [
      task('first-hunt', 'kill', 35, 'First Hunt', 'Defeat 35 enemies anywhere on the road.', '⚔'),
      task('learn-the-oaths', 'action', 30, 'Learn the Oaths', 'Use combat abilities 30 times near enemies.', '✦'),
      task('break-the-line', 'elite', 3, 'Break the Line', 'Defeat three elite enemies.', '◇'),
      task('read-the-fields', 'district', 2, 'Read the Fields', 'Discover two named districts.', '⌖'),
      task('remember-a-name', 'lore', 1, 'Remember a Name', 'Record one World Chronicle site.', '☷'),
      task('answer-the-road', 'campaign', 3, 'Answer the Road', 'Advance three campaign stages.', '♬')
    ]
  },
  {
    id: 'broken-choir', number: 2, name: 'The Broken Choir', minLevel: 7, maxLevel: 12, color: '#d68578',
    focus: 'Turn a basic build into a real combat rotation.', recommended: 'Chapter II · Bellscar approach',
    tasks: [
      task('choir-hunt', 'kill', 60, 'Silence the Host', 'Defeat 60 enemies.', '⚔'),
      task('woven-rotation', 'action', 55, 'Woven Rotation', 'Use 55 combat abilities near enemies.', '✦'),
      task('first-great-foe', 'boss', 1, 'A Great Foe', 'Defeat a boss.', '☉'),
      task('roadside-crisis', 'event', 1, 'Roadside Crisis', 'Complete one world event.', '⌁'),
      task('anchor-the-road', 'waypoint', 2, 'Anchor the Road', 'Attune two waypoints.', '⌖'),
      task('names-in-the-bell', 'campaign', 4, 'Names in the Bell', 'Advance four campaign stages.', '♬')
    ]
  },
  {
    id: 'bloodwater', number: 3, name: 'Bloodwater', minLevel: 13, maxLevel: 18, color: '#c45e70',
    focus: 'Begin choosing which world activities feed your build.', recommended: 'Chapter III · Redfen',
    tasks: [
      task('mire-cleansing', 'kill', 80, 'Mire Cleansing', 'Defeat 80 enemies.', '⚔'),
      task('scarred-prey', 'elite', 8, 'Scarred Prey', 'Defeat eight elites.', '◇'),
      task('mercy-or-judgment', 'execution', 8, 'Mercy or Judgment', 'Execute eight staggered enemies.', '†'),
      task('signed-in-ash', 'contract', 2, 'Signed in Ash', 'Claim two contracts.', '☷'),
      task('first-descent', 'delve', 1, 'First Descent', 'Complete one regional delve.', '▽'),
      task('starve-the-root', 'campaign', 4, 'Starve the Root', 'Advance four campaign stages.', '✹')
    ]
  },
  {
    id: 'crownless-march', number: 4, name: 'Crownless March', minLevel: 19, maxLevel: 24, color: '#a9a58e',
    focus: 'Control larger fights and begin liberating the world.', recommended: 'Chapter IV · Cairnreach',
    tasks: [
      task('marchbreaker', 'kill', 105, 'Marchbreaker', 'Defeat 105 enemies.', '⚔'),
      task('form-confluence', 'confluence', 10, 'Form Confluence', 'Create ten Confluence charges.', '✹'),
      task('commanders-fall', 'boss', 2, 'Commanders Fall', 'Defeat two bosses.', '☉'),
      task('answer-the-alarm', 'event', 2, 'Answer the Alarm', 'Complete two world events.', '⌁'),
      task('raise-a-banner', 'stronghold', 1, 'Raise a Banner', 'Reclaim or defend one stronghold.', '⬡'),
      task('break-the-commands', 'campaign', 4, 'Break the Commands', 'Advance four campaign stages.', '♬')
    ]
  },
  {
    id: 'fifth-road', number: 5, name: 'The Fifth Road', minLevel: 25, maxLevel: 30, color: '#9278d8',
    focus: 'Finish the campaign with a coherent dual-oath build.', recommended: 'Chapter V · Veiled Road',
    tasks: [
      task('veil-cleaver', 'kill', 130, 'Veil Cleaver', 'Defeat 130 enemies.', '⚔'),
      task('complete-cadence', 'action', 110, 'Complete Cadence', 'Use 110 combat abilities near enemies.', '✦'),
      task('named-relics', 'unique', 2, 'Named Relics', 'Find two Unique or Mythic items.', '◆'),
      task('road-ledger', 'contract', 3, 'Road Ledger', 'Claim three contracts.', '☷'),
      task('deeper-roads', 'delve', 2, 'Deeper Roads', 'Complete two regional delves.', '▽'),
      task('preserve-the-road', 'campaign', 4, 'Preserve the Road', 'Advance four campaign stages.', '☾')
    ]
  },
  {
    id: 'world-reclaimer', number: 6, name: 'World Reclaimer', minLevel: 31, maxLevel: 36, color: '#72a7a0',
    focus: 'Turn the completed campaign into a persistent open world.', recommended: 'Districts · strongholds · regional bosses',
    tasks: [
      task('reclaimer-hunt', 'kill', 155, 'Reclaimer Hunt', 'Defeat 155 enemies.', '⚔'),
      task('elite-patrols', 'elite', 16, 'Elite Patrols', 'Defeat 16 elites.', '◇'),
      task('work-the-forge', 'forge', 6, 'Work the Forge', 'Complete six forge actions.', '⚒'),
      task('world-in-motion', 'event', 3, 'World in Motion', 'Complete three world events.', '⌁'),
      task('atlas-maker', 'district', 6, 'Atlas Maker', 'Discover six districts.', '⌖'),
      task('regional-terrors', 'boss', 3, 'Regional Terrors', 'Defeat three bosses.', '☉')
    ]
  },
  {
    id: 'faction-champion', number: 7, name: 'Faction Champion', minLevel: 37, maxLevel: 42, color: '#7eaf78',
    focus: 'Build alliances and prepare equipment for the Anvil.', recommended: 'Contracts · factions · Masterworking',
    tasks: [
      task('champions-toll', 'kill', 185, 'Champion’s Toll', 'Defeat 185 enemies.', '⚔'),
      task('oaths-in-accord', 'confluence', 18, 'Oaths in Accord', 'Create 18 Confluence charges.', '✹'),
      task('faction-ledger', 'contract', 5, 'Faction Ledger', 'Claim five contracts.', '☷'),
      task('charted-depths', 'delve', 3, 'Charted Depths', 'Complete three regional delves.', '▽'),
      task('hold-the-ground', 'stronghold', 2, 'Hold the Ground', 'Reclaim or defend two strongholds.', '⬡'),
      task('foundry-work', 'masterwork', 3, 'Foundry Work', 'Raise item Masterwork ranks three times.', '⚒')
    ]
  },
  {
    id: 'relic-architect', number: 8, name: 'Relic Architect', minLevel: 43, maxLevel: 48, color: '#d88fb0',
    focus: 'Shape a specialized loadout and test it in operations.', recommended: 'Loot Codex · forge · operation board',
    tasks: [
      task('architects-proof', 'kill', 220, 'Architect’s Proof', 'Defeat 220 enemies.', '⚔'),
      task('finishing-school', 'execution', 18, 'Finishing School', 'Execute 18 staggered enemies.', '†'),
      task('relic-study', 'unique', 4, 'Relic Study', 'Find four Unique or Mythic items.', '◆'),
      task('first-operations', 'operation', 4, 'First Operations', 'Complete four Board operations.', '✦'),
      task('anvil-hours', 'forge', 10, 'Anvil Hours', 'Complete ten forge actions.', '⚒'),
      task('boss-circuit', 'boss', 5, 'Boss Circuit', 'Defeat five bosses.', '☉')
    ]
  },
  {
    id: 'apex-covenant', number: 9, name: 'Apex Covenant', minLevel: 49, maxLevel: 54, color: '#e1a35f',
    focus: 'Push operation tiers and finish a first endgame set.', recommended: 'Tier 15+ operations · Starlit Masterworking',
    tasks: [
      task('apex-hunt', 'kill', 265, 'Apex Hunt', 'Defeat 265 enemies.', '⚔'),
      task('elite-census', 'elite', 30, 'Elite Census', 'Defeat 30 elites.', '◇'),
      task('starlit-anvil', 'masterwork', 7, 'Starlit Anvil', 'Raise item Masterwork ranks seven times.', '⚒'),
      task('operation-veteran', 'operation', 7, 'Operation Veteran', 'Complete seven Board operations.', '✦'),
      task('tier-fifteen', 'apex', 3, 'Tier Fifteen', 'Clear three operations at tier 15 or higher.', '△', { minTier: 15 }),
      task('master-delver', 'delve', 5, 'Master Delver', 'Complete five regional delves.', '▽')
    ]
  },
  {
    id: 'worldfall', number: 10, name: 'Worldfall', minLevel: 55, maxLevel: 60, color: '#f0cc77',
    focus: 'Prove the finished covenant and open the upper endgame road.', recommended: 'Tier 25+ operations · Apex Masterworking',
    tasks: [
      task('worldfall-host', 'kill', 320, 'Worldfall Host', 'Defeat 320 enemies.', '⚔'),
      task('perfect-confluence', 'confluence', 30, 'Perfect Confluence', 'Create 30 Confluence charges.', '✹'),
      task('ten-great-foes', 'boss', 10, 'Ten Great Foes', 'Defeat ten bosses.', '☉'),
      task('operation-master', 'operation', 10, 'Operation Master', 'Complete ten Board operations.', '✦'),
      task('tier-twenty-five', 'apex', 5, 'Tier Twenty-Five', 'Clear five operations at tier 25 or higher.', '△', { minTier: 25 }),
      task('mythic-archive', 'unique', 6, 'Mythic Archive', 'Find six Unique or Mythic items.', '◆')
    ]
  },
  {
    id: 'ashen-vanguard', number: 11, name: 'Ashen Vanguard', minLevel: 61, maxLevel: 65, color: '#e58d62',
    focus: 'Enter the veteran road with high-density operations and deliberate build refinement.', recommended: 'Tier 28+ operations · elite circuits',
    tasks: [
      task('vanguard-host', 'kill', 380, 'Vanguard Host', 'Defeat 380 enemies.', '⚔'),
      task('vanguard-elites', 'elite', 42, 'Scarred Vanguard', 'Defeat 42 elites.', '◇'),
      task('vanguard-rotation', 'confluence', 38, 'Perfect Rotation', 'Create 38 Confluence charges.', '✹'),
      task('vanguard-operations', 'operation', 12, 'Veteran Operations', 'Complete 12 Board operations.', '✦'),
      task('vanguard-apex', 'apex', 6, 'Tier Twenty-Eight', 'Clear six operations at tier 28 or higher.', '△', { minTier: 28 }),
      task('vanguard-forge', 'masterwork', 10, 'Apex Foundry', 'Raise item Masterwork ranks ten times.', '⚒')
    ]
  },
  {
    id: 'anvilbound', number: 12, name: 'Anvilbound', minLevel: 66, maxLevel: 70, color: '#d5a768',
    focus: 'Perfect several pieces of equipment instead of relying on one lucky drop.', recommended: 'Forge · Loot Codex · boss target farming',
    tasks: [
      task('anvilbound-hunt', 'kill', 430, 'Fuel the Anvil', 'Defeat 430 enemies.', '⚔'),
      task('anvilbound-forge', 'forge', 18, 'Relicwright', 'Complete 18 forge actions.', '⚒'),
      task('anvilbound-masterwork', 'masterwork', 14, 'Twelvefold Steel', 'Raise item Masterwork ranks 14 times.', '◇'),
      task('anvilbound-uniques', 'unique', 9, 'Named Arsenal', 'Find nine Unique or Mythic items.', '◆'),
      task('anvilbound-bosses', 'boss', 14, 'Boss-Forged', 'Defeat 14 bosses.', '☉'),
      task('anvilbound-contracts', 'contract', 10, 'Supply the Foundry', 'Claim ten contracts.', '☷')
    ]
  },
  {
    id: 'rift-cartographer', number: 13, name: 'Rift Cartographer', minLevel: 71, maxLevel: 75, color: '#8b80d6',
    focus: 'Master every region through delves, events, contracts, and high-tier routes.', recommended: 'Regional delves · faction contracts',
    tasks: [
      task('rift-host', 'kill', 480, 'Map in Blood', 'Defeat 480 enemies.', '⚔'),
      task('rift-events', 'event', 10, 'World in Motion', 'Complete ten world events.', '⌁'),
      task('rift-delves', 'delve', 8, 'Deep Cartography', 'Complete eight regional delves.', '▽'),
      task('rift-contracts', 'contract', 12, 'Every Border', 'Claim twelve contracts.', '☷'),
      task('rift-strongholds', 'stronghold', 5, 'Five Banners', 'Reclaim or defend five strongholds.', '⬡'),
      task('rift-apex', 'apex', 8, 'Tier Thirty-Two', 'Clear eight operations at tier 32 or higher.', '△', { minTier: 32 })
    ]
  },
  {
    id: 'nemesis-hunter', number: 14, name: 'Nemesis Hunter', minLevel: 76, maxLevel: 80, color: '#c66563',
    focus: 'Build for bosses, elite pressure, executions, and dangerous operation modifiers.', recommended: 'Boss Hunt · Bellscar Gauntlet',
    tasks: [
      task('nemesis-host', 'kill', 540, 'The Long Hunt', 'Defeat 540 enemies.', '⚔'),
      task('nemesis-elites', 'elite', 64, 'Elite Extinction', 'Defeat 64 elites.', '◇'),
      task('nemesis-bosses', 'boss', 18, 'Names Crossed Out', 'Defeat 18 bosses.', '☉'),
      task('nemesis-executions', 'execution', 36, 'Final Sentences', 'Execute 36 staggered enemies.', '†'),
      task('nemesis-operations', 'operation', 16, 'Modified War', 'Complete 16 Board operations.', '✦'),
      task('nemesis-apex', 'apex', 10, 'Tier Thirty-Five', 'Clear ten operations at tier 35 or higher.', '△', { minTier: 35 })
    ]
  },
  {
    id: 'choirbreaker', number: 15, name: 'Choirbreaker', minLevel: 81, maxLevel: 85, color: '#ad83d2',
    focus: 'Push dual-oath mastery until the full rotation becomes the build.', recommended: 'Hybrid Trial · Veiled Echoes',
    tasks: [
      task('choirbreaker-host', 'kill', 610, 'Break the Host', 'Defeat 610 enemies.', '⚔'),
      task('choirbreaker-actions', 'action', 360, 'Relentless Cadence', 'Use 360 combat abilities near enemies.', '✦'),
      task('choirbreaker-confluence', 'confluence', 65, 'Choir of Two', 'Create 65 Confluence charges.', '✹'),
      task('choirbreaker-operations', 'operation', 18, 'Hybrid Proof', 'Complete 18 Board operations.', '△'),
      task('choirbreaker-uniques', 'unique', 12, 'Covenant Arsenal', 'Find 12 Unique or Mythic items.', '◆'),
      task('choirbreaker-bosses', 'boss', 20, 'Silence Twenty', 'Defeat 20 bosses.', '☉')
    ]
  },
  {
    id: 'apex-architect', number: 16, name: 'Apex Architect', minLevel: 86, maxLevel: 90, color: '#e19b62',
    focus: 'Assemble a finished loadout and prove it across every endgame format.', recommended: 'Tier 38+ operations · Masterwork rank 12',
    tasks: [
      task('architect-host', 'kill', 690, 'Architect’s Toll', 'Defeat 690 enemies.', '⚔'),
      task('architect-forge', 'forge', 28, 'Perfected Forge', 'Complete 28 forge actions.', '⚒'),
      task('architect-masterwork', 'masterwork', 20, 'Apex Arsenal', 'Raise item Masterwork ranks 20 times.', '◇'),
      task('architect-operations', 'operation', 22, 'Eightfold Proof', 'Complete 22 Board operations.', '✦'),
      task('architect-apex', 'apex', 12, 'Tier Thirty-Eight', 'Clear 12 operations at tier 38 or higher.', '△', { minTier: 38 }),
      task('architect-delves', 'delve', 12, 'Every Descent', 'Complete 12 regional delves.', '▽')
    ]
  },
  {
    id: 'worldscar-sovereign', number: 17, name: 'Worldscar Sovereign', minLevel: 91, maxLevel: 95, color: '#e66d77',
    focus: 'Control the hardest world pressure while maintaining a complete build.', recommended: 'Tier 42+ operations · regional boss circuit',
    tasks: [
      task('sovereign-host', 'kill', 780, 'Sovereign Host', 'Defeat 780 enemies.', '⚔'),
      task('sovereign-elites', 'elite', 90, 'Apex Census', 'Defeat 90 elites.', '◇'),
      task('sovereign-bosses', 'boss', 25, 'Crown of Names', 'Defeat 25 bosses.', '☉'),
      task('sovereign-contracts', 'contract', 18, 'Faction Sovereign', 'Claim 18 contracts.', '☷'),
      task('sovereign-operations', 'operation', 26, 'Worldscar Operations', 'Complete 26 Board operations.', '✦'),
      task('sovereign-apex', 'apex', 15, 'Tier Forty-Two', 'Clear 15 operations at tier 42 or higher.', '△', { minTier: 42 })
    ]
  },
  {
    id: 'hundredth-bell', number: 18, name: 'The Hundredth Bell', minLevel: 96, maxLevel: 100, color: '#f2d47d',
    focus: 'Complete the mortal road and awaken the Paragon Atlas.', recommended: 'Tier 45+ operations · perfected covenant',
    tasks: [
      task('hundredth-host', 'kill', 900, 'Nine Hundred Fallen', 'Defeat 900 enemies.', '⚔'),
      task('hundredth-confluence', 'confluence', 100, 'Hundredfold Confluence', 'Create 100 Confluence charges.', '✹'),
      task('hundredth-bosses', 'boss', 30, 'Thirty Great Foes', 'Defeat 30 bosses.', '☉'),
      task('hundredth-operations', 'operation', 30, 'Endless Board', 'Complete 30 Board operations.', '✦'),
      task('hundredth-apex', 'apex', 18, 'Tier Forty-Five', 'Clear 18 operations at tier 45 or higher.', '△', { minTier: 45 }),
      task('hundredth-mythics', 'unique', 16, 'Hundredth Archive', 'Find 16 Unique or Mythic items.', '◆')
    ]
  }
];

export const JOURNEY_REQUIRED_TASKS = 4;

export const PILLARS = [
  {
    id: 'might', name: 'Might', icon: '⚔', color: '#d66e5e', maxRank: 15,
    summary: 'Direct force, stagger, and decisive finishing damage.',
    perRank: { powerScale: 0.025, attackDamage: 0.012 },
    milestones: [
      { rank: 3, name: 'Tempered Edge', description: '+4% critical chance.', modifiers: { crit: 0.04 } },
      { rank: 6, name: 'Linebreaker', description: '+25% stagger dealt.', modifiers: { staggerScale: 0.25 } },
      { rank: 10, name: 'Oathslayer', description: '+22% Hybrid and Ultimate damage.', modifiers: { hybridDamage: 0.22, ultimateDamage: 0.22 } },
      { rank: 15, name: 'Worldsplitter', description: 'Critical hits burst; +18% boss damage.', modifiers: { criticalBurst: 0.12, bossDamage: 0.18 } }
    ]
  },
  {
    id: 'celerity', name: 'Celerity', icon: '➶', color: '#7fc5cf', maxRank: 15,
    summary: 'Movement, cooldown cadence, and repeated strike effects.',
    perRank: { speed: 0.012, cooldown: 0.008 },
    milestones: [
      { rank: 3, name: 'Quickened Blood', description: '+8% resource generation.', modifiers: { resourceGain: 0.08 } },
      { rank: 6, name: 'Unbroken Motion', description: '+15% dash damage and area.', modifiers: { dashDamageScale: 0.15, area: 0.15 } },
      { rank: 10, name: 'Afterimage', description: 'Direct attacks can repeat as an echo.', modifiers: { echoStrike: 0.14 } },
      { rank: 15, name: 'Stormstride', description: 'Projectiles fork and dashes leave rifts more often.', modifiers: { projectileFork: 0.1, dashNova: 0.1 } }
    ]
  },
  {
    id: 'aegis', name: 'Aegis', icon: '⬡', color: '#8eb79d', maxRank: 15,
    summary: 'Maximum health, armor, barriers, and recovery from mistakes.',
    perRank: { hpScale: 0.03, armorScale: 0.025 },
    milestones: [
      { rank: 3, name: 'Living Ward', description: '+14% barrier strength.', modifiers: { ward: 0.14 } },
      { rank: 6, name: 'Iron Flask', description: 'Potions grant 10% damage reduction.', modifiers: { potionReduction: 0.1 } },
      { rank: 10, name: 'Refuse the Toll', description: 'Survive one lethal hit every 90 seconds.', special: 'second-wind' },
      { rank: 15, name: 'Living Citadel', description: 'Barrier creation can release a ward pulse.', modifiers: { wardPulse: 0.14, wardDamageReduction: 0.06 } }
    ]
  },
  {
    id: 'communion', name: 'Communion', icon: '✹', color: '#ad91dc', maxRank: 15,
    summary: 'Resource flow, mastery, Resonance, and dual-oath techniques.',
    perRank: { resourceGain: 0.018, masteryGain: 0.018 },
    milestones: [
      { rank: 3, name: 'Second Voice', description: '+18% Companion Technique damage.', modifiers: { companionDamage: 0.18 } },
      { rank: 6, name: 'Resonant Vessel', description: '+20% Resonance gain.', modifiers: { resonanceGain: 0.2 } },
      { rank: 10, name: 'Confluence Engine', description: 'Confluence can surge into an extra pulse.', modifiers: { confluenceSurge: 0.16 } },
      { rank: 15, name: 'Third Voice', description: '+20% Companion damage; Confluence surges more often.', modifiers: { companionDamage: 0.2, confluenceSurge: 0.1 } }
    ]
  },
  {
    id: 'predation', name: 'Predation', icon: '†', color: '#dc8b72', maxRank: 15,
    summary: 'Elite hunting, boss pressure, executions, and marked prey.',
    perRank: { eliteDamage: 0.018, markedDamage: 0.012 },
    milestones: [
      { rank: 3, name: 'Cull the Weak', description: '+5% execution threshold.', modifiers: { executeThreshold: 0.05 } },
      { rank: 6, name: 'Trophy Hunter', description: '+18% boss damage.', modifiers: { bossDamage: 0.18 } },
      { rank: 10, name: 'No Escape', description: '+10% execution threshold and execution cascades.', modifiers: { executeThreshold: 0.1, executionCascade: 0.14 } },
      { rank: 15, name: 'Final Sentence', description: 'Elite kills create barriers; +20% marked damage.', modifiers: { soulLeech: 0.1, markedDamage: 0.2 } }
    ]
  },
  {
    id: 'providence', name: 'Providence', icon: '◆', color: '#e0be69', maxRank: 15,
    summary: 'Rare drops, gold, critical opportunity, and Fated effects.',
    perRank: { lootFind: 0.018, goldFind: 0.025 },
    milestones: [
      { rank: 3, name: 'Fortunate Cut', description: '+3% critical chance.', modifiers: { crit: 0.03 } },
      { rank: 6, name: 'Relic Sense', description: '+16% additional loot find.', modifiers: { lootFind: 0.16 } },
      { rank: 10, name: 'Fate-Touched', description: 'All equipped Fated affixes trigger more often.', modifiers: { fatedAmplifier: 0.07 } },
      { rank: 15, name: 'Sovereign Chance', description: 'Fated effects trigger more often; +15% mastery gain.', modifiers: { fatedAmplifier: 0.06, masteryGain: 0.15 } }
    ]
  }
];

const choice = (id, name, icon, description, modifiers = {}, special = null) => ({ id, name, icon, description, modifiers, special });

export const ASCENSION_TIERS = [
  { level: 5, name: 'First Tempering', choices: [
    choice('first-flame', 'First Flame', '✦', '+10% power and +8% resource generation.', { powerScale: 0.1, resourceGain: 0.08 }),
    choice('road-ward', 'Road Ward', '⬡', '+15% maximum health and +12% barrier strength.', { hpScale: 0.15, ward: 0.12 }),
    choice('quickening', 'Quickening', '➶', '+10% movement speed and +5% cooldown recovery.', { speed: 0.1, cooldown: 0.05 })
  ] },
  { level: 10, name: 'Second Tempering', choices: [
    choice('nailstorm-vow', 'Nailstorm Vow', '↠', '+18% basic damage and +12% projectile damage.', { attackDamage: 0.18, projectileDamage: 0.12 }),
    choice('twin-echo', 'Twin Echo', '⌁', '+25% Companion damage and +15% Resonance gain.', { companionDamage: 0.25, resonanceGain: 0.15 }),
    choice('iron-root', 'Iron Root', '▣', '+20% armor and 8% damage reduction while warded.', { armorScale: 0.2, wardDamageReduction: 0.08 })
  ] },
  { level: 15, name: 'Third Tempering', choices: [
    choice('executioners-grace', 'Executioner’s Grace', '†', '+8% execution threshold; executions restore 4% health.', { executeThreshold: 0.08, executionHeal: 0.04 }),
    choice('war-psalm', 'War Psalm', '✹', '+20% Hybrid damage and +18% charged Confluence damage.', { hybridDamage: 0.2, confluenceDamage: 0.18 }),
    choice('hunter-moon', 'Hunter Moon', '☾', '+18% elite damage and +12% loot find.', { eliteDamage: 0.18, lootFind: 0.12 })
  ] },
  { level: 20, name: 'Fourth Tempering', choices: [
    choice('branching-rite', 'Branching Rite', '⌇', 'Projectiles gain a 15% chance to fork.', { projectileFork: 0.15 }),
    choice('ward-resonance', 'Ward Resonance', '◉', 'Barrier gains a 16% chance to release a damaging pulse.', { wardPulse: 0.16 }),
    choice('ashen-step', 'Ashen Step', '➶', 'Dodges gain a 16% chance to leave a damaging rift.', { dashNova: 0.16 })
  ] },
  { level: 25, name: 'Fifth Tempering', choices: [
    choice('refuse-death', 'Refuse Death', '✚', '+12% maximum health and survive one lethal hit every 120 seconds.', { hpScale: 0.12 }, 'second-wind'),
    choice('blood-price', 'Blood Price', '✕', '+20% power at the cost of 8% maximum health.', { powerScale: 0.2, hpScale: -0.08 }),
    choice('wellspring', 'Wellspring', '≋', '+22% resource generation and +7% cooldown recovery.', { resourceGain: 0.22, cooldown: 0.07 })
  ] },
  { level: 30, name: 'Sixth Tempering', choices: [
    choice('choir-of-two', 'Choir of Two', '♬', '+20% Companion and Hybrid damage.', { companionDamage: 0.2, hybridDamage: 0.2 }),
    choice('apex-hunter', 'Apex Hunter', '△', '+28% boss damage and +5% critical chance.', { bossDamage: 0.28, crit: 0.05 }),
    choice('fateweaver', 'Fateweaver', '◆', '+20% loot find; critical hits can burst around the target.', { lootFind: 0.2, criticalBurst: 0.14 })
  ] },
  { level: 35, name: 'Seventh Tempering', choices: [
    choice('echoing-blade', 'Echoing Blade', '↻', 'Direct attacks gain an 18% chance to echo.', { echoStrike: 0.18 }),
    choice('wide-ruin', 'Wide Ruin', '☉', '+22% area and +18% Ultimate damage.', { area: 0.22, ultimateDamage: 0.18 }),
    choice('perfect-form', 'Perfect Form', '◇', '+30% mastery gain and +5% critical chance.', { masteryGain: 0.3, crit: 0.05 })
  ] },
  { level: 40, name: 'Eighth Tempering', choices: [
    choice('barrier-engine', 'Barrier Engine', '⬡', '+25% barrier strength and stronger ward creation.', { ward: 0.25, wardBarrier: 0.18 }),
    choice('ruthless-clock', 'Ruthless Clock', '⌁', '+11% cooldown recovery and +8% movement speed.', { cooldown: 0.11, speed: 0.08 }),
    choice('marked-doom', 'Marked Doom', '†', '+32% damage to marked prey and +6% execution threshold.', { markedDamage: 0.32, executeThreshold: 0.06 })
  ] },
  { level: 45, name: 'Ninth Tempering', choices: [
    choice('soul-harvest', 'Soul Harvest', '☾', 'Elite kills create a barrier worth 9% maximum health.', { soulLeech: 0.09 }),
    choice('confluence-storm', 'Confluence Storm', '✹', 'Charged signatures gain an 18% chance to surge twice.', { confluenceSurge: 0.18 }),
    choice('judgment-cascade', 'Judgment Cascade', '✕', 'Executions gain an 18% chance to strike nearby enemies.', { executionCascade: 0.18 })
  ] },
  { level: 50, name: 'Tenth Tempering', choices: [
    choice('mythic-appetite', 'Mythic Appetite', '◆', '+30% loot find and +25% gold find.', { lootFind: 0.3, goldFind: 0.25 }),
    choice('bossbreaker', 'Bossbreaker', '⚔', '+35% boss damage and +30% stagger dealt.', { bossDamage: 0.35, staggerScale: 0.3 }),
    choice('untouchable', 'Untouchable', '▣', '12% damage reduction while warded and +8% cooldown recovery.', { wardDamageReduction: 0.12, cooldown: 0.08 })
  ] },
  { level: 55, name: 'Eleventh Tempering', choices: [
    choice('endless-oath', 'Endless Oath', '♬', '+32% Ultimate damage and +12% Resonance gain.', { ultimateDamage: 0.32, resonanceGain: 0.12 }),
    choice('warden-of-roads', 'Warden of Roads', '⬡', '+22% maximum health and +18% armor.', { hpScale: 0.22, armorScale: 0.18 }),
    choice('perfect-motion', 'Perfect Motion', '➶', '+12% movement speed and +6% critical chance.', { speed: 0.12, crit: 0.06 })
  ] },
  { level: 60, name: 'Worldfall Ascension', choices: [
    choice('worldfire', 'Worldfire', '☉', '+28% power, +18% area, and +15% Hybrid damage.', { powerScale: 0.28, area: 0.18, hybridDamage: 0.15 }),
    choice('immortal-covenant', 'Immortal Covenant', '✚', '+32% maximum health; survive one lethal hit every 75 seconds.', { hpScale: 0.32 }, 'greater-second-wind'),
    choice('fate-sovereign', 'Fate Sovereign', '◆', 'All Fated effects trigger 9% more often; +20% loot find.', { fatedAmplifier: 0.09, lootFind: 0.2 })
  ] },
  { level: 65, name: 'Vanguard Ascension', choices: [
    choice('vanguard-edge', 'Vanguard Edge', '⚔', '+18% power, +6% critical chance, and +15% stagger.', { powerScale: 0.18, crit: 0.06, staggerScale: 0.15 }),
    choice('vanguard-ward', 'Vanguard Ward', '⬡', '+22% maximum health, +14% armor, and +10% barrier strength.', { hpScale: 0.22, armorScale: 0.14, ward: 0.1 }),
    choice('vanguard-accord', 'Vanguard Accord', '✹', '+20% Hybrid damage, +18% Resonance gain, and stronger Confluence.', { hybridDamage: 0.2, resonanceGain: 0.18, confluenceDamage: 0.18 })
  ] },
  { level: 70, name: 'Anvilbound Ascension', choices: [
    choice('perfected-edge', 'Perfected Edge', '◇', '+24% attack and projectile damage.', { attackDamage: 0.24, projectileDamage: 0.24 }),
    choice('perfected-shell', 'Perfected Shell', '▣', '+20% armor and 10% warded damage reduction.', { armorScale: 0.2, wardDamageReduction: 0.1 }),
    choice('perfected-fate', 'Perfected Fate', '◆', 'Fated effects trigger 10% more often; +18% mastery gain.', { fatedAmplifier: 0.1, masteryGain: 0.18 })
  ] },
  { level: 75, name: 'Rift Ascension', choices: [
    choice('riftstorm', 'Riftstorm', '➶', 'Dashes leave rifts more often; +16% area and movement speed.', { dashNova: 0.18, area: 0.16, speed: 0.1 }),
    choice('echoing-road', 'Echoing Road', '↻', 'Direct attacks echo more often; +12% cooldown recovery.', { echoStrike: 0.18, cooldown: 0.12 }),
    choice('road-without-end', 'Road Without End', '⌖', '+20% resource generation, +20% mastery gain, and +15% loot find.', { resourceGain: 0.2, masteryGain: 0.2, lootFind: 0.15 })
  ] },
  { level: 80, name: 'Nemesis Ascension', choices: [
    choice('great-foe-slayer', 'Great-Foe Slayer', '☉', '+40% boss damage and +20% stagger.', { bossDamage: 0.4, staggerScale: 0.2 }),
    choice('final-sentence', 'Final Sentence', '†', '+12% execution threshold; executions cascade and heal.', { executeThreshold: 0.12, executionCascade: 0.18, executionHeal: 0.05 }),
    choice('trophy-ward', 'Trophy Ward', '⬡', 'Elite kills create a barrier; +20% elite damage.', { soulLeech: 0.12, eliteDamage: 0.2 })
  ] },
  { level: 85, name: 'Choirbreaker Ascension', choices: [
    choice('third-voice', 'Third Voice', '♬', '+32% Companion damage and +20% Resonance gain.', { companionDamage: 0.32, resonanceGain: 0.2 }),
    choice('perfect-confluence', 'Perfect Confluence', '✹', '+30% Hybrid and Confluence damage; surges occur more often.', { hybridDamage: 0.3, confluenceDamage: 0.3, confluenceSurge: 0.16 }),
    choice('endless-rotation', 'Endless Rotation', '⌁', '+14% cooldown recovery, +22% resource generation, and +16% Ultimate damage.', { cooldown: 0.14, resourceGain: 0.22, ultimateDamage: 0.16 })
  ] },
  { level: 90, name: 'Architect Ascension', choices: [
    choice('worldforged', 'Worldforged', '⚒', '+26% power and +22% Ultimate damage.', { powerScale: 0.26, ultimateDamage: 0.22 }),
    choice('living-reliquary', 'Living Reliquary', '◆', '+22% loot and mastery gain; stronger Fated triggers.', { lootFind: 0.22, masteryGain: 0.22, fatedAmplifier: 0.08 }),
    choice('immovable-design', 'Immovable Design', '▣', '+28% maximum health, +20% armor, and +16% barrier strength.', { hpScale: 0.28, armorScale: 0.2, ward: 0.16 })
  ] },
  { level: 95, name: 'Sovereign Ascension', choices: [
    choice('sovereign-ruin', 'Sovereign Ruin', '☉', '+28% area, +8% critical chance, and critical-burst chance.', { area: 0.28, crit: 0.08, criticalBurst: 0.18 }),
    choice('sovereign-hunt', 'Sovereign Hunt', '†', '+28% elite, boss, and marked damage.', { eliteDamage: 0.28, bossDamage: 0.28, markedDamage: 0.28 }),
    choice('sovereign-aegis', 'Sovereign Aegis', '⬡', '+24% maximum health and armor; barriers release pulses.', { hpScale: 0.24, armorScale: 0.24, wardPulse: 0.16 })
  ] },
  { level: 100, name: 'Hundredth Ascension', choices: [
    choice('hundredfold-flame', 'Hundredfold Flame', '△', '+35% power, Hybrid, and Ultimate damage.', { powerScale: 0.35, hybridDamage: 0.35, ultimateDamage: 0.35 }),
    choice('hundredfold-life', 'Hundredfold Life', '✚', '+40% maximum health and +20% barrier strength; survive one lethal hit every 75 seconds.', { hpScale: 0.4, ward: 0.2 }, 'greater-second-wind'),
    choice('hundredfold-fate', 'Hundredfold Fate', '◆', 'All Fated effects trigger 14% more often; +30% loot and mastery gain.', { fatedAmplifier: 0.14, lootFind: 0.3, masteryGain: 0.3 })
  ] }
];

// Retained as migration-only Legacy Imprints. Characters from v1.1 keep every
// invested bonus while their earned Legacy ranks become banked Paragon ranks.
export const LEGACY_PATHS = [
  { id: 'worldfire', name: 'Worldfire', icon: '☉', color: '#e17858', maxRank: 25, summary: 'Preserved damage from the former Legacy path.', perRank: { powerScale: 0.008, ultimateDamage: 0.004 } },
  { id: 'unbroken-road', name: 'Unbroken Road', icon: '➶', color: '#70b9c5', maxRank: 25, summary: 'Speed, resource flow, and combat cadence.', perRank: { speed: 0.004, cooldown: 0.003, resourceGain: 0.005 } },
  { id: 'last-bell', name: 'Last Bell', icon: '♬', color: '#ba8ed1', maxRank: 25, summary: 'Pressure against elites, bosses, and high-tier operations.', perRank: { eliteDamage: 0.006, bossDamage: 0.008 } },
  { id: 'relic-memory', name: 'Relic Memory', icon: '◆', color: '#d9bc65', maxRank: 25, summary: 'Mastery and reward quality from repeated endgame play.', perRank: { masteryGain: 0.006, lootFind: 0.005, goldFind: 0.008 } }
];

const SPECIAL_LEVELS = {
  1: ['Covenant Sworn', 'Choose your first Pillar rank and begin the First Embers Journey.'],
  3: ['First Imprint', 'The first combat-changing Skill Imprints become available.'],
  5: ['First Ascension', 'Choose the first permanent Ascension boon.'],
  6: ['Journey Chapter II', 'The Broken Choir Journey opens.'],
  10: ['Flask Reinforced', 'Gain an additional potion charge and a new Ascension choice.'],
  12: ['Journey Chapter III', 'The Bloodwater Journey opens.'],
  15: ['Third Ascension', 'Commit to an execution, Confluence, or hunting identity.'],
  18: ['Journey Chapter IV', 'The Crownless March Journey opens.'],
  20: ['Fated Awakening', 'An additional potion charge and behavior-changing Ascension effects unlock.'],
  24: ['Journey Chapter V', 'The Fifth Road Journey opens.'],
  25: ['Masterwork Foundry', 'Foundry Masterworking and the fifth Ascension open.'],
  30: ['Campaign Veteran', 'Gain an additional potion charge and the sixth Ascension.'],
  31: ['World Reclaimer', 'Post-campaign exploration gains its own Journey chapter.'],
  35: ['Starlit Preparation', 'The seventh Ascension opens for specialized builds.'],
  37: ['Faction Champion', 'Faction, contract, and Masterworking goals become the main road.'],
  40: ['Starlit Flask', 'Gain an additional potion charge and the eighth Ascension.'],
  43: ['Relic Architect', 'A new Journey chapter focuses on gearcraft and operations.'],
  45: ['Fated Mastery', 'Choose an advanced trigger effect for your build.'],
  49: ['Apex Covenant', 'High-tier operation objectives become active.'],
  50: ['Apex Flask', 'Gain an additional potion charge and the tenth Ascension.'],
  55: ['Worldfall Road', 'The final original Journey chapter begins.'],
  60: ['Worldfall Ascension', 'Choose a capstone Ascension and open the veteran road.'],
  61: ['Ashen Vanguard', 'The first upper-road Journey chapter opens.'],
  65: ['Vanguard Ascension', 'Choose the first veteran Ascension.'],
  66: ['Anvilbound', 'A gear-perfection Journey chapter opens.'],
  70: ['Anvilbound Ascension', 'Gain another flask charge and choose a perfected-build boon.'],
  71: ['Rift Cartographer', 'Regional mastery becomes the next Journey chapter.'],
  75: ['Rift Ascension', 'Choose how your covenant crosses the upper road.'],
  76: ['Nemesis Hunter', 'Boss, elite, and execution objectives open.'],
  80: ['Nemesis Ascension', 'Gain another flask charge and choose a great-foe doctrine.'],
  81: ['Choirbreaker', 'Advanced dual-oath mastery becomes the main road.'],
  85: ['Choirbreaker Ascension', 'Choose a final Companion, Hybrid, or cadence identity.'],
  86: ['Apex Architect', 'Perfected loadout objectives open.'],
  90: ['Architect Ascension', 'Gain another flask charge and define the finished arsenal.'],
  91: ['Worldscar Sovereign', 'The hardest world-pressure Journey begins.'],
  95: ['Sovereign Ascension', 'Choose an apex offense, hunt, or defense doctrine.'],
  96: ['The Hundredth Bell', 'The final mortal Journey chapter opens.'],
  100: ['Paragon Awakening', 'Choose the Hundredth Ascension, gain a flask charge, and awaken the Paragon Atlas.']
};

export const LEVEL_REWARDS = Array.from({ length: 100 }, (_, index) => {
  const level = index + 1;
  const special = SPECIAL_LEVELS[level];
  const pillar = level === 1 || level % 2 === 0;
  const ascension = ASCENSION_TIERS.some((tier) => tier.level === level);
  const upperRoad = level > 60;
  return {
    level,
    name: special?.[0] ?? (pillar ? (upperRoad ? 'Apex Pillar Ember' : 'Pillar Ember') : (upperRoad ? 'Apex Road Cache' : 'Road Cache')),
    description: special?.[1] ?? (pillar ? 'Gain one Pillar point for permanent build growth.' : 'Gain a level-scaled cache of gold and crafting materials.'),
    pillar,
    cache: level > 1 && level % 2 === 1,
    ascension,
    potion: level > 1 && level % 10 === 0,
    skill: level > 1 && level <= 60,
    paragon: level === 100
  };
});

export const journeyBandForLevel = (level) => JOURNEY_BANDS.find((band) => level >= band.minLevel && level <= band.maxLevel) ?? JOURNEY_BANDS.at(-1);
export const journeyBandById = (id) => JOURNEY_BANDS.find((band) => band.id === id) ?? null;
export const pillarById = (id) => PILLARS.find((pillar) => pillar.id === id) ?? null;
export const ascensionTierForLevel = (level) => ASCENSION_TIERS.find((tier) => tier.level === Number(level)) ?? null;
export const ascensionChoiceById = (level, id) => ascensionTierForLevel(level)?.choices.find((entry) => entry.id === id) ?? null;
export const legacyPathById = (id) => LEGACY_PATHS.find((path) => path.id === id) ?? null;
export const legacyXpForRank = (rank) => Math.floor(3200 + Math.max(0, rank) * 520 + Math.max(0, rank) ** 2 * 18);
