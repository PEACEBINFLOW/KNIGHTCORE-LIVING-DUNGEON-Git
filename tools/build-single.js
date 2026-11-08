// tools/build-single.js
import esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, cpSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { CSS_LINK_RE, JS_SCRIPT_RE } from './lib/patterns.js';

const ROOT = dirname(fileURLToPath(import.meta.url)) + '/..';
const DIST = join(ROOT, 'dist');
const isMulti = process.argv.includes('--mode=multi') || process.env.BUILD_MODE === 'multi';

function readJSON(name) {
  return JSON.parse(readFileSync(join(ROOT, 'data', name), 'utf8'));
}

async function main() {
  // 1. Clean dist
  if (existsSync(DIST)) rmSync(DIST, { recursive: true, force: true });
  mkdirSync(DIST, { recursive: true });

  const mode = isMulti ? 'multi' : 'single';

  // Always write .nojekyll
  writeFileSync(join(DIST, '.nojekyll'), '');

  if (isMulti) {
    const indexContent = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=./src/"></head><body><script>window.location.href='./src/';</script></body></html>`;
    cpSync(join(ROOT, 'src'), join(DIST, 'src'), { recursive: true });
    cpSync(join(ROOT, 'data'), join(DIST, 'data'), { recursive: true });
    writeFileSync(join(DIST, 'index.html'), indexContent);
    writeFileSync(join(DIST, '404.html'), indexContent);
  } else {
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
      minify: false,
      logLevel: 'warning',
    });
    
    const bundledJS = bundle.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
    const jsonData = JSON.stringify(data).replace(/<\/script/gi, '<\\/script');

    const css = readFileSync(join(ROOT, 'src', 'render', 'theme.css'), 'utf8');
    let html = readFileSync(join(ROOT, 'src', 'index.html'), 'utf8');

    const cssMatch = html.match(CSS_LINK_RE);
    if (!cssMatch) {
      const lines = html.split('\n');
      const context = lines.slice(0, 10).join('\n') + '\n...';
      throw new Error(`build-single: could not find theme.css <link> in src/index.html.\nExpected a <link rel="stylesheet" href="./render/theme.css"> tag.\nFirst lines of file:\n${context}`);
    }
    html = html.replace(CSS_LINK_RE, `<style>\n${css}\n</style>`);

    const jsMatch = html.match(JS_SCRIPT_RE);
    if (!jsMatch) {
      const lines = html.split('\n');
      const context = lines.slice(-10).join('\n');
      throw new Error(`build-single: could not find main.js <script> in src/index.html.\nExpected a <script type="module" src="./main.js"></script> tag.\nLast lines of file:\n${context}`);
    }

    const dataScript = `<script>window.__KNIGHTCORE_DATA__ = ${jsonData};</script>`;
    const inlineModule = `<script type="module">\n${bundledJS}\n</script>`;
    html = html.replace(JS_SCRIPT_RE, `${dataScript}\n  ${inlineModule}`);

    writeFileSync(join(DIST, 'index.html'), html);
    writeFileSync(join(DIST, 'knightcore.html'), html);
    writeFileSync(join(DIST, '404.html'), html);
  }

  // Write build-info
  const sha = process.env.GITHUB_SHA || 'local';
  const ref = process.env.GITHUB_REF_NAME || 'local';
  const runId = process.env.GITHUB_RUN_ID || 'local';
  const builtAt = new Date().toISOString();
  const info = { sha, ref, runId, builtAt, mode, files: [] };
  
  writeFileSync(join(DIST, 'build-info.json'), JSON.stringify(info, null, 2));

  console.log(`✔ Built in ${mode} mode to dist/`);
}

main().catch((err) => {
  console.error('build-single failed:', err.message);
  process.exit(1);
});
