

CREATE TABLE IF NOT EXISTS producto (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    precio NUMERIC(10,2) NOT NULL,
    stock_actual INT DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pedido (
    id SERIAL PRIMARY KEY,
    mesa VARCHAR(50) NOT NULL,
    estado VARCHAR(20) DEFAULT 'CREADO',
    total NUMERIC(10,2) DEFAULT 0,
    creado_por VARCHAR(100) DEFAULT 'sistema',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pedido_item (
    id SERIAL PRIMARY KEY,
    pedido_id INT REFERENCES pedido(id) ON DELETE CASCADE,
    producto_id INT REFERENCES producto(id),
    cantidad INT NOT NULL DEFAULT 1
);



INSERT INTO producto (nombre, precio, stock_actual) VALUES
('Hamburguesa clásica', 2500, 50),
('Pizza muzzarella', 3200, 20),
('Cerveza artesanal', 1500, 100),
('Gaseosa', 1200, 200)
ON CONFLICT DO NOTHING;
