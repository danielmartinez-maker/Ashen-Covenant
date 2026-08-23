export const DOMAIN_EVENTS = new Set([
  'combat:hit-resolved', 'combat:enemy-killed', 'combat:execution',
  'ability:cast', 'ability:mutation-triggered',
  'covenant:alignment-changed', 'covenant:threshold-crossed',
  'world:event-resolved', 'world:region-state-changed',
  'hunter:intrusion', 'hunter:defeated',
  'boss:phase-changed', 'loot:unique-awarded', 'sanctuary:state-changed'
]);

export class DomainEventBus {
  constructor() {
    this.listeners = new Map();
    this.stats = { emitted: 0, listenerErrors: 0 };
    this.lastListenerError = null;
  }
  on(event, listener) {
    if (!DOMAIN_EVENTS.has(event) || typeof listener !== 'function') return () => {};
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(listener);
    return () => this.listeners.get(event)?.delete(listener);
  }
  emit(event, detail = {}) {
    if (!DOMAIN_EVENTS.has(event)) return false;
    this.stats.emitted += 1;
    for (const listener of [...(this.listeners.get(event) ?? [])]) {
      try {
        listener(detail);
      } catch (error) {
        this.stats.listenerErrors += 1;
        this.lastListenerError = { event, message: error?.message ?? String(error) };
      }
    }
    return true;
  }
  clear() { this.listeners.clear(); }
}
