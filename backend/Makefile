# .PHONY: lint test check format

# format:
# 	poetry run isort .
# 	poetry run autoflake --remove-all-unused-imports --in-place --recursive .
# 	poetry run black \
# 		api_gateway/src \
# 		processing_engine/src \
# 		storage_service/src \
# 		shared

# lint:
# 	poetry run flake8 \
# 		api_gateway/src \
# 		processing_engine/src \
# 		storage_service/src \
# 		shared
# 	poetry run black --check \
# 		api_gateway/src \
# 		processing_engine/src \
# 		storage_service/src \
# 		shared
# 	poetry run pylint \
# 		api_gateway/src \
# 		processing_engine/src \
# 		storage_service/src \
# 		shared
# 	poetry run mypy \
# 		api_gateway/src \
# 		processing_engine/src \
# 		storage_service/src \
# 		shared

# test:
# 	# Assuming you have a test command similar to 'poetry run pytest' or similar
# 	TEST_MODE=1 poetry run pytest

# check: lint test

.PHONY: format check test api_gateway_check processing_engine_check storage_service_check

# Format code in all services
format: \
	api_gateway_format \
	processing_engine_format \
	storage_service_format \
	shared_format

api_gateway_format:
	@echo "Formatting code in api_gateway..."
	@cd api_gateway && \
	poetry run isort src && \
	poetry run autoflake --remove-all-unused-imports --in-place --recursive src && \
	poetry run black src

processing_engine_format:
	@echo "Formatting code in processing_engine..."
	@cd processing_engine && \
	poetry run isort src && \
	poetry run autoflake --remove-all-unused-imports --in-place --recursive src && \
	poetry run black src

storage_service_format:
	@echo "Formatting code in storage_service..."
	@cd storage_service && \
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
	processing_engine_check \
	storage_service_check \
	shared_check

# Run checks in api_gateway
api_gateway_check:
	@echo "Running checks in api_gateway..."
	@cd api_gateway && \
	poetry run flake8 src && \
	poetry run black --check src && \
	poetry run pylint src && \
	poetry run mypy src

# Run checks in processing_engine
processing_engine_check:
	@echo "Running checks in processing_engine..."
	@cd processing_engine && poetry run flake8 src && poetry run black --check src && poetry run pylint src && poetry run mypy src

# Run checks in storage_service
storage_service_check:
	@echo "Running checks in storage_service..."
	@cd storage_service && poetry run flake8 src && poetry run black --check src && poetry run pylint src && poetry run mypy src

# Run checks in shared
shared_check:
	@echo "Running checks in shared..."
	@cd shared && \
	poetry run flake8 . && \
	poetry run black --check . && \
	poetry run pylint . && \
	poetry run mypy .

# Run all tests
test: api_gateway_test processing_engine_test storage_service_test

# Run tests in api_gateway
api_gateway_test:
	@echo "Running tests in api_gateway..."
	@cd api_gateway && poetry run pytest tests

# Run tests in processing_engine
processing_engine_test:
	@echo "Running tests in processing_engine..."
	@cd processing_engine && poetry run pytest tests

# Run tests in storage_service
storage_service_test:
	@echo "Running tests in storage_service..."
	@cd storage_service && poetry run pytest tests