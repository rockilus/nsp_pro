from typing import List

from core import Block


def blocks_to_string(blocks: List[Block]) -> str:
    values = []
    for block in blocks:
        if isinstance(block.value, list):
            block_values = block.value
            if all(isinstance(v, dict) for v in block.value):
                block_values = [v["name"] for v in block_values]  # type: ignore
            if len(block_values) > 1 and all(
                isinstance(v, str) for v in block_values
            ):
                values.append(
                    ', '.join(block_values[:-1])  # type: ignore
                    + ' and '
                    + block_values[-1]
                )
            elif isinstance(block_values[0], str):
                values.append(block_values[0])
        else:
            values.append(str(block.value))
    joined_values = ' '.join(values)
    capitalized_values = joined_values.capitalize()
    return capitalized_values + '.'
