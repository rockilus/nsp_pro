# pylint: disable=unused-import
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_middleware
from starlette.middleware.base import BaseHTTPMiddleware

from src.config import config

# pylint: disable=unused-import
from src.integrations.authentication import authn_services  # noqa: F401
from src.integrations.authentication import (
    authn_get_cors_headers,
    authn_get_middleware,
)
from src.integrations.authorization import authz_services  # noqa: F401
from src.routes import (
    router_assignment,
    router_attribute,
    router_breach,
    router_constraint,
    router_constraint_template,
    router_coverage,
    router_dashboard,
    router_dim_entry,
    router_dimension,
    router_export,
    router_health,
    router_link_shift,
    router_multitasking,
    router_request,
    router_schedule,
    router_shift,
    router_shift_demand,
    router_shift_demand_new,
    router_shift_demand_template,
    router_specialty,
    router_sqs_solve,
    router_sse,
    router_stats,
    router_team,
    router_team_invitation,
    router_user,
    router_worker,
)


def create_app(db_collections: DatabaseCollections) -> FastAPI:
    app = FastAPI()

    app.add_middleware(authn_get_middleware())

    app.add_middleware(
        CORSMiddleware,
        # allow_origins=list(ORIGINS),
        allow_origins=config.origins,
        allow_credentials=True,
        allow_methods=["GET", "PUT", "POST", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["Content-Type"] + authn_get_cors_headers(),
        # allow_headers=["*"] + authn_get_cors_headers(),
    )
    if config.environment == "development":
        app.add_middleware(BaseHTTPMiddleware, dispatch=log_middleware)

    app.include_router(router_assignment)
    app.include_router(router_attribute)
    app.include_router(router_constraint)
    app.include_router(router_constraint_template)
    app.include_router(router_coverage)
    app.include_router(router_dashboard)
    app.include_router(router_dim_entry)
    app.include_router(router_dimension)
    app.include_router(router_export)
    app.include_router(router_health)
    app.include_router(router_link_shift)
    app.include_router(router_multitasking)
    app.include_router(router_breach)
    app.include_router(router_request)
    app.include_router(router_schedule)
    app.include_router(router_shift)
    app.include_router(router_shift_demand)
    app.include_router(router_shift_demand_new)
    app.include_router(router_shift_demand_template)
    app.include_router(router_specialty)
    app.include_router(router_sse)
    app.include_router(router_sqs_solve)
    app.include_router(router_stats)
    app.include_router(router_team)
    app.include_router(router_team_invitation)
    app.include_router(router_user)
    app.include_router(router_worker)

    app.state.db_collections = db_collections

    return app
