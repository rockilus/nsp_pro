from typing import Dict, List, Tuple, cast

from shared.schemas.core import (
    Assignment,
    Breach,
    ShiftDemandNew,
    EngineInputsAugmented,
    Worker,
    ShiftType,
    ConstraintFai,
    ConstraintFil,
    ConstraintOrd,
    Shift,
    ConstraintSeq,
    ConstraintSum,
    Penalties,
)
from shared.schemas.core.breach import ObjectiveCategory

from engine.types import (
    GroupsAssignmentsDurationsTargetConstraint,
    GroupsAssignmentsTargetConstraint,
    Inputs,
)


def calculate_breach_penalty_fil(
    breach: Breach,
    assignments: List[Assignment],
    penalty: int,
    constraint: ConstraintFil | None = None,
) -> int:
    breach_coords = {
        (var.worker_id, var.date, var.shift_id) for var in breach.variables
    }

    if constraint is not None and constraint.operator.name == "YES":
        workers_dates = {(v.worker_id, v.date) for v in breach.variables}
        nb_a_period = sum(
            1
            for assignment in assignments
            if (assignment.worker_id, assignment.date) in workers_dates
            and (
                assignment.worker_id,
                assignment.date,
                assignment.shift_id,
            )
            not in breach_coords
        )
    else:
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
    elif operator.name == "LESS_THAN_OR_EQUAL":
        deviation = max(nb_a_period - target_value, 0)
    elif operator.name == "EQUAL":
        deviation = abs(target_value - nb_a_period)
    elif operator.name == "GREATER_THAN_OR_EQUAL":
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
    elif operator.name == "LESS_THAN_OR_EQUAL":
        deviation = max(nb_a_period - target_value, 0)
    elif operator.name == "EQUAL":
        deviation = abs(target_value - nb_a_period)
    elif operator.name == "GREATER_THAN_OR_EQUAL":
        deviation = max(target_value - nb_a_period, 0)
    else:
        deviation = abs(target_value - nb_a_period)

    return penalty * deviation


def calculate_breach_penalty_shift_demand(
    breach: Breach,
    shift_demand: ShiftDemandNew,
    workers: List[Worker],
    shift: Shift,
    assignments: List[Assignment],
    penalty: int,
    target: int,
) -> int:
    breach_coords = {
        (var.worker_id, var.date, var.shift_id) for var in breach.variables
    }

    nb_assigned = sum(
        1
        for assignment in assignments
        if (
            assignment.worker_id,
            assignment.date,
            assignment.shift_id,
        )
        in breach_coords
    )

    return penalty * abs(nb_assigned - target)


def calculate_breach_penalty_work_time_week_target(
    breach: Breach,
    assignments: List[Assignment],
    penalty: int,
    constraint: GroupsAssignmentsDurationsTargetConstraint,
) -> int:
    breach_coords = {
        (var.worker_id, var.date, var.shift_id) for var in breach.variables
    }

    assignment_to_duration: Dict[tuple, int] = {}
    assignment_to_group: Dict[tuple, int] = {}
    for g_idx, group_assignments in enumerate(constraint.assignments):
        group_durations = getattr(
            constraint, "durations", [None] * len(group_assignments)
        )
        if not group_durations or (
            len(group_durations) != len(group_assignments)
        ):
            group_durations = [1] * len(group_assignments)
        for a, d in zip(group_assignments, group_durations):
            assignment_to_duration[a] = d
            assignment_to_group[a] = g_idx

    group_idx = None
    for var in breach.variables:
        key = (var.worker_id, var.date, var.shift_id)
        if key in assignment_to_group:
            group_idx = assignment_to_group[key]
            break

    if group_idx is None:
        target = (
            constraint.targets[0]
            if getattr(constraint, "targets", None)
            else 0
        )
        tolerance = getattr(constraint, "tolerance", 0)
    else:
        target = constraint.targets[group_idx]
        tolerance = getattr(constraint, "tolerance", 0)

    weighted_sum = 0
    for assignment in assignments:
        key = (assignment.worker_id, assignment.date, assignment.shift_id)
        if key in breach_coords and key in assignment_to_duration:
            weighted_sum += assignment_to_duration[key]

    weighted_sum_x100 = weighted_sum * 100
    tolerance_x100 = round(target * tolerance * 100)

    if target == 0:
        division_result = weighted_sum_x100 - tolerance_x100
    else:
        division_result = (weighted_sum_x100 - tolerance_x100) // target

    excess = max(division_result - 100, 0)

    return penalty * excess


