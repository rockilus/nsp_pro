from typing import List

from core.constraint import Block, ConstraintBuild
from scripts.setup_database import constraint_build_db
from services.constraint_build_services.blocks_to_string import blocks_to_string
from services.deletion_services.delete_constraint_build import delete_constraint_build


def delete_item_with_id_from_constraint_build(
    item_id: str, cbs: List[ConstraintBuild], block_name: str
) -> None:
    for cb in cbs:
        new_blocks = []
        skip_to_next_cb = False
        for block in cb.blocks:
            if block.name == block_name:
                new_value = [
                    v
                    for v in block.value  # type: ignore
                    if v["id"] != item_id  # type: ignore
                ]
                if new_value:
                    new_blocks.append(
                        Block(
                            name=block.name,
                            type=block.type,
                            value=new_value,  # type: ignore
                        )
                    )
                else:
                    delete_constraint_build(cb.id)
                    skip_to_next_cb = True
                    break
            else:
                new_blocks.append(block)
        if skip_to_next_cb:
            continue
        cb.blocks = new_blocks
        cb.text = blocks_to_string(new_blocks)
        constraint_build_db.update_constraint_build(cb)
