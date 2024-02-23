import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from supertokens_python import get_all_cors_headers, init
from supertokens_python.framework.fastapi import get_middleware

from config import config
from routes import (
    router_assignment,
    router_authentication,
    router_constraint,
    router_constraint_template,
    router_coverage,
    router_coverage_selector,
    router_fixed_assignment,
    router_objective_breach,
    router_permission,
    router_request,
    router_role,
    router_schedule,
    router_shift,
    router_shift_dimension,
    router_stats_options,
    router_user,
    router_worker,
    router_worker_dimension,
)
from utils.constants import Constants

# from permit.sync import Permit

# permit = Permit(Permit(pdp=Constants.PDP_URL, token=Constants.PERMIT_API_KEY))
# from starlette.middleware.cors import CORSMiddleware

init(
    supertokens_config=config.supertokens_config,
    app_info=config.app_info,
    framework=config.framework,  # type: ignore
    recipe_list=config.recipe_list,
    mode="asgi",
)


app = FastAPI()

# CORS
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",  # Add other origins if needed
]

app.add_middleware(get_middleware())

app.add_middleware(
    CORSMiddleware,
    allow_origins=[config.app_info.website_domain],
    allow_credentials=True,
    allow_methods=["GET", "PUT", "POST", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type"] + get_all_cors_headers(),
)
# What we had before
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=origins,
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# app.include_router(router_coverage, prefix="/api/v1", tags=["coverage"])

app.include_router(router_assignment)
app.include_router(router_authentication)
app.include_router(router_user)
app.include_router(router_constraint)
app.include_router(router_constraint_template)
app.include_router(router_coverage)
app.include_router(router_coverage_selector)
app.include_router(router_fixed_assignment)
app.include_router(router_objective_breach)
app.include_router(router_permission)
app.include_router(router_request)
app.include_router(router_role)
app.include_router(router_schedule)
app.include_router(router_shift)
app.include_router(router_shift_dimension)
app.include_router(router_stats_options)
app.include_router(router_worker)
app.include_router(router_worker_dimension)


def run_router():
    uvicorn.run(
        "scripts.setup_router:app",
        host=Constants.HOST,
        port=Constants.API_PORT,
        reload=True,
    )
