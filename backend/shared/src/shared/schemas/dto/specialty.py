from pydantic import BaseModel


class SpecialtyDTO(BaseModel):
    id: str
    teamId: str
    name: str
    deleted: bool
