# 🍽️ TP IAEW – Sistema de Restaurante Distribuido

Este proyecto forma parte del **Trabajo Práctico Integrador de la materia Integración de Aplicaciones Empresariales y Web (IAEW)**.  
El objetivo es construir una **arquitectura distribuida** para la gestión de pedidos en un restaurante, aplicando buenas prácticas de integración, mensajería, resiliencia y observabilidad.

El sistema se basa en microservicios y componentes desacoplados que se comunican a través de colas de mensajes, permitiendo alta disponibilidad y tolerancia a fallos.

---

## 🧱 Arquitectura general

La arquitectura contempla los siguientes módulos principales:

| Módulo | Rol | Tecnología |
|--------|-----|-------------|
| **Frontend (Web SPA)** | Interfaz de usuario para mozos y cocina. |  |
| **API REST** | Expone endpoints RESTful para CRUD de productos y pedidos. | Node.js + Express |
| **Base de datos** | Almacena información de productos, pedidos e items. | PostgreSQL |
| **Broker de mensajería** | Coordina la comunicación asincrónica entre servicios (confirmación de pedidos, stock, notificaciones). | RabbitMQ |
| **Observabilidad** | Registra métricas, logs y trazas distribuidas. | OpenTelemetry + Prometheus + Grafana + Jaeger |

---

## 🚀 Ejecución local con Docker Compose

El proyecto incluye un **esqueleto de ejecución** que permite levantar todos los servicios base de forma local mediante Docker.  
Esto simplifica el desarrollo y evita dependencias manuales en la máquina del desarrollador.

### 🧩 Estructura del proyecto

TP_IAEW/
├─ docs/
│ ├─ openapi.yml # Contrato de API (OpenAPI 3.0.3)
│ └─ c4/ # Diagramas C4 (contexto, contenedor, componente)
│ └─ workspace.dsl
├─ src/
│ ├─ api/ # Código fuente del backend (pendiente)
│ └─ ...
├─ data/
│ └─ postgres/ # Volumen persistente de la base de datos
├─ docker-compose.yml # Orquestación base de servicios
└─ README.md # Este archivo



---

## 🧰 Requisitos previos

Antes de ejecutar el proyecto, asegurate de tener instalado:

- **Docker Desktop** (Windows/Mac) o Docker Engine (Linux)
- **Docker Compose v2.5+**
- **Puertos libres:**  
  - `8081` → API  
  - `5432` → PostgreSQL  
  - `15672` / `5672` → RabbitMQ (UI y broker)

---

## ⚙️ Pasos detallados de ejecución

### 1️⃣ Clonar el repositorio

git clone https://github.com/usuario/TP_IAEW.git
cd TP_IAEW

### 2️⃣ Iniciar los servicios base
docker compose up

### 3️⃣ Verificación de servicios

API placeholder (nginx):

http://localhost:8081

Base de datos:

psql -h localhost -U app -d restaurante

(Contraseña por defecto: app)

Broker RabbitMQ:

http://localhost:15672

Usuario: guest | Contraseña: guest


