FROM python:3.14-slim

# Install `uv`
# The installer requires curl (and certificates) to download the release archive
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates
# Download the latest installer
ADD https://astral.sh/uv/install.sh /uv-installer.sh
# Run the installer then remove it
RUN sh /uv-installer.sh && rm /uv-installer.sh
# Ensure the installed binary is on the `PATH`
ENV PATH="/root/.local/bin/:$PATH"


WORKDIR /app
COPY solve_service .
COPY shared /shared

WORKDIR /shared
# Install shared dependencies using `uv` (reads backend/shared/uv.lock)
RUN uv sync --locked

WORKDIR /app
# Install service dependencies using `uv` (reads uv.lock in this folder)
RUN uv sync --locked

CMD ["uv", "run", "python", "src/main.py"]




