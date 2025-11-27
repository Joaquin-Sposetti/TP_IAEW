import { useState, useEffect } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL

export default function Productos({ token }) {
  const [productos, setProductos] = useState([])
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [edit, setEdit] = useState(null)


  const payload = JSON.parse(atob(token.split(".")[1]))
  const role = payload.role

  function deny(msg) {
    alert("⛔ Acción no permitida: " + msg)
  }

  async function cargar() {
    const r = await axios.get(`${API}/productos`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    setProductos(r.data)
  }

  async function crear(e) {
    e.preventDefault()
    if (role !== "admin") return deny("Solo admin puede crear productos")

    try {
      await axios.post(`${API}/productos`, {
        nombre,
        precio: Number(precio)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      alert("Producto agregado ✔")
      setNombre("")
      setPrecio("")
      cargar()
    } catch {
      alert("Error creando producto ❌")
    }
  }

  async function actualizar(e) {
    e.preventDefault()
    if (role !== "admin") return deny("Solo admin puede modificar productos")

    try {
      await axios.put(`${API}/productos/${edit.id}`, {
        nombre: edit.nombre,
        precio: Number(edit.precio)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      alert("Producto actualizado ✔")
      setEdit(null)
      cargar()
    } catch {
      alert("Error actualizando producto ❌")
    }
  }

  async function eliminar(id) {
    if (role !== "admin") return deny("Solo admin puede eliminar productos")
    if (!confirm("¿Eliminar producto?")) return

    try {
      await axios.delete(`${API}/productos/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      alert("Producto eliminado ✔")
      cargar()
    } catch {
      alert("Error eliminando producto ❌")
    }
  }

  useEffect(() => { cargar() }, [])

  return (
    <div style={{ padding: "2rem", maxWidth: 700, margin: "0 auto", fontFamily: "Inter" }}>
      <h1>🛒 Productos</h1>

      {/* Crear producto (solo admin) */}
      {role === "admin" && (
        <div style={card}>
          <h3>➕ Agregar producto</h3>
          <form onSubmit={crear} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input placeholder="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} style={input} />
            <input type="number" placeholder="Precio" value={precio} onChange={e => setPrecio(e.target.value)} style={input} />
            <button style={btn("green")}>Agregar</button>
          </form>
        </div>
      )}

      {/* Editar producto */}
      {edit && role === "admin" && (
        <div style={card}>
          <h3>✏️ Editar producto</h3>
          <form onSubmit={actualizar} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input value={edit.nombre} onChange={e => setEdit({ ...edit, nombre: e.target.value })} style={input} />
            <input type="number" value={edit.precio} onChange={e => setEdit({ ...edit, precio: e.target.value })} style={input} />
            <button style={btn("blue")}>Guardar</button>
            <button type="button" onClick={() => setEdit(null)} style={btn("red")}>Cancelar</button>
          </form>
        </div>
      )}

      {/* Lista de productos */}
      <div style={card}>
        {productos.map(p => (
          <div key={p.id} style={row}>
            <strong>{p.nombre}</strong>
            <span>${p.precio}</span>

            {(role === "admin") && (
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setEdit(p)} style={btn("blue")}>Editar</button>
                <button onClick={() => eliminar(p.id)} style={btn("red")}>Eliminar</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const card = {
  background: "#fff",
  padding: "1rem",
  borderRadius: 12,
  marginBottom: 20,
  boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
}

const row = {
  display: "flex",
  justifyContent: "space-between",
  padding: "10px 0",
  borderBottom: "1px solid #eee"
}

const input = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #ccc"
}

function btn(color) {
  return {
    padding: "6px 12px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    color: "white",
    background:
      color === "green"
        ? "#28a745"
        : color === "blue"
        ? "#007bff"
        : "#dc3545"
  }
}
