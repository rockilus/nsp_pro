from typing import List

from bson import ObjectId

from core.schedule import Schedule
from database.db import DB
from models.schedule import Schedule as ScheduleDocument


class ScheduleDB:
    def __init__(self, db: DB):
        self.db = db

    def create_schedule(
        self,
        schedule: Schedule,
    ) -> Schedule:
        schedule_doc = ScheduleDocument(
            id=str(ObjectId()),
            start_date=schedule.start_date,
            end_date=schedule.end_date,
            solve_status=schedule.solve_status,
            status=schedule.status,
            missing_coverage_dates=schedule.missing_coverage_dates,
        )
        schedule_saved = schedule_doc.save()
        return _from_mongo_schedule(schedule_saved)

    def get_schedules(self) -> List[Schedule]:
        # pylint: disable=no-member
        schedules = ScheduleDocument.objects.all()  # type: ignore
        return [_from_mongo_schedule(c) for c in list(schedules)]

    def get_schedule_by_id(self, schedule_id: str) -> Schedule:
        # pylint: disable=no-member
        schedule = ScheduleDocument.objects.get(id=schedule_id)  # type: ignore
        return _from_mongo_schedule(schedule)

    def update_schedule(self, schedule: Schedule) -> Schedule:
        document = to_mongo_schedule(schedule)
        document_saved = document.save()
        return _from_mongo_schedule(document_saved)

    def delete_schedule(self, schedule_id: str) -> None:
        # pylint: disable=no-member
        schedule = ScheduleDocument.objects.get(id=schedule_id)  # type: ignore
        schedule.delete()


# Mappers
def to_mongo_schedule(dataclass_obj: Schedule) -> ScheduleDocument:
    return ScheduleDocument(
        id=dataclass_obj.id,
        start_date=dataclass_obj.start_date,
        end_date=dataclass_obj.end_date,
        solve_status=dataclass_obj.solve_status,
        status=dataclass_obj.status,
        missing_coverage_dates=dataclass_obj.missing_coverage_dates,
    )


def _from_mongo_schedule(doc_obj: ScheduleDocument) -> Schedule:
    return Schedule(
        id=doc_obj.id,
        start_date=doc_obj.start_date.date(),
        end_date=doc_obj.end_date.date(),
        solve_status=doc_obj.solve_status,
        status=doc_obj.status,
        missing_coverage_dates=[d.date() for d in doc_obj.missing_coverage_dates],
    )
