# pylint: disable=R0801
from shared.schemas import ShiftLeaveType, ShiftRestType

from scripts.setup_database import (
    breach_db,
    daily_shift_demand_db,
    schedule_db,
    shift_db,
    shift_demand_db,
)


def delete_shift(shift_id: str) -> None:
    shift = shift_db.get_shift_by_id(shift_id)
    if shift is None:
        raise ValueError("Shift does not exist")
    if shift.rest_type == ShiftRestType.OFF:
        raise ValueError("Cannot delete the default rest shift")
    if shift.leave_type != ShiftLeaveType.NONE:
        raise ValueError("Cannot delete a leave shift")
    delete_shift_from_schedule_quick_staffing(shift_id)
    shift_demand_db.delete_shift_demands_by_shift_id(shift_id)
    daily_shift_demand_db.delete_daily_shift_demands_by_shift_id(shift_id)
    shift_db.logical_delete_shift(shift_id)
    # delete_shift_from_objective_breach(shift_id)
    # assignment_db.delete_assignments_by_shift_id(shift_id)
    # request_db.delete_requests_by_shift_id(shift_id)


def delete_shift_from_objective_breach(shift_id: str) -> None:
    obs = breach_db.get_breaches_by_shift_id(shift_id)
    for ob in obs:
        new_vars = [v for v in ob.variables if v.shift_id != shift_id]
        if not new_vars:
            breach_db.delete_breach(ob.id)
            continue
        ob.variables = new_vars
        breach_db.update_breach(ob)


def delete_shift_from_schedule_quick_staffing(shift_id: str) -> None:
    schedules = schedule_db.get_schedule_quick_staffing_contain_shift_id(shift_id)
    for schedule in schedules:
        new_quick_staffings = [
            qs for qs in schedule.quick_staffings if qs.shift_id != shift_id
        ]
        schedule.quick_staffings = new_quick_staffings
        schedule_db.update_schedule(schedule)
