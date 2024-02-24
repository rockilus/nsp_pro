from routes.assignment_routes import router as router_assignment
from routes.authentication_routes import router as router_authentication
from routes.constraint_routes import router as router_constraint
from routes.constraint_template_routes import router as router_constraint_template
from routes.coverage_routes import router as router_coverage
from routes.coverage_selector_routes import router as router_coverage_selector
from routes.fixed_assignment_routes import router as router_fixed_assignment
from routes.objective_breach_routes import router as router_objective_breach
from routes.request_routes import router as router_request
from routes.schedule_routes import router as router_schedule
from routes.shift_dimension_routes import router as router_shift_dimension
from routes.shift_routes import router as router_shift
from routes.stats_options_routes import router as router_stats_options
from routes.user_routes import router as router_user
from routes.worker_dimension_routes import router as router_worker_dimension
from routes.worker_routes import router as router_worker

__all__ = [
    "router_assignment",
    "router_authentication",
    "router_constraint",
    "router_constraint_template",
    "router_coverage",
    "router_coverage_selector",
    "router_fixed_assignment",
    "router_objective_breach",
    "router_request",
    "router_schedule",
    "router_shift_dimension",
    "router_shift",
    "router_stats_options",
    "router_user",
    "router_worker_dimension",
    "router_worker",
]
