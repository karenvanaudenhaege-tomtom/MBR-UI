const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
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

function callAnthropic(payload) {
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify(payload);

    const req = https.request(
      {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
          'content-length': Buffer.byteLength(requestBody)
        }
      },
      res => {
        let body = '';
        res.on('data', chunk => {
          body += chunk;
        });
        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(body || 'Anthropic request failed'));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(new Error('Invalid JSON from Anthropic'));
          }
        });
      }
    );

    req.on('error', reject);
    req.write(requestBody);
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/healthz') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === 'GET' && (req.url === '/' || req.url === '/mbr_index_html.html')) {
    serveHtml(res);
    return;
  }

  if (req.method === 'POST' && req.url === '/api/chat') {
    if (!API_KEY) {
      sendText(res, 500, 'Server is missing ANTHROPIC_API_KEY');
      return;
    }

    try {
      const body = await parseJsonBody(req);
      const messages = Array.isArray(body.messages) ? body.messages : [];
      const system = typeof body.system === 'string' ? body.system : '';

      const data = await callAnthropic({
        model: MODEL,
        max_tokens: 1000,
        system,
        messages
      });

      sendJson(res, 200, data);
    } catch (err) {
      console.error('Proxy request failed:', err && err.message ? err.message : err);
      sendText(res, 500, 'Proxy request failed');
    }
    return;
  }

  sendText(res, 404, 'Not found');
});

server.listen(PORT, () => {
  console.log('MBR UI running on http://localhost:' + PORT);
});
