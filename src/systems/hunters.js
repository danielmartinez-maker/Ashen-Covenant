export const HUNTER_ADAPTATIONS = Object.freeze([
  { id: 'ironhide', trigger: 'burst', description: 'Hardens against burst damage.' },
  { id: 'nullstep', trigger: 'projectile', description: 'Uses short null-steps to cross projectile lanes.' },
  { id: 'grave-eater', trigger: 'corpse', description: 'Consumes nearby corpses to deny corpse builds.' },
  { id: 'blood-reprisal', trigger: 'burst', description: 'Retaliates after severe burst damage.' },
  { id: 'war-call', trigger: 'victory', description: 'Calls faction reinforcements.' },
  { id: 'scar-ground', trigger: 'fire', description: 'Seeds hostile ground after taking elemental pressure.' },
  { id: 'wardbreaker', trigger: 'barrier', description: 'Breaks player barriers and wards faster.' },
  { id: 'mirrorborn', trigger: 'projectile', description: 'Develops ranged pressure against projectile builds.' }
]);

const rewardForFaction = Object.freeze({
  grave: 'black-lantern', blood: 'black-lantern', iron: 'unbowed-pact', void: 'wraith-gallows', storm: 'worldspine'
});
const HUNTER_REWARD_IDS = new Set(Object.values(rewardForFaction));
const ADAPTATION_IDS = new Set(HUNTER_ADAPTATIONS.map((entry) => entry.id));
const FACTION_IDS = new Set(Object.keys(rewardForFaction));
let nextHunter = 1;
const array = (value) => Array.isArray(value) ? value : [];
const record = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const bounded = (value, fallback, min, max) => Math.max(min, Math.min(max, finite(value, fallback)));
const text = (value, fallback, max = 120) => typeof value === 'string' && value.trim() ? value.slice(0, max) : fallback;
const uniqueStrings = (values, { allowed = null, max = 24, maxLength = 80 } = {}) => [...new Set(array(values)
  .filter((value) => typeof value === 'string' && value.trim())
  .map((value) => value.slice(0, maxLength))
  .filter((value) => !allowed || allowed.has(value)))]
  .slice(0, max);
const clone = (value) => JSON.parse(JSON.stringify(value));
const reserveHunterId = (id) => {
  const match = /^hunter-(\d+)$/.exec(id);
  if (!match) return id;
  const numeric = Number(match[1]);
  if (Number.isSafeInteger(numeric) && numeric >= 0 && numeric < Number.MAX_SAFE_INTEGER) nextHunter = Math.max(nextHunter, numeric + 1);
  return id;
};

function adaptationCandidates(context = {}) {
  const source = String(context.source ?? '').toLowerCase();
  const damageType = String(context.damageType ?? '').toLowerCase();
  const out = [];
  if (context.burst) out.push('ironhide', 'blood-reprisal');
  if (context.barrierUsed) out.push('wardbreaker');
  if (context.corpseBuild) out.push('grave-eater');
  if (/projectile|bolt|arrow|spear|comet|javelin/.test(source)) out.push('nullstep', 'mirrorborn');
  if (/fire|blood/.test(source) || /fire|blood/.test(damageType)) out.push('scar-ground');
  out.push('war-call');
  return uniqueStrings(out, { allowed: ADAPTATION_IDS, max: 6 });
}

export class HunterSystem {
  normalize(hunter = {}) {
    hunter = record(hunter);
    const knowledge = record(hunter.knowledge);
    const factionId = FACTION_IDS.has(hunter.factionId) ? hunter.factionId : 'grave';
    const requestedRewardId = typeof hunter.targetRewardId === 'string' ? hunter.targetRewardId.trim() : '';
    const targetRewardId = HUNTER_REWARD_IDS.has(requestedRewardId)
      ? requestedRewardId
      : rewardForFaction[factionId] ?? 'black-lantern';
    const storedId = text(hunter.id, null, 96);
    const id = storedId ? reserveHunterId(storedId) : `hunter-${nextHunter++}`;
    return {
      id,
      name: text(hunter.name, 'Scarred Hunter', 120),
      templateId: text(hunter.templateId, 'mireling', 96),
      factionId,
      level: Math.floor(bounded(hunter.level, 1, 1, 120)),
      victories: Math.floor(bounded(hunter.victories, 1, 1, 1_000_000)),
      defeats: Math.floor(bounded(hunter.defeats, 0, 0, 1_000_000)),
      grudge: Math.floor(bounded(hunter.grudge, 1, 1, 99)),
      adaptations: uniqueStrings(array(hunter.adaptations).length ? hunter.adaptations : hunter.traits, { allowed: ADAPTATION_IDS, max: 6 }),
      scars: uniqueStrings(hunter.scars, { max: 6, maxLength: 120 }),
      knowledge: {
        damageTypes: uniqueStrings(knowledge.damageTypes, { max: 24 }),
        sources: uniqueStrings(knowledge.sources, { max: 24 }),
        covenants: uniqueStrings(knowledge.covenants, { max: 12 })
      },
      targetRewardId,
      nextEligibleAt: bounded(hunter.nextEligibleAt, 0, 0, Number.MAX_SAFE_INTEGER),
      lastSeenAt: bounded(hunter.lastSeenAt, 0, 0, Number.MAX_SAFE_INTEGER),
      defeated: hunter.defeated === true,
      legacyNemesisId: typeof hunter.legacyNemesisId === 'string' ? hunter.legacyNemesisId.slice(0, 96) : null
    };
  }

