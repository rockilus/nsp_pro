from core.constraint import TreeNode
from scripts.setup_database import shift_db, worker_db


def build_tree() -> TreeNode:
    shifts = shift_db.get_shifts()

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
    operator_node = TreeNode(
        name="operator",
        parent_options=["sum", "sequence"],
        options=["At least", "At most", "Exactly"],
        children=[quantity_node],
    )
    root = TreeNode(
        name="type",
        parent_options=[],
        options=["sum", "sequence"],
        children=[operator_node],
    )
    return root
