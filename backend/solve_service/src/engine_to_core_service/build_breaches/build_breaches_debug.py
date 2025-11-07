from typing import Dict, List, Tuple, cast

from shared.schemas.core import (
    Assignment,
    Breach,
    ConstraintFai,
    ConstraintFil,
    Constraint,
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
    Inputs,
    Outputs,
    GroupsAssignmentsDurationsTargetConstraint,
    GroupsAssignmentsTargetConstraint,
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
    total_calc = 0
    for b in breaches:
        # track concrete constraint type when objective category is CONSTRAINT
        constraint_type: str | None = None
        cat = str(b.objective_category.name)
        stats.setdefault(cat, {"count": 0, "total": 0.0})
        stats[cat]["count"] += 1

        val = 0
        # try to resolve based on category
        if b.objective_category == ObjectiveCategory.CONSTRAINT:
            # find constraint by objective_id
            cstr = (
                constraints_by_id.get(b.objective_id)
                if b.objective_id
                else None
            )
            if cstr is not None:
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
                else:
                    # fallback when the constraint type isn't one of the
                    # handled concrete classes (keep original behaviour)
                    print(
                        "Warning: Unhandled constraint type for breach debug: "
                        + f"{type(cstr)}"
                    )
            else:
                # unknown constraint, cannot compute
                constraint_type = "unknown"
                print(
                    f"Warning: Constraint with id {b.objective_id} not found "
                    + "for breach debug."
                )
                val = 0

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

        # elif b.objective_category.name == ObjectiveCategory.LINK_SHIFT.name:
        #     # link shift id stored in objective_id
        #     link_id = b.objective_id
        #     pen = 0
        #     for pair in link_shifts_pairs:
        #         if len(pair) >= 4 and pair[2] == link_id:
        #             pen = pair[3]
        #             break
        #     val = len(b.variables) * pen

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

        # @dataclass
        # class GroupsAssignmentsDurationsTargetConstraint:
        #     assignments: List[List[Tuple[str, str, str]]]
        #     durations: List[List[int]]
        #     targets: List[int]
        #     penalty: int
        #     tolerance: float = 0.0

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
                    break

        stats[cat]["total"] += val
        total_calc += val
        # collect per-constraint-type stats for CONSTRAINT objective category
        if b.objective_category == ObjectiveCategory.CONSTRAINT:
            ctype = constraint_type or "unknown"
            constraint_stats.setdefault(ctype, {"count": 0, "total": 0.0})
            constraint_stats[ctype]["count"] += 1
            constraint_stats[ctype]["total"] += val

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

    # Checks vs engine outputs
    try:
        print("\nChecks:")
        print(
            f"  Solver objective_value: {outputs.objective_value} vs calc: {total_calc} delta: {int(total_calc)-outputs.objective_value}"
        )
        print(
            f"  Raw engine breaches (outputs.breaches): {len(outputs.breaches)} vs calc: {total_breaches} delta: {total_breaches-len(outputs.breaches)}"
        )
    except Exception:
        # never break normal flow when debugging
        pass
