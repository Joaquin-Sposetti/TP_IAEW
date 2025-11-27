// src/api/auth/auth.controller.js
const jwt = require('jsonwebtoken');

// Usuarios de ejemplo
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

async function login(req, res) {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'username y password son requeridos' });
  }

  const user = findUser(username, password);
  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const payload = {
    sub: user.id,
    username: user.username,
    role: user.role,
  };

  try {
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'changeme',
      { expiresIn: '1h' }
    );

    return res.json({
      access_token: token,
      token_type: 'Bearer',
      expires_in: '1h',
      user,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Error generando token JWT' });
  }
}

async function me(req, res) {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  res.json({ user: req.user });
}

module.exports = {
  login,
  me,
};
