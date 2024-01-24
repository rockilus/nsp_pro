from dataclasses import asdict
from typing import List

import humps
from fastapi import APIRouter
from pydantic import TypeAdapter

from constraint_parser.templates import build_templates
from core.constraint import Template
from routes.api_model import TemplateMessage

router = APIRouter()


@router.get("/constraint-templates")
def get_constraint_templates() -> List[TemplateMessage]:
    return [constraint_template_to_api_msg(ct) for ct in build_templates()]


# def constraint_template_block_to_api_msg(
#     constraint_template_block: ConstraintTemplateBlock,
# ) -> ConstraintTemplateBlockMessage:
#     data = asdict(constraint_template_block)
#     as_dict = humps.camelize(data)
#     validator = TypeAdapter(ConstraintTemplateBlockMessage)
#     return validator.validate_python(as_dict)


def constraint_template_to_api_msg(
    constraint_template: Template,
) -> TemplateMessage:
    data = asdict(constraint_template)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(TemplateMessage)
    return validator.validate_python(as_dict)
