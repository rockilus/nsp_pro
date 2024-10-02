from routes.assignment_routes import router as router_assignment
from routes.attribute_routes import router as router_attribute
from routes.constraint_routes import router as router_constraint
from routes.constraint_template_routes import router as router_constraint_template
from routes.coverage_routes import router as router_coverage
from routes.coverage_selector_routes import router as router_coverage_selector
from routes.dim_entry_routes import router as router_dim_entry
from routes.dimension_routes import router as router_dimension
from routes.health_routes import router as router_health
from routes.objective_breach_routes import router as router_objective_breach
from routes.request_routes import router as router_request
from routes.schedule_routes import router as router_schedule
from routes.shift_routes import router as router_shift
from routes.stats_routes import router as router_stats
from routes.team_routes import router as router_team
from routes.user_routes import router as router_user
from routes.worker_routes import router as router_worker

__all__ = [
    "router_assignment",
    "router_attribute",
    "router_constraint",
    "router_constraint_template",
    "router_coverage",
    "router_coverage_selector",
    "router_dim_entry",
    "router_dimension",
    "router_health",
    "router_objective_breach",
    "router_request",
    "router_schedule",
    "router_shift",
    "router_stats",
    "router_team",
    "router_user",
    "router_worker",
]
