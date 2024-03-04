# from scripts.setup_database import db, user_db
import scripts.setup_database  # noqa: F401
from scripts.setup_router import run_router


def run_app() -> None:
    run_router()
