import os

# from google.protobuf import text_format  # type: ignore
from ortools.sat.python import cp_model  # type: ignore


def save_model_to_text(model: cp_model.CpModel, file_path: str) -> None:
    # model_file_path = os.path.join(directory_path, "model.txt")
    # model_file_path_alt = os.path.join(directory_path, "model_alt.txt")
    # # solver_file_path = os.path.join(directory_path, "solver.txt")
    # with open(model_file_path, "w", encoding="utf-8") as text_file:
    #     text_file.write(str(self.model))
    if os.environ.get("TEST_MODE") is not None:
        return
    model.ExportToFile(file_path)
    # with open(solver_file_path, "w", encoding="utf-8") as text_file:
    #     text_file.write(str(self.solution_printer))
