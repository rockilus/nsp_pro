# from scripts.setup_database import db, user_db
from scripts.setup_router import run_router


def run_app() -> None:
    run_router()
