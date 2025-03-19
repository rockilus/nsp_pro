from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId

from shared.database_pymongo.schemas.base import DocumentBaseSchema
from shared.schemas.schemas.coverage import CoverageSelector as CoreCoverageSelector


class CoverageSelectorSchema(DocumentBaseSchema):
    """Coverage Selector schema for validation."""

    schedule: ObjectId
    coverage: Optional[ObjectId] = None
    full_period: bool
    start_date: datetime
    end_date: datetime

    def to_core(self) -> CoreCoverageSelector:
        return CoreCoverageSelector(
            id=str(self.id) or "",
            schedule_id=str(self.schedule),
            coverage_id=str(self.coverage) if self.coverage else None,
            full_period=self.full_period,
            start_date=self.start_date.date(),
            end_date=self.end_date.date(),
        )

    @classmethod
    def from_core(
        cls, coverage_selector: CoreCoverageSelector
    ) -> "CoverageSelectorSchema":
        return cls(
            id=(
                ObjectId(coverage_selector.id)
                if coverage_selector.id and ObjectId.is_valid(coverage_selector.id)
                else None
            ),
            schedule=ObjectId(coverage_selector.schedule_id),
            coverage=(
                ObjectId(coverage_selector.coverage_id)
                if coverage_selector.coverage_id
                and ObjectId.is_valid(coverage_selector.coverage_id)
                else None
            ),
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
        )
