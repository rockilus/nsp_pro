from dataclasses import asdict
from typing import List

import humps
from constraint_parser import build_templates
from core.constraint import ConstraintTemplate
from fastapi import APIRouter
from pydantic import TypeAdapter
from routes.api_model import ConstraintTemplateMessage

router = APIRouter()


@router.get("/constraint-templates")
def get_constraint_templates() -> List[ConstraintTemplateMessage]:
    return [constraint_template_to_api_msg(ct) for ct in build_templates()]


# def constraint_template_block_to_api_msg(
#     constraint_template_block: ConstraintTemplateBlock,
# ) -> ConstraintTemplateBlockMessage:
#     data = asdict(constraint_template_block)
#     as_dict = humps.camelize(data)
#     validator = TypeAdapter(ConstraintTemplateBlockMessage)
#     return validator.validate_python(as_dict)


def constraint_template_to_api_msg(
    constraint_template: ConstraintTemplate,
) -> ConstraintTemplateMessage:
    data = asdict(constraint_template)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(ConstraintTemplateMessage)
    return validator.validate_python(as_dict)
