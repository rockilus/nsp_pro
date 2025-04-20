from pydantic import Field

from shared.database.schemas.base import DocumentBaseSchema
from shared.schemas.core.specialty import Specialty


class SpecialtySchema(DocumentBaseSchema):
    """Specialty schema for validation."""

    team: str
    name: str
    deleted: bool = Field(
        default=False, description="Indicates if the specialty is deleted"
    )

    def to_core(self) -> Specialty:
        return Specialty(
            id=self.id or "",
            team_id=self.team,
            name=self.name,
            deleted=self.deleted,
        )

    @classmethod
    def from_core(cls, specialty: Specialty) -> "SpecialtySchema":
        return cls(
            id=specialty.id,
            team=specialty.team_id,
            name=specialty.name,
            deleted=specialty.deleted,
        )
