// The Paragon Atlas begins at level 100. Each board uses the same readable
// topology but expresses a different endgame identity. Players must route to a
// Gate node to earn the sigil that attaches another board, so opening the full
// Atlas requires real investment rather than a menu unlock.

const NODE_COSTS = { normal: 1, magic: 1, rare: 2, socket: 1, legendary: 3, keystone: 4, gate: 1 };
const NODE_ICONS = { normal: '·', magic: '✦', rare: '◆', socket: '◇', legendary: '☉', keystone: '✹', gate: '⬡' };

const layout = [
  ['entry', 50, 91, 'normal', []],
  ['left-one', 35, 80, 'normal', ['entry']],
  ['right-one', 65, 80, 'normal', ['entry']],
  ['left-two', 25, 66, 'magic', ['left-one']],
  ['right-two', 75, 66, 'magic', ['right-one']],
  ['left-rare', 15, 50, 'rare', ['left-two']],
  ['right-rare', 85, 50, 'rare', ['right-two']],
  ['socket', 50, 61, 'socket', ['left-two', 'right-two'], true],
  ['left-bridge', 35, 44, 'magic', ['left-rare', 'socket'], true],
  ['right-bridge', 65, 44, 'magic', ['right-rare', 'socket'], true],
  ['legendary', 50, 31, 'legendary', ['left-bridge', 'right-bridge'], true],
  ['left-crown', 35, 18, 'rare', ['legendary']],
  ['right-crown', 65, 18, 'rare', ['legendary']],
  ['keystone', 21, 6, 'keystone', ['left-crown']],
  ['gate', 79, 6, 'gate', ['right-crown']]
];

const defineBoard = ({ id, name, icon, color, minRank, summary, nodes }) => {
  const idFor = (key) => `${id}:${key}`;
  return {
    id, name, icon, color, minRank, summary,
    entryNodeId: idFor('entry'),
    nodes: layout.map(([key, x, y, type, requirements, any]) => {
      const definition = nodes[key];
      return {
        id: idFor(key), key, x, y, type,
        name: definition.name,
        description: definition.description,
        modifiers: definition.modifiers ?? {},
        special: definition.special ?? null,
        cost: NODE_COSTS[type],
        icon: NODE_ICONS[type],
        requires: any ? [] : requirements.map(idFor),
        requiresAny: any ? requirements.map(idFor) : []
      };
    })
  };
};

const n = (name, description, modifiers = {}, special = null) => ({ name, description, modifiers, special });

