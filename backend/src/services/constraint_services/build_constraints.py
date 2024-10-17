from datetime import date
from typing import Dict, List

from constraint_parser import parse_constraint
from core import (
    Attribute,
    Constraint,
    ConstraintBuildAugmented,
    ConstraintOperator,
    ConstraintType,
    Dimension,
    DimensionEntryType,
    DimEntry,
    Schedule,
    Shift,
    ShiftRestType,
    ShiftType,
    VarDay,
    VarShift,
    VarWorker,
    Worker,
)
from scripts.setup_database import constraint_db


# pylint: disable=too-many-arguments
def build_constraints(
    schedule: Schedule,
    workers: List[Worker],
    shifts: List[Shift],
    dimensions: List[Dimension],
    dim_entries: List[DimEntry],
    attributes: List[Attribute],
    cbas: List[ConstraintBuildAugmented],
    dates_campaign: List[date],
) -> List[Constraint]:
    constraint_db.delete_constraints_by_schedule_id(schedule.id)
    dim_to_attr_value_to_worker = build_dim_to_attr_value_to_owner(
        workers, dimensions, dim_entries, attributes
    )
    dim_to_attr_value_to_shift = build_dim_to_attr_value_to_owner(
        shifts, dimensions, dim_entries, attributes
    )
    constraints_user = parse_constraint(
        cbas,
        schedule.id,
        workers,
        dim_to_attr_value_to_worker,
        dates_campaign,
        shifts,
        dim_to_attr_value_to_shift,
    )
    out = []
    out += constraint_db.create_constraints(constraints_user)
    # out += build_duty_recuperation_constraints(shifts, schedule)
    out += build_quick_staffing_constraints(schedule)
    return out


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
                constraint_type=ConstraintType.FAI,
                operator=None,
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
            constraint_type=ConstraintType.SUM,
            operator=ConstraintOperator.EQUAL,
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


def build_dim_to_attr_value_to_owner(
    owners: List[Worker] | List[Shift],
    dimensions: List[Dimension],
    dim_entries: List[DimEntry],
    attributes: List[Attribute],
) -> Dict[str, Dict[str | int | float | bool, List[str]]]:
    out = {}
    owner_not_deleted_ids = [o.id for o in owners if not o.deleted]
    for dim in dimensions:
        attr_value_to_owner: Dict[str | int | float | bool, List[str]] = {}
        a_dim = [
            a
            for a in attributes
            if a.dimension_id == dim.id and a.owner_id in owner_not_deleted_ids
        ]
        if not a_dim:
            continue
        if dim.entry_type == DimensionEntryType.DIM_ENTRIES:
            for a in a_dim:
                de_names = [de.name for de in dim_entries if de.id in a.dim_entry_ids]
                for de_name in de_names:
                    if de_name not in attr_value_to_owner:
                        attr_value_to_owner[de_name] = []
                    attr_value_to_owner[de_name].append(a.owner_id)
        else:
            for a in a_dim:
                if a.value not in attr_value_to_owner:
                    attr_value_to_owner[a.value] = []
                attr_value_to_owner[a.value].append(a.owner_id)
        out[dim.id] = attr_value_to_owner
    return out


def build_duty_recuperation_constraints(
    shifts: List[Shift], schedule: Schedule
) -> List[Constraint]:
    out = []
    for duty in [s for s in shifts if s.shift_type == ShiftType.DUTY and not s.deleted]:
        # pylint: disable=R0801
        dr = next(
            (
                s
                for s in shifts
                if s.shift_type == ShiftType.REST
                and s.rest_type == ShiftRestType.RECUPERATION
                and s.recuperation_duty_id == duty.id
            ),
            None,
        )
        if dr is None:
            continue
        out.append(
            Constraint(
                id="",
                constraint_type=ConstraintType.ORD,
                operator=ConstraintOperator.YES,
                target_value=0,
                target_unit="",
                worker_var=VarWorker(
                    selector="all", target_ids=[], num_eligible_workers=0
                ),
                day_var=VarDay(
                    selector="all",
                    target=0,
                    start_date=schedule.start_date,
                    end_date=schedule.end_date,
                    interval=0,
                ),
                shift_var=VarShift(
                    selector="all",
                    target_ids=[],
                    reference_ids=[duty.id],
                    relative_ids=[dr.id],
                ),
                active=True,
                hard=True,
                priority="low",
                schedule_id=schedule.id,
                constraint_build_id="",
            )
        )
    return out
