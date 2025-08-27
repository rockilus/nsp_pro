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

CMD ["poetry", "run", "python", "src/main.py"]




