const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const COMMENTS_FILE = path.join(__dirname, 'comments.json');

// ── Helpers ──────────────────────────────────────────────────────────────────

function readComments() {
  try { return JSON.parse(fs.readFileSync(COMMENTS_FILE, 'utf8')); }
  catch { return []; }
}

function writeComments(comments) {
  fs.writeFileSync(COMMENTS_FILE, JSON.stringify(comments, null, 2), 'utf8');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}

function serveHtml(res) {
  const htmlPath = path.join(__dirname, 'mbr_index_html.html');
  fs.readFile(htmlPath, 'utf8', (err, data) => {
    if (err) { sendText(res, 500, 'Failed to load UI file'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(data);
  });
}

// ── Router ───────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'GET' && req.url === '/healthz') {
    sendJSON(res, 200, { ok: true });
    return;
  }

  if (req.method === 'GET' && (req.url === '/' || req.url === '/mbr_index_html.html')) {
    serveHtml(res);
    return;
  }

  // GET /api/comments
  if (req.method === 'GET' && url.pathname === '/api/comments') {
    sendJSON(res, 200, readComments());
    return;
  }

  // POST /api/comments
  if (req.method === 'POST' && url.pathname === '/api/comments') {
    try {
      const body = await readBody(req);
      const { author, text, section, cardLabel, cardId, timing } = body;
      if (!author || !text || !section || !cardLabel || !timing) {
        sendJSON(res, 400, { error: 'Missing required fields' });
        return;
      }
      const comments = readComments();
      const comment = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        author: String(author).slice(0, 100),
        text: String(text).slice(0, 2000),
        section,
        cardLabel: String(cardLabel).slice(0, 200),
        cardId: String(cardId || '').slice(0, 100),
        timing, // 'in-review' | 'afterwards'
        status: 'open',
        createdAt: new Date().toISOString(),
        answeredAt: null,
      };
      comments.push(comment);
      writeComments(comments);
      sendJSON(res, 201, comment);
    } catch {
      sendJSON(res, 400, { error: 'Invalid request' });
    }
    return;
  }

  // PATCH /api/comments/:id/answered — toggle answered/open
  const patchMatch = url.pathname.match(/^\/api\/comments\/([a-z0-9]+)\/answered$/);
  if (req.method === 'PATCH' && patchMatch) {
    const id = patchMatch[1];
    const comments = readComments();
    const idx = comments.findIndex(c => c.id === id);
    if (idx === -1) { sendJSON(res, 404, { error: 'Not found' }); return; }
    comments[idx].status = comments[idx].status === 'answered' ? 'open' : 'answered';
    comments[idx].answeredAt = comments[idx].status === 'answered' ? new Date().toISOString() : null;
    writeComments(comments);
    sendJSON(res, 200, comments[idx]);
    return;
  }

  // DELETE /api/comments/:id
  const deleteMatch = url.pathname.match(/^\/api\/comments\/([a-z0-9]+)$/);
  if (req.method === 'DELETE' && deleteMatch) {
    const id = deleteMatch[1];
    const comments = readComments();
    const idx = comments.findIndex(c => c.id === id);
    if (idx === -1) { sendJSON(res, 404, { error: 'Not found' }); return; }
    comments.splice(idx, 1);
    writeComments(comments);
    sendJSON(res, 200, { ok: true });
    return;
  }

  sendText(res, 404, 'Not found');
});

server.listen(PORT, () => {
  console.log('MBR UI running on http://localhost:' + PORT);
});
