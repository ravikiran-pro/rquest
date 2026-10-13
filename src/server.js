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

// Serve app production bundle
app.use(express.static('dist/app'));

// Handle client routing, return all requests to the app
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'app/index.html'));
});

server.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});
