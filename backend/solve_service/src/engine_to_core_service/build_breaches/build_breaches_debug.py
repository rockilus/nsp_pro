from typing import Dict, List, Tuple, cast

from shared.schemas.core import (
    Assignment,
    Breach,
    Constraint,
    ConstraintFai,
    ConstraintFil,
    ConstraintOperator,
    ConstraintOrd,
    ConstraintSeq,
    ConstraintSum,
    EngineInputsAugmented,
    Request,
    Shift,
    ShiftDemandNew,
    ShiftType,
)
from shared.schemas.core.breach import ObjectiveCategory

from engine.types import (
    GroupsAssignmentsDurationsTargetConstraint,
    GroupsAssignmentsTargetConstraint,
    Inputs,
    Outputs,
)


# pylint: disable=too-many-arguments, too-many-locals, too-many-branches
# pylint: disable=too-many-statements
def calculate_breach_penalty_fil(
    breach: Breach,
    assignments: List[Assignment],
    penalty: int,
) -> int:
    breach_coords = {
        (var.worker_id, var.date, var.shift_id) for var in breach.variables
    }

    nb_a_period = sum(
        1
        for assignment in assignments
        if (
            assignment.worker_id,
            assignment.date,
            assignment.shift_id,
        )
        in breach_coords
    )

    return penalty * nb_a_period


def calculate_breach_penalty_seq(
    breach: Breach,
    assignments: List[Assignment],
    penalty: int,
    constraint: ConstraintSeq | None = None,
) -> int:
    breach_coords = {
        (var.worker_id, var.date, var.shift_id) for var in breach.variables
    }

    nb_a_period = sum(
        1
        for assignment in assignments
        if (
            assignment.worker_id,
            assignment.date,
            assignment.shift_id,
        )
        in breach_coords
    )

    # best-effort fallback
    if constraint is None:
        target_value = 0
        operator = None
    else:
        target_value = constraint.target_value
        operator = constraint.operator

    if operator is None:
        deviation = abs(target_value - nb_a_period)
    elif operator == ConstraintOperator.LESS_THAN_OR_EQUAL:
        deviation = max(nb_a_period - target_value, 0)
    elif operator == ConstraintOperator.EQUAL:
        deviation = abs(target_value - nb_a_period)
    elif operator == ConstraintOperator.GREATER_THAN_OR_EQUAL:
        deviation = max(target_value - nb_a_period, 0)
    else:
        deviation = abs(target_value - nb_a_period)

    return penalty * deviation


def calculate_breach_penalty_sum(
    breach: Breach,
    assignments: List[Assignment],
    penalty: int,
    constraint: ConstraintSum | None = None,
) -> int:
    breach_coords = {
        (var.worker_id, var.date, var.shift_id) for var in breach.variables
    }

    nb_a_period = sum(
        1
        for assignment in assignments
        if (
            assignment.worker_id,
            assignment.date,
            assignment.shift_id,
        )
        in breach_coords
    )

    if constraint is None:
        target_value = 0
        operator = None
    else:
        target_value = constraint.target_value
        operator = constraint.operator

    if operator is None:
        deviation = abs(target_value - nb_a_period)
    elif operator == ConstraintOperator.LESS_THAN_OR_EQUAL:
        deviation = max(nb_a_period - target_value, 0)
    elif operator == ConstraintOperator.EQUAL:
        deviation = abs(target_value - nb_a_period)
    elif operator == ConstraintOperator.GREATER_THAN_OR_EQUAL:
        deviation = max(target_value - nb_a_period, 0)
    else:
        deviation = abs(target_value - nb_a_period)

    return penalty * deviation


