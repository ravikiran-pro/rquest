require('dotenv').config();

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const AUTH_TOKEN = process.env.AUTH_TOKEN || '12';
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 12;

const generateHash = (password) => {
  return bcrypt.hash(password, Number(BCRYPT_ROUNDS));
};

function validateUser(password, hash) {
  return bcrypt.compare(password, hash);
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
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        error: 'Authentication Failed',
        message: 'No authorization token provided',
      });
    }
    const authorization = authHeader.split(' ');
    if (authorization.length !== 2 || authorization[0] !== 'Bearer') {
      return res.status(401).json({
        error: 'Authentication Failed',
        message: 'Invalid authorization format',
      });
    }
    const decoded = await verifyJwt(authorization[1]);
    req.headers = {
      ...req?.headers,
      ...decoded,
      user_id: decoded.user_id || decoded.id,
      username: decoded.username,
      role_id: decoded.role_id,
    };
    req.user = decoded;
    next();
  } catch (e) {
    res.status(401).json({
      error: 'Authentication Failed',
      message: 'Invalid or expired token',
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
