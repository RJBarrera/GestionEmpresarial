# syntax=docker/dockerfile:1

# Compilar React + Vite
FROM node:22-alpine AS frontend-build
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund
COPY frontend/ ./
ENV VITE_API_URL=/api
RUN npm run build

# Backend FastAPI
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1


WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./
COPY --from=frontend-build \
    /build/frontend/dist /app/frontend/dist

# Servir React y FastAPI en un mismo puerto
RUN cat > server.py <<'PY'
import os
from pathlib import Path
import uvicorn
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from app.main import app

DIST = Path("/app/frontend/dist").resolve()

app.mount(
    "/assets",
    StaticFiles(directory=DIST / "assets"),
    name="assets",
)

@app.get("/{path:path}", include_in_schema=False)
async def frontend(path: str):
    target = (DIST / path).resolve()

    if target.is_relative_to(DIST) and target.is_file():
        return FileResponse(target)

    return FileResponse(DIST / "index.html")

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
    )
PY

RUN useradd --create-home appuser
USER appuser

EXPOSE 8000

CMD ["sh", "-c", "python -m app.init_db && exec python server.py"]