import { ZONES } from '../data/world.js';

const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
const safeArray = (value) => Array.isArray(value) ? value : [];
const safeRecord = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

export const PERSISTENT_WORLD_EVENTS = Object.freeze({
  'gravewake-rising': Object.freeze({
    id: 'gravewake-rising', name: 'Gravewake Rising', factionId: 'grave', zoneId: 'gravewake', duration: 240,
    modifiers: { enemyDensity: 1.24, hunterPressure: 0.08, corpseResurrection: true, weather: 'ashfall', lighting: 'pale-grave', lootBias: ['grave'], bossModifier: 'gravewake' }
  }),
  'blood-moon-hunt': Object.freeze({
    id: 'blood-moon-hunt', name: 'Blood Moon Hunt', factionId: 'blood', zoneId: 'redfen', duration: 210,
    modifiers: { enemyDensity: 1.18, hunterPressure: 0.48, corpseResurrection: false, weather: 'blood-moon', lighting: 'crimson', lootBias: ['blood'], bleedPower: 0.22, bossModifier: 'blood-moon' }
  }),
  'black-procession': Object.freeze({
    id: 'black-procession', name: 'The Black Procession', factionId: 'iron', zoneId: 'gravewake', duration: 360, procession: true,
    modifiers: { enemyDensity: 1.2, hunterPressure: 0.12, corpseResurrection: false, weather: 'procession-smoke', lighting: 'ember-dusk', lootBias: ['iron', 'grave'], eliteRate: 0.12, bossModifier: 'procession' }
  })
});

const PROCESSION_ROUTE = Object.freeze(['gravewake', 'redfen', 'cairnreach', 'veiled-road', 'bellscar']);

const baseRegion = (zoneId) => ({
  zoneId, pressure: 0, resolvedCount: 0, failedCount: 0, echoes: [], lastOutcome: null, lastEventId: null
});

const defaultModifiers = () => ({
  enemyDensity: 1,
  hunterPressure: 0,
  corpseResurrection: false,
  weather: null,
  lighting: null,
  lootBias: [],
  bleedPower: 0,
  eliteRate: 0,
  bossModifier: null,
  resolvedCount: 0,
  failedCount: 0
});

const mergeModifiers = (target, source = {}) => {
  target.enemyDensity *= Number(source.enemyDensity) > 0 ? Number(source.enemyDensity) : 1;
  target.hunterPressure += Number(source.hunterPressure) || 0;
  target.corpseResurrection ||= source.corpseResurrection === true;
  target.weather = source.weather ?? target.weather;
  target.lighting = source.lighting ?? target.lighting;
  target.bleedPower += Number(source.bleedPower) || 0;
  target.eliteRate += Number(source.eliteRate) || 0;
  target.bossModifier = source.bossModifier ?? target.bossModifier;
  for (const id of safeArray(source.lootBias)) if (!target.lootBias.includes(id)) target.lootBias.push(id);
  return target;
};

export class WorldStateManager {
  normalize(value) {
    const input = safeRecord(value);
    const regions = {};
    for (const zone of ZONES.filter((entry) => !entry.safe)) {
      const saved = safeRecord(safeRecord(input.regions)[zone.id]);
      regions[zone.id] = {
        ...baseRegion(zone.id),
        ...clone(saved),
        echoes: safeArray(saved.echoes).map((entry) => clone(entry)).slice(-12)
      };
    }
    const activeEvents = safeArray(input.activeEvents).map((entry) => this.#normalizeEvent(entry)).filter(Boolean);
    const resolvedEvents = safeArray(input.resolvedEvents).map((entry) => clone(entry)).slice(-40);
    const procession = input.procession ? {
      eventId: String(input.procession.eventId ?? ''),
      zoneId: PROCESSION_ROUTE.includes(input.procession.zoneId) ? input.procession.zoneId : PROCESSION_ROUTE[0],
      routeIndex: Math.max(0, Math.min(PROCESSION_ROUTE.length - 1, Math.floor(Number(input.procession.routeIndex) || 0))),
      travel: Math.max(0, Number(input.procession.travel) || 0)
    } : null;
    return { regions, activeEvents, resolvedEvents, procession, tick: Math.max(0, Number(input.tick) || 0) };
  }

  #normalizeEvent(entry) {
    const source = safeRecord(entry);
    const definition = PERSISTENT_WORLD_EVENTS[source.typeId];
    if (!definition) return null;
    const zoneId = ZONES.some((zone) => zone.id === source.zoneId && !zone.safe) ? source.zoneId : definition.zoneId;
    return {
      id: String(source.id || `world-${definition.id}-${Math.floor(Number(source.startedAt) || 0)}`),
      typeId: definition.id,
      name: definition.name,
      factionId: definition.factionId,
      zoneId,
      startedAt: Math.max(0, Number(source.startedAt) || 0),
      elapsed: Math.max(0, Number(source.elapsed) || 0),
      duration: Math.max(30, Number(source.duration) || definition.duration),
      progress: Math.max(0, Number(source.progress) || 0),
      target: Math.max(1, Math.floor(Number(source.target) || 1)),
      modifiers: { ...clone(definition.modifiers), ...clone(safeRecord(source.modifiers)) },
      physicalSpawned: source.physicalSpawned === true,
      resolved: false
    };
  }

