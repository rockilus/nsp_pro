from src.routes.assignment_routes import router as router_assignment
from src.routes.attribute_routes import router as router_attribute
from src.routes.breach_routes import router as router_breach
from src.routes.constraint_routes import router as router_constraint
from src.routes.constraint_template_routes import router as router_constraint_template
from src.routes.coverage_routes import router as router_coverage
from src.routes.dashboard_routes import router as router_dashboard
from src.routes.dim_entry_routes import router as router_dim_entry
from src.routes.dimension_routes import router as router_dimension
from src.routes.export_routes import router as router_export
from src.routes.health_routes import router as router_health
from src.routes.link_shift_routes import router as router_link_shift
from src.routes.multitasking_routes import router as router_multitasking
from src.routes.request_routes import router as router_request
from src.routes.schedule_routes import router as router_schedule
from src.routes.shift_demand_new_routes import router as router_shift_demand_new
from src.routes.shift_demand_routes import router as router_shift_demand
from src.routes.shift_demand_template_routes import (
    router as router_shift_demand_template,
)
from src.routes.shift_routes import router as router_shift
from src.routes.specialty_routes import router as router_specialty
from src.routes.sqs_solve_routes import router as router_sqs_solve
from src.routes.stats_routes import router as router_stats
from src.routes.team_invitation_routes import router as router_team_invitation
from src.routes.team_routes import router as router_team
from src.routes.user_routes import router as router_user
from src.routes.utils_routes import router as router_test_utils
from src.routes.worker_routes import router as router_worker

__all__ = [
    "router_assignment",
    "router_attribute",
    "router_breach",
    "router_constraint",
    "router_constraint_template",
    "router_coverage",
    "router_dashboard",
    "router_dim_entry",
    "router_dimension",
    "router_export",
    "router_health",
    "router_link_shift",
    "router_multitasking",
    "router_request",
    "router_schedule",
    "router_shift_demand",
    "router_shift_demand_template",
    "router_shift_demand_new",
    "router_shift",
    "router_specialty",
    "router_sqs_solve",
    "router_stats",
    "router_team_invitation",
    "router_team",
    "router_test_utils",
    "router_user",
    "router_worker",
]
