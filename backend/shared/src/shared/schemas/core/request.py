from dataclasses import asdict, dataclass
from datetime import date, datetime, time, timezone
from enum import Enum
from typing import Dict

import humps
from pydantic import TypeAdapter

from shared.schemas.dto.request import RequestDTO


class RequestStatus(Enum):
    PENDING = 0
    APPROVED = 1
    REJECTED = 2
    DISABLED = 3


@dataclass
class Request:
    id: str
    team_id: str
    worker_id: str
    start_date: date
    end_date: date
    shift_id: str
    negative: bool
    hard: bool
    status: RequestStatus

    def to_dict(self) -> Dict:
        out = asdict(self)
        out["start_date"] = datetime.combine(
            self.start_date, time.min, tzinfo=timezone.utc
        ).timestamp()
        out["end_date"] = datetime.combine(
            self.end_date, time.min, tzinfo=timezone.utc
        ).timestamp()
        out["status"] = self.status.value
        return out

    @classmethod
    def from_dict(cls, data: Dict) -> "Request":
        return cls(
            id=data["id"],
            team_id=data["team_id"],
            worker_id=data["worker_id"],
            start_date=datetime.fromtimestamp(
                data["start_date"], tz=timezone.utc
            ).date(),
            end_date=datetime.fromtimestamp(data["end_date"], tz=timezone.utc).date(),
            shift_id=data["shift_id"],
            negative=data["negative"],
            hard=data["hard"],
            status=RequestStatus(data["status"]),
        )

    @classmethod
    def from_dto(cls, data: RequestDTO) -> "Request":
        data_snake = humps.decamelize(data.model_dump())
        data_snake["start_date"] = datetime.fromtimestamp(
            data_snake["start_date"], timezone.utc
        ).date()
        data_snake["end_date"] = datetime.fromtimestamp(
            data_snake["end_date"], timezone.utc
        ).date()
        data_snake["status"] = RequestStatus(data_snake["status"])
        data_snake.pop("active", None)
        return cls(**data_snake)


@dataclass
class RequestAugmented(Request):
    active: bool

    def to_dict(self) -> Dict:
        out = super().to_dict()
        out.update({"active": self.active})
        return out

    @classmethod
    def from_dict(cls, data: Dict) -> "RequestAugmented":
        return cls(
            id=data["id"],
            team_id=data["team_id"],
            worker_id=data["worker_id"],
            start_date=datetime.fromtimestamp(
                data["start_date"], tz=timezone.utc
            ).date(),
            end_date=datetime.fromtimestamp(data["end_date"], tz=timezone.utc).date(),
            shift_id=data["shift_id"],
            negative=data["negative"],
            hard=data["hard"],
            status=RequestStatus(data["status"]),
            active=data["active"],
        )

    def to_dto(self) -> RequestDTO:
        data = asdict(self)
        data["start_date"] = datetime.combine(
            self.start_date, time.min, tzinfo=timezone.utc
        ).timestamp()
        data["end_date"] = datetime.combine(
            self.end_date, time.min, tzinfo=timezone.utc
        ).timestamp()
        data["status"] = self.status.value
        as_dict = humps.camelize(data)
        validator = TypeAdapter(RequestDTO)
        return validator.validate_python(as_dict)
