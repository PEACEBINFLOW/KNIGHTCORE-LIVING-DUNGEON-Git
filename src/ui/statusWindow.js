// src/ui/statusWindow.js
//
// Full knight status window. Opens on selection; closes on the [close] button.

import {
  computeDerived,
  computeBodyTraits,
  computeAuraTraits,
  gradeOf,
  RANK_COLORS,
} from '../core/stats.js';

/**
 * Create the knight status window.
 * @param {HTMLElement} container
 */
export function createStatusWindow(container) {
  let currentKnightId = null;

  function clear() {
    container.innerHTML = '';
    container.classList.add('hidden');
    currentKnightId = null;
  }

  function makeRow(k, v) {
    const row = document.createElement('div');
    row.className = 'stat-row';
    const a = document.createElement('span');
    a.className = 'k';
    a.textContent = k;
    const b = document.createElement('span');
    b.className = 'v';
    b.textContent = v;
    row.appendChild(a);
    row.appendChild(b);
    return row;
  }

  function makeGradedRow(k, v) {
    const row = document.createElement('div');
    row.className = 'stat-row';
    const a = document.createElement('span');
    a.className = 'k';
    a.textContent = k;
    const b = document.createElement('span');
    b.className = 'v';
    b.textContent = String(v);
    const g = document.createElement('span');
    const grade = gradeOf(v);
    g.textContent = grade;
    g.style.color = RANK_COLORS[grade];
    g.style.marginLeft = '6px';
    b.appendChild(g);
    row.appendChild(a);
    row.appendChild(b);
    return row;
  }

  function makeBarRow(label, value, max, color) {
    const row = document.createElement('div');
    row.className = 'stat-row';
    row.style.flexDirection = 'column';
    row.style.alignItems = 'stretch';

    const top = document.createElement('div');
    top.style.display = 'flex';
    top.style.justifyContent = 'space-between';

    const a = document.createElement('span');
    a.className = 'k';
    a.textContent = label;
    const b = document.createElement('span');
    b.className = 'v';
    b.textContent = `${Math.floor(value)} / ${Math.floor(max)}`;

    top.appendChild(a);
    top.appendChild(b);
    row.appendChild(top);

    const bar = document.createElement('div');
    bar.className = 'hp-bar';
    bar.style.marginTop = '2px';
    const fill = document.createElement('div');
    fill.className = 'hp-bar-fill';
    fill.style.background = color;
    const pct = Math.max(0, Math.min(1, value / max));
    fill.style.width = `${pct * 100}%`;
    bar.appendChild(fill);
    row.appendChild(bar);

    return row;
  }

  function makeSectionTitle(text) {
    const el = document.createElement('div');
    el.className = 'stat-section-title';
    el.textContent = text;
    return el;
  }

  function makeTraitRow(k, v) {
    if (v == null) return makeRow(k, '—');
    return makeGradedRow(k, v);
  }

  function render(knight) {
    const d = computeDerived(knight.stats);
    const body = computeBodyTraits(knight.stats);
    const aura = computeAuraTraits(knight.stats);

    container.innerHTML = '';

    const header = document.createElement('h2');
    const title = document.createElement('span');
    title.textContent = `${knight.rune}  ${knight.name}`;
    const close = document.createElement('span');
    close.className = 'close';
    close.textContent = '[close]';
    close.addEventListener('click', clear);
    header.appendChild(title);
    header.appendChild(close);
    container.appendChild(header);

    container.appendChild(makeRow('Level', `L${knight.level} · ${knight.rank}`));
    container.appendChild(makeRow('XP', `${Math.floor(knight.xp)} / ${knight.xpNext}`));
    container.appendChild(makeRow('Gold', String(knight.gold)));
    container.appendChild(makeRow('Kills', String(knight.kills)));

    container.appendChild(makeBarRow('HP', knight.hp, knight.maxHP, '#8a1a0a'));
    container.appendChild(makeBarRow('Aura', knight.aura, knight.maxAura, '#2244aa'));

    container.appendChild(makeSectionTitle('Base Stats'));
    for (const key of ['STR', 'AGI', 'VIT', 'AUR', 'INT']) {
      container.appendChild(makeGradedRow(key, knight.stats[key]));
    }

    container.appendChild(makeSectionTitle('Derived'));
    for (const key of [
      'ATK', 'DEF', 'SPD', 'DODGE', 'PARRY', 'BLOCK',
      'STAMINA', 'maxHP', 'maxAura', 'AURA_REGEN',
    ]) {
      container.appendChild(makeGradedRow(key, d[key]));
    }

    container.appendChild(makeSectionTitle('Body Traits'));
    for (const [k, v] of Object.entries(body)) {
      container.appendChild(makeTraitRow(k, v));
    }

    container.appendChild(makeSectionTitle('Aura Traits'));
    for (const [k, v] of Object.entries(aura)) {
      container.appendChild(makeTraitRow(k, v));
    }
  }

  function open(knight) {
    currentKnightId = knight.id;
    render(knight);
    container.classList.remove('hidden');
  }

  function update(knight) {
    if (currentKnightId === knight.id) render(knight);
  }

  function getCurrentId() {
    return currentKnightId;
  }

  return { open, close: clear, update, getCurrentId };
}
