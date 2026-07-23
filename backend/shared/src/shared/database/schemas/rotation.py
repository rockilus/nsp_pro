from datetime import datetime, time, timezone
from typing import List, Optional

from shared.database.schemas.base import DocumentBaseSchema
from shared.schemas.core.rotation import Rotation


class RotationSchema(DocumentBaseSchema):
    team_id: str
    name: str
    shift_id: str
    worker_ids: List[str]
    current_position: int
    start_date: float
    end_date: Optional[float] = None

    def to_core(self) -> Rotation:
        return Rotation(
            id=self.id or "",
            team_id=self.team_id,
            name=self.name,
            shift_id=self.shift_id,
            worker_ids=self.worker_ids,
            current_position=self.current_position,
            start_date=datetime.fromtimestamp(self.start_date, tz=timezone.utc).date(),
            end_date=(
                datetime.fromtimestamp(self.end_date, tz=timezone.utc).date()
                if self.end_date is not None
                else None
            ),
        )

    @classmethod
    def from_core(cls, rotation: Rotation) -> "RotationSchema":
        return cls(
            id=rotation.id,
            team_id=rotation.team_id,
            name=rotation.name,
            shift_id=rotation.shift_id,
            worker_ids=rotation.worker_ids,
            current_position=rotation.current_position,
            start_date=datetime.combine(
                rotation.start_date, time.min, timezone.utc
            ).timestamp(),
            end_date=(
                datetime.combine(rotation.end_date, time.min, timezone.utc).timestamp()
                if rotation.end_date
                else None
            ),
        )
