FROM python:3.12-slim

WORKDIR /app
COPY storage_service .
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

CMD ["poetry", "run", "python", "src/worker.py"]





# syntax=docker/dockerfile:1
# FROM python:3.12-bookworm
# WORKDIR /backend
# RUN apt-get update && apt-get install -y \
#     build-essential \
#     python3-dev \
#     git \
#     libffi-dev \
#     curl
# RUN pip3 install pipx
# RUN pipx install poetry
# ENV PATH="/root/.local/bin:$PATH"
# COPY poetry.lock pyproject.toml /backend/
# RUN /root/.local/bin/poetry lock
# RUN /root/.local/bin/poetry install
# EXPOSE 5000
# COPY . .
# CMD ["/root/.local/bin/poetry", "run", "python", "src/main.py"]


