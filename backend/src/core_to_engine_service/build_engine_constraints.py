from datetime import date
from typing import Dict, List, Tuple

from constraint_parser.constraint_parse import parse_constraint
from core import (
    ConstraintBuildAugmented,
    ConstraintOperator,
    Constraints,
    ConstraintSum,
    ConstraintType,
    Schedule,
    Shift,
    Worker,
)
from core_to_engine_service.types import WorkerDates
from engine import ConstraintFai as ConstraintFaiEngine
from engine import ConstraintFil as ConstraintFilEngine
from engine import ConstraintOrd as ConstraintOrdEngine
from engine import Constraints as ConstraintsEngine
from engine import ConstraintSeq as ConstraintSeqEngine
from engine import ConstraintSum as ConstraintSumEngine


# pylint: disable=too-many-arguments, R0801
def build_engine_constraints(
    cbs_augmented: List[ConstraintBuildAugmented],
    schedule: Schedule,
    workers: List[Worker],
    dim_to_attr_value_to_worker: Dict,
    dates_hist: List[date],
    dates_campaign: List[date],
    periods_weekly: List[List[date]],
    periods_monthly: List[List[date]],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    shifts: List[Shift],
    dim_to_attr_value_to_shift: Dict,
) -> ConstraintsEngine:
    constraints = parse_constraint(
        cbs_augmented,
        schedule.id,
        workers,
        dim_to_attr_value_to_worker,
        dates_hist,
        dates_campaign,
        periods_weekly,
        periods_monthly,
        worker_ids_to_worker_dates,
        shifts,
        dim_to_attr_value_to_shift,
    )
    constraints.sum += _build_quick_staffing_constraints(
        schedule, workers, worker_ids_to_worker_dates, shifts
    )
    return _core_to_engine_constraints(constraints)


def _build_quick_staffing_constraints(
    schedule: Schedule,
    workers: List[Worker],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    shifts: List[Shift],
) -> List[ConstraintSum]:
    out: List[ConstraintSum] = []
    for qs in schedule.quick_staffings:
        worker = next((w for w in workers if w.id == qs.worker_id), None)
        shift = next((s for s in shifts if s.id == qs.shift_id), None)
        if worker is None or shift is None:
            continue
        constraints_vars: List[List[Tuple[str, str, str]]] = [
            [
                (worker.id, d.isoformat(), shift.id)
                for d in worker_ids_to_worker_dates[worker.id].dates_campaign
            ]
        ]
        out.append(
            ConstraintSum(
                id="",
                constraint_type=ConstraintType.SUM,
                operator=ConstraintOperator.EQUAL,
                target_value=qs.target,
                target_unit="shift",
                constraint_variables=constraints_vars,
                active=True,
                hard=False,
                priority="high",
                schedule_id=schedule.id,
                constraint_build_id="",
            )
        )
    return out


def _core_to_engine_constraints(constraints: Constraints) -> ConstraintsEngine:
    return ConstraintsEngine(
        sum=[ConstraintSumEngine(**c_sum.__dict__) for c_sum in constraints.sum],
        seq=[ConstraintSeqEngine(**c_seq.__dict__) for c_seq in constraints.seq],
        ord=[ConstraintOrdEngine(**c_ord.__dict__) for c_ord in constraints.ord],
        fil=[ConstraintFilEngine(**c_fil.__dict__) for c_fil in constraints.fil],
        fai=[ConstraintFaiEngine(**c_fai.__dict__) for c_fai in constraints.fai],
    )