def calculate_breach_penalty_nb_duties_target(
    breach: Breach,
    assignments: List[Assignment],
    penalty: int,
    constraint: GroupsAssignmentsTargetConstraint,
) -> int:
    breach_coords = {
        (var.worker_id, var.date, var.shift_id) for var in breach.variables
    }

    assignment_to_group: Dict[tuple, int] = {}
    for g_idx, group_assignments in enumerate(constraint.assignments):
        for a in group_assignments:
            assignment_to_group[a] = g_idx

    group_idx = None
    for var in breach.variables:
        key = (var.worker_id, var.date, var.shift_id)
        if key in assignment_to_group:
            group_idx = assignment_to_group[key]
            break

    if group_idx is None:
        target = (
            constraint.targets[0]
            if getattr(constraint, "targets", None)
            else 0
        )
        tolerance = getattr(constraint, "tolerance", 0)
    else:
        target = constraint.targets[group_idx]
        tolerance = getattr(constraint, "tolerance", 0)

    count = 0
    for assignment in assignments:
        key = (assignment.worker_id, assignment.date, assignment.shift_id)
        if key in breach_coords and assignment_to_group.get(key) == group_idx:
            count += 1

    weighted_sum_x100 = count * 100
    tolerance_x100 = round(target * tolerance * 100)

    if target == 0:
        division_result = weighted_sum_x100 - tolerance_x100
    else:
        division_result = (weighted_sum_x100 - tolerance_x100) // target

    excess = max(division_result - 100, 0)
    return penalty * excess


