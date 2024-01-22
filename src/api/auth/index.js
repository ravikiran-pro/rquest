require('dotenv').config();

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const AUTH_TOKEN = process.env.AUTH_TOKEN;

const generateHash = (password) => {
  return bcrypt.hash(password, AUTH_TOKEN);
};

function validateUser(password, hash) {
  bcrypt
    .compare(password, hash)
    .then((res) => {
      console.log(res); // return true
    })
    .catch((err) => console.error(err.message));
}

function generateJwt(payload) {
  const token = jwt.sign(payload, AUTH_TOKEN);
  return token;
}

function verifyJwt(token) {
  const decoded = jwt.verify(token, AUTH_TOKEN);
  return decoded;
}

async function authMiddleware(req, res, next) {
  try {
    const authorization = req.headers.authorization.split(' ');
    const decoded = await verifyJwt(authorization[1]);
    req.headers = {
      ...req?.headers,
      ...decoded,
    };
    next();
  } catch (e) {
    res.status(500).json({
      error: 'Authentication Failed',
      message: 'Authentication Failed',
    });
  }
}

module.exports = {
  generateHash,
  validateUser,
  generateJwt,
  verifyJwt,
  authMiddleware,
};
