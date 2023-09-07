from typing import List

from bson import ObjectId
from database.db import DB
from models import WorkerParam


class WorkerParamDB:
    def __init__(self, db: DB):
        self.db = db

    def create_default_worker_params(
        self,
    ) -> List[WorkerParam]:
        worker_param_first_name = WorkerParam(
            _id=ObjectId(),
            name="first_name",
            label="First Name",
            entry_type="str",
            entry_options=[],
        )
        worker_param_last_name = WorkerParam(
            _id=ObjectId(),
            name="last_name",
            label="Last Name",
            entry_type="str",
            entry_options=[],
        )
        worker_param_first_name.save()
        worker_param_last_name.save()
        # pylint: disable=no-member
        worker_params = WorkerParam.objects.all()  # type: ignore
        return worker_params

    def create_worker_param(
        self,
        name: str,
        label: str,
        entry_type: str,
        entry_options: List[str],
    ) -> List[WorkerParam]:
        worker_param = WorkerParam(
            _id=ObjectId(),
            name=name,
            label=label,
            entry_type=entry_type,
            entry_options=entry_options,
        )
        worker_param.save()
        # pylint: disable=no-member
        worker_params = WorkerParam.objects.all()  # type: ignore
        return list(worker_params)

    def get_worker_params(
        self,
    ) -> List[WorkerParam]:
        # pylint: disable=no-member
        worker_params = WorkerParam.objects.all()  # type: ignore
        return list(worker_params)

    def get_worker_param_by_id(
        self,
        worker_param_id: str,
    ) -> WorkerParam:
        # pylint: disable=no-member
        worker_param = WorkerParam.objects.get(_id=worker_param_id)  # type: ignore
        return worker_param

    def update_worker_param(
        self,
        worker_param: WorkerParam,
        label: str,
        entry_type: str,
        entry_options: List[str],
    ) -> WorkerParam:
        worker_param.label = label
        worker_param.entry_type = entry_type
        worker_param.entry_options = entry_options
        worker_param.save()
        return worker_param

    def delete_worker_param(
        self,
        worker_param: WorkerParam,
    ) -> None:
        worker_param.delete()
