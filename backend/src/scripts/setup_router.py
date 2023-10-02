import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import (
    router_constraint,
    router_constraint_param,
    router_coverage,
    router_shift,
    router_shift_dimension,
    router_solver,
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

app.include_router(router_coverage)
app.include_router(router_constraint_param)
app.include_router(router_constraint)
app.include_router(router_shift_dimension)
app.include_router(router_shift)
app.include_router(router_solver)
app.include_router(router_worker_dimension)
app.include_router(router_worker)


def run_router():
    uvicorn.run("scripts.setup_router:app", host="127.0.0.1", port=5000, reload=True)
