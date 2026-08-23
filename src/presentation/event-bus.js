const EVENT_TYPES = [
  'context:changed', 'context:intensity', 'animation:action-start', 'animation:phase', 'animation:event',
  'animation:action-end', 'animation:footstep', 'animation:reaction', 'animation:death', 'animation:resurrection',
  'combat:attack-start', 'combat:attack-impact', 'combat:enemy-telegraph', 'combat:enemy-impact', 'combat:boss-stagger',
  'impact:request', 'camera:profile', 'camera:impulse', 'music:state', 'music:stinger', 'music:duck', 'boss:signature-cue',
  'cinematic:start', 'cinematic:end', 'cinematic:skip', 'loot:spawn', 'world:transition',
  'presentation:combat-context', 'animation:clip-resolved', 'audio:semantic-resolved', 'presentation:error'
];

export const PRESENTATION_EVENT_TYPES = Object.freeze(Object.fromEntries(EVENT_TYPES.map((type) => [type.toUpperCase().replaceAll(':', '_').replaceAll('-', '_'), type])));
export const isPresentationEventType = (type) => EVENT_TYPES.includes(type) || type.startsWith('legacy:');

export class PresentationEventBus {
  constructor({ historyLimit = 160, strict = false } = {}) {
    this.listeners = new Map();
    this.history = [];
    this.historyLimit = historyLimit;
    this.strict = strict;
    this.sequence = 0;
    this.stats = { emitted: 0, rejected: 0, listenerErrors: 0 };
  }

  on(type, listener, { once = false } = {}) {
    if (typeof listener !== 'function') return () => {};
    const entry = { listener, once };
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(entry);
    return () => this.listeners.get(type)?.delete(entry);
  }

  once(type, listener) {
    return this.on(type, listener, { once: true });
  }

  emit(type, detail = {}, meta = {}) {
    if (!isPresentationEventType(type)) {
      this.stats.rejected += 1;
      if (this.strict) throw new TypeError(`Unknown presentation event: ${type}`);
      return null;
    }
    const event = Object.freeze({
      id: `presentation-${++this.sequence}`,
      type,
      time: Number.isFinite(meta.time) ? meta.time : 0,
      source: meta.source ?? 'presentation',
      priority: Number.isFinite(meta.priority) ? meta.priority : 0,
      detail: detail && typeof detail === 'object' ? detail : { value: detail }
    });
    this.stats.emitted += 1;
    this.history.push(event);
    if (this.history.length > this.historyLimit) this.history.splice(0, this.history.length - this.historyLimit);
    const subscribers = [...(this.listeners.get(type) ?? []), ...(this.listeners.get('*') ?? [])];
    subscribers.forEach((entry) => {
      try { entry.listener(event); } catch (error) {
        this.stats.listenerErrors += 1;
        if (type !== 'presentation:error') this.emit('presentation:error', { eventType: type, message: error?.message ?? String(error) }, { source: 'event-bus', priority: 100 });
      }
      if (entry.once) {
        this.listeners.get(type)?.delete(entry);
        this.listeners.get('*')?.delete(entry);
      }
    });
    return event;
  }

  recent(type = null, limit = 20) {
    const entries = type ? this.history.filter((event) => event.type === type) : this.history;
    return entries.slice(-Math.max(0, limit));
  }

  clear({ history = true, listeners = false } = {}) {
    if (history) this.history.length = 0;
    if (listeners) this.listeners.clear();
  }
}

export const bridgeLegacyPresentationEvents = (game, bus) => {
  if (!game?.on || !bus) return [];
  const bridges = {
    'run-started': 'legacy:run-started', zone: 'legacy:zone', district: 'legacy:district',
    'boss-phase': 'legacy:boss-phase', 'boss-defeated': 'legacy:boss-defeated',
    'player-dead': 'legacy:player-dead', respawned: 'legacy:respawned',
    loot: 'legacy:loot', 'level-up': 'legacy:level-up', overlay: 'legacy:overlay',
    'campaign-dialogue': 'legacy:campaign-dialogue', 'endgame-started': 'legacy:endgame-started',
    'endgame-complete': 'legacy:endgame-complete', 'stronghold-liberated': 'legacy:stronghold-liberated',
    'world-event-complete': 'legacy:world-event-complete', sound: 'legacy:sound'
  };
  return Object.entries(bridges).map(([legacyType, presentationType]) => game.on(legacyType, (detail) => {
    bus.emit(presentationType, detail, { time: game.clock, source: 'game' });
  }));
};