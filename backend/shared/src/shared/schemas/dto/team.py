from pydantic import BaseModel


class TeamDTO(BaseModel):
    id: str
    name: str
    createdByUserId: str
    createdAt: float
