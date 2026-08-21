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
let nextHunter = 1;
const unique = (values = []) => [...new Set(values.filter(Boolean))];
const clone = (value) => JSON.parse(JSON.stringify(value));
const record = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

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
  return unique(out);
}

export class HunterSystem {
  normalize(hunter = {}) {
    hunter = record(hunter);
    return {
      id: hunter.id ?? `hunter-${nextHunter++}`,
      name: hunter.name ?? 'Scarred Hunter',
      templateId: hunter.templateId ?? 'mireling',
      factionId: hunter.factionId ?? 'grave',
      level: Math.max(1, Number(hunter.level) || 1),
      victories: Math.max(1, Number(hunter.victories) || 1),
      defeats: Math.max(0, Number(hunter.defeats) || 0),
      grudge: Math.max(1, Number(hunter.grudge) || 1),
      adaptations: unique(hunter.adaptations ?? hunter.traits ?? []).slice(0, 6),
      scars: unique(hunter.scars ?? []).slice(0, 6),
      knowledge: {
        damageTypes: unique(hunter.knowledge?.damageTypes ?? []),
        sources: unique(hunter.knowledge?.sources ?? []),
        covenants: unique(hunter.knowledge?.covenants ?? [])
      },
      targetRewardId: hunter.targetRewardId ?? rewardForFaction[hunter.factionId] ?? 'black-lantern',
      nextEligibleAt: Math.max(0, Number(hunter.nextEligibleAt) || 0),
      lastSeenAt: Math.max(0, Number(hunter.lastSeenAt) || 0),
      defeated: hunter.defeated === true,
      legacyNemesisId: hunter.legacyNemesisId ?? null
    };
  }

  createFromVictor(enemy = {}, context = {}) {
    const factionId = enemy.doctrineFaction ?? context.factionId ?? 'grave';
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
      nextEligibleAt: (context.now ?? 0) + 45
    });
  }

  recordVictory(hunter, context = {}) {
    const next = this.normalize(hunter);
    next.victories += 1;
    next.grudge = Math.min(99, next.grudge + 2);
    next.level = Math.min(120, next.level + 1);
    next.lastSeenAt = Math.max(next.lastSeenAt, Number(context.now) || 0);
    next.nextEligibleAt = next.lastSeenAt + Math.min(180, 35 + next.victories * 12);
    next.knowledge.damageTypes = unique([...next.knowledge.damageTypes, context.damageType]);
    next.knowledge.sources = unique([...next.knowledge.sources, context.source]);
    next.knowledge.covenants = unique([...next.knowledge.covenants, context.covenant?.primary]);
    const candidates = adaptationCandidates(context);
    for (const id of candidates) {
      if (!next.adaptations.includes(id)) next.adaptations.push(id);
      if (next.adaptations.length >= 6) break;
    }
    return next;
  }

  chooseIntrusion(hunters = [], { now = 0, zoneId = null } = {}) {
    const eligible = hunters.map((hunter) => this.normalize(hunter)).filter((hunter) => !hunter.defeated && hunter.nextEligibleAt <= now);
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
    next.defeats += 1;
    next.lastSeenAt = now;
    next.defeated = true;
    return { hunter: next, defeated: true, rewardId: next.targetRewardId };
  }
}
