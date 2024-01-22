const path = require('path');
const express = require('express');
const cors = require('cors');
const router = require('./api/routes');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');

const { PORT = 3001 } = process.env;

const app = express();
const server = http.createServer(app);

let socketData = {};

// handle cors
app.use(
  cors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: '*',
  })
);

app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

// Middleware that parses json and looks at requests where the Content-Type header matches the type option.
app.use(express.json());

app.use((req, _res, next) => {
  req.headers.socketData = socketData;
  next();
});

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
  io.to(socket.id).emit('socket_id', socket.id);

  socket.on('send_message', async (messageData) => {
    const target = socketData[messageData.receiver_id];
    io.to(target.socket_id).emit('receive_message', messageData);

    console.log(
      `Sent Message --> ${messageData.username} to ${target.username}`
    );
  });

  socket.on('connect_user', (user_data) => {
    socketData[user_data.user_id] = {
      ...user_data,
      socket_id: socket.id,
    };
    console.log(`user ${user_data.username} connected on ${socket.id}`);
  });
});

// Handle client routing, return all requests to the app
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'app/index.html'));
});

server.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});
