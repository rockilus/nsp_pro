.PHONY: format check test api_gateway_check solve_service_check shared_check

# Format code in all services
format: \
	api_gateway_format \
	solve_service_format \
	shared_format

api_gateway_format:
	@echo "Formatting code in api_gateway..."
	@cd api_gateway && \
	poetry run isort src && \
	poetry run autoflake --remove-all-unused-imports --in-place --recursive src && \
	poetry run black src

solve_service_format:
	@echo "Formatting code in solve_service..."
	@cd solve_service && \
	poetry run isort src && \
	poetry run autoflake --remove-all-unused-imports --in-place --recursive src && \
	poetry run black src

shared_format:
	@echo "Formatting code in shared..."
	@cd shared && \
	poetry run isort src && \
	poetry run autoflake --remove-all-unused-imports --in-place --recursive src && \
	poetry run black src

# Run all checks
check: \
	api_gateway_check \
	solve_service_check \
	shared_check

check_no_test: \
	api_gateway_check \
	solve_service_check_no_test \
	shared_check_no_test

# Run checks in api_gateway
api_gateway_check:
	@echo "Running checks in api_gateway..."
	@cd api_gateway && \
	poetry run flake8 src && \
	poetry run black --check src && \
	poetry run pylint src && \
	poetry run mypy src

# Run checks in solve_service
solve_service_check:
	@echo "Running checks in solve_service..."
	@cd solve_service && \
	poetry run flake8 src && \
	poetry run black --check src && \
	poetry run pylint src && \
	poetry run mypy src && \
	export PYTEST_RUNNING="true" && \
	poetry run pytest

solve_service_check_no_test:
	@echo "Running checks in solve_service..."
	@cd solve_service && \
	poetry run flake8 src && \
	poetry run black --check src && \
	poetry run pylint src && \
	poetry run mypy src

# Run checks in shared
shared_check:
	@echo "Running checks in shared..."
	@cd shared && \
	poetry run flake8 src && \
	poetry run black --check src && \
	poetry run pylint src && \
	poetry run mypy src && \
	poetry run pytest

shared_check_no_test:
	@echo "Running checks in shared..."
	@cd shared && \
	poetry run flake8 src && \
	poetry run black --check src && \
	poetry run pylint src && \
	poetry run mypy src

# Run all tests
test: api_gateway_test solve_service_test shared_test

# Run tests in api_gateway
api_gateway_test:
	@echo "Running tests in api_gateway..."
	@cd api_gateway && poetry run pytest tests

# Run tests in solve_service
solve_service_test:
	@echo "Running tests in solve_service..."
	@cd solve_service && poetry run pytest tests

# Run tests in shared
shared_test:
	@echo "Running tests in shared..."
	@cd shared && poetry run pytest tests