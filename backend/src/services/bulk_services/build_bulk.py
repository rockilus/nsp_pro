from typing import Dict, List

from constraint_parser import build_templates
from core import Bulk, Shift, ShiftProperty, Team, WorkerProperty
from scripts.setup_database import (
    assignment_db,
    constraint_build_db,
    coverage_db,
    coverage_selector_db,
    objective_breach_db,
    request_db,
    schedule_db,
    shift_db,
    shift_demand_db,
    shift_dimension_db,
    shift_property_db,
    user_db,
    worker_db,
    worker_dimension_db,
    worker_property_db,
)
from services.schedule_services import get_schedule_wip


# pylint: disable=too-many-locals
def build_bulk(user_id: str, teams: List[Team], selected_team_id: str) -> Bulk:
    bulk = Bulk(selected_team_id=selected_team_id, teams=teams)
    bulk.user = user_db.get_user_by_id(user_id)
    bulk.workers = worker_db.get_workers(selected_team_id)
    worker_properties = worker_property_db.get_worker_properties_by_worker_ids(
        [w.id for w in bulk.workers]
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
        worker_properties_wd[wd_id].append(wp)
    bulk.worker_properties_w = worker_properties_w
    bulk.worker_dimensions = worker_dimension_db.get_worker_dimensions(selected_team_id)
    bulk.shifts = shift_db.get_shifts(selected_team_id)
    shift_properties = shift_property_db.get_shift_properties_by_shift_ids(
        [s.id for s in bulk.shifts]
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
    bulk.shift_properties_s = shift_properties_s
    bulk.shift_dimensions = shift_dimension_db.get_shift_dimensions(selected_team_id)
    bulk.coverages = coverage_db.get_coverages(selected_team_id)
    bulk.shift_demands = shift_demand_db.get_shift_demands_by_coverage_ids(
        [c.id for c in bulk.coverages]
    )
    shift_demand_shifts: Dict[str, List[Shift]] = {}
    for c in bulk.coverages:
        shift_demand_shifts[c.id] = [
            s
            for sd in bulk.shift_demands[c.id]
            for s in bulk.shifts
            if s.id == sd.shift_id
        ]
    bulk.shift_demand_shifts = shift_demand_shifts
    bulk.constraint_builds = constraint_build_db.get_constraint_builds(selected_team_id)
    bulk.constraint_templates = build_templates(
        bulk.workers,
        bulk.worker_dimensions,
        worker_properties_wd,
        bulk.shifts,
        bulk.shift_dimensions,
        shift_properties_sd,
        bulk.user.language,
    )
    bulk.requests = request_db.get_requests(bulk.workers)
    schedules = schedule_db.get_schedules(selected_team_id)
    bulk.schedule = get_schedule_wip(schedules, selected_team_id)
    bulk.coverage_selectors = coverage_selector_db.get_coverage_selectors(
        bulk.schedule.id
    )
    bulk.assignments = assignment_db.get_assignments(schedules)
    bulk.objective_breaches = objective_breach_db.get_objective_breaches(
        [bulk.schedule]
    )
    return bulk
