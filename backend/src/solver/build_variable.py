from datetime import datetime, timedelta
from typing import List

from models import Variable, VariableParam
from scripts.setup_database import (
    shift_db,
    shift_param_db,
    shift_property_db,
    variable_db,
    variable_param_db,
    worker_db,
    worker_param_db,
    worker_property_db,
)


class BuildVariable:
    def get_variable_params_dict(self) -> List:
        variable = variable_db.get_variable()
        variable_params = variable_param_db.get_variable_params_by_variable(variable)
        variable_params_dict = [
            variable_param.to_dict() for variable_param in variable_params
        ]
        return variable_params_dict

    def build_variable(self) -> None:
        workers = self.get_workers()
        shifts = self.get_shifts()
        days = self.get_days()
        variable = self.get_variable()
        variable_params = self.get_variable_params(variable)
        if len(variable_params) == 0:
            variable_params = self.create_variable_params(
                workers, shifts, days, variable
            )
        print("end")

    def get_workers(self) -> List[str]:
        workers = worker_db.get_workers()
        workers_out = []
        for worker in workers:
            worker_param_first_name = worker_param_db.get_worker_param_by_name(
                "first_name"
            )
            worker_param_last_name = worker_param_db.get_worker_param_by_name(
                "last_name"
            )
            worker_property_first_name = (
                worker_property_db.get_worker_property_by_worker_and_param(
                    worker, worker_param_first_name
                )
            )
            worker_property_last_name = (
                worker_property_db.get_worker_property_by_worker_and_param(
                    worker, worker_param_last_name
                )
            )
            worker_property_first_name_dict = worker_property_first_name.to_dict()
            worker_property_last_name_dict = worker_property_last_name.to_dict()
            worker_out = (
                worker_property_first_name_dict["value"]
                + " "
                + worker_property_last_name_dict["value"]
            )
            workers_out.append(worker_out)
        return workers_out

    def get_shifts(self) -> List[str]:
        shifts = shift_db.get_shifts()
        shifts_out = []
        for shift in shifts:
            shift_param_name = shift_param_db.get_shift_param_by_name("shift_name")
            shift_property_name = (
                shift_property_db.get_shift_property_by_shift_and_param(
                    shift, shift_param_name
                )
            )
            shift_property_name_dict = shift_property_name.to_dict()
            shift_out = shift_property_name_dict["value"]
            shifts_out.append(shift_out)
        return shifts_out

    def get_days(self) -> List:
        start_date_iso = "2023-09-04"
        end_date_iso = "2023-09-17"
        date_format = "%Y-%m-%d"
        start_date = datetime.fromisoformat(start_date_iso)
        end_date = datetime.fromisoformat(end_date_iso)
        delta = end_date - start_date
        dates = [start_date + timedelta(days=i) for i in range(delta.days + 1)]
        return [date.strftime(date_format) for date in dates]

    def get_variable(self) -> Variable:
        variable = variable_db.get_variable()
        if not variable:
            variable = variable_db.create_variable()
        return variable

    def get_variable_params(self, variable: Variable) -> List[VariableParam]:
        variable_params = variable_param_db.get_variable_params_by_variable(variable)
        return variable_params

    def create_variable_params(
        self,
        workers: List[str],
        shifts: List[str],
        days: List[str],
        variable: Variable,
    ) -> List[VariableParam]:
        variable_param_worker = variable_param_db.create_variable_param(
            name="worker",
            index=0,
            value_options=workers,
            variable=variable,
        )
        variable_param_day = variable_param_db.create_variable_param(
            name="day",
            index=1,
            value_options=days,
            variable=variable,
        )
        variable_param_shift = variable_param_db.create_variable_param(
            name="shift",
            index=2,
            value_options=shifts,
            variable=variable,
        )
        return [
            variable_param_worker,
            variable_param_shift,
            variable_param_day,
        ]
