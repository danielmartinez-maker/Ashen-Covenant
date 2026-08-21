export const ENEMY_DOCTRINES = Object.freeze({
  grave: Object.freeze({ id: 'grave', formation: 'procession', aggression: 0.9, mobility: 0.9, cadence: 0.92, spacing: 58, corpsePriority: 1, displacementBias: 0, targetWounded: false }),
  blood: Object.freeze({ id: 'blood', formation: 'predatory', aggression: 1.32, mobility: 1.06, cadence: 1.1, spacing: 52, corpsePriority: 0.2, displacementBias: 0, targetWounded: true }),
  iron: Object.freeze({ id: 'iron', formation: 'phalanx', aggression: 0.96, mobility: 0.82, cadence: 0.88, spacing: 82, corpsePriority: 0, displacementBias: 0, targetWounded: false }),
  void: Object.freeze({ id: 'void', formation: 'fracture', aggression: 1.02, mobility: 1.18, cadence: 1.08, spacing: 66, corpsePriority: 0, displacementBias: 1, targetWounded: false }),
  storm: Object.freeze({ id: 'storm', formation: 'surge', aggression: 1.16, mobility: 1.42, cadence: 1.28, spacing: 62, corpsePriority: 0, displacementBias: 0.3, targetWounded: false })
});

const ZONE_DOCTRINE = Object.freeze({
  gravewake: 'grave',
  redfen: 'blood',
  cairnreach: 'iron',
  'veiled-road': 'void',
  bellscar: 'grave'
});

export const doctrineFactionForZone = (zoneId) => ZONE_DOCTRINE[zoneId] ?? 'grave';

const FRONTLINE = new Set(['melee', 'shield', 'brute', 'assassin', 'burrower', 'boss']);
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

function slotRing(enemies, player, spacing, formation) {
  const frontline = enemies.filter((enemy) => !enemy.dead && FRONTLINE.has(enemy.role));
  const count = Math.max(1, frontline.length);
  const radius = formation === 'phalanx' ? Math.max(90, spacing + 28) : Math.max(72, spacing + 16);
  return frontline.map((enemy, index) => {
    const phase = formation === 'phalanx'
      ? Math.PI * 0.72 + (index / Math.max(1, count - 1)) * Math.PI * 0.56
      : (index / count) * Math.PI * 2;
    return { enemyId: enemy.id, x: finite(player?.x) + Math.cos(phase) * radius, y: finite(player?.y) + Math.sin(phase) * radius * 0.72, angle: phase };
  });
}

export class EnemyDirector {
  constructor({ minInterval = 0.12 } = {}) {
    this.minInterval = Math.max(0.04, finite(minInterval, 0.12));
    this.cache = new Map();
    this.stats = { recomputes: 0, cacheHits: 0 };
  }

  clear(groupId = null) {
    if (groupId == null) this.cache.clear();
    else this.cache.delete(groupId);
  }

  resolveGroup({ groupId, factionId, enemies = [], player = {}, corpses = [], now = 0, covenant = {} } = {}) {
    const key = groupId ?? 'anonymous';
    const cached = this.cache.get(key);
    if (cached && now - cached.at < this.minInterval && cached.count === enemies.length && cached.factionId === factionId) {
      this.stats.cacheHits += 1;
      return cached.value;
    }
    const base = ENEMY_DOCTRINES[factionId] ?? ENEMY_DOCTRINES.grave;
    const primary = covenant?.primary ?? covenant?.resolved?.primary ?? null;
    const secondary = covenant?.secondary ?? covenant?.resolved?.secondary ?? null;
    const resonance = primary === base.id ? 1.18 : secondary === base.id ? 1.08 : 1;
    const woundedPlayer = finite(player.hp, 1) / Math.max(1, finite(player.maxHp, 1)) <= 0.5;
    const living = enemies.filter((enemy) => !enemy.dead);
    const woundedEnemies = living.filter((enemy) => finite(enemy.hp, 1) / Math.max(1, finite(enemy.maxHp, 1)) <= 0.5).length;
    const value = {
      factionId: base.id,
      formation: base.formation,
      aggression: base.aggression * resonance * (base.targetWounded && woundedPlayer ? 1.18 : 1),
      mobility: base.mobility * resonance,
      cadence: base.cadence * resonance,
      spacing: base.spacing,
      corpsePriority: base.corpsePriority * Math.min(1.8, 1 + corpses.length * 0.1),
      displacementBias: base.displacementBias * resonance,
      targetWounded: base.targetWounded,
      woundedEnemies,
      resonance,
      slots: slotRing(living, player, base.spacing, base.formation)
    };
    this.stats.recomputes += 1;
    this.cache.set(key, { at: now, count: enemies.length, factionId: base.id, value });
    return value;
  }
}
