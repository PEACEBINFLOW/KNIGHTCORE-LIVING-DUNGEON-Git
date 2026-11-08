// src/core/events.js
//
// Tiny synchronous event bus. Every log line in the simulation is an event
// shaped like { tick, type, actorId?, roomId?, value?, message? } so the future
// ledger extension can record them verbatim without a rewrite.

/**
 * Minimal synchronous event bus.
 * Payloads must be plain objects.
 */
export class EventBus {
  constructor() {
    /** @type {Map<string, Function[]>} */
    this._listeners = new Map();
  }

  /**
   * Subscribe to an event type. Returns an unsubscribe function.
   * @param {string} type
   * @param {(payload: any) => void} fn
   * @returns {() => void}
   */
  on(type, fn) {
    if (!this._listeners.has(type)) this._listeners.set(type, []);
    this._listeners.get(type).push(fn);
    return () => this.off(type, fn);
  }

  /**
   * Unsubscribe.
   * @param {string} type
   * @param {Function} fn
   */
  off(type, fn) {
    const arr = this._listeners.get(type);
    if (!arr) return;
    const i = arr.indexOf(fn);
    if (i >= 0) arr.splice(i, 1);
  }

  /**
   * Emit synchronously to all subscribers.
   * @param {string} type
   * @param {any} payload
   */
  emit(type, payload) {
    const arr = this._listeners.get(type);
    if (!arr) return;
    for (let i = 0; i < arr.length; i++) arr[i](payload);
  }
}
