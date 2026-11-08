// src/ui/panel.js
//
// Side panel: Dungeon Core header + meters, knight list, monster list.
// Read-only view of the snapshot.

import { RANK_COLORS } from '../core/stats.js';

const CORE_METER_MAX = {
  avgLevel: 50,
  bosses: 10,
};

function makeMeter(label) {
  const wrap = document.createElement('div');
  wrap.className = 'meter';

  const lbl = document.createElement('div');
  lbl.className = 'meter-label';
  const l = document.createElement('span');
  l.textContent = label;
  const v = document.createElement('span');
  v.className = 'meter-value';
  lbl.appendChild(l);
  lbl.appendChild(v);

  const bar = document.createElement('div');
  bar.className = 'meter-bar';
  const fill = document.createElement('div');
  fill.className = 'meter-fill';
  bar.appendChild(fill);

  wrap.appendChild(lbl);
  wrap.appendChild(bar);
  return { wrap, valueEl: v, fillEl: fill };
}

function setMeter(m, value, max, color) {
  m.valueEl.textContent = typeof value === 'number' ? value.toFixed(1) : String(value);
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  m.fillEl.style.width = `${pct}%`;
  m.fillEl.style.background = color;
}

function hpClass(pct) {
  if (pct > 0.6) return 'high';
  if (pct > 0.3) return 'mid';
  return 'low';
}

/**
 * Create the panel controller.
 * @param {{
 *   coreBadgeRow: HTMLElement,
 *   coreMeters: HTMLElement,
 *   knightList: HTMLElement,
 *   monsterList: HTMLElement,
 *   knightCount: HTMLElement,
 *   monsterCount: HTMLElement
 * }} els
 */
export function createPanel(els) {
  const meters = {
    energy: makeMeter('ENERGY'),
    corruption: makeMeter('CORRUPTION'),
    hunger: makeMeter('HUNGER'),
    pressure: makeMeter('PRESSURE'),
    avgLevel: makeMeter('AVG LEVEL'),
    bosses: makeMeter('BOSSES SLAIN'),
  };
  for (const m of Object.values(meters)) els.coreMeters.appendChild(m.wrap);

  const badge = document.createElement('span');
  badge.className = 'core-rank-badge';
  els.coreBadgeRow.appendChild(badge);

  const knightRows = new Map();
  const monsterRows = new Map();

  let selectHandler = null;
  let selectedId = null;

  function buildKnightRow(k) {
    const row = document.createElement('div');
    row.className = 'list-row';
    row.dataset.id = k.id;

    const rune = document.createElement('span');
    rune.className = 'knight-rune';
    rune.textContent = k.rune;

    const name = document.createElement('span');
    name.className = 'knight-name';
    name.textContent = k.name;

    const level = document.createElement('span');
    level.className = 'knight-level';

    const rank = document.createElement('span');
    rank.className = 'knight-rank';

    const hp = document.createElement('div');
    hp.className = 'knight-hp hp-bar';
    const hpFill = document.createElement('div');
    hpFill.className = 'hp-bar-fill';
    hp.appendChild(hpFill);

    row.appendChild(rune);
    row.appendChild(name);
    row.appendChild(level);
    row.appendChild(rank);
    row.appendChild(hp);

    row.addEventListener('click', () => {
      if (selectHandler) selectHandler(k.id);
    });

    return { row, level, rank, hpFill };
  }

  function updateKnightRow(refs, k) {
    refs.level.textContent = `L${k.level}`;
    refs.rank.textContent = k.rank;
    refs.rank.style.color = RANK_COLORS[k.rank] || '#666';
    refs.rank.style.borderColor = RANK_COLORS[k.rank] || '#666';
    const pct = Math.max(0, Math.min(1, k.hp / k.maxHP));
    refs.hpFill.style.width = `${pct * 100}%`;
    refs.hpFill.className = `hp-bar-fill ${hpClass(pct)}`;
  }

  function buildMonsterRow(m) {
    const row = document.createElement('div');
    row.className = 'list-row';
    row.dataset.id = m.id;

    const emoji = document.createElement('span');
    emoji.className = 'monster-emoji';
    emoji.textContent = m.emoji;

    const name = document.createElement('span');
    name.className = 'monster-name';
    name.textContent = m.name;

    const rank = document.createElement('span');
    rank.className = 'monster-rank';

    const hp = document.createElement('div');
    hp.className = 'monster-hp hp-bar';
    const hpFill = document.createElement('div');
    hpFill.className = 'hp-bar-fill';
    hp.appendChild(hpFill);

    row.appendChild(emoji);
    row.appendChild(name);
    row.appendChild(rank);
    row.appendChild(hp);

    return { row, rank, hpFill };
  }

  function updateMonsterRow(refs, m) {
    refs.rank.textContent = m.rank;
    refs.rank.style.color = RANK_COLORS[m.rank] || '#666';
    refs.rank.style.borderColor = RANK_COLORS[m.rank] || '#666';
    const pct = Math.max(0, Math.min(1, m.hp / m.maxHP));
    refs.hpFill.style.width = `${pct * 100}%`;
    refs.hpFill.className = `hp-bar-fill ${hpClass(pct)}`;
  }

  function syncList(entities, rows, container, build, update) {
    const seen = new Set();
    for (const e of entities) {
      seen.add(e.id);
      let entry = rows.get(e.id);
      if (!entry) {
        entry = build(e);
        rows.set(e.id, entry);
        container.appendChild(entry.row);
      }
      update(entry, e);
    }
    for (const [id, entry] of rows) {
      if (!seen.has(id)) {
        entry.row.remove();
        rows.delete(id);
      }
    }
  }

  /**
   * Update the panel from a snapshot.
   * @param {object} snapshot
   */
  function update(snapshot) {
    badge.textContent = `${snapshot.core.dominantRank}-RANK · ${snapshot.core.state}`;
    badge.style.color = RANK_COLORS[snapshot.core.dominantRank] || '#666';
    badge.style.borderColor = RANK_COLORS[snapshot.core.dominantRank] || '#666';

    setMeter(meters.energy, snapshot.core.energy, 100, '#60aacc');
    setMeter(meters.corruption, snapshot.core.corruption, 100, '#cc4488');
    setMeter(meters.hunger, snapshot.core.hunger, 100, '#a060d0');
    setMeter(meters.pressure, snapshot.core.pressure, 100, '#a08030');
    setMeter(meters.avgLevel, snapshot.avgKnightLevel, CORE_METER_MAX.avgLevel, '#4a8a4a');
    setMeter(meters.bosses, snapshot.core.bossesDefeated, CORE_METER_MAX.bosses, '#ff3322');

    syncList(snapshot.knights, knightRows, els.knightList, buildKnightRow, updateKnightRow);
    syncList(snapshot.monsters, monsterRows, els.monsterList, buildMonsterRow, updateMonsterRow);

    els.knightCount.textContent = String(snapshot.knights.length);
    els.monsterCount.textContent = String(snapshot.monsters.length);

    for (const [id, entry] of knightRows) {
      if (id === selectedId) entry.row.classList.add('selected');
      else entry.row.classList.remove('selected');
    }
  }

  return {
    update,
    /** @param {(id: string) => void} fn */
    onKnightSelect(fn) { selectHandler = fn; },
    /** @param {string} id */
    selectKnight(id) { selectedId = id; },
  };
}
