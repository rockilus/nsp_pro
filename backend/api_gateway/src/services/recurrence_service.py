# from typing import List, Tuple

# from shared.schemas.core import Assignment, RecurrenceRule, ShiftType

# from src.services.base_service import BaseService


# # pylint: disable=too-few-public-methods
# class RecurrenceService(BaseService):
#     def create_recurrence_rule(
#         self, recurrence_rule: RecurrenceRule, assignment: Assignment
#     ) -> Tuple[RecurrenceRule, List[Assignment]]:
#         # Check if the shift type is duty
#         shift = self.collection.shift_db.get_shift_by_id(assignment.shift_id)
#         if shift is None:
#             raise ValueError(
#                 f"Shift with ID {assignment.shift_id} does not exist."
#             )
#         if shift.shift_type != ShiftType.DUTY:
#             raise ValueError(
#                 f"Shift with ID {assignment.shift_id} is not of type DUTY."
#             )

#         # Create the recurrence rule
#         recurrence_rule_saved = (
#             self.collection.recurrence_db.create_recurrence_rule(
#                 recurrence_rule
#             )
#         )

#         # Create the assignments based on the recurrence rule
#         assignments = (
#             self.collection.assignment_db.create_assignments_from_recurrence(
#                 assignment, recurrence_rule_saved
#             )
#         )

#         return recurrence_rule_saved, assignments
