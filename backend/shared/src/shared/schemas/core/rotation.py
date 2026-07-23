from dataclasses import asdict, dataclass
from datetime import date, datetime, time, timezone
from enum import Enum
from typing import Dict

import humps
from pydantic import TypeAdapter

from shared.schemas.dto.rotation import (
    RotationCreateDTO,
    RotationDTO,
    RotationUpdateDTO,
)


class RotationBreakBehavior(Enum):
    CONTINUE = 0
    SWAP = 1
    RESTART = 2


@dataclass
class Rotation:
    id: str
    team_id: str
    name: str
    shift_id: str
    worker_ids: list[str]
    current_position: int
    start_date: date
    end_date: date | None
    last_materialized_until: date | None = None

    def to_dict(self) -> Dict:
        out = asdict(self)
        out["start_date"] = datetime.combine(
            self.start_date, time.min, tzinfo=timezone.utc
        ).timestamp()
        out["end_date"] = (
            datetime.combine(self.end_date, time.min, tzinfo=timezone.utc).timestamp()
            if self.end_date
            else None
        )
        out["last_materialized_until"] = (
            datetime.combine(
                self.last_materialized_until, time.min, tzinfo=timezone.utc
            ).timestamp()
            if self.last_materialized_until
            else None
        )
        return out

    @classmethod
    def from_dict(cls, data: Dict) -> "Rotation":
        return cls(
            id=data["id"],
            team_id=data["team_id"],
            name=data["name"],
            shift_id=data["shift_id"],
            worker_ids=data["worker_ids"],
            current_position=data["current_position"],
            start_date=datetime.fromtimestamp(data["start_date"], timezone.utc).date(),
            end_date=(
                datetime.fromtimestamp(data["end_date"], timezone.utc).date()
                if data.get("end_date")
                else None
            ),
            last_materialized_until=(
                datetime.fromtimestamp(
                    data["last_materialized_until"], timezone.utc
                ).date()
                if data.get("last_materialized_until")
                else None
            ),
        )

    def to_dto(self) -> RotationDTO:
        data = asdict(self)
        data["start_date"] = datetime.combine(
            self.start_date, time.min, tzinfo=timezone.utc
        ).timestamp()
        data["end_date"] = (
            datetime.combine(self.end_date, time.min, tzinfo=timezone.utc).timestamp()
            if self.end_date
            else None
        )
        data["last_materialized_until"] = (
            datetime.combine(
                self.last_materialized_until, time.min, tzinfo=timezone.utc
            ).timestamp()
            if self.last_materialized_until
            else None
        )
        as_dict = humps.camelize(data)
        validator = TypeAdapter(RotationDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: RotationDTO) -> "Rotation":
        data_snake = humps.decamelize(data.model_dump())
        data_snake["start_date"] = datetime.fromtimestamp(
            data_snake["start_date"], timezone.utc
        ).date()
        data_snake["end_date"] = (
            datetime.fromtimestamp(data_snake["end_date"], timezone.utc).date()
            if data_snake.get("end_date")
            else None
        )
        data_snake["last_materialized_until"] = (
            datetime.fromtimestamp(
                data_snake["last_materialized_until"], timezone.utc
            ).date()
            if data_snake.get("last_materialized_until")
            else None
        )
        return cls(**data_snake)

    @classmethod
    def from_create_dto(cls, team_id: str, data: RotationCreateDTO) -> "Rotation":
        data_snake = humps.decamelize(data.model_dump())
        return cls(
            id=data_snake.get("id", ""),
            team_id=team_id,
            name=data_snake["name"],
            shift_id=data_snake["shift_id"],
            worker_ids=data_snake["worker_ids"],
            current_position=0,
            start_date=datetime.fromtimestamp(
                data_snake["start_date"], timezone.utc
            ).date(),
            end_date=(
                datetime.fromtimestamp(data_snake["end_date"], timezone.utc).date()
                if data_snake.get("end_date")
                else None
            ),
            last_materialized_until=None,
        )

    def apply_update_dto(self, data: RotationUpdateDTO) -> "Rotation":
        updates = data.model_dump(exclude_unset=True)
        updates_snake = humps.decamelize(updates)
        if "name" in updates_snake:
            self.name = updates_snake["name"]
        if "worker_ids" in updates_snake:
            self.worker_ids = updates_snake["worker_ids"]
        if "start_date" in updates_snake:
            self.start_date = datetime.fromtimestamp(
                updates_snake["start_date"], timezone.utc
            ).date()
        if "end_date" in updates_snake:
            self.end_date = (
                datetime.fromtimestamp(updates_snake["end_date"], timezone.utc).date()
                if updates_snake["end_date"] is not None
                else None
            )
        if "current_position" in updates_snake:
            self.current_position = updates_snake["current_position"]
        return self
