import time

from shared.logger import log_info

from engine import Inputs as InputsEngine


# pylint: disable=too-many-return-statements, too-many-locals, too-many-branches
def validate_engine_inputs(
    inputs: InputsEngine,
) -> bool:
    # Shift intervals
    # Check completeness
    # start_time = time.time()
    # interval_assignments = [
    #     inter[3] for inter in inputs.model_setup.variables.shift_intervals
    # ]
    # if not len(interval_assignments) == len(set(interval_assignments)):
    #     log_info(
    #         "Validation failed: Duplicate assignments in shift intervals",
    #     )
    #     return False
    # if not len(interval_assignments) == len(
    #     inputs.model_setup.variables.assignments
    # ):
    #     log_info(
    #         "Validation failed: Mismatch in number of assignments and shift "
    # +"intervals",
    #     )
    #     return False
    # for assignment in inputs.model_setup.variables.assignments:
    #     if assignment not in interval_assignments:
    #         log_info(
    #             "Validation failed: Missing interval for "
    # +f"assignment={assignment}",
    #         )
    #         return False
    # end_time = time.time()
    # total_time = end_time - start_time
    # log_info(f"Shift intervals completeness check time: {total_time:.2f}s")

    # Check durations
    start_time = time.time()
    for (
        start,
        duration,
        end,
        assignment,
    ) in inputs.model_setup.variables.shift_intervals:
        if not duration > 0:
            log_info(
                "Validation failed: Non-positive duration for "
                + f"assignment={assignment}",
            )
            return False
        if not start + duration == end:
            log_info(
                "Validation failed: Interval duration mismatch for "
                + f"assignment={assignment}",
            )
            return False
    end_time = time.time()
    total_time = end_time - start_time
    log_info(f"Shift intervals duration check time: {total_time:.2f}s")

    # No overlap
    # Fixed assignments do not overlap with each other
    start_time = time.time()
    for assignment, value in inputs.model_setup.fixed_values.items():
        if value != 1:
            continue
        assignment_interval = next(
            (
                inter
                for inter in inputs.model_setup.variables.shift_intervals
                if inter[3] == assignment
            ),
            None,
        )
        if assignment_interval is None:
            log_info(
                "Validation failed: Missing interval for " + f"assignment={assignment}",
            )
            return False
        for (
            other_assignment,
            other_value,
        ) in inputs.model_setup.fixed_values.items():
            if other_assignment == assignment or other_value != 1:
                continue
            other_interval = next(
                (
                    inter
                    for inter in inputs.model_setup.variables.shift_intervals
                    if inter[3] == other_assignment
                ),
                None,
            )
            if other_interval is None:
                log_info(
                    "Validation failed: Missing interval for "
                    + f"assignment={other_assignment[2]}",
                )
                return False
            # Check for overlap
            if not (
                assignment_interval[2] <= other_interval[0]
                or other_interval[2] <= assignment_interval[0]
            ):
                log_info(
                    "Validation failed: Overlapping intervals for "
                    + f"assignments={assignment[2]} and {other_assignment[2]}",
                )
                return False
    end_time = time.time()
    total_time = end_time - start_time
    log_info(f"Fixed assignments overlap check time: {total_time:.2f}s")

    # Duty recuperation do not overlap with duty
    start_time = time.time()
    for duty, recup, _ in inputs.configuration_constraints.duty_recup_pairs:
        duty_interval = next(
            (
                inter
                for inter in inputs.model_setup.variables.shift_intervals
                if inter[3] == duty
            ),
            None,
        )
        recup_interval = next(
            (
                inter
                for inter in inputs.model_setup.variables.shift_intervals
                if inter[3] == recup
            ),
            None,
        )
        if duty_interval is None or recup_interval is None:
            log_info(
                f"Validation failed: Missing interval for duty={duty} or "
                + f"recup={recup}",
            )
            return False
        # Check no overlap
        if not (
            duty_interval[2] <= recup_interval[0]
            or recup_interval[2] <= duty_interval[0]
        ):
            log_info(
                f"Validation failed: Overlapping intervals for duty={duty} and "
                + f"recup={recup}",
            )
            return False
    end_time = time.time()
    total_time = end_time - start_time
    log_info(f"Duty-recuperation overlap check time: {total_time:.2f}s")

    # Monthly target number of duties
    for monthly_nb_duties in inputs.system_constraints.monthly_target_nb_duties:
        # Grouped assignments not empty
        if not monthly_nb_duties.assignments:
            log_info(
                "Validation failed: Empty grouped assignments in monthly target "
                + "nb duties",
            )
            return False
        for assignments in monthly_nb_duties.assignments:
            if not assignments:
                log_info(
                    "Validation failed: Empty assignments in monthly target nb "
                    + "duties",
                )
                return False
        # Target non-negative
        for target in monthly_nb_duties.targets:
            if target < 0:
                log_info(
                    "Validation failed: Negative target in monthly target nb "
                    + "duties",
                )
                return False

    # Worker-shift filter
    # Fixed assignments not assigned to filtered out workers or shifts
    return True
