from dataclasses import asdict, dataclass
from datetime import date
from enum import Enum

import humps
from pydantic import TypeAdapter

from shared.schemas.dto.export_options import ExportOptionsDTO


class ExportPeriodOptions(Enum):
    CURRENT_SELECTION = 0
    CAMPAIGN = 1
    ALL = 2
    CUSTOM = 3


@dataclass
class ExportOptions:
    period_option: ExportPeriodOptions
    start_date: date
    end_date: date

    def to_dto(self) -> ExportOptionsDTO:
        data = asdict(self)
        data["periodOption"] = self.period_option.value
        as_dict = humps.camelize(data)
        validator = TypeAdapter(ExportOptionsDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, dto: ExportOptionsDTO) -> "ExportOptions":
        data_snake = humps.decamelize(dto.model_dump())
        data_snake["period_option"] = ExportPeriodOptions(data_snake["period_option"])
        return cls(**data_snake)
