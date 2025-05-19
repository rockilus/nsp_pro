from dataclasses import asdict, dataclass
from datetime import date, datetime, time, timezone
from enum import Enum
from typing import Dict

import humps
from pydantic import TypeAdapter

from shared.schemas.dto.request import RequestDTO

# class RequestStatus(Enum):
#     PENDING = 0
#     APPROVED = 1
#     REJECTED = 2
#     DISABLED = 3


class RequestStatus(Enum):
    PENDING = "pending"  # Waiting for manager review
    APPROVED = "approved"  # Approved and must be fulfilled
    DENIED = "denied"  # Denied and must not be fulfilled
    DEFERRED = "deferred"  # Left to the algorithm to decide


class FulfillmentStatus(Enum):
    NOT_PROCESSED = "not_processed"
    FULFILLED = "fulfilled"
    UNFULFILLED = "unfulfilled"


class RequestType(Enum):
    WORK_DEMAND = "work_demand"
    LEAVE = "leave"


# pylint: disable=too-many-instance-attributes
@dataclass
class Request:
    id: str
    team_id: str
    request_type: RequestType
    worker_id: str
    start_date: date
    end_date: date
    shift_id: str
    negative: bool
    hard: bool
    status: RequestStatus
    fulfillment: FulfillmentStatus
    comment: str

    def to_dict(self) -> Dict:
        out = asdict(self)
        out["request_type"] = self.request_type.value
        out["start_date"] = datetime.combine(
            self.start_date, time.min, tzinfo=timezone.utc
        ).timestamp()
        out["end_date"] = datetime.combine(
            self.end_date, time.min, tzinfo=timezone.utc
        ).timestamp()
        out["status"] = self.status.value
        out["fulfillment"] = self.fulfillment.value
        return out

    @classmethod
    def from_dict(cls, data: Dict) -> "Request":
        return cls(
            id=data["id"],
            team_id=data["team_id"],
            request_type=RequestType(data["request_type"]),
            worker_id=data["worker_id"],
            start_date=datetime.fromtimestamp(
                data["start_date"], tz=timezone.utc
            ).date(),
            end_date=datetime.fromtimestamp(data["end_date"], tz=timezone.utc).date(),
            shift_id=data["shift_id"],
            negative=data["negative"],
            hard=data["hard"],
            status=RequestStatus(data["status"]),
            fulfillment=FulfillmentStatus(data["fulfillment"]),
            comment=data.get("comment", ""),
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
            request_type=RequestType(data["request_type"]),
            worker_id=data["worker_id"],
            start_date=datetime.fromtimestamp(
                data["start_date"], tz=timezone.utc
            ).date(),
            end_date=datetime.fromtimestamp(data["end_date"], tz=timezone.utc).date(),
            shift_id=data["shift_id"],
            negative=data["negative"],
            hard=data["hard"],
            status=RequestStatus(data["status"]),
            fulfillment=FulfillmentStatus(data["fulfillment"]),
            comment=data.get("comment", ""),
            active=data["active"],
        )

    def to_dto(self) -> RequestDTO:
        data = asdict(self)
        data["request_type"] = self.request_type.value
        data["start_date"] = datetime.combine(
            self.start_date, time.min, tzinfo=timezone.utc
        ).timestamp()
        data["end_date"] = datetime.combine(
            self.end_date, time.min, tzinfo=timezone.utc
        ).timestamp()
        data["status"] = self.status.value
        data["fulfillment"] = self.fulfillment.value
        as_dict = humps.camelize(data)
        validator = TypeAdapter(RequestDTO)
        return validator.validate_python(as_dict)
