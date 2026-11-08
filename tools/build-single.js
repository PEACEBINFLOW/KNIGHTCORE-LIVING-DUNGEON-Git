// tools/build-single.js
//
// Bundles src/main.js + theme.css + all data JSON into ONE self-contained
// HTML file at:
//   dist/knightcore.html   ← the itch.io / offline build
//   dist/index.html        ← same file, for GitHub Pages root
//
// No network dependencies at runtime. Fonts fall back to serif / monospace
// when offline; the Google Fonts <link> is kept for online viewers.

import esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url)) + '/..';
const DIST = join(ROOT, 'dist');

function readJSON(name) {
  return JSON.parse(readFileSync(join(ROOT, 'data', name), 'utf8'));
}

async function main() {
  const data = {
    rooms: readJSON('rooms.json'),
    paths: readJSON('paths.json'),
    monsters: readJSON('monsters.json'),
    names: readJSON('names.json'),
    balance: readJSON('balance.json'),
  };

  const bundle = await esbuild.build({
    entryPoints: [join(ROOT, 'src', 'main.js')],
    bundle: true,
    write: false,
    format: 'esm',
    target: ['es2020'],
    // Bump to `minify: true` for a smaller itch.io upload; kept off by default
    // so the shipped file stays debuggable.
    minify: false,
    logLevel: 'warning',
  });
  const bundledJS = bundle.outputFiles[0].text;

  const css = readFileSync(join(ROOT, 'src', 'render', 'theme.css'), 'utf8');
  let html = readFileSync(join(ROOT, 'src', 'index.html'), 'utf8');

  const cssLinkRe = /<link rel="stylesheet" href="\.\/render\/theme\.css">/;
  if (!cssLinkRe.test(html)) {
    throw new Error('build-single: could not find theme.css <link> in index.html');
  }
  html = html.replace(cssLinkRe, `<style>\n${css}\n</style>`);

  const scriptRe = /<script type="module" src="\.\/main\.js"><\/script>/;
  if (!scriptRe.test(html)) {
    throw new Error('build-single: could not find main.js <script> in index.html');
  }

  const dataScript = `<script>window.__KNIGHTCORE_DATA__ = ${JSON.stringify(data)};</script>`;
  const inlineModule = `<script type="module">\n${bundledJS}\n</script>`;
  html = html.replace(scriptRe, `${dataScript}\n  ${inlineModule}`);

  if (!existsSync(DIST)) mkdirSync(DIST, { recursive: true });

  writeFileSync(join(DIST, 'knightcore.html'), html);
  writeFileSync(join(DIST, 'index.html'), html);

  const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
  console.log(`✔ dist/knightcore.html  (${kb} KB)`);
  console.log(`✔ dist/index.html       (${kb} KB)`);
  console.log('  single-file build — open dist/knightcore.html directly in a browser.');
}

main().catch((err) => {
  console.error('build-single failed:', err);
  process.exit(1);
});
