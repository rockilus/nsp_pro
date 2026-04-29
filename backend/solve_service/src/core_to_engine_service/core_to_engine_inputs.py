from shared.constraint_parser import (
    build_dim_to_attr_value_to_owner,
)
from shared.schemas.core import (
    Constraints,
    EngineInputsAugmented,
    RequestStatus,
    Shift,
    ShiftDemandNew,
    ShiftRestType,
    ShiftType,
    TeamGenerationSettings,
)
from shared.schemas.core.solve_task_status import SolveScope, SolveScopeType

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
    build_no_overlap_shift_intervals,
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
from core_to_engine_service.build_scope_context import (
    ScopeContext,
    preprocess_scope,
)
from core_to_engine_service.build_worker_shift_filter import (
    BoolSharedPolicy,
    build_worker_shift_filters,
)
from core_to_engine_service.calculate_worker_nb_duties import (
    build_consecutive_duty_gap_vars,
    build_max_week_day_nb_duties_vars,
    build_max_weekly_nb_duties_vars,
    build_nb_duties_constraints,
    calculate_auto_gap,
    calculate_worker_nb_duties,
)
from core_to_engine_service.calculate_worker_special_days import (
    build_duty_special_days_constraints,
)
from core_to_engine_service.calculate_worker_work_times import (
    build_work_time_constraints,
    calculate_worker_work_times,
)
from engine import (
    ConfigurationConstraintInputs,
    ProcessingCache,
    SolHint,
    SystemConstraintInputs,
)
from engine import Inputs as InputsEngine
from engine import ModelSetup as ModelSetupEngine


