from routes.constraint_param_routes import router as router_constraint_param
from routes.constraint_routes import router as router_constraint
from routes.coverage_routes import router as router_coverage
from routes.coverage_selector_routes import router as router_coverage_selector
from routes.fixed_assignment_routes import router as router_fixed_assignment
from routes.schedule_routes import router as router_schedule
from routes.shift_dimension_routes import router as router_shift_dimension
from routes.shift_routes import router as router_shift
from routes.worker_dimension_routes import router as router_worker_dimension
from routes.worker_routes import router as router_worker

__all__ = [
    "router_constraint_param",
    "router_constraint",
    "router_coverage",
    "router_coverage_selector",
    "router_fixed_assignment",
    "router_shift_dimension",
    "router_shift",
    "router_schedule",
    "router_worker_dimension",
    "router_worker",
]
