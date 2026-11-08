// src/render/sprites.js
//
// SVG builders for knights and monsters. Pure "build then update" pattern:
// build once when an entity is first seen, then mutate attributes on update.

import { RANK_COLORS } from '../core/stats.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function el(name, attrs = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    node.setAttribute(k, String(v));
  }
  return node;
}

/**
 * Build a knight sprite. Returns { group, refs }.
 * @param {object} k knight snapshot
 */
export function buildKnightSprite(k) {
  const group = el('g', { class: 'knight', 'data-knight-id': k.id });

  const ring = el('circle', { class: 'combat-ring hidden', cx: 0, cy: 0, r: 14 });
  group.appendChild(ring);

  const plume = el('rect', {
    class: 'knight-plume',
    x: -1, y: -14, width: 2, height: 5,
  });
  group.appendChild(plume);

  const head = el('rect', {
    class: 'knight-head',
    x: -3, y: -9, width: 6, height: 6, rx: 1,
  });
  group.appendChild(head);

  const body = el('rect', {
    class: 'knight-body',
    x: -4, y: -3, width: 8, height: 9, rx: 1,
  });
  group.appendChild(body);

  const rune = el('text', { class: 'knight-rune', x: 0, y: 2 });
  rune.textContent = k.rune;
  group.appendChild(rune);

  const level = el('text', { class: 'knight-level', x: 0, y: -17 });
  group.appendChild(level);

  const hpBg = el('rect', {
    class: 'knight-hp-bg',
    x: -9, y: 9, width: 18, height: 2.5,
  });
  group.appendChild(hpBg);

  const hpFill = el('rect', {
    class: 'knight-hp-fill',
    x: -9, y: 9, width: 18, height: 2.5,
  });
  group.appendChild(hpFill);

  const refs = { group, ring, plume, head, body, rune, level, hpFill };
  updateKnightSprite(refs, k);
  return refs;
}

/**
 * Update a knight sprite from a knight snapshot.
 * @param {ReturnType<typeof buildKnightSprite>} refs
 * @param {object} k
 */
export function updateKnightSprite(refs, k) {
  const { group, ring, plume, level, hpFill } = refs;

  group.setAttribute('transform', `translate(${k.x.toFixed(2)} ${k.y.toFixed(2)})`);
  plume.setAttribute('fill', RANK_COLORS[k.rank] || '#666');
  level.textContent = String(k.level);

  const pct = Math.max(0, Math.min(1, k.hp / k.maxHP));
  hpFill.setAttribute('width', String(18 * pct));

  if (k.combatTarget) ring.classList.remove('hidden');
  else ring.classList.add('hidden');
}

/**
 * Build a monster sprite. Returns { group, refs }.
 * @param {object} m monster snapshot
 */
export function buildMonsterSprite(m) {
  const group = el('g', { class: 'monster', 'data-monster-id': m.id });

  const emoji = el('text', { class: 'monster-emoji-text', x: 0, y: 3 });
  emoji.textContent = m.emoji;
  group.appendChild(emoji);

  const hpBg = el('rect', {
    class: 'monster-hp-bg',
    x: -6, y: 7, width: 12, height: 2,
  });
  group.appendChild(hpBg);

  const hpFill = el('rect', {
    class: 'monster-hp-fill',
    x: -6, y: 7, width: 12, height: 2,
  });
  group.appendChild(hpFill);

  const refs = { group, emoji, hpFill };
  updateMonsterSprite(refs, m);
  return refs;
}

/**
 * Update a monster sprite from a monster snapshot.
 * @param {ReturnType<typeof buildMonsterSprite>} refs
 * @param {object} m
 */
export function updateMonsterSprite(refs, m) {
  const { group, hpFill } = refs;
  group.setAttribute('transform', `translate(${m.x.toFixed(2)} ${m.y.toFixed(2)})`);
  const pct = Math.max(0, Math.min(1, m.hp / m.maxHP));
  hpFill.setAttribute('width', String(12 * pct));
}
