from typing import List

from bson import ObjectId

from core.schedule import ObjectiveBreach, Schedule, Variable
from database.db import DB
from database.schedule_db import to_mongo_schedule
from models.objective_breach import ObjectiveBreach as ObjectiveBreachDocument
from models.objective_breach import Variable as VariableDocument
from models.schedule import Schedule as ScheduleDocument
from models.shift import Shift as ShiftDocument
from models.worker import Worker as WorkerDocument


class ObjectiveBreachDB:
    def __init__(self, db: DB):
        self.db = db

    def create_objective_breach(
        self,
        objective_breach: ObjectiveBreach,
        schedule: Schedule,
    ) -> ObjectiveBreach:
        variable_docs = [to_mongo_variable(v) for v in objective_breach.variables]
        ob_doc = ObjectiveBreachDocument(
            id=str(ObjectId()),
            objective_id=objective_breach.objective_id,
            objective_category=objective_breach.objective_category,
            variables=variable_docs,
            hard_to_soft=objective_breach.hard_to_soft,
            description=objective_breach.description,
            schedule=to_mongo_schedule(schedule),
        )
        objective_breach_saved = ob_doc.save()
        return _from_mongo_objective_breach(objective_breach_saved)

    def get_objective_breaches(self) -> List[ObjectiveBreach]:
        # pylint: disable=no-member
        objective_breaches = ObjectiveBreachDocument.objects.all()  # type: ignore
        return [_from_mongo_objective_breach(ob) for ob in list(objective_breaches)]

    def get_objective_breach_by_id(self, objective_breach_id: str) -> ObjectiveBreach:
        # pylint: disable=no-member
        objective_breach = ObjectiveBreachDocument.objects.get(  # type: ignore
            id=objective_breach_id
        )
        return _from_mongo_objective_breach(objective_breach)

    def get_objective_breaches_by_schedule_id(
        self, schedule_id: str
    ) -> List[ObjectiveBreach]:
        # pylint: disable=no-member
        objective_breaches = ObjectiveBreachDocument.objects.filter(  # type: ignore
            schedule=schedule_id
        )
        return [_from_mongo_objective_breach(ob) for ob in list(objective_breaches)]

    def update_objective_breach(
        self, objective_breach: ObjectiveBreach
    ) -> ObjectiveBreach:
        document = to_mongo_objective_breach(objective_breach)
        document_saved = document.save()
        return _from_mongo_objective_breach(document_saved)

    def delete_objective_breach(self, objective_breach_id: str) -> None:
        # pylint: disable=no-member
        objective_breach = ObjectiveBreachDocument.objects.get(  # type: ignore
            id=objective_breach_id
        )
        objective_breach.delete()


# Mappers
def to_mongo_variable(dataclass_obj: Variable) -> VariableDocument:
    # pylint: disable=no-member
    worker = WorkerDocument.objects.get(id=dataclass_obj.worker_id)  # type: ignore
    shift = ShiftDocument.objects.get(id=dataclass_obj.shift_id)  # type: ignore
    return VariableDocument(
        worker=worker,
        date=dataclass_obj.date,
        shift=shift,
    )


def to_mongo_objective_breach(
    dataclass_obj: ObjectiveBreach,
) -> ObjectiveBreachDocument:
    # pylint: disable=no-member
    schedule = ScheduleDocument.objects.get(  # type: ignore
        id=dataclass_obj.schedule_id
    )
    return ObjectiveBreachDocument(
        id=dataclass_obj.id,
        objective_id=dataclass_obj.objective_id,
        objective_category=dataclass_obj.objective_category,
        variables=[to_mongo_variable(v) for v in dataclass_obj.variables],
        hard_to_soft=dataclass_obj.hard_to_soft,
        description=dataclass_obj.description,
        schedule=schedule,
    )


def _from_mongo_variable(doc_var: VariableDocument) -> Variable:
    return Variable(
        worker_id=doc_var.worker.id,
        date=doc_var.date.date(),
        shift_id=doc_var.shift.id,
    )


def _from_mongo_objective_breach(
    doc_obj: ObjectiveBreachDocument,
) -> ObjectiveBreach:
    return ObjectiveBreach(
        id=doc_obj.id,
        objective_id=doc_obj.objective_id,
        objective_category=doc_obj.objective_category,
        variables=[_from_mongo_variable(v) for v in doc_obj.variables],
        hard_to_soft=doc_obj.hard_to_soft,
        description=doc_obj.description,
        schedule_id=doc_obj.schedule.id,
    )
