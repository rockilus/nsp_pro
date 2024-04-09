import time
from typing import Dict, List

import humps
from constraint_parser.templates import build_templates
from core import (
    Assignment,
    ConstraintBuild,
    Coverage,
    CoverageSelector,
    FixedAssignment,
    ObjectiveBreach,
    Request,
    Schedule,
    Shift,
    ShiftDemand,
    ShiftDimension,
    ShiftProperty,
    StatsOptions,
    Team,
    Template,
    Worker,
    WorkerDimension,
    WorkerProperty,
)
from errors import (
    MessageTypeError,
    NotAuthorizedError,
    handle_message_errors,
    handle_routes_errors,
)
from fastapi import APIRouter, Depends
from integrations.authentication import (
    SessionContainerType,
    authn_verify_session,
)
from integrations.authorization import authz_check
from logger import log_info
from pydantic import TypeAdapter
from routes.api_model import (
    AssignmentMessage,
    BulkMessage,
    ConstraintBuildMessage,
    CoverageMessage,
    CoverageSelectorMessage,
    FixedAssignmentMessage,
    ObjectiveBreachMessage,
    RequestMessage,
    ScheduleMessage,
    ShiftDimensionMessage,
    ShiftMessage,
    StatsOptionsMessage,
    TeamMessage,
    TemplateMessage,
    WorkerDimensionMessage,
    WorkerMessage,
)
from routes.assignment_routes import core_to_msg_assignment
from routes.coverage_routes import core_to_msg_coverage_and_shift_demands
from routes.coverage_selector_routes import core_to_msg_coverage_selector
from routes.fixed_assignment_routes import core_to_msg_fixed_assignment
from routes.objective_breach_routes import core_to_msg_objective_breach
from routes.request_routes import core_to_msg_request
from routes.schedule_routes import core_to_msg_schedule
from routes.shift_dimension_routes import core_to_msg_shift_dimension
from routes.shift_routes import core_to_msg_shift_and_properties
from routes.stats_options_routes import core_to_msg_stats_options
from routes.team_routes import core_to_msg_team
from routes.worker_dimension_routes import core_to_msg_worker_dimension
from routes.worker_routes import core_to_msg_worker_and_properties
from routes.constraint_routes import core_to_msg_constraint_build
from routes.constraint_template_routes import core_to_msg_constraint_template
from scripts.setup_database import (
    assignment_db,
    constraint_build_db,
    coverage_db,
    coverage_selector_db,
    fixed_assignment_db,
    objective_breach_db,
    request_db,
    schedule_db,
    shift_db,
    shift_demand_db,
    shift_dimension_db,
    shift_property_db,
    stats_options_db,
    team_db,
    worker_db,
    worker_dimension_db,
    worker_property_db,
)

router = APIRouter()


