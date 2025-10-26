-- migrations/001_init.sql
CREATE TABLE IF NOT EXISTS producto (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  precio NUMERIC(12,2) NOT NULL CHECK (precio >= 0),
  stock_actual INTEGER NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_pedido') THEN
    CREATE TYPE estado_pedido AS ENUM ('CREADO','CONFIRMADO','EN_COCINA','LISTO','ENTREGADO','CANCELADO');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS pedido (
  id SERIAL PRIMARY KEY,
  estado estado_pedido NOT NULL DEFAULT 'CREADO',
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  creado_por TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pedido_item (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
  producto_id INTEGER NOT NULL REFERENCES producto(id),
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(12,2) NOT NULL CHECK (precio_unitario >= 0),
  subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0)
);

CREATE INDEX IF NOT EXISTS idx_item_pedido ON pedido_item(pedido_id);
CREATE INDEX IF NOT EXISTS idx_item_producto ON pedido_item(producto_id);
