from dataclasses import asdict

import humps
from fastapi import APIRouter, Depends
from pydantic import TypeAdapter

from core import Bulk
from errors import NotAuthorizedError, handle_routes_errors
from integrations.authentication import SessionContainerType, authn_verify_session
from integrations.authorization import authz_check
from logger import log_info
from routes.api_model import BulkMessage
from routes.assignment_routes import core_to_msg_assignment
from routes.constraint_routes import core_to_msg_constraint_build
from routes.constraint_template_routes import core_to_msg_constraint_template
from routes.coverage_routes import core_to_msg_coverage_and_shift_demands
from routes.coverage_selector_routes import core_to_msg_coverage_selector
from routes.objective_breach_routes import core_to_msg_objective_breach
from routes.request_routes import core_to_msg_request
from routes.schedule_routes import core_to_msg_schedule
from routes.shift_dimension_routes import core_to_msg_shift_dimension
from routes.shift_routes import core_to_msg_shift_and_properties
from routes.team_routes import core_to_msg_team
from routes.worker_dimension_routes import core_to_msg_worker_dimension
from routes.worker_routes import core_to_msg_worker_and_properties
from scripts.setup_database import team_db
from services.bulk_services import build_bulk

router = APIRouter()


@router.get("/bulk")
async def get_constraint_templates(
    session: SessionContainerType = Depends(authn_verify_session()),
) -> BulkMessage:
    try:
        user_id = session.get_user_id()
        teams = team_db.get_teams_by_leader_id(user_id)
        team_id = teams[0].id
        if not await authz_check(user_id, "read-bulk", "team", team_id):
            raise NotAuthorizedError("You do not have permission to get bulk")
        bulk = build_bulk(teams, team_id)
        response = core_to_msg_bulk(bulk)
    except Exception as e:
        log_info("Failed to get constraint templates")
        handle_routes_errors(e)
    return response


# Mappers
# core to message
def core_to_msg_bulk(bulk: Bulk) -> BulkMessage:
    data = asdict(bulk)
    data["teams"] = [core_to_msg_team(t) for t in bulk.teams]
    data["workers"] = [
        core_to_msg_worker_and_properties(w, bulk.worker_properties_w[w.id])
        for w in bulk.workers
    ]
    data["worker_dimensions"] = [
        core_to_msg_worker_dimension(wd) for wd in bulk.worker_dimensions
    ]
    data["shifts"] = [
        core_to_msg_shift_and_properties(s, bulk.shift_properties_s[s.id])
        for s in bulk.shifts
    ]
    data["shift_dimensions"] = [
        core_to_msg_shift_dimension(sd) for sd in bulk.shift_dimensions
    ]
    data["coverages"] = [
        core_to_msg_coverage_and_shift_demands(
            c, bulk.shift_demands[c.id], bulk.shift_demand_shifts[c.id]
        )
        for c in bulk.coverages
    ]
    data["constraints"] = [
        core_to_msg_constraint_build(c) for c in bulk.constraint_builds
    ]
    data["constraint_templates"] = [
        core_to_msg_constraint_template(ct) for ct in bulk.constraint_templates
    ]
    data["requests"] = [core_to_msg_request(r) for r in bulk.requests]
    data["coverage_selectors"] = [
        core_to_msg_coverage_selector(cs) for cs in bulk.coverage_selectors
    ]
    data["assignments"] = [core_to_msg_assignment(a) for a in bulk.assignments]
    data["schedules"] = [core_to_msg_schedule(s) for s in bulk.schedules]
    data["objective_breaches"] = [
        core_to_msg_objective_breach(ob) for ob in bulk.objective_breaches
    ]
    data.pop("constraint_builds")
    as_dict = humps.camelize(data)
    validator = TypeAdapter(BulkMessage)
    return validator.validate_python(as_dict)
