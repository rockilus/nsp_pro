from typing import Dict, List, Optional, Tuple

from shared.constraint_parser import (
    build_dim_to_attr_value_to_owner,
)
from shared.schemas.core import (
    EngineInputsAugmented,
    RequestStatus,
    Shift,
    ShiftRestType,
    ShiftType,
)
from shared.schemas.core.solve_task_status import SolveScope

from core_to_engine_service.build_dates import (
    build_dates,
    build_worker_ids_to_worker_dates,
    build_ws_ids_to_dates,
)
from core_to_engine_service.build_duty_recup_pairs import (
    build_duty_recup_pairs,
)
from core_to_engine_service.build_engine_constraints import (
    build_engine_constraints,
)
from core_to_engine_service.build_engine_fixed_values import (
    core_to_engine_fixed_values,
)
from core_to_engine_service.build_engine_requests import build_engine_requests
from core_to_engine_service.build_engine_shift_demands import (
    build_engine_shift_demands,
)
from core_to_engine_service.build_engine_variables import (
    build_engine_variables,
)
from core_to_engine_service.build_engine_work_loads import (
    build_engine_work_loads,
)
from core_to_engine_service.build_link_shift_pairs import (
    build_link_shift_pairs,
)
from core_to_engine_service.build_periods import (
    build_periods_monthly,
    build_periods_weekly,
    build_periods_yearly,
)
from core_to_engine_service.build_worker_shift_filter import (
    BoolSharedPolicy,
    build_worker_shift_filters,
)
from core_to_engine_service.calculate_worker_nb_duties import (
    build_max_week_day_nb_duties_vars,
    build_max_weekly_nb_duties_vars,
    build_nb_duties_constraints,
    calculate_worker_nb_duties,
)
from core_to_engine_service.calculate_worker_special_days import (
    build_duty_special_days_constraints,
)
from core_to_engine_service.calculate_worker_work_times import (
    build_work_time_constraints,
    calculate_worker_work_times,
)
from engine import ConfigurationConstraintInputs
from engine import Inputs as InputsEngine
from engine import ModelSetup as ModelSetupEngine
from engine import ProcessingCache, SolHint, SystemConstraintInputs