# pylint: disable=too-many-arguments, too-many-locals, R0801, W0613
def core_to_engine_inputs(
    engine_inputs: EngineInputsAugmented,
    solve_scope: SolveScope | None = None,
    team_settings: TeamGenerationSettings | None = None,
) -> tuple[InputsEngine, ProcessingCache]:
    _team_settings = team_settings or TeamGenerationSettings.default("")
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
    dates_hist, dates_campaign = build_dates(
        schedule=engine_inputs.schedule,
        as_hist=engine_inputs.as_hist,
    )
    periods_weekly = build_periods_weekly(dates_hist, dates_campaign)
    periods_monthly = build_periods_monthly(dates_hist, dates_campaign)
    worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
        schedule=engine_inputs.schedule,
        workers=engine_inputs.workers,
        as_hist=engine_inputs.as_hist,
        dates_campaign=dates_campaign,
    )
    periods_yearly = build_periods_yearly(dates_hist, dates_campaign)
    ws_to_dates = build_ws_ids_to_dates(
        schedule=engine_inputs.schedule,
        workers=engine_inputs.workers,
        workers_not_deleted=workers_not_deleted,
        shifts=engine_inputs.shifts,
        shifts_not_deleted=shifts_not_deleted,
        as_hist=engine_inputs.as_hist,
        dates_campaign=dates_campaign,
    )

    variables = build_engine_variables(
        workers=engine_inputs.workers,
        worker_ids_to_worker_dates=worker_ids_to_worker_dates,
        shifts=engine_inputs.shifts,
        shifts_not_deleted=shifts_not_deleted,
        shift_id_to_duration_dict=shift_id_to_duration_dict,
    )

    # Scope pre-processing (Phase 4)
    # Runs before the Dates block so that engine_inputs.shifts and
    # engine_inputs.shift_demands are pruned, and locked WIP assignments are
    # appended to as_campaign_fixed, before any build_* call.
    _scope_ctx: ScopeContext | None = None
    demands_in_scope: list[ShiftDemandNew] = engine_inputs.shift_demands
    if (
        solve_scope is not None
        and solve_scope.scope_type != SolveScopeType.FULL
    ):
        _scope_ctx = preprocess_scope(
            scope=solve_scope,
            workers_not_deleted=workers_not_deleted,
            dates_campaign=dates_campaign,
            shifts_not_deleted=shifts_not_deleted,
            demands=engine_inputs.shift_demands,
            var_model=variables.assignments,
            as_campaign=engine_inputs.as_campaign_fixed
            + engine_inputs.as_campaign_not_fixed,
        )
        demands_in_scope = [
            sd
            for sd in engine_inputs.shift_demands
            if sd.id is not None and sd.id in _scope_ctx.shift_demand_ids
        ]

    as_campaign_not_fixed_out_of_scope = (
        []
        if _scope_ctx is None
        else [
            a
            for a in engine_inputs.as_campaign_not_fixed
            if (a.worker_id, a.date.isoformat(), a.shift_id)
            not in _scope_ctx.variables
        ]
    )

    fixed_assignments = (
        engine_inputs.as_hist
        + engine_inputs.as_campaign_fixed
        + as_campaign_not_fixed_out_of_scope
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

    _gap_enabled = _team_settings.duty_consecutive_gap_mode != "off"
    # _gap_days is either a scalar int ("set" mode, user-defined) or a dict
    # mapping worker_id -> gap in days ("auto" mode, calculated per worker).
    # build_consecutive_duty_gap_vars handles both types, so no further
    # branching is needed at the call site below.
    _gap_days: int | dict[str, int] = (
        _team_settings.duty_consecutive_gap_days
        if _team_settings.duty_consecutive_gap_mode == "set"
        else calculate_auto_gap(
            workers_not_deleted,
            w_to_nb_duties,
            periods_monthly,
        )
    )
    duty_consecutive_gap_vars = (
        build_consecutive_duty_gap_vars(
            workers_not_deleted,
            shift_duties_not_deleted,
            dates_campaign,
            dates_hist,
            ws_to_dates,
            _gap_days,
        )
        if engine_inputs.model_config.system_constraints.duty_consecutive_gap
        and _gap_enabled
        else []
    )

    # Constraints — built before fixed values so the OFF-shift whitelist
    # extracted from parsed constraints can be passed to core_to_engine_fixed_values.
    constraints = build_engine_constraints(
        cbs_augmented=engine_inputs.cbs_augmented,
        schedule=engine_inputs.schedule,
        workers=engine_inputs.workers,
        dim_to_attr_value_to_worker=dim_to_attr_value_to_worker,
        dates_hist=dates_hist,
        dates_campaign=dates_campaign,
        periods_weekly=periods_weekly,
        periods_monthly=periods_monthly,
        periods_yearly=periods_yearly,
        worker_ids_to_worker_dates=worker_ids_to_worker_dates,
        shifts=engine_inputs.shifts,
        dim_to_attr_value_to_shift=dim_to_attr_value_to_shift,
        penalties=engine_inputs.penalties,
    )

    # Build whitelist of OFF-shift variables referenced in parsed constraints
    # so they are not pre-fixed to 0 (e.g. "if duty on saturday → off next monday").
    off_shift_ids = {
        s.id
        for s in shifts_not_deleted
        if s.shift_type == ShiftType.REST and s.rest_type == ShiftRestType.OFF
    }
    constraint_off_vars = _extract_constraint_off_vars(
        constraints, off_shift_ids
    )

    # Fixed assignments
    fixed_values = core_to_engine_fixed_values(
        workers=engine_inputs.workers,
        workers_not_deleted=workers_not_deleted,
        worker_ids_to_worker_dates=worker_ids_to_worker_dates,
        shifts=engine_inputs.shifts,
        shifts_not_deleted=shifts_not_deleted,
        daily_shift_demands=demands_in_scope,
        assignments=fixed_assignments,
        requests=engine_inputs.requests_leave,
        approved_requests=approved_requests,
        dimensions=engine_inputs.dimensions,
        dim_entries=engine_inputs.dim_entries,
        attributes=engine_inputs.attributes,
        var_model=variables.assignments,
        scope_ctx=_scope_ctx,
        constraint_off_vars=constraint_off_vars,
    )

    inputs = InputsEngine(
        ModelSetupEngine(
            variables=variables,
            no_overlap_shift_intervals=build_no_overlap_shift_intervals(
                worker_ids_to_worker_dates=worker_ids_to_worker_dates,
                shifts_not_deleted=shifts_not_deleted,
                worker_not_deleted_ids=worker_not_deleted_ids,
                multitasking_groups=engine_inputs.multitasking_groups,
                shift_demands=engine_inputs.shift_demands,
            ),
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
                    skip_work_time=(
                        not _team_settings.duty_scope_work_time
                        and solve_scope is not None
                        and solve_scope.scope_type == SolveScopeType.DUTIES
                    ),
                )
                if engine_inputs.model_config.configuration_constraints.work_loads
                else None
            ),
            shift_demands=build_engine_shift_demands(
                workers_not_deleted=workers_not_deleted,
                dates_campaign=dates_campaign,
                worker_ids_to_worker_dates=worker_ids_to_worker_dates,
                shifts_not_deleted=shifts_not_deleted,
                daily_shift_demands=demands_in_scope,
                c_penalty=engine_inputs.penalties.configuration_constraint.coverage,
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
                scope_ctx=_scope_ctx,
                fixed_assignments=fixed_assignments,
            ),
            link_shifts_pairs=build_link_shift_pairs(
                workers_not_deleted=workers_not_deleted,
                worker_ids_to_worker_dates=worker_ids_to_worker_dates,
                shifts_not_deleted=shifts_not_deleted,
                link_shifts=engine_inputs.link_shifts,
                daily_shift_demands=demands_in_scope,
                penalty=engine_inputs.penalties.configuration_constraint.link_shift,
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
            # Weekly target work time, can be deactivated when solving fo duties
            # only in team settings
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
                    engine_inputs.model_config.system_constraints.weekly_target_worktime_tolerance,
                    # fmt: on
                )
                if engine_inputs.model_config.system_constraints.weekly_target_work_time
                and not (
                    not _team_settings.duty_scope_work_time
                    and solve_scope is not None
                    and solve_scope.scope_type == SolveScopeType.DUTIES
                )
                else []
            ),
            # Monthly target nb duties per worker
            # monthly_target_nb_duties=[],
            monthly_target_nb_duties=(
                build_nb_duties_constraints(
                    periods_monthly,
                    w_to_nb_duties,
                    ws_to_dates,
                    shift_duties_not_deleted,
                    # fmt: off
                    engine_inputs.penalties.system_constraint.monthly_target_nb_duties,
                    engine_inputs.model_config.system_constraints.mthly_target_nb_duty_tolerance,
                    # fmt: on
                )
                # fmt: off
                if engine_inputs.model_config.system_constraints.monthly_target_nb_duties
                # fmt: on
                else []
            ),
            # Constraint to minimize the max number of duties per week across
            # workers (ensure fairness across workers), and minimize the max
            # number of duties per week for each worker (ensure even spreading
            # of duties through time)
            # max_weekly_nb_duties: tuple (weeks x workers x assignments, penalty)
            # max_weekly_nb_duties=([], 0),
            max_weekly_nb_duties=(
                max_weekly_nb_duties_vars,
                engine_inputs.penalties.system_constraint.max_weekly_nb_duties,
            ),
            # max_week_day_nb_duties: tuple (weekday * worker * duties, penalty)
            # max_week_day_nb_duties=([], 0),
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
                    engine_inputs.penalties.system_constraint.special_days_target_nb_duties,
                    # fmt: on
                )
                # fmt: off
                if engine_inputs.model_config.system_constraints.special_days_target_nb_duties
                # fmt: on
                else []
            ),
            # duty_consecutive_gap: tuple (pairs of (day_d_vars, day_d+k_vars), penalty)
            duty_consecutive_gap=(
                duty_consecutive_gap_vars,
                engine_inputs.penalties.system_constraint.duty_consecutive_gap,
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
        scope_ctx=_scope_ctx,
    )


