from datetime import timedelta
from typing import List

import numpy as np

from core import (
    Assignment,
    Shift,
    Stat,
    StatsOptions,
    Worker,
    Stats,
    StatsHeader,
    StatsValue,
)
from utils.constants import Constants


class BuildStats:
    def __init__(
        self,
        stats_options: StatsOptions,
        workers: List[Worker],
        shifts: List[Shift],
    ) -> None:
        self.workers = workers
        self.shifts = shifts
        self.worker_ids = [w.id for w in workers]
        self.start_date = stats_options.start_date
        self.end_date = stats_options.end_date
        self.shift_ids = [s.id for s in shifts]
        self.shift_w_ids = [s.id for s in shifts if s.name != "Off"]
        self.shift_off_ids = [s.id for s in shifts if s.name == "Off"]

    def build_stats(
        self, assignments: List[Assignment], target_stats: str
    ) -> Stats:
        a_array = self.core_to_np_assignments(assignments)
        aw_array = self.a_array_to_aw_array(a_array)
        if target_stats == "days_worked":
            days_worked_array = self.build_days_worked_array(aw_array)
            return self.np_to_core_days_worked(days_worked_array)
        if target_stats == "time_worked":
            worked_times_stats = self.build_time_worked_array(aw_array)
        worked_shifts_stats = self.build_worked_shifts_stats(a_array)

        return worked_shifts_stats + worked_times_stats

    def core_to_np_assignments(
        self, assignments: List[Assignment]
    ) -> np.ndarray:
        schedule_array = np.zeros(
            (
                len(self.worker_ids),
                (self.end_date - self.start_date).days + 1,
                len(self.shift_ids),
            ),
            dtype=int,
        )
        for assignment in assignments:
            schedule_array[
                self.worker_ids.index(assignment.worker_id),
                (assignment.date - self.start_date).days,
                self.shift_ids.index(assignment.shift_id),
            ] = 1
        return schedule_array

    def a_array_to_aw_array(self, a_array: np.ndarray) -> np.ndarray:
        indices_to_remove = [
            self.shift_ids.index(s) for s in self.shift_off_ids
        ]
        aw_array = np.delete(a_array, indices_to_remove, axis=2)
        return aw_array

    def build_days_worked_array(self, a_array: np.ndarray) -> np.ndarray:
        a_array_sum_shifts = a_array.sum(axis=2)
        dates = [
            self.start_date + timedelta(days=i)
            for i in range((self.end_date - self.start_date).days + 1)
        ]
        weekdays = np.array([d.weekday() for d in dates])
        weekdays = np.tile(weekdays, (len(a_array_sum_shifts), 1))
        out = np.zeros(
            (len(a_array_sum_shifts), Constants.NUM_DAYS_WEEK), dtype=int
        )
        for day in range(Constants.NUM_DAYS_WEEK):
            out[:, day] = np.sum(
                a_array_sum_shifts * (weekdays == day), axis=1
            )
        return out

    def np_to_core_days_worked(self, dw_array: np.ndarray) -> Stats:
        stats_headers = [
            StatsHeader(
                id=f"default_{d}",
                stats_options_id="",
                type="weekday",
                value=Constants.WEEK_DAYS[d],
                shifts_selected="all_shifts",
                shift_ids=[],
                shift_property_headers=[],
            )
            for d in range(Constants.NUM_DAYS_WEEK)
        ]
        stats_values = [
            StatsValue(
                worker_id=self.worker_ids[w],
                header_id=f"default_{d}",
                value=dw_array[w, d],
            )
            for w in range(len(dw_array))
            for d in range(Constants.NUM_DAYS_WEEK)
        ]
        return Stats(stats_headers=stats_headers, stats_values=stats_values)

        # return [
        #     Stat(
        #         worker_id=self.worker_ids[w],
        #         name=Constants.WEEK_DAYS[d].capitalize(),
        #         cluster="Worked days",
        #         value=out[w, d],
        #     )
        #     for w in range(len(out))
        #     for d in range(Constants.NUM_DAYS_WEEK)
        # ]

    def build_worked_shifts_stats(self, a_array: np.ndarray) -> List[Stat]:
        out = a_array.sum(axis=1)
        return [
            Stat(
                worker_id=self.worker_ids[w],
                name=self.shift_ids[s],
                cluster="Worked shifts",
                value=out[w, s],
            )
            for w in range(len(out))
            for s in range(len(self.shift_ids))
        ]

    def build_time_worked_array(self, a_array: np.ndarray) -> np.ndarray:
        w_shifts = a_array.sum(axis=1)
        w_times = np.array(
            [
                (s.end_time - s.start_time).total_seconds() / 3600
                for s in self.shifts
                if s.name != "Off"
            ],
            dtype=float,
        )
        out = w_shifts * w_times
        return out

    def np_to_core_time_worked(self, tw_array: np.ndarray) -> Stats:
        stats_headers = [
            StatsHeader(
                id=f"default_{s}",
                stats_options_id="",
                type="shift",
                value=self.shift_ids[s],
                shifts_selected="all_shifts",
                shift_ids=[],
                shift_property_headers=[],
            )
            for s in range(len(self.shift_ids))
        ]
        # return [
        #     Stat(
        #         worker_id=self.worker_ids[w],
        #         name=self.shift_w_ids[s],
        #         cluster="Worked times",
        #         value=out[w, s],
        #     )
        #     for w in range(len(out))
        #     for s in range(len(self.shift_w_ids))
        # ]
