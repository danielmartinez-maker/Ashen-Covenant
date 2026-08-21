import fs from 'node:fs';

const rendererUrl = new URL('../src/systems/renderer.js', import.meta.url);
const legacyTestUrl = new URL('./loot-presentation-renderer.mjs', import.meta.url);
let source = fs.readFileSync(rendererUrl, 'utf8');

const replaceExactlyOnce = (label, before, after) => {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`${label}: source pattern not found`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${label}: source pattern matched more than once`);
  source = source.slice(0, first) + after + source.slice(first + before.length);
};

replaceExactlyOnce(
  'equipment manifest import',
  "import { HERO_MOTION_ASSETS } from '../data/animation-v7.js';\n",
  "import { HERO_MOTION_ASSETS } from '../data/animation-v7.js';\nimport { EQUIPMENT_LAYER_ASSETS } from '../data/equipment-appearance-v7.js';\n"
);

replaceExactlyOnce(
  'equipment asset preload',
  "      actionVfx: Object.fromEntries(Object.entries(ACTION_VFX_SHEETS).map(([id, sheet]) => [id, this._loadImage(sheet.src)])),\n      items: this._loadImage('/assets/item-atlas-v2.png'),\n",
  "      actionVfx: Object.fromEntries(Object.entries(ACTION_VFX_SHEETS).map(([id, sheet]) => [id, this._loadImage(sheet.src)])),\n      equipmentLayers: this._loadImage(EQUIPMENT_LAYER_ASSETS.layers.src),\n      equipmentSignatures: this._loadImage(EQUIPMENT_LAYER_ASSETS.signatures.src),\n      items: this._loadImage('/assets/item-atlas-v2.png'),\n"
);

replaceExactlyOnce(
  'required equipment assets',
  "    const required = [...Object.values(this.assets.heroMotion), ...Object.values(this.assets.enemyMotion), ...Object.values(this.assets.actionVfx), this.assets.props, this.assets.entrances, this.assets.npcs, this.assets.items, this.assets.terrain];\n",
  "    const required = [...Object.values(this.assets.heroMotion), ...Object.values(this.assets.enemyMotion), ...Object.values(this.assets.actionVfx), this.assets.equipmentLayers, this.assets.equipmentSignatures, this.assets.props, this.assets.entrances, this.assets.npcs, this.assets.items, this.assets.terrain];\n"
);

const atlasBoundary = `  _drawAtlas(image, columns, rows, index, x, y, width, height) {\n    if (!this._assetReady(image)) return false;\n    const cellWidth = (image.naturalWidth || image.width) / columns;\n    const cellHeight = (image.naturalHeight || image.height) / rows;\n    const column = index % columns;\n    const row = Math.floor(index / columns);\n    this.ctx.drawImage(image, column * cellWidth, row * cellHeight, cellWidth, cellHeight, x - width / 2, y - height / 2, width, height);\n    return true;\n  }\n\n`;
const equipmentHelpers = `${atlasBoundary}  _drawCovenantEquipmentTreatment(player, game, layer) {\n    const palette = { flame: '#e97643', grave: '#a993c7', blood: '#c74d62', light: '#f0d789', storm: '#7fbbe5', void: '#8b74b6' };\n    const color = palette[layer.family] ?? game.getHybrid?.()?.color ?? '#c9b88e';\n    const pulse = 1 + Math.sin((game.clock ?? 0) * 2.6) * .04;\n    this.ctx.save();\n    this.ctx.globalCompositeOperation = layer.blend ?? 'screen';\n    this.ctx.globalAlpha = clamp(Number(layer.opacity) || 0, 0, 1);\n    this.ctx.strokeStyle = color;\n    this.ctx.lineWidth = 1.5;\n    this.ctx.setLineDash([6, 7]);\n    this.ctx.beginPath();\n    this.ctx.ellipse(0, player.radius * .12, player.radius * 1.15 * pulse, player.radius * .82 * pulse, 0, 0, Math.PI * 2);\n    this.ctx.stroke();\n    this.ctx.restore();\n  }\n\n  _drawEquipmentLayers(player, game, minOrder, maxOrder) {\n    const appearance = player.presentation?.equipmentAppearance;\n    if (!appearance?.layers?.length) return;\n    const anchors = player.presentation?.resolvedClip?.anchors ?? {};\n    for (const layer of appearance.layers) {\n      if (layer.order < minOrder || layer.order > maxOrder) continue;\n      if (layer.kind === 'covenant') {\n        this._drawCovenantEquipmentTreatment(player, game, layer);\n        continue;\n      }\n      const signature = layer.assetId === EQUIPMENT_LAYER_ASSETS.signatures.id;\n      const image = signature ? this.assets.equipmentSignatures : this.assets.equipmentLayers;\n      const manifest = signature ? EQUIPMENT_LAYER_ASSETS.signatures : EQUIPMENT_LAYER_ASSETS.layers;\n      if (!Number.isInteger(layer.cell) || layer.cell < 0 || !this._assetReady(image)) continue;\n      const anchor = layer.slot === 'head' ? anchors.head\n        : layer.slot === 'boots' ? anchors.feet\n          : layer.slot === 'weapon' ? anchors.hand\n            : layer.slot === 'offhand' ? anchors.offhand\n              : anchors.torso;\n      const offsetX = (anchor?.[0] ?? 0) * player.radius;\n      const offsetY = (anchor?.[1] ?? 0) * player.radius;\n      this.ctx.save();\n      this.ctx.globalAlpha = clamp(Number(layer.opacity) || 0, 0, 1);\n      this.ctx.globalCompositeOperation = layer.blend ?? 'source-over';\n      this._drawAtlas(image, manifest.columns, manifest.rows, layer.cell, offsetX, offsetY, player.radius * 4.2, player.radius * 4.2);\n      this.ctx.restore();\n    }\n  }\n\n`;
replaceExactlyOnce('equipment layer helpers', atlasBoundary, equipmentHelpers);

replaceExactlyOnce(
  'rear equipment pass',
  "    const heroMotion = resolvedClip ? this.assets.heroMotion[player.primary] : null;\n    const spriteDrawn = resolvedClip && this._assetReady(heroMotion)\n",
  "    const heroMotion = resolvedClip ? this.assets.heroMotion[player.primary] : null;\n    this._drawEquipmentLayers(player, game, 2, 2);\n    const spriteDrawn = resolvedClip && this._assetReady(heroMotion)\n"
);

const legacyAppearanceBlock = `    if (!spriteDrawn) { ctx.restore(); return; }\n    const equipped = Object.values(player.equipment ?? {}).filter(Boolean);\n    const equipmentPresentation = player.equipmentPresentation ?? {};\n    const { weaponKey = 'base', auraKey = 'base' } = equipmentPresentation;\n    const rarityOrder = { common: 0, magic: 1, rare: 2, relic: 3, unique: 4, mythic: 5 };\n    const visualItem = equipped.sort((a, b) => (rarityOrder[b.rarity] ?? 0) - (rarityOrder[a.rarity] ?? 0))[0];\n    if (visualItem && (rarityOrder[visualItem.rarity] ?? 0) >= 3) {\n      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = visualItem.rarity === 'mythic' ? .34 : visualItem.rarity === 'unique' ? .24 : .14;\n      ctx.strokeStyle = RARITY_COLORS[visualItem.rarity] ?? hybrid.color; ctx.lineWidth = visualItem.rarity === 'mythic' ? 3 : 2;\n      ctx.beginPath(); ctx.arc(0, -player.radius * .08, player.radius * (1.2 + Math.sin(game.clock * 2.8) * .05), 0, Math.PI * 2); ctx.stroke(); ctx.restore();\n    }\n    if (auraKey !== 'base') {\n      const auraPulse = 1 + Math.sin(game.clock * 2.1) * .055;\n      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = equipmentPresentation.rarity === 'mythic' ? .22 : .13;\n      ctx.strokeStyle = visualItem ? (RARITY_COLORS[visualItem.rarity] ?? hybrid.color) : hybrid.color; ctx.lineWidth = 1.5;\n      ctx.setLineDash(auraKey === 'drowned-sovereign-ward' ? [5, 6] : [9, 5]);\n      ctx.beginPath(); ctx.ellipse(0, player.radius * .36, player.radius * 1.35 * auraPulse, player.radius * .56 * auraPulse, 0, 0, Math.PI * 2); ctx.stroke();\n      ctx.restore();\n    }\n`;
replaceExactlyOnce(
  'legacy coarse equipment rendering',
  legacyAppearanceBlock,
  "    if (!spriteDrawn) { ctx.restore(); return; }\n    this._drawEquipmentLayers(player, game, 3, 10);\n"
);

const legacyWeaponBlock = `    if (weaponKey !== 'base') {\n      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = weaponKey === 'worldspine-rupture' ? .72 : .42;\n      ctx.strokeStyle = visualItem ? (RARITY_COLORS[visualItem.rarity] ?? hybrid.color) : hybrid.color;\n      ctx.lineWidth = weaponKey === 'worldspine-rupture' ? 3 : 2;\n      const reach = player.radius + 18 + actionProgress * 16;\n      ctx.beginPath(); ctx.moveTo(player.radius * .25, -2); ctx.lineTo(reach, -2); ctx.stroke();\n      if (weaponKey === 'worldspine-rupture') { ctx.beginPath(); ctx.arc(reach + 4, -2, 4 + Math.sin(game.clock * 4) * 1.2, 0, Math.PI * 2); ctx.stroke(); }\n      ctx.restore();\n    }\n`;
replaceExactlyOnce('legacy weapon key rendering', legacyWeaponBlock, '');

fs.writeFileSync(rendererUrl, source);

fs.writeFileSync(legacyTestUrl, `import assert from 'node:assert/strict';\nimport fs from 'node:fs';\nconst source = fs.readFileSync(new URL('../src/systems/renderer.js', import.meta.url), 'utf8');\nassert.match(source, /player\\.presentation\\?\\.equipmentAppearance/, 'renderer must consume presentation-owned equipment appearance');\nassert.match(source, /EQUIPMENT_LAYER_ASSETS/, 'renderer must render manifest-owned equipment atlases');\nassert.match(source, /_drawEquipmentLayers\\(/, 'renderer must use the bounded v7 equipment layer pass');\nassert.doesNotMatch(source, /player\\.equipmentPresentation|\\bweaponKey\\b|\\bauraKey\\b/, 'legacy coarse equipment rendering must remain retired');\nconsole.log('Ashen Covenant equipment presentation renderer contract passed.');\n`);

console.log('Applied v7 bounded equipment renderer cutover.');
