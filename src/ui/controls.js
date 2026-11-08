// src/ui/controls.js
//
// Control strip: Pause/Resume, speed (1×/2×/4×), seed field + Restart.
// Owns its own DOM inside the container.

/**
 * Create the controls strip.
 * @param {HTMLElement} container
 * @param {{
 *   onPause: () => void,
 *   onResume: () => void,
 *   onSpeed: (speed: number) => void,
 *   onRestart: (seed: number) => void
 * }} handlers
 */
export function createControls(container, handlers) {
  let paused = false;
  let speed = 1;
  let seed = 1234;

  const pauseBtn = document.createElement('button');
  pauseBtn.textContent = '⏸ PAUSE';
  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.textContent = paused ? '▶ RESUME' : '⏸ PAUSE';
    pauseBtn.classList.toggle('active', paused);
    if (paused) handlers.onPause();
    else handlers.onResume();
  });
  container.appendChild(pauseBtn);

  const speedBtns = [];
  for (const s of [1, 2, 4]) {
    const btn = document.createElement('button');
    btn.textContent = `${s}×`;
    if (s === 1) btn.classList.add('active');
    btn.addEventListener('click', () => {
      speed = s;
      for (const b of speedBtns) b.classList.remove('active');
      btn.classList.add('active');
      handlers.onSpeed(s);
    });
    speedBtns.push(btn);
    container.appendChild(btn);
  }

  const seedLabel = document.createElement('span');
  seedLabel.textContent = 'SEED:';
  container.appendChild(seedLabel);

  const seedInput = document.createElement('input');
  seedInput.type = 'number';
  seedInput.value = String(seed);
  container.appendChild(seedInput);

  const restartBtn = document.createElement('button');
  restartBtn.textContent = '↻ RESTART';
  restartBtn.addEventListener('click', () => {
    const v = parseInt(seedInput.value, 10);
    if (!Number.isFinite(v)) return;
    seed = v;
    handlers.onRestart(seed);
  });
  container.appendChild(restartBtn);

  return {
    /** @param {number} s */
    setSeed(s) {
      seed = s;
      seedInput.value = String(s);
    },
    isPaused: () => paused,
    speed: () => speed,
  };
}
