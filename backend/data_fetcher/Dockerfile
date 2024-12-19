FROM python:3.12-slim

WORKDIR /app
COPY data_fetcher .
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

EXPOSE 8000

CMD ["poetry", "run", "python", "src/worker.py"]




