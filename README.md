# Gestión Empresarial — MVP (React + FastAPI + PostgreSQL)

Sistema inicial para administrar inventario, clientes, vendedores, ventas, gastos y reportes. Nombre provisional, fácilmente reemplazable.

## Tecnologías

- Frontend: React (JSX) + Vite + React Router + Recharts + CSS.
- Backend: Python 3.11+ + FastAPI + SQLAlchemy 2 + Pydantic 2.
- Base de datos: PostgreSQL + controlador psycopg 3.
- Moneda: MXN (por ahora); las fechas de operación se registran explícitamente.

## Arranque local (Windows / macOS / Linux)

**Requisitos:** Python 3.11+, Node.js 20.19+ o 22.12+, npm, y PostgreSQL (puede usarse Docker).

### 1. PostgreSQL

En el directorio raíz:

```bash
docker compose up -d
```

Esto levanta PostgreSQL en `localhost:5432`, con base `gestion_empresa`, usuario `gestion` y contraseña `gestion` **solo para desarrollo**. Alternativamente, crea tu BD PostgreSQL manualmente (local o Railway) y configura `DATABASE_URL`. **Nunca uses la contraseña del ejemplo en producción.**

### 2. Backend

Desde `backend/`:

Crear y activar el entorno virtual:

```bash
python -m venv .venv
```

Activar el entorno virtual:

- Windows (CMD):
  ```cmd
  .venv\Scripts\activate.bat
  ```
- Windows (PowerShell):
  ```powershell
  .\.venv\Scripts\Activate.ps1
  ```
- macOS / Linux:
  ```bash
  source .venv/bin/activate
  ```

Para desactivar el entorno virtual en cualquier terminal:

```bash
deactivate
```

```bash
python -m venv .venv
```

Activar el entorno:

- Windows (PowerShell): `.venv\Scripts\Activate.ps1`
- macOS / Linux: `source .venv/bin/activate`

Instalar, configurar y crear esquema de desarrollo:

```bash
pip install -r requirements.txt
```

Copia `backend/.env.example` como `backend/.env` y reemplaza `DATABASE_URL` según tu servidor. Para Railway utiliza su `DATABASE_URL`, adaptada a `postgresql+psycopg://...`. Si el servicio exige SSL, agrega `?sslmode=require`.

```bash
python -m app.init_db
uvicorn app.main:app --reload
```

- API: http://localhost:8000
- Documentación interactiva: http://localhost:8000/docs
- Estado de API: http://localhost:8000/health

### 3. Frontend

En otra terminal, desde `frontend/`:

```bash
npm install
npm run dev
```

Abre http://localhost:5173. Opcionalmente copia `frontend/.env.example` como `frontend/.env` para configurar otra URL del backend.

### 4. Primer uso

1. Registra al menos un **producto**, indicando SKU, costo, precio de venta y stock.
2. Registra un **cliente** y un **vendedor**.
3. En **Ventas**, registra una operación con uno o varios productos.
4. Verifica que se descuenten las existencias.
5. Registra gastos operativos en **Gastos**.
6. Consulta resultados por periodo en **Dashboard** y filtra/exporta datos en **Reportes**.

## Reglas comerciales actuales

- Venta completada: se guarda con cliente, vendedor, fecha, productos, cantidades, precios unitarios y costos unitarios históricos; se reduce el stock dentro de una misma transacción.
- Inventario insuficiente: se rechaza la venta completa, sin movimientos parciales. En PostgreSQL se bloquea cada fila afectada para evitar sobreventas concurrentes.
- Anulación de venta: se marca como anulada, se restituye el stock y deja de contar en ingresos/resultados; su historial no se elimina.
- Baja de producto, cliente o vendedor: **desactivación lógica**, con opción de mostrar y reactivar registros inactivos; no se borran referencias de operaciones previas.
- Dashboard (según fecha de venta o gasto):
  - **Ingresos**: suma de ventas completadas.
  - **Costo de productos vendidos**: suma de los costos unitarios almacenados en las líneas de venta.
  - **Utilidad bruta**: ingresos − costo de productos vendidos.
  - **Utilidad neta estimada**: utilidad bruta − gastos operativos.
- Los ingresos representan **ventas registradas**, no necesariamente pagos cobrados. No incluye impuestos, devoluciones parciales, comisiones, compras/reabastecimientos ni cuentas por cobrar.
- Los gastos operativos **no deben incluir nuevamente** el costo de mercancía vendida; de lo contrario, se duplicaría el costo.
- Los reportes de ventas están limitados a 2,000 registros por consulta, y el historial principal a 500 (paginación pendiente).

## Estructura

```text
gestion-empresarial/
├── docker-compose.yml
├── backend/
│   ├── .env.example
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── init_db.py
│   │   └── routers/
│   │       ├── catalogs.py
│   │       ├── sales.py
│   │       ├── expenses.py
│   │       └── analytics.py
│   └── tests/
└── frontend/
    ├── package.json
    ├── src/
    │   ├── App.jsx
    │   ├── api.js
    │   ├── styles.css
    │   ├── components/
    │   └── pages/
    └── .env.example
```

## Seguridad y preparación para producción

**Este proyecto es un prototipo funcional de desarrollo local. No debes exponerlo públicamente ni registrar datos personales reales sin protegerlo.** Actualmente la API no incluye inicio de sesión ni autorización. Antes de usarlo en un negocio real, incorporar:

1. Autenticación, contraseñas con hash seguro, perfiles y permisos (administrador, vendedor, consulta).
2. Migraciones Alembic y respaldos automáticos de PostgreSQL.
3. Auditoría de movimientos de inventario, ventas y cambios financieros.
4. Pruebas de integración contra PostgreSQL, manejo de impuestos y facturación según alcance.
5. Paginación, validación de límites, reportes de ingresos cobrados, devolución parcial y métodos de pago.
6. HTTPS, secretos privados, política de acceso CORS por dominio, logging y monitoreo.

Las tablas se crean de forma **explícita** con `python -m app.init_db`, no al iniciar la API. No se incluyen datos de prueba ni se alteran registros históricos automáticamente.
