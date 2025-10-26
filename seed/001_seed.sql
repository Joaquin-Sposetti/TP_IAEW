INSERT INTO producto (nombre, precio, stock_actual) VALUES
 ('Hamburguesa Clásica', 4500, 50),
 ('Papas Fritas',       2500, 100),
 ('Gaseosa 500ml',      1800, 80)
ON CONFLICT DO NOTHING;

INSERT INTO pedido (estado, total, creado_por)
VALUES ('CREADO', 0, 'mozo_demo')
ON CONFLICT DO NOTHING;
