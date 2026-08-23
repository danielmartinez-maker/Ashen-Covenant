import { ZONES } from '../data/world.js';

const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
const safeArray = (value) => Array.isArray(value) ? value : [];
const safeRecord = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const bounded = (value, fallback, min, max) => Math.max(min, Math.min(max, finite(value, fallback)));
const integer = (value, fallback, min, max) => Math.floor(bounded(value, fallback, min, max));
const safeText = (value, fallback = null, max = 120) => typeof value === 'string' && value.trim() ? value.slice(0, max) : fallback;
const uniqueById = (values) => {
  const seen = new Set();
  return values.filter((entry) => {
    if (!entry?.id || seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
};

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

const normalizeModifiers = (source = {}, defaults = {}) => {
  const raw = { ...safeRecord(defaults), ...safeRecord(source) };
  return {
    enemyDensity: bounded(raw.enemyDensity, 1, 0.1, 5),
    hunterPressure: bounded(raw.hunterPressure, 0, 0, 5),
    corpseResurrection: raw.corpseResurrection === true,
    weather: safeText(raw.weather),
    lighting: safeText(raw.lighting),
    lootBias: [...new Set(safeArray(raw.lootBias).filter((id) => typeof id === 'string' && id.trim()).map((id) => id.slice(0, 48)))].slice(0, 12),
    bleedPower: bounded(raw.bleedPower, 0, 0, 5),
    eliteRate: bounded(raw.eliteRate, 0, 0, 1),
    bossModifier: safeText(raw.bossModifier, null, 80)
  };
};

const normalizeEcho = (entry) => {
  const raw = safeRecord(entry);
  if (!raw.typeId && !raw.outcome) return null;
  return {
    typeId: safeText(raw.typeId, 'unknown', 80),
    modifiers: normalizeModifiers(raw.modifiers),
    outcome: safeText(raw.outcome, 'unknown', 80),
    resolvedAt: Math.max(0, finite(raw.resolvedAt, 0))
  };
};

const mergeModifiers = (target, source = {}) => {
  const normalized = normalizeModifiers(source);
  target.enemyDensity *= normalized.enemyDensity;
  target.hunterPressure += normalized.hunterPressure;
  target.corpseResurrection ||= normalized.corpseResurrection;
  target.weather = normalized.weather ?? target.weather;
  target.lighting = normalized.lighting ?? target.lighting;
  target.bleedPower += normalized.bleedPower;
  target.eliteRate += normalized.eliteRate;
  target.bossModifier = normalized.bossModifier ?? target.bossModifier;
  for (const id of normalized.lootBias) if (!target.lootBias.includes(id)) target.lootBias.push(id);
  return target;
};

export class WorldStateManager {
  normalize(value) {
    const input = safeRecord(value);
    const savedRegions = safeRecord(input.regions);
    const regions = {};
    for (const zone of ZONES.filter((entry) => !entry.safe)) {
      const saved = safeRecord(savedRegions[zone.id]);
      regions[zone.id] = {
        zoneId: zone.id,
        pressure: bounded(saved.pressure, 0, 0, 5),
        resolvedCount: integer(saved.resolvedCount, 0, 0, 1_000_000),
        failedCount: integer(saved.failedCount, 0, 0, 1_000_000),
        echoes: safeArray(saved.echoes).map(normalizeEcho).filter(Boolean).slice(-12),
        lastOutcome: safeText(saved.lastOutcome, null, 80),
        lastEventId: safeText(saved.lastEventId, null, 120)
      };
    }
    const normalizedResolvedEvents = uniqueById(safeArray(input.resolvedEvents).map((entry) => this.#normalizeResolvedEvent(entry)).filter(Boolean));
    const terminalEventIds = new Set(normalizedResolvedEvents.map((event) => event.id));
    const activeEvents = uniqueById(safeArray(input.activeEvents).map((entry) => this.#normalizeEvent(entry)).filter(Boolean))
      .filter((event) => !terminalEventIds.has(event.id))
      .slice(0, 16);
    const resolvedEvents = normalizedResolvedEvents.slice(-40);
    const processionRaw = safeRecord(input.procession);
    let procession = null;
    if (input.procession && Object.keys(processionRaw).length) {
      const eventId = safeText(processionRaw.eventId, '', 120);
      const linkedEvent = activeEvents.find((event) => event.id === eventId && event.typeId === 'black-procession');
      if (linkedEvent) {
        const zoneId = PROCESSION_ROUTE.includes(linkedEvent.zoneId) ? linkedEvent.zoneId : PROCESSION_ROUTE[0];
        const routeIndex = Math.max(0, PROCESSION_ROUTE.indexOf(zoneId));
        linkedEvent.zoneId = zoneId;
        procession = {
          eventId,
          zoneId,
          routeIndex,
          travel: bounded(processionRaw.travel, 0, 0, 30)
        };
      }
    }
    return { regions, activeEvents, resolvedEvents, procession, tick: Math.max(0, finite(input.tick, 0)) };
  }

  #normalizeEvent(entry) {
    const source = safeRecord(entry);
    const definition = PERSISTENT_WORLD_EVENTS[source.typeId];
    if (!definition) return null;
    const zoneId = ZONES.some((zone) => zone.id === source.zoneId && !zone.safe) ? source.zoneId : definition.zoneId;
    return {
      id: safeText(source.id, `world-${definition.id}-${Math.floor(finite(source.startedAt, 0))}`, 120),
      typeId: definition.id,
      name: definition.name,
      factionId: definition.factionId,
      zoneId,
      startedAt: Math.max(0, finite(source.startedAt, 0)),
      elapsed: Math.max(0, finite(source.elapsed, 0)),
      duration: bounded(source.duration, definition.duration, 30, 86_400),
      progress: Math.max(0, finite(source.progress, 0)),
      target: integer(source.target, 1, 1, 1_000_000),
      modifiers: normalizeModifiers(source.modifiers, definition.modifiers),
      physicalSpawned: source.physicalSpawned === true,
      resolved: false
    };
  }

  #normalizeResolvedEvent(entry) {
    const source = safeRecord(entry);
    const definition = PERSISTENT_WORLD_EVENTS[source.typeId];
    if (!definition) return null;
    const activeShape = this.#normalizeEvent(source);
    if (!activeShape) return null;
    return {
      ...activeShape,
      resolved: source.resolved === true && source.failed !== true,
      failed: source.failed === true,
      outcome: safeText(source.outcome, source.failed === true ? 'failed' : 'cleared', 80),
      resolvedAt: Math.max(0, finite(source.resolvedAt, activeShape.startedAt))
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
    region.pressure = Math.min(5, finite(region.pressure, 0) + 1);
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
    const delta = Math.max(0, finite(dt, 0));
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
          (state.regions[previous] ??= baseRegion(previous)).pressure = Math.max(0, finite(state.regions[previous]?.pressure, 0) - 0.35);
          (state.regions[event.zoneId] ??= baseRegion(event.zoneId)).pressure = Math.min(5, finite(state.regions[event.zoneId]?.pressure, 0) + 0.75);
        }
      }
    }
    return state;
  }

  resolveEvent(state, eventId, context = {}) {
    const index = safeArray(state.activeEvents).findIndex((event) => event.id === eventId);
    if (index < 0) return null;
    const [event] = state.activeEvents.splice(index, 1);
    const record = { ...clone(event), resolved: true, outcome: safeText(context.outcome, 'cleared', 80), resolvedAt: Math.max(0, finite(state.tick, 0)) };
    state.resolvedEvents.push(record);
    if (state.resolvedEvents.length > 40) state.resolvedEvents.splice(0, state.resolvedEvents.length - 40);
    const region = state.regions[event.zoneId] ??= baseRegion(event.zoneId);
    region.resolvedCount = integer(finite(region.resolvedCount, 0) + 1, 0, 0, 1_000_000);
    region.pressure = Math.max(0, finite(region.pressure, 0) - 1.25);
    region.lastOutcome = record.outcome;
    region.lastEventId = event.id;
    region.echoes.push({ typeId: event.typeId, modifiers: normalizeModifiers(event.modifiers), outcome: record.outcome, resolvedAt: record.resolvedAt });
    if (region.echoes.length > 12) region.echoes.shift();
    if (state.procession?.eventId === event.id) state.procession = null;
    return record;
  }

  failEvent(state, eventId, context = {}) {
    const index = safeArray(state.activeEvents).findIndex((event) => event.id === eventId);
    if (index < 0) return null;
    const [event] = state.activeEvents.splice(index, 1);
    const record = { ...clone(event), resolved: false, failed: true, outcome: safeText(context.outcome, 'failed', 80), resolvedAt: Math.max(0, finite(state.tick, 0)) };
    state.resolvedEvents.push(record);
    if (state.resolvedEvents.length > 40) state.resolvedEvents.splice(0, state.resolvedEvents.length - 40);
    const region = state.regions[event.zoneId] ??= baseRegion(event.zoneId);
    region.failedCount = integer(finite(region.failedCount, 0) + 1, 0, 0, 1_000_000);
    region.pressure = Math.min(5, finite(region.pressure, 0) + 1);
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
    result.enemyDensity *= 1 + Math.min(0.35, Math.max(0, finite(region.pressure, 0)) * 0.04);
    for (const echo of safeArray(region.echoes)) {
      for (const id of safeArray(echo.modifiers?.lootBias)) if (!result.lootBias.includes(id)) result.lootBias.push(id);
    }
    for (const event of normalized.activeEvents.filter((entry) => entry.zoneId === zoneId)) mergeModifiers(result, event.modifiers);
    result.enemyDensity = bounded(result.enemyDensity, 1, 1, 2.4);
    result.hunterPressure = bounded(result.hunterPressure, 0, 0, 1.5);
    result.bleedPower = bounded(result.bleedPower, 0, 0, 5);
    result.eliteRate = bounded(result.eliteRate, 0, 0, 0.65);
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
