from bson import ObjectId

from shared.database_pymongo.schemas.base import DocumentBaseSchema
from shared.schemas.schemas.coverage import Coverage


class CoverageSchema(DocumentBaseSchema):
    """Coverage schema for validation."""

    team: ObjectId
    name: str

    def to_core(self) -> Coverage:
        return Coverage(
            id=str(self.id) or "",
            team_id=str(self.team),
            name=self.name,
        )

    @classmethod
    def from_core(cls, coverage: Coverage) -> "CoverageSchema":
        return cls(
            id=(
                ObjectId(coverage.id)
                if coverage.id and ObjectId.is_valid(coverage.id)
                else None
            ),
            team=ObjectId(coverage.team_id),
            name=coverage.name,
        )
