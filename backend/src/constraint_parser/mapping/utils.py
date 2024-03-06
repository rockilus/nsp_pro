from typing import Dict, List

from core.constraint import Block, DictBlockValue


def find_block_by_name(blocks: List[Block], name: str) -> Block | None:
    for block in blocks:
        if block.name == name:
            return block
    return None


def cast_to_dict_block_value(dict_obj: Dict) -> DictBlockValue:
    required_keys = {"name", "id", "id_type"}
    if set(dict_obj.keys()) == required_keys:
        return DictBlockValue(**dict_obj)
    raise ValueError("Invalid keys for DictBlockValue")
