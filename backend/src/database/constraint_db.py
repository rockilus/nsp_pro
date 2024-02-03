from datetime import datetime
from typing import List

from bson import ObjectId

from core.constraint import Block, Constraint, VarDay, VarShift, VarWorker
from database.db import DB
from models import Block as BlockDocument
from models import Constraint as ConstraintDocument
from models import Shift as ShiftDocument
from models import VarDay as VarDayDocument
from models import VarShift as VarShiftDocument
from models import VarWorker as VarWorkerDocument
from models import Worker as WorkerDocument


class ConstraintDB:
    def __init__(self, db: DB):
        self.db = db

    # pylint: disable=too-many-arguments
    def create_constraint(
        self,
        constraint: Constraint,
    ) -> Constraint:
        constraint_doc = to_mongo_constraint(constraint)
        constraint_doc.id = str(ObjectId())
        constraint_saved = constraint_doc.save()
        return _from_mongo_constraint(constraint_saved)

    def get_constraints(
        self,
    ) -> List[Constraint]:
        # pylint: disable=no-member
        constraints = ConstraintDocument.objects.all()  # type: ignore
        return [_from_mongo_constraint(c) for c in list(constraints)]

    def get_constraints_active(
        self,
    ) -> List[Constraint]:
        # pylint: disable=no-member
        constraints = ConstraintDocument.objects.filter(active=True)  # type: ignore
        return [_from_mongo_constraint(c) for c in list(constraints)]

    def get_constraint_by_id(self, constraint_id: str) -> Constraint:
        # pylint: disable=no-member
        constraint = ConstraintDocument.objects.get(id=constraint_id)  # type: ignore
        return _from_mongo_constraint(constraint)

    # pyling: disable=too-many-arguments
    def update_constraint(
        self,
        constraint: Constraint,
    ) -> Constraint:
        constraint_doc = to_mongo_constraint(constraint)
        constraint_saved = constraint_doc.save()
        return _from_mongo_constraint(constraint_saved)

    def delete_constraint(self, constraint_id: str) -> None:
        # pylint: disable=no-member
        constraint_doc = ConstraintDocument.objects.get(  # type: ignore
            id=constraint_id
        )
        constraint_doc.delete()


# Mappers
def to_mongo_var_worker(dataclass_obj: VarWorker) -> VarWorkerDocument:
    workers = []
    if len(dataclass_obj.target_ids) > 0:
        # pylint: disable=no-member
        workers = WorkerDocument.objects.filter(  # type: ignore
            id__in=dataclass_obj.target_ids
        )

    return VarWorkerDocument(
        selector=dataclass_obj.selector,
        target=workers,
        num_eligible_workers=dataclass_obj.num_eligible_workers,
    )


def to_mongo_var_day(dataclass_obj: VarDay) -> VarDayDocument:
    return VarDayDocument(
        selector=dataclass_obj.selector,
        target=dataclass_obj.target,
        start_date=dataclass_obj.start_date,
        end_date=dataclass_obj.end_date,
        interval=dataclass_obj.interval,
    )


def to_mongo_var_shift(dataclass_obj: VarShift) -> VarShiftDocument:
    shifts = []
    reference_s = []
    relative_s = []
    if len(dataclass_obj.target_ids) > 0:
        # pylint: disable=no-member
        shifts = ShiftDocument.objects.filter(  # type: ignore
            id__in=dataclass_obj.target_ids
        )
    if len(dataclass_obj.reference_ids) > 0:
        # pylint: disable=no-member
        reference_s = [
            ShiftDocument.objects.get(  # type: ignore
                id__in=dataclass_obj.reference_ids
            )
        ]
    if len(dataclass_obj.relative_ids) > 0:
        # pylint: disable=no-member
        relative_s = [
            ShiftDocument.objects.get(id__in=dataclass_obj.relative_ids)  # type: ignore
        ]
    return VarShiftDocument(
        selector=dataclass_obj.selector,
        target=shifts,
        reference=reference_s,
        relative=relative_s,
    )


def to_mongo_block(dataclass_obj: Block) -> BlockDocument:
    return BlockDocument(
        name=dataclass_obj.name,
        type=dataclass_obj.type,
        value=dataclass_obj.value,
    )


def to_mongo_constraint(dataclass_obj: Constraint) -> ConstraintDocument:
    worker_var = to_mongo_var_worker(dataclass_obj.worker_var)
    day_var = to_mongo_var_day(dataclass_obj.day_var)
    shift_var = to_mongo_var_shift(dataclass_obj.shift_var)
    constraint = ConstraintDocument(
        id=dataclass_obj.id,
        constraint_type=dataclass_obj.constraint_type,
        template_id=dataclass_obj.template_id,
        operator=dataclass_obj.operator,
        target_value=dataclass_obj.target_value,
        target_unit=dataclass_obj.target_unit,
        worker_var=worker_var,
        day_var=day_var,
        shift_var=shift_var,
        hard=dataclass_obj.hard,
        priority=dataclass_obj.priority,
        active=dataclass_obj.active,
        text=dataclass_obj.text,
        blocks=[to_mongo_block(b) for b in dataclass_obj.blocks],
    )
    return constraint


def _from_mongo_var_worker(doc_obj: VarWorkerDocument) -> VarWorker:
    return VarWorker(
        selector=doc_obj.selector if doc_obj.selector else "",  # type: ignore
        target_ids=[w.id for w in doc_obj.target],
        num_eligible_workers=doc_obj.num_eligible_workers,
    )


def _from_mongo_var_day(doc_obj: VarDayDocument) -> VarDay:
    return VarDay(
        selector=doc_obj.selector if doc_obj.selector else "",  # type: ignore
        target=doc_obj.target,
        start_date=datetime.combine(doc_obj.start_date, datetime.min.time()).date(),
        end_date=datetime.combine(doc_obj.end_date, datetime.min.time()).date(),
        interval=doc_obj.interval,
    )


def _from_mongo_var_shift(doc_obj: VarShiftDocument) -> VarShift:
    return VarShift(
        selector=doc_obj.selector if doc_obj.selector else "",  # type: ignore
        target_ids=[s.id for s in doc_obj.target],
        reference_ids=[s.id for s in doc_obj.reference],
        relative_ids=[s.id for s in doc_obj.relative],
    )


def _from_mongo_block(doc_obj: BlockDocument) -> Block:
    return Block(
        name=doc_obj.name,  # type: ignore
        type=doc_obj.type,  # type: ignore
        value=doc_obj.value
        if isinstance(doc_obj.value, (str, int))
        else list(doc_obj.value),
    )


def _from_mongo_constraint(doc_obj: ConstraintDocument) -> Constraint:
    worker_var = _from_mongo_var_worker(doc_obj.worker_var)
    day_var = _from_mongo_var_day(doc_obj.day_var)
    shift_var = _from_mongo_var_shift(doc_obj.shift_var)
    constraint = Constraint(
        id=str(doc_obj.id),
        constraint_type=doc_obj.constraint_type,  # type: ignore
        template_id=doc_obj.template_id,
        operator=doc_obj.operator if doc_obj.operator else "",  # type: ignore
        target_value=doc_obj.target_value,
        target_unit=doc_obj.target_unit,
        worker_var=worker_var,
        day_var=day_var,
        shift_var=shift_var,
        hard=doc_obj.hard,
        priority=doc_obj.priority,
        active=doc_obj.active,
        text=doc_obj.text,
        blocks=[_from_mongo_block(b) for b in doc_obj.blocks],
    )
    return constraint
