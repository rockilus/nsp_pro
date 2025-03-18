from bson import ObjectId
from pydantic import Field

from shared.database_pymongo.schemas.base import DocumentBaseSchema
from shared.schemas.schemas.team import Specialty


class SpecialtySchema(DocumentBaseSchema):
    """Specialty schema for validation."""

    team_id: ObjectId
    name: str
    deleted: bool = Field(
        default=False, description="Indicates if the specialty is deleted"
    )

    def to_core(self) -> Specialty:
        return Specialty(
            id=str(self.id) or "",
            team_id=str(self.team_id),
            name=self.name,
            deleted=self.deleted,
        )

    @classmethod
    def from_core(cls, specialty: Specialty) -> "SpecialtySchema":
        return cls(
            id=(
                ObjectId(specialty.id)
                if specialty.id and ObjectId.is_valid(specialty.id)
                else None
            ),
            team_id=ObjectId(specialty.team_id),
            name=specialty.name,
            deleted=specialty.deleted,
        )
