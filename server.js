// Zero-Dependency Local Development Server for Habit & Sleep Tracker
// Emulates Vercel Serverless Functions + Static File Hosting
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const API_ROUTES = {
  '/api/auth': require('./api/auth.js'),
  '/api/habits': require('./api/habits.js'),
  '/api/habit-toggle': require('./api/habit-toggle.js'),
  '/api/sleep': require('./api/sleep.js'),
  '/api/analytics': require('./api/analytics.js'),
  '/api/insights': require('./api/insights.js'),
  '/api/seed': require('./api/seed.js'),
  '/api/backup': require('./api/backup.js')
};

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        resolve(body);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Augment res to match Vercel Serverless Function helper methods
  res.status = function (statusCode) {
    this.statusCode = statusCode;
    return this;
  };

  res.json = function (data) {
    this.setHeader('Content-Type', 'application/json; charset=utf-8');
    this.end(JSON.stringify(data));
  };

  // Route API requests
  const apiHandler = API_ROUTES[pathname];
  if (apiHandler) {
    req.body = await parseBody(req);
    req.query = parsedUrl.query;
    try {
      return apiHandler(req, res);
    } catch (err) {
      console.error('API Error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // Handle Static Files from public directory
  let safePath = pathname === '/' ? '/index.html' : pathname;
  let filePath = path.join(PUBLIC_DIR, safePath);

  // Security check: prevent directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Access Denied');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA-style client routing if not an asset
      const ext = path.extname(filePath);
      if (!ext) {
        filePath = path.join(PUBLIC_DIR, 'index.html');
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('404 Not Found');
      }
    }

    const extname = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        return res.end('Server Error');
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(` HabitSync & Sleep Analytics Server is RUNNING!`);
  console.log(` Local URL: http://localhost:${PORT}`);
  console.log(` Ready for local use and instant deployment to Vercel`);
  console.log(`======================================================\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const nextPort = PORT + 1;
    console.warn(`Port ${PORT} in use, trying port ${nextPort}...`);
    server.listen(nextPort);
  } else {
    console.error('Server error:', err);
  }
});
