from dataclasses import asdict
from typing import List, Tuple

from core.schedule import Assignment, Comments, Schedule
from engine import Inputs, Outputs


def from_outputs_to_core(
    inputs: Inputs, outputs: Outputs
) -> Tuple[Schedule, List[Assignment]]:
    schedule = Schedule(
        id="",
        start_date=inputs.variable_space.start_date,
        end_date=inputs.variable_space.end_date,
        comments=Comments(
            constraint_breaches=[],
            missing_coverage_dates=[],
        ),
    )
    assignments = [
        Assignment(**asdict(a), id="", schedule_id="") for a in outputs.assignments
    ]
    return schedule, assignments
