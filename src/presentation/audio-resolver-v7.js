import { clamp } from '../core/math.js';
import { audioDefinition } from '../data/audio-v7.js';

const MATERIAL_ASSET = Object.freeze({
  flesh: 'impact-flesh',
  plate: 'impact-plate',
  metal: 'impact-plate',
  stone: 'impact-stone',
  bone: 'impact-bone'
});

const FOOTSTEP_ASSET = Object.freeze({
  stone: 'footstep-stone-v5',
  metal: 'footstep-stone-v5',
  bone: 'footstep-stone-v5',
  ice: 'footstep-stone-v5',
  mud: 'footstep-mud-v5',
  dirt: 'footstep-mud-v5',
  grass: 'footstep-mud-v5',
  sand: 'footstep-mud-v5',
  water: 'footstep-water-v5',
  ash: 'footstep-ash-v5',
  snow: 'footstep-ash-v5'
});

const REGION_AMBIENCE = Object.freeze({
  sanctuary: 'ambience-wind',
  gravewake: 'ambience-fog',
  redfen: 'ambience-rain',
  cairnreach: 'ambience-wind',
  'veiled-road': 'ambience-rift',
  bellscar: 'ambience-storm'
});

const COVENANT_AFFINITIES = new Set(['flame', 'grave', 'blood', 'light', 'storm', 'void']);
const stableHash = (value) => [...String(value ?? '')].reduce((hash, character) => ((hash * 33) ^ character.charCodeAt(0)) >>> 0, 5381);
const deterministicUnit = (key, salt = '') => stableHash(`${key}:${salt}`) / 0xffffffff;
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

const pitchFor = (definition, key, salt) => {
  const range = Array.isArray(definition?.pitch) ? definition.pitch : [1, 1];
  const minimum = finite(range[0], 1);
  const maximum = finite(range[1], minimum);
  return clamp(minimum + (maximum - minimum) * deterministicUnit(key, salt), 0.55, 1.8);
};

const layerFor = (semanticId, assetId, key, overrides = {}) => {
  const definition = audioDefinition(semanticId);
  if (!definition || !assetId) return null;
  return Object.freeze({
    assetId,
    bus: overrides.bus ?? definition.bus,
    priority: finite(overrides.priority, definition.priority),
    concurrencyGroup: overrides.concurrencyGroup ?? definition.concurrencyGroup,
    category: overrides.category ?? definition.category,
    gain: clamp(finite(overrides.gain, definition.gain), 0, 1.5),
    pitch: pitchFor(definition, key, assetId),
    pan: clamp(finite(overrides.pan, 0), -1, 1)
  });
};

const choose = (entries, key, salt = '') => {
  if (!entries?.length) return null;
  return entries[stableHash(`${key}:${salt}`) % entries.length] ?? entries[0];
};

const covenantAccentAllowed = (semanticId, context) => {
  const affinity = context?.covenantPrimary;
  const stage = Math.max(0, Math.floor(finite(context?.covenantStage, 0)));
  if (!COVENANT_AFFINITIES.has(affinity) || stage < 2) return false;
  if (context?.settings?.reducedVfx !== true) return true;
  if (stage >= 5) return true;
  return context?.actorKind === 'boss' || context?.actorKind === 'hunter' || semanticId === 'boss-signature' || semanticId === 'boss-phase' || semanticId === 'hunter-signature' || semanticId === 'hunter-intrusion';
};

export const semanticAudioEventFor = (eventType, detail = {}, context = {}) => {
  if (eventType === 'context:changed') return 'regional-ambience';
  if (eventType === 'animation:footstep') return 'footstep';
  if (eventType === 'combat:attack-start') return context.execution ? 'execution-start' : 'weapon-swing';
  if (eventType === 'combat:attack-impact') return context.execution ? 'execution-contact' : context.damageFamily === 'magic' ? 'spell-impact' : 'physical-impact';
  if (eventType === 'combat:enemy-telegraph') return context.actorKind === 'boss' ? 'boss-telegraph' : 'enemy-effort';
  if (eventType === 'combat:enemy-impact') return 'physical-impact';
  if (eventType === 'combat:boss-stagger') return 'boss-stagger';
  if (eventType === 'boss:signature-cue') return Number(detail.phase) > 1 ? 'boss-phase' : 'boss-signature';
  if (eventType === 'loot:spawn') return detail.rarity === 'unique' || detail.rarity === 'mythic' ? 'unique-reveal' : 'loot-drop';
  if (eventType === 'legacy:boss-defeated') return 'boss-death';
  if (eventType === 'legacy:player-dead') return null;
  if (eventType === 'legacy:sound' && detail.id === 'dodge') return 'dodge';
  return null;
};

