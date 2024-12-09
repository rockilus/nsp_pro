from dataclasses import asdict
from typing import List

from shared.schemas import Assignment, Schedule

from engine import Assignment as AssignmentEngine


def build_campaign_assignments(
    schedule: Schedule, as_engine: List[AssignmentEngine]
) -> List[Assignment]:
    return [
        Assignment(
            **asdict(a),
            id="",
            team_id=schedule.team_id,
            schedule_id=schedule.id,
            fixed=False,
        )
        for a in as_engine
        if a.date >= schedule.start_date and a.date <= schedule.end_date
    ]
