# 🧠 Arquitectural Decision Records (ADRs) — TP IAEW 2025

---

## ADR-001 — Estilo de comunicación: **REST vs gRPC**

**Contexto:**  
Era necesario definir el protocolo de comunicación principal entre el cliente, la API y otros servicios. Las opciones eran **REST (HTTP/JSON)** o **gRPC (HTTP/2 + Protobuf)**.

**Decisión:**  
Se adopta **REST** como estilo principal de comunicación entre frontend y backend.

**Justificación:**  
- Simplicidad y compatibilidad con Postman, navegadores y herramientas estándar.  
- Los endpoints pueden documentarse fácilmente en **OpenAPI 3.1**.  
- Suficiente para operaciones CRUD y consultas HTTP síncronas.

**Consecuencias:**  
- Comunicación más lenta que gRPC en alto volumen, pero más fácil de probar.  
- Se reserva gRPC solo para futuras integraciones externas si fuera necesario.

---

## ADR-002 — Integración asincrónica: **RabbitMQ vs Kafka**

**Contexto:**  
El trabajo exige un flujo **productor → broker → consumidor**, para manejar eventos y procesos diferidos.

**Decisión:**  
Se elige **RabbitMQ** como **broker AMQP**.

**Justificación:**  
- Más simple de configurar y contenerizar con Docker Compose.  
- Ideal para colas de trabajo pequeñas y delivery garantizado.  
- Permite un **exchange “pedidos.events”** con routing keys (`pedido.confirmado`, etc.)  
- Se integra naturalmente con **Node.js (amqplib)** y el microservicio Worker.

**Consecuencias:**  
- Mayor facilidad de implementación que Kafka, aunque con menor throughput.  
- Los mensajes deben ser idempotentes para evitar duplicados.  
- Se implementarán patrones de resiliencia (Retry y Circuit Breaker) sobre los consumidores.

---

## ADR-003 — Persistencia: **SQL vs NoSQL**

**Contexto:**  
El dominio (pedidos y productos) requiere integridad transaccional, relaciones y consultas estructuradas.

**Decisión:**  
Se selecciona **PostgreSQL (SQL relacional)**.

**Justificación:**  
- Soporte ACID, adecuado para operaciones con estados de pedido y stock.  
- Amplia compatibilidad con ORM y librerías de Node.js.  
- Migraciones reproducibles con **scripts SQL o herramientas tipo Knex/Prisma**.

**Consecuencias:**  
- Escalado horizontal limitado, pero suficiente para la escala del trabajo.  
- Permite auditoría y trazabilidad de cambios.

---

## ADR-004 — Seguridad: **OAuth2 + JWT**

**Contexto:**  
La consigna exige seguridad mediante **OAuth2 + JWT**, con roles o scopes básicos.

**Decisión:**  
Se implementa autenticación **JWT (JSON Web Token)** firmada con secreto HMAC.

**Justificación:**  
- Compatible con flujos OAuth2 simplificados.  
- Permite definir **roles (mozo, cocina, admin)** y expiración de tokens.  
- Ligero y fácil de verificar en múltiples servicios (API, WS).

**Consecuencias:**  
- Los tokens deben tener expiración corta (1h) y refrescarse en el frontend.  
- Los endpoints de pedidos y productos validarán el `Authorization: Bearer <token>`.

---

## ADR-005 — Integración en tiempo real: **WebSocket**

**Contexto:**  
La aplicación requiere un mecanismo para notificar al cliente sobre el estado del pedido.

**Decisión:**  
Se adopta **WebSocket (WS)** para comunicación bidireccional en tiempo real.

**Justificación:**  
- Cumple el requisito de “suscripción/stream en tiempo real”.  
- Permite que la cocina confirme pedidos y el frontend reciba actualizaciones sin polling.  
- Integración directa con RabbitMQ mediante el microservicio `ws-notifier`.

**Consecuencias:**  
- Requiere manejar reconexión y control de sesiones.  
- Facilita una experiencia más fluida y moderna en el cliente web.

---

## ADR-006 — Contenerización y despliegue

**Contexto:**  
El proyecto exige levantar todo localmente con **Docker Compose** (API, DB, broker, WS, worker).

**Decisión:**  
Se define un entorno **multi-servicio** con imágenes `node:18-alpine`, `postgres:16` y `rabbitmq:3-management`.

**Justificación:**  
- Aisla dependencias y simplifica la configuración de cada servicio.  
- Permite recrear entornos fácilmente con `docker compose up -d`.  
- Cumple el requerimiento de entrega con tag `v1.0.0` y hash visible en el README.

**Consecuencias:**  
- Los servicios se comunican por red interna Docker (`restaurante-network`).  
- Cada servicio tiene su propio volumen para persistencia o dependencias (`*_node_modules`, `pgdata`).

---
## ADR-007 — Observabilidad y monitoreo

**Contexto:**  
Era necesario definir una estrategia de observabilidad que permitiera rastrear, medir y depurar el comportamiento de los microservicios (API, Worker, WS).  
El proyecto exige incluir **logs estructurados (JSON)** y un **dashboard de monitoreo**, permitiendo detectar fallas y analizar flujos asincrónicos entre servicios.

