// tools/serve.js
//
// Tiny static dev server using Node's built-in http. Zero dependencies.
// Serves the repo root so `fetch('../data/*.json')` from src/main.js works.
// `/` redirects to `/src/` so relative paths inside index.html resolve.

import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = normalize(dirname(fileURLToPath(import.meta.url)) + '/..');
const PORT = Number(process.env.PORT) || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
};

function send(res, status, body, type) {
  res.writeHead(status, type ? { 'Content-Type': type } : {});
  res.end(body);
}

const server = createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(req.url.split('?')[0]);
  } catch {
    send(res, 400, 'bad request');
    return;
  }

  if (urlPath === '/' || urlPath === '') {
    res.writeHead(302, { Location: '/src/' });
    res.end();
    return;
  }
  if (urlPath === '/src') {
    res.writeHead(302, { Location: '/src/' });
    res.end();
    return;
  }
  if (urlPath === '/src/') urlPath = '/src/index.html';

  const safePath = normalize(urlPath).replace(/^(\.\.[\\/])+/, '');
  const filePath = join(ROOT, safePath);

  if (!filePath.startsWith(ROOT)) {
    send(res, 403, 'forbidden');
    return;
  }

  try {
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      try {
        const idx = readFileSync(join(filePath, 'index.html'));
        send(res, 200, idx, MIME['.html']);
      } catch {
        send(res, 403, 'forbidden');
      }
      return;
    }
    const body = readFileSync(filePath);
    const ext = extname(filePath);
    send(res, 200, body, MIME[ext] || 'application/octet-stream');
  } catch {
    send(res, 404, 'not found');
  }
});

server.listen(PORT, () => {
  console.log(`KNIGHTCORE dev server → http://localhost:${PORT}/`);
  console.log(`(repo root: ${ROOT})`);
});
