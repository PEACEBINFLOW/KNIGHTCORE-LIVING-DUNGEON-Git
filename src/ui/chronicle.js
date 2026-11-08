// src/ui/chronicle.js
//
// Scrolling event log. Newest at the bottom, capped at `maxEntries`.

/**
 * Create the chronicle.
 * @param {HTMLElement} container
 * @param {number} [maxEntries=200]
 */
export function createChronicle(container, maxEntries = 200) {
  /**
   * Append one event to the log.
   * @param {{ type?: string, message?: string }} event
   */
  function add(event) {
    const entry = document.createElement('div');
    entry.className = `log-entry ${event.type || ''}`;

    const now = new Date();
    const hh = now.getHours();
    const mm = String(now.getMinutes()).padStart(2, '0');

    const ts = document.createElement('span');
    ts.className = 'ts';
    ts.textContent = `[${hh}:${mm}:]`;

    entry.appendChild(ts);
    entry.appendChild(document.createTextNode(event.message || ''));
    container.appendChild(entry);

    while (container.childNodes.length > maxEntries) {
      container.removeChild(container.firstChild);
    }
    container.scrollTop = container.scrollHeight;
  }

  /** Clear the log. */
  function clear() {
    container.innerHTML = '';
  }

  return { add, clear };
}
