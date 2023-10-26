from dataclasses import asdict

import humps
from fastapi import APIRouter
from pydantic import TypeAdapter

from core.constraint import TreeNode
from routes.api_model import TreeNodeMessage
from services import build_tree

router = APIRouter()


@router.get("/constraint-tree")
def get_constraint_tree():
    constraint_tree = build_tree()
    return tree_to_api_msg(constraint_tree)


def tree_to_api_msg(tree: TreeNode) -> TreeNodeMessage:
    tree_children_message = [tree_to_api_msg(tn) for tn in tree.children]
    data = asdict(tree)
    data["children"] = tree_children_message
    as_dict = humps.camelize(data)
    validator = TypeAdapter(TreeNodeMessage)
    return validator.validate_python(as_dict)
