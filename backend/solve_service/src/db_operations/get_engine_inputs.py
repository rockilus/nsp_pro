import time

from shared.database.database_collections import DatabaseCollections
from shared.schemas.core import EngineInputs, Schedule

from db_operations.assignment_services import get_fixed_assignments
from db_operations.fetch_data import fetch_workers_shifts_dim_attributes_spe
from db_operations.get_constraint_build import (
    get_active_constraint_builds_by_ids,
)
from db_operations.get_link_shift import get_link_shifts
from db_operations.get_request import get_requests_by_dates


# pylint: disable=too-many-locals, too-many-statements
def get_engine_inputs(
    schedule: Schedule, collections: DatabaseCollections
) -> EngineInputs:
    start_time_db = time.time()
    (workers, shifts, dimensions, dim_entries, attributes, specialties) = (
        fetch_workers_shifts_dim_attributes_spe(schedule.team_id, collections)
    )
    requests_work, requests_leave = get_requests_by_dates(
        start_date=schedule.start_date,
        end_date=schedule.end_date,
        workers=workers,
        shifts=shifts,
        dimensions=dimensions,
        dim_entries=dim_entries,
        attributes=attributes,
        collections=collections,
    )
    as_hist, as_wip_fixed = get_fixed_assignments(schedule, collections)
    cbs_augmented = get_active_constraint_builds_by_ids(
        schedule.constraint_build_ids,
        workers,
        shifts,
        dimensions,
        dim_entries,
        attributes,
        specialties,
        collections,
    )
    link_shifts = get_link_shifts(schedule.team_id, shifts, collections)
    shift_demands = (
        collections.shift_demand_new_db.get_shift_demands_by_date_range(
            team_id=schedule.team_id,
            start_date=schedule.start_date,
            end_date=schedule.end_date,
        )
    )
    model_output = collections.model_output_db.get_model_output(schedule.id)
    end_time_db = time.time()
    engine_inputs = EngineInputs(
        schedule=schedule,
        workers=workers,
        shifts=shifts,
        link_shifts=link_shifts,
        dimensions=dimensions,
        dim_entries=dim_entries,
        attributes=attributes,
        as_hist=as_hist,
        as_wip_fixed=as_wip_fixed,
        cbs_augmented=cbs_augmented,
        shift_demands=shift_demands,
        requests_work=requests_work,
        requests_leave=requests_leave,
        model_output=model_output,
    )
    total_time_db = end_time_db - start_time_db
    print(f"db time:              {total_time_db:.2f}s")
    return engine_inputs