export class AudioPresentationResolver {
  resolve(eventType, detail = {}, context = {}, eventKey = '') {
    const semanticId = semanticAudioEventFor(eventType, detail, context);
    if (!semanticId) return null;
    const definition = audioDefinition(semanticId);
    if (!definition) return null;
    const key = String(eventKey || context?.eventId || `${eventType}:${context?.actorId ?? 'unknown'}:${context?.actionId ?? 'idle'}`);
    const layers = [];
    const push = (layer) => { if (layer && layers.length < 4) layers.push(layer); };

    if (semanticId === 'physical-impact') {
      const material = MATERIAL_ASSET[context?.contactMaterial] ?? MATERIAL_ASSET.flesh;
      push(layerFor('physical-impact', material, key, { pan: detail.pan }));
      if (context?.guardBroken) push(layerFor('guard-break', 'guard-break', key, { pan: detail.pan }));
      else if (context?.guarded) push(layerFor('guard-impact', 'guard-impact', key, { pan: detail.pan }));
      if (context?.staggered || context?.poiseBroken) push(layerFor('poise-break', 'poise-break', key, { pan: detail.pan }));
      if (covenantAccentAllowed(semanticId, context)) push(layerFor('covenant-accent', `cov-${context.covenantPrimary}`, key, { pan: detail.pan }));
    } else if (semanticId === 'weapon-swing') {
      const heavy = context?.hitWeight === 'heavy' || context?.critical === true;
      const candidates = heavy ? ['swing-heavy-a', 'swing-heavy-b'] : ['swing-light-a', 'swing-light-b'];
      push(layerFor('weapon-swing', choose(candidates, key, 'swing'), key, { pan: detail.pan, gain: heavy ? 0.86 : definition.gain }));
      if (covenantAccentAllowed(semanticId, context) && context?.covenantStage >= 4) push(layerFor('covenant-accent', `cov-${context.covenantPrimary}`, key, { pan: detail.pan, gain: 0.26 }));
    } else if (semanticId === 'footstep') {
      const surface = detail.surface ?? context?.surface ?? 'stone';
      const assetId = FOOTSTEP_ASSET[surface] ?? FOOTSTEP_ASSET.stone;
      const speed = clamp(finite(detail.speed, context?.movementIntensity ?? 0.5), 0.15, 1.3);
      const footPitch = detail.foot === 'right' ? 1.018 : 0.986;
      push(layerFor('footstep', assetId, key, { gain: definition.gain * (0.72 + speed * 0.3), pan: detail.pan }));
      if (layers[0]) layers[0] = Object.freeze({ ...layers[0], pitch: clamp(layers[0].pitch * footPitch, 0.55, 1.8) });
    } else if (semanticId === 'regional-ambience') {
      push(layerFor('regional-ambience', REGION_AMBIENCE[context?.region] ?? 'ambience-ash', key));
    } else {
      const assetId = choose(definition.assets, key, semanticId);
      push(layerFor(semanticId, assetId, key, { pan: detail.pan }));
      if (covenantAccentAllowed(semanticId, context) && ['spell-impact', 'boss-signature', 'boss-phase', 'hunter-signature', 'hunter-intrusion'].includes(semanticId)) {
        push(layerFor('covenant-accent', `cov-${context.covenantPrimary}`, key, { pan: detail.pan, gain: 0.32 }));
      }
    }

    const bounded = layers.slice(0, Math.min(4, Math.max(1, definition.maxLayers ?? 1)));
    const priority = bounded.reduce((maximum, layer) => Math.max(maximum, layer.priority), definition.priority ?? 1);
    return Object.freeze({
      id: `${semanticId}:${key}`,
      semanticId,
      layers: Object.freeze(bounded),
      duck: detail.duck ?? null,
      priority
    });
  }
}
