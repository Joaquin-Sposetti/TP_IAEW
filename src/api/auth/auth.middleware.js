// src/api/auth/auth.middleware.js
const jwt = require('jsonwebtoken');

function extractToken(req) {
  const authHeader = req.headers['authorization'] || '';
  const [, token] = authHeader.split(' '); // "Bearer <token>"
  return token;
}

/**
 * Middleware básico de autenticación JWT.
 * - Requiere header: Authorization: Bearer <token>
 * - Si es válido, deja el payload en req.user
 */
function auth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'changeme');
    req.user = {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
    };
    return next();
  } catch (err) {
    console.error('[auth] token inválido:', err.message);
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

/**
 * Middleware de autorización por rol.
 * - requireRole(['admin', 'mozo'])
 */
function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    return next();
  };
}

module.exports = {
  auth,
  requireRole,
};
