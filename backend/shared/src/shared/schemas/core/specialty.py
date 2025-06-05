from dataclasses import asdict, dataclass

import humps
from pydantic import TypeAdapter

from shared.schemas.dto.specialty import SpecialtyDTO


@dataclass
class Specialty:
    id: str
    team_id: str
    name: str
    deleted: bool

    def to_dto(self) -> SpecialtyDTO:
        data = asdict(self)
        as_dict = humps.camelize(data)
        validator = TypeAdapter(SpecialtyDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, dto: SpecialtyDTO) -> "Specialty":
        data_snake = humps.decamelize(dto.model_dump())
        return cls(**data_snake)
