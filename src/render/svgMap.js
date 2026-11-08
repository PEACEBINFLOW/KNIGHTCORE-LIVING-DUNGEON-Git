// src/render/svgMap.js
//
// Builds the SVG dungeon map once, then updates it each frame from a snapshot.
// The map is read-only: it never mutates the world.

import {
  buildKnightSprite,
  updateKnightSprite,
  buildMonsterSprite,
  updateMonsterSprite,
} from './sprites.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function el(name, attrs = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    node.setAttribute(k, String(v));
  }
  return node;
}

function tierBorder(tier) {
  switch (tier) {
    case 'LOW': return '#4a8a4a';
    case 'MID': return '#4a7aa8';
    case 'HIGH': return '#a84a4a';
    case 'CAMP': return '#c8a030';
    case 'VAULT': return '#c8a030';
    case 'BOSS': return '#8a1a0a';
    case 'CORE': return '#a060d0';
    default: return '#666';
  }
}

const ROOM_RANK_COLORS = {
  D: '#70aa60', C: '#60aacc', B: '#c8a030', A: '#cc4488', S: '#ff3322',
};

/**
 * Create the dungeon map.
 * @param {HTMLElement} container
 * @param {{ rooms: object[], paths: [string, string][] }} data
 */
export function createMap(container, { rooms, paths }) {
  const svg = el('svg', {
    viewBox: '0 0 860 580',
    preserveAspectRatio: 'xMidYMid meet',
    class: 'dungeon-svg',
  });

  const roomsById = new Map(rooms.map(r => [r.id, r]));
  const pathGroup = el('g');
  const roomGroup = el('g');
  const monsterGroup = el('g');
  const knightGroup = el('g');

  for (const [a, b] of paths) {
    const ra = roomsById.get(a);
    const rb = roomsById.get(b);
    if (!ra || !rb) continue;
    pathGroup.appendChild(el('line', {
      class: 'path-line',
      x1: ra.cx, y1: ra.cy, x2: rb.cx, y2: rb.cy,
    }));
  }

  const roomRefs = new Map();

  for (const r of rooms) {
    const g = el('g');
    const isCore = r.flags.includes('core');
    const isBoss = r.flags.includes('boss');
    const isSafe = r.flags.includes('safe');
    const isTreasure = r.flags.includes('treasure');

    let rectClass = 'room-rect';
    if (isSafe) rectClass += ' safe';
    else if (isTreasure) rectClass += ' treasure';
    else if (isBoss) rectClass += ' boss';
    else if (isCore) rectClass += ' core';

    const radius = isCore ? Math.min(r.w, r.h) / 2 : 3;

    if (isCore) {
      g.appendChild(el('circle', {
        class: rectClass,
        cx: r.cx, cy: r.cy, r: radius,
      }));
      g.appendChild(el('circle', {
        class: 'room-border',
        cx: r.cx, cy: r.cy, r: radius,
        stroke: tierBorder(r.tier),
        fill: 'none',
        'stroke-width': 1.5,
      }));
    } else {
      g.appendChild(el('rect', {
        class: rectClass,
        x: r.x, y: r.y, width: r.w, height: r.h, rx: radius,
      }));
      g.appendChild(el('rect', {
        class: 'room-border',
        x: r.x, y: r.y, width: r.w, height: r.h, rx: radius,
        stroke: tierBorder(r.tier),
      }));
    }

    const nameText = el('text', {
      class: 'room-name',
      x: r.cx, y: r.cy - 8,
      'text-anchor': 'middle',
    });
    nameText.textContent = r.name;
    g.appendChild(nameText);

    if (r.rank === '∞') {
      const rt = el('text', {
        class: 'room-rank',
        x: r.cx, y: r.cy + 6,
        'text-anchor': 'middle',
        fill: '#c070ff',
        'font-size': 10,
      });
      rt.textContent = '∞';
      g.appendChild(rt);
    } else if (r.rank) {
      const rt = el('text', {
        class: 'room-rank',
        x: r.cx, y: r.cy + 6,
        'text-anchor': 'middle',
        fill: ROOM_RANK_COLORS[r.rank] || '#666',
      });
      rt.textContent = r.rank;
      g.appendChild(rt);
    }

    const badge = el('text', {
      class: 'room-badge',
      x: r.cx, y: r.y + r.h - 4,
      'text-anchor': 'middle',
    });
    g.appendChild(badge);

    let coreState = null;
    if (isCore) {
      coreState = el('text', {
        class: 'room-name',
        x: r.cx, y: r.cy + radius + 14,
        'text-anchor': 'middle',
        fill: '#c070ff',
        'font-size': 8,
      });
      g.appendChild(coreState);
    }

    roomGroup.appendChild(g);
    roomRefs.set(r.id, { g, badge, coreState });
  }

  svg.appendChild(pathGroup);
  svg.appendChild(roomGroup);
  svg.appendChild(monsterGroup);
  svg.appendChild(knightGroup);
  container.appendChild(svg);

  const knightSprites = new Map();
  const monsterSprites = new Map();

  let onKnightClick = null;
  let selectedId = null;

  svg.addEventListener('click', (ev) => {
    let target = ev.target;
    while (target && target !== svg) {
      if (target.dataset && target.dataset.knightId) {
        if (onKnightClick) onKnightClick(target.dataset.knightId);
        return;
      }
      target = target.parentNode;
    }
  });

  function reconcile(entities, sprites, parentGroup, build, update) {
    const seen = new Set();
    for (const ent of entities) {
      seen.add(ent.id);
      let entry = sprites.get(ent.id);
      if (!entry) {
        const refs = build(ent);
        entry = { refs };
        sprites.set(ent.id, entry);
        parentGroup.appendChild(refs.group);
      }
      update(entry.refs, ent);
    }
    for (const [id, entry] of sprites) {
      if (!seen.has(id)) {
        if (entry.refs.group.parentNode) {
          entry.refs.group.parentNode.removeChild(entry.refs.group);
        }
        sprites.delete(id);
      }
    }
  }

  /**
   * Update the map from a world snapshot.
   * @param {object} snapshot
   */
  function update(snapshot) {
    const counts = new Map();
    for (const m of snapshot.monsters) {
      counts.set(m.roomId, (counts.get(m.roomId) || 0) + 1);
    }
    for (const [id, refs] of roomRefs) {
      const n = counts.get(id) || 0;
      refs.badge.textContent = n > 0 ? `👾×${n}` : '';
    }

    const coreRefs = roomRefs.get('core');
    if (coreRefs && coreRefs.coreState) {
      coreRefs.coreState.textContent =
        `${snapshot.core.dominantRank}-RANK · ${snapshot.core.state}`;
    }

    reconcile(
      snapshot.monsters,
      monsterSprites,
      monsterGroup,
      buildMonsterSprite,
      updateMonsterSprite
    );
    reconcile(
      snapshot.knights,
      knightSprites,
      knightGroup,
      buildKnightSprite,
      updateKnightSprite
    );

    for (const [id, entry] of knightSprites) {
      if (id === selectedId) entry.refs.group.classList.add('selected');
      else entry.refs.group.classList.remove('selected');
    }
  }

  return {
    update,
    /** @param {string} id */
    selectKnight(id) { selectedId = id; },
    /** @param {(id: string) => void} fn */
    onKnightClick(fn) { onKnightClick = fn; },
  };
}
