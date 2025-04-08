from dataclasses import asdict, dataclass
from datetime import date, datetime, time, timezone
from typing import Dict


@dataclass
class Assignment:
    id: str
    team_id: str
    schedule_id: str | None
    worker_id: str
    date: date
    shift_id: str
    fixed: bool

    def to_dict(self) -> Dict:
        out = asdict(self)
        out["date"] = datetime.combine(
            self.date, time.min, tzinfo=timezone.utc
        ).timestamp()
        return out

    @classmethod
    def from_dict(cls, data: Dict) -> "Assignment":
        return cls(
            id=data["id"],
            team_id=data["team_id"],
            schedule_id=data["schedule_id"],
            worker_id=data["worker_id"],
            date=datetime.fromtimestamp(data["date"], tz=timezone.utc).date(),
            shift_id=data["shift_id"],
            fixed=data["fixed"],
        )
