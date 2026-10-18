require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const router = require('./api/routes');
const http = require('http');
const bodyParser = require('body-parser');
const { initSocket } = require('./api/socket');

const { PORT = 3001 } = process.env;

const app = express();
const server = http.createServer(app);

// Initialize isolated Socket.io module
initSocket(server);

// handle cors
app.use(
  cors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: '*',
  })
);

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: false }));

// parse application/json
app.use(bodyParser.json());

// Middleware that parses json and looks at requests where the Content-Type header matches the type option.
app.use(express.json());

// Serve API requests from the router
app.use('/api/v1', router);

// Serve app production bundle with optimal cache headers
app.use(
  express.static('dist/app', {
    setHeaders: (res, filePath) => {
      // Ensure HTML, service worker, and manifest files are NEVER cached by browsers or CDNs
      if (
        filePath.endsWith('.html') ||
        filePath.endsWith('sw.js') ||
        filePath.endsWith('registerSW.js') ||
        filePath.endsWith('manifest.webmanifest')
      ) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else if (filePath.includes(path.sep + 'assets' + path.sep) || filePath.includes('/assets/')) {
        // Hashed bundle assets can safely be cached for 1 year
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  })
);

// Serve static SEO landing page if explicitly requested
app.get(['/seo', '/landing-page'], (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, 'app/landing.html'));
});

// Handle client routing, return all requests to the app
app.get('*', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, 'app/index.html'));
});

server.listen(PORT, async () => {
  console.log(`Server listening at http://localhost:${PORT}`);
  try {
    const db = require('./api/models');
    if (db && db.sequelize) {
      await db.sequelize.query('ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "form_schema" JSONB DEFAULT \'[]\'::jsonb;');
      await db.sequelize.query('ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "allow_multi_category" BOOLEAN DEFAULT false;');
      await db.sequelize.query('ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "form_schema" JSONB DEFAULT \'[]\'::jsonb;');
    }
  } catch (dbErr) {
    console.warn('DB self-heal check:', dbErr.message);
  }
});
