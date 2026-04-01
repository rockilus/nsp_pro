from dataclasses import asdict

from shared.schemas.core import Assignment, AssignmentSource, Schedule

from engine import Assignment as AssignmentEngine


def build_campaign_assignments(
    schedule: Schedule, as_engine: list[AssignmentEngine]
) -> list[Assignment]:
    return [
        Assignment(
            **asdict(a),
            id="",
            team_id=schedule.team_id,
            schedule_id=schedule.id,
            fixed=False,
            source=AssignmentSource.SOLVER,
        )
        for a in as_engine
        if a.date >= schedule.start_date and a.date <= schedule.end_date
    ]
