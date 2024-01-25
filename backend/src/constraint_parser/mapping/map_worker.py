from typing import List

from constraint_parser.mapping.utils import find_block_by_name
from core.constraint import Block, ConstraintBuild, VarWorker
from core.worker import Worker


class MapWorker:
    def __init__(
        self,
        workers: List[Worker],
    ) -> None:
        self.workers = workers

    def __call__(self, cstr_build: ConstraintBuild) -> VarWorker:
        return VarWorker(
            operator="",
            selector=self.get_worker_selector(cstr_build.blocks),
            target_ids=self.get_target_ids(cstr_build.blocks),
            num_eligible_workers=0,
        )

    def get_worker_selector(self, blocks: List[Block]) -> str:
        worker_block = find_block_by_name(blocks, "worker")
        if worker_block:
            if not isinstance(worker_block.value, list):
                raise ValueError("Worker block value is not a list")
            for w in worker_block.value:
                if w == "all workers":
                    return "all"
            return "equal"
        raise ValueError("Worker block not found")

    def get_target_ids(self, blocks: List[Block]) -> List[str]:
        worker_block = find_block_by_name(blocks, "worker")
        if worker_block:
            if not isinstance(worker_block.value, list):
                raise ValueError("Worker block value is not a list")
            out = []
            for w in worker_block.value:
                if w in ["all workers"]:
                    return []
                out.append(self.get_worker_id_from_name(w))
            return out
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
