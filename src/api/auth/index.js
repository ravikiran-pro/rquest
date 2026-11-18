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

const ADMIN_ROLE_ID = 'd5e858d8-636c-4fc3-8c3a-0a76131c95e9';

// Use after authMiddleware. Same rule as the orders/quotes admin endpoints.
function requireAdmin(req, res, next) {
  const { role_id, username } = req.headers;
  if (role_id === ADMIN_ROLE_ID || username === 'admin' || username === 'root') {
    return next();
  }
  return res.status(403).json({ error: 'Platform Super Admin access required' });
}

module.exports = {
  requireAdmin,
  generateHash,
  validateUser,
  generateJwt,
  verifyJwt,
  authMiddleware,
};
