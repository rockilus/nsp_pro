.PHONY: lint test check

lint:
	poetry run flake8 src
	poetry run black --check src
	poetry run pylint src
	poetry run mypy src

test:
	# Assuming you have a test command similar to 'poetry run pytest' or similar
	poetry run pytest

check: lint test