from datetime import datetime
from typing import Any, Dict, Optional, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T", bound=BaseModel)


class BaseSchema(BaseModel):
    """Base schema for all models."""

    model_config = ConfigDict(
        populate_by_name=True,
        validate_assignment=True,
        arbitrary_types_allowed=True,
        json_encoders={
            datetime: lambda dt: dt.isoformat(),
        },
    )

    @classmethod
    def from_mongo(cls, data: Dict[str, Any]):
        """Convert MongoDB data to Pydantic model."""
        if not data:
            return None

        # Convert MongoDB '_id' to 'id' if it exists
        if "_id" in data and "id" not in data:
            data["id"] = str(data.pop("_id"))

        return cls(**data)

    def to_mongo(self) -> Dict[str, Any]:
        """Convert Pydantic model to MongoDB document."""
        data = self.model_dump(by_alias=True)

        # Convert 'id' to '_id' for MongoDB
        if "id" in data:
            data["_id"] = data.pop("id")

        return data


class DocumentBaseSchema(BaseSchema):
    """Base schema for document models."""

    id: Optional[str] = Field(default=None, description="Document identifier")
