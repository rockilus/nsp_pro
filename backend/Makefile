.PHONY: lint

lint:
	poetry run flake8 src
	poetry run black --check src
	poetry run pylint src
	poetry run mypy src
