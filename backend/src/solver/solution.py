from datetime import datetime, timedelta
from typing import List

import numpy as np
from bson import ObjectId
from ortools.sat.python import cp_model  # type: ignore
from models import Schedule, ScheduleData, User
from solver.build_model import ModelData


class Solution:
    def __init__(
        self,
        model_data: ModelData,
        solver: cp_model.CpSolver,
        start_date: datetime,
        author: User,
    ) -> None:
        self.model_data = model_data
        self.solver = solver
        self.shift_labels = self.model_data.shift_types
        self.user_labels = [user.last_name for user in self.model_data.users]
        self.hospital = self.model_data.hospital
        self.users = self.model_data.users
        self.start_date = start_date
        self.author = author

    def build_np_solution(self) -> np.ndarray:
        schedule = np.zeros(
            (
                self.model_data.num_users,
                self.model_data.num_days,
                self.model_data.num_shifts_day,
                self.model_data.num_shift_types,
            ),
            dtype=int,
        )
        for u in range(self.model_data.num_users):
            for d in range(self.model_data.num_days):
                for s in range(self.model_data.num_shifts_day):
                    for t in range(self.model_data.num_shift_types):
                        if self.solver.BooleanValue(self.model_data.work[u, d, s, t]):
                            schedule[u, d, s, t] = 1
        return schedule

    def build_schedule(self) -> Schedule:
        return Schedule(
            _id=ObjectId(),
            name="Schedule",
            schedule_list=self.build_np_solution().tolist(),
            start_date=self.start_date.date(),
            end_date=(
                self.start_date + timedelta(days=self.model_data.num_days)
            ).date(),
            build_date=datetime.now(),
            author=self.author,
            hospital=self.hospital,
            users=self.users,
            shift_labels=self.shift_labels,
            user_labels=self.user_labels,
            override=[],
            active=True,
        )

    def build_schedule_data_list(self, schedule: Schedule) -> List[ScheduleData]:
        schedule_data_list = []
        date = self.start_date
        for d in range(self.model_data.num_days):
            for u in range(self.model_data.num_users):
                for s in range(self.model_data.num_shifts_day):
                    for t in range(self.model_data.num_shift_types):
                        if self.solver.BooleanValue(self.model_data.work[u, d, s, t]):
                            schedule_data_list.append(
                                ScheduleData(
                                    _id=ObjectId(),
                                    date=date.date(),
                                    shift_type=t,
                                    shift_type_label=self.shift_labels[t],
                                    user_last_name=self.users[u].last_name,
                                    schedule=schedule,
                                    user=self.users[u],
                                    hospital=self.hospital,
                                )
                            )
            date += timedelta(days=1)
        return schedule_data_list


#     print()
#     header = "          "
#     for _ in range(self.model_data.num_weeks):
#         header += "M T W T F S S "
#     print(header)
#     for u in range(self.model_data.num_users):
#         schedule = ""
#         for d in range(self.model_data.num_days):
#             for s in range(self.model_data.num_shifts_day):
#                 for t in range(self.model_data.num_shift_types):
#                     if solver.BooleanValue(self.model_data.work[u, d, s, t]):
#                         schedule += self.model_data.shift_types[t] + " "
#         print(f"worker {u}: {schedule}")
#     print()
#     print("Penalties:")
#     for i, var in enumerate(self.model_data.obj_int_vars):
#         if solver.Value(var) > 0:
#             print(
#                 f"  {var.Name()} violated by {solver.Value(var)}, "
#                 + f"linear penalty={self.model_data.obj_int_coeffs[i]}"
#             )


# print()
# print("Statistics")
# print(f"  - status          : {solver.StatusName(status)}")
# print(f"  - conflicts       : {solver.NumConflicts()}")
# print(f"  - branches        : {solver.NumBranches()}")
# print(f"  - wall time       : {solver.WallTime()} s")
