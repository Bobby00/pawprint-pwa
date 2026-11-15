import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types for proper PWA serving
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
};

const server = http.createServer((req, res) => {
  // Parse the URL path
  const requestUrl = new URL(req.url, `http://localhost:${PORT}`);
  let filePath = path.join(PUBLIC_DIR, requestUrl.pathname);

  // Default to index.html for directory requests
  if (filePath.endsWith('/') || fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Only fall back to index.html for route-like paths (no file extension).
        // Asset requests (JS, CSS, images, etc.) should return 404, not HTML.
        const hasExtension = path.extname(requestUrl.pathname) !== '';
        if (!hasExtension) {
          fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err2, indexData) => {
            if (err2) {
              res.writeHead(404, { 'Content-Type': 'text/html' });
              res.end('<h1>404 Not Found</h1>');
            } else {
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(indexData);
            }
          });
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
        }
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server Error');
      }
      return;
    }

    // Service worker: no-cache so updates are picked up; all other files cache-friendly
    const headers = { 'Content-Type': contentType };
    if (filePath.endsWith('service-worker.js')) {
      headers['Service-Worker-Allowed'] = '/';
      headers['Cache-Control'] = 'no-cache';
    } else if (filePath.endsWith('.js') || filePath.endsWith('.css') || filePath.endsWith('.html')) {
      // JS/CSS: revalidate every load so the SW and devs always see fresh code
      headers['Cache-Control'] = 'no-cache';
    } else {
      headers['Cache-Control'] = 'public, max-age=31536000';
    }

    res.writeHead(200, headers);
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n================================================`);
  console.log(` PWA Local Test Server`);
  console.log(`================================================`);
  console.log(` Server running at: http://localhost:${PORT}`);
  console.log(` Open that URL in your browser to test the PWA`);
  console.log(` Press Ctrl+C to stop the server`);
  console.log(`================================================\n`);
});
