# import random
# from datetime import date
# from typing import Callable

# from engine.tests.engine_test import TestEngine

# # pylint: disable=unused-import
# from engine.tests.test_mode_fixture_test import set_test_mode  # noqa: F401
# from engine.types.input_output_types import (
#     Coverage,
#     Inputs,
#     Outputs,
#     ShiftDemand,
# )


# # pylint: disable=R0801
# class TestCoverage(TestEngine):
#     def test_expected_assigment_coverage(
#         self, inputs: Inputs, engine_solve: Callable[[Inputs], Outputs]
#     ) -> None:
#         target_coverage = random.randint(1, 8)
#         coverage = Coverage(
#             coverage=[
#                 ShiftDemand(
#                     date=date.fromisoformat("2023-10-02"),
#                     shift_id="s0",
#                     nb_times_shift=target_coverage,
#                 ),
#             ]
#         )
#         inputs.coverage = coverage
#         outputs = engine_solve(inputs)
#         assignments = outputs.assignments

#         count = sum(
#             1
#             for a in assignments
#             if a.date == date.fromisoformat("2023-10-02")
#             and a.shift_id == "s0"
#         )

#         assert count == target_coverage

#     def test_expected_assigment_coverage_with_specialty(
#         self, inputs: Inputs, engine_solve: Callable[[Inputs], Outputs]
#     ) -> None:
#         target_coverage = random.randint(1, 3)
#         coverage = Coverage(
#             coverage=[
#                 ShiftDemand(
#                     date=date.fromisoformat("2023-10-02"),
#                     shift_id="s1",
#                     nb_times_shift=1,
#                 ),
#             ]
#         )
#         inputs.coverage = coverage
#         inputs.variable_space.shifts[1].staffing = [
#             Staffing(specialty_id="chir", staffing=target_coverage)
#         ]
#         for worker in inputs.variable_space.workers[0:3]:
#             worker.specialty_ids = ["chir"]
#         outputs = engine_solve(inputs)
#         assignments = outputs.assignments

#         count_spe = sum(
#             1
#             for a in assignments
#             if a.worker_id in ["w0", "w1", "w2"]
#             and a.date == date.fromisoformat("2023-10-02")
#             and a.shift_id == "s1"
#         )
#         count_not_spe = sum(
#             1
#             for a in assignments
#             if a.worker_id not in ["w0", "w1", "w2"]
#             and a.date == date.fromisoformat("2023-10-02")
#             and a.shift_id == "s1"
#         )

#         assert count_spe == target_coverage
#         assert count_not_spe == 0

#     def test_expected_assigment_coverage_with_specialty_q1_diff_q2(
#         self, inputs: Inputs, engine_solve: Callable[[Inputs], Outputs]
#     ) -> None:
#         target_staffing_spe_1 = random.randint(1, 3)
#         target_staffing_spe_2 = random.randint(1, 3)
#         coverage = Coverage(
#             coverage=[
#                 ShiftDemand(
#                     date=date.fromisoformat("2023-10-02"),
#                     shift_id="s1",
#                     nb_times_shift=1,
#                 ),
#                 ShiftDemand(
#                     date=date.fromisoformat("2023-10-02"),
#                     shift_id="s2",
#                     nb_times_shift=1,
#                 ),
#             ]
#         )
#         inputs.coverage = coverage
#         inputs.variable_space.shifts[1].staffing = [
#             Staffing(specialty_id="spe_1", staffing=target_staffing_spe_1)
#         ]
#         inputs.variable_space.shifts[2].staffing = [
#             Staffing(specialty_id="spe_2", staffing=target_staffing_spe_2)
#         ]
#         for worker in inputs.variable_space.workers[0:3]:
#             worker.specialty_ids = ["spe_1"]
#         for worker in inputs.variable_space.workers[3:6]:
#             worker.specialty_ids = ["spe_2"]
#         outputs = engine_solve(inputs)
#         assignments = outputs.assignments

#         count_spe_1 = sum(
#             1
#             for a in assignments
#             if a.worker_id in ["w0", "w1", "w2"]
#             and a.date == date.fromisoformat("2023-10-02")
#             and a.shift_id == "s1"
#         )
#         count_spe_2 = sum(
#             1
#             for a in assignments
#             if a.worker_id in ["w3", "w4", "w5"]
#             and a.date == date.fromisoformat("2023-10-02")
#             and a.shift_id == "s2"
#         )
#         count_not_spe = sum(
#             1
#             for a in assignments
#             if a.worker_id not in ["w0", "w1", "w2", "w3", "w4", "w5"]
#             and a.date == date.fromisoformat("2023-10-02")
#             and a.shift_id in ["s1", "s2"]
#         )

#         assert count_spe_1 == target_staffing_spe_1
#         assert count_spe_2 == target_staffing_spe_2
#         assert count_not_spe == 0

