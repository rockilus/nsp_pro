from dataclasses import dataclass


@dataclass
class Specialty:
    id: str
    team_id: str
    name: str
    deleted: bool
