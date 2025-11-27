// src/App.jsx
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Login from './pages/Login';
import Productos from './pages/Productos';
import Pedidos from './pages/Pedidos';

/**
 * Dashboard: interfaz principal una vez autenticado
 */
function Dashboard({ token, setToken }) {
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem('token');
    setToken(null);
    navigate('/');
  }

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 20 }}>
      <nav style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <Link to="/productos">Productos</Link>
        <Link to="/pedidos">Pedidos</Link>
        <button onClick={logout}>Cerrar sesión</button>
      </nav>

      <Routes>
        <Route path="/productos" element={<Productos token={token} />} />
        <Route path="/pedidos" element={<Pedidos token={token} />} />
        <Route path="*" element={<Navigate to="/productos" />} />
      </Routes>
    </div>
  );
}

/**
 * App principal: decide si mostrar login o dashboard
 */
export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  return !token ? (
    <Login onLogin={setToken} />
  ) : (
    <Dashboard token={token} setToken={setToken} />
  );
}
