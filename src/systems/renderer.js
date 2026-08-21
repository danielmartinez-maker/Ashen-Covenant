import { RARITY_COLORS, WORLD_SIZE } from '../core/constants.js';
import { DISTRICTS } from '../data/expansion.js';
import { ENCOUNTER_ROOMS } from '../data/requiem.js';
import { ZONES, zoneAt } from '../data/world.js';
import { ACTION_VFX_FRAME_COUNT, ACTION_VFX_SHEETS } from '../data/action-vfx.js';
import { HERO_MOTION_ASSETS } from '../data/animation-v7.js';
import { EQUIPMENT_LAYER_ASSETS } from '../data/equipment-appearance-v7.js';
import { covenantVfxPhase } from '../presentation/covenant-identity.js';
import { clamp, easeOutCubic, fromAngle } from '../core/math.js';
import { resolveAssetUrl } from '../core/assets.js';

export { resolveAssetUrl } from '../core/assets.js';

const rgba = (hex, alpha = 1) => {
  const value = hex.replace('#', '');
  const numeric = Number.parseInt(value.length === 3 ? value.split('').map((char) => char + char).join('') : value, 16);
  const r = (numeric >> 16) & 255;
  const g = (numeric >> 8) & 255;
  const b = numeric & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// The hero is presented as a 2.5D character, not a rotatable top-down token.
// Each class now resolves through eight authored/derived three-quarter views. Combat can still aim in
// the plane, while the body remains locked to grounded 45-degree facing stances.
const PLAYER_FACING_ANGLES = [0, Math.PI * .25, Math.PI * .5, Math.PI * .75, Math.PI, -Math.PI * .75, -Math.PI * .5, -Math.PI * .25];
const ENEMY_SPRITES = {
  mireling: ['a', 1], ashbow: ['a', 2], cairnguard: ['a', 0], cinderbrute: ['b', 3], candlepriest: ['a', 3],
  riftstalker: ['d', 2], echomonk: ['d', 0], bonevulture: ['d', 3], chainwidow: ['d', 2], wardeater: ['d', 3],
  thorncolossus: ['d', 1], gallowscrow: ['d', 3], bellknight: ['a', 0], gildedcantor: ['a', 3], ashpenitent: ['a', 3],
  hollowchorister: ['a', 3], bellwitness: ['d', 0], tollingabbot: ['d', 0],
  bloodleech: ['b', 0], fenwitch: ['b', 2], boghulk: ['b', 3], reedstalker: ['b', 1], drownedoracle: ['b', 2],
  ironwraith: ['c', 0], siegeherald: ['c', 1], chainmarshal: ['c', 2], ashsmith: ['c', 3], ossuarybehemoth: ['b', 3],
  mirrorwisp: ['d', 3], veilblade: ['d', 2], nullpriest: ['a', 3], riftmother: ['b', 2], maskedoracle: ['d', 3],
  cryptwarden: ['a', 0], bloodmatron: ['b', 2], bogsovereign: ['d', 1], burialengine: ['c', 1], chainregent: ['c', 2],
  mirrorapostle: ['d', 3], veiledoracle: ['b', 2], silenceincarnate: ['d', 3]
};

const PROP_SPRITES = {
  brazier: 0, 'ash-pyre': 0, tent: 1, banner: 2, crates: 3,
  grave: 4, 'dead-tree': 5, 'broken-bell': 6, fence: 7,
  reeds: 8, bloodroot: 9, shrine: 10, pool: 11,
  'broken-wall': 12, rift: 13, buttress: 14, 'bell-rubble': 15
};

const TERRAIN_ATLAS = '/assets/terrain/terrain-atlas-v5.png';
const NPC_SPRITES = { blacksmith: 0, guard: 1, vendor: 2, pilgrim: 3, scribe: 3 };

const facingFrame = (angle) => PLAYER_FACING_ANGLES
  .map((candidate, index) => ({ index, delta: Math.abs(Math.atan2(Math.sin(angle - candidate), Math.cos(angle - candidate))) }))
  .sort((left, right) => left.delta - right.delta)[0]?.index ?? 0;

const roleGlyphs = { melee: '✦', shield: '▰', brute: '◆', ranged: '⌁', healer: '✚', commander: '✺', assassin: '◢', burrower: '⌄', summoner: '⊹', disruptor: '⊘', boss: '✺' };

const seededValue = (value) => {
  const sin = Math.sin(value * 12.9898) * 43758.5453;
  return sin - Math.floor(sin);
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.viewport = { width: 1280, height: 720, scale: 1, dpr: 1 };
    this.assetState = { pending: 0, loaded: 0, failed: new Map() };
    this.assetPromises = [];
    this.assets = {
      heroMotion: Object.fromEntries(Object.entries(HERO_MOTION_ASSETS).map(([classId, asset]) => [classId, this._loadImage(asset.src)])),
      enemyMotion: {
        a: this._loadImage('/assets/enemy-motion-a-v7.png'),
        b: this._loadImage('/assets/enemy-motion-b-v7.png'),
        c: this._loadImage('/assets/enemy-motion-c-v7.png'),
        d: this._loadImage('/assets/enemy-motion-d-v7.png')
      },
      props: this._loadImage('/assets/environment-props-v5.png'),
      entrances: this._loadImage('/assets/entrance-atlas-v5.png'),
      npcs: this._loadImage('/assets/npc-atlas-v5.png'),
      actionVfx: Object.fromEntries(Object.entries(ACTION_VFX_SHEETS).map(([id, sheet]) => [id, this._loadImage(sheet.src)])),
      equipmentLayers: this._loadImage(EQUIPMENT_LAYER_ASSETS.layers.src),
      equipmentSignatures: this._loadImage(EQUIPMENT_LAYER_ASSETS.signatures.src),
      items: this._loadImage('/assets/item-atlas-v2.png'),
      terrain: this._loadImage(TERRAIN_ATLAS)
    };
    this.ready = Promise.allSettled(this.assetPromises).then(() => this.getAssetStatus());
    this.scenery = this._buildScenery();
    this._resizeObserver = new ResizeObserver(() => this.resize());
    this._resizeObserver.observe(canvas);
    this.resize();
  }

  _loadImage(src) {
    if (typeof Image === 'undefined') return null;
    const image = new Image();
    image.decoding = 'async';
    const resolved = resolveAssetUrl(src);
    this.assetState.pending += 1;
    this.assetPromises.push(new Promise((resolve) => {
      const finish = (loaded) => {
        this.assetState.pending = Math.max(0, this.assetState.pending - 1);
        if (loaded) this.assetState.loaded += 1;
        else this.assetState.failed.set(String(src), resolved);
        resolve({ src: String(src), resolved, loaded });
      };
      image.addEventListener('load', () => finish(true), { once: true });
      image.addEventListener('error', () => finish(false), { once: true });
    }));
    image.src = resolved;
    return image;
  }

  whenReady() {
    return this.ready;
  }

  getAssetStatus() {
    const required = [...Object.values(this.assets.heroMotion), ...Object.values(this.assets.enemyMotion), ...Object.values(this.assets.actionVfx), this.assets.equipmentLayers, this.assets.equipmentSignatures, this.assets.props, this.assets.entrances, this.assets.npcs, this.assets.items, this.assets.terrain];
    return {
      ready: this.assetState.pending === 0 && this.assetState.failed.size === 0 && required.every((image) => this._assetReady(image)),
      pending: this.assetState.pending,
      loaded: this.assetState.loaded,
      failed: [...this.assetState.failed.keys()]
    };
  }

  _buildScenery() {
    return Object.fromEntries(ZONES.map((zone, zoneIndex) => {
      const density = zone.safe ? 22 : zone.id === 'gravewake' ? 42 : 38;
      const entries = Array.from({ length: density }, (_, index) => {
        const seed = (zoneIndex + 1) * 971 + (index + 1) * 113;
        const x = zone.x + 34 + seededValue(seed) * (zone.width - 68);
        const y = zone.y + 34 + seededValue(seed + 31) * (zone.height - 68);
        const size = 0.58 + seededValue(seed + 77) * 0.9;
        let kind = 'crates';
        if (zone.id === 'sanctuary') kind = ['brazier', 'tent', 'banner', 'crates'][index % 4];
        else if (zone.id === 'gravewake') kind = ['grave', 'grave', 'dead-tree', 'broken-bell', 'fence'][index % 5];
        else if (zone.id === 'redfen') kind = ['reeds', 'bloodroot', 'pool', 'reeds', 'shrine'][index % 5];
        else if (zone.id === 'cairnreach') kind = ['broken-wall', 'crates', 'banner', 'shrine'][index % 4];
        else if (zone.id === 'veiled-road') kind = ['rift', 'dead-tree', 'shrine', 'broken-wall'][index % 4];
        else if (zone.id === 'bellscar') kind = ['buttress', 'ash-pyre', 'bell-rubble', 'banner'][index % 4];
        const keepout = Math.abs(x - (zone.x + zone.width * .5)) < 205 && Math.abs(y - (zone.y + zone.height * .5)) < 160;
        return { x, y, size, kind, keepout, phase: seededValue(seed + 103) * Math.PI * 2 };
      });
      return [zone.id, entries];
    }));
  }

  _assetReady(image) {
    return Boolean(image && image.complete !== false && (image.naturalWidth || image.width) && (image.naturalHeight || image.height));
  }

  _drawAtlas(image, columns, rows, index, x, y, width, height) {
    if (!this._assetReady(image)) return false;
    const cellWidth = (image.naturalWidth || image.width) / columns;
    const cellHeight = (image.naturalHeight || image.height) / rows;
    const column = index % columns;
    const row = Math.floor(index / columns);
    this.ctx.drawImage(image, column * cellWidth, row * cellHeight, cellWidth, cellHeight, x - width / 2, y - height / 2, width, height);
    return true;
  }

  _drawCovenantEquipmentTreatment(player, game, layer) {
    const palette = { flame: '#e97643', grave: '#a993c7', blood: '#c74d62', light: '#f0d789', storm: '#7fbbe5', void: '#8b74b6' };
    const color = palette[layer.family] ?? game.getHybrid?.()?.color ?? '#c9b88e';
    const pulse = 1 + Math.sin((game.clock ?? 0) * 2.6) * .04;
    this.ctx.save();
    this.ctx.globalCompositeOperation = layer.blend ?? 'screen';
    this.ctx.globalAlpha = clamp(Number(layer.opacity) || 0, 0, 1);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1.5;
    this.ctx.setLineDash([6, 7]);
    this.ctx.beginPath();
    this.ctx.ellipse(0, player.radius * .12, player.radius * 1.15 * pulse, player.radius * .82 * pulse, 0, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.restore();
  }

  _drawEquipmentLayers(player, game, minOrder, maxOrder) {
    const appearance = player.presentation?.equipmentAppearance;
    if (!appearance?.layers?.length) return;
    const anchors = player.presentation?.resolvedClip?.anchors ?? {};
    for (const layer of appearance.layers) {
      if (layer.order < minOrder || layer.order > maxOrder) continue;
      if (layer.kind === 'covenant') {
        this._drawCovenantEquipmentTreatment(player, game, layer);
        continue;
      }
      const signature = layer.assetId === EQUIPMENT_LAYER_ASSETS.signatures.id;
      const image = signature ? this.assets.equipmentSignatures : this.assets.equipmentLayers;
      const manifest = signature ? EQUIPMENT_LAYER_ASSETS.signatures : EQUIPMENT_LAYER_ASSETS.layers;
      if (!Number.isInteger(layer.cell) || layer.cell < 0 || !this._assetReady(image)) continue;
      const anchor = layer.slot === 'head' ? anchors.head
        : layer.slot === 'boots' ? anchors.feet
          : layer.slot === 'weapon' ? anchors.hand
            : layer.slot === 'offhand' ? anchors.offhand
              : layer.slot === 'amulet' ? anchors.torso
                : layer.slot === 'ring' ? anchors.hand
                  : anchors.torso;
      const offsetX = (anchor?.[0] ?? 0) * player.radius;
      const offsetY = (anchor?.[1] ?? 0) * player.radius;
      this.ctx.save();
      this.ctx.globalAlpha = clamp(Number(layer.opacity) || 0, 0, 1);
      this.ctx.globalCompositeOperation = layer.blend ?? 'source-over';
      this._drawAtlas(image, manifest.columns, manifest.rows, layer.cell, offsetX, offsetY, player.radius * 4.2, player.radius * 4.2);
      this.ctx.restore();
    }
  }

  _enemySprite(templateId, elite = false, boss = false) {
    const [atlas, column] = ENEMY_SPRITES[templateId] ?? (boss || elite ? ['d', 0] : ['a', 1]);
    return { image: this.assets.enemyMotion[atlas], column };
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(320, Math.round(rect.width || window.innerWidth));
    const height = Math.max(320, Math.round(rect.height || window.innerHeight));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (this.canvas.width !== Math.round(width * dpr) || this.canvas.height !== Math.round(height * dpr)) {
      this.canvas.width = Math.round(width * dpr);
      this.canvas.height = Math.round(height * dpr);
      // Assigning canvas dimensions resets the entire 2D context state.
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';
    }
    this.viewport.width = width;
    this.viewport.height = height;
    this.viewport.dpr = dpr;
    this.viewport.scale = clamp(Math.min(width / 1180, height / 760), 0.54, 1.18);
  }

  render(game) {
    this.resize();
    this.graphicsQuality = ['low', 'high', 'ultra'].includes(game.settings?.graphicsQuality) ? game.settings.graphicsQuality : 'high';
    const { ctx, viewport } = this;
    const { width, height, dpr } = viewport;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    this._drawBackdrop(game);
    if (!game.player) {
      this._drawMenuAmbient(game);
      return;
    }
    const camera = game.camera;
    const worldScale = viewport.scale * (camera.zoom ?? 1);
    const shake = (camera.shake ?? 0) + (camera.presentationShake ?? 0);
    const shakeX = shake ? Math.sin(game.clock * 151.7 + 0.7) * shake * 0.5 : 0;
    const shakeY = shake ? Math.cos(game.clock * 133.3 + 1.1) * shake * 0.5 : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);
    ctx.scale(worldScale, worldScale);
    ctx.translate(-camera.x, -camera.y);
    this._drawWorld(game);
    this._drawDistricts(game);
    this._drawEncounterRooms(game);
    this._drawExpeditionArena(game);
    this._drawAtmosphere(game);
    this._drawSanctuaryEvolution(game);
    this._drawLandmarks(game);
    this._drawAmbientActors(game);
    this._drawEvent(game);
    game.entities.hazards.forEach((hazard) => this._drawHazard(hazard));
    this._drawMoveCommand(game);
    this._drawDynamicLights(game);
    game.entities.effects.filter((effect) => effect.kind === 'ground-decal' && this._isVisibleActor(effect, game, 120)).forEach((effect) => this._drawEffect(effect));
    // One depth queue makes feet, corpses, props, loot, enemies, and the hero
    // occupy the same isometric space. The previous fixed type order let the
    // player render on top of enemies even while standing behind them.
    const geometryActors = (game.worldGeometry?.geometryAt?.(game.player.x, game.player.y, game)?.obstacles ?? [])
      .filter((entry) => this._isVisibleActor({ x: entry.shape === 'rect' ? entry.x + entry.w * .5 : entry.x, y: entry.shape === 'rect' ? entry.y + entry.h * .5 : entry.y }, game, 160))
      .map((entry) => ({ y: entry.shape === 'rect' ? entry.y + entry.h : entry.y + (entry.radius ?? 0), order: 3, draw: () => this._drawGeometryObstacle(entry, game) }));
    const actors = [
      ...geometryActors,
      ...(game.entities.destructibles ?? []).filter((entry) => this._isVisibleActor(entry, game, 120)).map((entry) => ({ y: entry.y, order: 1, draw: () => this._drawDestructible(entry, game) })),
      ...(game.entities.corpses ?? []).filter((entry) => this._isVisibleActor(entry, game, 100)).map((entry) => ({ y: entry.y, order: 0, draw: () => this._drawCorpse(entry) })),
      ...game.entities.loot.filter((entry) => this._isVisibleActor(entry, game, 90)).map((entry) => ({ y: entry.y, order: 2, draw: () => this._drawLoot(entry) })),
      ...game.entities.enemies.filter((entry) => this._isVisibleActor(entry, game, entry.boss ? 260 : 130)).map((entry) => ({ y: entry.y, order: 4, draw: () => this._drawEnemy(entry, game) })),
      { y: game.player.y, order: 5, draw: () => this._drawPlayer(game.player, game) }
    ];
    actors.sort((left, right) => left.y - right.y || left.order - right.order).forEach((entry) => entry.draw());
    game.entities.projectiles.filter((entry) => this._isVisibleActor(entry, game, 120)).forEach((projectile) => this._drawProjectile(projectile));
    game.entities.effects.filter((effect) => effect.kind !== 'float' && effect.kind !== 'ground-decal' && this._isVisibleActor(effect, game, Math.max(120, effect.radius ?? 0))).forEach((effect) => this._drawEffect(effect));
    game.entities.particles.filter((entry) => this._isVisibleActor(entry, game, 80)).forEach((particle) => this._drawParticle(particle));
    game.entities.effects.filter((effect) => effect.kind === 'float' && this._isVisibleActor(effect, game, 100)).forEach((effect) => this._drawEffect(effect));
    ctx.restore();
    this._drawScreenTreatment(game);
    if (game.hasEndgameModifier?.('darkness') || game.endgame?.modifier?.id === 'darkness') this._drawDarkness(game);
    if (camera.flash > 0 && game.settings?.reducedFlashing !== true) {
      ctx.fillStyle = `rgba(255, 243, 208, ${camera.flash * 0.28})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  _drawBackdrop(game) {
    const { ctx, viewport } = this;
    const gradient = ctx.createLinearGradient(0, 0, viewport.width, viewport.height);
    gradient.addColorStop(0, '#0f161d');
    gradient.addColorStop(0.55, '#15191e');
    gradient.addColorStop(1, '#090d12');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, viewport.width, viewport.height);
    ctx.fillStyle = 'rgba(255,255,255,.025)';
    for (let x = -20; x < viewport.width + 20; x += 64) ctx.fillRect(x, 0, 1, viewport.height);
    for (let y = -20; y < viewport.height + 20; y += 64) ctx.fillRect(0, y, viewport.width, 1);
    if (!game.player) {
      const glow = ctx.createRadialGradient(viewport.width * 0.5, viewport.height * 0.48, 10, viewport.width * 0.5, viewport.height * 0.48, Math.max(viewport.width, viewport.height) * 0.58);
      glow.addColorStop(0, 'rgba(104, 192, 179, .14)');
      glow.addColorStop(1, 'rgba(12, 16, 21, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, viewport.width, viewport.height);
    }
  }

  _isVisibleActor(actor, game, margin = 80) {
    if (!actor || !game?.camera) return false;
    const worldScale = this.viewport.scale * (game.camera.zoom ?? 1);
    const width = this.viewport.width / Math.max(0.01, worldScale);
    const height = this.viewport.height / Math.max(0.01, worldScale);
    return actor.x >= game.camera.x - margin && actor.x <= game.camera.x + width + margin
      && actor.y >= game.camera.y - margin && actor.y <= game.camera.y + height + margin;
  }

  _drawMenuAmbient(game) {
    const { ctx, viewport } = this;
    const time = game.clock || 0;
    ctx.save();
    ctx.translate(viewport.width * 0.5, viewport.height * 0.53);
    for (let index = 0; index < 12; index += 1) {
      const angle = index / 12 * Math.PI * 2 + time * 0.08;
      const distance = 140 + Math.sin(time * 0.7 + index) * 22;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * distance, Math.sin(angle) * distance, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = index % 2 ? 'rgba(113, 222, 201, .38)' : 'rgba(216, 157, 255, .3)';
      ctx.fill();
    }
    ctx.restore();
  }

  _drawWorld(game) {
    const { ctx, viewport } = this;
    const camera = game.camera;
    const worldScale = viewport.scale * (camera.zoom ?? 1);
    const left = Math.floor(camera.x / 80) * 80 - 80;
    const top = Math.floor(camera.y / 80) * 80 - 80;
    const right = camera.x + viewport.width / worldScale + 80;
    const bottom = camera.y + viewport.height / worldScale + 80;
    ctx.fillStyle = '#0d1418';
    ctx.fillRect(camera.x - 10, camera.y - 10, viewport.width / worldScale + 20, viewport.height / worldScale + 20);
    ZONES.forEach((zone) => {
      if (zone.x > right || zone.y > bottom || zone.x + zone.width < left || zone.y + zone.height < top) return;
      const progress = game.getZoneProgress?.(zone.id);
      const corruption = progress?.corruption ?? (zone.safe ? 0 : Math.min(60, zone.level * 3));
      ctx.save();
      ctx.beginPath(); ctx.rect(zone.x, zone.y, zone.width, zone.height); ctx.clip();
      const hasTerrainPlate = this._drawTerrainPlate(zone, corruption);
      if (!hasTerrainPlate) {
        const ground = ctx.createLinearGradient(zone.x, zone.y, zone.x + zone.width, zone.y + zone.height);
        const alpha = zone.safe ? 0.62 : progress?.liberated ? 0.36 : 0.31 + corruption * 0.003;
        ground.addColorStop(0, rgba(zone.color, alpha));
        ground.addColorStop(0.55, rgba(zone.color, alpha * 0.72));
        ground.addColorStop(1, 'rgba(10, 15, 18, .86)');
        ctx.fillStyle = ground;
        ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
        this._drawGroundTexture(zone, left, top, right, bottom, corruption);
      } else {
        // The painted plates carry the environmental storytelling.  Keep only
        // a whisper of simulation texture so it can signal corruption without
        // turning the map back into generic coloured ground.
        ctx.globalAlpha = 0.075;
        this._drawGroundTexture(zone, left, top, right, bottom, corruption);
        ctx.globalAlpha = 1;
      }
      // Painted terrain and simulation props now coexist: the plate supplies
      // broad composition, while these alpha-cut assets give the live world
      // parallax, silhouette, firelight, and local identity.
      this._drawZoneScenery(zone, left, top, right, bottom, game.clock);
      if (!zone.safe && corruption > 58) {
        ctx.strokeStyle = 'rgba(224, 90, 80, .22)'; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.arc(zone.x + zone.width * 0.5, zone.y + zone.height * 0.5, 84 + Math.sin(game.clock * 2) * 8, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    });
  }

  _drawTerrainPlate(zone, corruption) {
    const { ctx } = this;
    const image = this.assets.terrain;
    if (!this._assetReady(image)) return false;
    ctx.save();
    ctx.globalAlpha = 1;
    // The generated terrain atlas contains six independent square plates.
    // Selecting its authored cell avoids the old repeated generic texture and
    // keeps every region visually distinct without a loading round-trip per zone.
    const columns = 3;
    const rows = 2;
    const sourceWidth = image.naturalWidth / columns;
    const sourceHeight = image.naturalHeight / rows;
    const terrainIndex = Number.isInteger(zone.terrainIndex) ? zone.terrainIndex : ZONES.findIndex((entry) => entry.id === zone.id);
    const column = Math.max(0, terrainIndex % columns);
    const row = Math.max(0, Math.floor(terrainIndex / columns));
    ctx.drawImage(image, column * sourceWidth, row * sourceHeight, sourceWidth, sourceHeight, zone.x, zone.y, zone.width, zone.height);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = rgba(zone.color, zone.safe ? 0.015 : 0.028 + corruption * 0.0008);
    ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
    ctx.globalCompositeOperation = 'screen';
    const glow = ctx.createRadialGradient(zone.x + zone.width * 0.5, zone.y + zone.height * 0.5, 32, zone.x + zone.width * 0.5, zone.y + zone.height * 0.5, Math.max(zone.width, zone.height) * 0.58);
    glow.addColorStop(0, rgba(zone.safe ? '#92c9bd' : zone.color, zone.safe ? 0.025 : 0.012));
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
    ctx.restore();
    return true;
  }

  _drawDistricts(game) {
    const { ctx, viewport } = this;
    const worldScale = viewport.scale * (game.camera.zoom ?? 1);
    const current = game.getDistrict?.();
    const discovered = new Set(game.player?.worldProgress?.discoveredDistricts ?? []);
    const left = game.camera.x - 30;
    const top = game.camera.y - 30;
    const right = game.camera.x + viewport.width / worldScale + 30;
    const bottom = game.camera.y + viewport.height / worldScale + 30;
    DISTRICTS.forEach((district) => {
      if (district.x > right || district.y > bottom || district.x + district.width < left || district.y + district.height < top) return;
      const active = current?.id === district.id;
      ctx.save();
      ctx.strokeStyle = active ? 'rgba(242, 211, 128, .28)' : 'rgba(219, 230, 220, .065)';
      ctx.lineWidth = active ? 2.2 : 1;
      ctx.setLineDash(active ? [10, 12] : [4, 18]);
      ctx.strokeRect(district.x + 5, district.y + 5, district.width - 10, district.height - 10);
      ctx.setLineDash([]);
      if (active || discovered.has(district.id)) {
        const x = district.x + district.width * 0.5;
        const y = district.y + 32;
        ctx.textAlign = 'center';
        ctx.font = active ? '700 13px system-ui' : '600 10px system-ui';
        ctx.fillStyle = active ? 'rgba(251, 230, 169, .88)' : 'rgba(225, 231, 222, .36)';
        ctx.fillText(district.name.toUpperCase(), x, y);
        if (active) {
          ctx.font = '600 9px system-ui';
          ctx.fillStyle = 'rgba(142, 216, 199, .72)';
          ctx.fillText(`DANGER ${district.danger}`, x, y + 14);
        }
      }
      ctx.restore();
    });
  }

  _drawEncounterRooms(game) {
    const { ctx } = this;
    if (!game.entities.enemies.some((enemy) => !enemy.dead && enemy.roomId)) return;
    const history = game.player?.requiem?.roomHistory ?? {};
    ENCOUNTER_ROOMS.filter((room) => this._isVisibleActor(room, game, room.radius + 80)).forEach((room) => {
      const active = game.encounter?.activeRoomId === room.id;
      const cleared = Boolean(history[room.id]);
      const engaged = active && ['engaged', 'danger'].includes(game.encounter?.state);
      const color = cleared && !engaged ? '#65b7a8' : room.tier >= 3 ? '#d87363' : room.tier === 2 ? '#d5ad67' : '#819e91';
      const pulse = active ? 1 + Math.sin(game.clock * 2.8) * .018 : 1;
      ctx.save();
      ctx.translate(room.x, room.y);
      ctx.scale(pulse, pulse);
      const wash = ctx.createRadialGradient(0, 0, room.radius * .12, 0, 0, room.radius);
      wash.addColorStop(0, rgba(color, engaged ? .07 : .035));
      wash.addColorStop(.7, rgba(color, engaged ? .025 : .012));
      wash.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = wash;
      ctx.beginPath(); ctx.ellipse(0, 0, room.radius, room.radius * .62, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = rgba(color, active ? .42 : cleared ? .13 : .18);
      ctx.lineWidth = active ? 2.2 : 1.2;
      ctx.setLineDash(active ? [18, 11] : [8, 15]);
      ctx.beginPath(); ctx.ellipse(0, 0, room.radius * .86, room.radius * .52, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = rgba(color, active ? .38 : .12);
      ctx.lineWidth = 1;
      for (let index = 0; index < Math.min(5, room.formation.length); index += 1) {
        const angle = index / room.formation.length * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * 28;
        const y = Math.sin(angle) * 16;
        ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x, y - 4); ctx.lineTo(x + 4, y); ctx.lineTo(x, y + 4); ctx.closePath(); ctx.stroke();
      }
      ctx.restore();
    });
  }

  _drawExpeditionArena(game) {
    const arena = game.getActiveExpeditionArena?.();
    if (!arena || !this._isVisibleActor(arena, game, arena.radius + 120)) return;
    const { ctx } = this;
    const pulse = 1 + Math.sin(game.clock * 2.35) * .012;
    ctx.save();
    ctx.translate(arena.x, arena.y);
    ctx.scale(pulse, pulse);
    const floor = ctx.createRadialGradient(0, 0, arena.radius * .08, 0, 0, arena.radius);
    floor.addColorStop(0, rgba(arena.color, .06));
    floor.addColorStop(.72, 'rgba(8, 10, 13, .03)');
    floor.addColorStop(1, 'rgba(4, 5, 8, .42)');
    ctx.fillStyle = floor;
    ctx.beginPath(); ctx.arc(0, 0, arena.radius, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = rgba(arena.color, arena.sealed ? .7 : .24);
    ctx.lineWidth = arena.sealed ? 7 : 2;
    ctx.setLineDash(arena.sealed ? [24, 9, 5, 9] : [18, 18]);
    ctx.lineDashOffset = -game.clock * (arena.sealed ? 22 : 7);
    ctx.beginPath(); ctx.arc(0, 0, arena.radius, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    for (let index = 0; index < 12; index += 1) {
      const angle = index * Math.PI / 6;
      const inner = arena.radius - 13;
      const outer = arena.radius + (arena.sealed ? 23 : 12);
      ctx.strokeStyle = rgba(index % 3 === 0 ? '#f1d28f' : arena.color, arena.sealed ? .58 : .2);
      ctx.lineWidth = index % 3 === 0 ? 3 : 1.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      ctx.stroke();
      if (arena.sealed && index % 3 === 0) {
        const x = Math.cos(angle) * (outer + 5);
        const y = Math.sin(angle) * (outer + 5);
        ctx.fillStyle = rgba('#f0d08b', .7 + Math.sin(game.clock * 4 + index) * .16);
        ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  _drawMoveCommand(game) {
    const command = game.player?.moveCommand;
    if (!command || !Number.isFinite(command.x) || !Number.isFinite(command.y)) return;
    const { ctx } = this;
    const pulse = 1 + Math.sin(game.clock * 8) * .1;
    const color = command.targetId ? '#e6c778' : '#8dd8cb';
    ctx.save();
    ctx.translate(command.x, command.y);
    ctx.scale(pulse, pulse * .58);
    ctx.strokeStyle = rgba(color, .82);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, command.targetId ? 22 : 14, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(0, -5); ctx.lineTo(5, 0); ctx.lineTo(0, 5); ctx.closePath(); ctx.stroke();
    ctx.restore();
  }

  _drawGroundTexture(zone, left, top, right, bottom, corruption) {
    const { ctx } = this;
    const startX = Math.max(zone.x, Math.floor(left / 64) * 64 - 64);
    const startY = Math.max(zone.y, Math.floor(top / 64) * 64 - 64);
    const endX = Math.min(zone.x + zone.width, right + 64);
    const endY = Math.min(zone.y + zone.height, bottom + 64);
    for (let x = startX; x < endX; x += 64) {
      for (let y = startY; y < endY; y += 64) {
        const seed = seededValue(Math.floor(x * 0.071 + y * 0.031 + zone.level * 19));
        if (seed < 0.38) {
          ctx.fillStyle = seed < 0.12 ? 'rgba(5, 8, 10, .12)' : 'rgba(239, 226, 190, .018)';
          ctx.beginPath(); ctx.ellipse(x + seed * 47, y + (1 - seed) * 39, 11 + seed * 16, 3 + seed * 6, seed * Math.PI, 0, Math.PI * 2); ctx.fill();
        }
        if (corruption > 44 && seed > 0.83) {
          ctx.strokeStyle = 'rgba(214, 73, 74, .13)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x + 12, y + 8); ctx.lineTo(x + 31, y + 26); ctx.lineTo(x + 21, y + 46); ctx.stroke();
        }
      }
    }
  }

  _drawZoneScenery(zone, left, top, right, bottom, clock) {
    const { ctx } = this;
    (this.scenery[zone.id] ?? []).forEach((entry, index) => {
      if (entry.keepout || (this.graphicsQuality === 'low' && index % 2) || (this.graphicsQuality === 'high' && index % 5 === 4)) return;
      const size = entry.size;
      if (entry.x < left - 90 || entry.y < top - 110 || entry.x > right + 90 || entry.y > bottom + 110) return;
      const propIndex = PROP_SPRITES[entry.kind];
      if (!Number.isInteger(propIndex)) return;
      const broad = ['tent', 'broken-wall', 'buttress', 'bloodroot', 'dead-tree'].includes(entry.kind);
      const flat = ['pool', 'rift'].includes(entry.kind);
      const width = (broad ? 106 : flat ? 88 : 78) * size;
      const height = (broad ? 122 : flat ? 88 : 96) * size;
      ctx.save();
      ctx.translate(entry.x, entry.y);
      if (entry.kind === 'brazier' || entry.kind === 'ash-pyre' || entry.kind === 'rift') {
        const color = entry.kind === 'rift' ? '#9f7cf4' : '#ff9a55';
        const pulse = .72 + Math.sin(clock * 4.4 + entry.phase) * .16;
        ctx.globalCompositeOperation = 'screen';
        const glow = ctx.createRadialGradient(0, -8 * size, 2, 0, -8 * size, 54 * size);
        glow.addColorStop(0, rgba(color, .24 * pulse)); glow.addColorStop(1, rgba(color, 0));
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, -8 * size, 54 * size, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
      if (!flat) {
        ctx.fillStyle = 'rgba(2, 5, 7, .34)';
        ctx.beginPath(); ctx.ellipse(6 * size, 15 * size, width * .34, height * .11, -.12, 0, Math.PI * 2); ctx.fill();
      }
      ctx.rotate((seededValue(entry.x * .017 + entry.y * .009) - .5) * .14);
      ctx.globalAlpha = this.graphicsQuality === 'ultra' ? .94 : .86;
      this._drawAtlas(this.assets.props, 4, 4, propIndex, 0, -height * .18, width, height);
      ctx.restore();
    });
  }

  _drawAmbientActors(game) {
    const context = game.presentation?.getContext?.();
    const actors = game.presentation?.animationDirector?.getAmbientActors?.(context) ?? [];
    if (!actors.length) return;
    const { ctx, viewport } = this;
    const worldScale = viewport.scale * (game.camera.zoom ?? 1);
    const width = viewport.width / worldScale;
    const height = viewport.height / worldScale;
    const left = game.camera.x - 60;
    const top = game.camera.y - 60;
    const right = game.camera.x + width + 60;
    const bottom = game.camera.y + height + 60;
    actors.forEach((actor, index) => {
      const time = game.clock + actor.phase;
      const walking = actor.routine === 'walk';
      const route = walking ? Math.sin(time * 0.38 + index) * 42 : 0;
      const x = actor.x + route;
      const y = actor.y + (walking ? Math.sin(time * 0.76 + index) * 18 : 0);
      if (x < left || x > right || y < top || y > bottom) return;
      const facing = walking ? Math.cos(time * 0.38 + index) >= 0 ? 0 : Math.PI : actor.routine === 'converse' ? index % 2 ? 0 : Math.PI : -0.25;
      const job = NPC_SPRITES[actor.job] ?? NPC_SPRITES.pilgrim;
      const frame = walking ? (Math.floor(time * 5.4 + index) % 2 ? 1 : 0) : actor.routine === 'work' || actor.routine === 'converse' ? 2 : 0;
      ctx.save();
      ctx.translate(x, y + Math.sin(time * 2.1) * (walking ? 1.6 : 0.5));
      ctx.fillStyle = 'rgba(3,5,6,.42)'; ctx.beginPath(); ctx.ellipse(0, 10, 13, 4, 0, 0, Math.PI * 2); ctx.fill();
      if (Math.cos(facing) < 0) ctx.scale(-1, 1);
      this._drawAtlas(this.assets.npcs, 4, 4, frame * 4 + job, 0, -15, 48, 72);
      ctx.restore();
    });
  }

  _drawAtmosphere(game) {
    const { ctx, viewport } = this;
    const camera = game.camera;
    const worldScale = viewport.scale * (camera.zoom ?? 1);
    const width = viewport.width / worldScale;
    const height = viewport.height / worldScale;
    const zone = zoneAt(game.player.x, game.player.y);
    const profile = {
      sanctuary: { color: '#79c5b5', accent: '#ffb36b', density: 13, drift: 0.62, weather: 'embers' },
      gravewake: { color: '#9cae98', accent: '#d5e0d7', density: 18, drift: 0.46, weather: 'ash' },
      redfen: { color: '#a45161', accent: '#e09a78', density: 22, drift: 0.34, weather: 'spores' },
      cairnreach: { color: '#93b5ca', accent: '#e6edf1', density: 16, drift: 0.78, weather: 'rain' },
      'veiled-road': { color: '#9270dc', accent: '#b6a6ff', density: 25, drift: 1.12, weather: 'rift' },
      bellscar: { color: '#d05d55', accent: '#f2b36f', density: 27, drift: 0.58, weather: 'cinders' }
    }[zone.id] ?? { color: '#788b72', accent: '#e2d8bd', density: 14, drift: 0.6 };
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const light = ctx.createRadialGradient(game.player.x, game.player.y, 20, game.player.x, game.player.y, 290);
    light.addColorStop(0, rgba(profile.color, .14)); light.addColorStop(.55, rgba(profile.color, .038)); light.addColorStop(1, rgba(profile.color, 0));
    ctx.fillStyle = light; ctx.fillRect(camera.x, camera.y, width, height);
    const density = Math.round(profile.density * (this.graphicsQuality === 'ultra' ? 1.55 : this.graphicsQuality === 'low' ? .55 : 1));
    for (let index = 0; index < density; index += 1) {
      const phase = game.clock * profile.drift * (0.54 + index * 0.022) + index * 1.97;
      const x = camera.x + seededValue(index * 19.7 + zone.level) * width + Math.sin(phase) * (15 + index % 4 * 7);
      const y = camera.y + seededValue(index * 31.3 + zone.level) * height + Math.cos(phase * 1.3) * (11 + index % 3 * 6);
      const isAccent = index % (zone.id === 'bellscar' ? 3 : 5) === 0;
      ctx.fillStyle = isAccent ? rgba(profile.accent, zone.id === 'bellscar' ? .3 : .2) : rgba(profile.color, .15);
      if (profile.weather === 'rain' && index % 2 === 0) {
        ctx.strokeStyle = rgba(profile.accent, .13); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 7, y + 24 + index % 4 * 5); ctx.stroke();
      } else if (profile.weather === 'cinders' && index % 3 === 0) {
        ctx.fillStyle = rgba(profile.accent, .32);
        ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x + 2.5, y + 4); ctx.lineTo(x - 2.5, y + 4); ctx.closePath(); ctx.fill();
      } else if (zone.id === 'redfen' && index % 4 === 0) {
        ctx.beginPath(); ctx.ellipse(x, y, 10 + index % 5 * 3, 2 + index % 3, phase * .2, 0, Math.PI * 2); ctx.fill();
      } else if (profile.weather === 'rift' && index % 4 === 0) {
        ctx.strokeStyle = rgba(profile.accent, .28); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, 4 + index % 3 * 2, phase, phase + Math.PI * 1.25); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(x, y, 1 + (index % 4) * .48, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  _drawScreenTreatment(game) {
    const { ctx, viewport } = this;
    const vignette = ctx.createRadialGradient(viewport.width * .5, viewport.height * .48, Math.min(viewport.width, viewport.height) * .15, viewport.width * .5, viewport.height * .5, Math.max(viewport.width, viewport.height) * .78);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)'); vignette.addColorStop(1, 'rgba(2, 5, 8, .42)');
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, viewport.width, viewport.height);
    const ultimate = game.player?.animation?.type === 'ultimate' ? clamp(1 - (game.player.animation.time ?? 0) / Math.max(.01, game.player.animation.duration ?? 1), 0, 1) : 0;
    if (ultimate > 0 && game.settings?.reducedVfx !== true) {
      const color = game.getHybrid?.()?.color ?? '#d5ad67';
      const glow = ctx.createRadialGradient(viewport.width * .5, viewport.height * .55, 20, viewport.width * .5, viewport.height * .55, Math.max(viewport.width, viewport.height) * .72);
      glow.addColorStop(0, rgba(color, .08 + Math.sin(ultimate * Math.PI) * .1)); glow.addColorStop(1, rgba(color, 0));
      ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = glow; ctx.fillRect(0, 0, viewport.width, viewport.height); ctx.globalCompositeOperation = 'source-over';
    }
    const introBoss = game.entities?.enemies?.find((enemy) => enemy.boss && !enemy.dead && (enemy.bossIntroTime ?? 0) > 0);
    if (introBoss) {
      const t = clamp((introBoss.bossIntroTime ?? 0) / 2.35, 0, 1);
      const reveal = Math.sin((1 - t) * Math.PI);
      ctx.fillStyle = `rgba(0,0,0,${0.32 * Math.max(0, t - .12)})`; ctx.fillRect(0, 0, viewport.width, viewport.height);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,.9)'; ctx.shadowBlur = 12;
      ctx.fillStyle = `rgba(241,229,202,${clamp(reveal * 1.6, 0, 1)})`;
      ctx.font = '700 28px Georgia, serif'; ctx.fillText(String(introBoss.name ?? 'Road Sovereign').toUpperCase(), viewport.width * .5, viewport.height * .22);
      ctx.fillStyle = `rgba(213,173,103,${clamp(reveal * 1.25, 0, .9)})`;
      ctx.font = '700 11px system-ui'; ctx.fillText('COVENANT BOSS · THREE PHASES', viewport.width * .5, viewport.height * .22 + 32);
    }
    if (game.player?.campaign?.stageId === 'defeat-bell-witness') {
      ctx.fillStyle = 'rgba(135, 51, 74, .06)'; ctx.fillRect(0, 0, viewport.width, viewport.height);
    } else if (game.player?.campaign?.stageId === 'break-choir-seals') {
      ctx.fillStyle = 'rgba(185, 135, 73, .045)'; ctx.fillRect(0, 0, viewport.width, viewport.height);
    } else if (game.player?.campaign?.stageId === 'defeat-tolling-abbot') {
      ctx.fillStyle = 'rgba(152, 48, 42, .09)'; ctx.fillRect(0, 0, viewport.width, viewport.height);
    }
  }

  _drawRoad(x1, y1, x2, y2, color) {
    const { ctx } = this;
    ctx.strokeStyle = 'rgba(5, 7, 9, .42)';
    ctx.lineWidth = 64;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(x1 + 540, y1 - 120, x2 - 420, y2 + 170, x2, y2);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 50;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(x1 + 540, y1 - 120, x2 - 420, y2 + 170, x2, y2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(235, 218, 181, .17)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 14]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  _landmarkSpriteIndex(landmark) {
    if (landmark.variant === 'seal-gold') return 12;
    if (landmark.variant === 'seal-ash') return 13;
    if (landmark.variant === 'seal-hollow') return 14;
    if (landmark.variant === 'reliquary') return 4;
    if (landmark.variant === 'vault' || landmark.kind === 'boss') return 5;
    if (landmark.variant === 'gate') return landmark.zoneId === 'veiled-road' ? 10 : landmark.zoneId === 'bellscar' ? 15 : 3;
    if (landmark.kind === 'waypoint') return 0;
    if (landmark.kind === 'delve') return landmark.zoneId === 'redfen' ? 2 : landmark.zoneId === 'veiled-road' ? 10 : landmark.zoneId === 'cairnreach' ? 8 : 1;
    if (landmark.kind === 'lore') return 7;
    if (landmark.kind === 'stronghold') return 6;
    if (landmark.kind === 'forge') return 11;
    if (landmark.kind === 'endgame') return 4;
    return landmark.id === 'maelin' ? 0 : 9;
  }

  _drawSanctuaryEvolution(game) {
    if (!game?.player || zoneAt(game.player.x, game.player.y).id !== 'sanctuary' || typeof game.getSanctuaryPresentation !== 'function') return;
    const presentation = game.getSanctuaryPresentation();
    if (!presentation) return;
    const { ctx } = this;
    const lighting = presentation.lighting;
    if (lighting?.color) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const glow = ctx.createRadialGradient(560, 520, 40, 560, 520, 520);
      glow.addColorStop(0, rgba(lighting.color, 0.08));
      glow.addColorStop(1, rgba(lighting.color, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 1050, 1110);
      ctx.restore();
    }
    for (const prop of presentation.props ?? []) {
      const index = PROP_SPRITES[prop.kind];
      if (!Number.isInteger(index)) continue;
      ctx.save();
      ctx.translate(prop.x, prop.y);
      ctx.fillStyle = 'rgba(2,5,7,.3)';
      ctx.beginPath(); ctx.ellipse(0, 15, 30, 8, 0, 0, Math.PI * 2); ctx.fill();
      this._drawAtlas(this.assets.props, 4, 4, index, 0, -20, 78, 96);
      ctx.restore();
    }
    for (const npc of presentation.npcs ?? []) {
      const job = NPC_SPRITES[npc.job] ?? NPC_SPRITES.pilgrim;
      ctx.save();
      ctx.translate(npc.x, npc.y);
      ctx.fillStyle = 'rgba(2,5,7,.36)'; ctx.beginPath(); ctx.ellipse(0, 11, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
      this._drawAtlas(this.assets.npcs, 4, 4, job, 0, -16, 48, 72);
      ctx.restore();
    }
  }

  _drawLandmarks(game) {
    const { ctx } = this;
    game.entities.landmarks.forEach((landmark) => {
      const playerDistance = game.player ? Math.hypot(landmark.x - game.player.x, landmark.y - game.player.y) : Infinity;
      const reclaimed = landmark.kind === 'stronghold' && game.player?.worldProgress?.strongholds?.[landmark.id];
      const sealed = (landmark.kind === 'boss' && !game._campaignComplete?.()) || (landmark.kind === 'campaign' && game.isCampaignLandmarkAvailable && !game.isCampaignLandmarkAvailable(landmark.id));
      const campaignTarget = landmark.kind === 'campaign' && game.isCampaignLandmarkTarget?.(landmark.id);
      const sealResolved = ['golden-choir', 'ashen-choir', 'hollow-choir'].includes(landmark.id) && game._hasBrokenChoirSeal?.(landmark.id);
      const color = sealed ? '#777071'
        : landmark.kind === 'campaign' ? campaignTarget ? '#f0d183' : sealResolved ? '#9bd8cf' : '#90cabd'
          : landmark.kind === 'boss' ? '#e6686a'
            : landmark.kind === 'endgame' || landmark.kind === 'delve' ? '#e6c875'
              : landmark.kind === 'lore' ? '#b69de8'
                : landmark.kind === 'waypoint' ? '#78d9d5'
                  : reclaimed ? '#8bd7aa' : '#82d9c7';
      const pulse = 1 + Math.sin(game.clock * 2 + landmark.x) * .07;
      const spriteSize = landmark.kind === 'delve' ? 132 : landmark.kind === 'stronghold' || landmark.kind === 'boss' || landmark.variant === 'gate' ? 148 : 116;
      ctx.save();
      ctx.translate(landmark.x, landmark.y);
      ctx.fillStyle = 'rgba(2, 4, 6, .42)'; ctx.beginPath(); ctx.ellipse(0, 18, spriteSize * .28, spriteSize * .09, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = sealed ? .48 : 1;
      this._drawAtlas(this.assets.entrances, 4, 4, this._landmarkSpriteIndex(landmark), 0, -spriteSize * .23, spriteSize * pulse, spriteSize * pulse);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = rgba(color, .66); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, 16, 28 * pulse, 11 * pulse, 0, 0, Math.PI * 2); ctx.stroke();
      if (playerDistance < 142) {
        ctx.fillStyle = 'rgba(8, 12, 16, .84)'; ctx.fillRect(-100, -spriteSize * .82, 200, 22);
        ctx.fillStyle = '#f1e4c8'; ctx.font = '600 12px system-ui'; ctx.textAlign = 'center'; ctx.fillText(`[X] ${sealed ? `${landmark.label} · sealed` : landmark.label}`, 0, -spriteSize * .82 + 15);
      }
      ctx.restore();
    });
  }

  _drawEvent(game) {
    const { ctx } = this;
    if (!game.worldEvent) return;
    const event = game.worldEvent;
    const ring = 28 + Math.sin(game.clock * 4) * 5;
    ctx.save();
    ctx.translate(event.x, event.y);
    ctx.strokeStyle = 'rgba(247, 132, 92, .85)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, ring, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(247, 218, 132, .45)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, ring * 1.65, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffb06b'; ctx.font = '20px serif'; ctx.textAlign = 'center'; ctx.fillText('✹', 0, 7);
    ctx.restore();
  }

  _drawGeometryObstacle(shape, game) {
    if (!shape) return;
    const { ctx } = this;
    const x = shape.shape === 'rect' ? shape.x + shape.w * .5 : shape.x;
    const y = shape.shape === 'rect' ? shape.y + shape.h * .5 : shape.y;
    const playerBehind = shape.occluder && game?.player && game.player.y < y && Math.abs(game.player.x - x) < (shape.shape === 'rect' ? shape.w * .72 : (shape.radius ?? 50) * 1.6) && Math.abs(game.player.y - y) < 150;
    const alpha = playerBehind ? .28 : .88;
    const propIndex = PROP_SPRITES[shape.prop];
    ctx.save(); ctx.globalAlpha = alpha;
    const size = shape.shape === 'rect' ? Math.max(70, Math.min(180, Math.max(shape.w, shape.h) * .9)) : Math.max(66, (shape.radius ?? 38) * 2.2);
    if (Number.isInteger(propIndex) && this._assetReady(this.assets.props)) {
      this._drawAtlas(this.assets.props, 4, 4, propIndex, x, y - Math.min(34, (shape.height ?? 30) * .18), size, size);
    } else {
      ctx.fillStyle = 'rgba(31,35,34,.78)';
      if (shape.shape === 'circle') { ctx.beginPath(); ctx.ellipse(x, y, shape.radius, shape.radius * .48, 0, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(shape.x, shape.y, shape.w, shape.h);
    }
    ctx.restore();
  }

  _drawHazard(hazard) {
    const { ctx } = this;
    const fade = clamp(hazard.life / Math.min(0.65, hazard.maxLife), 0, 1);
    const pulse = 1 + Math.sin(hazard.life * 6) * 0.035;
    ctx.save();
    ctx.translate(hazard.x, hazard.y);
    ctx.scale(pulse, pulse);
    const gradient = ctx.createRadialGradient(0, 0, 2, 0, 0, hazard.radius);
    gradient.addColorStop(0, rgba(hazard.color, hazard.owner === 'player' ? 0.2 * fade : 0.3 * fade));
    gradient.addColorStop(0.72, rgba(hazard.color, 0.11 * fade));
    gradient.addColorStop(1, rgba(hazard.color, 0));
    ctx.fillStyle = gradient;
    ctx.beginPath(); ctx.arc(0, 0, hazard.radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = rgba(hazard.color, 0.55 * fade);
    ctx.lineWidth = hazard.kind.includes('siege') || hazard.kind === 'verdict' ? 3 : 1.5;
    ctx.setLineDash(hazard.owner === 'enemy' ? [7, 6] : []);
    ctx.beginPath(); ctx.arc(0, 0, hazard.radius * 0.92, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    if (['thornwall', 'orchid', 'citadel', 'verdict', 'eclipse', 'covenant-avatar', 'gravetide'].includes(hazard.kind)) {
      ctx.strokeStyle = rgba(hazard.color, 0.62 * fade);
      for (let index = 0; index < 6; index += 1) {
        const angle = index / 6 * Math.PI * 2 + hazard.life * 0.5;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(angle) * hazard.radius * 0.72, Math.sin(angle) * hazard.radius * 0.72); ctx.stroke();
      }
    }
    ctx.restore();
  }

  _drawDynamicLights(game) {
    if (this.graphicsQuality === 'low') return;
    const { ctx, viewport } = this;
    const worldScale = viewport.scale * (game.camera.zoom ?? 1);
    const width = viewport.width / worldScale;
    const height = viewport.height / worldScale;
    const left = game.camera.x - 90;
    const top = game.camera.y - 90;
    const right = game.camera.x + width + 90;
    const bottom = game.camera.y + height + 90;
    const zone = zoneAt(game.player.x, game.player.y);
    const sceneryLights = (this.scenery[zone.id] ?? [])
      .filter((entry) => !entry.keepout && ['brazier', 'ash-pyre', 'rift'].includes(entry.kind) && entry.x > left && entry.x < right && entry.y > top && entry.y < bottom)
      .map((entry) => ({ x: entry.x, y: entry.y - 10, radius: entry.kind === 'rift' ? 120 : 104, color: entry.kind === 'rift' ? '#8d70ef' : '#ff9c55', alpha: .12 }));
    const hazardLights = game.entities.hazards
      .filter((entry) => entry.x > left && entry.x < right && entry.y > top && entry.y < bottom)
      .slice(0, this.graphicsQuality === 'ultra' ? 14 : 8)
      .map((entry) => ({ x: entry.x, y: entry.y, radius: Math.min(170, entry.radius * 1.45), color: entry.color, alpha: entry.owner === 'player' ? .13 : .095 }));
    const projectileLights = game.entities.projectiles
      .filter((entry) => entry.x > left && entry.x < right && entry.y > top && entry.y < bottom)
      .slice(0, this.graphicsQuality === 'ultra' ? 12 : 6)
      .map((entry) => ({ x: entry.x, y: entry.y, radius: 38 + entry.radius * 2.2, color: entry.color, alpha: .12 }));
    const budget = this.graphicsQuality === 'ultra' ? 32 : 18;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    [...sceneryLights, ...hazardLights, ...projectileLights].slice(0, budget).forEach((light, index) => {
      const pulse = .88 + Math.sin(game.clock * 5 + index * 1.7) * .12;
      const gradient = ctx.createRadialGradient(light.x, light.y, 2, light.x, light.y, light.radius * pulse);
      gradient.addColorStop(0, rgba(light.color, light.alpha));
      gradient.addColorStop(.45, rgba(light.color, light.alpha * .35));
      gradient.addColorStop(1, rgba(light.color, 0));
      ctx.fillStyle = gradient;
      ctx.beginPath(); ctx.arc(light.x, light.y, light.radius * pulse, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }

  _drawDestructible(destructible, game) {
    const { ctx } = this;
    const fade = destructible.broken ? clamp(destructible.life / Math.min(1.2, destructible.maxLife), 0, 1) : 1;
    const hit = clamp((destructible.hitTime ?? 0) / .18, 0, 1);
    const propIndex = destructible.kind === 'ritual-vessel' ? PROP_SPRITES.shrine : PROP_SPRITES.crates;
    const spriteSize = Math.max(78, destructible.radius * (destructible.kind === 'ritual-vessel' ? 4.25 : 3.75));
    ctx.save();
    ctx.translate(destructible.x, destructible.y);
    ctx.rotate(Math.sin(game.clock * 35 + destructible.variant) * hit * .09);
    ctx.globalAlpha = fade;
    ctx.fillStyle = 'rgba(2,4,5,.42)'; ctx.beginPath(); ctx.ellipse(0, destructible.radius * .72, destructible.radius * 1.05, destructible.radius * .34, 0, 0, Math.PI * 2); ctx.fill();
    if (destructible.kind === 'ritual-vessel' && !destructible.broken) {
      const glow = ctx.createRadialGradient(0, -4, 1, 0, -4, destructible.radius * 1.25);
      glow.addColorStop(0, 'rgba(201,129,224,.5)'); glow.addColorStop(1, 'rgba(137,74,157,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, -4, destructible.radius * 1.25, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = destructible.broken ? fade * .38 : fade;
    this._drawAtlas(this.assets.props, 4, 4, propIndex, 0, -destructible.radius * .26, spriteSize, spriteSize);
    if (!destructible.broken && destructible.health < destructible.maxHealth) {
      ctx.strokeStyle = 'rgba(245,220,165,.55)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-4, -8); ctx.lineTo(2, 0); ctx.lineTo(-1, 9); ctx.stroke();
    }
    ctx.restore();
  }

  _drawCorpse(corpse) {
    const { ctx } = this;
    const fade = clamp(corpse.life / Math.min(4, corpse.maxLife), 0, 1);
    const size = Math.min(corpse.boss ? 178 : 104, Math.max(62, corpse.radius * (corpse.boss ? 3.25 : 3.05)));
    ctx.save();
    ctx.translate(corpse.x, corpse.y + corpse.radius * .4 - Math.max(0, corpse.groundElevation ?? 0) * .58);
    const variantTilt = ((corpse.variant ?? 0) - 1) * .18;
    const impulseSlide = Math.min(corpse.impulse ?? 0, 14) * clamp(corpse.life / corpse.maxLife, 0, 1);
    ctx.translate(Math.cos(corpse.angle ?? 0) * impulseSlide, Math.sin(corpse.angle ?? 0) * impulseSlide);
    ctx.rotate((corpse.angle ?? 0) + Math.PI * .5 + variantTilt);
    ctx.fillStyle = `rgba(12, 4, 7, ${.22 * fade})`;
    ctx.beginPath(); ctx.ellipse(0, 0, size * .35, size * .12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.scale(1.08, .42);
    ctx.globalAlpha = (corpse.elite ? .28 : corpse.deathProfile === 'frozen' ? .32 : .21) * fade;
    const sprite = this._enemySprite(corpse.templateId, corpse.elite, corpse.boss);
    this._drawAtlas(sprite.image, 4, 4, 3 * 4 + sprite.column, 0, -corpse.radius * .18, size, size);
    ctx.restore();
  }

  _drawLoot(drop) {
    const { ctx } = this;
    const color = RARITY_COLORS[drop.item.rarity] ?? '#bfc8cd';
    const bob = Math.sin(drop.bob) * 4;
    ctx.save(); ctx.translate(drop.x, drop.y + bob);
    ctx.globalCompositeOperation = 'screen';
    const beam = ctx.createLinearGradient(0, -54, 0, 18);
    beam.addColorStop(0, rgba(color, 0)); beam.addColorStop(.78, rgba(color, .13)); beam.addColorStop(1, rgba(color, .03));
    ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(-10, -48); ctx.lineTo(10, -48); ctx.lineTo(18, 14); ctx.lineTo(-18, 14); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = rgba(color, .24); ctx.fillRect(-16, -16, 32, 32);
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeRect(-12, -12, 24, 24);
    ctx.rotate(-Math.PI / 4);
    this._drawAtlas(this.assets.items, 4, 4, clamp(Math.floor(drop.item.art ?? 0), 0, 15), 0, 0, 25, 25);
    ctx.restore();
    if (drop.item.rarity === 'unique' || drop.item.rarity === 'mythic') {
      ctx.strokeStyle = rgba(color, 0.5); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(drop.x, drop.y + bob, 24 + Math.sin(drop.bob * 2) * 3, 0, Math.PI * 2); ctx.stroke();
    }
  }

  _drawEnemy(enemy, game) {
    const { ctx } = this;
    const death = enemy.dead ? clamp(enemy.deathTime / 0.56, 0, 1) : 1;
    const windup = enemy.state === 'windup' ? 1 - enemy.windupLeft / Math.max(enemy.windup || 1, 0.01) : 0;
    const hurt = enemy.hitFlash > 0 ? 1 : 0;
    const moving = ['move', 'evade', 'chase', 'patrol', 'alert', 'retreat'].includes(enemy.state);
    const gait = game.clock * Math.max(4.2, (enemy.speed ?? 80) * 0.072) + enemy.x * .014 + enemy.y * .006;
    const stride = moving ? Math.sin(gait) * Math.min(3.1, enemy.radius * .11) : Math.sin(gait * .36) * .36;
    const presentation = enemy.presentation ?? {};
    const visualFacing = presentation.visualFacing ?? enemy.facing ?? 0;
    const reaction = presentation.reaction;
    const reactionProgress = reaction ? clamp(reaction.time / reaction.duration, 0, 1) : 0;
    const authoredRecoil = reaction ? Math.sin(reactionProgress * Math.PI) * enemy.radius * (reaction.tier === 'heavy' ? .34 : reaction.tier === 'medium' ? .22 : .11) * (reaction.scale ?? 1) : 0;
    const recoil = authoredRecoil || (enemy.justHit > 0 ? Math.sin(Math.min(1, enemy.justHit * 8) * Math.PI) * enemy.radius * .12 : 0);
    const phasePose = presentation.phasePose ?? 0;
    const scaleX = enemy.knockdown > 0 ? 1.22 : 1 + Math.sin(windup * Math.PI) * 0.13 + phasePose * .18 + (moving ? Math.sin(gait) * .026 : 0);
    const scaleY = enemy.knockdown > 0 ? 0.46 : 1 - Math.sin(windup * Math.PI) * 0.09 - phasePose * .12 - (moving ? Math.sin(gait) * .028 : 0);
    const elevation = Math.max(0, (enemy.elevation ?? 0) + (enemy.groundElevation ?? 0)) * .58;
    const spriteState = enemy.dead || enemy.knockdown > 0 ? 3 : enemy.state === 'windup' || enemy.state === 'attack' || enemy.state === 'phase-transition' ? 2 : moving || enemy.state === 'threaten' ? 1 : 0;
    const frameProgress = spriteState === 2 ? clamp(windup, 0, .999) : spriteState === 3 ? clamp(1 - death, 0, .999) : moving ? ((gait / (Math.PI * 2)) % 1 + 1) % 1 : ((game.clock * 1.8 + enemy.x * .001) % 1 + 1) % 1;
    const motionFrame = Math.min(7, Math.floor(frameProgress * 8));
    const sprite = this._enemySprite(enemy.templateId, enemy.elite, enemy.boss);
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.fillStyle = 'rgba(2, 4, 6, .54)'; ctx.beginPath(); ctx.ellipse(0, enemy.radius * .7, enemy.radius * (1.08 - Math.min(.42, elevation / 130)), enemy.radius * .34, 0, 0, Math.PI * 2); ctx.fill();
    if (game.player?.combatTargetId === enemy.id && !enemy.dead) {
      const pulse = 1 + Math.sin(game.clock * 5.2) * .05;
      ctx.strokeStyle = enemy.boss ? 'rgba(255,205,134,.96)' : 'rgba(230,211,166,.88)';
      ctx.lineWidth = enemy.boss ? 3.2 : 2.2;
      ctx.beginPath(); ctx.ellipse(0, enemy.radius * .62, enemy.radius * 1.38 * pulse, enemy.radius * .48 * pulse, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.translate(-Math.cos(reaction?.direction ?? visualFacing) * recoil, -elevation + stride - Math.sin(reaction?.direction ?? visualFacing) * recoil);
    if (enemy.dead) ctx.rotate((1 - death) * 1.25);
    else if (enemy.state === 'windup') ctx.rotate(Math.sin(windup * Math.PI) * .15);
    else if (enemy.state === 'phase-transition') ctx.rotate(Math.sin(game.clock * 10) * .045 * phasePose);
    else if (moving) ctx.rotate(Math.sin(gait) * .02);
    // The sprite is mirrored for the opposite side instead of continuously
    // rotating it. This keeps enemy silhouettes grounded in the 2.5D plane.
    ctx.scale((Math.cos(visualFacing) < 0 ? -1 : 1) * scaleX, scaleY);
    ctx.globalAlpha = death;
    const spriteSize = Math.max(enemy.boss ? 204 : enemy.elite ? 112 : 88, enemy.radius * (enemy.boss ? 3.72 : enemy.elite ? 3.46 : 3.28));
    const spriteRow = spriteState * 4 + sprite.column;
    const spriteDrawn = this._drawAtlas(sprite.image, 8, 16, spriteRow * 8 + motionFrame, 0, -enemy.radius * .18, spriteSize, spriteSize);
    if (!spriteDrawn) { ctx.restore(); return; }
    if (hurt) {
      ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = death * .42;
      ctx.fillStyle = '#ffe9ce'; ctx.fillRect(-spriteSize * .27, -spriteSize * .43, spriteSize * .54, spriteSize * .72);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = death;
    }
    if (enemy.elite) {
      ctx.strokeStyle = 'rgba(246, 215, 123, .84)'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(0, 1, enemy.radius + 8 + Math.sin(game.clock * 3 + enemy.x) * 1.6, 0, Math.PI * 2); ctx.stroke();
    }
    if (enemy.state === 'windup') {
      const reach = enemy.radius + 16 + Math.sin(windup * Math.PI) * 13;
      ctx.strokeStyle = rgba(enemy.color, .34 + windup * .5); ctx.lineWidth = enemy.boss ? 5 : 3;
      ctx.beginPath(); ctx.arc(Math.cos(visualFacing) * 4, Math.sin(visualFacing) * 4, reach, visualFacing - .52, visualFacing + .52); ctx.stroke();
    }
    if (enemy.elite || enemy.boss) this._drawEnemyRole(enemy);
    if (enemy.marked > 0) {
      ctx.strokeStyle = 'rgba(249, 228, 115, .9)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, enemy.radius + 8 + Math.sin(game.clock * 8) * 2, 0, Math.PI * 2); ctx.stroke();
    }
    if (enemy.shield > 0) {
      ctx.strokeStyle = 'rgba(155, 229, 255, .85)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, enemy.radius + 5, 0, Math.PI * 2); ctx.stroke();
    }
    if (enemy.morale < 0.5 && !enemy.boss) {
      ctx.strokeStyle = 'rgba(227, 194, 123, .72)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, -enemy.radius - 7, 4 + Math.sin(game.clock * 8) * 1.5, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    if (!enemy.dead) this._drawHealth(enemy, game);
  }

  _drawEnemyRole(enemy) {
    const { ctx } = this;
    ctx.save();
    const glow = enemy.role === 'boss' ? '#ffcf96' : enemy.role === 'healer' ? '#f4dfa0' : enemy.role === 'assassin' ? '#d5c3ff' : '#addbd4';
    ctx.fillStyle = 'rgba(6, 9, 12, .72)'; ctx.beginPath(); ctx.arc(0, -enemy.radius - 14, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = rgba(glow, .72); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, -enemy.radius - 14, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = glow; ctx.font = '700 11px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText(roleGlyphs[enemy.role] ?? '•', 0, -10 - enemy.radius);
    ctx.restore();
  }

  _drawHealth(enemy, game) {
    const { ctx } = this;
    if (!enemy.boss && !enemy.elite && enemy.hp >= enemy.maxHp && Math.hypot(enemy.x - game.player.x, enemy.y - game.player.y) > 190) return;
    const width = enemy.boss ? 104 : Math.max(38, enemy.radius * 2.2);
    const y = enemy.y - Math.max(0, enemy.elevation ?? 0) * .58 - enemy.radius - 16;
    ctx.fillStyle = 'rgba(5, 7, 10, .78)'; ctx.fillRect(enemy.x - width / 2, y, width, 5);
    ctx.fillStyle = enemy.boss ? '#ed6f62' : enemy.elite ? '#f0d27d' : '#c75f5f'; ctx.fillRect(enemy.x - width / 2, y, width * clamp(enemy.hp / enemy.maxHp, 0, 1), 5);
    if (enemy.boss) {
      ctx.fillStyle = '#f0ddc4'; ctx.font = '600 11px system-ui'; ctx.textAlign = 'center'; ctx.fillText(`${enemy.name} · Phase ${enemy.phase}`, enemy.x, y - 7);
    }
  }

  _drawProjectile(projectile) {
    const { ctx } = this;
    const alpha = clamp(projectile.life / Math.min(projectile.maxLife, 0.22), 0, 1);
    ctx.save(); ctx.translate(projectile.x, projectile.y); ctx.rotate(projectile.angle);
    const kind = projectile.kind ?? '';
    const spear = /(javelin|spear|harpoon|anchor)/.test(kind);
    const blade = /(knife|blade|cutter|fan)/.test(kind);
    const bone = /(bone|comet|marrow)/.test(kind);
    const trailLength = projectile.radius * (projectile.owner === 'player' ? 4.8 : 3.7);
    const trail = ctx.createLinearGradient(-trailLength, 0, projectile.radius, 0);
    trail.addColorStop(0, rgba(projectile.color, 0));
    trail.addColorStop(.62, rgba(projectile.color, alpha * .24));
    trail.addColorStop(1, rgba(projectile.color, alpha * (spear ? .78 : .62)));
    ctx.strokeStyle = trail; ctx.lineWidth = projectile.radius * (spear ? .48 : .75); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-trailLength, 0); ctx.lineTo(0, 0); ctx.stroke();
    ctx.fillStyle = rgba(projectile.color, alpha);
    if (spear) {
      ctx.beginPath(); ctx.moveTo(projectile.radius * 1.85, 0); ctx.lineTo(-projectile.radius * .92, -projectile.radius * .58); ctx.lineTo(-projectile.radius * .62, 0); ctx.lineTo(-projectile.radius * .92, projectile.radius * .58); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,245,214,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-projectile.radius * .72, 0); ctx.lineTo(projectile.radius * 1.55, 0); ctx.stroke();
    } else if (blade) {
      ctx.beginPath(); ctx.moveTo(projectile.radius * 1.55, 0); ctx.lineTo(-projectile.radius, -projectile.radius * .86); ctx.lineTo(-projectile.radius * .55, 0); ctx.lineTo(-projectile.radius, projectile.radius * .86); ctx.closePath(); ctx.fill();
    } else if (bone) {
      ctx.rotate(Math.PI * .25); ctx.fillRect(-projectile.radius * .72, -projectile.radius * .72, projectile.radius * 1.44, projectile.radius * 1.44);
    } else {
      ctx.beginPath(); ctx.arc(0, 0, projectile.radius, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.68)'; ctx.beginPath(); ctx.arc(-projectile.radius * .28, -projectile.radius * .28, projectile.radius * .35, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  _drawPlayer(player, game) {
    const { ctx } = this;
    const primary = game.getPrimaryClass();
    const secondary = game.getSecondaryClass();
    const hybrid = game.getHybrid();
    const locomotion = player.presentation?.locomotion;
    const profile = player.presentation?.profile;
    const moving = (locomotion?.speedRatio ?? Math.hypot(player.moveX, player.moveY) / 250) > .08 || player.dash;
    const animation = player.animation ?? { type: 'idle', time: 0, duration: 0 };
    const actionType = animation.type ?? 'idle';
    const actionProgress = animation.duration ? clamp(1 - animation.time / animation.duration, 0, 1) : 0;
    const gait = locomotion?.stride ?? game.clock * (player.dash ? 23 : moving ? 12.5 : 2.2) + player.x * .014 + player.y * .006;
    const strideAmplitude = profile?.locomotion?.strideAmplitude ?? 2.2;
    const bob = moving ? Math.sin(gait) * strideAmplitude : Math.sin(gait) * (locomotion?.state === 'injured-idle' ? .34 : .8);
    const hurt = player.deathTime > 0;
    const melee = actionType === 'attack' || actionType === 'execution';
    const casting = ['cast', 'companion', 'hybrid', 'ultimate'].includes(actionType);
    const actionPulse = melee || casting ? Math.sin(actionProgress * Math.PI) : 0;
    const executionLunge = actionType === 'execution' ? actionPulse * 20 : melee ? actionPulse * 8 : 0;
    const dashScale = player.dash ? 1.28 : 1;
    const strideSquash = moving && !player.dash ? Math.sin(gait) * .035 : 0;
    const facingIndex = facingFrame(player.facing);
    const spriteFacing = PLAYER_FACING_ANGLES[facingIndex];
    const elevation = Math.max(0, (player.elevation ?? 0) + (player.groundElevation ?? 0)) * .58;
    ctx.save();
    const reaction = player.presentation?.reaction;
    const reactionAmount = reaction ? Math.sin(clamp(reaction.time / reaction.duration, 0, 1) * Math.PI) * (reaction.tier === 'heavy' ? 10 : 5) : 0;
    ctx.translate(player.x + Math.cos(spriteFacing) * executionLunge - Math.cos(reaction?.direction ?? 0) * reactionAmount, player.y + bob + Math.sin(spriteFacing) * executionLunge - Math.sin(reaction?.direction ?? 0) * reactionAmount);
    ctx.fillStyle = 'rgba(2, 4, 6, .54)'; ctx.beginPath(); ctx.ellipse(0, player.radius * .78, player.radius * Math.max(.56, 1.15 - elevation / 120), player.radius * .38, 0, 0, Math.PI * 2); ctx.fill();
    ctx.translate(0, -elevation);
    if (hurt) ctx.rotate(1.25);
    ctx.scale(dashScale + strideSquash, player.dash ? 0.78 : 1 - strideSquash);
    if (player.barrier > 0) {
      ctx.strokeStyle = 'rgba(112, 237, 223, .72)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, player.radius + 9 + Math.sin(game.clock * 6) * 2, 0, Math.PI * 2); ctx.stroke();
    }
    const spriteSize = player.radius * 7.1;
    const resolvedClip = player.presentation?.resolvedClip;
    const heroMotion = resolvedClip ? this.assets.heroMotion[player.primary] : null;
    this._drawEquipmentLayers(player, game, 2, 2);
    const spriteDrawn = resolvedClip && this._assetReady(heroMotion)
      ? this._drawAtlas(heroMotion, 8, 80, resolvedClip.row * 8 + resolvedClip.frame, 0, -player.radius * .26, spriteSize, spriteSize)
      : false;
    if (!spriteDrawn) { ctx.restore(); return; }
    this._drawEquipmentLayers(player, game, 3, 10);
    const covenantPresentation = player.covenantPresentation;
    if (covenantPresentation?.stage >= 2) {
      const palette = { flame: '#e97643', grave: '#a993c7', blood: '#c74d62', light: '#f0d789', storm: '#7fbbe5', void: '#8b74b6' };
      const covenantColor = palette[covenantPresentation.affinity] ?? hybrid.color;
      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.strokeStyle = covenantColor;
      if (covenantPresentation.overlays.markings) { ctx.globalAlpha = .24; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-player.radius*.4,-player.radius*.5); ctx.lineTo(player.radius*.25,player.radius*.3); ctx.moveTo(player.radius*.42,-player.radius*.42); ctx.lineTo(-player.radius*.12,player.radius*.2); ctx.stroke(); }
      if (covenantPresentation.overlays.eyes) { ctx.globalAlpha = .58; ctx.fillStyle = covenantColor; ctx.beginPath(); ctx.arc(player.radius*.22,-player.radius*.46,1.8,0,Math.PI*2); ctx.arc(player.radius*.36,-player.radius*.43,1.8,0,Math.PI*2); ctx.fill(); }
      if (covenantPresentation.overlays.movement && moving) { ctx.globalAlpha = .16; ctx.setLineDash([5,7]); ctx.beginPath(); ctx.ellipse(-player.radius*.3,player.radius*.42,player.radius*.9,player.radius*.3,0,0,Math.PI*2); ctx.stroke(); }
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = .36;
    ctx.fillStyle = hybrid.color; ctx.beginPath(); ctx.arc(-4, 7, 8, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    // Only the authored 2.5D stance may drive weapon and dodge direction.
    // There is no continuous body rotation around the map plane.
    ctx.save();
    ctx.rotate(spriteFacing);
    this._drawPlayerGesture(player, primary, secondary, hybrid, actionType, actionProgress);
    if (player.covenantPresentation?.overlays?.weapon) {
      const palette = { flame: '#e97643', grave: '#a993c7', blood: '#c74d62', light: '#f0d789', storm: '#7fbbe5', void: '#8b74b6' };
      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = .44; ctx.strokeStyle = palette[player.covenantPresentation.affinity] ?? hybrid.color; ctx.lineWidth = 2.2;
      const reach = player.radius + 20 + actionProgress * 18; ctx.beginPath(); ctx.moveTo(player.radius*.2,1); ctx.lineTo(reach,1); ctx.stroke(); ctx.restore();
    }
    if (casting) {
      const progress = actionProgress;
      ctx.strokeStyle = rgba(hybrid.color, 0.76); ctx.lineWidth = 2 + progress * 2;
      ctx.beginPath(); ctx.arc(0, 0, player.radius + 14 + progress * 18, -0.7, 0.7); ctx.stroke();
    }
    if (actionType === 'companion' && secondary) {
      ctx.strokeStyle = rgba(secondary.color, 0.88); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(player.radius - 3, -9); ctx.lineTo(player.radius + 24 + actionProgress * 14, 0); ctx.lineTo(player.radius - 3, 9); ctx.stroke();
    }
    if (actionType === 'execution') {
      ctx.strokeStyle = 'rgba(255, 240, 175, .9)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(4, -14); ctx.lineTo(player.radius + 30, 0); ctx.lineTo(4, 14); ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  }

  _drawPlayerGesture(player, primary, secondary, hybrid, type, progress) {
    const { ctx } = this;
    if (type === 'attack' || type === 'execution') {
      const swing = -1.08 + progress * 2.16;
      const radius = player.radius + 25 + (type === 'execution' ? 9 : 0);
      const weapon = player.presentation?.profile?.weapon ?? 'longsword';
      ctx.save();
      const strength = Math.max(.05, Math.sin(progress * Math.PI));
      ctx.rotate(swing);
      ctx.strokeStyle = rgba(primary.color, .92 * strength);
      ctx.lineCap = 'round';
      if (weapon === 'dual-blades') {
        ctx.lineWidth = 2.4; [-.24, .24].forEach((offset) => { ctx.beginPath(); ctx.moveTo(player.radius * .15, offset * 22); ctx.lineTo(radius - 7, offset * 12); ctx.stroke(); });
      } else if (weapon === 'thorn-whip') {
        ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(player.radius * .15, 0); ctx.quadraticCurveTo(radius * .65, -18 * Math.sin(progress * Math.PI * 2), radius + 18, 4); ctx.stroke();
      } else if (weapon === 'tower-shield') {
        ctx.lineWidth = 6.5; ctx.beginPath(); ctx.moveTo(player.radius * .15, 0); ctx.lineTo(radius - 8, 0); ctx.stroke();
        ctx.lineWidth = 3; ctx.strokeRect(radius - 13, -9, 12, 18);
      } else if (weapon === 'war-scythe') {
        ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(player.radius * .1, 0); ctx.lineTo(radius + 7, 0); ctx.stroke();
        ctx.beginPath(); ctx.arc(radius + 1, -2, 13, -1.35, .15); ctx.stroke();
      } else if (weapon === 'sun-staff') {
        ctx.lineWidth = 3.1; ctx.beginPath(); ctx.moveTo(-player.radius * .4, 0); ctx.lineTo(radius + 5, 0); ctx.stroke();
        ctx.beginPath(); ctx.arc(radius + 5, 0, 5 + strength * 3, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.lineWidth = type === 'execution' ? 5 : 3.2; ctx.beginPath(); ctx.moveTo(player.radius * .2, 0); ctx.lineTo(radius, 0); ctx.stroke();
        ctx.strokeStyle = 'rgba(255, 239, 195, .64)'; ctx.lineWidth = 1.15; ctx.beginPath(); ctx.moveTo(player.radius * .65, -1); ctx.lineTo(radius - 5, -1); ctx.stroke();
      }
      ctx.restore();
    } else if (['cast', 'companion', 'hybrid', 'ultimate'].includes(type)) {
      const strength = .42 + Math.sin(progress * Math.PI) * .52;
      const color = type === 'companion' && secondary ? secondary.color : hybrid.color;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const orb = ctx.createRadialGradient(player.radius + 8, 0, 1, player.radius + 8, 0, 20 + progress * 14);
      orb.addColorStop(0, rgba('#fff4d2', strength));
      orb.addColorStop(.35, rgba(color, strength * .86));
      orb.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = orb; ctx.beginPath(); ctx.arc(player.radius + 8, 0, 20 + progress * 14, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    if (player.dash) {
      ctx.save();
      ctx.globalAlpha = .22;
      const dodgeStyle = player.presentation?.profile?.dodgeStyle ?? 'chainstep';
      ctx.fillStyle = hybrid.color;
      if (dodgeStyle === 'gloomstep' || dodgeStyle === 'soul-slip') {
        for (let index = 0; index < 3; index += 1) { ctx.beginPath(); ctx.arc(-player.radius * (1 + index * .55), (index - 1) * 4, player.radius * (.6 - index * .1), 0, Math.PI * 2); ctx.fill(); }
      } else {
        ctx.beginPath(); ctx.ellipse(-player.radius * 1.6, 0, player.radius * (dodgeStyle === 'iron-rush' ? 1.45 : 1.1), player.radius * (dodgeStyle === 'lightstep' ? .34 : .5), 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }

  _drawParticle(particle) {
    const { ctx } = this;
    const alpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.fillStyle = rgba(particle.color, alpha * 0.88);
    ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2); ctx.fill();
  }

  _drawEffect(effect) {
    const { ctx } = this;
    const progress = 1 - effect.life / Math.max(effect.maxLife, 0.001);
    const alpha = clamp(effect.life / Math.min(effect.maxLife, 0.3), 0, 1);
    ctx.save();
    if (effect.kind === 'ground-decal') {
      const fadeIn = clamp(progress * 5, 0, 1);
      const fadeOut = clamp(effect.life / 3.5, 0, 1);
      const radius = Math.max(12, effect.radius ?? 30) * (0.88 + (effect.variant ?? 0) * .05);
      ctx.globalAlpha = fadeIn * fadeOut * .58;
      ctx.fillStyle = effect.color ?? '#5b1822';
      ctx.translate(effect.x, effect.y);
      ctx.rotate((effect.variant ?? 0) * .53);
      ctx.beginPath(); ctx.ellipse(0, 0, radius, radius * .36, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha *= .42;
      ctx.beginPath(); ctx.ellipse(radius * .32, -radius * .12, radius * .42, radius * .14, .4, 0, Math.PI * 2); ctx.fill();
    } else if (effect.kind === 'action-sequence') {
      const sheet = ACTION_VFX_SHEETS[effect.sheet];
      const image = this.assets.actionVfx?.[effect.sheet];
      if (sheet && this._assetReady(image)) {
        const frames = ACTION_VFX_FRAME_COUNT;
        const frame = clamp(Math.floor(progress * frames), 0, frames - 1);
        const row = clamp(Math.floor(effect.row ?? 0), 0, sheet.rows - 1);
        const sourceWidth = (image.naturalWidth || image.width) / frames;
        const sourceHeight = (image.naturalHeight || image.height) / sheet.rows;
        const width = Math.max(20, effect.size ?? 92);
        const height = width * sourceHeight / Math.max(1, sourceWidth);
        ctx.translate(effect.x, effect.y - Math.max(0, effect.elevation ?? 0) * .58);
        ctx.rotate(effect.angle ?? 0);
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = alpha * (effect.source === 'enemy' ? .84 : .94);
        this._drawAtlas(image, frames, sheet.rows, row * frames + frame, 0, 0, width, height);
        if (effect.vfxFamily) {
          const phase = covenantVfxPhase(progress, effect.vfxFamily);
          const palette = { flame: '#e97643', grave: '#a993c7', blood: '#c74d62', light: '#f0d789', storm: '#7fbbe5', void: '#8b74b6' };
          const color = palette[effect.vfxFamily.affinity] ?? effect.color ?? '#d0c7b0';
          ctx.globalAlpha = alpha * (phase.phase === 'impact' ? .52 : .34);
          ctx.strokeStyle = color; ctx.lineWidth = phase.phase === 'impact' ? 3 : 2;
          ctx.setLineDash(phase.phase === 'trail' ? [10, 6] : []);
          const radius = width * (phase.phase === 'cast' ? .22 : phase.phase === 'trail' ? .34 : .46);
          ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        }
      }
    } else if (effect.kind === 'arc') {
      ctx.translate(effect.x, effect.y); ctx.rotate(effect.angle);
      ctx.strokeStyle = rgba(effect.color, alpha * 0.95); ctx.lineWidth = 7 * (1 - progress * 0.4);
      ctx.beginPath(); ctx.arc(0, 0, effect.radius * (0.55 + progress * 0.45), -effect.arc / 2, effect.arc / 2); ctx.stroke();
    } else if (effect.kind === 'float') {
      ctx.globalAlpha = alpha; ctx.translate(effect.x, effect.y - progress * 34);
      ctx.fillStyle = effect.color; ctx.strokeStyle = 'rgba(9, 10, 13, .7)'; ctx.lineWidth = 3;
      ctx.font = effect.type === 'crit' ? '800 20px system-ui' : effect.type === 'small' ? '700 11px system-ui' : '700 15px system-ui'; ctx.textAlign = 'center';
      ctx.strokeText(effect.text, 0, 0); ctx.fillText(effect.text, 0, 0);
    } else if (effect.kind === 'telegraph') {
      ctx.strokeStyle = rgba(effect.color, alpha * .82); ctx.fillStyle = rgba(effect.color, alpha * .08); ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
      if (effect.shape === 'cone') {
        ctx.save(); ctx.translate(effect.fromX ?? effect.x, effect.fromY ?? effect.y); ctx.rotate(effect.angle ?? 0);
        const radius = effect.radius * (.82 + progress * .18);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, radius, -.58, .58); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      } else if (effect.shape === 'line') {
        const fromX = effect.fromX ?? effect.x;
        const fromY = effect.fromY ?? effect.y;
        const targetX = effect.targetX ?? effect.x;
        const targetY = effect.targetY ?? effect.y;
        ctx.lineWidth = 3 + progress * 2;
        ctx.beginPath(); ctx.moveTo(fromX, fromY); ctx.lineTo(targetX, targetY); ctx.stroke();
        ctx.beginPath(); ctx.arc(targetX, targetY, effect.radius * (.7 + progress * .3), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(effect.x, effect.y, effect.radius * (.72 + progress * .28), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      ctx.setLineDash([]);
    } else if (effect.kind === 'afterimage') {
      ctx.translate(effect.x, effect.y); ctx.rotate(effect.angle); ctx.globalAlpha = alpha * 0.35;
      ctx.fillStyle = effect.color; ctx.beginPath(); ctx.ellipse(0, 0, 18, 14, 0, 0, Math.PI * 2); ctx.fill();
    } else if (effect.kind === 'chain-strike' || effect.kind === 'chain-reprise') {
      ctx.strokeStyle = rgba(effect.color, alpha * 0.95); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(effect.x, effect.y, 28 + progress * 60, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = rgba('#f5e6c4', alpha * 0.7); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(effect.x - 44, effect.y - 44); ctx.lineTo(effect.x + 44, effect.y + 44); ctx.stroke();
    } else if (effect.kind === 'heal-link') {
      ctx.strokeStyle = rgba(effect.color, alpha * 0.75); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(effect.fromX, effect.fromY); ctx.lineTo(effect.x, effect.y); ctx.stroke();
    } else if (effect.kind === 'portal') {
      ctx.strokeStyle = rgba(effect.color, alpha * 0.9); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(effect.x, effect.y, 15 + progress * 38, 0, Math.PI * 2); ctx.stroke();
    } else if (effect.kind === 'pounce') {
      ctx.strokeStyle = rgba(effect.color, alpha * 0.7); ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(effect.x - 48 * Math.cos(effect.angle), effect.y - 48 * Math.sin(effect.angle)); ctx.lineTo(effect.x, effect.y); ctx.stroke();
    } else if (['sunflare', 'halo-flare', 'mirror-flash', 'lightstep-flare'].includes(effect.kind)) {
      const rays = effect.kind === 'mirror-flash' ? 4 : 8;
      const outer = 24 + progress * (effect.kind === 'lightstep-flare' ? 76 : 118);
      ctx.save(); ctx.translate(effect.x, effect.y); ctx.rotate(progress * Math.PI * .5);
      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = rgba(effect.color, alpha * .9); ctx.lineWidth = effect.kind === 'mirror-flash' ? 3 : 2;
      for (let index = 0; index < rays; index += 1) {
        const angle = index / rays * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(Math.cos(angle) * 9, Math.sin(angle) * 9); ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer); ctx.stroke();
      }
      ctx.restore();
    } else if (['smash', 'vanguard-shockwave', 'marrow-pulse', 'ram-hunger-burst', 'resonant-rupture'].includes(effect.kind)) {
      ctx.strokeStyle = rgba(effect.color, alpha * .88); ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(effect.x, effect.y, 18 + progress * 96, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = rgba('#f4e7c4', alpha * .46); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(effect.x, effect.y, 8 + progress * 58, 0, Math.PI * 2); ctx.stroke();
    } else if (['trail', 'soul-trail', 'orison-echo', 'unrung-echo', 'silent-road-echo'].includes(effect.kind)) {
      ctx.strokeStyle = rgba(effect.color, alpha * .72); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(effect.fromX ?? effect.x - 24, effect.fromY ?? effect.y + 14); ctx.quadraticCurveTo(effect.x, effect.y - 18, effect.x + 22, effect.y); ctx.stroke();
    } else if (effect.kind === 'event-complete') {
      ctx.strokeStyle = rgba(effect.color, alpha); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(effect.x, effect.y, 40 + progress * 120, 0, Math.PI * 2); ctx.stroke();
    } else if (effect.kind === 'campaign-awaken') {
      ctx.strokeStyle = rgba(effect.color, alpha * .92); ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(effect.x, effect.y, 28 + progress * 152, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = rgba('#f5dfaa', alpha * .74); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(effect.x, effect.y - 26 - progress * 48); ctx.lineTo(effect.x + 26 + progress * 48, effect.y); ctx.lineTo(effect.x, effect.y + 26 + progress * 48); ctx.lineTo(effect.x - 26 - progress * 48, effect.y); ctx.closePath(); ctx.stroke();
    } else if (effect.kind === 'choir-ward') {
      ctx.strokeStyle = rgba(effect.color, alpha * .9); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(effect.x, effect.y, 22 + progress * 76, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = rgba('#f7e5b3', alpha * .62); ctx.lineWidth = 1.2;
      for (let index = 0; index < 3; index += 1) {
        const angle = progress * 2.2 + index * Math.PI * 2 / 3;
        ctx.beginPath(); ctx.arc(effect.x + Math.cos(angle) * 29, effect.y + Math.sin(angle) * 29, 5 + progress * 5, 0, Math.PI * 2); ctx.stroke();
      }
    } else if (effect.kind === 'convergence' || effect.kind === 'mastery-rank' || effect.kind === 'mastery-eruption') {
      const start = effect.kind === 'mastery-rank' ? 22 : effect.kind === 'mastery-eruption' ? Math.max(26, (effect.radius ?? 80) * 0.45) : 34;
      const span = effect.kind === 'mastery-rank' ? 88 : effect.kind === 'mastery-eruption' ? Math.max(56, (effect.radius ?? 80) * 0.8) : 140;
      ctx.strokeStyle = rgba(effect.color, alpha * 0.95); ctx.lineWidth = effect.kind === 'mastery-eruption' ? 5 : 3;
      ctx.beginPath(); ctx.arc(effect.x, effect.y, start + progress * span, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = rgba('#f6e6b6', alpha * 0.7); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(effect.x, effect.y, Math.max(8, start * 0.55 + progress * span * 0.42), 0, Math.PI * 2); ctx.stroke();
    } else if (effect.kind === 'echo-ground' || effect.kind === 'command-ring' || effect.kind === 'boss-phase') {
      const start = effect.kind === 'boss-phase' ? 42 : 18;
      ctx.strokeStyle = rgba(effect.color, alpha * 0.86); ctx.lineWidth = effect.kind === 'boss-phase' ? 5 : 3;
      ctx.beginPath(); ctx.arc(effect.x, effect.y, start + progress * (effect.kind === 'boss-phase' ? 150 : 72), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  _drawDarkness(game) {
    const { ctx, viewport } = this;
    const worldScale = viewport.scale * (game.camera.zoom ?? 1);
    const screenX = (game.player.x - game.camera.x) * worldScale;
    const screenY = (game.player.y - game.camera.y) * worldScale;
    const gradient = ctx.createRadialGradient(screenX, screenY, 70, screenX, screenY, Math.min(viewport.width, viewport.height) * 0.65);
    gradient.addColorStop(0, 'rgba(6, 7, 11, 0)');
    gradient.addColorStop(1, 'rgba(4, 5, 8, .62)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, viewport.width, viewport.height);
  }
}