@router.get("/bulk")
async def get_constraint_templates(
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[TemplateMessage]:
    start_time = time.time()
    try:
        user_id = session.get_user_id()
        teams = team_db.get_teams_by_leader_id(user_id)
        team_id = teams[0].id
        if not await authz_check(
            user_id, "read-constraint-templates", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to get constraint templates"
            )
        workers = worker_db.get_workers(team_id)
        worker_properties = (
            worker_property_db.get_worker_properties_by_worker_ids(
                [w.id for w in workers]
            )
        )
        worker_properties_w: Dict[str, List[WorkerProperty]] = {}
        worker_properties_wd: Dict[str, List[WorkerProperty]] = {}
        for wp in worker_properties:
            worker_id = wp.worker_id
            wd_id = wp.worker_dimension_id
            if worker_id not in worker_properties_w:
                worker_properties_w[worker_id] = []
            worker_properties_w[worker_id].append(wp)
            if wd_id not in worker_properties_wd:
                worker_properties_wd[wd_id] = []
        worker_dimensions = worker_dimension_db.get_worker_dimensions(team_id)
        shifts = shift_db.get_shifts(team_id)
        shift_properties = shift_property_db.get_shift_properties_by_shift_ids(
            [s.id for s in shifts]
        )
        shift_properties_s: Dict[str, List[ShiftProperty]] = {}
        shift_properties_sd: Dict[str, List[ShiftProperty]] = {}
        for sp in shift_properties:
            shift_id = sp.shift_id
            sd_id = sp.shift_dimension_id
            if shift_id not in shift_properties_s:
                shift_properties_s[shift_id] = []
            shift_properties_s[shift_id].append(sp)
            if sd_id not in shift_properties_sd:
                shift_properties_sd[sd_id] = []
            shift_properties_sd[sd_id].append(sp)
        shift_dimensions = shift_dimension_db.get_shift_dimensions(team_id)
        coverages = coverage_db.get_coverages(team_id)
        shift_demands = shift_demand_db.get_shift_demands_by_coverage_ids(
            [c.id for c in coverages]
        )
        shift_demand_shifts: Dict[str, List[Shift]] = {}
        for c in coverages:
            shift_demand_shifts[c.id] = [
                s
                for sd in shift_demands[c.id]
                for s in shifts
                if s.id == sd.shift_id
            ]
        constraint_builds = constraint_build_db.get_constraint_builds(team_id)
        constraint_templates = build_templates(
            workers,
            worker_dimensions,
            worker_properties_wd,
            shifts,
            shift_dimensions,
            shift_properties_sd,
        )
        fixed_assignments = fixed_assignment_db.get_fixed_assignments(team_id)
        requests = request_db.get_requests(team_id)
        coverage_selectors = coverage_selector_db.get_coverage_selectors(
            team_id
        )
        assignments = assignment_db.get_assignments(team_id)
        schedules = schedule_db.get_schedules(team_id)
        objective_breaches = objective_breach_db.get_objective_breaches(
            team_id
        )
        stats_options = stats_options_db.get_stats_options(team_id)
        response = core_to_msg_bulk(
            teams,
            workers,
            worker_properties_w,
            worker_dimensions,
            shifts,
            shift_properties_s,
            shift_dimensions,
            coverages,
            shift_demands,
            shift_demand_shifts,
            constraint_builds,
            constraint_templates,
            fixed_assignments,
            requests,
            coverage_selectors,
            assignments,
            schedules,
            objective_breaches,
            stats_options,
        )
    except Exception as e:
        log_info("Failed to get constraint templates")
        handle_routes_errors(e)
    end_time = time.time()
    total_time = end_time - start_time
    print(f"Total time: {total_time}")
    return response


# Mappers
# core to message
def core_to_msg_bulk(
    teams: List[Team],
    workers: List[Worker],
    worker_properties: Dict[str, List[WorkerProperty]],
    worker_dimensions: List[WorkerDimension],
    shifts: List[Shift],
    shift_properties: Dict[str, List[ShiftProperty]],
    shift_dimensions: List[ShiftDimension],
    coverages: List[Coverage],
    shift_demands: Dict[str, List[ShiftDemand]],
    shift_demand_shifts: Dict[str, List[Shift]],
    constraints: List[ConstraintBuild],
    constraint_templates: List[Template],
    fixed_assignments: List[FixedAssignment],
    requests: List[Request],
    coverage_selectors: List[CoverageSelector],
    assignments: List[Assignment],
    schedules: List[Schedule],
    objective_breaches: List[ObjectiveBreach],
    stats_options: StatsOptions,
) -> BulkMessage:
    data: Dict[
        str,
        List[TeamMessage]
        | List[WorkerMessage]
        | List[WorkerDimensionMessage]
        | List[ShiftMessage]
        | List[ShiftDimensionMessage]
        | List[CoverageMessage]
        | List[ConstraintBuildMessage]
        | List[TemplateMessage]
        | List[FixedAssignmentMessage]
        | List[RequestMessage]
        | List[CoverageSelectorMessage]
        | List[AssignmentMessage]
        | List[ScheduleMessage]
        | List[ObjectiveBreachMessage]
        | StatsOptionsMessage
        | None,
    ] = {}
    data["teams"] = [core_to_msg_team(t) for t in teams]
    data["workers"] = [
        core_to_msg_worker_and_properties(w, worker_properties[w.id])
        for w in workers
    ]
    data["worker_dimensions"] = [
        core_to_msg_worker_dimension(wd) for wd in worker_dimensions
    ]
    data["shifts"] = [
        core_to_msg_shift_and_properties(s, shift_properties[s.id])
        for s in shifts
    ]
    data["shift_dimensions"] = [
        core_to_msg_shift_dimension(sd) for sd in shift_dimensions
    ]
    data["coverages"] = [
        core_to_msg_coverage_and_shift_demands(
            c, shift_demands[c.id], shift_demand_shifts[c.id]
        )
        for c in coverages
    ]
    data["constraints"] = [
        core_to_msg_constraint_build(c) for c in constraints
    ]
    data["constraint_templates"] = [
        core_to_msg_constraint_template(ct) for ct in constraint_templates
    ]
    data["fixed_assignments"] = [
        core_to_msg_fixed_assignment(fa) for fa in fixed_assignments
    ]
    data["requests"] = [core_to_msg_request(r) for r in requests]
    data["coverage_selectors"] = [
        core_to_msg_coverage_selector(cs) for cs in coverage_selectors
    ]
    data["assignments"] = [core_to_msg_assignment(a) for a in assignments]
    data["schedules"] = [core_to_msg_schedule(s) for s in schedules]
    data["objective_breaches"] = [
        core_to_msg_objective_breach(ob) for ob in objective_breaches
    ]
    data["stats_options"] = core_to_msg_stats_options(stats_options)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(BulkMessage)
    return validator.validate_python(as_dict)