def calculate_breach_penalty_work_time_week_target(
    assignments: List[Assignment],
    group_dur: GroupsAssignmentsDurationsTargetConstraint,
) -> int:
    excesses = []
    for cstr_as, cstr_ds, cstr_target in zip(
        group_dur.assignments, group_dur.durations, group_dur.targets
    ):
        total_duration = 0
        for cstr_a, cstr_d in zip(cstr_as, cstr_ds):
            for a in assignments:
                if (
                    a.worker_id == cstr_a[0]
                    and a.date.isoformat() == cstr_a[1]
                    and a.shift_id == cstr_a[2]
                ):
                    total_duration += cstr_d * 100
                    # total_duration += shift_id_to_duration.get(a.shift_id, 0)
                    break
        tolerance_abs = round(cstr_target * group_dur.tolerance * 100)
        if cstr_target == 0:
            division_result = total_duration - tolerance_abs
        else:
            division_result = (total_duration - tolerance_abs) // cstr_target
        excess = max(division_result - 100, 0)
        excesses.append(excess)
    return max(excesses) * group_dur.penalty


def calculate_breach_penalty_nb_duties_target(
    assignments: List[Assignment],
    group: GroupsAssignmentsTargetConstraint,
    objective_category: ObjectiveCategory,
) -> int:
    excesses = []
    for cstr_as, cstr_target in zip(group.assignments, group.targets):
        total = 0
        for cstr_a in cstr_as:
            for a in assignments:
                if (
                    a.worker_id == cstr_a[0]
                    and a.date.isoformat() == cstr_a[1]
                    and a.shift_id == cstr_a[2]
                ):
                    total += 1
                    break
        tolerance_abs = round(cstr_target * group.tolerance)
        if objective_category == ObjectiveCategory.DUTIES_PER_MONTH_TARGET:
            excess = max(total - cstr_target - tolerance_abs, 0)
        else:
            excess = max(total - cstr_target, 0)
        excesses.append(excess)
    return max(excesses) * group.penalty


def calculate_breach_penalty_max_weekly_nb_duties_primary(
    assignments: List[Assignment],
    max_weekly_nb_duties: tuple,
) -> tuple:
    """Calculate the primary (global max) penalty for weekly duties.

    Returns a tuple `(primary_penalty, global_max_count)`.
    """
    weeks_vars, penalty = max_weekly_nb_duties
    if not weeks_vars:
        return 0, 0

    global_max = 0
    for week in weeks_vars:
        for worker_assignments in week:
            if not worker_assignments:
                continue
            coords = {(w, d, s) for (w, d, s) in worker_assignments}
            count = sum(
                1
                for a in assignments
                if (a.worker_id, a.date.isoformat(), a.shift_id) in coords
            )
            global_max = max(global_max, count)

    primary = global_max * penalty
    return primary, global_max


