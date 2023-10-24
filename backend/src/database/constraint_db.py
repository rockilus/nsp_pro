from datetime import datetime
from typing import List

from core.constraint import (
    Constraint,
    ConstraintSeq,
    ConstraintSum,
    VarDay,
    VarShift,
    VarWorker,
)
from database.db import DB
from models import Constraint as ConstraintDocument
from models import ConstraintSeq as ConstraintSeqDocument
from models import ConstraintSum as ConstraintSumDocument
from models import Shift as ShiftDocument
from models import VarDay as VarDayDocument
from models import VarShift as VarShiftDocument
from models import VarWorker as VarWorkerDocument
from models import Worker as WorkerDocument


class ConstraintDB:
    def __init__(self, db: DB):
        self.db = db

    # pylint: disable=too-many-arguments
    def create_constraint_sum(
        self,
        constraint: Constraint,
    ) -> Constraint:
        constraint_doc = to_mongo_constraint(constraint)
        constraint_saved = constraint_doc.save()
        return _from_mongo_constraint(constraint_saved)

    def get_constraints(
        self,
    ) -> List[Constraint]:
        # pylint: disable=no-member
        constraints = ConstraintDocument.objects.all()  # type: ignore
        return [_from_mongo_constraint(c) for c in list(constraints)]

    def get_constraint_by_id(self, constraint_id: str) -> Constraint:
        # pylint: disable=no-member
        constraint = ConstraintDocument.objects.get(_id=constraint_id)  # type: ignore
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
        constraint_doc = ConstraintDocument.objects.get(id=constraint_id)  # type: ignore
        constraint_doc.delete()


# Mappers
def to_mongo_var_worker(dataclass_obj: VarWorker) -> VarWorkerDocument:
    # pylint: disable=no-member
    workers = WorkerDocument.objects.get(id__in=dataclass_obj.target_ids)  # type: ignore
    return VarWorkerDocument(
        operator=dataclass_obj.operator,
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
    # pylint: disable=no-member
    shifts = ShiftDocument.objects.get(id__in=dataclass_obj.target_ids)  # type: ignore
    reference_s = ShiftDocument.objects.get(id=dataclass_obj.reference_id)  # type: ignore
    relative_s = ShiftDocument.objects.get(id=dataclass_obj.relative_id)  # type: ignore
    return VarShiftDocument(
        operator=dataclass_obj.operator,
        selector=dataclass_obj.selector,
        target=shifts,
        reference=reference_s,
        relative=relative_s,
    )


def to_mongo_constraint_sum(
    dataclass_obj: ConstraintSum,
) -> ConstraintSumDocument:
    return ConstraintSumDocument(
        operator=dataclass_obj.operator,
        target_value=dataclass_obj.target_value,
    )


def to_mongo_constraint_seq(
    dataclass_obj: ConstraintSeq,
) -> ConstraintSeqDocument:
    return ConstraintSeqDocument(
        operator=dataclass_obj.operator,
        target_value=dataclass_obj.target_value,
    )


def to_mongo_constraint(dataclass_obj: Constraint) -> ConstraintDocument:
    if isinstance(dataclass_obj.constraint, ConstraintSum):
        constraint_params = to_mongo_constraint_sum(dataclass_obj.constraint)
    elif isinstance(dataclass_obj.constraint, ConstraintSeq):
        constraint_params = to_mongo_constraint_seq(dataclass_obj.constraint)
    else:
        raise ValueError("Constraint type not supported")
    worker_var = to_mongo_var_worker(dataclass_obj.worker_var)
    day_var = to_mongo_var_day(dataclass_obj.day_var)
    shift_var = to_mongo_var_shift(dataclass_obj.shift_var)
    constraint = ConstraintDocument(
        id=dataclass_obj.id,
        constraint=constraint_params,
        worker_var=worker_var,
        day_var=day_var,
        shift_var=shift_var,
        active=dataclass_obj.active,
        hard=dataclass_obj.hard,
        penalty=dataclass_obj.penalty,
    )
    return constraint


def _from_mongo_var_worker(doc_obj: VarWorkerDocument) -> VarWorker:
    return VarWorker(
        operator=doc_obj.operator,
        selector=doc_obj.selector,
        target_ids=[w.id for w in doc_obj.target],
        num_eligible_workers=doc_obj.num_eligible_workers,
    )


def _from_mongo_var_day(doc_obj: VarDayDocument) -> VarDay:
    return VarDay(
        selector=doc_obj.selector,
        target=[
            datetime.combine(d, datetime.min.time()).date()
            for d in doc_obj.target
        ],
        start_date=datetime.combine(
            doc_obj.start_date, datetime.min.time()
        ).date(),
        end_date=datetime.combine(
            doc_obj.end_date, datetime.min.time()
        ).date(),
        interval=doc_obj.interval,
    )


def _from_mongo_var_shift(doc_obj: VarShiftDocument) -> VarShift:
    return VarShift(
        operator=doc_obj.operator,
        selector=doc_obj.selector,
        target_ids=[s.id for s in doc_obj.target],
        reference_id=doc_obj.reference.id,
        relative_id=doc_obj.relative.id,
    )


def _from_mongo_constraint_sum(
    doc_obj: ConstraintSumDocument,
) -> ConstraintSum:
    return ConstraintSum(
        operator=doc_obj.operator,
        target_value=doc_obj.target_value,
    )


def _from_mongo_constraint_seq(
    doc_obj: ConstraintSeqDocument,
) -> ConstraintSeq:
    return ConstraintSeq(
        operator=doc_obj.operator,
        target_value=doc_obj.target_value,
    )


def _from_mongo_constraint(doc_obj: ConstraintDocument) -> Constraint:
    if isinstance(doc_obj.constraint, ConstraintSumDocument):
        constraint_params = _from_mongo_constraint_sum(doc_obj.constraint)
    elif isinstance(doc_obj.constraint, ConstraintSeqDocument):
        constraint_params = _from_mongo_constraint_seq(doc_obj.constraint)
    else:
        raise ValueError("Constraint type not supported")
    worker_var = _from_mongo_var_worker(doc_obj.worker_var)
    day_var = _from_mongo_var_day(doc_obj.day_var)
    shift_var = _from_mongo_var_shift(doc_obj.shift_var)
    constraint = Constraint(
        id=str(doc_obj.id),
        constraint=constraint_params,
        worker_var=worker_var,
        day_var=day_var,
        shift_var=shift_var,
        active=doc_obj.active,
        hard=doc_obj.hard,
        penalty=doc_obj.penalty,
    )
    return constraint
