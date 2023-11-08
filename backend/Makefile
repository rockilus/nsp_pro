.PHONY: lint test check format

format:
	poetry run isort .
	poetry run autoflake --remove-all-unused-imports --in-place --recursive .
	poetry run black src

lint:
	poetry run flake8 src
	poetry run black --check src
	poetry run pylint src
	poetry run mypy src

test:
	# Assuming you have a test command similar to 'poetry run pytest' or similar
	TEST_MODE=1 poetry run pytest

check: lint test