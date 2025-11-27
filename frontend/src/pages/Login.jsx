// src/pages/Login.jsx
import { useState } from 'react';
import { login } from '../api/auth';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    try {
      const data = await login(username, password);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = '/pedidos'; // redirige a pedidos
    } catch (err) {
      console.error('[Login error]', err);
      setError('Credenciales inválidas o servidor no disponible');
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f2f2f2',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: '#fff',
          padding: '2rem',
          borderRadius: '10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          width: '320px',
        }}
      >
        <h2 style={{ textAlign: 'center', marginBottom: '1rem', color: '#333' }}>
          Iniciar sesión
        </h2>

        <input
          type="text"
          placeholder="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem',
            marginBottom: '1rem',
            border: '1px solid #ccc',
            borderRadius: '5px',
          }}
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem',
            marginBottom: '1rem',
            border: '1px solid #ccc',
            borderRadius: '5px',
          }}
        />

        {error && (
          <p style={{ color: 'red', textAlign: 'center', marginBottom: '1rem' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          style={{
            width: '100%',
            background: '#0FAA7B',
            color: '#fff',
            padding: '0.6rem',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
