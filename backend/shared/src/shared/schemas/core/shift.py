from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List

import humps
from pydantic import TypeAdapter

from shared.schemas.core.attribute import Attribute
from shared.schemas.dto.shift import ShiftDTO, StaffingDTO


class ShiftType(Enum):
    NORMAL = 0
    DUTY = 1
    REST = 2  # non-working time (e.g. weekend) or recuperation time
    LEAVE = 3  # time off (e.g. vacation, sick leave, parental leave, training)


class ShiftRestType(Enum):
    NONE = 0
    OFF = 1
    RECUPERATION = 2


class ShiftLeaveType(Enum):
    NONE = 0
    VACATION = 1
    VACATION_MORNING = 2
    VACATION_AFTERNOON = 3
    SICK = 4
    SICK_MORNING = 5
    SICK_AFTERNOON = 6
    UNPAID = 7
    UNPAID_MORNING = 8
    UNPAID_AFTERNOON = 9
    PARENTAL_LEAVE = 10
    PARENTAL_LEAVE_MORNING = 11
    PARENTAL_LEAVE_AFTERNOON = 12
    TRAINING = 13
    TRAINING_MORNING = 14
    TRAINING_AFTERNOON = 15
    OTHER = 16
    OTHER_MORNING = 17
    OTHER_AFTERNOON = 18


@dataclass
class Staffing:
    specialty_id: str | None
    staffing: int

    def to_dto(self) -> StaffingDTO:
        data = asdict(self)
        as_dict = humps.camelize(data)
        validator = TypeAdapter(StaffingDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: StaffingDTO) -> "Staffing":
        data_dict = humps.decamelize(data.model_dump())
        return cls(**data_dict)


# pylint: disable=too-many-instance-attributes, R0801
@dataclass
class Shift:
    id: str
    team_id: str
    name: str
    acronym: str
    acronym_custom: bool
    start_time: datetime
    end_time: datetime
    staffing: List[Staffing]
    color: str
    shift_type: ShiftType
    rest_type: ShiftRestType
    leave_type: ShiftLeaveType
    recuperation_time: int  # in hours
    recuperation_duty_id: str | None
    deleted: bool

    def to_dict(self) -> Dict:
        out = asdict(self)
        out["start_time"] = self.start_time.timestamp()
        out["end_time"] = self.end_time.timestamp()
        out["shift_type"] = self.shift_type.value
        out["rest_type"] = self.rest_type.value
        out["leave_type"] = self.leave_type.value
        # pylint: disable=R0801
        return out

    # pylint: disable=R0801
    @classmethod
    def from_dict(cls, data: Dict) -> "Shift":
        return cls(
            id=data["id"],
            team_id=data["team_id"],
            name=data["name"],
            acronym=data["acronym"],
            acronym_custom=data["acronym_custom"],
            start_time=datetime.fromtimestamp(
                data["start_time"], tz=timezone.utc
            ),
            end_time=datetime.fromtimestamp(data["end_time"], tz=timezone.utc),
            staffing=[Staffing(**s) for s in data["staffing"]],
            color=data["color"],
            shift_type=ShiftType(data["shift_type"]),
            rest_type=ShiftRestType(data["rest_type"]),
            leave_type=ShiftLeaveType(data["leave_type"]),
            recuperation_time=data["recuperation_time"],
            recuperation_duty_id=data["recuperation_duty_id"],
            deleted=data["deleted"],
        )

    def to_dto(self, attributes: List[Attribute]) -> ShiftDTO:
        data = asdict(self)
        data["start_time"] = self.start_time.timestamp()
        data["end_time"] = self.end_time.timestamp()
        data["staffing"] = [s.to_dto() for s in self.staffing]
        data["shift_type"] = self.shift_type.value
        data["rest_type"] = self.rest_type.value
        data["leave_type"] = self.leave_type.value
        data["attributes"] = [attr.to_dict() for attr in attributes]
        as_dict = humps.camelize(data)
        validator = TypeAdapter(ShiftDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: ShiftDTO) -> "Shift":
        data_dict = humps.decamelize(data.model_dump())
        data_dict["start_time"] = datetime.fromtimestamp(
            data_dict["start_time"], tz=timezone.utc
        )
        data_dict["end_time"] = datetime.fromtimestamp(
            data_dict["end_time"], tz=timezone.utc
        )
        data_dict["staffing"] = [Staffing.from_dto(s) for s in data.staffing]
        data_dict["shift_type"] = ShiftType(data_dict["shift_type"])
        data_dict["rest_type"] = ShiftRestType(data_dict["rest_type"])
        data_dict["leave_type"] = ShiftLeaveType(data_dict["leave_type"])
        data_dict.pop("attributes", None)
        return cls(**data_dict)
