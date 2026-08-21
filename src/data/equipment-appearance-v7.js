import { ITEM_BASES, UNIQUES, UNIQUE_VISUAL_SIGNATURE_IDS } from './items.js';

export const EQUIPMENT_LAYER_ASSETS = Object.freeze({
  layers: Object.freeze({ id: 'equipment-layers-v7', src: '/assets/equipment/v7/equipment-layers-v7.svg', columns: 4, rows: 6, required: true }),
  signatures: Object.freeze({ id: 'equipment-signatures-v7', src: '/assets/equipment/v7/equipment-signatures-v7.svg', columns: 8, rows: Math.max(1, Math.ceil(UNIQUES.length / 8)), required: true })
});

export const EQUIPMENT_SLOT_FAMILIES = Object.freeze({
  weapon: Object.freeze(['blade', 'focus', 'flail', 'sabre']),
  offhand: Object.freeze(['bulwark', 'censer', 'mirror', 'focus']),
  head: Object.freeze(['mask', 'circlet', 'hood', 'crown']),
  chest: Object.freeze(['coat', 'plate', 'raiment', 'bastion']),
  gloves: Object.freeze(['gauntlet', 'hexweave', 'grip', 'bracer']),
  boots: Object.freeze(['road', 'gallows', 'rift', 'plate'])
});

export const RARITY_MATERIALS = Object.freeze({
  common: Object.freeze({ trim: 0, emissive: 0, material: 'worn' }),
  magic: Object.freeze({ trim: 1, emissive: 0.04, material: 'tempered' }),
  rare: Object.freeze({ trim: 2, emissive: 0.07, material: 'etched' }),
  relic: Object.freeze({ trim: 3, emissive: 0.10, material: 'relic' }),
  unique: Object.freeze({ trim: 4, emissive: 0.14, material: 'unique' }),
  mythic: Object.freeze({ trim: 5, emissive: 0.18, material: 'mythic' })
});

const familyFromBase = (base) => {
  if (!base) return 'neutral';
  const tags = new Set(base.tags ?? []);
  if (base.slot === 'weapon') return base.id.includes('flail') ? 'flail' : base.id.includes('sabre') ? 'sabre' : tags.has('arcane') ? 'focus' : 'blade';
  if (base.slot === 'offhand') return base.id.includes('bulwark') ? 'bulwark' : base.id.includes('censer') ? 'censer' : base.id.includes('mirror') ? 'mirror' : 'focus';
  if (base.slot === 'head') return base.id.includes('mask') ? 'mask' : base.id.includes('circlet') ? 'circlet' : base.id.includes('hood') ? 'hood' : 'crown';
  if (base.slot === 'chest') return base.id.includes('plate') ? 'plate' : base.id.includes('raiment') ? 'raiment' : base.id.includes('coat') ? 'coat' : 'bastion';
  if (base.slot === 'gloves') return base.id.includes('hexweave') ? 'hexweave' : base.id.includes('grip') ? 'grip' : 'gauntlet';
  if (base.slot === 'boots') return base.id.includes('gallows') ? 'gallows' : base.id.includes('rift') ? 'rift' : 'road';
  return 'neutral';
};

const BASE_FAMILIES = Object.freeze(Object.fromEntries(ITEM_BASES.map((base) => [base.id, familyFromBase(base)])));
export const equipmentBaseFamily = (baseId, slot = null) => BASE_FAMILIES[baseId] ?? EQUIPMENT_SLOT_FAMILIES[slot]?.[0] ?? 'neutral';

const glyphs = ['◆', '✦', '☉', '✹', '◇', '†', '⛓', '☾', '♮', '⬡', '☠', '☼', '◐', '⚚', '✷', '⌁'];
export const UNIQUE_VISUAL_SIGNATURES = Object.freeze(Object.fromEntries(UNIQUES.map((unique, index) => {
  const id = UNIQUE_VISUAL_SIGNATURE_IDS[unique.id];
  return [unique.id, Object.freeze({
    id,
    uniqueId: unique.id,
    slot: unique.slot,
    cell: index,
    glyph: glyphs[index % glyphs.length],
    silhouette: `${unique.slot}:${(index * 7 + unique.id.length) % 5}`,
    material: unique.rarity === 'mythic' ? 'mythic' : 'unique',
    trailVariant: index % 4,
    impactVariant: index % 5,
    preserveWhenReduced: true
  })];
})));

export const uniqueSignature = (uniqueId) => UNIQUE_VISUAL_SIGNATURES[uniqueId] ?? null;