  createFromVictor(enemy = {}, context = {}) {
    const factionId = FACTION_IDS.has(enemy.doctrineFaction) ? enemy.doctrineFaction : FACTION_IDS.has(context.factionId) ? context.factionId : 'grave';
    const source = String(context.source ?? enemy.attack ?? 'unknown');
    const primary = context.covenant?.primary ?? null;
    return this.normalize({
      id: `hunter-${nextHunter++}`,
      name: `${['Scarred', 'Bell-Marked', 'Hollow-Eyed', 'Road-Bitten'][nextHunter % 4]} ${enemy.name ?? 'Hunter'}`,
      templateId: enemy.templateId ?? 'mireling',
      factionId,
      level: enemy.level ?? 1,
      victories: 1,
      grudge: 1,
      knowledge: { sources: [source], damageTypes: [], covenants: primary ? [primary] : [] },
      adaptations: adaptationCandidates({ source }).slice(0, 1),
      targetRewardId: rewardForFaction[factionId] ?? 'black-lantern',
      nextEligibleAt: finite(context.now, 0) + 45
    });
  }

  recordVictory(hunter, context = {}) {
    const next = this.normalize(hunter);
    next.victories = Math.min(1_000_000, next.victories + 1);
    next.grudge = Math.min(99, next.grudge + 2);
    next.level = Math.min(120, next.level + 1);
    next.lastSeenAt = Math.max(next.lastSeenAt, bounded(context.now, 0, 0, Number.MAX_SAFE_INTEGER));
    next.nextEligibleAt = Math.min(Number.MAX_SAFE_INTEGER, next.lastSeenAt + Math.min(180, 35 + next.victories * 12));
    next.knowledge.damageTypes = uniqueStrings([...next.knowledge.damageTypes, context.damageType], { max: 24 });
    next.knowledge.sources = uniqueStrings([...next.knowledge.sources, context.source], { max: 24 });
    next.knowledge.covenants = uniqueStrings([...next.knowledge.covenants, context.covenant?.primary], { max: 12 });
    const candidates = adaptationCandidates(context);
    for (const id of candidates) {
      if (!next.adaptations.includes(id)) next.adaptations.push(id);
      if (next.adaptations.length >= 6) break;
    }
    return next;
  }

  chooseIntrusion(hunters = [], { now = 0, zoneId = null } = {}) {
    const currentTime = bounded(now, 0, 0, Number.MAX_SAFE_INTEGER);
    const eligible = array(hunters).map((hunter) => this.normalize(hunter)).filter((hunter) => !hunter.defeated && hunter.nextEligibleAt <= currentTime);
    if (!eligible.length) return null;
    const preferred = eligible.find((hunter) => {
      if (zoneId === 'redfen') return hunter.factionId === 'blood';
      if (zoneId === 'cairnreach') return hunter.factionId === 'iron';
      if (zoneId === 'veiled-road') return hunter.factionId === 'void';
      if (zoneId === 'gravewake' || zoneId === 'bellscar') return hunter.factionId === 'grave';
      return false;
    });
    return clone(preferred ?? eligible.sort((a, b) => b.grudge - a.grudge || b.victories - a.victories)[0]);
  }

  decorateEnemy(enemy, hunter) {
    const state = this.normalize(hunter);
    const hpScale = 1 + state.victories * 0.13 + state.grudge * 0.025;
    const damageScale = 1 + state.victories * 0.075 + state.grudge * 0.018;
    const out = enemy;
    out.hunterId = state.id;
    out.name = state.name;
    out.maxHp = Math.round((out.maxHp ?? out.hp ?? 1) * hpScale);
    out.hp = out.maxHp;
    out.damage = Math.round((out.damage ?? 1) * damageScale);
    out.armor = (out.armor ?? 0) + (state.adaptations.includes('ironhide') ? 12 : 0);
    if (state.adaptations.includes('nullstep')) out.speed = (out.speed ?? 1) * 1.14;
    if (state.adaptations.includes('wardbreaker')) out.wardBreaker = 1.5;
    if (state.adaptations.includes('blood-reprisal')) out.hunterRetaliation = 0.2;
    if (state.adaptations.includes('grave-eater')) out.corpseDenial = true;
    if (state.adaptations.includes('war-call')) out.hunterReinforcement = true;
    if (state.adaptations.includes('scar-ground')) out.hunterHazard = true;
    out.hunterAdaptations = [...state.adaptations];
    out.targetDrop = true;
    out.targetRewardId = state.targetRewardId;
    return out;
  }

  recordDefeat(hunter, { now = 0 } = {}) {
    const next = this.normalize(hunter);
    next.defeats = Math.min(1_000_000, next.defeats + 1);
    next.lastSeenAt = bounded(now, 0, 0, Number.MAX_SAFE_INTEGER);
    next.defeated = true;
    return { hunter: next, defeated: true, rewardId: next.targetRewardId };
  }
}
