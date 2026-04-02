const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}

function serveHtml(res) {
  const htmlPath = path.join(__dirname, 'mbr_index_html.html');
  fs.readFile(htmlPath, 'utf8', (err, data) => {
    if (err) {
      sendText(res, 500, 'Failed to load UI file');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === 'GET' && (req.url === '/' || req.url === '/mbr_index_html.html')) {
    serveHtml(res);
    return;
  }

  sendText(res, 404, 'Not found');
});

server.listen(PORT, () => {
  console.log('MBR UI running on http://localhost:' + PORT);
});
