from datetime import datetime, time, timezone
from typing import Any, Dict

from shared.database.schemas.base import DocumentBaseSchema
from shared.schemas.core.recurrence import RecurrenceExclusion


class RecurrenceExclusionSchema(DocumentBaseSchema):
    """Recurrence Exclusion schema for validation."""

    recurrence_rule_id: str
    excluded_date: float  # Timestamp at the start of the day, UTC

    def to_core(self) -> RecurrenceExclusion:
        return RecurrenceExclusion(
            id=self.id or "",
            recurrence_rule_id=self.recurrence_rule_id,
            excluded_date=datetime.fromtimestamp(
                self.excluded_date, tz=timezone.utc
            ).date(),
        )

    @classmethod
    def from_core(cls, exclusion: RecurrenceExclusion) -> "RecurrenceExclusionSchema":
        return cls(
            id=exclusion.id,
            recurrence_rule_id=exclusion.recurrence_rule_id,
            excluded_date=datetime.combine(
                exclusion.excluded_date, time.min, timezone.utc
            ).timestamp(),
        )

    @classmethod
    def from_mongo(cls, data: Dict[str, Any]) -> "RecurrenceExclusionSchema":
        data["id"] = str(data.pop("_id"))
        return cls(**data)
