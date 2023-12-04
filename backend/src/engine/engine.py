import os
import time

from engine.model.model import Model
from engine.output import Output
from engine.save_benchmarks import save_benchmark_to_csv
from engine.save_model import save_model_to_text
from engine.types.input_output_types import Inputs, Outputs
from utils.constants import Constants


class Engine:
    # pylint: disable=too-few-public-methods
    def solve(self, inputs: Inputs) -> Outputs:
        model = Model(
            inputs.variable_space.workers,
            inputs.variable_space.days,
            inputs.variable_space.shifts,
        )
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