def debug_breaches(
    outputs,
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
        sd.id: sd for sd in engine_inputs.shift_demands
    }
    shifts_by_id: Dict[str, Shift] = {s.id: s for s in engine_inputs.shifts}

    # Accumulators
    stats: Dict[str, Dict[str, float]] = {}
    total_calc = 0
    for b in breaches:
        cat = str(b.objective_category.name)
        stats.setdefault(cat, {"count": 0, "total": 0.0})
        stats[cat]["count"] += 1

        val = 0
        # try to resolve based on category
        if b.objective_category == ObjectiveCategory.CONSTRAINT:
            # find constraint by objective_id
            cstr = constraints_by_id.get(b.objective_id)
            if cstr is not None:
                # Narrow by concrete type for safer access and static typing
                if isinstance(cstr, ConstraintFil):
                    cstr_fil = cast(ConstraintFil, cstr)
                    pen = (
                        engine_inputs.penalties.user_constraint.fil.hard
                        if cstr_fil.hard
                        else engine_inputs.penalties.user_constraint.fil.soft
                    )
                    val = calculate_breach_penalty_fil(
                        b, assignments, pen, cstr_fil
                    )
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
                        f"Warning: Unhandled constraint type for breach debug: {type(cstr)}"
                    )
                    # val = calculate_breach_penalty_seq(
                    #     b, assignments, pen, cstr_fai
                    # )
                elif isinstance(cstr, ConstraintOrd):
                    # No dedicated ord penalty calculator; fall back to count * pen
                    cstr_ord = cast(ConstraintOrd, cstr)
                    pen = (
                        engine_inputs.penalties.user_constraint.ord.hard
                        if cstr_ord.hard
                        else engine_inputs.penalties.user_constraint.ord.soft
                    )
                    val = len(b.variables) * pen
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
                        f"Warning: Unhandled constraint type for breach debug: {type(cstr)}"
                    )
            else:
                # unknown constraint, cannot compute
                print(
                    f"Warning: Constraint with id {b.objective_id} not found for breach debug."
                )
                val = 0

        elif b.objective_category == ObjectiveCategory.REQUEST:
            val = engine_inputs.penalties.user_constraint.request.hard

        if b.objective_category == ObjectiveCategory.DAILY_SHIFT_DEMAND:
            # try to match a shift demand by assignments membership
            sd = shift_demands_by_id.get(b.objective_id)
            if sd is not None:
                shift = shifts_by_id.get(sd.shift_id)
                if shift is not None:
                    pen = (
                        engine_inputs.penalties.configuration_constraint.coverage.duty
                        if shift.shift_type == ShiftType.DUTY
                        else engine_inputs.penalties.configuration_constraint.coverage.normal
                    )

                    val = calculate_breach_penalty_shift_demand(
                        b, assignments, sd.penalty, sd.target
                    )

        elif b.objective_category.name == ObjectiveCategory.LINK_SHIFT.name:
            # link shift id stored in objective_id
            link_id = b.objective_id
            pen = 0
            for pair in link_shifts_pairs:
                if len(pair) >= 4 and pair[2] == link_id:
                    pen = pair[3]
                    break
            val = len(b.variables) * pen

        elif b.objective_category.name == ObjectiveCategory.DUTY_RECUP.name:
            # find recup pair
            found = False
            for pair in duty_recup_pairs:
                if len(pair) >= 3:
                    # pair is (a_duty, a_recup, penalty)
                    pen = pair[2]
                    # if any a_duty matches breach variable -> use pen
                    for a in pair[0:2]:
                        if isinstance(a, tuple):
                            if a in {
                                (v.worker_id, v.date, v.shift_id)
                                for v in b.variables
                            }:
                                val = len(b.variables) * pen
                                found = True
                                break
                if found:
                    break
            if not found:
                val = 0

        elif b.objective_category.name in (
            ObjectiveCategory.WORK_TIME_WEEK_TARGET.name,
        ):
            # try to match a system weekly target
            val = 0
            if sys_inputs is not None:
                for group in getattr(
                    sys_inputs, "weekly_target_work_time", []
                ):
                    # group.assignments is list of lists
                    flat = [a for sub in group.assignments for a in sub]
                    if any(
                        (v.worker_id, v.date, v.shift_id) in flat
                        for v in b.variables
                    ):
                        val = calculate_breach_penalty_work_time_week_target(
                            b, assignments, group.penalty, group
                        )
                        break

        elif b.objective_category.name in (
            ObjectiveCategory.DUTIES_PER_MONTH_TARGET.name,
        ):
            val = 0
            if sys_inputs is not None:
                for group in getattr(
                    sys_inputs, "monthly_target_nb_duties", []
                ):
                    flat = [a for sub in group.assignments for a in sub]
                    if any(
                        (v.worker_id, v.date, v.shift_id) in flat
                        for v in b.variables
                    ):
                        val = calculate_breach_penalty_nb_duties_target(
                            b, assignments, group.penalty, group
                        )
                        break

        else:
            # fallback: zero
            val = 0

        stats[cat]["total"] += val
        total_calc += val

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
        f"{'TOTAL':<{w1}}{total_breaches:>{w2}}{total_calc:>{w3}.0f}{(total_calc / total_breaches if total_breaches else 0):>{w4}.1f}"
    )

    # Checks vs engine outputs
    try:
        print("\nChecks:")
        print(f"  Solver objective_value: {outputs.objective_value}")
        print(
            f"  Calculated total objective (sum of breach penalties): {int(total_calc)}"
        )
        print(
            f"  Raw engine breaches (outputs.breaches): {len(outputs.breaches)}"
        )
        if int(total_calc) != int(outputs.objective_value):
            print(
                "  WARNING: objective_value does not match calculated total!"
            )
        if total_breaches != len(outputs.breaches):
            print(
                "  WARNING: model breaches count does not match raw engine breaches!"
            )
    except Exception:
        # never break normal flow when debugging
        pass
