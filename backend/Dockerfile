# syntax=docker/dockerfile:1
FROM python:3.12-bookworm
WORKDIR /backend
RUN apt-get update && apt-get install -y \
    build-essential \
    python3-dev \
    git \
    libffi-dev \
    curl
RUN pip3 install pipx
RUN pipx install poetry
ENV PATH="$HOME/.local/bin:$PATH"
COPY poetry.lock pyproject.toml /backend/
RUN /root/.local/bin/poetry lock
RUN /root/.local/bin/poetry install
EXPOSE 5000
COPY . .
CMD ["/root/.local/bin/poetry", "run", "python", "src/main.py"]
# CMD ["poetry run", "src/main.py"]
# CMD ["python3", "src/main.py"]



# Bullseye (poetry installation does not work)
# # syntax=docker/dockerfile:1
# FROM python:3.11-bullseye
# WORKDIR /backend
# RUN apt-get update && apt-get install -y \
#     build-essential \
#     python3-dev \
#     git \
#     libffi-dev \
#     curl
# RUN curl -sSL https://install.python-poetry.org | python3 -
# RUN echo 'export PATH="$HOME/.local/bin:$PATH"' >> $HOME/.zshrc
# COPY poetry.lock pyproject.toml /backend/
# RUN /root/.poetry/bin/poetry install -vvv
# EXPOSE 5000
# COPY . .
# CMD ["python3", "main.py"]





# Alpine Linux (ortools does not work)
# # syntax=docker/dockerfile:1
# FROM python:3.11-alpine
# WORKDIR /backend
# RUN apk add --no-cache gcc musl-dev linux-headers
# RUN apk add --no-cache build-base python3-dev git
# RUN apk add --no-cache poetry
# RUN apk add --no-cache libffi-dev
# COPY poetry.lock pyproject.toml /backend/
# RUN poetry install -vvv
# EXPOSE 5000
# COPY . .
# CMD ["python3", "main.py"]

# FROM python:3.11.5-slim-bookworm

# ARG YOUR_ENV

# ENV YOUR_ENV=${YOUR_ENV} \
#   PYTHONFAULTHANDLER=1 \
#   PYTHONUNBUFFERED=1 \
#   PYTHONHASHSEED=random \
#   PIP_NO_CACHE_DIR=off \
#   PIP_DISABLE_PIP_VERSION_CHECK=on \
#   PIP_DEFAULT_TIMEOUT=100 \
#   # Poetry's configuration:
#   POETRY_NO_INTERACTION=1 \
#   POETRY_VIRTUALENVS_CREATE=false \
#   POETRY_CACHE_DIR='/var/cache/pypoetry' \
#   POETRY_HOME='/usr/local'
#   POETRY_VERSION=1.7.1
#   # ^^^
#   # Make sure to update it!

# # System deps:
# RUN curl -sSL https://install.python-poetry.org | python3 -

# # Copy only requirements to cache them in docker layer
# WORKDIR /code
# COPY poetry.lock pyproject.toml /code/

# # Project initialization:
# RUN poetry install $(test "$YOUR_ENV" == production && echo "--only=main") --no-interaction --no-ansi

# # Creating folders, and files for a project:
# COPY . /code