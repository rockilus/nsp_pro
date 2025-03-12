from shared.database_pymongo.schemas.base import DocumentBaseSchema
from shared.schemas.schemas.coverage import Coverage


class CoverageSchema(DocumentBaseSchema):
    """Coverage schema for validation."""

    team: str
    name: str

    def to_core(self) -> Coverage:
        return Coverage(
            id=self.id or "",
            team_id=self.team,
            name=self.name,
        )

    @classmethod
    def from_core(cls, coverage: Coverage) -> "CoverageSchema":
        return cls(
            id=coverage.id,
            team=coverage.team_id,
            name=coverage.name,
        )
