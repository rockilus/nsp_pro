from dataclasses import asdict
from typing import List, Tuple

from bson import ObjectId

from core.schedule import Assignment, Comments, ConstraintBreach, Schedule
from engine import Assignment as AssignmentEngine
from engine import ConstraintBreach as ConstraintBreachEngine
from engine import Inputs, Outputs
from scripts.setup_database import constraint_db, shift_db, worker_db


def engine_to_core_outputs(
    inputs: Inputs, outputs: Outputs
) -> Tuple[Schedule, List[Assignment]]:
    status = "Not solved"
    if outputs.is_solution:
        if len(outputs.constraint_breaches) == 0:
            status = "Solved"
        else:
            status = "Soft breached"
    else:
        status = "No solution"
    schedule = Schedule(
        id="",
        start_date=inputs.variable_space.start_date,
        end_date=inputs.variable_space.end_date,
        status=status,
        comments=Comments(
            constraint_breaches=[
                _engine_to_core_constraint_breach(cb, outputs.assignments)
                for cb in outputs.constraint_breaches
            ],
            missing_coverage_dates=[],
        ),
    )
    assignments = [
        Assignment(**asdict(a), id="", schedule_id="")
        for a in outputs.assignments
    ]
    return schedule, assignments


def _engine_to_core_constraint_breach(
    cb: ConstraintBreachEngine, assignments: List[AssignmentEngine]
) -> ConstraintBreach:
    if cb.category == "constraint":
        constraint = constraint_db.get_constraint_by_id(cb.constraint_id)
        if constraint.constraint_type == "sum":
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
                if a.worker_id in workers_id
                and a.date in dates
                and a.shift_id in shifts_id
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
        elif constraint.constraint_type == "seq":
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
                if a.worker_id in workers_id
                and a.date in dates
                and a.shift_id in shifts_id
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
        else:
            string_list = [
                f"{constraint.constraint_type} constraint not implemented yet"
            ]
    elif cb.category in ["request", "fixed_assignment"]:
        worker = worker_db.get_worker_by_id(cb.variables[0][0])
        date = cb.variables[0][1]
        shift = shift_db.get_shift_by_id(cb.variables[0][2])
        assignment = next(
            (
                a
                for a in assignments
                if a.worker_id == worker.id and a.date == date
            ),
            None,
        )
        shift_assigned = (
            shift_db.get_shift_by_id(assignment.shift_id).name
            if assignment
            else "unknown"
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
    else:
        string_list = [f"{cb.category} constraint not implemented yet"]

    return ConstraintBreach(
        id=str(ObjectId()),
        constraint_id=cb.constraint_id,
        category=cb.category,
        variables=cb.variables,
        hard_to_soft=cb.hard_to_soft,
        description=" ".join(string_list),
    )
