import { WORLD_SIZE } from '../core/constants.js';
import { zoneAt } from '../data/world.js';
import { BLACK_ROAD_EXPEDITIONS } from '../data/requiem.js';
import { ZONE_GEOMETRY, buildBlackRoadGeometry } from '../data/world-geometry.js';
import { clamp, normalize } from '../core/math.js';

const BLACK_ROAD_GEOMETRY = buildBlackRoadGeometry(BLACK_ROAD_EXPEDITIONS);
const EPS = 0.001;

const insideRect = (x, y, shape, padding = 0) => x >= shape.x - padding && x <= shape.x + shape.w + padding && y >= shape.y - padding && y <= shape.y + shape.h + padding;
const circleIntersects = (x, y, radius, shape) => Math.hypot(x - shape.x, y - shape.y) < radius + shape.radius;

const segmentCircleBlocked = (x1, y1, x2, y2, radius, shape) => {
  const vx = x2 - x1; const vy = y2 - y1;
  const len2 = vx * vx + vy * vy;
  const t = len2 <= EPS ? 0 : clamp(((shape.x - x1) * vx + (shape.y - y1) * vy) / len2, 0, 1);
  const px = x1 + vx * t; const py = y1 + vy * t;
  return Math.hypot(px - shape.x, py - shape.y) <= (shape.radius ?? 0) + radius;
};

