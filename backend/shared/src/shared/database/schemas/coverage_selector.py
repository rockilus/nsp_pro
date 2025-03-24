from datetime import datetime, timezone
from typing import Optional

from shared.database.schemas.base import DocumentBaseSchema
from shared.schemas.schemas.coverage import CoverageSelector as CoreCoverageSelector


class CoverageSelectorSchema(DocumentBaseSchema):
    """Coverage Selector schema for validation."""

    schedule: str
    coverage: Optional[str] = None
    full_period: bool
    start_date: datetime
    end_date: datetime
    last_modified: float

    def to_core(self) -> CoreCoverageSelector:
        return CoreCoverageSelector(
            id=self.id or "",
            schedule_id=self.schedule,
            coverage_id=self.coverage,
            full_period=self.full_period,
            start_date=self.start_date.date(),
            end_date=self.end_date.date(),
            last_modified=datetime.fromtimestamp(self.last_modified, tz=timezone.utc),
        )

    @classmethod
    def from_core(
        cls, coverage_selector: CoreCoverageSelector
    ) -> "CoverageSelectorSchema":
        return cls(
            id=coverage_selector.id,
            schedule=coverage_selector.schedule_id,
            coverage=coverage_selector.coverage_id,
            full_period=coverage_selector.full_period,
            start_date=datetime.combine(
                coverage_selector.start_date,
                datetime.min.time(),
                tzinfo=timezone.utc,
            ),
            end_date=datetime.combine(
                coverage_selector.end_date,
                datetime.min.time(),
                tzinfo=timezone.utc,
            ),
            last_modified=coverage_selector.last_modified.timestamp(),
        )
