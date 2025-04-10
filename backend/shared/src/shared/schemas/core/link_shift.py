from dataclasses import asdict, dataclass
from datetime import datetime, timedelta, timezone
from typing import Dict, List

from shared.schemas.core.shift import Shift


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
            return ValidationResult(is_valid=False, message="Shifts not found.")
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
                date_ref = datetime.now(timezone.utc).date()

                s1_diff_days = (shift1.end_time - shift1.start_time).days
                s1_start = datetime.combine(date_ref, shift1.start_time.time())
                s1_end = datetime.combine(date_ref, shift1.end_time.time()) + timedelta(
                    days=s1_diff_days
                )

                s2_diff_days = (shift2.end_time - shift2.start_time).days
                s2_start = datetime.combine(date_ref, shift2.start_time.time())
                s2_end = datetime.combine(date_ref, shift2.end_time.time()) + timedelta(
                    days=s2_diff_days
                )

                if s1_start < s2_end and s1_end > s2_start:
                    return True
        return False
