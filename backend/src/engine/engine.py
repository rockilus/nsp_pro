import json
import os
import time

from engine.model.model import Model
from engine.output import Output

# from engine.save_benchmarks import save_benchmark_to_csv
# from engine.save_model import save_model_to_text
from engine.types.input_output_types import Inputs, Outputs

# from utils.constants import Constants


class Engine:
    # pylint: disable=too-few-public-methods
    def solve(self, inputs: Inputs) -> Outputs:
        current_path = os.path.dirname(os.path.realpath(__file__))
        model_config_file_path = os.path.join(current_path, "model_config.json")
        with open(model_config_file_path, "r", encoding="utf-8") as penalties_file:
            model_config = json.load(penalties_file)
        model = Model(
            inputs.variable_space.workers,
            inputs.variable_space.all_days,
            inputs.variable_space.days_solving,
            inputs.variable_space.shifts,
            inputs.shift_durations,
            inputs.fixed_config,
            model_config,
        )
        start_time = time.time()
        # model.set_up_model(inputs)
        model.sequential_solve(inputs)
        end_time = time.time()
        print("Time to set up model: ", end_time - start_time)
        # model.solve()
        print(f"Branches:        {model.solver.NumBranches()}")
        print(f"Wall time:       {model.solver.WallTime()} s")
        print(f"Objective value: {model.solver.ObjectiveValue()}")
        print(f"Status:          {model.solver.StatusName()}")
        # save_model_to_text(
        #     model.model,
        #     os.getcwd()
        #     + Constants.ENGINE_SAVED_FILE_PATH
        #     + Constants.MODEL_SAVED_FILE_NAME,
        # )
        # save_benchmark_to_csv(inputs, model)
        output = Output(model)
        return output.build_outputs()
