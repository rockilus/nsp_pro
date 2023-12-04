import os
import time
from datetime import date, timedelta
from typing import List

from engine.model.model import Model
from engine.output import Output
from engine.save_benchmarks import save_benchmark_to_csv
from engine.save_model import save_model_to_text
from engine.types.input_output_types import Inputs, Outputs
from utils.constants import Constants


class Engine:
    # pylint: disable=too-few-public-methods
    def solve(self, inputs: Inputs) -> Outputs:
        workers = inputs.variable_space.workers
        days = Engine._build_day_coordinates(
            inputs.variable_space.start_date, inputs.variable_space.end_date
        )
        shifts = inputs.variable_space.shifts
        print("Start date: ", inputs.variable_space.start_date)
        print("End date: ", inputs.variable_space.end_date)
        model = Model(workers, days, shifts)
        start_time = time.time()
        model.set_up_model(inputs)
        end_time = time.time()
        print("Time to set up model: ", end_time - start_time)
        model.solve()
        save_model_to_text(
            model.model,
            os.getcwd()
            + Constants.ENGINE_SAVED_FILE_PATH
            + Constants.MODEL_SAVED_FILE_NAME,
        )
        save_benchmark_to_csv(inputs, model)
        output = Output(model)
        return output.build_outputs()

    @staticmethod
    def _build_day_coordinates(start_date: date, end_date: date) -> List[str]:
        date_format = "%Y-%m-%d"
        delta = end_date - start_date
        dates = [start_date + timedelta(days=i) for i in range(delta.days + 1)]
        return [date.strftime(date_format) for date in dates]
