# pylint: disable=unused-import
import scripts.setup_database  # noqa: F401
from scripts.setup_router import run_router


def run_app() -> None:
    run_router()
