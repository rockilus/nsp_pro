from dataclasses import asdict, dataclass
from datetime import date, datetime, time, timezone
from enum import Enum
from typing import Dict


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
            end_date=datetime.fromtimestamp(
                data["end_date"], tz=timezone.utc
            ).date(),
            shift_id=data["shift_id"],
            negative=data["negative"],
            hard=data["hard"],
            status=RequestStatus(data["status"]),
        )


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
            end_date=datetime.fromtimestamp(
                data["end_date"], tz=timezone.utc
            ).date(),
            shift_id=data["shift_id"],
            negative=data["negative"],
            hard=data["hard"],
            status=RequestStatus(data["status"]),
            active=data["active"],
        )
