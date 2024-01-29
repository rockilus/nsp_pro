from typing import List

from core.constraint import Block


def find_block_by_name(blocks: List[Block], name: str) -> Block | None:
    for block in blocks:
        if block.name == name:
            return block
    return None


def list_dicts_to_dict(list_of_dicts):
    out = {}
    for d in list_of_dicts:
        for k, v in d.items():
            k = k.lower()
            v = v.lower()
            if k not in out:
                out[k] = []
            if v not in out[k]:
                out[k].append(v)
    return out
