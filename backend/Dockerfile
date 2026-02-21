FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/src

WORKDIR /app

# Install uv via pip (evita dependência de ghcr.io)
RUN pip install --no-cache-dir uv

# Install native build tools for python packages like bcrypt
RUN apt-get update && apt-get install -y \
    build-essential \
    libffi-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy project files
COPY pyproject.toml ./
COPY src/ ./src/

# Install dependencies (resolve + install)
RUN uv sync --no-dev

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "gestaodecomunicados.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--reload-dir", "/app/src"]
