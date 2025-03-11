import time

from ortools.sat.python import cp_model

# class SolverSolutionCallback(cp_model.CpSolverSolutionCallback):
#     def __init__(self, threshold: int) -> None:
#         cp_model.CpSolverSolutionCallback.__init__(self)
#         self._threshold: int = threshold
#         self._solution_count: int = 0
#         self._start_time = time.time()

#     def on_solution_callback(self) -> None:
#         current_time = time.time()
#         obj = self.objective_value
#         print(
#             f"Solution {self._solution_count}, time = "
#             + f"{current_time - self._start_time:.2f} s, objective = {obj:.0f}"
#         )
#         self._solution_count += 1
#         if obj <= self._threshold:
#             print(f"Threshold of {self._threshold} reached. Stopping search.")
#             self.StopSearch()


class SolverSolutionCallback(cp_model.CpSolverSolutionCallback):
    """Print intermediate solutions."""

    def __init__(self, limit: int | None = None) -> None:
        # cp_model.CpSolverSolutionCallback.__init__(self)
        super().__init__()
        self.__solution_count = 0
        self.__solution_limit = limit
        self._start_time = time.time()

    def on_solution_callback(self) -> None:
        self.__solution_count += 1
        # current_time = time.time()
        # obj = self.objective_value
        # print(
        #     f"Solution {self.__solution_count}, time = "
        #     + f"{current_time - self._start_time:.2f} s, objective = {obj:.0f}"
        # )
        if (
            self.__solution_limit is not None
            and self.__solution_count >= self.__solution_limit
        ):
            print(f"Stop search after {self.__solution_limit} solutions")
            self.stop_search()

    @property
    def solution_count(self) -> int:
        return self.__solution_count
