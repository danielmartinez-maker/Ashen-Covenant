import { CLASSES, CLASS_IDS } from './classes.js';

export const ABILITY_SLOTS = ['attack', 'skillOne', 'skillTwo', 'dodge', 'ultimate'];
const slug = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const abilityIdFor = (classId, slot) => {
  const ability = CLASSES[classId]?.abilities?.[slot];
  return ability ? `${classId}:${slug(ability.name)}` : `${classId}:${slot}`;
};

const PROFILES = {
  warden: { words: ['Vow', 'Nail', 'Sentinel', 'Judgment'], damage: 'spirit', status: 'marked', summon: 'oath-sentinel', terrain: 'warded-ground' },
  thornseer: { words: ['Briar', 'Moonroot', 'Bloodbloom', 'Hex'], damage: 'thorn', status: 'cursed', summon: 'thorn-wisp', terrain: 'briar-ground' },
  ironbound: { words: ['Chain', 'Citadel', 'Siege', 'Cairn'], damage: 'impact', status: 'sundered', summon: 'iron-standard', terrain: 'fortified-ground' },
  veilrunner: { words: ['Rift', 'Knife', 'Shade', 'Horizon'], damage: 'shadow', status: 'exposed', summon: 'veil-echo', terrain: 'smoke-ground' },
  gravebinder: { words: ['Marrow', 'Procession', 'Ossuary', 'Toll'], damage: 'grave', status: 'cursed', summon: 'revenant', terrain: 'mourning-ground' },
  dawnstrider: { words: ['Dawn', 'Javelin', 'Chorus', 'Sun'], damage: 'light', status: 'radiant-mark', summon: 'sun-avatar', terrain: 'solar-ground' }
};

const namesFor = (classId, slot) => {
  const p = PROFILES[classId];
  const ability = CLASSES[classId].abilities[slot].name;
  return [
    `${p.words[0]}: ${ability}`, `${p.words[1]} Refrain`, `${p.words[2]} Form`, `${p.words[3]} Covenant`
  ];
};

const rulesFor = (classId, slot) => {
  const p = PROFILES[classId];
  if (slot === 'attack') return [
    { shape: 'wide-cleave', comboRule: 'third-hit-projectile', damageType: p.damage, projectileBehavior: 'returning' },
    { shape: 'line-breaker', guardDamageMultiplier: 1.6, poiseDamageMultiplier: 1.45, knockback: 'heavy' },
    { shape: 'precision-chain', onCrit: 'chain-secondary', targetRule: 'nearest-controlled', status: p.status },
    { shape: 'harvest-arc', onKill: `summon:${p.summon}`, corpseInteraction: 'consume-one', executionRule: 'extend-window' }
  ];
  if (slot === 'skillOne') return [
    { shape: 'projectile-fan', projectileCount: 3, projectileBehavior: 'split-on-impact', status: p.status },
    { shape: 'orbit', projectileCount: 4, projectileBehavior: 'orbit-return', movement: 'cast-while-moving' },
    { shape: 'ground-line', terrainInteraction: p.terrain, projectileBehavior: 'pierce-and-anchor', status: p.status },
    { shape: 'seeking-projectile', damageType: p.damage, targetRule: 'seek-controlled', corpseInteraction: classId === 'gravebinder' ? 'raise-revenant' : 'mark-remains' }
  ];
  if (slot === 'skillTwo') return [
    { shape: 'aura', followCaster: true, fieldRule: 'mobile', status: p.status },
    { shape: 'ward', barrierMode: 'store-damage', retaliation: 'release-on-next-hit', guardRule: 'absorb-projectile' },
    { shape: 'moving-field', terrainInteraction: p.terrain, pull: classId === 'ironbound' || classId === 'gravebinder' ? 'inward' : 'none', fieldRule: 'travel-forward' },
    { shape: 'summon-field', summon: p.summon, summonLimit: 1, fieldRule: 'sentinel-attacks', status: p.status }
  ];
  if (slot === 'dodge') return [
    { movement: 'teleport', onArrival: 'strike', targetRule: 'nearest-controlled', invulnerable: true },
    { movement: 'dash-through', onPass: `apply:${p.status}`, knockback: classId === 'ironbound' ? 'heavy' : 'light', invulnerable: true },
    { movement: 'backstep', projectileCount: 2, projectileBehavior: 'counter-volley', damageType: p.damage },
    { movement: 'phase', terrainInteraction: `${p.terrain}-trail`, onExit: `summon:${p.summon}`, trailDuration: 2.5 }
  ];
  return [
    { shape: 'arena', phaseCount: 3, terrainInteraction: p.terrain, bossRule: 'phase-pressure' },
    { shape: 'avatar', summon: p.summon, summonLimit: 1, duration: 8, commandRule: 'mirror-casts' },
    { shape: 'execution-storm', executionRule: 'execute-controlled-chain', pull: 'center', status: p.status },
    { shape: 'moving-cataclysm', movement: 'follow-caster', retaliation: 'pulse-on-damage', damageType: p.damage, fieldRule: 'mobile-ultimate' }
  ];
};

const specialRules = {
  'warden:spirit-nail:0': { slug: 'impaling-vow', name: 'Impaling Vow', rules: { shape: 'melee', range: 78, projectileCount: 0, movement: 'lunge', guardDamageMultiplier: 1.5, status: 'marked' }, description: 'Spirit Nail becomes a committed impaling melee lunge that cracks Guard.' },
  'gravebinder:bone-comet:3': { slug: 'revenant-comet', name: 'Revenant Comet', rules: { shape: 'seeking-projectile', damageType: 'grave', targetRule: 'seek-corpse-nearby', corpseInteraction: 'raise-revenant', summonLimit: 1 }, description: 'Bone Comet raises one slain enemy as a temporary revenant after impact.' }
};

const buildMutation = (classId, slot, index, rules) => {
  const abilityId = abilityIdFor(classId, slot);
  const special = specialRules[`${abilityId}:${index}`];
  const genericSlug = slug(`${PROFILES[classId].words[index]}-${slot}-${index + 1}`);
  return {
    id: `${abilityId}:${special?.slug ?? genericSlug}`,
    abilityId,
    name: special?.name ?? namesFor(classId, slot)[index],
    description: special?.description ?? `Transforms ${CLASSES[classId].abilities[slot].name} through ${PROFILES[classId].words[index].toLowerCase()} rules rather than a numeric-only upgrade.`,
    rules: special?.rules ?? rules
  };
};

export const ABILITY_MUTATIONS = Object.fromEntries(CLASS_IDS.flatMap((classId) => ABILITY_SLOTS.map((slot) => {
  const abilityId = abilityIdFor(classId, slot);
  return [abilityId, rulesFor(classId, slot).map((rules, index) => buildMutation(classId, slot, index, rules))];
})));
export const mutationById = (abilityId, mutationId) => ABILITY_MUTATIONS[abilityId]?.find((entry) => entry.id === mutationId) ?? null;
export const mutationByAnyId = (mutationId) => Object.values(ABILITY_MUTATIONS).flat().find((entry) => entry.id === mutationId) ?? null;
