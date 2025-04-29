from dataclasses import asdict, dataclass
from datetime import date, datetime, time, timezone
from enum import Enum
from typing import Dict, List

import humps
from pydantic import TypeAdapter

from shared.schemas.dto.daily_shift_demand import (
    DailyShiftDemandDTO,
    DeleteDailyShiftDemandRequestDTO,
    DemandsResultDTO,
)


class DSDSourceType(Enum):
    SHIFT_DEMAND = 0
    DIRECT_REQUIREMENT = 1


@dataclass
class DailyShiftDemand:
    id: str
    team_id: str
    schedule_id: str
    shift_demand_id: str | None
    coverage_selector_id: str | None
    source_type: DSDSourceType
    date: date
    shift_id: str
    count: int

    def to_dict(self) -> Dict:
        out = asdict(self)
        out["source_type"] = self.source_type.value
        # pylint: disable=R0801
        out["date"] = datetime.combine(
            self.date, time.min, tzinfo=timezone.utc
        ).timestamp()
        return out

    @classmethod
    def from_dict(cls, data: Dict) -> "DailyShiftDemand":
        return cls(
            id=data["id"],
            team_id=data["team_id"],
            schedule_id=data["schedule_id"],
            shift_demand_id=data["shift_demand_id"],
            coverage_selector_id=data["coverage_selector_id"],
            source_type=DSDSourceType(data["source_type"]),
            date=datetime.fromtimestamp(data["date"], tz=timezone.utc).date(),
            shift_id=data["shift_id"],
            count=data["count"],
        )

    def to_dto(self) -> DailyShiftDemandDTO:
        data = asdict(self)
        data["date"] = datetime.combine(
            self.date, time.min, tzinfo=timezone.utc
        ).timestamp()
        as_dict = humps.camelize(data)
        validator = TypeAdapter(DailyShiftDemandDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: DailyShiftDemandDTO) -> "DailyShiftDemand":
        data_dict = data.model_dump()
        data_dict["date"] = datetime.fromtimestamp(
            data_dict["date"], tz=timezone.utc
        ).date()
        data_dict = humps.decamelize(data_dict)
        data_dict["source_type"] = DSDSourceType(data_dict["source_type"])
        return cls(**data_dict)


@dataclass
class DeleteDailyShiftDemandRequest:
    team_id: str
    shift_id: str
    date: date

    def to_dto(self) -> DeleteDailyShiftDemandRequestDTO:
        data = asdict(self)
        data["date"] = datetime.combine(
            self.date, time.min, tzinfo=timezone.utc
        ).timestamp()
        as_dict = humps.camelize(data)
        validator = TypeAdapter(DeleteDailyShiftDemandRequestDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(
        cls, data: DeleteDailyShiftDemandRequestDTO
    ) -> "DeleteDailyShiftDemandRequest":
        data_dict = data.model_dump()
        data_dict["date"] = datetime.fromtimestamp(
            data_dict["date"], tz=timezone.utc
        ).date()
        data_dict = humps.decamelize(data_dict)
        return cls(**data_dict)


@dataclass
class DemandsResult:
    demands_created: List[DailyShiftDemand]
    demands_read: List[DailyShiftDemand]
    demands_updated: List[DailyShiftDemand]
    demands_deleted_ids: List[str]

    def to_dto(self) -> DemandsResultDTO:
        data = asdict(self)
        data["demands_created"] = [demand.to_dto() for demand in self.demands_created]
        data["demands_read"] = [demand.to_dto() for demand in self.demands_read]
        data["demands_updated"] = [demand.to_dto() for demand in self.demands_updated]
        as_dict = humps.camelize(data)
        validator = TypeAdapter(DemandsResultDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: DemandsResultDTO) -> "DemandsResult":
        data_dict = humps.decamelize(data.model_dump())
        data_dict["demands_created"] = [
            DailyShiftDemand.from_dto(demand) for demand in data_dict["demands_created"]
        ]
        data_dict["demands_read"] = [
            DailyShiftDemand.from_dto(demand) for demand in data_dict["demands_read"]
        ]
        data_dict["demands_updated"] = [
            DailyShiftDemand.from_dto(demand) for demand in data_dict["demands_updated"]
        ]
        return cls(**data_dict)
