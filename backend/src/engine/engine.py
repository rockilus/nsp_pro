from datetime import date, timedelta
from typing import List

from engine.inputs_outputs import Inputs, Outputs
from engine.model import Model
from engine.output import Output


class Engine:
    # pylint: disable=too-few-public-methods
    def solve(self, inputs: Inputs) -> Outputs:
        workers = inputs.variable_space.workers
        days = Engine._build_day_coordinates(
            inputs.variable_space.start_date, inputs.variable_space.end_date
        )
        shifts = inputs.variable_space.shifts
        model = Model(workers, days, shifts)
        model.set_up_model(inputs)
        model.solve()
        # model.save_to_text(
        #     "/Users/felipekharaba/Documents/Documents – Felipe’s MacBook Pro/"
        #     + "Coding courses/Projects/nsp_pro/backend/src/engine/"
        # )
        output = Output(model)
        return output.build_outputs()

    @staticmethod
    def _build_day_coordinates(start_date: date, end_date: date) -> List[str]:
        date_format = "%Y-%m-%d"
        delta = end_date - start_date
        dates = [start_date + timedelta(days=i) for i in range(delta.days + 1)]
        return [date.strftime(date_format) for date in dates]
