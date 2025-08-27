FROM python:3.12-slim

WORKDIR /app
COPY solve_service .
COPY shared /shared

RUN apt-get update && apt-get install -y \
    build-essential \
    python3-dev \
    git \
    libffi-dev \
    curl
RUN pip install poetry

WORKDIR /shared
RUN poetry build

WORKDIR /app
RUN poetry install

# Expose health check port
EXPOSE 8080

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

CMD ["poetry", "run", "python", "src/main.py"]




