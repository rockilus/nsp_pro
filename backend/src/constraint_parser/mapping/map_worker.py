from typing import Dict, List

from constraint_parser.mapping.utils import find_block_by_name
from core import (
    Block,
    ConstraintBuildAugmented,
    MissingAttribute,
    ShiftWorkerOption,
    VarWorker,
    Worker,
)
from utils.constants import Constants


class MapWorker:
    def __init__(self, workers: List[Worker], worker_dim_dict: Dict) -> None:
        self.workers = workers
        self.worker_dim_dict = worker_dim_dict

    def __call__(self, cstr_build: ConstraintBuildAugmented) -> VarWorker:
        values = self.get_worker_values(cstr_build.blocks)
        return VarWorker(
            selector=self.get_selector(values),
            target_ids=self.get_target_ids(values, cstr_build.missing_attributes),
            num_eligible_workers=0,
        )

    def get_selector(
        self, values: List[ShiftWorkerOption]
    ) -> Constants.VAR_WORKER_SELECTOR_OPTIONS:
        string_values = [v.name for v in values if isinstance(v.name, str)]
        if any("all workers" in v for v in string_values):
            return "all"
        return "equal"

    def get_target_ids(
        self,
        values: List[ShiftWorkerOption],
        missing_properties: List[MissingAttribute],
    ) -> List[str]:
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
            elif value.id_type == "worker_dimension":
                target_ids = self.get_target_ids_worker_dimension(
                    value, missing_properties
                )
                if target_ids:
                    out += target_ids
        if not out:
            raise ValueError("No workers found")
        return sorted(list(set(out)))

    def get_target_ids_worker_dimension(
        self,
        value: ShiftWorkerOption,
        missing_properties: List[MissingAttribute],
    ) -> List[str] | None:
        mp = next(
            (mp for mp in missing_properties if mp.dimension_id == value.id),
            None,
        )
        if mp and value.name in mp.attribute_values:
            return None
        if value.id not in self.worker_dim_dict:
            raise ValueError(f"Worker dimension {value.id} not found")
        if value.is_bool_dim:
            if not isinstance(value.name, bool):
                raise ValueError("Value name is not a boolean for bool dimension")
            if value.name not in self.worker_dim_dict[value.id]:
                raise ValueError(
                    f"Worker property {value.name} "
                    + f"for dimension {value.id} not found"
                )
            return self.worker_dim_dict[value.id][value.name]
        if not isinstance(value.name, str):
            raise ValueError("Value name is not a string for non-bool dimension")
        if value.name.lower() not in self.worker_dim_dict[value.id]:
            raise ValueError(
                f"Worker property {value.name} for dimension " + f"{value.id} not found"
            )
        return self.worker_dim_dict[value.id][value.name.lower()]

    def check_worker_id(self, worker_id: str) -> bool:
        return any(w.id == worker_id for w in self.workers)

    @staticmethod
    def get_worker_values(blocks: List[Block]) -> List[ShiftWorkerOption]:
        worker_block = find_block_by_name(blocks, "worker")
        if worker_block:
            if not isinstance(worker_block.value, list):
                raise ValueError("Worker block value is not a list")

            if not all(isinstance(v, ShiftWorkerOption) for v in worker_block.value):
                raise ValueError(
                    "Worker block value is not a list of ShiftWorkerOption"
                )
            return worker_block.value  # type: ignore
        raise ValueError("Worker block not found")
