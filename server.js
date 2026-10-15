'use strict';

// Online Paste Board — a zero-dependency Node.js server.
// Each board is identified by a name in the URL (e.g. /my-board). Content is
// stored as JSON files under DATA_DIR so it survives restarts.

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const PASSWORD = process.env.BOARD_PASSWORD || '';
const MAX_BYTES = 1024 * 1024; // 1 MB per board
const BOARD_NAME = /^[A-Za-z0-9_-]{1,64}$/;
const INDEX_HTML = path.join(__dirname, 'public', 'index.html');

fs.mkdirSync(DATA_DIR, { recursive: true });

function boardFile(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function readBoard(name) {
  try {
    return JSON.parse(fs.readFileSync(boardFile(name), 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return { content: '', updatedAt: null };
    throw err;
  }
}

function writeBoard(name, content) {
  const board = { content, updatedAt: new Date().toISOString() };
  const file = boardFile(name);
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(board));
  fs.renameSync(tmp, file); // atomic replace
  return board;
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function authorized(req) {
  if (!PASSWORD) return true;
  const header = req.headers.authorization || '';
  if (!header.startsWith('Basic ')) return false;
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  const given = Buffer.from(decoded.slice(decoded.indexOf(':') + 1));
  const expected = Buffer.from(PASSWORD);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BYTES + 1024) {
        reject(Object.assign(new Error('Payload too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function handle(req, res) {
  if (!authorized(req)) {
    res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Paste Board"' });
    res.end('Authentication required');
    return;
  }

  const url = new URL(req.url, 'http://localhost');
  const api = url.pathname.match(/^\/api\/boards\/([^/]+)$/);

  if (api) {
    const name = decodeURIComponent(api[1]);
    if (!BOARD_NAME.test(name)) return sendJson(res, 400, { error: 'Invalid board name' });

    if (req.method === 'GET') return sendJson(res, 200, readBoard(name));

    if (req.method === 'PUT') {
      let parsed;
      try {
        parsed = JSON.parse(await readBody(req));
      } catch (err) {
        return sendJson(res, err.status || 400, { error: err.status ? err.message : 'Invalid JSON' });
      }
      if (typeof parsed.content !== 'string') return sendJson(res, 400, { error: '"content" must be a string' });
      if (Buffer.byteLength(parsed.content) > MAX_BYTES) return sendJson(res, 413, { error: 'Content exceeds 1 MB' });
      return sendJson(res, 200, writeBoard(name, parsed.content));
    }

    res.writeHead(405, { Allow: 'GET, PUT' });
    res.end();
    return;
  }

  // Any other GET path ("/" or "/<board>") serves the single-page UI.
  if (req.method === 'GET') {
    const name = url.pathname.slice(1);
    if (name && !BOARD_NAME.test(name)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(INDEX_HTML).pipe(res);
    return;
  }

  res.writeHead(405);
  res.end();
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((err) => {
    console.error(err);
    if (!res.headersSent) sendJson(res, 500, { error: 'Internal server error' });
    else res.end();
  });
});

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log(`Paste Board running at http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
    if (PASSWORD) console.log('Password protection is enabled.');
  });
}

module.exports = server;
