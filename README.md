# Sistema de Pedidos de Restaurante – Trabajo Práctico Integrador IAEW 2025

Este proyecto implementa un sistema distribuido para gestionar pedidos de un restaurante.  
El sistema sigue una arquitectura basada en servicios desacoplados, comunicación asincrónica mediante RabbitMQ, observabilidad con OpenTelemetry y trazabilidad completa con Jaeger, Prometheus y Grafana.

Dominio elegido: Pedidos en Restaurante con Cocina.

---

## Arquitectura en un vistazo

El proyecto está compuesto por los siguientes servicios:

- API (Node.js + Express)
- Base de datos PostgreSQL
- Broker de mensajería RabbitMQ
- Worker que procesa eventos
- Servidor WebSocket
- Frontend (React)
- OpenTelemetry Collector
- Prometheus
- Grafana
- Jaeger (Distributed Tracing)

Imagen de arquitectura disponible en el archivo `diagramas_c4.png`.  
Documentación detallada en la carpeta `/docs`.

---

## Requisitos previos

- Docker Desktop versión 4.25 o superior
- Docker Compose versión 2.20 o superior
- Mínimo 4 GB de RAM (8 GB recomendado)
- Node.js 18 o superior (solo si se ejecutan partes fuera de Docker)

---

## Variables de entorno y configuración

El archivo `.env.example` contiene todas las variables necesarias.  
Para ejecutar el proyecto se debe crear un archivo `.env` en la raíz con el siguiente contenido:

```
JWT_SECRET=secreto123
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=pedidos
DATABASE_URL=postgres://postgres:postgres@db:5432/pedidos
RABBITMQ_URL=amqp://rabbitmq
```

El archivo `init.sql` incluye las tablas necesarias y los datos iniciales (usuarios, productos, etc.).

---

## Cómo levantar el proyecto local

Ejecutar desde la carpeta raíz:

```
docker-compose up --build
```

Esto levanta todos los servicios necesarios.

### Puertos principales

| Servicio | URL o puerto                |
|----------|-----------------------------|
| Frontend   |   http://localhost:5173   |
| API REST   |   http://localhost:3000   |
| WebSocket Server | ws://localhost:3001 |
| RabbitMQ UI |  http://localhost:15672  |
| PostgreSQL |      localhost:5432       |
| Jaeger     | http://localhost:16686    |
| Grafana    |  http://localhost:3002    |
| Prometheus |   http://localhost:9090   |

El orden esperado es: Base de datos, RabbitMQ, API, Worker, WebSocket, Frontend, Servicios de observabilidad.

---

## Usuarios y credenciales de prueba

El sistema incluye usuarios creados automáticamente por `init.sql`.

|  Usuario | Contraseña |   Rol    |
|--------- |------------|----------|
| cliente1 | 1234       | Cliente  |
| cocina1  | 1234       |  Cocina  |

El login se realiza vía `/auth/login` y la API devuelve un token JWT.

---

## Cómo ejecutar pruebas

### Pruebas de API (Postman)

Dentro de `/docs` se incluye la colección:
```
postman_collection.json
```

Importarla en Postman para probar:
- Autenticación
- Listado de productos
- Creación de pedidos
- Confirmación de pedidos
- Endpoints protegidos

### Prueba de carga

El archivo se encuentra en `/tests/loadtest.yml`.

Ejecutar:

```
npx artillery run tests/loadtest.yml
```

El reporte HTML se genera automáticamente en:
```
tests/report.html
```

---

## Cómo observar el sistema

### Jaeger – Distributed Tracing

Disponible en:
```
http://localhost:16686
```

Servicios recomendados para inspección:
- api
- worker
- ws

Se recomienda observar:
- Trazas completas de extremo a extremo
- Latencia total
- Spans de cada servicio
- Propagación de contexto

### Grafana – Dashboards

Disponible en:
```
http://localhost:3002
```

Usuario: admin  
Contraseña: admin

Gráficos sugeridos para análisis:
- Latencia p95
- Throughput de solicitudes
- Error rate por servicio
- Métricas de RabbitMQ

### Prometheus

Disponible en:
```
http://localhost:9090
```

Consultas recomendadas:
```
http_requests_total
rabbitmq_queue_messages_ready
otel_span_metric
```

---

## Flujo asincrónico del sistema

1. El cliente crea un pedido desde el frontend o via Postman.
2. La API recibe el pedido y publica un mensaje en la cola `eventos_pedidos` en RabbitMQ.
3. El worker consume ese mensaje de la cola.
4. El worker procesa la información y envía una notificación mediante WebSocket.
5. El frontend recibe la actualización en tiempo real sin necesidad de refrescar la página.
6. El recorrido completo puede visualizarse en Jaeger.

Este flujo demuestra desacoplamiento, asincronía y comunicación basada en eventos.

---

## Integración y simulación de WebSocket

Para probar el WebSocket localmente se incluye el archivo:

```
ws-client.html
```

Este archivo permite conectarse al servidor WebSocket ejecutándose en:
```
ws://localhost:3001
```

Al crear o confirmar un pedido, los eventos se reciben automáticamente en este cliente.

También es posible simular un webhook externo utilizando un POST a la API que genere un nuevo evento.

---

## Limitaciones y mejoras futuras

- No se implementó paginación en las consultas.
- El sistema de WebSocket envía mensajes globales (se podría segmentar por sala o rol).
- El worker realiza procesamiento secuencial; puede ampliarse a procesamiento paralelo.
- Falta un dashboard personalizado en Grafana.
- Falta implementación de reintentos automáticos en fallos del worker.

---

## Tag y commit de la entrega

Se solicita entregar el proyecto etiquetado.

Comando recomendado:

```
git add .
git commit -m "Entrega TP IAEW v2.0.0"
git tag v2.0.0
```

---

## Archivo OpenAPI

La especificación de la API está en `openapi.yaml`, compatible con Swagger Editor, Postman o Stoplight.

---

## Documentación adicional

En la carpeta `/docs` se incluyen:
- Diagramas C4
- ADRs
- OpenAPI
- Colección Postman
- Archivos auxiliares

