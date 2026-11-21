require('dotenv').config();

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

if (!process.env.AUTH_TOKEN) {
  console.warn(
    '[SECURITY] AUTH_TOKEN is not set. JWTs are signed with a weak built-in fallback secret, so tokens can be forged. Set AUTH_TOKEN in the environment before any non-dev deployment.'
  );
}
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

// True when the authenticated request belongs to a platform super admin (role only).
// Use after authMiddleware, which copies role_id from the verified JWT into req.headers.
const isAdminReq = (req) => {
  const role_id = req && req.headers ? req.headers.role_id : undefined;
  return role_id === ADMIN_ROLE_ID;
};

// Use after authMiddleware.
function requireAdmin(req, res, next) {
  if (isAdminReq(req)) {
    return next();
  }
  return res.status(403).json({ success: false, error: 'Platform Super Admin access required' });
}

module.exports = {
  requireAdmin,
  isAdminReq,
  generateHash,
  validateUser,
  generateJwt,
  verifyJwt,
  authMiddleware,
};