#     def test_expected_assigment_coverage_with_specialty_q1_overlap_q2(
#         self, inputs: Inputs, engine_solve: Callable[[Inputs], Outputs]
#     ) -> None:
#         target_staffing_spe_1 = random.randint(1, 3)
#         target_staffing_spe_2 = random.randint(1, 3)
#         target_staffing_spe_1_2 = 1
#         coverage = Coverage(
#             coverage=[
#                 ShiftDemand(
#                     date=date.fromisoformat("2023-10-02"),
#                     shift_id="s1",
#                     nb_times_shift=1,
#                 ),
#                 ShiftDemand(
#                     date=date.fromisoformat("2023-10-02"),
#                     shift_id="s2",
#                     nb_times_shift=1,
#                 ),
#                 ShiftDemand(
#                     date=date.fromisoformat("2023-10-02"),
#                     shift_id="s3",
#                     nb_times_shift=1,
#                 ),
#             ]
#         )
#         inputs.coverage = coverage
#         inputs.variable_space.shifts[1].staffing = [
#             Staffing(specialty_id="spe_1", staffing=target_staffing_spe_1)
#         ]
#         inputs.variable_space.shifts[2].staffing = [
#             Staffing(specialty_id="spe_1", staffing=target_staffing_spe_1_2),
#             Staffing(specialty_id="spe_2", staffing=target_staffing_spe_1_2),
#         ]
#         inputs.variable_space.shifts[3].staffing = [
#             Staffing(specialty_id="spe_2", staffing=target_staffing_spe_2)
#         ]
#         for worker in inputs.variable_space.workers[0:2]:
#             worker.specialty_ids = ["spe_1"]
#         for worker in inputs.variable_space.workers[2:4]:
#             worker.specialty_ids = ["spe_1", "spe_2"]
#         for worker in inputs.variable_space.workers[4:6]:
#             worker.specialty_ids = ["spe_2"]
#         outputs = engine_solve(inputs)
#         assignments = outputs.assignments

#         count_spe_1 = sum(
#             1
#             for a in assignments
#             if a.worker_id in ["w0", "w1", "w2", "w3"]
#             and a.date == date.fromisoformat("2023-10-02")
#             and a.shift_id == "s1"
#         )
#         count_spe_1_2 = sum(
#             1
#             for a in assignments
#             if a.worker_id in ["w0", "w1", "w2", "w3", "w4", "w5"]
#             and a.date == date.fromisoformat("2023-10-02")
#             and a.shift_id == "s2"
#         )
#         count_spe_2 = sum(
#             1
#             for a in assignments
#             if a.worker_id in ["w2", "w3", "w4", "w5"]
#             and a.date == date.fromisoformat("2023-10-02")
#             and a.shift_id == "s3"
#         )
#         count_not_spe = sum(
#             1
#             for a in assignments
#             if a.worker_id not in ["w0", "w1", "w2", "w3", "w4", "w5"]
#             and a.date == date.fromisoformat("2023-10-02")
#             and a.shift_id in ["s1", "s2", "s3"]
#         )
#         print(
#             "target",
#             target_staffing_spe_1,
#             "| count",
#             count_spe_1,
#         )
#         print(
#             "target",
#             target_staffing_spe_1_2 * 2,
#             "| count",
#             count_spe_1_2,
#         )
#         print(
#             "target",
#             target_staffing_spe_2,
#             "| count",
#             count_spe_2,
#         )

#         assert count_spe_1 == target_staffing_spe_1
#         assert count_spe_1_2 == target_staffing_spe_1_2 * 2
#         assert count_spe_2 == target_staffing_spe_2
#         assert count_not_spe == 0

#     def test_expected_assigment_coverage_with_specialty_q2_in_q1(
#         self, inputs: Inputs, engine_solve: Callable[[Inputs], Outputs]
#     ) -> None:
#         target_staffing_spe_1 = random.randint(1, 3)
#         target_staffing_spe_2 = random.randint(1, 3)
#         coverage = Coverage(
#             coverage=[
#                 ShiftDemand(
#                     date=date.fromisoformat("2023-10-02"),
#                     shift_id="s1",
#                     nb_times_shift=1,
#                 ),
#                 ShiftDemand(
#                     date=date.fromisoformat("2023-10-02"),
#                     shift_id="s2",
#                     nb_times_shift=1,
#                 ),
#             ]
#         )
#         inputs.coverage = coverage
#         inputs.variable_space.shifts[1].staffing = [
#             Staffing(specialty_id="spe_1", staffing=target_staffing_spe_1)
#         ]
#         inputs.variable_space.shifts[2].staffing = [
#             Staffing(specialty_id="spe_2", staffing=target_staffing_spe_2)
#         ]
#         for worker in inputs.variable_space.workers[0:6]:
#             worker.specialty_ids = ["spe_1"]
#         for worker in inputs.variable_space.workers[3:6]:
#             worker.specialty_ids = ["spe_2"]
#         outputs = engine_solve(inputs)
#         assignments = outputs.assignments

#         count_spe_1 = sum(
#             1
#             for a in assignments
#             if a.worker_id in ["w0", "w1", "w2", "w3", "w4", "w5"]
#             and a.date == date.fromisoformat("2023-10-02")
#             and a.shift_id == "s1"
#         )
#         count_spe_2 = sum(
#             1
#             for a in assignments
#             if a.worker_id in ["w3", "w4", "w5"]
#             and a.date == date.fromisoformat("2023-10-02")
#             and a.shift_id == "s2"
#         )
#         count_not_spe = sum(
#             1
#             for a in assignments
#             if a.worker_id not in ["w0", "w1", "w2", "w3", "w4", "w5"]
#             and a.date == date.fromisoformat("2023-10-02")
#             and a.shift_id in ["s1", "s2"]
#         )

#         assert count_spe_1 == target_staffing_spe_1
#         assert count_spe_2 == target_staffing_spe_2
#         assert count_not_spe == 0