  startEvent(state, typeId, context = {}) {
    const normalized = this.normalize(state);
    Object.assign(state, normalized);
    const definition = PERSISTENT_WORLD_EVENTS[typeId];
    if (!definition) return null;
    const zoneId = ZONES.some((zone) => zone.id === context.zoneId && !zone.safe) ? context.zoneId : definition.zoneId;
    const duplicate = state.activeEvents.find((event) => event.typeId === typeId && event.zoneId === zoneId);
    if (duplicate) return duplicate;
    const sequence = state.activeEvents.length + state.resolvedEvents.length + 1;
    const event = this.#normalizeEvent({
      id: `world-${typeId}-${Math.floor(state.tick)}-${sequence}`,
      typeId,
      zoneId,
      startedAt: state.tick,
      duration: context.duration ?? definition.duration,
      target: context.target ?? (typeId === 'black-procession' ? 8 : typeId === 'blood-moon-hunt' ? 1 : 6),
      modifiers: context.modifiers
    });
    state.activeEvents.push(event);
    const region = state.regions[zoneId] ??= baseRegion(zoneId);
    region.pressure = Math.min(5, (Number(region.pressure) || 0) + 1);
    region.lastEventId = event.id;
    if (definition.procession) {
      const routeIndex = Math.max(0, PROCESSION_ROUTE.indexOf(zoneId));
      state.procession = { eventId: event.id, zoneId, routeIndex, travel: 0 };
    }
    return event;
  }

  update(state, dt) {
    const normalized = this.normalize(state);
    Object.assign(state, normalized);
    const delta = Math.max(0, Number(dt) || 0);
    state.tick += delta;
    for (const event of state.activeEvents) event.elapsed += delta;
    if (state.procession) {
      state.procession.travel += delta;
      while (state.procession.travel >= 30) {
        state.procession.travel -= 30;
        state.procession.routeIndex = (state.procession.routeIndex + 1) % PROCESSION_ROUTE.length;
        state.procession.zoneId = PROCESSION_ROUTE[state.procession.routeIndex];
        const event = state.activeEvents.find((entry) => entry.id === state.procession.eventId);
        if (event) {
          const previous = event.zoneId;
          event.zoneId = state.procession.zoneId;
          (state.regions[previous] ??= baseRegion(previous)).pressure = Math.max(0, (state.regions[previous]?.pressure ?? 0) - 0.35);
          (state.regions[event.zoneId] ??= baseRegion(event.zoneId)).pressure = Math.min(5, (state.regions[event.zoneId]?.pressure ?? 0) + 0.75);
        }
      }
    }
    return state;
  }

  resolveEvent(state, eventId, context = {}) {
    const index = safeArray(state.activeEvents).findIndex((event) => event.id === eventId);
    if (index < 0) return null;
    const [event] = state.activeEvents.splice(index, 1);
    const record = { ...clone(event), resolved: true, outcome: String(context.outcome ?? 'cleared'), resolvedAt: Number(state.tick) || 0 };
    state.resolvedEvents.push(record);
    if (state.resolvedEvents.length > 40) state.resolvedEvents.splice(0, state.resolvedEvents.length - 40);
    const region = state.regions[event.zoneId] ??= baseRegion(event.zoneId);
    region.resolvedCount = (Number(region.resolvedCount) || 0) + 1;
    region.pressure = Math.max(0, (Number(region.pressure) || 0) - 1.25);
    region.lastOutcome = record.outcome;
    region.lastEventId = event.id;
    region.echoes.push({ typeId: event.typeId, modifiers: clone(event.modifiers), outcome: record.outcome, resolvedAt: record.resolvedAt });
    if (region.echoes.length > 12) region.echoes.shift();
    if (state.procession?.eventId === event.id) state.procession = null;
    return record;
  }

  failEvent(state, eventId, context = {}) {
    const index = safeArray(state.activeEvents).findIndex((event) => event.id === eventId);
    if (index < 0) return null;
    const [event] = state.activeEvents.splice(index, 1);
    const record = { ...clone(event), resolved: false, failed: true, outcome: String(context.outcome ?? 'failed'), resolvedAt: Number(state.tick) || 0 };
    state.resolvedEvents.push(record);
    const region = state.regions[event.zoneId] ??= baseRegion(event.zoneId);
    region.failedCount = (Number(region.failedCount) || 0) + 1;
    region.pressure = Math.min(5, (Number(region.pressure) || 0) + 1);
    region.lastOutcome = record.outcome;
    if (state.procession?.eventId === event.id) state.procession = null;
    return record;
  }

  modifiersForRegion(state, zoneId) {
    const normalized = this.normalize(state);
    const result = defaultModifiers();
    const region = normalized.regions[zoneId] ?? baseRegion(zoneId);
    result.resolvedCount = region.resolvedCount ?? 0;
    result.failedCount = region.failedCount ?? 0;
    result.enemyDensity *= 1 + Math.min(0.35, Math.max(0, Number(region.pressure) || 0) * 0.04);
    for (const echo of safeArray(region.echoes)) {
      for (const id of safeArray(echo.modifiers?.lootBias)) if (!result.lootBias.includes(id)) result.lootBias.push(id);
    }
    for (const event of normalized.activeEvents.filter((entry) => entry.zoneId === zoneId)) mergeModifiers(result, event.modifiers);
    result.enemyDensity = Math.max(1, Math.min(2.4, result.enemyDensity));
    result.hunterPressure = Math.max(0, Math.min(1.5, result.hunterPressure));
    result.eliteRate = Math.max(0, Math.min(0.65, result.eliteRate));
    return result;
  }

  blackRoadModifiers(state, zoneId) {
    const result = this.modifiersForRegion(state, zoneId);
    return {
      ...result,
      enemyDensity: Math.max(result.enemyDensity, 1 + Math.min(0.3, result.resolvedCount * 0.02)),
      source: 'persistent-world'
    };
  }
}
