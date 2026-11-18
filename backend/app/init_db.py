"""Inicialización explícita para desarrollo. En producción usar migraciones Alembic."""
from .database import Base, engine
from . import models  # noqa: F401 - registra tablas

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    print("Tablas creadas/verificadas en PostgreSQL.")
