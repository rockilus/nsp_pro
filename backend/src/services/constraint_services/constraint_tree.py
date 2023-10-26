from typing import List

from core.constraint import TreeNode
from core.shift import Shift
from scripts.setup_database import shift_db


def build_tree() -> TreeNode:
    shifts = shift_db.get_shifts()

    root = TreeNode(
        name="type",
        parent_options=[],
        options=["sum", "sequence", "order"],
        children=[
            _build_constraint_sum_tree(shifts),
            _build_constraint_seq_tree(shifts),
            _build_constraint_ord_tree(shifts),
        ],
    )
    return root


def _build_constraint_sum_tree(shifts: List[Shift]) -> TreeNode:
    day_node = TreeNode(
        name="day",
        parent_options=[s.id for s in shifts],
        options=["week"],
        children=[],
    )
    shift_node = TreeNode(
        name="shift_id",
        parent_options=[f"{i}" for i in range(10)],
        options=[s.id for s in shifts],
        children=[day_node],
    )
    quantity_node = TreeNode(
        name="quantity",
        parent_options=["At least", "At most", "Exactly"],
        options=[f"{i}" for i in range(10)],
        children=[shift_node],
    )
    root_sum = TreeNode(
        name="operator",
        parent_options=["sum"],
        options=["At least", "At most", "Exactly"],
        children=[quantity_node],
    )
    return root_sum


def _build_constraint_seq_tree(shifts: List[Shift]) -> TreeNode:
    shift_node = TreeNode(
        name="shift_id",
        parent_options=[f"{i}" for i in range(10)],
        options=[s.id for s in shifts],
        children=[],
    )
    quantity_node = TreeNode(
        name="quantity",
        parent_options=["At least", "At most", "Exactly"],
        options=[f"{i}" for i in range(10)],
        children=[shift_node],
    )
    root_seq = TreeNode(
        name="operator",
        parent_options=["sequence"],
        options=["At least", "At most", "Exactly"],
        children=[quantity_node],
    )
    return root_seq


def _build_constraint_ord_tree(shifts: List[Shift]) -> TreeNode:
    shift_reference_node = TreeNode(
        name="shift_id_reference",
        parent_options=[f"{i}" for i in range(-3, 4)],
        options=[s.id for s in shifts],
        children=[],
    )
    quantity_node = TreeNode(
        name="quantity",
        parent_options=[s.id for s in shifts],
        options=[f"{i}" for i in range(-3, 4)],
        children=[shift_reference_node],
    )
    shift_relative_node = TreeNode(
        name="shift_id_relative",
        parent_options=["Yes", "No"],
        options=[s.id for s in shifts],
        children=[quantity_node],
    )
    root_ord = TreeNode(
        name="operator",
        parent_options=["order"],
        options=["Yes", "No"],
        children=[shift_relative_node],
    )
    return root_ord
