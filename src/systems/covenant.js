import { defaultCovenantState } from './save-migrator.js';

export const ALIGNMENT_IDS = ['flame', 'grave', 'blood', 'light', 'storm', 'void'];
export const WORLD_TORMENTS = [
  ['pilgrim', 'Pilgrim', 1], ['veteran', 'Veteran', 20], ['torment', 'Torment', 50], ['nightmare', 'Nightmare', 75], ['worldfall', 'Worldfall', 100]
].map(([id, name, minLevel]) => ({ id, name, minLevel, family: 'World Torment' }));

const TAG_WEIGHTS = {
  mercy: { light: 2.2, blood: -0.3, void: -0.5 }, sacrifice: { blood: 1.8, light: 0.5 }, dominion: { void: 1.4, flame: 0.8, light: -0.4 },
  defile: { grave: 1.7, void: 0.9, light: -0.8 }, purify: { light: 1.9, grave: -0.6, void: -0.8 }, consume: { blood: 1.5, grave: 0.5, light: -0.3 },
  preserve: { light: 1.3, grave: 0.5, flame: -0.3 }, reckless: { flame: 1.6, storm: 0.9 }, vengeance: { blood: 1.1, grave: 0.8, light: -0.2 },
  stormbound: { storm: 2.2 }, gravebound: { grave: 2.2 }, voidbound: { void: 2.2 }, flamebound: { flame: 2.2 }, bloodbound: { blood: 2.2 }, lightbound: { light: 2.2 }
};
const STAGES = [0, 12, 28, 48, 68, 86];
const INCOMPATIBLE = new Set(['light:void', 'flame:void', 'light:grave']);
const HYBRIDS = {
  'flame:grave': { id: 'flame-grave', name: 'Ashwake', mechanic: 'Burned corpses return once as cinder revenants.' },
  'flame:storm': { id: 'flame-storm', name: 'Tempest Pyre', mechanic: 'Critical flame hits chain stormfire.' },
  'grave:blood': { id: 'grave-blood', name: 'Red Ossuary', mechanic: 'Bleeding deaths become harvestable corpses.' },
  'blood:void': { id: 'blood-void', name: 'Hollow Vein', mechanic: 'Spend health to blink through marked prey.' },
  'light:storm': { id: 'light-storm', name: 'Dawn Tempest', mechanic: 'Dodge pulses cleanse and arc lightning.' },
  'grave:void': { id: 'grave-void', name: 'Null Sepulchre', mechanic: 'Destroyed corpses leave pull fields.' },
  'blood:flame': { id: 'blood-flame', name: 'Sanguine Furnace', mechanic: 'Overheal becomes burning retaliation.' }
};
const canonicalPair = (a, b) => [a, b].sort((x, y) => ALIGNMENT_IDS.indexOf(x) - ALIGNMENT_IDS.indexOf(y)).join(':');
const bounded = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Number(value) || 0));
const clone = (value) => JSON.parse(JSON.stringify(value));

const ALIGNMENT_PRESENTATION = {
  flame: { aura: 'cinder-crown', eyes: 'ember', markings: 'char-lines', movement: 'ash-step', weapon: 'heated-edge', motif: 'forged-ember' },
  grave: { aura: 'grave-mist', eyes: 'pale-violet', markings: 'ossuary-runes', movement: 'mournful-drift', weapon: 'funeral-edge', motif: 'drowned-bell' },
  blood: { aura: 'blood-haze', eyes: 'crimson', markings: 'vein-script', movement: 'scarlet-trail', weapon: 'living-edge', motif: 'red-pulse' },
  light: { aura: 'dawn-halo', eyes: 'gold-white', markings: 'sun-script', movement: 'radiant-step', weapon: 'sun-edge', motif: 'first-light' },
  storm: { aura: 'storm-corona', eyes: 'electric-blue', markings: 'fork-runes', movement: 'static-step', weapon: 'arc-edge', motif: 'thunder-string' },
  void: { aura: 'null-vellum', eyes: 'black-star', markings: 'rift-script', movement: 'aftervoid', weapon: 'absence-edge', motif: 'hollow-choir' }
};

