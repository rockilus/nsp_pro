from datetime import date, datetime
from typing import List

from bson import ObjectId

from core.schedule import Schedule
from database.db import DB
from models import Schedule as ScheduleDocument
from models import Team as TeamDocument


class ScheduleDB:
    def __init__(self, db: DB):
        self.db = db

    def create_schedule(self, schedule: Schedule) -> Schedule:
        s_data = to_mongo_schedule(schedule)
        schedule_doc = ScheduleDocument(
            id=str(ObjectId()),
            team=s_data.team,
            start_date=s_data.start_date,
            end_date=s_data.end_date,
            solve_status=s_data.solve_status,
            status=s_data.status,
            missing_coverage_dates=s_data.missing_coverage_dates,
        )
        s_saved = schedule_doc.save()
        return _from_mongo_schedule(s_saved)

    def get_schedules(self, team_id: str) -> List[Schedule]:
        # pylint: disable=no-member
        schedules = ScheduleDocument.objects.filter(team=team_id)  # type: ignore
        return [_from_mongo_schedule(c) for c in list(schedules)]

    def get_schedule_by_id(self, schedule_id: str) -> Schedule:
        # pylint: disable=no-member
        schedule = ScheduleDocument.objects.get(id=schedule_id)  # type: ignore
        return _from_mongo_schedule(schedule)

    def get_wip_validated_schedules_before_date(
        self, s_date: date, team_id: str
    ) -> List[Schedule]:
        # pylint: disable=no-member
        schedules = ScheduleDocument.objects.filter(  # type: ignore
            end_date__lt=s_date, status__in=["wip", "validated"], team=team_id
        )
        return [_from_mongo_schedule(s) for s in list(schedules)]

    def update_schedule(self, schedule: Schedule) -> Schedule:
        s_doc = to_mongo_schedule(schedule)
        s_saved = s_doc.save()
        return _from_mongo_schedule(s_saved)

    def delete_schedule(self, schedule_id: str) -> None:
        # pylint: disable=no-member
        schedule = ScheduleDocument.objects.get(id=schedule_id)  # type: ignore
        schedule.delete()


# Mappers
def to_mongo_schedule(dataclass_obj: Schedule) -> ScheduleDocument:
    # pylint: disable=no-member
    team = TeamDocument.objects.get(id=dataclass_obj.team_id)  # type: ignore
    return ScheduleDocument(
        id=dataclass_obj.id,
        team=team,
        start_date=datetime(
            dataclass_obj.start_date.year,
            dataclass_obj.start_date.month,
            dataclass_obj.start_date.day,
        ),
        end_date=datetime(
            dataclass_obj.end_date.year,
            dataclass_obj.end_date.month,
            dataclass_obj.end_date.day,
        ),
        solve_status=dataclass_obj.solve_status,
        status=dataclass_obj.status,
        missing_coverage_dates=dataclass_obj.missing_coverage_dates,
    )


def _from_mongo_schedule(doc_obj: ScheduleDocument) -> Schedule:
    return Schedule(
        id=doc_obj.id,
        team_id=doc_obj.team.id,
        start_date=doc_obj.start_date.date(),
        end_date=doc_obj.end_date.date(),
        solve_status=doc_obj.solve_status,
        status=doc_obj.status,
        missing_coverage_dates=[
            d.date() for d in doc_obj.missing_coverage_dates if isinstance(d, datetime)
        ],
    )