export const PARAGON_BOARDS = [
  defineBoard({
    id: 'covenant-heart', name: 'Covenant Heart', icon: '✦', color: '#d8b56c', minRank: 0,
    summary: 'The first board: balanced survival, damage, and dual-oath cadence.',
    nodes: {
      entry: n('First Ember', '+3% power and maximum health.', { powerScale: 0.03, hpScale: 0.03 }),
      'left-one': n('Tempered Blood', '+3% maximum health.', { hpScale: 0.03 }),
      'right-one': n('Tempered Edge', '+3% power.', { powerScale: 0.03 }),
      'left-two': n('Steady Pulse', '+6% barrier strength.', { ward: 0.06 }),
      'right-two': n('Woven Strike', '+6% Hybrid damage.', { hybridDamage: 0.06 }),
      'left-rare': n('Road-Worn', '+8% maximum health and +8% armor.', { hpScale: 0.08, armorScale: 0.08 }),
      'right-rare': n('Two Voices', '+10% Companion damage and +10% Resonance gain.', { companionDamage: 0.1, resonanceGain: 0.1 }),
      socket: n('Heart Glyph Socket', 'Socket one discovered Paragon glyph.'),
      'left-bridge': n('Enduring Oath', '+5% armor and +4% movement speed.', { armorScale: 0.05, speed: 0.04 }),
      'right-bridge': n('Oath Cadence', '+5% cooldown recovery and +6% resource generation.', { cooldown: 0.05, resourceGain: 0.06 }),
      legendary: n('Covenant Temper', '+16% Hybrid and Ultimate damage; +12% barrier strength.', { hybridDamage: 0.16, ultimateDamage: 0.16, ward: 0.12 }),
      'left-crown': n('Unbroken Road', '+10% maximum health and +6% movement speed.', { hpScale: 0.1, speed: 0.06 }),
      'right-crown': n('Concordant Road', '+12% Companion damage and +12% mastery gain.', { companionDamage: 0.12, masteryGain: 0.12 }),
      keystone: n('Oaths Become One', 'Confluence can surge again; Hybrid hits build Resonance faster.', { confluenceSurge: 0.14, resonanceGain: 0.2, confluenceDamage: 0.18 }),
      gate: n('Heart Gate', 'Earn one Board Sigil and +5% power.', { powerScale: 0.05 })
    }
  }),
  defineBoard({
    id: 'warpath', name: 'Warpath of Ruin', icon: '⚔', color: '#d66b58', minRank: 10,
    summary: 'Critical pressure, stagger, area damage, and decisive attacks.',
    nodes: {
      entry: n('Ruin Kindled', '+4% attack damage.', { attackDamage: 0.04 }),
      'left-one': n('Serrated Intent', '+3% critical chance.', { crit: 0.03 }),
      'right-one': n('Heavy Hand', '+6% stagger dealt.', { staggerScale: 0.06 }),
      'left-two': n('Red Momentum', '+7% attack damage.', { attackDamage: 0.07 }),
      'right-two': n('Crushing Rhythm', '+8% stagger and +5% area.', { staggerScale: 0.08, area: 0.05 }),
      'left-rare': n('Merciless Geometry', '+6% critical chance and +12% critical-burst chance.', { crit: 0.06, criticalBurst: 0.12 }),
      'right-rare': n('Bellbreaker', '+16% stagger and +12% boss damage.', { staggerScale: 0.16, bossDamage: 0.12 }),
      socket: n('Ruin Glyph Socket', 'Socket one discovered Paragon glyph.'),
      'left-bridge': n('Cut the Horizon', '+9% area.', { area: 0.09 }),
      'right-bridge': n('Final Cadence', '+9% Ultimate damage.', { ultimateDamage: 0.09 }),
      legendary: n('A Thousand Cuts', '+18% attack damage; direct attacks can echo.', { attackDamage: 0.18, echoStrike: 0.12 }),
      'left-crown': n('Red Wake', '+15% damage to marked prey.', { markedDamage: 0.15 }),
      'right-crown': n('Apex Violence', '+18% elite and boss damage.', { eliteDamage: 0.18, bossDamage: 0.18 }),
      keystone: n('Worldfire Engine', 'Critical hits burst and attacks echo more often.', { criticalBurst: 0.18, echoStrike: 0.16, area: 0.15 }),
      gate: n('Ruin Gate', 'Earn one Board Sigil and +8% Ultimate damage.', { ultimateDamage: 0.08 })
    }
  }),
  defineBoard({
    id: 'unbroken-aegis', name: 'The Unbroken Aegis', icon: '⬡', color: '#76b18d', minRank: 10,
    summary: 'Barriers, armor, recovery, and a second chance in lethal fights.',
    nodes: {
      entry: n('Ward Seed', '+5% barrier strength.', { ward: 0.05 }),
      'left-one': n('Deep Breath', '+4% maximum health.', { hpScale: 0.04 }),
      'right-one': n('Iron Memory', '+4% armor.', { armorScale: 0.04 }),
      'left-two': n('Mending Ward', '+8% barrier strength.', { ward: 0.08 }),
      'right-two': n('Plated Oath', '+8% armor.', { armorScale: 0.08 }),
      'left-rare': n('Life Refuses', '+12% maximum health and +3% life on kill.', { hpScale: 0.12, lifeOnKill: 0.03 }),
      'right-rare': n('Citadel Skin', '+14% armor and 6% warded damage reduction.', { armorScale: 0.14, wardDamageReduction: 0.06 }),
      socket: n('Aegis Glyph Socket', 'Socket one discovered Paragon glyph.'),
      'left-bridge': n('Potent Flask', 'Potions grant stronger protection.', { potionReduction: 0.08 }),
      'right-bridge': n('Living Rampart', '+10% barrier strength.', { ward: 0.1 }),
      legendary: n('Wardstorm', 'Barrier creation can release a damaging pulse.', { wardPulse: 0.18, ward: 0.16 }),
      'left-crown': n('Last Breath', '+15% maximum health.', { hpScale: 0.15 }),
      'right-crown': n('Never Yield', '+10% armor and +8% cooldown recovery.', { armorScale: 0.1, cooldown: 0.08 }),
      keystone: n('Refuse the Final Bell', 'Survive one lethal hit every 60 seconds.', { hpScale: 0.12 }, 'paragon-second-wind'),
      gate: n('Aegis Gate', 'Earn one Board Sigil and +8% maximum health.', { hpScale: 0.08 })
    }
  }),
  defineBoard({
    id: 'twin-oath', name: 'Twin-Oath Nexus', icon: '✹', color: '#a88ade', minRank: 25,
    summary: 'Companion techniques, Resonance, Hybrid signatures, and Confluence.',
    nodes: {
      entry: n('Second Voice', '+5% Companion damage.', { companionDamage: 0.05 }),
      'left-one': n('Shared Breath', '+5% resource generation.', { resourceGain: 0.05 }),
      'right-one': n('Shared Edge', '+5% Hybrid damage.', { hybridDamage: 0.05 }),
      'left-two': n('Resonant Vessel', '+9% Resonance gain.', { resonanceGain: 0.09 }),
      'right-two': n('Pact Weapon', '+9% Companion damage.', { companionDamage: 0.09 }),
      'left-rare': n('Choir of Two', '+16% Companion damage and +10% cooldown recovery.', { companionDamage: 0.16, cooldown: 0.1 }),
      'right-rare': n('Confluence Crucible', '+16% Hybrid and charged Confluence damage.', { hybridDamage: 0.16, confluenceDamage: 0.16 }),
      socket: n('Nexus Glyph Socket', 'Socket one discovered Paragon glyph.'),
      'left-bridge': n('Answering Echo', 'Direct attacks can echo.', { echoStrike: 0.09 }),
      'right-bridge': n('Surging Accord', 'Confluence surges more often.', { confluenceSurge: 0.09 }),
      legendary: n('Perfect Rotation', '+20% mastery and Resonance gain; +12% Hybrid damage.', { masteryGain: 0.2, resonanceGain: 0.2, hybridDamage: 0.12 }),
      'left-crown': n('Companion Sovereign', '+20% Companion damage.', { companionDamage: 0.2 }),
      'right-crown': n('Hybrid Sovereign', '+20% Hybrid damage.', { hybridDamage: 0.2 }),
      keystone: n('The Third Voice', 'Confluence surges can echo the last Companion Technique.', { confluenceSurge: 0.2, companionDamage: 0.22, echoStrike: 0.12 }),
      gate: n('Nexus Gate', 'Earn one Board Sigil and +10% Resonance gain.', { resonanceGain: 0.1 })
    }
  }),
  defineBoard({
    id: 'stormstride', name: 'Stormstride Circuit', icon: '➶', color: '#67bdca', minRank: 25,
    summary: 'Movement, cooldowns, projectiles, dashes, and repeated attacks.',
    nodes: {
      entry: n('Quick Current', '+3% movement speed.', { speed: 0.03 }),
      'left-one': n('Loose Draw', '+5% projectile damage.', { projectileDamage: 0.05 }),
      'right-one': n('Fleet Blood', '+4% cooldown recovery.', { cooldown: 0.04 }),
      'left-two': n('Splitting Wind', 'Projectiles fork more often.', { projectileFork: 0.08 }),
      'right-two': n('Fast Hands', '+7% cooldown recovery.', { cooldown: 0.07 }),
      'left-rare': n('Arrowstorm', '+16% projectile damage and +10% area.', { projectileDamage: 0.16, area: 0.1 }),
      'right-rare': n('Never Still', '+8% movement speed and +12% resource generation.', { speed: 0.08, resourceGain: 0.12 }),
      socket: n('Storm Glyph Socket', 'Socket one discovered Paragon glyph.'),
      'left-bridge': n('Ashen Trail', 'Dashes leave damaging rifts more often.', { dashNova: 0.1 }),
      'right-bridge': n('Afterimage', 'Direct attacks gain echo chance.', { echoStrike: 0.1 }),
      legendary: n('Lightning Cadence', '+12% cooldown recovery; attacks and projectiles repeat more often.', { cooldown: 0.12, echoStrike: 0.1, projectileFork: 0.1 }),
      'left-crown': n('Riftwalker', '+15% dash damage and +8% area.', { dashDamageScale: 0.15, area: 0.08 }),
      'right-crown': n('Horizon Hunter', '+18% projectile damage and +5% critical chance.', { projectileDamage: 0.18, crit: 0.05 }),
      keystone: n('Perpetual Motion', 'Movement feeds cooldown, echo, fork, and dash-rift effects.', { speed: 0.1, cooldown: 0.1, echoStrike: 0.12, projectileFork: 0.12, dashNova: 0.12 }),
      gate: n('Storm Gate', 'Earn one Board Sigil and +5% movement speed.', { speed: 0.05 })
    }
  }),
  defineBoard({
    id: 'predator-throne', name: 'Predator Throne', icon: '†', color: '#dc846b', minRank: 40,
    summary: 'Marked prey, executions, elite hunts, and sustained boss pressure.',
    nodes: {
      entry: n('Scent of Ash', '+5% elite damage.', { eliteDamage: 0.05 }),
      'left-one': n('Marked Step', '+6% damage to marked prey.', { markedDamage: 0.06 }),
      'right-one': n('Great-Foe Lore', '+6% boss damage.', { bossDamage: 0.06 }),
      'left-two': n('Widen the Window', '+3% execution threshold.', { executeThreshold: 0.03 }),
      'right-two': n('Trophy Edge', '+9% boss damage.', { bossDamage: 0.09 }),
      'left-rare': n('Red Judgment', '+8% execution threshold; executions heal.', { executeThreshold: 0.08, executionHeal: 0.04 }),
      'right-rare': n('Apex Stalker', '+18% elite and boss damage.', { eliteDamage: 0.18, bossDamage: 0.18 }),
      socket: n('Predator Glyph Socket', 'Socket one discovered Paragon glyph.'),
      'left-bridge': n('Chain Sentence', 'Executions cascade more often.', { executionCascade: 0.1 }),
      'right-bridge': n('Doom Mark', '+12% damage to marked prey.', { markedDamage: 0.12 }),
      legendary: n('No Escape', '+10% execution threshold and +22% marked damage.', { executeThreshold: 0.1, markedDamage: 0.22 }),
      'left-crown': n('Harvest the Fallen', 'Elite kills create a barrier.', { soulLeech: 0.12 }),
      'right-crown': n('Bossbreaker', '+25% boss damage and +15% stagger.', { bossDamage: 0.25, staggerScale: 0.15 }),
      keystone: n('Sentence Without End', 'Executions cascade, heal, and sharply pressure nearby marked prey.', { executionCascade: 0.2, executionHeal: 0.06, markedDamage: 0.25 }),
      gate: n('Predator Gate', 'Earn one Board Sigil and +10% elite damage.', { eliteDamage: 0.1 })
    }
  }),
  defineBoard({
    id: 'relic-weaver', name: 'Relic Weaver', icon: '◆', color: '#dfbd69', minRank: 40,
    summary: 'Fated triggers, mastery, rare rewards, and the perfected loadout.',
    nodes: {
      entry: n('Relic Sense', '+4% loot find.', { lootFind: 0.04 }),
      'left-one': n('Patient Craft', '+5% mastery gain.', { masteryGain: 0.05 }),
      'right-one': n('Golden Thread', '+8% gold find.', { goldFind: 0.08 }),
      'left-two': n('Fate Spark', 'Fated affixes trigger more often.', { fatedAmplifier: 0.025 }),
      'right-two': n('Deep Archive', '+8% loot find.', { lootFind: 0.08 }),
      'left-rare': n('Master Artisan', '+18% mastery gain and +12% resource generation.', { masteryGain: 0.18, resourceGain: 0.12 }),
      'right-rare': n('Mythic Appetite', '+18% loot find and +20% gold find.', { lootFind: 0.18, goldFind: 0.2 }),
      socket: n('Relic Glyph Socket', 'Socket one discovered Paragon glyph.'),
      'left-bridge': n('Echo Etching', 'Attacks echo more often.', { echoStrike: 0.08 }),
      'right-bridge': n('Forked Inscription', 'Projectiles fork more often.', { projectileFork: 0.08 }),
      legendary: n('Fate-Touched Arsenal', 'All behavior-changing Fated affixes trigger more often.', { fatedAmplifier: 0.08 }),
      'left-crown': n('Critical Provenance', '+5% critical chance and critical-burst chance.', { crit: 0.05, criticalBurst: 0.1 }),
      'right-crown': n('Boundless Study', '+24% mastery gain and +10% loot find.', { masteryGain: 0.24, lootFind: 0.1 }),
      keystone: n('Sovereign of Chance', 'Fated effects trigger far more often and carry wider area.', { fatedAmplifier: 0.12, area: 0.15, lootFind: 0.12 }),
      gate: n('Relic Gate', 'Earn one Board Sigil and +8% loot find.', { lootFind: 0.08 })
    }
  }),
  defineBoard({
    id: 'worldfall-dominion', name: 'Worldfall Dominion', icon: '△', color: '#ef9d63', minRank: 60,
    summary: 'The final Atlas board for high-tier operations and apex bosses.',
    nodes: {
      entry: n('Apex Ember', '+6% boss damage.', { bossDamage: 0.06 }),
      'left-one': n('Worldscar', '+5% area.', { area: 0.05 }),
      'right-one': n('Final Psalm', '+6% Ultimate damage.', { ultimateDamage: 0.06 }),
      'left-two': n('Tierbreaker', '+8% elite damage.', { eliteDamage: 0.08 }),
      'right-two': n('Last Weapon', '+10% Ultimate damage.', { ultimateDamage: 0.1 }),
      'left-rare': n('Operation Sovereign', '+18% elite damage and +12% area.', { eliteDamage: 0.18, area: 0.12 }),
      'right-rare': n('The Final Toll', '+20% boss and Ultimate damage.', { bossDamage: 0.2, ultimateDamage: 0.2 }),
      socket: n('Worldfall Glyph Socket', 'Socket one discovered Paragon glyph.'),
      'left-bridge': n('Apex Ward', '+12% maximum health and barrier strength.', { hpScale: 0.12, ward: 0.12 }),
      'right-bridge': n('Apex Cadence', '+10% cooldown and Resonance gain.', { cooldown: 0.1, resonanceGain: 0.1 }),
      legendary: n('Dominion Engine', '+22% Hybrid, Ultimate, elite, and boss damage.', { hybridDamage: 0.22, ultimateDamage: 0.22, eliteDamage: 0.22, bossDamage: 0.22 }),
      'left-crown': n('Endless Siege', '+18% area and +15% stagger.', { area: 0.18, staggerScale: 0.15 }),
      'right-crown': n('Endless Hunt', '+25% boss damage and +6% critical chance.', { bossDamage: 0.25, crit: 0.06 }),
      keystone: n('The World Answers', 'Ultimate and Confluence effects can surge, echo, and burst together.', { ultimateDamage: 0.3, confluenceSurge: 0.18, echoStrike: 0.12, criticalBurst: 0.12, area: 0.15 }),
      gate: n('Dominion Gate', 'The final Gate grants +12% power.', { powerScale: 0.12 })
    }
  })
];

