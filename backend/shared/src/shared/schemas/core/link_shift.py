from dataclasses import asdict, dataclass
from typing import Dict, List

import humps
from pydantic import TypeAdapter

from shared.schemas.core.shift import Shift
from shared.schemas.dto.link_shift import LinkShiftDTO, LSChangeDTO


@dataclass
class ValidationResult:
    is_valid: bool
    message: str


@dataclass
class LinkShift:
    id: str
    team_id: str
    shift_ids: List[str]

    def to_dict(self) -> Dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict) -> "LinkShift":
        return cls(
            id=data["id"],
            team_id=data["team_id"],
            shift_ids=data["shift_ids"],
        )

    def validate(
        self, shifts_ls: List[Shift], ls_others: List["LinkShift"]
    ) -> ValidationResult:
        if len(self.shift_ids) != 2:
            return ValidationResult(
                is_valid=False,
                message="LinkShift must contain at two shifts.",
            )
        if len(self.shift_ids) != len(set(self.shift_ids)):
            return ValidationResult(
                is_valid=False,
                message="Duplicate shift IDs found in link_shift.shift_ids.",
            )
        if len(shifts_ls) != len(self.shift_ids):
            return ValidationResult(
                is_valid=False, message="Shifts not found."
            )
        if self.shifts_overlap(shifts_ls):
            return ValidationResult(is_valid=False, message="Shifts overlap.")
        for ls in ls_others:
            if set(ls.shift_ids) == set(self.shift_ids):
                return ValidationResult(
                    is_valid=False,
                    message="LinkShift already exists.",
                )
        return ValidationResult(is_valid=True, message="")

    @staticmethod
    def shifts_overlap(shifts: list[Shift]) -> bool:
        for i, shift1 in enumerate(shifts):
            for shift2 in shifts[i + 1 :]:
                if shift1.overlaps_with(shift2):
                    return True
        return False

    def to_dto(self) -> LinkShiftDTO:
        data = asdict(self)
        as_dict = humps.camelize(data)
        validator = TypeAdapter(LinkShiftDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, dto: LinkShiftDTO) -> "LinkShift":
        data_snake = humps.decamelize(dto.model_dump())
        return cls(**data_snake)


@dataclass
class LSChange:
    updated: List[LinkShift]
    deleted: List[str]

    def to_dto(self) -> LSChangeDTO:
        updated_dto = [ls.to_dto() for ls in self.updated]
        data = {
            "updated": updated_dto,
            "deleted": self.deleted,
        }
        as_dict = humps.camelize(data)
        validator = TypeAdapter(LSChangeDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, dto: LSChangeDTO) -> "LSChange":
        data_snake = humps.decamelize(dto.model_dump())
        updated = [LinkShift.from_dto(ls) for ls in data_snake["updated"]]
        return cls(updated=updated, deleted=data_snake["deleted"])
