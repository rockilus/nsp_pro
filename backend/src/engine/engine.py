from datetime import datetime, timedelta
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
        model.build_variables()
        model.add_exactly_one_shift_per_day_constraint()
        model.add_coverage_constraints(inputs.coverage.coverage)
        model.solve()
        output = Output(model)
        return output.build_outputs()

    @staticmethod
    def _build_day_coordinates(start_date_iso: str, end_date_iso: str) -> List[str]:
        date_format = "%Y-%m-%d"
        start_date = datetime.fromisoformat(start_date_iso)
        end_date = datetime.fromisoformat(end_date_iso)
        delta = end_date - start_date
        dates = [start_date + timedelta(days=i) for i in range(delta.days + 1)]
        return [date.strftime(date_format) for date in dates]
