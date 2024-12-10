from routes.assignment_routes import router as router_assignment
from routes.attribute_routes import router as router_attribute
from routes.breach_routes import router as router_breach
from routes.constraint_routes import router as router_constraint
from routes.constraint_template_routes import router as router_constraint_template
from routes.coverage_routes import router as router_coverage
from routes.coverage_selector_routes import router as router_coverage_selector
from routes.daily_shift_demand_routes import router as router_daily_shift_demand
from routes.dashboard_routes import router as router_dashboard
from routes.dim_entry_routes import router as router_dim_entry
from routes.dimension_routes import router as router_dimension
from routes.export_routes import router as router_export
from routes.health_routes import router as router_health
from routes.request_routes import router as router_request
from routes.schedule_routes import router as router_schedule
from routes.shift_demand_routes import router as router_shift_demand
from routes.shift_routes import router as router_shift
from routes.specialty_routes import router as router_specialty
from routes.sse import router as router_sse
from routes.stats_routes import router as router_stats
from routes.team_routes import router as router_team
from routes.user_routes import router as router_user
from routes.worker_routes import router as router_worker

__all__ = [
    "router_assignment",
    "router_attribute",
    "router_breach",
    "router_constraint",
    "router_constraint_template",
    "router_coverage",
    "router_coverage_selector",
    "router_daily_shift_demand",
    "router_dashboard",
    "router_dim_entry",
    "router_dimension",
    "router_export",
    "router_health",
    "router_request",
    "router_schedule",
    "router_shift_demand",
    "router_shift",
    "router_specialty",
    "router_sse",
    "router_stats",
    "router_team",
    "router_user",
    "router_worker",
]
