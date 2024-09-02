const path = require('path');
const express = require('express');
const cors = require('cors');
const http = require('http');
const bodyParser = require('body-parser');

const { PORT = 3001 } = process.env;

const app = express();
const server = http.createServer(app);


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

// Serve app production bundle
app.use(express.static('dist/app'));

app.get('/api/getUsername', (req, res) => res.send({ username: os.userInfo().username }));

let comments = ["test"];

// Route to get all comments
app.get('/api/comments', (req, res) => {
    res.send(comments);
});

// Route to add a new comment (vulnerable to XSS)
app.post('/api/comments', (req, res) => {
    const { comment } = req.body;
    console.log(comment)
    comments.push(comment);
    res.send({ success: true });
});
// Handle client routing, return all requests to the app
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'app/index.html'));
});

server.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});
