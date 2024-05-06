from datetime import date
from typing import Dict, List, Tuple

from constraint_parser import parse_constraint
from core import (
    Constraint,
    ConstraintBuild,
    Schedule,
    Shift,
    VarDay,
    VarShift,
    VarWorker,
    Worker,
)


# pylint: disable=too-many-arguments
def build_constraints(
    schedule: Schedule,
    workers: List[Worker],
    shifts: List[Shift],
    worker_dim_dict: Dict,
    shift_dim_dict: Dict,
    cstr_builds: List[ConstraintBuild],
) -> Tuple[List[Constraint], List[Constraint]]:
    user_constraints = [
        # pylint: disable=R0801
        parse_constraint(
            cstr_build,
            workers,
            shifts,
            worker_dim_dict,
            shift_dim_dict,
            schedule.id,
        )
        for cstr_build in cstr_builds
    ]
    quick_staffing_constraints = build_quick_staffing_constraints(schedule)
    return user_constraints, quick_staffing_constraints


def build_default_constraints(
    shifts: List[Shift], schedule_id: str
) -> List[Constraint]:
    return build_default_fairness_constraints(shifts, schedule_id)


def build_default_fairness_constraints(
    shifts: List[Shift], schedule_id: str
) -> List[Constraint]:
    out = []
    for shift in shifts:
        out.append(
            # pylint: disable=R0801
            Constraint(
                id="",
                constraint_type="fai",
                operator="",
                target_value=0,
                target_unit="",
                worker_var=VarWorker(
                    selector="all", target_ids=[], num_eligible_workers=0
                ),
                day_var=VarDay(
                    selector="all",
                    target=0,
                    start_date=date.today(),
                    end_date=date.today(),
                    interval=0,
                ),
                shift_var=VarShift(
                    selector="equal",
                    target_ids=[shift.id],
                    reference_ids=[],
                    relative_ids=[],
                ),
                active=True,
                hard=False,
                priority="low",
                schedule_id=schedule_id,
                constraint_build_id="",
            )
        )
    return out


def build_quick_staffing_constraints(schedule: Schedule) -> List[Constraint]:
    return [
        Constraint(
            id="",
            constraint_type="sum",
            operator="equal",
            target_value=qs.target,
            target_unit="shift",
            worker_var=VarWorker(
                selector="equal",
                target_ids=[qs.worker_id],
                num_eligible_workers=0,
            ),
            day_var=VarDay(
                selector="period",
                target=0,
                start_date=schedule.start_date,
                end_date=schedule.end_date,
                interval=0,
            ),
            shift_var=VarShift(
                selector="equal",
                target_ids=[qs.shift_id],
                reference_ids=[],
                relative_ids=[],
            ),
            active=True,
            hard=False,
            priority="high",
            schedule_id=schedule.id,
            constraint_build_id="",
        )
        for qs in schedule.quick_staffings
    ]
