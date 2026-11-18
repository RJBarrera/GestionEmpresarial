import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import DATABASE_URL
from .routers import catalogs, sales, expenses, analytics

app = FastAPI(title="Gestión Empresarial API", version="0.1.0")
origins = [value.strip() for value in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if value.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=False, allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"], allow_headers=["Content-Type", "Authorization"])
app.include_router(catalogs.router, prefix="/api")
app.include_router(sales.router, prefix="/api")
app.include_router(expenses.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}
