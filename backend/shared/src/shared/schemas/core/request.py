from dataclasses import asdict, dataclass, field
from datetime import date, datetime, time, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Union

import humps
from pydantic import TypeAdapter

from shared.schemas.core.constraint import ShiftWorkerOption
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
    shift_id: Optional[str] = None  # Used for LEAVE requests
    shift_options: List[ShiftWorkerOption] = field(
        default_factory=list
    )  # Used for WORK_DEMAND requests
    negative: bool = False
    hard: bool = True
    status: RequestStatus = RequestStatus.PENDING
    fulfillment: FulfillmentStatus = FulfillmentStatus.NOT_PROCESSED
    comment: str = ""
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def __post_init__(self):
        """Validate the request data based on request type."""
        if self.request_type == RequestType.LEAVE and not self.shift_id:
            raise ValueError("Leave requests must specify a shift_id")
        if self.request_type == RequestType.WORK_DEMAND and not self.shift_options:
            raise ValueError("Work demand requests must specify shift_options")

    @property
    def shift_selection(self) -> Union[str, List[ShiftWorkerOption]]:
        """Return the appropriate shift selection based on request type."""
        if self.request_type == RequestType.LEAVE:
            assert self.shift_id is not None, "Leave requests must have a shift_id"
            return self.shift_id
        return self.shift_options

    # pylint: disable=too-many-arguments, too-many-positional-arguments
    @classmethod
    def create_leave_request(
        cls,
        request_id: str,
        team_id: str,
        worker_id: str,
        start_date: date,
        end_date: date,
        shift_id: str,
        **kwargs: Any,
    ) -> "Request":
        """Factory method for creating leave requests."""
        return cls(
            id=request_id,
            team_id=team_id,
            request_type=RequestType.LEAVE,
            worker_id=worker_id,
            start_date=start_date,
            end_date=end_date,
            shift_id=shift_id,
            **kwargs,
        )

    @classmethod
    def create_work_demand(
        cls,
        request_id: str,
        team_id: str,
        worker_id: str,
        start_date: date,
        end_date: date,
        shift_options: List[ShiftWorkerOption],
        negative: bool,
        **kwargs: Any,
    ) -> "Request":
        """Factory method for creating work demand requests."""
        return cls(
            id=request_id,
            team_id=team_id,
            request_type=RequestType.WORK_DEMAND,
            worker_id=worker_id,
            start_date=start_date,
            end_date=end_date,
            shift_options=shift_options,
            negative=negative,
            **kwargs,
        )

    def to_dict(self) -> Dict:
        out = asdict(self)
        out["request_type"] = self.request_type.value
        out["start_date"] = datetime.combine(
            self.start_date, time.min, tzinfo=timezone.utc
        ).timestamp()
        out["end_date"] = datetime.combine(
            self.end_date, time.min, tzinfo=timezone.utc
        ).timestamp()
        out["shift_options"] = [option.to_dict() for option in self.shift_options]
        out["status"] = self.status.value
        out["fulfillment"] = self.fulfillment.value
        out["created_at"] = self.created_at.timestamp()
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
            shift_options=[
                ShiftWorkerOption.from_dict(option)
                for option in data.get("shift_options", [])
            ],
            negative=data["negative"],
            hard=data["hard"],
            status=RequestStatus(data["status"]),
            fulfillment=FulfillmentStatus(data["fulfillment"]),
            comment=data.get("comment", ""),
            created_at=datetime.fromtimestamp(data["created_at"], tz=timezone.utc),
        )

    @classmethod
    def from_dto(cls, data: RequestDTO) -> "Request":
        data_snake = humps.decamelize(data.model_dump())
        data_snake["request_type"] = RequestType(data_snake["request_type"])
        data_snake["start_date"] = datetime.fromtimestamp(
            data_snake["start_date"], timezone.utc
        ).date()
        data_snake["end_date"] = datetime.fromtimestamp(
            data_snake["end_date"], timezone.utc
        ).date()
        data_snake["status"] = RequestStatus(data_snake["status"])
        data_snake["fulfillment"] = FulfillmentStatus(data_snake["fulfillment"])
        data_snake["created_at"] = datetime.fromtimestamp(
            data_snake["created_at"], timezone.utc
        )
        data_snake.pop("active", None)
        return cls(**data_snake)


@dataclass
class RequestAugmented(Request):
    active: bool = False

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
            created_at=datetime.fromtimestamp(data["created_at"], tz=timezone.utc),
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
        data["created_at"] = self.created_at.timestamp()
        as_dict = humps.camelize(data)
        validator = TypeAdapter(RequestDTO)
        return validator.validate_python(as_dict)
