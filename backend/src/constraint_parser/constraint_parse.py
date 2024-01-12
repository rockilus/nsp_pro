from core.constraint import Constraint, ConstraintBuild
from scripts.setup_database import shift_db
from constraint_parser.mapping.block_to_core import (
    build_constraint,
)
from constraint_parser.nlp.text_to_block import TextToBlock
from constraint_parser.nlp.patterns import build_patterns


def constraint_parse(cstr_build: ConstraintBuild) -> Constraint:
    shifts = shift_db.get_shifts()
    text_to_block = TextToBlock(
        build_patterns([s.name.lower() for s in shifts])
    )
    blocks = text_to_block(cstr_build.text)
    print(blocks)
    constraint = build_constraint(cstr_build, blocks)
    return constraint
