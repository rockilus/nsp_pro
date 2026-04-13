from typing import Any, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_middleware
from starlette.middleware.base import BaseHTTPMiddleware

from src.config import config

from src.routes import (
    router_admin,
    router_assignment,
    router_attribute,
    router_breach,
    router_constraint,
    router_constraint_template,
    router_dim_entry,
    router_dimension,
    router_export,
    router_health,
    router_link_shift,
    router_multitasking,
    router_notification,
    router_notification_preferences,
    router_request,
    router_schedule,
    router_shift,
    router_shift_demand_new,
    router_shift_demand_template,
    router_specialty,
    router_sqs_solve,
    router_stats,
    router_swap,
    router_team,
    router_team_invitation,
    router_test_utils,
    router_user,
    router_worker,
)


def create_app(
    db_collections: Optional[DatabaseCollections] = None,
    lifespan: Optional[Any] = None,
) -> FastAPI:
    """Create FastAPI application with proper dependency injection."""

    # Create app with lifespan manager if provided
    if lifespan:
        app = FastAPI(lifespan=lifespan)
    else:
        app = FastAPI()

    # Configure CORS
    allowed_headers = ["Content-Type"]
    if config.environment == "development":
        allowed_headers.extend(["x-dev-user-id", "x-api-key", "x-impersonation-token"])

    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.origins,
        allow_credentials=True,
        allow_methods=["GET", "PUT", "POST", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=allowed_headers,
    )

    # Add logging middleware for development
    if config.environment == "development":
        app.add_middleware(BaseHTTPMiddleware, dispatch=log_middleware)

    # Include all routers
    routers = [
        router_admin,
        router_assignment,
        router_attribute,
        router_breach,
        router_constraint,
        router_constraint_template,
        router_dim_entry,
        router_dimension,
        router_export,
        router_health,
        router_link_shift,
        router_multitasking,
        router_notification,
        router_notification_preferences,
        router_request,
        router_schedule,
        router_shift,
        router_shift_demand_new,
        router_shift_demand_template,
        router_specialty,
        router_sqs_solve,
        router_stats,
        router_swap,
        router_team,
        router_team_invitation,
        router_test_utils,
        router_user,
        router_worker,
    ]

    for router in routers:
        app.include_router(router)

    # Set database collections if provided
    if db_collections:
        app.state.db_collections = db_collections

    return app
