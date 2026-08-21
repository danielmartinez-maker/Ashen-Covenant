import fs from 'node:fs';

const url = new URL('../src/systems/renderer.js', import.meta.url);
let source = fs.readFileSync(url, 'utf8');

const replaceExactlyOnce = (label, before, after) => {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`${label}: source pattern not found`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${label}: source pattern matched more than once`);
  source = source.slice(0, first) + after + source.slice(first + before.length);
};

replaceExactlyOnce(
  'animation manifest import',
  "import { ACTION_VFX_FRAME_COUNT, ACTION_VFX_SHEETS } from '../data/action-vfx.js';\n",
  "import { ACTION_VFX_FRAME_COUNT, ACTION_VFX_SHEETS } from '../data/action-vfx.js';\nimport { HERO_MOTION_ASSETS } from '../data/animation-v7.js';\n"
);

replaceExactlyOnce(
  'legacy player rows',
  "const PLAYER_ROWS = { ironbound: 0, thornseer: 1, warden: 2, veilrunner: 3, gravebinder: 4, dawnstrider: 5 };\n",
  ''
);

replaceExactlyOnce(
  'legacy motion-state table',
  "const HERO_MOTION_STATES = Object.freeze({ idle: 0, run: 1, attack1: 2, attack2: 3, attack3: 4, cast: 5, ward: 5, companion: 5, hybrid: 5, dodge: 6, hit: 7, death: 8, execution: 4, ultimate: 9, potion: 5, resurrection: 9 });\n",
  ''
);

replaceExactlyOnce(
  'hero asset declarations',
  "      heroes: this._loadImage('/assets/hero-facing-atlas-v5.png'),\n      enemyMotion: {\n",
  "      heroMotion: Object.fromEntries(Object.entries(HERO_MOTION_ASSETS).map(([classId, asset]) => [classId, this._loadImage(asset.src)])),\n      enemyMotion: {\n"
);

replaceExactlyOnce(
  'legacy hero motion map',
  "      heroMotion: new Map(),\n",
  ''
);

replaceExactlyOnce(
  'required asset list',
  "    const required = [this.assets.heroes, ...Object.values(this.assets.enemyMotion), ...Object.values(this.assets.actionVfx), this.assets.props, this.assets.entrances, this.assets.npcs, this.assets.items, this.assets.terrain];",
  "    const required = [...Object.values(this.assets.heroMotion), ...Object.values(this.assets.enemyMotion), ...Object.values(this.assets.actionVfx), this.assets.props, this.assets.entrances, this.assets.npcs, this.assets.items, this.assets.terrain];"
);

replaceExactlyOnce(
  'optional hero image methods',
  `  _loadOptionalImage(src) {\n    if (typeof Image === 'undefined') return null;\n    const image = new Image();\n    image.decoding = 'async';\n    image.src = resolveAssetUrl(src);\n    return image;\n  }\n\n  _heroMotionImage(classId) {\n    if (!classId) return null;\n    if (!this.assets.heroMotion.has(classId)) this.assets.heroMotion.set(classId, this._loadOptionalImage(\`/assets/hero-motion-\${classId}-v7.png\`));\n    return this.assets.heroMotion.get(classId);\n  }\n\n`,
  ''
);

replaceExactlyOnce(
  'player body frame selection',
  `    const spriteSize = player.radius * 7.1;\n    const combo = player.presentation?.action?.profile?.comboIndex ?? player.attackChain ?? 1;\n    const motionStateName = player.deathTime > 0 ? 'death' : player.presentation?.reaction ? 'hit' : actionType === 'attack' ? \`attack\${Math.max(1, Math.min(3, combo))}\` : player.dash ? 'dodge' : moving && actionType === 'idle' ? 'run' : actionType;\n    const motionState = HERO_MOTION_STATES[motionStateName] ?? HERO_MOTION_STATES.idle;\n    let motionProgress = 0;\n    if (player.deathTime > 0) motionProgress = clamp(1 - player.deathTime / 1.15, 0, .999);\n    else if (player.presentation?.reaction) motionProgress = clamp(1 - (player.presentation.reaction.time / Math.max(.01, player.presentation.reaction.duration)), 0, .999);\n    else if (animation.duration && animation.time > 0) motionProgress = clamp(1 - animation.time / animation.duration, 0, .999);\n    else if (moving) motionProgress = ((gait / (Math.PI * 2)) % 1 + 1) % 1;\n    else motionProgress = ((game.clock * 1.35) % 1 + 1) % 1;\n    const motionFrame = Math.min(7, Math.floor(motionProgress * 8));\n    const heroMotion = this._heroMotionImage(player.primary);\n    const motionRow = motionState * 8 + facingIndex;\n    const spriteDrawn = this._assetReady(heroMotion)\n      ? this._drawAtlas(heroMotion, 8, 80, motionRow * 8 + motionFrame, 0, -player.radius * .26, spriteSize, spriteSize)\n      : this._drawAtlas(this.assets.heroes, 4, 6, (PLAYER_ROWS[player.primary] ?? 0) * 4 + Math.min(3, Math.floor(facingIndex / 2)), 0, -player.radius * .26, spriteSize, spriteSize);\n    if (!spriteDrawn) { ctx.restore(); return; }`,
  `    const spriteSize = player.radius * 7.1;\n    const resolvedClip = player.presentation?.resolvedClip;\n    const heroMotion = resolvedClip ? this.assets.heroMotion[player.primary] : null;\n    const spriteDrawn = resolvedClip && this._assetReady(heroMotion)\n      ? this._drawAtlas(heroMotion, 8, 80, resolvedClip.row * 8 + resolvedClip.frame, 0, -player.radius * .26, spriteSize, spriteSize)\n      : false;\n    if (!spriteDrawn) { ctx.restore(); return; }`
);

fs.writeFileSync(url, source);
console.log('Applied v7 renderer cutover: manifest-owned hero assets and resolved clip rendering.');
