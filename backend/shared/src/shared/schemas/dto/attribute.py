from typing import List

from pydantic import BaseModel


class AttributeDTO(BaseModel):
    id: str
    value: str | int | bool
    ownerType: int
    ownerId: str
    dimensionId: str
    dimEntryIds: List[str]
