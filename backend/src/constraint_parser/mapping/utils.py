from typing import List

from core import Block


def find_block_by_name(blocks: List[Block], name: str) -> Block | None:
    for block in blocks:
        if block.name == name:
            return block
    return None
