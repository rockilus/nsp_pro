from typing import List, Tuple

from core import (
    Assignment,
    Breach,
    ConstraintFai,
    ConstraintFil,
    ConstraintOrd,
    Constraints,
    ConstraintSeq,
    ConstraintSum,
    Request,
    RequestAugmented,
    Schedule,
    Shift,
    Worker,
)
from engine import Outputs as OutputsEngine
from engine_to_core_service.update_requests import (
    update_requests_and_build_request_breaches,
)
from services.schedule_services.assignment_services import save_assignments
from services.schedule_services.engine_to_core_temp import engine_to_core_outputs


# pylint: disable=too-many-arguments
def engine_to_core(
    schedule: Schedule,
    outputs: OutputsEngine,
    workers_not_deleted: List[Worker],
    shifts_not_deleted: List[Shift],
    requests: List[Request],
    constraints: Constraints,
    wip_fixed_assignments: List[Assignment],
) -> Tuple[Schedule, List[Assignment], List[Breach], List[RequestAugmented]]:
    constraints = _engine_to_core_constraints(constraints)
    schedule, assignments, breaches = engine_to_core_outputs(
        schedule, outputs, constraints
    )
    updated_requests = update_requests_and_build_request_breaches(
        assignments, requests, workers_not_deleted, shifts_not_deleted
    )
    updated_assignments = save_assignments(assignments, schedule, wip_fixed_assignments)
    return (
        schedule,
        updated_assignments,
        breaches,
        updated_requests,
    )


def _engine_to_core_constraints(
    constraints_engine: Constraints,
) -> Constraints:
    def convert_constraint_engine(constraint_engine, constraint_cls):
        return constraint_cls(**constraint_engine.__dict__)

    return Constraints(
        sum=[
            convert_constraint_engine(c_sum, ConstraintSum)
            for c_sum in constraints_engine.sum
        ],
        seq=[
            convert_constraint_engine(c_seq, ConstraintSeq)
            for c_seq in constraints_engine.seq
        ],
        ord=[
            convert_constraint_engine(c_ord, ConstraintOrd)
            for c_ord in constraints_engine.ord
        ],
        fil=[
            convert_constraint_engine(c_fil, ConstraintFil)
            for c_fil in constraints_engine.fil
        ],
        fai=[
            convert_constraint_engine(c_fai, ConstraintFai)
            for c_fai in constraints_engine.fai
        ],
    )
