// tools/verify-dist.js
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url)) + '/..';
const DIST = join(ROOT, 'dist');
let failed = false;

function fail(msg) {
  console.error(`❌ FAIL: ${msg}`);
  failed = true;
}
function pass(msg) {
  console.log(`✅ PASS: ${msg}`);
}

if (!existsSync(DIST)) {
  fail('dist/ folder does not exist. Run npm run build first.');
  process.exit(1);
}

if (!existsSync(join(DIST, '.nojekyll'))) fail('Missing .nojekyll');
if (!existsSync(join(DIST, '404.html'))) fail('Missing 404.html');
if (!existsSync(join(DIST, 'build-info.json'))) fail('Missing build-info.json');

let info;
try {
  info = JSON.parse(readFileSync(join(DIST, 'build-info.json'), 'utf8'));
} catch (e) {
  fail(`build-info.json invalid: ${e.message}`);
}

const isMulti = info.mode === 'multi';

if (existsSync(join(DIST, 'index.html'))) {
  const html = readFileSync(join(DIST, 'index.html'), 'utf8');
  const size = statSync(join(DIST, 'index.html')).size;

  if (!isMulti && size < 20000) fail(`index.html is only ${size} bytes, expected > 20 KB`);

  if (isMulti) {
    if (!html.includes('./src/')) fail('Multi-mode index.html missing redirect to ./src/');
  } else {
    if (!html.includes('id="app"')) fail('Missing id="app"');
    if (!html.includes('id="map-container"')) fail('Missing id="map-container"');
    if (!html.includes('KNIGHT<span class="blood">CORE</span>')) fail('Missing title bar');
    if (!html.includes('window.__KNIGHTCORE_DATA__')) fail('Missing embedded data');
    if (!html.includes('<script type="module">')) fail('Missing inline module script');
    if (html.includes('src="./main.js"')) fail('Found leftover src="./main.js"');
    if (html.includes('href="./render/theme.css"')) fail('Found leftover theme.css link');
    if (/src="\//.test(html)) fail('Found root-absolute src attribute');
    if (/href="\//.test(html)) fail('Found root-absolute href attribute');
    if (html.includes('A fully autonomous RPG ecosystem that runs itself') && !html.includes('id="map-container"')) {
      fail('Looks like a README instead of the game');
    }
  }
} else {
  fail('Missing index.html');
}

if (!failed) pass('dist/ verification passed');
if (failed) process.exit(1);
