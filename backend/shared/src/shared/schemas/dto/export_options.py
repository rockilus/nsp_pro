from pydantic import BaseModel


class ExportOptionsDTO(BaseModel):
    periodOption: int
    startDate: float
    endDate: float