def calculate_breach_penalty_max_weekly_nb_duties_stepped(
    assignments: List[Assignment],
    max_weekly_nb_duties: tuple,
    breach_vars: List[object] | None = None,
) -> tuple:
    """Calculate the secondary (stepped) penalties for weekly duties.

    Returns a tuple `(stepped_total, stepped_count)`.
    """
    weeks_vars, penalty = max_weekly_nb_duties
    if not weeks_vars:
        return 0, 0

    # If breach_vars is provided, compute the stepped penalty for the
    # specific breach using its variables. Use getattr to avoid static
    # type complaints when the variable objects don't have a strict
    # declared type in the stubbed environment.
    if breach_vars is not None:
        b_coords = set()
        for var in breach_vars:
            try:
                wid = getattr(var, "worker_id")
                date_obj = getattr(var, "date")
                sid = getattr(var, "shift_id")
                d_iso = (
                    date_obj.isoformat()
                    if hasattr(date_obj, "isoformat")
                    else str(date_obj)
                )
                b_coords.add((wid, d_iso, sid))
            except Exception:
                continue

        count = sum(
            1
            for a in assignments
            if (a.worker_id, a.date.isoformat(), a.shift_id) in b_coords
        )

        stepped_penalty_weight = max(1, penalty // 20)
        if count >= 2:
            c = count
            sum_sq = c * (c + 1) * (2 * c + 1) // 6
            stepped_sum = sum_sq - 1
            return stepped_sum * stepped_penalty_weight, 1
        return 0, 0

    stepped_total = 0
    stepped_count = 0
    stepped_penalty_weight = max(1, penalty // 20)

    for week in weeks_vars:
        for worker_assignments in week:
            if not worker_assignments:
                continue
            coords = {(w, d, s) for (w, d, s) in worker_assignments}
            count = sum(
                1
                for a in assignments
                if (a.worker_id, a.date.isoformat(), a.shift_id) in coords
            )
            if count >= 2:
                stepped_count += 1
                # sum_{t=2..count} t^2 = sum_{t=1..count} t^2 - 1
                c = count
                sum_sq = c * (c + 1) * (2 * c + 1) // 6
                stepped_sum = sum_sq - 1
                stepped_total += stepped_sum * stepped_penalty_weight

    return stepped_total, stepped_count


def debug_breaches(
    outputs: Outputs,
    breaches: List[Breach],
    assignments: List[Assignment],
    engine_inputs: EngineInputsAugmented,
    inputs: Inputs,
) -> None:
    """Compute penalty breakdown per objective category and print a table.

    This is a best-effort debug helper: it uses available processing cache
    structures to map breaches back to the constraint/request/coverage that
    produced them and calls the appropriate penalty calculators above.
    """
    # Build lookups
    constraints_by_id: Dict[str, object] = {}
    c = inputs.user_constraints
    lists = (
        getattr(c, "sum", []),
        getattr(c, "seq", []),
        getattr(c, "ord", []),
        getattr(c, "fil", []),
        getattr(c, "fai", []),
    )
    for lst in lists:
        for it in lst:
            try:
                constraints_by_id[it.id] = it
            except Exception:
                # ignore unexpected items
                pass

    shift_demands_by_id: Dict[str, ShiftDemandNew] = {
        sd.id: sd for sd in engine_inputs.shift_demands if sd.id is not None
    }
    shifts_by_id: Dict[str, Shift] = {s.id: s for s in engine_inputs.shifts}
    # workers_by_spe_id: Dict[str, List[Worker]] = {}
    # for w in engine_inputs.workers:
    #     for spe in w.specialty_ids:
    #         workers_by_spe_id.setdefault(spe, []).append(w)
    requests_by_id: Dict[str, Request] = {
        r.id: r
        for r in engine_inputs.requests_leave + engine_inputs.requests_work
    }

    # Accumulators
    stats: Dict[str, Dict[str, float]] = {}
    # Per-constraint-type breakdown for ObjectiveCategory.CONSTRAINT
    constraint_stats: Dict[str, Dict[str, float]] = {}
    # Special (max-week / max-week-day) breakdowns
    special_stats: Dict[str, Dict[str, float]] = {}
    total_calc = 0
    for b in breaches:
        # track concrete constraint type when objective category is CONSTRAINT
        constraint_type: str | None = None
        cat = str(b.objective_category.name)
        stats.setdefault(cat, {"count": 0, "total": 0.0})
        stats[cat]["count"] += 1

        val = 0
        processed = False
        # try to resolve based on category
        if b.objective_category == ObjectiveCategory.CONSTRAINT:
            # find constraint by objective_id
            cstr = (
                constraints_by_id.get(b.objective_id)
                if b.objective_id
                else None
            )
            if cstr is not None:
                processed = True
                cstr = cast(Constraint, cstr)
                constraint_type = cstr.constraint_type.name.lower()
                # Narrow by concrete type for safer access and static typing
                if isinstance(cstr, ConstraintFil):
                    cstr_fil = cast(ConstraintFil, cstr)
                    pen = (
                        engine_inputs.penalties.user_constraint.fil.hard
                        if cstr_fil.hard
                        else engine_inputs.penalties.user_constraint.fil.soft
                    )
                    val = calculate_breach_penalty_fil(b, assignments, pen)
                    # handled
                elif isinstance(cstr, ConstraintSeq):
                    cstr_seq = cast(ConstraintSeq, cstr)
                    pen = (
                        engine_inputs.penalties.user_constraint.seq.hard
                        if cstr_seq.hard
                        else engine_inputs.penalties.user_constraint.seq.soft
                    )
                    val = calculate_breach_penalty_seq(
                        b, assignments, pen, cstr_seq
                    )
                elif isinstance(cstr, ConstraintFai):
                    # ConstraintFai has similar shape to seq; reuse seq penalty.
                    # Cast to ConstraintSeq for the calculator's signature.
                    # cstr_fai = cast(ConstraintFai, cstr)
                    print(
                        "Warning: Unhandled constraint type for breach debug: "
                        + f"{type(cstr)}"
                    )
                    # still mark as handled by the CONSTRAINT branch
                    processed = True
                    # val = calculate_breach_penalty_seq(
                    #     b, assignments, pen, cstr_fai
                    # )
                elif isinstance(cstr, ConstraintOrd):
                    # No dedicated ord penalty calculator; fall back to count * pen
                    cstr_ord = cast(ConstraintOrd, cstr)
                    val = (
                        engine_inputs.penalties.user_constraint.ord.hard
                        if cstr_ord.hard
                        else engine_inputs.penalties.user_constraint.ord.soft
                    )
                    processed = True
                elif isinstance(cstr, ConstraintSum):
                    cstr_sum = cast(ConstraintSum, cstr)
                    pen = (
                        engine_inputs.penalties.user_constraint.sum.hard
                        if cstr_sum.hard
                        else engine_inputs.penalties.user_constraint.sum.soft
                    )
                    val = calculate_breach_penalty_sum(
                        b, assignments, pen, cstr_sum
                    )
                    processed = True
                else:
                    # fallback when the constraint type isn't one of the
                    # handled concrete classes (keep original behaviour)
                    print(
                        "Warning: Unhandled constraint type for breach debug: "
                        + f"{type(cstr)}"
                    )
                    processed = True
            else:
                # unknown constraint, cannot compute
                constraint_type = "unknown"
                print(
                    f"Warning: Constraint with id {b.objective_id} not found "
                    + "for breach debug."
                )
                val = 0
                processed = True

        elif b.objective_category == ObjectiveCategory.REQUEST:
            req = (
                requests_by_id.get(b.objective_id) if b.objective_id else None
            )
            if req is not None:
                val = (
                    engine_inputs.penalties.user_constraint.request.hard
                    if req.hard
                    else engine_inputs.penalties.user_constraint.request.soft
                )
                processed = True

        if b.objective_category == ObjectiveCategory.DAILY_SHIFT_DEMAND:
            # try to match a shift demand by assignments membership
            sd = (
                shift_demands_by_id.get(b.objective_id)
                if b.objective_id
                else None
            )
            if sd is not None:
                shift = shifts_by_id.get(sd.shift_id)
                if shift is not None:
                    pen_coverage = (
                        engine_inputs.penalties.configuration_constraint.coverage
                    )
                    val = (
                        pen_coverage.duty
                        if shift.shift_type == ShiftType.DUTY
                        else pen_coverage.normal
                    )
                    processed = True

        elif b.objective_category == ObjectiveCategory.LINK_SHIFT:
            val = engine_inputs.penalties.configuration_constraint.link_shift
            processed = True

        elif b.objective_category == ObjectiveCategory.MAX_WEEKLY_NB_DUTIES:
            # Expect meta to indicate primary or step
            meta = getattr(b, "meta", None)
            try:
                mw = inputs.system_constraints.max_weekly_nb_duties
                if meta and meta.get("type") == "primary":
                    # For primary max-week breaches use only the weekly
                    # primary helper. Stepped penalties are handled when
                    # the breach type is 'step'.
                    primary, _ = (
                        calculate_breach_penalty_max_weekly_nb_duties_primary(
                            assignments, mw
                        )
                    )
                    val = primary
                    special_stats.setdefault(
                        "max_weekly_nb_duties.max", {"count": 0, "total": 0.0}
                    )
                    special_stats["max_weekly_nb_duties.max"]["count"] += 1
                    special_stats["max_weekly_nb_duties.max"][
                        "total"
                    ] += float(primary)
                    processed = True
                elif meta and meta.get("type") == "step":
                    try:
                        stepped_total, stepped_count = (
                            calculate_breach_penalty_max_weekly_nb_duties_stepped(
                                assignments, mw, breach_vars=b.variables
                            )
                        )
                        val = stepped_total
                        special_stats.setdefault(
                            "max_weekly_nb_duties.stepped",
                            {"count": 0, "total": 0.0},
                        )
                        special_stats["max_weekly_nb_duties.stepped"][
                            "count"
                        ] += stepped_count
                        special_stats["max_weekly_nb_duties.stepped"][
                            "total"
                        ] += float(stepped_total)
                        processed = True
                    except Exception:
                        pass
            except Exception:
                # fallback to not failing debug
                pass

        elif b.objective_category == ObjectiveCategory.MAX_WEEK_DAY_NB_DUTIES:
            meta = getattr(b, "meta", None)
            try:
                md = inputs.system_constraints.max_week_day_nb_duties
                if meta and meta.get("type") == "primary":
                    # For primary max-week-day breaches use only the weekly
                    # primary helper to compute the primary penalty. Do not
                    # compute stepped penalties here (they are handled for
                    # 'step' breaches).
                    primary, _ = (
                        calculate_breach_penalty_max_weekly_nb_duties_primary(
                            assignments, md
                        )
                    )
                    val = primary
                    special_stats.setdefault(
                        "max_week_day_nb_duties.max",
                        {"count": 0, "total": 0.0},
                    )
                    special_stats["max_week_day_nb_duties.max"]["count"] += 1
                    special_stats["max_week_day_nb_duties.max"][
                        "total"
                    ] += float(primary)
                    processed = True
                elif meta and meta.get("type") == "step":
                    try:
                        stepped_total, stepped_count = (
                            calculate_breach_penalty_max_weekly_nb_duties_stepped(
                                assignments, md, breach_vars=b.variables
                            )
                        )
                        val = stepped_total
                        special_stats.setdefault(
                            "max_week_day_nb_duties.stepped",
                            {"count": 0, "total": 0.0},
                        )
                        special_stats["max_week_day_nb_duties.stepped"][
                            "count"
                        ] += stepped_count
                        special_stats["max_week_day_nb_duties.stepped"][
                            "total"
                        ] += float(stepped_total)
                        processed = True
                    except Exception:
                        pass
            except Exception:
                pass

        # elif b.objective_category.name == ObjectiveCategory.DUTY_RECUP.name:
        #     # find recup pair
        #     found = False
        #     for pair in duty_recup_pairs:
        #         if len(pair) >= 3:
        #             # pair is (a_duty, a_recup, penalty)
        #             pen = pair[2]
        #             # if any a_duty matches breach variable -> use pen
        #             for a in pair[0:2]:
        #                 if isinstance(a, tuple):
        #                     if a in {
        #                         (v.worker_id, v.date, v.shift_id)
        #                         for v in b.variables
        #                     }:
        #                         val = len(b.variables) * pen
        #                         found = True
        #                         break
        #         if found:
        #             break
        #     if not found:
        #         val = 0

        elif b.objective_category == ObjectiveCategory.WORK_TIME_WEEK_TARGET:
            b_vars_set = {
                (var.worker_id, var.date.isoformat(), var.shift_id)
                for var in b.variables
            }
            for group_dur in inputs.system_constraints.weekly_target_work_time:
                c_vars_set = {a for ass in group_dur.assignments for a in ass}
                same_as_sets = b_vars_set == c_vars_set
                if same_as_sets:
                    val = calculate_breach_penalty_work_time_week_target(
                        assignments, group_dur
                    )
                    processed = True
                    break

        elif b.objective_category == ObjectiveCategory.DUTIES_PER_MONTH_TARGET:
            b_vars_set = {
                (var.worker_id, var.date.isoformat(), var.shift_id)
                for var in b.variables
            }
            for group in inputs.system_constraints.monthly_target_nb_duties:
                c_vars_set = {a for ass in group.assignments for a in ass}
                same_as_sets = b_vars_set == c_vars_set
                if same_as_sets:
                    val = calculate_breach_penalty_nb_duties_target(
                        assignments, group, b.objective_category
                    )
                    processed = True
                    break

        elif b.objective_category == ObjectiveCategory.SPECIAL_DAYS_TARGET:
            b_vars_set = {
                (var.worker_id, var.date.isoformat(), var.shift_id)
                for var in b.variables
            }
            for (
                group
            ) in inputs.system_constraints.special_days_target_nb_duties:
                c_vars_set = {a for ass in group.assignments for a in ass}
                same_as_sets = b_vars_set == c_vars_set
                if same_as_sets:
                    val = calculate_breach_penalty_nb_duties_target(
                        assignments, group, b.objective_category
                    )
                    processed = True
                    break

        stats[cat]["total"] += val
        total_calc += val
        # collect per-constraint-type stats for CONSTRAINT objective category
        if b.objective_category == ObjectiveCategory.CONSTRAINT:
            ctype = constraint_type or "unknown"
            constraint_stats.setdefault(ctype, {"count": 0, "total": 0.0})
            constraint_stats[ctype]["count"] += 1
            constraint_stats[ctype]["total"] += val

        # If we didn't handle this breach in any branch above, print it for debugging
        if not processed:
            print("Warning: Breach was NOT processed by debug logic:")
            print(b)

    # (max-week / max-week-day penalties are now handled inline above)

    # Print table
    rows: List[Tuple[str, int, float, float]] = []
    for k, v in sorted(stats.items()):
        cnt = int(v["count"])
        tot = float(v["total"])
        avg = tot / cnt if cnt > 0 else 0.0
        rows.append((k, cnt, tot, avg))

    # Formatting
    col1 = "Category"
    col2 = "Count"
    col3 = "Total"
    col4 = "Average"
    w1 = max(len(col1), max((len(r[0]) for r in rows), default=0)) + 2
    w2 = max(len(col2), 8)
    w3 = max(len(col3), 12)
    w4 = max(len(col4), 12)

    print("Broken down breaches by category:")
    header = f"{col1:<{w1}}{col2:>{w2}}{col3:>{w3}}{col4:>{w4}}"
    print(header)
    print("-" * (w1 + w2 + w3 + w4))
    for r in rows:
        print(f"{r[0]:<{w1}}{r[1]:>{w2}}{r[2]:>{w3}.0f}{r[3]:>{w4}.1f}")

    # Totals
    total_breaches = sum(int(v["count"]) for v in stats.values())
    # For the engine output checks we want to exclude the special
    # max-week / max-week-day categories because they don't produce
    # engine breaches. Compute a separate total used only for those checks.
    excluded_keys = {"max_weekly_nb_duties", "max_week_day_nb_duties"}
    total_breaches_for_checks = sum(
        int(v["count"]) for k, v in stats.items() if k not in excluded_keys
    )
    print("-" * (w1 + w2 + w3 + w4))
    print(
        f"{'TOTAL':<{w1}}{total_breaches:>{w2}}{total_calc:>{w3}.0f}"
        + f"{(total_calc / total_breaches if total_breaches else 0):>{w4}.1f}"
    )

    # Second table: breakdown by concrete constraint type for CONSTRAINT category
    if constraint_stats:
        rows_c: List[Tuple[str, int, float, float]] = []
        for k, v in sorted(constraint_stats.items()):
            cnt = int(v["count"])
            tot = float(v["total"])
            avg = tot / cnt if cnt > 0 else 0.0
            rows_c.append((k, cnt, tot, avg))

        print(
            "\nBroken down constraint breaches (ObjectiveCategory.CONSTRAINT):"
        )
        col1 = "ConstraintType"
        col2 = "Count"
        col3 = "Total"
        col4 = "Average"
        w1 = max(len(col1), max((len(r[0]) for r in rows_c), default=0)) + 2
        w2 = max(len(col2), 8)
        w3 = max(len(col3), 12)
        w4 = max(len(col4), 12)

        header = f"{col1:<{w1}}{col2:>{w2}}{col3:>{w3}}{col4:>{w4}}"
        print(header)
        print("-" * (w1 + w2 + w3 + w4))
        for r in rows_c:
            print(f"{r[0]:<{w1}}{r[1]:>{w2}}{r[2]:>{w3}.0f}{r[3]:>{w4}.1f}")
        print("-" * (w1 + w2 + w3 + w4))
        total_c_breaches = sum(
            int(v["count"]) for v in constraint_stats.values()
        )
        total_c_calc = sum(
            float(v["total"]) for v in constraint_stats.values()
        )
        print(
            f"{'TOTAL':<{w1}}{total_c_breaches:>{w2}}{total_c_calc:>{w3}.0f}"
            + f"{(total_c_calc / total_c_breaches if total_c_breaches else 0):>{w4}.1f}"
        )

    # Third table: breakdown for max-weekly / max-weekday penalties
    if special_stats:
        rows_s: List[Tuple[str, int, float, float]] = []
        for k, v in sorted(special_stats.items()):
            cnt = int(v["count"])
            tot = float(v["total"])
            avg = tot / cnt if cnt > 0 else 0.0
            rows_s.append((k, cnt, tot, avg))

        print("\nBroken down max-week penalties:")
        col1 = "Category"
        col2 = "Count"
        col3 = "Total"
        col4 = "Average"
        w1 = max(len(col1), max((len(r[0]) for r in rows_s), default=0)) + 2
        w2 = max(len(col2), 8)
        w3 = max(len(col3), 12)
        w4 = max(len(col4), 12)

        header = f"{col1:<{w1}}{col2:>{w2}}{col3:>{w3}}{col4:>{w4}}"
        print(header)
        print("-" * (w1 + w2 + w3 + w4))
        for r in rows_s:
            print(f"{r[0]:<{w1}}{r[1]:>{w2}}{r[2]:>{w3}.0f}{r[3]:>{w4}.1f}")
        print("-" * (w1 + w2 + w3 + w4))
        total_s_breaches = sum(int(v["count"]) for v in special_stats.values())
        total_s_calc = sum(float(v["total"]) for v in special_stats.values())
        print(
            f"{'TOTAL':<{w1}}{total_s_breaches:>{w2}}{total_s_calc:>{w3}.0f}"
            + f"{(total_s_calc / total_s_breaches if total_s_breaches else 0):>{w4}.1f}"
        )

    # Checks vs engine outputs
    try:
        print("\nChecks:")
        print(
            f"  Solver objective_value: {outputs.objective_value} vs "
            + f"calc: {total_calc} "
            + f"delta: {int(total_calc)-outputs.objective_value}"
        )
        len_breaches = len(outputs.breaches)
        delta_breaches = total_breaches_for_checks - len_breaches
        print(
            "  Raw engine breaches (outputs.breaches): "
            + f"{len_breaches} vs calc: {total_breaches_for_checks} "
            + f"delta: {delta_breaches}"
        )
    except Exception:
        # never break normal flow when debugging
        pass

    print("DONE")
