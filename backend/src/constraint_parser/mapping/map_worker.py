from typing import Dict, List

from constraint_parser.mapping.utils import (
    find_block_by_name,
    list_dicts_to_dict,
)
from core.constraint import Block, ConstraintBuild, VarWorker
from core.worker import Worker
from utils.constants import Constants


class MapWorker:
    def __init__(self, workers: List[Worker], worker_dim_dict: Dict) -> None:
        self.workers = workers
        self.worker_dim_dict = worker_dim_dict

    def __call__(self, cstr_build: ConstraintBuild) -> VarWorker:
        return VarWorker(
            operator="",
            selector=self.get_worker_selector(cstr_build.blocks),
            target_ids=self.get_target_ids(cstr_build.blocks),
            num_eligible_workers=0,
        )

    def get_worker_selector(
        self, blocks: List[Block]
    ) -> Constants.VAR_WORKER_SELECTOR_OPTIONS:
        worker_block = find_block_by_name(blocks, "worker")
        if worker_block:
            if isinstance(worker_block.value, list) and all(
                isinstance(w, dict) for w in worker_block.value
            ):
                if any(
                    "all workers" in w.values()  # type: ignore
                    for w in worker_block.value
                ):
                    return "all"
                return "equal"
            raise ValueError("Worker block value is not a list of dicts")
        raise ValueError("Worker block not found")

    def get_target_ids(self, blocks: List[Block]) -> List[str]:
        if self.get_worker_selector(blocks) == "all":
            return []
        worker_block = find_block_by_name(blocks, "worker")
        if worker_block:
            if not isinstance(worker_block.value, list):
                raise ValueError("Worker block value is not a list")
            worker_dict = list_dicts_to_dict(worker_block.value)
            out = []
            for dim, props in worker_dict.items():
                if dim == "workers":
                    for w in props:
                        out.append(self.get_worker_id_from_name(w))
                else:
                    if dim not in self.worker_dim_dict:
                        raise ValueError(f"Worker dimension {dim} not found")
                    for prop in props:
                        if prop not in self.worker_dim_dict[dim]:
                            raise ValueError(
                                f"Worker property {prop} for dimension {dim} not found"
                            )
                        out += self.worker_dim_dict[dim][prop]
            return sorted(list(set(out)))
        raise ValueError("Worker block not found")

    def get_worker_id_from_name(self, worker_name: str) -> str:
        worker = self.find_worker_by_name(worker_name)
        if worker:
            return worker.id
        raise ValueError(f"Worker name {worker_name} not found")

    def find_worker_by_name(self, name: str) -> Worker | None:
        for worker in self.workers:
            if worker.name.lower() == name.lower():
                return worker
        return None
