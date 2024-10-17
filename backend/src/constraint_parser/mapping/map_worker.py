from typing import Dict, List

from constraint_parser.mapping.utils import find_block_by_name
from core import (
    Block,
    ConstraintBuildAugmented,
    MissingAttribute,
    ShiftWorkerOption,
    Worker,
)
from utils.constants import Constants


class MapWorker:
    def __init__(self, workers: List[Worker], worker_dim_dict: Dict) -> None:
        self.workers = workers
        self.worker_dim_dict = worker_dim_dict

    def get_coord_workers(self, cba: ConstraintBuildAugmented) -> List[Worker]:
        swos_worker = self.get_worker_shift_worker_options(cba.blocks)
        if self.get_selector(swos_worker) == "all":
            return self.workers
        worker_ids = []
        for value in swos_worker:
            if value.id_type == "worker":
                if not self.check_worker_id(value.id):
                    raise ValueError(
                        f"Worker {value.name} with id {value.id} not found"
                    )
                worker_ids.append(value.id)
            elif value.id_type == "dimension":
                target_ids = self.get_target_ids_dimension(
                    value, cba.missing_attributes
                )
                if target_ids:
                    worker_ids += target_ids
        if not worker_ids:
            raise ValueError("No workers found")
        worker_ids = sorted(list(set(worker_ids)))
        return [w for w in self.workers if w.id in worker_ids]

    def get_selector(
        self, swos_worker: List[ShiftWorkerOption]
    ) -> Constants.VAR_WORKER_SELECTOR_OPTIONS:
        string_values = [
            v.name for v in swos_worker if isinstance(v.name, str)
        ]
        if any("all workers" in v for v in string_values):
            return "all"
        return "equal"

    def get_target_ids_dimension(
        self,
        value: ShiftWorkerOption,
        missing_attributes: List[MissingAttribute],
    ) -> List[str] | None:
        ma = next(
            (ma for ma in missing_attributes if ma.dimension_id == value.id),
            None,
        )
        if ma and value.name in ma.attribute_values:
            return None
        if value.id not in self.worker_dim_dict:
            raise ValueError(f"Worker dimension {value.id} not found")
        if value.is_bool_dim:
            if not isinstance(value.name, bool):
                raise ValueError(
                    "Value name is not a boolean for bool dimension"
                )
            if value.name not in self.worker_dim_dict[value.id]:
                raise ValueError(
                    f"Worker property {value.name} "
                    + f"for dimension {value.id} not found"
                )
            return self.worker_dim_dict[value.id][value.name]
        if not isinstance(value.name, str):
            raise ValueError(
                "Value name is not a string for non-bool dimension"
            )
        # if value.name.lower() not in self.worker_dim_dict[value.id]:
        if value.name not in self.worker_dim_dict[value.id]:
            raise ValueError(
                f"Worker property {value.name} for dimension "
                + f"{value.id} not found"
            )
        # return self.worker_dim_dict[value.id][value.name.lower()]
        return self.worker_dim_dict[value.id][value.name]

    def check_worker_id(self, worker_id: str) -> bool:
        return any(w.id == worker_id for w in self.workers)

    @staticmethod
    def get_worker_shift_worker_options(
        blocks: List[Block],
    ) -> List[ShiftWorkerOption]:
        worker_block = find_block_by_name(blocks, "worker")
        if worker_block:
            if not isinstance(worker_block.value, list):
                raise ValueError("Worker block value is not a list")
            if not all(
                isinstance(v, ShiftWorkerOption) for v in worker_block.value
            ):
                raise ValueError(
                    "Worker block value is not a list of ShiftWorkerOption"
                )
            return worker_block.value  # type: ignore
        raise ValueError("Worker block not found")
