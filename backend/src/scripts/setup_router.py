import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import (
    router_assignment,
    router_constraint,
    router_constraint_template,
    router_coverage,
    router_coverage_selector,
    router_fixed_assignment,
    router_objective_breach,
    router_request,
    router_schedule,
    router_shift,
    router_shift_dimension,
    router_stats_options,
    router_team,
    router_user,
    router_worker,
    router_worker_dimension,
)

# pylint: disable=unused-import
from services.authentication import authn_services  # noqa: F401
from services.authentication.authn_services import (
    authn_get_cors_headers,
    authn_get_middleware,
)
from services.authorization import authz_services  # noqa: F401
from utils.constants import Constants

app = FastAPI()

# CORS
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",  # Add other origins if needed
]

app.add_middleware(authn_get_middleware())

app.add_middleware(
    CORSMiddleware,
    allow_origins=[Constants.BASE_URL + ":" + str(Constants.WEBSITE_PORT)],
    allow_credentials=True,
    allow_methods=["GET", "PUT", "POST", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type"] + authn_get_cors_headers(),
)

app.include_router(router_assignment)
app.include_router(router_constraint)
app.include_router(router_constraint_template)
app.include_router(router_coverage)
app.include_router(router_coverage_selector)
app.include_router(router_fixed_assignment)
app.include_router(router_objective_breach)
app.include_router(router_request)
app.include_router(router_schedule)
app.include_router(router_shift)
app.include_router(router_shift_dimension)
app.include_router(router_stats_options)
app.include_router(router_team)
app.include_router(router_user)
app.include_router(router_worker)
app.include_router(router_worker_dimension)


def run_router():
    uvicorn.run(
        "scripts.setup_router:app",
        host=Constants.HOST,
        port=Constants.API_PORT,
        reload=True,
    )
