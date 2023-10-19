import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import (
    router_constraint,
    router_constraint_param,
    router_coverage,
    router_coverage_selector,
    router_fixed_assignment,
    router_request,
    router_schedule,
    router_shift,
    router_shift_dimension,
    router_worker,
    router_worker_dimension,
)

app = FastAPI()

# CORS
origins = [
    "http://localhost:3000",  # Add other origins if needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# app.include_router(router_coverage, prefix="/api/v1", tags=["coverage"])

app.include_router(router_constraint)
app.include_router(router_constraint_param)
app.include_router(router_coverage)
app.include_router(router_coverage_selector)
app.include_router(router_fixed_assignment)
app.include_router(router_request)
app.include_router(router_schedule)
app.include_router(router_shift)
app.include_router(router_shift_dimension)
app.include_router(router_worker)
app.include_router(router_worker_dimension)


def run_router():
    uvicorn.run("scripts.setup_router:app", host="127.0.0.1", port=5000, reload=True)