const segmentRectBlocked = (x1, y1, x2, y2, radius, shape) => {
  const minX = shape.x - radius; const maxX = shape.x + shape.w + radius;
  const minY = shape.y - radius; const maxY = shape.y + shape.h + radius;
  if (x1 >= minX && x1 <= maxX && y1 >= minY && y1 <= maxY) return true;
  if (x2 >= minX && x2 <= maxX && y2 >= minY && y2 <= maxY) return true;
  const dx = x2 - x1; const dy = y2 - y1;
  let t0 = 0; let t1 = 1;
  for (const [p, q] of [[-dx, x1 - minX], [dx, maxX - x1], [-dy, y1 - minY], [dy, maxY - y1]]) {
    if (Math.abs(p) <= EPS) { if (q < 0) return false; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
    else { if (r < t0) return false; if (r < t1) t1 = r; }
  }
  return t0 <= t1;
};


export class WorldGeometrySystem {
  constructor() {
    this.version = 5;
    this.blackRoad = BLACK_ROAD_GEOMETRY;
  }

  activeStage(game) {
    const id = game?.endgame?.blackRoad && game.endgame?.activeStage?.id;
    return id ? this.blackRoad[id] ?? null : null;
  }

  geometryAt(x, y, game = null) {
    const zone = zoneAt(x, y);
    const base = ZONE_GEOMETRY[zone.id] ?? { surface: 'dirt', obstacles: [], ramps: [] };
    const stage = this.activeStage(game);
    const stageActive = stage && Math.hypot(x - stage.center.x, y - stage.center.y) <= stage.radius + 160;
    return {
      zone,
      surface: base.surface ?? 'dirt',
      // Black Road rooms are sealed authored spaces. Overworld collision props
      // at the same map coordinates must not leak into the room and conflict
      // with its pillars, ritual plinths, or contracted arena boundary.
      obstacles: stageActive ? [...(stage.obstacles ?? [])] : (base.obstacles ?? []),
      ramps: stageActive ? [stage.ramp].filter(Boolean) : (base.ramps ?? []),
      stage: stageActive ? stage : null
    };
  }

  nearbyObstacles(x, y, radius, game = null) {
    const data = this.geometryAt(x, y, game);
    const margin = radius + 120;
    return data.obstacles.filter((shape) => {
      if (shape.solid === false) return false;
      if (shape.shape === 'circle') return Math.hypot(x - shape.x, y - shape.y) <= margin + shape.radius;
      return x >= shape.x - margin && x <= shape.x + shape.w + margin && y >= shape.y - margin && y <= shape.y + shape.h + margin;
    });
  }

  collides(x, y, radius = 18, game = null) {
    return this.nearbyObstacles(x, y, radius, game).some((shape) => shape.shape === 'circle'
      ? circleIntersects(x, y, radius, shape)
      : insideRect(x, y, shape, radius));
  }


  _allSolidObstacles(game = null) {
    const stage = this.activeStage(game);
    if (stage) return (stage.obstacles ?? []).filter((shape) => shape.solid !== false);
    return Object.values(ZONE_GEOMETRY).flatMap((entry) => entry.obstacles ?? []).filter((shape) => shape.solid !== false);
  }

  segmentBlocked(x1, y1, x2, y2, radius = 0, game = null) {
    if (![x1, y1, x2, y2, radius].every(Number.isFinite)) return true;
    const padding = Math.max(0, radius);
    return this._allSolidObstacles(game).some((shape) => shape.shape === 'circle'
      ? segmentCircleBlocked(x1, y1, x2, y2, padding, shape)
      : segmentRectBlocked(x1, y1, x2, y2, padding, shape));
  }

  clipSegment(x1, y1, x2, y2, radius = 0, game = null) {
    if (!this.segmentBlocked(x1, y1, x2, y2, radius, game)) return { x: x2, y: y2, blocked: false };
    let low = 0; let high = 1;
    for (let index = 0; index < 14; index += 1) {
      const mid = (low + high) * .5;
      const mx = x1 + (x2 - x1) * mid;
      const my = y1 + (y2 - y1) * mid;
      if (this.segmentBlocked(x1, y1, mx, my, radius, game)) high = mid;
      else low = mid;
    }
    const safe = Math.max(0, low - .004);
    return { x: x1 + (x2 - x1) * safe, y: y1 + (y2 - y1) * safe, blocked: true };
  }

  resolveMove(body, nextX, nextY, game = null) {
    const radius = Math.max(6, Number(body?.radius) || 18) * (body?.boss ? .72 : .72);
    let x = clamp(nextX, radius + 8, WORLD_SIZE.width - radius - 8);
    let y = clamp(nextY, radius + 8, WORLD_SIZE.height - radius - 8);
    const shapes = this.nearbyObstacles(x, y, radius, game);
    for (let pass = 0; pass < 3; pass += 1) {
      let changed = false;
      for (const shape of shapes) {
        if (shape.shape === 'circle') {
          let dx = x - shape.x; let dy = y - shape.y; let dist = Math.hypot(dx, dy);
          const min = radius + shape.radius;
          if (dist < min) {
            if (dist <= EPS) {
              const seed = String(body?.id ?? shape.id ?? 'body').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
              const angle = (seed % 360) * Math.PI / 180;
              dx = Math.cos(angle); dy = Math.sin(angle); dist = 1;
            }
            x = shape.x + dx / dist * min; y = shape.y + dy / dist * min; changed = true;
          }
        } else if (insideRect(x, y, shape, radius)) {
          const left = Math.abs(x - (shape.x - radius));
          const right = Math.abs((shape.x + shape.w + radius) - x);
          const top = Math.abs(y - (shape.y - radius));
          const bottom = Math.abs((shape.y + shape.h + radius) - y);
          const smallest = Math.min(left, right, top, bottom);
          const push = .05;
          if (smallest === left) x = shape.x - radius - push;
          else if (smallest === right) x = shape.x + shape.w + radius + push;
          else if (smallest === top) y = shape.y - radius - push;
          else y = shape.y + shape.h + radius + push;
          changed = true;
        }
      }
      if (!changed) break;
    }
    return { x: clamp(x, radius + 8, WORLD_SIZE.width - radius - 8), y: clamp(y, radius + 8, WORLD_SIZE.height - radius - 8) };
  }

  steer(body, targetX, targetY, game = null) {
    const direct = normalize(targetX - body.x, targetY - body.y);
    const radius = Math.max(6, Number(body?.radius) || 18) * .72;
    const probe = Math.max(42, radius * 2.8);
    if (!this.collides(body.x + direct.x * probe, body.y + direct.y * probe, radius, game)) return direct;
    const sideSeed = String(body.id ?? '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % 2 ? 1 : -1;
    const base = Math.atan2(direct.y, direct.x);
    const offsets = [Math.PI / 4, Math.PI / 2, Math.PI * .75, -Math.PI / 4, -Math.PI / 2, -Math.PI * .75].map((angle) => angle * sideSeed);
    const candidates = offsets.map((offset, index) => {
      const angle = base + offset;
      const direction = { x: Math.cos(angle), y: Math.sin(angle) };
      const clear = !this.collides(body.x + direction.x * probe, body.y + direction.y * probe, radius, game);
      return { direction, clear, score: direction.x * direct.x + direction.y * direct.y - index * .0001 };
    }).filter((entry) => entry.clear).sort((a, b) => b.score - a.score);
    return candidates[0]?.direction ?? { x: 0, y: 0 };
  }

  groundElevation(x, y, game = null) {
    const { ramps } = this.geometryAt(x, y, game);
    let elevation = 0;
    for (const shape of ramps) {
      if (!insideRect(x, y, shape, 0)) continue;
      const t = shape.axis === 'x' ? clamp((x - shape.x) / Math.max(1, shape.w), 0, 1) : clamp((y - shape.y) / Math.max(1, shape.h), 0, 1);
      elevation = Math.max(elevation, shape.low + (shape.high - shape.low) * t);
    }
    return elevation;
  }

  surfaceAt(x, y, game = null) {
    const data = this.geometryAt(x, y, game);
    for (const shape of data.obstacles) if (shape.solid === false && shape.hazardSurface && (shape.shape === 'circle' ? Math.hypot(x - shape.x, y - shape.y) <= shape.radius : insideRect(x, y, shape))) return shape.hazardSurface;
    for (const shape of data.ramps) if (insideRect(x, y, shape) && shape.surface) return shape.surface;
    return data.surface;
  }

  occluders(game = null) {
    const player = game?.player;
    if (!player) return [];
    const data = this.geometryAt(player.x, player.y, game);
    return data.obstacles.filter((shape) => shape.occluder || shape.height >= 80);
  }

  arenaPoint(stageId, angle, radiusScale = .72) {
    const stage = this.blackRoad[stageId];
    if (!stage) return null;
    return { x: stage.center.x + Math.cos(angle) * stage.radius * radiusScale, y: stage.center.y + Math.sin(angle) * stage.radius * radiusScale };
  }

  constrainArena(actor, stageId, inset = 0, radiusOverride = null) {
    const stage = this.blackRoad[stageId];
    if (!stage || !actor) return false;
    const dx = actor.x - stage.center.x; const dy = actor.y - stage.center.y;
    const angle = Math.atan2(dy, dx); const mag = Math.hypot(dx, dy) || EPS;
    const effectiveRadius = Number.isFinite(radiusOverride) ? Math.min(stage.radius, Math.max(70, radiusOverride)) : stage.radius;
    const base = Math.max(70, effectiveRadius - inset - (actor.radius ?? 0) - 9);
    // Hex/octagon shaping uses a polar approximation; round rooms stay circular.
    const sides = stage.shape === 'octagon' ? 8 : stage.shape === 'hexagon' ? 6 : 64;
    const sector = Math.PI * 2 / sides;
    const local = ((angle + Math.PI) % sector) - sector / 2;
    const polygonRadius = sides >= 32 ? base : base * Math.cos(Math.PI / sides) / Math.max(.2, Math.cos(local));
    if (mag <= polygonRadius) return false;
    actor.x = stage.center.x + Math.cos(angle) * polygonRadius;
    actor.y = stage.center.y + Math.sin(angle) * polygonRadius;
    return true;
  }
}
