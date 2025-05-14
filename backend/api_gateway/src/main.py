import uvicorn

from src.app import create_app
from src.config import config
from src.db import db_collections

# Create the FastAPI app with the database dependency
app = create_app(db_collections)  # Expose the app at the module level


def start_app() -> None:
    """
    Start the FastAPI application.
    """
    # Initialize the database
    # db_collections = setup_database()

    # Create the app with the database dependency
    # app = create_app(db_collections)

    # Run the app
    uvicorn.run(
        # app,
        "src.main:app",
        host=config.api_domain,
        port=config.api_port,
        reload=config.uvicorn_reload,
        access_log=False,
    )


if __name__ == "__main__":
    start_app()
