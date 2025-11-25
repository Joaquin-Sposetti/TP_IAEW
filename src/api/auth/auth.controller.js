// src/api/auth/auth.controller.js
const jwt = require('jsonwebtoken');

// Usuarios de ejemplo (se pueden mover a DB luego)
const USERS = [
  { id: 1, username: 'mozo1', password: 'mozo123', role: 'mozo' },
  { id: 2, username: 'cocina1', password: 'cocina123', role: 'cocina' },
  { id: 3, username: 'admin', password: 'admin123', role: 'admin' },
];

function findUser(username, password) {
  return USERS.find(
    (u) => u.username === username && u.password === password
  );
}

/**
 * POST /auth/login
 */
async function login(req, res) {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'username y password son requeridos' });
  }

  const user = findUser(username, password);
  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  // 🟢 Forzamos expiración fija de 1h para evitar lecturas erróneas de ENV
  const expiresIn = '1h';
  const secret = process.env.JWT_SECRET || 'changeme';

  const payload = {
    sub: user.id,
    username: user.username,
    role: user.role,
  };

  try {
    const token = jwt.sign(payload, secret, { expiresIn });

    return res.json({
      access_token: token,
      token_type: 'Bearer',
      expires_in: expiresIn,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('[auth] Error al firmar token:', err);
    return res.status(500).json({ error: 'Error generando token JWT' });
  }
}

/**
 * GET /auth/me
 */
async function me(req, res) {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  return res.json({ user: req.user });
}

module.exports = {
  login,
  me,
};