export class CovenantSystem {
  constructor(events = null) { this.events = events; }
  normalize(state) { return defaultCovenantState(state); }
  applyBehavior(input, tags = [], weight = 1, context = {}) {
    const state = this.normalize(input);
    const before = this.resolve(state);
    for (const tag of tags) {
      state.behaviorLedger[tag] = bounded((state.behaviorLedger[tag] ?? 0) + weight, 0, 9999);
      const weights = TAG_WEIGHTS[tag] ?? {};
      for (const id of ALIGNMENT_IDS) state.affinities[id] = bounded(state.affinities[id] + (weights[id] ?? 0) * weight);
    }
    if (context.regionId) state.regionalResonance[context.regionId] = bounded((state.regionalResonance[context.regionId] ?? 0) + weight, 0, 1000);
    const ranked = ALIGNMENT_IDS.map((id) => [id, state.affinities[id]]).sort((a, b) => b[1] - a[1]);
    const pair = canonicalPair(ranked[0][0], ranked[1][0]);
    if (INCOMPATIBLE.has(pair) && ranked[1][1] >= 8) state.instability = bounded(state.instability + weight * 1.5);
    else state.instability = bounded(state.instability - weight * 0.18);
    const pressure = ranked[0][1] + ranked[1][1] * 0.35;
    let nextStage = 0;
    STAGES.forEach((threshold, index) => { if (pressure >= threshold) nextStage = index; });
    state.stage = Math.max(state.stage, nextStage);
    const after = this.resolve(state);
    state.dominant = [after.primary, after.secondary].filter(Boolean);
    if (after.primary !== before.primary || after.secondary !== before.secondary) this.events?.emit('covenant:alignment-changed', { before, after });
    for (let stage = 1; stage <= state.stage; stage += 1) {
      if (state.thresholdsSeen.includes(stage)) continue;
      state.thresholdsSeen.push(stage);
      this.events?.emit('covenant:threshold-crossed', { stage, primary: after.primary, secondary: after.secondary, effects: after.effects });
    }
    return state;
  }
  resolve(input) {
    const state = this.normalize(input);
    const ranked = ALIGNMENT_IDS.map((id) => [id, state.affinities[id]]).sort((a, b) => b[1] - a[1] || ALIGNMENT_IDS.indexOf(a[0]) - ALIGNMENT_IDS.indexOf(b[0]));
    const primary = ranked[0][1] > 0 ? ranked[0][0] : null;
    const secondary = ranked[1][1] >= Math.max(8, ranked[0][1] * 0.52) ? ranked[1][0] : null;
    const pairKey = primary && secondary ? canonicalPair(primary, secondary) : null;
    const hybrid = pairKey ? HYBRIDS[pairKey] ?? { id: pairKey.replace(':', '-'), name: pairKey.split(':').map((v) => v[0].toUpperCase() + v.slice(1)).join(' + '), mechanic: `Instability converts ${primary} and ${secondary} reactions into volatile aftermaths.` } : null;
    const unstable = Boolean(pairKey && INCOMPATIBLE.has(pairKey));
    const stage = state.stage;
    const presentation = primary ? ALIGNMENT_PRESENTATION[primary] : { aura: null, eyes: null, markings: null, movement: null, weapon: null, motif: null };
    const spawnBias = Object.fromEntries(ALIGNMENT_IDS.map((id) => [id, id === primary ? stage * 0.08 + ranked[0][1] / 500 : id === secondary ? stage * 0.04 : 0]));
    const passives = {
      corpseInteraction: primary === 'grave' || hybrid?.id === 'grave-blood' || hybrid?.id === 'flame-grave',
      retaliationStorage: primary === 'light' && stage >= 2,
      bloodHarvest: primary === 'blood' && stage >= 2,
      dodgeArc: primary === 'storm' && stage >= 2,
      voidStep: primary === 'void' && stage >= 2,
      cinderExecute: primary === 'flame' && stage >= 2,
      unstableSurge: unstable && state.instability >= 18
    };
    return {
      state: clone(state), primary, secondary, hybrid, stage, instability: state.instability, unstable,
      effects: {
        abilityMode: primary ? `${primary}-mutation-stage-${stage}` : 'unbound',
        passives,
        spawnBias,
        bossVariant: primary ? `${primary}-${stage >= 4 ? 'sovereign' : 'resonant'}` : null,
        rewardTags: [primary, secondary, hybrid?.id].filter(Boolean),
        regional: primary ? { weather: `${primary}-pressure`, hostility: stage * 0.05, merchantBias: stage >= 2 ? primary : null } : {},
        presentation: { ...presentation, stage },
        audio: { motif: presentation.motif, intensity: Math.min(1, stage / 5 + state.instability / 200) }
      }
    };
  }
  getRegionResponse(state, regionId) {
    const resolved = this.resolve(state);
    return { regionId, primary: resolved.primary, weather: resolved.effects.regional.weather ?? 'neutral', spawnBias: resolved.effects.spawnBias, hunterPressure: resolved.stage >= 3 ? 0.08 + resolved.stage * 0.025 : 0 };
  }
  getBossVariant(state, bossId) {
    const resolved = this.resolve(state);
    return { bossId, covenant: resolved.primary, variantId: resolved.primary ? `${bossId}:${resolved.effects.bossVariant}` : `${bossId}:base`, instability: resolved.instability };
  }
  getRewardBias(state) { return this.resolve(state).effects.rewardTags; }
}
