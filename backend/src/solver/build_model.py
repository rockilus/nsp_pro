from datetime import datetime
from typing import Dict, List

from ortools.sat.python import cp_model  # type: ignore
from models import Hospital, User
from utils import Constants

# https://github.com/google/or-tools/blob/stable/examples/python/shift_scheduling_sat.py


# pylint: disable=too-many-instance-attributes
# pylint: disable=too-few-public-methods
class ModelData:
    def __init__(
        self,
        hospital: Hospital,
        users: List[User],
        start_date: datetime,
        end_date: datetime,
    ) -> None:
        self.hospital = hospital
        self.users = users
        self.num_users = len(users)
        shift_types_from_db = hospital.profile.get("duty_options")
        if shift_types_from_db is None:
            raise KeyError("No key duty_options found in hospital.profile")
        self.shift_types = ["off"] + list(shift_types_from_db.keys())  # type: ignore
        self.num_days_week = Constants.NUM_DAYS_WEEK
        # self.num_weeks = hospital.parameters.nb_weeks
        self.num_days = (end_date - start_date).days + 1
        self.start_day_of_week = start_date.weekday()
        self.num_shifts_day = 1
        self.num_shift_types = len(self.shift_types)
        staffing_from_db = shift_types_from_db.get("on").get("staffing")  # type: ignore
        if staffing_from_db is None:
            raise KeyError("No key duty_options.on.staffing found in hospital.profile")
        self.staffing = int(staffing_from_db)
        self.weekly_cover_demands = [
            (self.staffing,),  # Monday
            (self.staffing,),  # Tuesday
            (self.staffing,),  # Wednesday
            (self.staffing,),  # Thursday
            (self.staffing,),  # Friday
            (self.staffing,),  # Saturday
            (self.staffing,),  # Sunday
        ]
        self.excess_cover_penalties = (2,)
        self.work: Dict[tuple, cp_model.IntVar] = {}

        # Linear terms of the objective in a minimization context.
        self.obj_int_vars: List[cp_model.IntVar] = []
        self.obj_int_coeffs: List[int] = []


class BuildModel:
    def __init__(self, model_data: ModelData) -> None:
        self.model = cp_model.CpModel()
        self.model_data = model_data
        self.model_file_path = (
            "/Users/felipekharaba/Library/Mobile Documents/com~apple~CloudDocs"
            + "/Documents/Documents – Felipe’s MacBook Pro/Coding courses"
            + "/Projects/nsp_pro/backend/saved_model.proto"
        )

    def __call__(
        self,
    ) -> cp_model.CpModel:
        self.create_variables()
        self.create_constraints()
        self.save_model(self.model_file_path)

        return self.model

    def create_variables(self) -> None:
        for u in range(self.model_data.num_users):
            for d in range(self.model_data.num_days):
                for s in range(self.model_data.num_shifts_day):
                    for t in range(self.model_data.num_shift_types):
                        self.model_data.work[(u, d, s, t)] = self.model.NewBoolVar(
                            f"shift_n{u}d{d}s{s}t{t}"
                        )

    def create_constraints(self) -> None:
        # Exactly one shift per day.
        for u in range(self.model_data.num_users):
            for d in range(self.model_data.num_days):
                self.model.AddExactlyOne(
                    self.model_data.work[u, d, s, t]
                    for s in range(self.model_data.num_shifts_day)
                    for t in range(self.model_data.num_shift_types)
                )

        # Cover constraints
        for s in range(self.model_data.num_shifts_day):
            for t in range(1, self.model_data.num_shift_types):
                for d in range(self.model_data.num_days):
                    works = [
                        self.model_data.work[u, d, s, t]
                        for u in range(self.model_data.num_users)
                    ]
                    # Ignore Off shift.
                    min_demand = self.model_data.weekly_cover_demands[
                        (d + self.model_data.start_day_of_week)
                        % self.model_data.num_days_week
                    ][t - 1]
                    worked = self.model.NewIntVar(
                        min_demand, self.model_data.num_users, ""
                    )
                    self.model.Add(worked == sum(works))  # type: ignore
                    over_penalty = self.model_data.excess_cover_penalties[s - 1]
                    if over_penalty > 0:
                        name = "excess_demand(" + f"day={d}, " + f"shift={s}, type={t})"
                        excess = self.model.NewIntVar(
                            0, self.model_data.num_users - min_demand, name
                        )
                        self.model.Add(excess == worked - min_demand)
                        self.model_data.obj_int_vars.append(excess)
                        self.model_data.obj_int_coeffs.append(over_penalty)

        # Max working days per week.
        for u in range(self.model_data.num_users):
            for s in range(self.model_data.num_shifts_day):
                for t in range(self.model_data.num_shift_types):
                    works = []
                    for d in range(self.model_data.num_days):
                        if (
                            d + self.model_data.start_day_of_week
                        ) % self.model_data.num_days_week == 0 and len(works) > 0:
                            max_days = self.model.NewIntVar(0, 5, "")
                            self.model.Add(max_days == sum(works))  # type: ignore
                            works = []
                        works.append(self.model_data.work[u, d, s, t])
        max_days = self.model.NewIntVar(0, 5, "")
        self.model.Add(max_days == sum(works))  # type: ignore

    def create_objective(self) -> None:
        # Objective
        self.model.Minimize(
            sum(
                self.model_data.obj_int_vars[i] * self.model_data.obj_int_coeffs[i]
                for i in range(len(self.model_data.obj_int_vars))
            )
        )

    def save_model(self, model_file_path: str) -> None:
        with open(model_file_path, "w", encoding="utf-8") as text_file:
            text_file.write(str(self.model))
