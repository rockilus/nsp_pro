from dataclasses import asdict
from typing import List, Tuple

from core.constraint import Constraint
from core.schedule import Assignment, ObjectiveBreach, Schedule, Variable
from engine import Assignment as AssignmentEngine
from engine import ConstraintBreach as ConstraintBreachEngine
from engine import Outputs
from scripts.setup_database import constraint_db, shift_db, worker_db


def engine_to_core_outputs(
    schedule: Schedule, outputs: Outputs
) -> Tuple[Schedule, List[Assignment], List[ObjectiveBreach]]:
    if outputs.is_solution:
        if len(outputs.constraint_breaches) == 0:
            schedule.solve_status = "Solved"
        else:
            if any(cb.hard_to_soft for cb in outputs.constraint_breaches):
                schedule.solve_status = "Hard breached"
            else:
                schedule.solve_status = "Soft breached"
    else:
        schedule.solve_status = "No solution"
    assignments = [
        Assignment(**asdict(a), id="", schedule_id=schedule.id, status="wip")
        for a in outputs.assignments
        if a.date >= schedule.start_date and a.date <= schedule.end_date
    ]
    objective_breaches = [
        _engine_to_core_objective_breach(cb, outputs.assignments, schedule)
        for cb in outputs.constraint_breaches
    ]
    return schedule, assignments, objective_breaches


def _engine_to_core_objective_breach(
    cb: ConstraintBreachEngine,
    assignments: List[AssignmentEngine],
    schedule: Schedule,
) -> ObjectiveBreach:
    if cb.category == "constraint":
        constraint = constraint_db.get_constraint_by_id(cb.constraint_id)
        if constraint.constraint_type == "sum":
            description = _build_description_cb_sum(constraint, cb, assignments)
        elif constraint.constraint_type == "seq":
            description = _build_description_cb_seq(constraint, cb, assignments)
        elif constraint.constraint_type == "ord":
            description = _build_description_cb_ord(constraint, cb, assignments)
        else:
            description = f"{constraint.constraint_type} constraint not implemented yet"
    elif cb.category in ["request", "fixed_assignment"]:
        description = _build_description_cb_far(cb, assignments)
    else:
        description = f"{cb.category} constraint not implemented yet"
    return ObjectiveBreach(
        id="",
        objective_id=cb.constraint_id,
        objective_category=cb.category,
        variables=[Variable(*v) for v in cb.variables],
        hard_to_soft=cb.hard_to_soft,
        description=description,
        schedule_id=schedule.id,
    )


def _build_description_cb_sum(
    constraint: Constraint,
    cb: ConstraintBreachEngine,
    assignments: List[AssignmentEngine],
) -> str:
    # 1 shift off too many/short on period Oct 2 - Oct 8
    workers_id = set(v[0] for v in cb.variables)
    dates = set(v[1] for v in cb.variables)
    start_date, end_date = min(dates), max(dates)
    shifts_id = set(v[2] for v in cb.variables)
    workers = [worker_db.get_worker_by_id(w_id) for w_id in workers_id]
    shifts = [shift_db.get_shift_by_id(s_id) for s_id in shifts_id]
    count = sum(
        1
        for a in assignments
        if a.worker_id in workers_id and a.date in dates and a.shift_id in shifts_id
    )
    diff = count - constraint.target_value
    string_list = [
        str(abs(diff)),
        "shifts" if abs(diff) > 1 else "shift",
        " ".join([s.name for s in shifts]),
        "too many" if diff > 0 else "short",
        "on period",
        f"{start_date.strftime('%b %d')} - {end_date.strftime('%b %d')}",
        "for",
        " ".join([w.name for w in workers]),
    ]
    return " ".join(string_list)


def _build_description_cb_seq(
    constraint: Constraint,
    cb: ConstraintBreachEngine,
    assignments: List[AssignmentEngine],
) -> str:
    # 1 shift off consecutive too many/short on period Oct 2 - Oct 8
    workers_id = set(v[0] for v in cb.variables)
    dates = set(v[1] for v in cb.variables)
    start_date, end_date = min(dates), max(dates)
    shifts_id = set(v[2] for v in cb.variables)
    workers = [worker_db.get_worker_by_id(w_id) for w_id in workers_id]
    shifts = [shift_db.get_shift_by_id(s_id) for s_id in shifts_id]
    count = sum(
        1
        for a in assignments
        if a.worker_id in workers_id and a.date in dates and a.shift_id in shifts_id
    )
    diff = count - constraint.target_value
    string_list = [
        str(abs(diff)),
        "shifts" if abs(diff) > 1 else "shift",
        " ".join([s.name for s in shifts]),
        "consecutive",
        "too many" if diff > 0 else "short",
        "on period" if len(dates) > 1 else "on",
        f"{start_date.strftime('%b %d')} - {end_date.strftime('%b %d')}"
        if len(dates) > 1
        else f"{start_date.strftime('%b %d')}",
        "for",
        " ".join([w.name for w in workers]),
    ]
    return " ".join(string_list)


def _build_description_cb_ord(
    constraint: Constraint,
    cb: ConstraintBreachEngine,
    assignments: List[AssignmentEngine],
) -> str:
    # No:
    # Shift morning 1 day after/before shift night
    # Yes:
    # Shift afternoon 1 day after/before shift night instead of shift morning
    workers_id = set(v[0] for v in cb.variables)
    d_reference, d_relative = cb.variables[0][1], cb.variables[1][1]
    workers = [worker_db.get_worker_by_id(w_id) for w_id in workers_id]
    s_reference = shift_db.get_shift_by_id(constraint.shift_var.reference_id)
    s_relative = shift_db.get_shift_by_id(constraint.shift_var.relative_id)
    a_d_relative = next(
        (a for a in assignments if a.worker_id in workers_id and a.date == d_relative),
        None,
    )
    shift_assigned_name = (
        shift_db.get_shift_by_id(a_d_relative.shift_id).name
        if a_d_relative
        else "unknown"
    )
    string_list = [
        "Shift",
        shift_assigned_name,
        str(abs(constraint.day_var.interval)),
        "day" if abs(constraint.day_var.interval) <= 1 else "days",
        "after" if constraint.day_var.interval >= 0 else "before",
        "shift",
        s_reference.name,
        "on",
        d_reference.strftime("%b %d"),
        f"instead of shift {s_relative.name}" if constraint.operator == "yes" else "",
        "for",
        " ".join([w.name for w in workers]),
    ]
    return " ".join(string_list)


def _build_description_cb_far(
    cb: ConstraintBreachEngine,
    assignments: List[AssignmentEngine],
) -> str:
    worker = worker_db.get_worker_by_id(cb.variables[0][0])
    date = cb.variables[0][1]
    shift = shift_db.get_shift_by_id(cb.variables[0][2])
    assignment = next(
        (a for a in assignments if a.worker_id == worker.id and a.date == date),
        None,
    )
    shift_assigned = (
        shift_db.get_shift_by_id(assignment.shift_id).name if assignment else "unknown"
    )
    string_list = [
        worker.name,
        "requested",
        shift.name,
        "on",
        date.strftime("%b %d"),
        "but works",
        shift_assigned,
    ]
    return " ".join(string_list)
