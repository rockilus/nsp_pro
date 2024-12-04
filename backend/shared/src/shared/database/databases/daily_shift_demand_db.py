from datetime import datetime, time, timezone
from typing import List

from bson import ObjectId

from shared.database.databases.db import DB
from shared.database.errors.document_error_handlers import (
    handle_create_document_error,
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from shared.database.models.daily_shift_demand import (
    DailyShiftDemand as DailyShiftDemandDocument,
)
from shared.database.models.schedule import Schedule as ScheduleDocument
from shared.database.models.shift import Shift as ShiftDocument
from shared.database.models.shift_demand import ShiftDemand as ShiftDemandDocument
from shared.database.models.team import Team as TeamDocument
from shared.logger.logger import log_info
from shared.schemas.schemas.coverage import DailyShiftDemand, DSDSourceType


class DailyShiftDemandDB:
    def __init__(self, db: DB):
        self.db = db

    def create_daily_shift_demand(
        self, daily_shift_demand: DailyShiftDemand
    ) -> DailyShiftDemand:
        dsd_doc = core_to_doc_daily_shift_demand(daily_shift_demand)
        dsd_doc.id = str(ObjectId())
        try:
            dsd_saved = dsd_doc.save()
        except Exception as e:
            log_info("Failed to save daily shift demand to database")
            handle_save_document_error(e)
        return doc_to_core_daily_shift_demand(dsd_saved)

    def create_daily_shift_demands(
        self, daily_shift_demands: List[DailyShiftDemand]
    ) -> List[DailyShiftDemand]:
        if not daily_shift_demands:
            return []
        dsd_docs = core_to_doc_daily_shift_demands(daily_shift_demands, creating=True)
        try:
            # pylint: disable=no-member
            dsd_saved = DailyShiftDemandDocument.objects.insert(  # type: ignore
                dsd_docs
            )
        except Exception as e:
            log_info("Failed to save daily shift demands to database")
            handle_save_document_error(e)
        return [doc_to_core_daily_shift_demand(dsd) for dsd in dsd_saved]

    def get_daily_shift_demands(self, team_id: str) -> List[DailyShiftDemand]:
        try:
            # pylint: disable=no-member
            dsd_docs = DailyShiftDemandDocument.objects.filter(  # type: ignore
                team=team_id
            )
        except Exception as e:
            log_info("Failed to get daily shift demands by team from database")
            handle_get_document_error(e)
        return [doc_to_core_daily_shift_demand(dsd) for dsd in list(dsd_docs)]

    def get_daily_shift_demand_by_id(
        self, daily_shift_demand_id: str
    ) -> DailyShiftDemand:
        try:
            # pylint: disable=no-member
            dsd_doc = DailyShiftDemandDocument.objects.get(  # type: ignore
                id=daily_shift_demand_id
            )
        except Exception as e:
            log_info("Failed to get daily shift demand by id from database")
            handle_get_document_error(e)
        return doc_to_core_daily_shift_demand(dsd_doc)

    def get_daily_shift_demands_by_schedule_id(
        self, schedule_id: str
    ) -> List[DailyShiftDemand]:
        try:
            # pylint: disable=no-member
            dsd_docs = DailyShiftDemandDocument.objects.filter(  # type: ignore
                schedule=schedule_id
            )
        except Exception as e:
            log_info("Failed to get daily shift demands by schedule from database")
            handle_get_document_error(e)
        return [doc_to_core_daily_shift_demand(dsd) for dsd in list(dsd_docs)]

    def get_daily_shift_demands_modified_by_schedule_id(
        self, schedule_id: str
    ) -> List[DailyShiftDemand]:
        try:
            # pylint: disable=no-member
            dsd_docs = DailyShiftDemandDocument.objects.filter(  # type: ignore
                schedule=schedule_id,
                source_type=DSDSourceType.SHIFT_DEMAND_MODIFY.value,
            )
        except Exception as e:
            log_info("Failed to get daily shift demands by schedule from database")
            handle_get_document_error(e)
        return [doc_to_core_daily_shift_demand(dsd) for dsd in list(dsd_docs)]

    def get_daily_shift_demands_by_shift_demand_id(
        self, shift_demand_id: List[str]
    ) -> List[DailyShiftDemand]:
        try:
            # pylint: disable=no-member
            dsd_docs = DailyShiftDemandDocument.objects.filter(  # type: ignore
                shift_demand=shift_demand_id
            )
        except Exception as e:
            log_info("Failed to get daily shift demands by shift demand from database")
            handle_get_document_error(e)
        return [doc_to_core_daily_shift_demand(dsd) for dsd in list(dsd_docs)]

    def update_daily_shift_demand(
        self, daily_shift_demand: DailyShiftDemand
    ) -> DailyShiftDemand:
        dsd_doc = core_to_doc_daily_shift_demand(daily_shift_demand)
        try:
            # pylint: disable=no-member
            DailyShiftDemandDocument.objects.get(id=dsd_doc.id)  # type: ignore
        except Exception as e:
            log_info(f"Shift demand with id {dsd_doc.id} does not exist")
            handle_get_document_error(e)
        try:
            dsd_saved = dsd_doc.save()
        except Exception as e:
            log_info("Failed to update daily shift demand in database")
            handle_save_document_error(e)
        return doc_to_core_daily_shift_demand(dsd_saved)

    def delete_daily_shift_demand(self, daily_shift_demand_id: str) -> None:
        try:
            # pylint: disable=no-member
            daily_shift_demand = DailyShiftDemandDocument.objects.get(  # type: ignore
                id=daily_shift_demand_id
            )
        except Exception as e:
            log_info("Failed to get daily shift demand by id to delete from database")
            handle_get_document_error(e)
        try:
            daily_shift_demand.delete()
        except Exception as e:
            log_info("Failed to delete daily shift demand from database")
            handle_delete_document_error(e)

    def delete_daily_shift_demands_by_schedule_id(self, schedule_id: str) -> None:
        try:
            # pylint: disable=no-member
            dsd_docs = DailyShiftDemandDocument.objects.filter(  # type: ignore
                schedule=schedule_id
            )
        except Exception as e:
            log_info("Failed to get daily shift demands by schedule id to delete")
            handle_get_document_error(e)
        try:
            for dsd_doc in dsd_docs:
                dsd_doc.delete()
        except Exception as e:
            log_info("Failed to delete daily shift demands")
            handle_delete_document_error(e)

    def delete_dsds_by_schedule_id_and_source_shift_demand(
        self, schedule_id: str
    ) -> None:
        try:
            # pylint: disable=no-member
            dsd_docs = DailyShiftDemandDocument.objects.filter(  # type: ignore
                schedule=schedule_id,
                source_type=DSDSourceType.SHIFT_DEMAND.value,
            )
        except Exception as e:
            log_info(
                "Failed to get daily shift demands by schedule id and source "
                + "type to delete"
            )
            handle_get_document_error(e)
        try:
            for dsd_doc in dsd_docs:
                dsd_doc.delete()
        except Exception as e:
            log_info("Failed to delete daily shift demands")
            handle_delete_document_error(e)

    def delete_daily_shift_demands_by_shift_id(self, shift_id: str) -> None:
        try:
            # pylint: disable=no-member
            dsd_docs = DailyShiftDemandDocument.objects.filter(  # type: ignore
                shift=shift_id
            )
        except Exception as e:
            log_info("Failed to get daily shift demands by shift id to delete")
            handle_get_document_error(e)
        try:
            for dsd_doc in dsd_docs:
                dsd_doc.delete()
        except Exception as e:
            log_info("Failed to delete daily shift demands")
            handle_delete_document_error(e)


# Mappers
# core to document
def core_to_doc_daily_shift_demand(
    dataclass_obj: DailyShiftDemand,
) -> DailyShiftDemandDocument:
    # pylint: disable=R0801
    try:
        # pylint: disable=no-member
        team = TeamDocument.objects.get(id=dataclass_obj.team_id)  # type: ignore
        schedule = ScheduleDocument.objects.get(  # type: ignore
            id=dataclass_obj.schedule_id
        )
        if (
            dataclass_obj.source_type
            in [DSDSourceType.SHIFT_DEMAND, DSDSourceType.SHIFT_DEMAND_MODIFY]
            and dataclass_obj.shift_demand_id
        ):
            shift_demand = ShiftDemandDocument.objects.get(  # type: ignore
                id=dataclass_obj.shift_demand_id
            )
        else:
            shift_demand = None
        shift = ShiftDocument.objects.get(id=dataclass_obj.shift_id)  # type: ignore
    except Exception as e:
        log_info("Failed to get shift by id")
        handle_get_document_error(e)
    try:
        dsd_doc = DailyShiftDemandDocument(
            id=dataclass_obj.id,
            team=team,
            schedule=schedule,
            shift_demand=shift_demand,
            source_type=dataclass_obj.source_type.value,
            date=datetime.combine(
                dataclass_obj.date, time.min, timezone.utc
            ).timestamp(),
            shift=shift,
            count=dataclass_obj.count,
        )
    except Exception as e:
        log_info("Failed to convert DailyShiftDemand to DailyShiftDemandDocument")
        handle_create_document_error(e)
    return dsd_doc


# pylint: disable=R0801
def core_to_doc_daily_shift_demands(
    dataclass_objs: List[DailyShiftDemand], creating: bool = False
) -> List[DailyShiftDemandDocument]:
    team_ids = list(set(doc.team_id for doc in dataclass_objs))
    teams = {
        team.id: team
        # pylint: disable=no-member
        for team in TeamDocument.objects.filter(id__in=team_ids)  # type: ignore
    }
    schedule_ids = list(set(doc.schedule_id for doc in dataclass_objs))
    schedules = {
        schedule.id: schedule
        # pylint: disable=no-member
        for schedule in ScheduleDocument.objects.filter(  # type: ignore
            id__in=schedule_ids
        )
    }
    shift_demand_ids = list(
        set(doc.shift_demand_id for doc in dataclass_objs if doc.shift_demand_id)
    )
    shift_demands = {
        shift_demand.id: shift_demand
        # pylint: disable=no-member
        for shift_demand in ShiftDemandDocument.objects.filter(  # type: ignore
            id__in=shift_demand_ids
        )
    }
    shift_ids = list(set(doc.shift_id for doc in dataclass_objs))
    shifts = {
        shift.id: shift
        # pylint: disable=no-member
        for shift in ShiftDocument.objects.filter(id__in=shift_ids)  # type: ignore
    }
    out = []
    for dataclass_obj in dataclass_objs:
        dsd_doc = DailyShiftDemandDocument(
            id=str(ObjectId()) if creating else dataclass_obj.id,
            team=teams.get(dataclass_obj.team_id),
            schedule=schedules.get(dataclass_obj.schedule_id),
            shift_demand=(
                shift_demands.get(dataclass_obj.shift_demand_id)
                if dataclass_obj.shift_demand_id
                else None
            ),
            source_type=dataclass_obj.source_type.value,
            date=datetime.combine(
                dataclass_obj.date, time.min, timezone.utc
            ).timestamp(),
            shift=shifts.get(dataclass_obj.shift_id),
            count=dataclass_obj.count,
        )
        out.append(dsd_doc)
    return out


# document to core
def doc_to_core_daily_shift_demand(
    doc_obj: DailyShiftDemandDocument,
) -> DailyShiftDemand:
    doc_dict = doc_obj.to_mongo().to_dict()
    doc_dict["id"] = doc_dict["_id"]
    doc_dict["team_id"] = doc_dict["team"]
    doc_dict["schedule_id"] = doc_dict["schedule"]
    doc_dict["shift_demand_id"] = doc_dict.get("shift_demand", None)
    doc_dict["source_type"] = DSDSourceType(doc_dict["source_type"])
    doc_dict["date"] = datetime.fromtimestamp(doc_dict["date"], timezone.utc).date()
    doc_dict["shift_id"] = doc_dict["shift"]
    doc_dict.pop("_id")
    doc_dict.pop("team")
    doc_dict.pop("schedule")
    if "shift_demand" in doc_dict:
        doc_dict.pop("shift_demand")
    doc_dict.pop("shift")
    return DailyShiftDemand(**doc_dict)