**Decisión:**  
Se adopta un stack de observabilidad basado en **OpenTelemetry + Collector + Jaeger + Prometheus + Grafana**, junto con **logs JSON gestionados con la librería Pino** en los servicios Node.js.

**Justificación:**  
- **OpenTelemetry** se utiliza en cada microservicio (API, WS, Worker) para recolectar métricas, logs y trazas distribuidas.  
- **Collector** centraliza toda la información proveniente de los servicios y la distribuye a los backends de observación.  
- **Jaeger** permite visualizar las *trazas distribuidas* del sistema, siguiendo una petición desde la API, pasando por RabbitMQ y hasta el Worker.  
- **Prometheus** recolecta métricas numéricas (rendimiento, tiempos de respuesta, cantidad de mensajes, colas, etc.).  
- **Grafana** consolida toda la información proveniente de Jaeger y Prometheus en dashboards visuales.  
- **Pino** genera logs estructurados en formato JSON (`timestamp`, `nivel`, `servicio`, `mensaje`, `contexto`), legibles por el Collector.

**Consecuencias:**  
- Se obtiene una visión completa del comportamiento entre los servicios.  
- Permite correlacionar logs, métricas y trazas en un mismo evento (por ejemplo, un pedido confirmado).  
- Mejora la detección de errores y cuellos de botella en procesos asincrónicos.  
- Incrementa la complejidad del entorno Docker, pero otorga alta trazabilidad.  

---

### 🔗 Relación entre componentes de observabilidad y servicios del sistema

| Componente | Qué observa | Se integra con | Propósito |
|-------------|-------------|----------------|------------|
| **Pino (Node.js)** | API, WS, Worker | OpenTelemetry Collector | Genera logs estructurados JSON por cada acción o evento (peticiones HTTP, mensajes RabbitMQ, etc.). |
| **OpenTelemetry SDK** | API, WS, Worker | Collector, Jaeger, Prometheus | Captura trazas (spans), métricas y logs desde cada servicio. |
| **OpenTelemetry Collector** | Todos los servicios | Jaeger, Prometheus, Grafana | Centraliza la información proveniente de los SDKs y la reenvía a las herramientas de monitoreo. |
| **Jaeger** | API → RabbitMQ → Worker → WS | Collector | Permite visualizar la traza completa del ciclo de vida de un pedido y detectar demoras o fallos entre servicios. |
| **Prometheus** | API, DB, RabbitMQ, Worker | Grafana | Recolecta métricas (CPU, latencia, cantidad de pedidos, colas activas, errores, etc.). |
| **Grafana** | Prometheus, Jaeger | — | Muestra dashboards con métricas, logs y trazas en un panel unificado. |

---

### 🧠 Ejemplo de flujo de observabilidad en el proyecto

1. **El mozo crea un pedido desde el frontend (API → DB).**  
   - Pino registra un log JSON: `"POST /pedidos", status=201, servicio=api`.  
   - OpenTelemetry marca un *span* con el tiempo de respuesta de la API.  

2. **La API envía un evento al broker RabbitMQ.**  
   - El mensaje genera otro *span* que viaja al Worker (traza distribuida).  

3. **El Worker procesa el pedido y lo confirma.**  
   - Pino registra: `"pedido.confirmado", servicio=worker`.  
   - OpenTelemetry mide cuánto tardó desde el evento inicial.  

4. **El WS notifica al cliente por WebSocket.**  
   - Pino registra `"WS notification sent"`.  
   - La traza completa se puede ver en **Jaeger** como una secuencia API → RabbitMQ → Worker → WS.  

5. **Prometheus actualiza métricas** como:
   - `http_requests_total{service="api"}`
   - `rabbitmq_queue_length`
   - `orders_processed_total{service="worker"}`

6. **Grafana** muestra todo junto en dashboards de:
   - Latencia promedio por servicio.
   - Cantidad de pedidos confirmados.
   - Logs de errores filtrados por servicio.
   - Trazas distribuidas de pedidos lentos (desde Jaeger).

---

# ADR-008 — Frontend con **React**

## Contexto
Se requiere un frontend web sencillo para gestionar **productos** y **pedidos**, consumir la **API REST** documentada en OpenAPI y suscribirse a eventos en **WebSocket**.

## Decisión
Implementar el frontend con **React**, utilizando una plantilla básica.
- Librerías clave:  
  - **Axios** para HTTP.  
  - **React Query** (TanStack Query) para cache de datos.  
- **WebSocket nativo** para recibir `pedido.confirmado`.

## Justificación
- **Conocido por el equipo**: React es estándar en el stack JS y baja la curva de aprendizaje.  
- **Integración directa**: consumo de API REST (OpenAPI) y WS sin tooling extra.  
- **Docker friendly**: build estático servible con Nginx.  
- **Productividad**: ecosistema maduro (UI libs, React Query, etc.).


