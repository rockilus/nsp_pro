from dataclasses import asdict, dataclass
from datetime import date, datetime, time, timezone
from typing import Dict, List

import humps
from pydantic import TypeAdapter

from shared.schemas.core.attribute import Attribute
from shared.schemas.dto.worker import WorkerDTO


# pylint: disable=too-many-instance-attributes
@dataclass
class Worker:
    id: str
    team_id: str
    name: str
    acronym: str
    acronym_custom: bool
    employment_start_date: date
    employment_end_date: date | None
    weekly_hours: int  # in hours, contract
    weekly_hours_desired: int  # in hours, desired
    duties_per_month: int  # number of duties per month
    annual_leave: int  # in days
    specialty_ids: List[str]
    deleted: bool
    user_id: str | None = None

    def to_dict(self) -> Dict:
        out = asdict(self)
        out["employment_start_date"] = datetime.combine(
            self.employment_start_date, time.min, tzinfo=timezone.utc
        ).timestamp()
        out["employment_end_date"] = (
            datetime.combine(
                self.employment_end_date, time.min, tzinfo=timezone.utc
            ).timestamp()
            if self.employment_end_date
            else None
        )
        return out

    @classmethod
    def from_dict(cls, data: Dict) -> "Worker":
        return cls(
            id=data["id"],
            team_id=data["team_id"],
            name=data["name"],
            acronym=data["acronym"],
            acronym_custom=data["acronym_custom"],
            employment_start_date=datetime.fromtimestamp(
                data["employment_start_date"], timezone.utc
            ).date(),
            employment_end_date=(
                datetime.fromtimestamp(data["employment_end_date"], timezone.utc).date()
                if data["employment_end_date"]
                else None
            ),
            weekly_hours=data["weekly_hours"],
            weekly_hours_desired=data["weekly_hours_desired"],
            duties_per_month=data["duties_per_month"],
            annual_leave=data["annual_leave"],
            specialty_ids=data["specialty_ids"],
            deleted=data["deleted"],
            user_id=data.get("user_id", None),
        )

    def to_dto(self, attributes: List[Attribute]) -> WorkerDTO:
        data = asdict(self)
        data["employment_start_date"] = datetime.combine(
            self.employment_start_date, time.min, tzinfo=timezone.utc
        ).timestamp()
        data["employment_end_date"] = (
            datetime.combine(
                self.employment_end_date, time.min, tzinfo=timezone.utc
            ).timestamp()
            if self.employment_end_date
            else None
        )
        data["attributes"] = [attr.to_dict() for attr in attributes]
        as_dict = humps.camelize(data)
        validator = TypeAdapter(WorkerDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: WorkerDTO) -> "Worker":
        data_dict = humps.decamelize(data.model_dump())
        data_dict["employment_start_date"] = datetime.fromtimestamp(
            data_dict["employment_start_date"], tz=timezone.utc
        ).date()
        data_dict["employment_end_date"] = (
            datetime.fromtimestamp(
                data_dict["employment_end_date"], tz=timezone.utc
            ).date()
            if data_dict["employment_end_date"]
            else None
        )
        data_dict.pop("attributes", None)
        return cls(**data_dict)


@dataclass
class WorkerDates:
    dates_hist: List[date]
    dates_campaign: List[date]
