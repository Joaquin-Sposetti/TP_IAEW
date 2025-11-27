// src/api/auth.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081';

/**
 * Inicia sesión con usuario y contraseña.
 * Devuelve el token JWT y datos del usuario.
 */
export async function login(username, password) {
  const res = await axios.post(
    `${API_URL}/auth/login`,
    { username, password },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  return res.data;
}

/**
 * Obtiene la información del usuario autenticado.
 */
export async function getMe(token) {
  const res = await axios.get(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
}
