// tools/preflight.js
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CSS_LINK_RE, JS_SCRIPT_RE } from './lib/patterns.js';

const ROOT = dirname(fileURLToPath(import.meta.url)) + '/..';
let failed = false;

function fail(msg) {
  console.log(`❌ FAIL: ${msg}`);
  failed = true;
}
function pass(msg) {
  console.log(`✅ PASS: ${msg}`);
}

// A. Required files
const requiredFiles = [
  'package.json', 'src/index.html', 'src/main.js',
  'src/core/rng.js', 'src/core/events.js', 'src/core/graph.js', 'src/core/stats.js',
  'src/core/knight.js', 'src/core/monster.js', 'src/core/dungeonCore.js',
  'src/core/population.js', 'src/core/world.js',
  'src/render/svgMap.js', 'src/render/sprites.js', 'src/render/theme.css',
  'src/ui/panel.js', 'src/ui/chronicle.js', 'src/ui/statusWindow.js', 'src/ui/controls.js',
  'data/rooms.json', 'data/paths.json', 'data/monsters.json', 'data/names.json', 'data/balance.json',
  'tests/rng.test.js', 'tests/stats.test.js', 'tests/graph.test.js', 'tests/dungeonCore.test.js',
  'tests/population.test.js', 'tests/knight.test.js', 'tests/world.test.js'
];
for (const f of requiredFiles) {
  if (!existsSync(join(ROOT, f))) fail(`Missing required file: ${f}`);
}
if (!failed) pass('All required files exist');

// B. Data JSON
try {
  const rooms = JSON.parse(readFileSync(join(ROOT, 'data/rooms.json'), 'utf8'));
  const paths = JSON.parse(readFileSync(join(ROOT, 'data/paths.json'), 'utf8'));
  const monsters = JSON.parse(readFileSync(join(ROOT, 'data/monsters.json'), 'utf8'));
  const names = JSON.parse(readFileSync(join(ROOT, 'data/names.json'), 'utf8'));
  const balance = JSON.parse(readFileSync(join(ROOT, 'data/balance.json'), 'utf8'));

  if (!Array.isArray(rooms) || rooms.length === 0) throw new Error('rooms.json is not a non-empty array');
  for (const r of rooms) {
    if (!r.id || r.cx === undefined || r.cy === undefined) throw new Error(`Room missing id/cx/cy: ${JSON.stringify(r)}`);
  }
  const roomIds = new Set(rooms.map(r => r.id));
  for (const [a, b] of paths) {
    if (!roomIds.has(a) || !roomIds.has(b)) throw new Error(`Path references invalid room: ${a}-${b}`);
  }
  for (const rank of ['D', 'C', 'B', 'A', 'S']) {
    if (!monsters[rank]) throw new Error(`monsters.json missing rank ${rank}`);
  }
  if (typeof balance.chronicle?.maxEntries !== 'number') throw new Error('balance.chronicle.maxEntries is not a number');
  if (!Array.isArray(names.knights)) throw new Error('names.knights is not an array');

  pass('Data JSON files valid');
} catch (e) {
  fail(`Data JSON error: ${e.message}`);
}

// C. Import graph
function getFiles(dir, ext, fileList = []) {
  const files = readdirSync(dir);
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      getFiles(filePath, ext, fileList);
    } else if (filePath.endsWith(ext)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const sourceFiles = [
  ...getFiles(join(ROOT, 'src'), '.js'),
  ...getFiles(join(ROOT, 'tools'), '.js'),
  ...getFiles(join(ROOT, 'tests'), '.js')
];

let importErrors = 0;
for (const file of sourceFiles) {
  const content = readFileSync(file, 'utf8');
  const importRegex = /import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importClause = match[1].trim();
    const importPath = match[2];
    if (!importPath.startsWith('.')) continue; // skip node built-ins or packages
    
    const targetFile = join(dirname(file), importPath);
    if (!existsSync(targetFile)) {
      fail(`Missing import target: ${importPath} in ${file.replace(ROOT+'/', '')}`);
      importErrors++;
      continue;
    }
    const targetContent = readFileSync(targetFile, 'utf8');
    
    const namedMatch = importClause.match(/\{([^}]+)\}/);
    const namedNames = namedMatch ? namedMatch[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0]).filter(Boolean) : [];
    const defaultName = importClause.replace(/\{[^}]+\}/, '').replace(/,/g, '').trim();

    for (const name of namedNames) {
      const reg1 = new RegExp(`export\\s+(?:const|let|var|function|class|async\\s+function)\\s+${name}\\b`);
      const reg2 = new RegExp(`export\\s*\\{[^}]*\\b${name}\\b[^}]*\\}`);
      if (!reg1.test(targetContent) && !reg2.test(targetContent)) {
        fail(`MISSING EXPORT: ${name} in ${importPath} <- imported by ${file.replace(ROOT+'/', '')}`);
        importErrors++;
      }
    }
    if (defaultName) {
      if (!/export\s+default/.test(targetContent)) {
        fail(`MISSING DEFAULT EXPORT in ${importPath} <- imported by ${file.replace(ROOT+'/', '')}`);
        importErrors++;
      }
    }
  }
}
if (importErrors === 0) pass('All relative imports resolve and have matching exports');

// D. Test file sanity
let testErrors = 0;
const testFiles = getFiles(join(ROOT, 'tests'), '.js');
for (const f of testFiles) {
  const content = readFileSync(f, 'utf8');
  if (!content.includes("from 'node:test'") && !content.includes('from "node:test"')) {
    fail(`Test file missing node:test import: ${f.replace(ROOT+'/', '')}`);
    testErrors++;
  }
  if (/export\s+/.test(content)) {
    fail(`Test file contains export statement: ${f.replace(ROOT+'/', '')}`);
    testErrors++;
  }
}
if (testErrors === 0) pass('Test files valid');

// E. index.html contract
try {
  const html = readFileSync(join(ROOT, 'src/index.html'), 'utf8');
  const hasCss = CSS_LINK_RE.test(html);
  const hasJs = JS_SCRIPT_RE.test(html);
  if (!hasCss) fail('index.html missing matching stylesheet link');
  if (!hasJs) fail('index.html missing matching module script');
  if (hasCss && hasJs) pass('index.html contract valid');
} catch (e) {
  fail(`index.html check failed: ${e.message}`);
}

// F. Workflow sanity
const wfDir = join(ROOT, '.github/workflows');
if (existsSync(wfDir)) {
  const wfs = readdirSync(wfDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
  const deployWfs = [];
  const names = {};
  for (const wf of wfs) {
    const content = readFileSync(join(wfDir, wf), 'utf8');
    if (content.includes('actions/deploy-pages')) deployWfs.push(wf);
    const nameMatch = content.match(/^name:\s*(.+)$/m);
    if (nameMatch) {
      const name = nameMatch[1].trim();
      if (names[name]) fail(`Duplicate workflow name "${name}" in ${names[name]} and ${wf}`);
      names[name] = wf;
    }
  }
  if (deployWfs.length > 1) {
    fail(`Multiple workflows deploy to Pages: ${deployWfs.join(', ')}`);
  } else if (deployWfs.length === 1) {
    pass('Exactly one workflow deploys to Pages');
  }
}

// G. package.json
try {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  if (pkg.type !== 'module') fail('package.json missing "type": "module"');
  for (const s of ['test', 'build', 'preflight', 'verify']) {
    if (!pkg.scripts[s]) fail(`package.json missing script "${s}"`);
  }
  pass('package.json valid');
} catch (e) {
  fail(`package.json invalid: ${e.message}`);
}

if (failed) process.exit(1);