def _build_shift_id_to_duration_dict(shifts: list[Shift]) -> dict[str, int]:
    return {
        s.id: int((s.end_time - s.start_time).total_seconds() // 60 - 1)
        for s in shifts
    }


def _extract_constraint_off_vars(
    constraints: Constraints,
    off_shift_ids: set[str],
) -> set[tuple[str, str, str]]:
    """Return the set of (worker_id, date_iso, shift_id) tuples that reference
    an OFF shift in any parsed user constraint.

    These variables must remain free (not pre-fixed to 0) so that constraints
    such as "if duty on saturday → off next monday" can still be satisfied.

    Variable shapes per constraint type:
      - ConstraintSum / ConstraintSeq / ConstraintFai: List[List[Tuple]]
      - ConstraintOrd: List[Tuple[Tuple, Tuple]]  (var_ref, var_rel pairs)
      - ConstraintFil: List[Tuple]  (flat)
    """
    result: set[tuple[str, str, str]] = set()

    # Sum, Seq, Fai: outer list of periods/groups, inner list of variable tuples
    for c_sum in constraints.sum:
        for group in c_sum.constraint_variables:
            for var in group:
                if var[2] in off_shift_ids:
                    result.add(var)
    for c_seq in constraints.seq:
        for group in c_seq.constraint_variables:
            for var in group:
                if var[2] in off_shift_ids:
                    result.add(var)
    for c_fai in constraints.fai:
        for group in c_fai.constraint_variables:
            for var in group:
                if var[2] in off_shift_ids:
                    result.add(var)

    # Ord: list of (var_ref, var_rel) pairs — extract both sides
    for c_ord in constraints.ord:
        for var_ref, var_rel in c_ord.constraint_variables:
            if var_ref[2] in off_shift_ids:
                result.add(var_ref)
            if var_rel[2] in off_shift_ids:
                result.add(var_rel)

    # Fil: flat list of variable tuples
    for c_fil in constraints.fil:
        for var in c_fil.constraint_variables:
            if var[2] in off_shift_ids:
                result.add(var)

    return result
