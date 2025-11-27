import { useState, useEffect } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL
const WS = import.meta.env.VITE_WS_URL

export default function Pedidos({ token }) {
  const [pedidos, setPedidos] = useState([])
  const [productos, setProductos] = useState([])
  const [mesa, setMesa] = useState('')
  const [nuevoItem, setNuevoItem] = useState({ pedidoId: '', productoId: '', cantidad: 1 })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  // EXTRAER ROL DEL TOKEN
  const payload = JSON.parse(atob(token.split(".")[1]))
  const role = payload.role 

  function deny(msg) {
    alert("⛔ Acción no permitida: " + msg)
  }

  

  async function cargarPedidos() {
    try {
      setLoading(true)
      const r = await axios.get(`${API}/pedidos`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const base = r.data || []

      const completos = await Promise.all(
        base.map(async p => {
          try {
            const det = await axios.get(`${API}/pedidos/${p.id}`, {
              headers: { Authorization: `Bearer ${token}` }
            })
            return det.data
          } catch {
            return p
          }
        })
      )
console.log("DEBUG PEDIDO COMPLETO:", completos);

      setPedidos(completos)
    } catch {
      setError("No se pudieron cargar los pedidos")
    } finally {
      setLoading(false)
    }
  }

  async function cargarProductos() {
    try {
      const r = await axios.get(`${API}/productos`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setProductos(r.data || [])
    } catch {}
  }

  async function crearPedido(e) {
    e.preventDefault()
    if (role !== "mozo" && role !== "admin") return deny("Solo mozo/admin pueden crear pedidos")

    if (!mesa.trim()) return
    try {
      await axios.post(`${API}/pedidos`, { mesa }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      alert("Pedido creado correctamente ✔")
      setMesa('')
      cargarPedidos()
    } catch (err) {
      alert("Error creando pedido ❌")
    }
  }

  async function agregarItem(e) {
    e.preventDefault()
    if (role !== "mozo" && role !== "admin") return deny("Solo mozo/admin pueden agregar items")

    const { pedidoId, productoId, cantidad } = nuevoItem
    if (!pedidoId || !productoId) return

    try {
      await axios.post(`${API}/pedidos/${pedidoId}/items`, {
        producto_id: Number(productoId),
        cantidad: Number(cantidad)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      alert("Producto agregado ✔")
      setNuevoItem({ pedidoId: '', productoId: '', cantidad: 1 })
      cargarPedidos()
    } catch {
      alert("Error agregando item ❌")
    }
  }

  async function eliminarItem(pedidoId, itemId) {
    if (role !== "mozo" && role !== "admin") return deny("Solo mozo/admin pueden eliminar items")

    if (!confirm("¿Eliminar item?")) return
    try {
      await axios.delete(`${API}/pedidos/${pedidoId}/items/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      alert("Item eliminado ✔")
      cargarPedidos()
    } catch {
      alert("Error eliminando item ❌")
    }
  }

  async function confirmar(id) {
    if (role !== "cocina" && role !== "admin") return deny("Solo cocina/admin pueden confirmar pedidos")

    try {
      await axios.post(`${API}/pedidos/${id}/confirmar`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      alert("Pedido confirmado 👨‍🍳")
      cargarPedidos()
    } catch {
      alert("Error confirmando pedido ❌")
    }
  }

  async function marcarListo(id) {
    if (role !== "cocina" && role !== "admin") return deny("Solo cocina/admin pueden marcar como listo")

    try {
      await axios.post(`${API}/pedidos/${id}/listo`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      alert("Pedido marcado como LISTO ✔")
      cargarPedidos()
    } catch {
      alert("Error marcando como listo ❌")
    }
  }

  async function eliminarPedido(id) {
    if (role !== "admin") return deny("Solo admin puede eliminar pedidos")

    if (!confirm("¿Eliminar pedido?")) return
    try {
      await axios.delete(`${API}/pedidos/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      alert("Pedido eliminado ✔")
      cargarPedidos()
    } catch {
      alert("Error eliminando pedido ❌")
    }
  }

  useEffect(() => {
    cargarPedidos()
    cargarProductos()
  }, [])

  function colorEstado(estado) {
  return {
    CREADO: "#777",
    CONFIRMADO: "#f0ad4e",   
    LISTO: "#5cb85c"        
  }[estado] || "#444";
}


  return (
    <div style={{
      padding: "2rem",
      maxWidth: 900,
      margin: "0 auto",
      fontFamily: "Inter, sans-serif"
    }}>
      <h1>📦 Pedidos</h1>

      {(role === "mozo" || role === "admin") && (
        <div style={card}>
          <h3>➕ Crear pedido</h3>
          <form onSubmit={crearPedido} style={{ display: "flex", gap: 10 }}>
            <input
              placeholder="Mesa o nombre"
              value={mesa}
              onChange={e => setMesa(e.target.value)}
              style={input}
            />
            <button style={btn("green")}>Crear</button>
          </form>
        </div>
      )}

      {(role === "mozo" || role === "admin") && (
        <div style={card}>
          <h3>🍽️ Agregar producto</h3>

          <form onSubmit={agregarItem} style={{ display: "flex", gap: 10 }}>
            <select
              value={nuevoItem.pedidoId}
              onChange={e => setNuevoItem({ ...nuevoItem, pedidoId: e.target.value })}
              style={input}
            >
              <option value="">Pedido…</option>
              {pedidos.map(p => (
                <option key={p.id} value={p.id}>
                  #{p.id} — Mesa {p.mesa}
                </option>
              ))}
            </select>

            <select
              value={nuevoItem.productoId}
              onChange={e => setNuevoItem({ ...nuevoItem, productoId: e.target.value })}
              style={input}
            >
              <option value="">Producto…</option>
              {productos.map(pr => (
                <option key={pr.id} value={pr.id}>{pr.nombre}</option>
              ))}
            </select>

            <input
              type="number"
              min={1}
              value={nuevoItem.cantidad}
              onChange={e => setNuevoItem({ ...nuevoItem, cantidad: e.target.value })}
              style={{ width: 90, ...input }}
            />

            <button style={btn("blue")}>Agregar</button>
          </form>
        </div>
      )}


      {loading ? (
        <p>Cargando...</p>
      ) : pedidos.length === 0 ? (
        <p>No hay pedidos</p>
      ) : (
        pedidos.map(p => (
          <div key={p.id} style={card}>
            <h3>
              🧾 Pedido #{p.id} —{" "}
              <span style={{ color: colorEstado(p.estado) }}>{p.estado}</span>
            </h3>


<div style={{ display: "flex", gap: 10 }}>
  

  {(role === "cocina" || role === "admin") && p.estado === "CREADO" && (
    <button onClick={() => confirmar(p.id)} style={btn("blue")}>
      Confirmar
    </button>
  )}


  {(role === "cocina" || role === "admin") && p.estado === "CONFIRMADO" && (
    <span style={{ color: "#0275d8" }}>Confirmado… (esperando 10s)</span>
  )}


  {(role === "cocina" || role === "admin") && p.estado === "EN_COCINA" && (
    <button onClick={() => marcarListo(p.id)} style={btn("green")}>
      Marcar como listo
    </button>
  )}

  {role === "admin" && p.estado === "CREADO" && (
    <button onClick={() => eliminarPedido(p.id)} style={btn("red")}>
      Eliminar
    </button>
  )}



</div>


            {/* Items */}
            <ul style={{ marginTop: 10 }}>
              {p.items?.length > 0 ? (
                p.items.map(it => (
                  <li key={it.id}>
                    {it.producto_nombre} × {it.cantidad}
                    {(role === "mozo" || role === "admin") && p.estado === "CREADO" && (
                      <button
                        onClick={() => eliminarItem(p.id, it.id)}
                        style={{ marginLeft: 10, color: "red", cursor: "pointer" }}
                      >
                        ✖
                      </button>
                    )}
                  </li>
                ))
              ) : (
                <i>Sin productos</i>
              )}
            </ul>
          </div>
        ))
      )}
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

const input = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #ccc",
  flex: 1
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