# pylint: disable=too-many-arguments, too-many-locals, R0801, W0613
def core_to_engine_inputs(
    engine_inputs: EngineInputsAugmented,
    solve_scope: Optional[SolveScope] = None,
) -> Tuple[InputsEngine, ProcessingCache]:
    # Workers
    workers_not_deleted = [w for w in engine_inputs.workers if not w.deleted]
    worker_not_deleted_ids = [
        w.id for w in engine_inputs.workers if not w.deleted
    ]
    dim_to_attr_value_to_worker = build_dim_to_attr_value_to_owner(
        engine_inputs.workers,
        engine_inputs.dimensions,
        engine_inputs.dim_entries,
        engine_inputs.attributes,
    )

    # Shifts
    shifts_not_deleted = [
        s
        for s in engine_inputs.shifts
        if not s.deleted
        and (
            s.rest_type != ShiftRestType.RECUPERATION
            or any(
                d.id == s.recuperation_duty_id and not d.deleted
                for d in engine_inputs.shifts
            )
        )
    ]
    shift_not_deleted_ids = [s.id for s in shifts_not_deleted]
    shifts_work = [
        s
        for s in engine_inputs.shifts
        if s.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]
    ]
    shift_duties = [
        s for s in engine_inputs.shifts if s.shift_type == ShiftType.DUTY
    ]
    shift_duties_not_deleted = [s for s in shift_duties if not s.deleted]
    shift_id_to_duration_dict = _build_shift_id_to_duration_dict(
        engine_inputs.shifts
    )
    dim_to_attr_value_to_shift = build_dim_to_attr_value_to_owner(
        engine_inputs.shifts,
        engine_inputs.dimensions,
        engine_inputs.dim_entries,
        engine_inputs.attributes,
    )

    # Dates
    fixed_assignments = engine_inputs.as_hist + engine_inputs.as_wip_fixed
    dates_hist, dates_campaign = build_dates(
        engine_inputs.schedule,
        fixed_assignments,
    )
    periods_weekly = build_periods_weekly(dates_hist, dates_campaign)
    periods_monthly = build_periods_monthly(dates_hist, dates_campaign)
    worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
        engine_inputs.schedule,
        engine_inputs.workers,
        fixed_assignments,
        dates_campaign,
    )
    periods_yearly = build_periods_yearly(dates_hist, dates_campaign)
    ws_to_dates = build_ws_ids_to_dates(
        engine_inputs.schedule,
        engine_inputs.workers,
        workers_not_deleted,
        engine_inputs.shifts,
        shifts_not_deleted,
        fixed_assignments,
        dates_campaign,
    )

    # Requests
    approved_requests = [
        r
        for r in engine_inputs.requests_work + engine_inputs.requests_leave
        if r.status == RequestStatus.APPROVED
    ]
    deferred_requests = [
        r
        for r in engine_inputs.requests_work
        if r.status == RequestStatus.DEFERRED
    ]

    # Work times
    w_to_work_times = calculate_worker_work_times(
        engine_inputs.schedule,
        workers_not_deleted,
        shifts_not_deleted,
        engine_inputs.requests_leave,
        engine_inputs.shift_demands,
        periods_weekly,
    )

    w_to_nb_duties = calculate_worker_nb_duties(
        schedule=engine_inputs.schedule,
        workers=workers_not_deleted,
        shifts=shifts_not_deleted,
        requests=engine_inputs.requests_leave,
        shift_demands=engine_inputs.shift_demands,
        periods=periods_monthly,
    )

    # Max weekly nb duties variables (weeks x workers x assignments lists)
    max_weekly_nb_duties_vars = (
        build_max_weekly_nb_duties_vars(
            workers_not_deleted,
            shift_duties_not_deleted,
            periods_weekly,
            ws_to_dates,
        )
        if engine_inputs.model_config.system_constraints.max_weekly_nb_duties
        else []
    )

    max_week_day_nb_duties_vars = (
        build_max_week_day_nb_duties_vars(
            workers_not_deleted,
            shift_duties_not_deleted,
            dates_campaign,
            ws_to_dates,
        )
        if engine_inputs.model_config.system_constraints.max_week_day_nb_duties
        else []
    )

    # Fixed assignments
    fixed_values = core_to_engine_fixed_values(
        engine_inputs.workers,
        workers_not_deleted,
        worker_ids_to_worker_dates,
        engine_inputs.shifts,
        shifts_not_deleted,
        engine_inputs.shift_demands,
        fixed_assignments,
        engine_inputs.requests_leave,
        approved_requests,
        engine_inputs.dimensions,
        engine_inputs.dim_entries,
        engine_inputs.attributes,
    )

    # Constraints:
    constraints = build_engine_constraints(
        engine_inputs.cbs_augmented,
        engine_inputs.schedule,
        engine_inputs.workers,
        dim_to_attr_value_to_worker,
        dates_hist,
        dates_campaign,
        periods_weekly,
        periods_monthly,
        periods_yearly,
        worker_ids_to_worker_dates,
        engine_inputs.shifts,
        dim_to_attr_value_to_shift,
        engine_inputs.penalties,
    )

    inputs = InputsEngine(
        ModelSetupEngine(
            variables=build_engine_variables(
                engine_inputs.workers,
                worker_ids_to_worker_dates,
                engine_inputs.shifts,
                shifts_not_deleted,
                shift_id_to_duration_dict,
            ),
            no_overlap_shift_intervals=[
                [
                    (w_id, d.isoformat(), s_id)
                    for d in worker_ids_to_worker_dates[w_id].dates_campaign
                    for s_id in shift_not_deleted_ids
                ]
                for w_id in worker_not_deleted_ids
            ],
            # fixed_values={},
            fixed_values=fixed_values,
            sol_hint=SolHint(
                var_sol=(
                    engine_inputs.model_output.var_sol
                    if engine_inputs.model_output
                    and engine_inputs.model_config.model_setup.sol_hint
                    else {}
                ),
                var_spe_sol=(
                    engine_inputs.model_output.var_spe_sol
                    if engine_inputs.model_output
                    and engine_inputs.model_config.model_setup.sol_hint
                    else {}
                ),
            ),
        ),
        user_constraints=constraints,
        # user_constraints=Constraints(
        # sum=[],
        # seq=[],
        # ord=[],
        # fil=[],
        # fai=[],
        #     sum=constraints.sum,
        #     seq=constraints.seq,
        #     ord=constraints.ord,
        #     fil=constraints.fil,
        #     fai=constraints.fai,
        # ),
        configuration_constraints=ConfigurationConstraintInputs(
            work_loads=(
                build_engine_work_loads(
                    workers_not_deleted,
                    periods_weekly,
                    periods_monthly,
                    ws_to_dates,
                    shifts_work,
                    shift_duties,
                    shift_id_to_duration_dict,
                    w_to_work_times,
                    w_to_nb_duties,
                    engine_inputs.penalties,
                )
                if engine_inputs.model_config.configuration_constraints.work_loads
                else None
            ),
            shift_demands=build_engine_shift_demands(
                workers_not_deleted,
                dates_campaign,
                worker_ids_to_worker_dates,
                shifts_not_deleted,
                engine_inputs.shift_demands,
                engine_inputs.penalties.configuration_constraint.coverage,
            ),
            # requests=[],
            requests=build_engine_requests(
                worker_not_deleted_ids=worker_not_deleted_ids,
                worker_ids_to_worker_dates=worker_ids_to_worker_dates,
                shift_not_deleted_ids=shift_not_deleted_ids,
                shifts=shifts_not_deleted,
                dim_to_attr_value_to_shift=dim_to_attr_value_to_shift,
                requests=deferred_requests,
                r_penalty=engine_inputs.penalties.user_constraint.request,
            ),
            duty_recup_pairs=build_duty_recup_pairs(
                workers_not_deleted,
                worker_ids_to_worker_dates,
                shifts_not_deleted,
                shift_duties_not_deleted,
                engine_inputs.penalties.configuration_constraint.duty_recup,
            ),
            link_shifts_pairs=build_link_shift_pairs(
                workers_not_deleted,
                worker_ids_to_worker_dates,
                shifts_not_deleted,
                engine_inputs.link_shifts,
                engine_inputs.shift_demands,
                engine_inputs.penalties.configuration_constraint.link_shift,
            ),
            worker_shift_filters=build_worker_shift_filters(
                workers=engine_inputs.workers,
                worker_ids_to_worker_dates=worker_ids_to_worker_dates,
                shifts=engine_inputs.shifts,
                dimensions=engine_inputs.dimensions,
                attributes=engine_inputs.attributes,
                fixed_values=fixed_values,
                penalty=(
                    engine_inputs.penalties.configuration_constraint.worker_shift_filter
                ),
                shared_bool_policies={
                    d.id: BoolSharedPolicy.SHIFT_TRUE_ONLY
                    for d in engine_inputs.dimensions
                },
            ),
        ),
        system_constraints=SystemConstraintInputs(
            # weekly_target_work_time=[],
            weekly_target_work_time=(
                build_work_time_constraints(
                    periods_weekly,
                    w_to_work_times,
                    ws_to_dates,
                    shifts_work,
                    shift_id_to_duration_dict,
                    engine_inputs.penalties.system_constraint.weekly_target_work_time,
                    # fmt: off
                    engine_inputs.model_config.system_constraints
                    .weekly_target_worktime_tolerance,
                    # fmt: on
                )
                if engine_inputs.model_config.system_constraints.weekly_target_work_time
                else []
            ),
            # monthly_target_nb_duties=[],
            monthly_target_nb_duties=(
                build_nb_duties_constraints(
                    periods_monthly,
                    w_to_nb_duties,
                    ws_to_dates,
                    shift_duties_not_deleted,
                    # fmt: off
                    engine_inputs.penalties.system_constraint
                    .monthly_target_nb_duties,
                    engine_inputs.model_config.system_constraints
                    .mthly_target_nb_duty_tolerance,
                    # fmt: on
                )
                # fmt: off
                if engine_inputs.model_config.system_constraints
                .monthly_target_nb_duties
                # fmt: on
                else []
            ),
            # max_weekly_nb_duties: tuple (weeks x workers x assignments, penalty)
            max_weekly_nb_duties=(
                max_weekly_nb_duties_vars,
                engine_inputs.penalties.system_constraint.max_weekly_nb_duties,
            ),
            # max_week_day_nb_duties: tuple (weekday * worker * duties, penalty)
            max_week_day_nb_duties=(
                max_week_day_nb_duties_vars,
                engine_inputs.penalties.system_constraint.max_week_day_nb_duties,
            ),
            # special_days_target_nb_duties=[],
            special_days_target_nb_duties=(
                build_duty_special_days_constraints(
                    workers_not_deleted,
                    worker_ids_to_worker_dates,
                    dates_hist,
                    dates_campaign,
                    engine_inputs.shifts,
                    engine_inputs.requests_leave,
                    engine_inputs.shift_demands,
                    fixed_assignments,
                    # fmt: off
                    engine_inputs.penalties.system_constraint
                    .special_days_target_nb_duties,
                    # fmt: on
                )
                # fmt: off
                if engine_inputs.model_config.system_constraints
                .special_days_target_nb_duties
                # fmt: on
                else []
            ),
        ),
        model_config=engine_inputs.model_config,
    )

    # start_time_validation = time.time()
    # log_info("Starting engine inputs validation")
    # if not validate_engine_inputs(inputs):
    #     raise ValueError("Engine inputs validation failed.")
    # end_time_validation = time.time()
    # total_time_validation = end_time_validation - start_time_validation
    # log_info(
    #     f"Engine inputs validation completed in {total_time_validation:.2f} seconds"
    # )

    return inputs, ProcessingCache(
        constraints=constraints,
        periods_weekly=periods_weekly,
        periods_monthly=periods_monthly,
        w_to_work_times=w_to_work_times,
        w_to_nb_duties=w_to_nb_duties,
        shift_id_to_duration=shift_id_to_duration_dict,
        dim_to_attr_value_to_shift=dim_to_attr_value_to_shift,
    )


def _build_shift_id_to_duration_dict(shifts: List[Shift]) -> Dict[str, int]:
    return {
        s.id: int((s.end_time - s.start_time).total_seconds() // 60 - 1)
        for s in shifts
    }
