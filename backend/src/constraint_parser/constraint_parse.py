from constraint_parser.mapping.block_to_core import build_constraint
from constraint_parser.nlp.nlp_new import NLPNew
from constraint_parser.nlp.patterns import build_patterns
from constraint_parser.nlp.text_to_block import TextToBlock
from core.constraint import Constraint, ConstraintBuild
from scripts.setup_database import (
    shift_db,
    worker_db,
    shift_dimension_db,
    worker_dimension_db,
)


def constraint_parse(cstr_build: ConstraintBuild) -> Constraint:
    shifts = shift_db.get_shifts()
    workers = worker_db.get_workers()
    shift_dimensions = shift_dimension_db.get_shift_dimensions()
    worker_dimensions = worker_dimension_db.get_worker_dimensions()
    # text_to_block = TextToBlock(
    #     build_patterns([s.name.lower() for s in shifts])
    # )
    # blocks = text_to_block(cstr_build.text)
    nlp = NLPNew(
        build_patterns(
            [s.name.lower() for s in shifts],
            [w.name.lower() for w in workers],
            [sd.name.lower() for sd in shift_dimensions],
            [wd.name.lower() for wd in worker_dimensions],
        )
    )
    blocks = nlp(cstr_build.text)
    print(blocks)
    constraint = build_constraint(cstr_build, blocks)
    return constraint
