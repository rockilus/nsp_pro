import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

# pylint: disable=unused-import
from integrations.authentication import authn_services  # noqa: F401
from integrations.authentication import authn_get_cors_headers, authn_get_middleware
from integrations.authorization import authz_services  # noqa: F401
from logger import log_middleware
from routes import (
    router_assignment,
    router_attribute,
    router_constraint,
    router_constraint_template,
    router_coverage,
    router_coverage_selector,
    router_dim_entry,
    router_dimension,
    router_health,
    router_objective_breach,
    router_request,
    router_schedule,
    router_shift,
    router_stats,
    router_team,
    router_user,
    router_worker,
)
from utils.env_config import API_DOMAIN, API_PORT, ORIGINS, UVICORN_RELOAD

app = FastAPI()


app.add_middleware(authn_get_middleware())

app.add_middleware(
    CORSMiddleware,
    # allow_origins=list(ORIGINS),
    allow_origins=ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "PUT", "POST", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type"] + authn_get_cors_headers(),
    # allow_headers=["*"] + authn_get_cors_headers(),
)
app.add_middleware(BaseHTTPMiddleware, dispatch=log_middleware)


app.include_router(router_assignment)
app.include_router(router_attribute)
app.include_router(router_constraint)
app.include_router(router_constraint_template)
app.include_router(router_coverage)
app.include_router(router_coverage_selector)
app.include_router(router_dim_entry)
app.include_router(router_dimension)
app.include_router(router_health)
app.include_router(router_objective_breach)
app.include_router(router_request)
app.include_router(router_schedule)
app.include_router(router_shift)
app.include_router(router_stats)
app.include_router(router_team)
app.include_router(router_user)
app.include_router(router_worker)


def run_router():
    uvicorn.run(
        "scripts.setup_router:app",
        host=API_DOMAIN,
        port=API_PORT,
        reload=UVICORN_RELOAD,
        access_log=False,
    )
