// serve.js — zero-dependency static file server for Scooter Rush: Nanning.
// Usage: node serve.js  →  http://127.0.0.1:4326
// Serves files rooted at this script's own directory, regardless of cwd.

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const ROOT = __dirname;
const HOST = '127.0.0.1';
const PORT = 4326;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

function send404(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end('404 Not Found');
}

function send500(res) {
  res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end('500 Internal Server Error');
}

const server = http.createServer((req, res) => {
  // Dev-only: POST /__capture/<name> with a base64 JPEG body writes captures/<name>.jpg
  // (used to pull canvas frames out of a hidden preview tab for verification).
  if (req.method === 'POST' && req.url.startsWith('/__capture/')) {
    const name = req.url.slice('/__capture/'.length).replace(/[^a-zA-Z0-9_-]/g, '');
    if (!name) return send404(res);
    let body = '';
    req.on('data', d => { body += d; if (body.length > 8e6) req.destroy(); });
    req.on('end', () => {
      try {
        const dir = path.join(ROOT, 'captures');
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, name + '.jpg'), Buffer.from(body, 'base64'));
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('ok');
      } catch {
        send500(res);
      }
    });
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(url.parse(req.url).pathname);
  } catch {
    return send404(res);
  }

  // Reject embedded null bytes: fs.stat() throws synchronously on them, which would
  // otherwise escape as an uncaught exception and crash the process.
  if (pathname.includes('\0')) return send404(res);

  if (pathname === '/') pathname = '/index.html';

  const requested = path.normalize(path.join(ROOT, pathname));

  // Path-traversal guard: resolved path must still live under ROOT.
  if (requested !== ROOT && !requested.startsWith(ROOT + path.sep)) {
    return send404(res);
  }

  fs.stat(requested, (err, stats) => {
    if (err || !stats.isFile()) return send404(res);

    const ext = path.extname(requested).toLowerCase();
    const mime = MIME[ext];
    if (!mime) return send404(res);

    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store' });
    const stream = fs.createReadStream(requested);
    stream.on('error', () => send500(res));
    stream.pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Scooter Rush serving ${ROOT} → http://${HOST}:${PORT}`);
});
