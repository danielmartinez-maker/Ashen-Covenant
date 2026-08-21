// Progression that is earned in combat rather than only bought from a menu.
// Mastery rank is deliberately capped by character level: players can keep
// practicing a technique ahead of its next breakthrough, but cannot skip the
// rest of the covenant's growth curve.
export const MASTERY_ORDER = ['attack', 'skillOne', 'skillTwo', 'companion', 'hybrid', 'ultimate'];

export const MASTERY_TRACKS = {
  attack: {
    id: 'attack', name: 'Vanguard Discipline', icon: '⚔', baseGain: 4,
    thresholds: [0, 34, 102, 230, 430, 710], unlockLevels: [1, 1, 5, 10, 16, 23],
    desc: 'Every direct strike teaches the rhythm of your primary weapon.'
  },
  skillOne: {
    id: 'skillOne', name: 'First Rite', icon: '✦', baseGain: 8,
    thresholds: [0, 42, 126, 278, 500, 810], unlockLevels: [1, 1, 5, 10, 16, 23],
    desc: 'Sharpen the oath technique that opens your engagements.'
  },
  skillTwo: {
    id: 'skillTwo', name: 'Fieldcraft', icon: '◉', baseGain: 10,
    thresholds: [0, 48, 146, 318, 570, 920], unlockLevels: [1, 1, 5, 10, 16, 23],
    desc: 'Learn to control ground, space, and defensive timing.'
  },
  companion: {
    id: 'companion', name: 'Second Oath', icon: '⌁', baseGain: 13,
    thresholds: [0, 52, 158, 340, 600, 960], unlockLevels: [1, 1, 6, 11, 17, 24],
    desc: 'Your companion technique becomes a true part of the combat loop.'
  },
  hybrid: {
    id: 'hybrid', name: 'Confluence', icon: '✹', baseGain: 16,
    thresholds: [0, 58, 176, 372, 650, 1030], unlockLevels: [1, 1, 6, 12, 18, 25],
    desc: 'Master the named covenant created by your two oaths.'
  },
  ultimate: {
    id: 'ultimate', name: 'Final Testament', icon: '✺', baseGain: 26,
    thresholds: [0, 70, 210, 430, 730, 1140], unlockLevels: [1, 1, 8, 14, 20, 27],
    desc: 'Each invocation teaches you how to finish a fight decisively.'
  }
};

export const MASTERY_DOCTRINES = {
  attack: [
    { id: 'relentless', name: 'Relentless Cadence', icon: '↻', desc: 'Every third basic attack restores 12% of your class resource.' },
    { id: 'executioner', name: 'Executioner’s Cadence', icon: '✕', desc: 'Basic attacks deal 22% more damage to marked, cursed, or downed prey.' }
  ],
  skillOne: [
    { id: 'sunder', name: 'Sundering Thread', icon: '↠', desc: 'First Rite gains one pierce and deals 14% more to marked or cursed prey.' },
    { id: 'scatter', name: 'Scatter Vow', icon: '✧', desc: 'First Rite gains an additional split and its first hit causes heavy stagger.' }
  ],
  skillTwo: [
    { id: 'sanctuary', name: 'Sanctuary Pattern', icon: '⬡', desc: 'Fieldcraft grants a 6% maximum-health barrier when it is placed.' },
    { id: 'eruption', name: 'Eruption Pattern', icon: '✹', desc: 'Fieldcraft’s first damaging pulse deals 70% more damage and extra stagger.' }
  ],
  companion: [
    { id: 'accord', name: 'Accord', icon: '⌁', desc: 'Second Oath restores 12 resource and grants a 5% maximum-health barrier.' },
    { id: 'relay', name: 'Relay', icon: '⇢', desc: 'Second Oath empowers your next First Rite by 22% for 4 seconds.' }
  ],
  hybrid: [
    { id: 'aegis', name: 'Resonant Aegis', icon: '▣', desc: 'A Confluence-charged signature grants a larger barrier and extends it by 2 seconds.' },
    { id: 'ruin', name: 'Resonant Ruin', icon: '☉', desc: 'A Confluence-charged signature releases a delayed rupture around its target.' }
  ],
  ultimate: [
    { id: 'resurgence', name: 'Resurgence', icon: '✚', desc: 'Your ultimate restores 30% resource and grants one Confluence charge.' },
    { id: 'cataclysm', name: 'Cataclysm', icon: '☾', desc: 'Your ultimate leaves a powerful delayed aftershock, even without an imprint.' }
  ]
};

export const RELIC_BOND_THRESHOLDS = [0, 18, 58, 130];

export const RELIC_AWAKENINGS = {
  weapon: { name: 'Keening Edge', desc: 'At bond III, Confluence-charged hybrid attacks deal 12% more damage.' },
  head: { name: 'Watcher’s Wake', desc: 'At bond III, gain 4% cooldown recovery.' },
  chest: { name: 'Stoneward', desc: 'At bond III, barriers are 10% stronger.' },
  gloves: { name: 'Keen Hands', desc: 'At bond III, gain 4% critical chance.' },
  boots: { name: 'Roadbreaker', desc: 'At bond III, gain 5% movement speed.' },
  amulet: { name: 'Confluence Vessel', desc: 'At bond III, gain 15% more Resonance from varied actions.' },
  ring: { name: 'Runic Recital', desc: 'At bond III, gain 15% more ability mastery.' },
  offhand: { name: 'Echoing Hand', desc: 'At bond III, companion techniques deal 12% more damage.' }
};

export const getMasteryTrack = (id) => MASTERY_TRACKS[id] ?? null;
export const getMasteryDoctrine = (slot, id) => MASTERY_DOCTRINES[slot]?.find((doctrine) => doctrine.id === id) ?? null;

export const masteryRankFor = (track, xp, level) => {
  if (!track) return 0;
  const earned = track.thresholds.reduce((rank, threshold, index) => (xp >= threshold ? index : rank), 0);
  const unlocked = track.unlockLevels.reduce((rank, requirement, index) => (level >= requirement ? index : rank), 0);
  return Math.max(0, Math.min(earned, unlocked, track.thresholds.length - 1));
};

export const nextMasteryThreshold = (track, rank) => track?.thresholds?.[Math.min(track.thresholds.length - 1, rank + 1)] ?? 0;
export const relicBondRankFor = (xp) => RELIC_BOND_THRESHOLDS.reduce((rank, threshold, index) => (xp >= threshold ? index : rank), 0);
export const nextRelicBondThreshold = (rank) => RELIC_BOND_THRESHOLDS[Math.min(RELIC_BOND_THRESHOLDS.length - 1, rank + 1)] ?? 0;
