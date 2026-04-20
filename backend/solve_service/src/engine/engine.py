import time

from engine.model.model import Model
from engine.output import Output

# from engine.save_benchmarks import save_benchmark_to_csv
# from engine.save_model import save_model_to_text
from engine.types import Inputs, Outputs

# from utils.constants import Constants


class Engine:
    # pylint: disable=too-few-public-methods
    def solve(self, inputs: Inputs) -> Outputs:
        model = Model(inputs.model_config)
        start_time = time.time()
        # model.set_up_model(inputs)

        # Save inputs to a JSON file
        # inputs_file_path = os.path.join(current_path, "inputs.json")
        # with open(inputs_file_path, "w", encoding="utf-8") as inputs_file:
        #     json.dump(inputs.to_dict(), inputs_file, indent=4)
        # print(f"Inputs saved to {inputs_file_path}")

        model.solve_campaign(inputs)
        end_time = time.time()
        print("Time to set up model: ", end_time - start_time)
        # model.solve()
        print(f"Branches:        {model.solver.NumBranches()}")
        print(f"Wall time:       {model.solver.WallTime()} s")
        print(f"Objective value: {model.solver.ObjectiveValue()}")
        print(f"Status:          {model.solver.StatusName(model.status)}")
        # save_model_to_text(
        #     model.model,
        #     os.getcwd()
        #     + Constants.ENGINE_SAVED_FILE_PATH
        #     + Constants.MODEL_SAVED_FILE_NAME,
        # )
        # save_benchmark_to_csv(inputs, model)
        output = Output(model)
        return output.build_outputs()
