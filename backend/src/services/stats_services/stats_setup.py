from typing import List

from core import Stat
from scripts.setup_database import (
    assignment_db,
    schedule_db,
    shift_db,
    stats_options_db,
    worker_db,
)
from services.stats_services.build_stats import BuildStats


def stats_setup(team_id: str) -> List[Stat]:
    stats_options = stats_options_db.get_stats_options(team_id)
    if stats_options is None:
        return []
    workers = worker_db.get_workers(team_id)
    shifts = shift_db.get_shifts(team_id)
    team_schedules = schedule_db.get_schedules(team_id)
    assignments = assignment_db.get_assignments_by_dates(
        stats_options.start_date, stats_options.end_date, team_schedules
    )
    build_stats = BuildStats(stats_options, workers, shifts)
    stats = build_stats.build_stats(assignments)
    return stats
