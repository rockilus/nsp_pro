from typing import List

from pydantic import BaseModel


class LinkShiftDTO(BaseModel):
    id: str
    teamId: str
    shiftIds: List[str]


class LSChangeDTO(BaseModel):
    updated: List[LinkShiftDTO]
    deleted: List[str]  # List of IDs of deleted link shifts
