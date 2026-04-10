from pydantic import BaseModel


class DimEntryDTO(BaseModel):
    id: str
    dimensionId: str
    name: str
    deleted: bool
