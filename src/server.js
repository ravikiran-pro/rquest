const path = require('path');
const express = require('express');
const cors = require('cors');
const router = require('./api/routes');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser')


const { PORT = 3001 } = process.env;

const app = express();
const server = http.createServer(app);

// handle cors
app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

// Middleware that parses json and looks at requests where the Content-Type header matches the type option.
app.use(express.json());

// Serve API requests from the router
app.use('/api/v1', router);

// Serve app production bundle
app.use(express.static('dist/app'));

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(socket.id);
  io.to(socket.id).emit('socket_id', socket.id);

  socket.on('send_message', (messageData) => {
    socket.emit('receive_message', messageData);
  });
});

// Handle client routing, return all requests to the app
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'app/index.html'));
});

server.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});
