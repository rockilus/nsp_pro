from datetime import timedelta
from typing import List

import numpy as np

from core.schedule import Assignment, Stat, StatsOptions
from utils.constants import Constants


class BuildStats:
    def __init__(
        self,
        stats_options: StatsOptions,
        worker_ids: List[str],
        shift_ids: List[str],
        shifts_off: List[str],
    ) -> None:
        self.workers = worker_ids
        self.start_date = stats_options.start_date
        self.end_date = stats_options.end_date
        self.shifts = shift_ids
        self.shifts_off = shifts_off

    def build_stats(self, assignments: List[Assignment]) -> List[Stat]:
        a_array = self.assignments_to_np(assignments)
        aw_array = self.a_array_to_aw_array(a_array)
        worked_days_stats = self.build_worked_days_stats(aw_array)
        worked_shifts_stats = self.build_worked_shifts_stats(a_array)

        return worked_days_stats + worked_shifts_stats

    def assignments_to_np(self, assignments: List[Assignment]) -> np.ndarray:
        schedule_array = np.zeros(
            (
                len(self.workers),
                (self.end_date - self.start_date).days + 1,
                len(self.shifts),
            ),
            dtype=int,
        )
        for assignment in assignments:
            schedule_array[
                self.workers.index(assignment.worker_id),
                (assignment.date - self.start_date).days,
                self.shifts.index(assignment.shift_id),
            ] = 1
        return schedule_array

    def a_array_to_aw_array(self, a_array: np.ndarray) -> np.ndarray:
        indices_to_remove = [self.shifts.index(s) for s in self.shifts_off]
        aw_array = np.delete(a_array, indices_to_remove, axis=2)
        return aw_array

    def build_worked_days_stats(self, a_array: np.ndarray) -> List[Stat]:
        a_array_sum_shifts = a_array.sum(axis=2)
        dates = [
            self.start_date + timedelta(days=i)
            for i in range((self.end_date - self.start_date).days + 1)
        ]
        weekdays = np.array([d.weekday() for d in dates])
        weekdays = np.tile(weekdays, (len(a_array_sum_shifts), 1))
        out = np.zeros((len(a_array_sum_shifts), Constants.NUM_DAYS_WEEK), dtype=int)
        for day in range(Constants.NUM_DAYS_WEEK):
            out[:, day] = np.sum(a_array_sum_shifts * (weekdays == day), axis=1)
        return [
            Stat(
                worker_id=self.workers[w],
                name=Constants.WEEK_DAYS[d],
                cluster="Worked days",
                value=out[w, d],
            )
            for w in range(len(out))
            for d in range(Constants.NUM_DAYS_WEEK)
        ]

    def build_worked_shifts_stats(self, a_array: np.ndarray) -> List[Stat]:
        out = a_array.sum(axis=1)
        return [
            Stat(
                worker_id=self.workers[w],
                name=self.shifts[s],
                cluster="Worked shifts",
                value=out[w, s],
            )
            for w in range(len(out))
            for s in range(len(self.shifts))
        ]
