from dataclasses import asdict
from typing import List, Tuple

from core import Assignment, Constraint, ObjectiveBreach, Schedule, Variable
from engine import Assignment as AssignmentEngine
from engine import ConstraintBreach as ConstraintBreachEngine
from engine import Outputs
from scripts.setup_database import constraint_db, shift_db, worker_db


def engine_to_core_outputs(
    schedule: Schedule, outputs: Outputs, constraints: List[Constraint]
) -> Tuple[Schedule, List[Assignment], List[ObjectiveBreach]]:
    objective_breaches = _engine_to_core_objective_breaches(
        outputs.constraint_breaches, outputs.assignments, schedule, constraints
    )
    if outputs.is_solution:
        if len(objective_breaches) == 0:
            schedule.solve_status = "Solved"
        else:
            if any(ob.hard_to_soft for ob in objective_breaches):
                schedule.solve_status = "Hard breached"
            else:
                schedule.solve_status = "Soft breached"
    else:
        schedule.solve_status = "No solution"
    assignments = [
        Assignment(
            **asdict(a),
            id="",
            schedule_id=schedule.id,
            status="wip",
            fixed=False,
        )
        for a in outputs.assignments
        if a.date >= schedule.start_date and a.date <= schedule.end_date
    ]
    return schedule, assignments, objective_breaches


def _engine_to_core_objective_breaches(
    objective_breaches: List[ConstraintBreachEngine],
    assignments: List[AssignmentEngine],
    schedule: Schedule,
    constraints: List[Constraint],
) -> List[ObjectiveBreach]:
    out = []
    for ob in objective_breaches:
        if not _has_variable_in_schedule(ob, schedule):
            continue
        if ob.category == "constraint":
            for c in constraints:
                if c.id == ob.constraint_id:
                    if c.constraint_build_id == "":
                        break
                    out.append(
                        _engine_to_core_objective_breach(ob, assignments, schedule)
                    )
                    break
        else:
            out.append(_engine_to_core_objective_breach(ob, assignments, schedule))
    return out


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
        elif constraint.constraint_type == "fil":
            description = _build_description_cb_fil(cb)
        else:
            description = f"{constraint.constraint_type} constraint not implemented yet"
    elif cb.category == "request":
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
        (
            f"{start_date.strftime('%b %d')} - {end_date.strftime('%b %d')}"
            if len(dates) > 1
            else f"{start_date.strftime('%b %d')}"
        ),
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
    s_reference = [
        shift_db.get_shift_by_id(s_id) for s_id in constraint.shift_var.reference_ids
    ]
    s_relative = [
        shift_db.get_shift_by_id(s_id) for s_id in constraint.shift_var.relative_ids
    ]
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
        ", ".join([s.name for s in s_reference]),
        "on",
        d_reference.strftime("%b %d"),
        (
            f"instead of shift {', '.join([s.name for s in s_relative])}"
            if constraint.operator == "yes"
            else ""
        ),
        "for",
        " ".join([w.name for w in workers]),
    ]
    return " ".join(string_list)


def _build_description_cb_fil(
    cb: ConstraintBreachEngine,
    # assignments: List[AssignmentEngine],
) -> str:
    # No:
    # No Plouharnel worker should work in Vannes site.
    # Yes:
    # Plouharnel worker should only work in Plouharnel site.
    workers_id = set(v[0] for v in cb.variables)
    dates = set(v[1] for v in cb.variables)
    shifts_id = set(v[2] for v in cb.variables)
    workers = [worker_db.get_worker_by_id(w_id) for w_id in workers_id]
    shifts = [shift_db.get_shift_by_id(s_id) for s_id in shifts_id]
    # a_conflict = [
    #     a for a in assignments if a.worker_id in workers_id and a.date in dates
    # ]
    # shift_assigned_names = [
    #     shift_db.get_shift_by_id(a.shift_id).name for a in a_conflict
    # ]
    string_list = [
        "Shift",
        " ".join([s.name for s in shifts]),
        # " ".join(shift_assigned_names),
        "on",
        " ".join([f"{d.strftime('%b %d')}" for d in dates]),
        "for",
        " ".join([w.name for w in workers]),
        "not allowed",
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


def _has_variable_in_schedule(
    breach: ConstraintBreachEngine, schedule: Schedule
) -> bool:
    for _, variable_date, _ in breach.variables:
        if schedule.start_date <= variable_date <= schedule.end_date:
            return True
    return False
