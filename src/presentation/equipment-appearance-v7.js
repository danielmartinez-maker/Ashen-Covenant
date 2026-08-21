import {
  EQUIPMENT_LAYER_ASSETS,
  RARITY_MATERIALS,
  equipmentBaseFamily,
  equipmentFamilyCell,
  uniqueSignature
} from '../data/equipment-appearance-v7.js';

const SLOT_ORDER = Object.freeze({ boots: 3, chest: 4, head: 5, gloves: 6, offhand: 7, weapon: 8 });
const VISIBLE_SLOTS = Object.freeze(['weapon', 'offhand', 'head', 'chest', 'gloves', 'boots']);
const DRAW_ORDER = Object.freeze(['boots', 'chest', 'head', 'gloves', 'offhand', 'weapon']);
const RARITY_ORDER = Object.freeze(['common', 'magic', 'rare', 'relic', 'unique', 'mythic']);

const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const stableItem = (item) => item ? [
  item.id ?? '', item.baseId ?? '', item.uniqueId ?? '', item.rarity ?? 'common',
  finite(item.masterworkRank ?? item.masterwork, 0), finite(item.corruption ?? item.corruptionRank, 0)
].join(':') : '-';

export const equipmentAppearanceRevisionKey = (equipment = {}, covenantIdentity = {}, reducedVfx = false) => [
  ...VISIBLE_SLOTS.map((slot) => `${slot}=${stableItem(equipment[slot])}`),
  `cov=${covenantIdentity.affinity ?? covenantIdentity.primary ?? 'unbound'}:${finite(covenantIdentity.stage, 0)}`,
  `reduced=${Boolean(reducedVfx)}`
].join('|');

export class EquipmentAppearanceResolver {
  constructor({ maxEntries = 96 } = {}) {
    this.cache = new Map();
    this.maxEntries = Math.max(8, Math.floor(finite(maxEntries, 96)));
    this.hits = 0;
    this.misses = 0;
  }

  resolve(equipment = {}, covenantIdentity = {}, { reducedVfx = false } = {}) {
    const key = equipmentAppearanceRevisionKey(equipment, covenantIdentity, reducedVfx);
    const cached = this.cache.get(key);
    if (cached) {
      this.hits += 1;
      return cached;
    }

    this.misses += 1;
    const layers = [];
    const signatureIds = [];
    let maxMasterwork = 0;
    let maxCorruption = 0;
    let highestRarity = 'common';

    for (const slot of DRAW_ORDER) {
      const item = equipment[slot];
      if (!item) continue;
      const family = equipmentBaseFamily(item.baseId, slot);
      const cell = equipmentFamilyCell(item.baseId, slot);
      layers.push(Object.freeze({
        kind: 'slot', slot, assetId: EQUIPMENT_LAYER_ASSETS.layers.id, cell, family,
        order: SLOT_ORDER[slot], opacity: 0.72, blend: 'source-over', requiredIdentity: false
      }));

      maxMasterwork = Math.max(maxMasterwork, finite(item.masterworkRank ?? item.masterwork, 0));
      maxCorruption = Math.max(maxCorruption, finite(item.corruption ?? item.corruptionRank, 0));
      const rarity = RARITY_ORDER.includes(item.rarity) ? item.rarity : 'common';
      if (RARITY_ORDER.indexOf(rarity) > RARITY_ORDER.indexOf(highestRarity)) highestRarity = rarity;

      const signature = uniqueSignature(item.uniqueId);
      if (signature) {
        signatureIds.push(signature.id);
        layers.push(Object.freeze({
          kind: 'signature', slot, assetId: EQUIPMENT_LAYER_ASSETS.signatures.id, cell: signature.cell,
          family: signature.silhouette, order: 9, opacity: 0.78, blend: 'screen', requiredIdentity: true
        }));
      }
    }

    const affinity = covenantIdentity.affinity ?? covenantIdentity.primary ?? 'unbound';
    const covenantStage = finite(covenantIdentity.stage, 0);
    if (covenantStage >= 2) {
      layers.push(Object.freeze({
        kind: 'covenant', slot: 'all', assetId: null, cell: -1, family: affinity,
        order: 10, opacity: reducedVfx ? 0.10 : 0.20, blend: 'screen', requiredIdentity: false
      }));
    }

    layers.sort((left, right) => left.order - right.order || left.slot.localeCompare(right.slot));
    const result = Object.freeze({
      key,
      layers: Object.freeze(layers),
      signatureIds: Object.freeze(signatureIds),
      rarity: highestRarity,
      material: RARITY_MATERIALS[highestRarity] ?? RARITY_MATERIALS.common,
      masterworkTier: Math.min(3, Math.floor(maxMasterwork / 4)),
      corruptionTier: Math.min(3, Math.max(0, Math.floor(maxCorruption))),
      covenantAffinity: affinity,
      covenantStage,
      reducedVfx: Boolean(reducedVfx)
    });

    this.cache.set(key, result);
    if (this.cache.size > this.maxEntries) this.cache.delete(this.cache.keys().next().value);
    return result;
  }

  debug() {
    return Object.freeze({ hits: this.hits, misses: this.misses, size: this.cache.size });
  }
}