const glyph = (id, name, icon, color, summary, perRank, milestones) => ({ id, name, icon, color, summary, maxRank: 10, perRank, milestones });

export const PARAGON_GLYPHS = [
  glyph('ember', 'Ember', '☉', '#df7658', 'Raw power and Hybrid force.', { powerScale: 0.006, hybridDamage: 0.006 }, [
    { rank: 5, name: 'Bright Ember', modifiers: { crit: 0.03 } },
    { rank: 10, name: 'Worldfire', modifiers: { criticalBurst: 0.12, area: 0.08 } }
  ]),
  glyph('bulwark', 'Bulwark', '⬡', '#77ad8d', 'Health, armor, and living barriers.', { hpScale: 0.008, armorScale: 0.006 }, [
    { rank: 5, name: 'Living Wall', modifiers: { ward: 0.1 } },
    { rank: 10, name: 'Wardstorm', modifiers: { wardPulse: 0.12, wardDamageReduction: 0.05 } }
  ]),
  glyph('cadence', 'Cadence', '⌁', '#70bfc8', 'Cooldown and resource flow.', { cooldown: 0.004, resourceGain: 0.006 }, [
    { rank: 5, name: 'Quickened', modifiers: { speed: 0.05 } },
    { rank: 10, name: 'Unbroken Motion', modifiers: { echoStrike: 0.1 } }
  ]),
  glyph('hunter', 'Hunter', '†', '#d98a6e', 'Elites, bosses, and marked prey.', { eliteDamage: 0.007, bossDamage: 0.007 }, [
    { rank: 5, name: 'Doom Mark', modifiers: { markedDamage: 0.12 } },
    { rank: 10, name: 'Final Sentence', modifiers: { executeThreshold: 0.06, executionCascade: 0.1 } }
  ]),
  glyph('fate', 'Fate', '◆', '#dabb68', 'Loot quality and Fated effects.', { lootFind: 0.007, goldFind: 0.009 }, [
    { rank: 5, name: 'Fate Spark', modifiers: { fatedAmplifier: 0.03 } },
    { rank: 10, name: 'Sovereign Chance', modifiers: { fatedAmplifier: 0.06 } }
  ]),
  glyph('echo', 'Echo', '↻', '#a58cdb', 'Repeated attacks and Confluence surges.', { echoStrike: 0.005, confluenceSurge: 0.004 }, [
    { rank: 5, name: 'Double Voice', modifiers: { companionDamage: 0.12 } },
    { rank: 10, name: 'Resounding', modifiers: { confluenceDamage: 0.18, resonanceGain: 0.12 } }
  ]),
  glyph('blood', 'Blood', '✚', '#c85e70', 'Execution recovery and sustained aggression.', { lifeOnKill: 0.002, markedDamage: 0.006 }, [
    { rank: 5, name: 'Red Mercy', modifiers: { executionHeal: 0.04 } },
    { rank: 10, name: 'Harvest', modifiers: { soulLeech: 0.1, executeThreshold: 0.05 } }
  ]),
  glyph('storm', 'Storm', '➶', '#66b8d1', 'Projectiles, dashes, and wide attacks.', { projectileDamage: 0.007, area: 0.005 }, [
    { rank: 5, name: 'Forked Wind', modifiers: { projectileFork: 0.1 } },
    { rank: 10, name: 'Riftstorm', modifiers: { dashNova: 0.12, dashDamageScale: 0.15 } }
  ]),
  glyph('choir', 'Choir', '♬', '#b38ddb', 'Companion techniques and Resonance.', { companionDamage: 0.008, resonanceGain: 0.006 }, [
    { rank: 5, name: 'Second Voice', modifiers: { masteryGain: 0.12 } },
    { rank: 10, name: 'Perfect Accord', modifiers: { hybridDamage: 0.18, confluenceSurge: 0.08 } }
  ]),
  glyph('apex', 'Apex', '△', '#ee9c62', 'Ultimate damage and high-tier pressure.', { ultimateDamage: 0.008, staggerScale: 0.005 }, [
    { rank: 5, name: 'Bossbreaker', modifiers: { bossDamage: 0.15 } },
    { rank: 10, name: 'Final Toll', modifiers: { ultimateDamage: 0.2, criticalBurst: 0.1 } }
  ])
];

export const PARAGON_ENTRY_BOARD_ID = 'covenant-heart';
export const PARAGON_MAX_RANK = 180;

export const paragonBoardById = (id) => PARAGON_BOARDS.find((board) => board.id === id) ?? null;
export const paragonNodeById = (id) => {
  for (const board of PARAGON_BOARDS) {
    const node = board.nodes.find((entry) => entry.id === id);
    if (node) return { ...node, boardId: board.id };
  }
  return null;
};
export const paragonGlyphById = (id) => PARAGON_GLYPHS.find((entry) => entry.id === id) ?? null;
export const paragonXpForRank = (rank) => Math.floor(4200 + Math.max(0, rank) * 620 + Math.max(0, rank) ** 2 * 14);
export const glyphUpgradeCost = (rank) => 3 + Math.max(1, rank) * 2;

