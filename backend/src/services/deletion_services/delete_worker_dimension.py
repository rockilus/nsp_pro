from scripts.setup_database import (
    worker_dimension_db,
    worker_property_db,
    constraint_build_db,
)
from core.constraint import Block
from services.constraint_build_services.blocks_to_string import (
    blocks_to_string,
)


def delete_worker_dimension(wd_id: str) -> None:
    delete_worker_dimension_from_constraint_build(wd_id)
    worker_property_db.delete_worker_properties_by_worker_dimension_id(wd_id)
    worker_dimension_db.delete_worker_dimension(wd_id)


def delete_worker_dimension_from_constraint_build(wd_id: str) -> None:
    cbs = constraint_build_db.get_constraint_builds_by_worker_dimension_id(
        wd_id
    )
    for cb in cbs:
        new_blocks = []
        skip_to_next_cb = False
        for block in cb.blocks:
            if block.name == "worker":
                new_value = [
                    v
                    for v in block.value  # type: ignore
                    if v["id"] != wd_id  # type: ignore
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
                    constraint_build_db.delete_constraint_build(cb.id)
                    skip_to_next_cb = True
                    break
            else:
                new_blocks.append(block)
        if skip_to_next_cb:
            continue
        cb.blocks = new_blocks
        cb.text = blocks_to_string(new_blocks)
        constraint_build_db.update_constraint_build(cb)
