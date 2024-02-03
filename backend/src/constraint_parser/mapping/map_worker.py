from typing import Dict, List

from constraint_parser.mapping.utils import (
    cast_to_dict_block_value,
    find_block_by_name,
)
from core.constraint import Block, ConstraintBuild, DictBlockValue, VarWorker
from core.worker import Worker
from utils.constants import Constants


class MapWorker:
    def __init__(self, workers: List[Worker], worker_dim_dict: Dict) -> None:
        self.workers = workers
        self.worker_dim_dict = worker_dim_dict

    def __call__(self, cstr_build: ConstraintBuild) -> VarWorker:
        values = self.get_worker_values(cstr_build.blocks)
        return VarWorker(
            selector=self.get_selector(values),
            target_ids=self.get_target_ids(values),
            num_eligible_workers=0,
        )

    def get_selector(
        self, values: List[DictBlockValue]
    ) -> Constants.VAR_WORKER_SELECTOR_OPTIONS:
        if any("all workers" in v.name for v in values):
            return "all"
        return "equal"

    def get_target_ids(self, values: List[DictBlockValue]) -> List[str]:
        if self.get_selector(values) == "all":
            return []
        out = []
        for value in values:
            if value.id_type == "worker":
                if not self.check_worker_id(value.id):
                    raise ValueError(
                        f"Worker {value.name} with id {value.id} not found"
                    )
                out.append(value.id)
            else:
                if value.id not in self.worker_dim_dict:
                    raise ValueError(f"Worker dimension {value.id} not found")
                if value.name.lower() not in self.worker_dim_dict[value.id]:
                    raise ValueError(
                        f"Worker property {value.name} for dimension {value.id} not found"
                    )
                out += self.worker_dim_dict[value.id][value.name.lower()]
        return sorted(list(set(out)))

    def check_worker_id(self, worker_id: str) -> bool:
        return any(w.id == worker_id for w in self.workers)

    @staticmethod
    def get_worker_values(blocks: List[Block]) -> List[DictBlockValue]:
        worker_block = find_block_by_name(blocks, "worker")
        if worker_block:
            if isinstance(worker_block.value, list) and all(
                isinstance(v, dict) for v in worker_block.value
            ):
                return [
                    cast_to_dict_block_value(v) for v in worker_block.value  # type: ignore
                ]
            raise ValueError("Worker block value is not a list of dicts")
        raise ValueError("Worker block not found")
