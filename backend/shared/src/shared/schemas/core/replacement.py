from dataclasses import asdict, dataclass
from datetime import datetime
from enum import Enum
from typing import Dict, List

import humps
from pydantic import TypeAdapter

from shared.schemas.core.breach import Breach
from shared.schemas.dto.replacement import (
    ConstraintHitsDTO,
    FilterHitsDTO,
    LTMIndicatorDTO,
    MonthlyDutiesImplicationsDTO,
    OverlapHitsDTO,
    ReplacementCandidateDTO,
    ReplacementImplicationsDTO,
    RequestHitsDTO,
    WeeklyWorkTimeImplicationsDTO,
)


class ReplacementCategory(Enum):
    CANT_DO = "cant_do"
    COULD_DO = "could_do"
    CAN_DO = "can_do"


class MostConstrainingReason(Enum):
    NOT_EMPLOYED = "not_employed"
    MISSING_SPECIALTY = "missing_specialty"
    ON_LEAVE = "on_leave"
    FILTERED_OUT = "filtered_out"
    HAS_OVERLAP = "has_overlap"
    HARD_CONSTRAINT_VIOLATION = "hard_constraint_violation"
    REQUEST_CONFLICT = "request_conflict"
    SOFT_CONSTRAINT_VIOLATION = "soft_constraint_violation"
    NO_CONSTRAINTS_VIOLATED = "no_constraints_violated"


@dataclass
class FilterHits:
    isnt_filtered_out: bool
    filter_labels: List[str]

    def to_dict(self) -> Dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict) -> "FilterHits":
        return cls(**data)

    def to_dto(self) -> FilterHitsDTO:
        data = asdict(self)
        as_dict = humps.camelize(data)
        validator = TypeAdapter(FilterHitsDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: FilterHitsDTO) -> "FilterHits":
        data_dict = humps.decamelize(data.model_dump())
        return cls(**data_dict)


@dataclass
class OverlapHits:
    hasnt_overlap: bool
    overlap_assignment_ids: List[str]

    def to_dict(self) -> Dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict) -> "OverlapHits":
        return cls(**data)

    def to_dto(self) -> OverlapHitsDTO:
        data = asdict(self)
        as_dict = humps.camelize(data)
        validator = TypeAdapter(OverlapHitsDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: OverlapHitsDTO) -> "OverlapHits":
        data_dict = humps.decamelize(data.model_dump())
        return cls(**data_dict)


@dataclass
class ConstraintHits:
    meets_constraints: bool
    breaches: List[Breach]

    def to_dict(self) -> Dict:
        out = asdict(self)
        out["breaches"] = [breach.to_dict() for breach in self.breaches]
        return out

    @classmethod
    def from_dict(cls, data: Dict) -> "ConstraintHits":
        return cls(
            meets_constraints=data["meets_constraints"],
            breaches=[Breach.from_dict(b) for b in data["breaches"]],
        )

    def to_dto(self) -> ConstraintHitsDTO:
        data = {
            "meets_constraints": self.meets_constraints,
            "breaches": [breach.to_dto() for breach in self.breaches],
        }
        as_dict = humps.camelize(data)
        validator = TypeAdapter(ConstraintHitsDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: ConstraintHitsDTO) -> "ConstraintHits":
        return cls(
            meets_constraints=data.meetsConstraints,
            breaches=[Breach.from_dto(b) for b in data.breaches],
        )


@dataclass
class RequestHits:
    has_no_request_conflict: bool
    conflicting_request_ids: List[str]

    def to_dict(self) -> Dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict) -> "RequestHits":
        return cls(**data)

    def to_dto(self) -> RequestHitsDTO:
        data = asdict(self)
        as_dict = humps.camelize(data)
        validator = TypeAdapter(RequestHitsDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: RequestHitsDTO) -> "RequestHits":
        data_dict = humps.decamelize(data.model_dump())
        return cls(**data_dict)


@dataclass
class MonthlyDutiesImplications:
    new_number_monthly_duties: int
    new_monthly_duties_delta: int
    meets_target: bool

    def to_dict(self) -> Dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict) -> "MonthlyDutiesImplications":
        return cls(**data)

    def to_dto(self) -> MonthlyDutiesImplicationsDTO:
        data = asdict(self)
        as_dict = humps.camelize(data)
        validator = TypeAdapter(MonthlyDutiesImplicationsDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(
        cls, data: MonthlyDutiesImplicationsDTO
    ) -> "MonthlyDutiesImplications":
        data_dict = humps.decamelize(data.model_dump())
        return cls(**data_dict)


@dataclass
class WeeklyWorkTimeImplications:
    new_weekly_worked_minutes: int
    new_weekly_time_delta_minutes: int
    meets_target: bool

    def to_dict(self) -> Dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict) -> "WeeklyWorkTimeImplications":
        return cls(**data)

    def to_dto(self) -> WeeklyWorkTimeImplicationsDTO:
        data = asdict(self)
        as_dict = humps.camelize(data)
        validator = TypeAdapter(WeeklyWorkTimeImplicationsDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(
        cls, data: WeeklyWorkTimeImplicationsDTO
    ) -> "WeeklyWorkTimeImplications":
        data_dict = humps.decamelize(data.model_dump())
        return cls(**data_dict)


@dataclass
class LTMIndicator:
    count: int
    last_date: datetime | None

    def to_dict(self) -> Dict:
        out = asdict(self)
        out["last_date"] = (
            self.last_date.timestamp() if self.last_date else None
        )
        return out

    @classmethod
    def from_dict(cls, data: Dict) -> "LTMIndicator":
        return cls(
            count=data["count"],
            last_date=(
                datetime.fromtimestamp(data["last_date"])
                if data["last_date"]
                else None
            ),
        )

    def to_dto(self) -> LTMIndicatorDTO:
        data = {
            "count": self.count,
            "last_date": (
                self.last_date.timestamp() if self.last_date else None
            ),
        }
        as_dict = humps.camelize(data)
        validator = TypeAdapter(LTMIndicatorDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: LTMIndicatorDTO) -> "LTMIndicator":
        return cls(
            count=data.count,
            last_date=(
                datetime.fromtimestamp(data.lastDate)
                if data.lastDate
                else None
            ),
        )


# pylint: disable=too-many-instance-attributes
@dataclass
class ReplacementImplications:
    # Can't do (hard constraints)
    is_employed: bool
    has_specialty: bool
    isnt_on_leave: bool
    filter_hits: FilterHits
    overlap_hits: OverlapHits
    hard_constraint_hits: ConstraintHits
    request_hits: RequestHits

    # Could do (soft constraints)
    soft_constraint_hits: ConstraintHits
    new_monthly_duties: MonthlyDutiesImplications
    new_weekly_time: WeeklyWorkTimeImplications

    # Indicators (informational)
    nb_times_did_shift_ltm: LTMIndicator
    nb_times_worked_weekday_ltm: LTMIndicator

    def to_dict(self) -> Dict:
        return {
            "is_employed": self.is_employed,
            "has_specialty": self.has_specialty,
            "isnt_on_leave": self.isnt_on_leave,
            "filter_hits": self.filter_hits.to_dict(),
            "overlap_hits": self.overlap_hits.to_dict(),
            "hard_constraint_hits": self.hard_constraint_hits.to_dict(),
            "request_hits": self.request_hits.to_dict(),
            "soft_constraint_hits": self.soft_constraint_hits.to_dict(),
            "new_monthly_duties": self.new_monthly_duties.to_dict(),
            "new_weekly_time": self.new_weekly_time.to_dict(),
            "nb_times_did_shift_ltm": self.nb_times_did_shift_ltm.to_dict(),
            "nb_times_worked_weekday_ltm": self.nb_times_worked_weekday_ltm.to_dict(),
        }

    @classmethod
    def from_dict(cls, data: Dict) -> "ReplacementImplications":
        return cls(
            is_employed=data["is_employed"],
            has_specialty=data["has_specialty"],
            isnt_on_leave=data["isnt_on_leave"],
            filter_hits=FilterHits.from_dict(data["filter_hits"]),
            overlap_hits=OverlapHits.from_dict(data["overlap_hits"]),
            hard_constraint_hits=ConstraintHits.from_dict(
                data["hard_constraint_hits"]
            ),
            request_hits=RequestHits.from_dict(data["request_hits"]),
            soft_constraint_hits=ConstraintHits.from_dict(
                data["soft_constraint_hits"]
            ),
            new_monthly_duties=MonthlyDutiesImplications.from_dict(
                data["new_monthly_duties"]
            ),
            new_weekly_time=WeeklyWorkTimeImplications.from_dict(
                data["new_weekly_time"]
            ),
            nb_times_did_shift_ltm=LTMIndicator.from_dict(
                data["nb_times_did_shift_ltm"]
            ),
            nb_times_worked_weekday_ltm=LTMIndicator.from_dict(
                data["nb_times_worked_weekday_ltm"]
            ),
        )

    def to_dto(self) -> ReplacementImplicationsDTO:
        data = {
            "is_employed": self.is_employed,
            "has_specialty": self.has_specialty,
            "isnt_on_leave": self.isnt_on_leave,
            "filter_hits": self.filter_hits.to_dto(),
            "overlap_hits": self.overlap_hits.to_dto(),
            "hard_constraint_hits": self.hard_constraint_hits.to_dto(),
            "request_hits": self.request_hits.to_dto(),
            "soft_constraint_hits": self.soft_constraint_hits.to_dto(),
            "new_monthly_duties": self.new_monthly_duties.to_dto(),
            "new_weekly_time": self.new_weekly_time.to_dto(),
            "nb_times_did_shift_ltm": self.nb_times_did_shift_ltm.to_dto(),
            "nb_times_worked_weekday_ltm": self.nb_times_worked_weekday_ltm.to_dto(),
        }
        as_dict = humps.camelize(data)
        validator = TypeAdapter(ReplacementImplicationsDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(
        cls, data: ReplacementImplicationsDTO
    ) -> "ReplacementImplications":
        return cls(
            is_employed=data.isEmployed,
            has_specialty=data.hasSpecialty,
            isnt_on_leave=data.isntOnLeave,
            filter_hits=FilterHits.from_dto(data.filterHits),
            overlap_hits=OverlapHits.from_dto(data.overlapHits),
            hard_constraint_hits=ConstraintHits.from_dto(
                data.hardConstraintHits
            ),
            request_hits=RequestHits.from_dto(data.requestHits),
            soft_constraint_hits=ConstraintHits.from_dto(
                data.softConstraintHits
            ),
            new_monthly_duties=MonthlyDutiesImplications.from_dto(
                data.newMonthlyDuties
            ),
            new_weekly_time=WeeklyWorkTimeImplications.from_dto(
                data.newWeeklyTime
            ),
            nb_times_did_shift_ltm=LTMIndicator.from_dto(
                data.nbTimesDidShiftLtm
            ),
            nb_times_worked_weekday_ltm=LTMIndicator.from_dto(
                data.nbTimesWorkedWeekdayLtm
            ),
        )


@dataclass
class ReplacementCandidate:
    worker_id: str
    worker_name: str
    rank: int  # Lower is better, 0 for current assignment
    replacement_category: ReplacementCategory
    replacement_implications: ReplacementImplications
    most_constraining_reason: MostConstrainingReason

    @staticmethod
    def compute_most_constraining_reason(
        implications: ReplacementImplications,
    ) -> MostConstrainingReason:
        """
        Compute the most constraining reason by checking implications in priority order.
        Returns enum value for the first violation found.
        """
        # Check hard constraints in order of importance
        if not implications.is_employed:
            return MostConstrainingReason.NOT_EMPLOYED

        if not implications.has_specialty:
            return MostConstrainingReason.MISSING_SPECIALTY

        if not implications.isnt_on_leave:
            return MostConstrainingReason.ON_LEAVE

        if not implications.filter_hits.isnt_filtered_out:
            return MostConstrainingReason.FILTERED_OUT

        if not implications.overlap_hits.hasnt_overlap:
            return MostConstrainingReason.HAS_OVERLAP

        if not implications.hard_constraint_hits.meets_constraints:
            return MostConstrainingReason.HARD_CONSTRAINT_VIOLATION

        if not implications.request_hits.has_no_request_conflict:
            return MostConstrainingReason.REQUEST_CONFLICT

        # Check soft constraints
        if not implications.soft_constraint_hits.meets_constraints:
            return MostConstrainingReason.SOFT_CONSTRAINT_VIOLATION

        # No constraints violated
        return MostConstrainingReason.NO_CONSTRAINTS_VIOLATED

    def to_dict(self) -> Dict:
        out = {
            "worker_id": self.worker_id,
            "worker_name": self.worker_name,
            "rank": self.rank,
            "replacement_category": self.replacement_category.value,
            "replacement_implications": self.replacement_implications.to_dict(),
            "most_constraining_reason": self.most_constraining_reason.value,
        }
        return out

    @classmethod
    def from_dict(cls, data: Dict) -> "ReplacementCandidate":
        return cls(
            worker_id=data["worker_id"],
            worker_name=data["worker_name"],
            rank=data["rank"],
            replacement_category=ReplacementCategory(
                data["replacement_category"]
            ),
            replacement_implications=ReplacementImplications.from_dict(
                data["replacement_implications"]
            ),
            most_constraining_reason=MostConstrainingReason(
                data["most_constraining_reason"]
            ),
        )

    def to_dto(self) -> ReplacementCandidateDTO:
        data = {
            "worker_id": self.worker_id,
            "worker_name": self.worker_name,
            "rank": self.rank,
            "replacement_category": self.replacement_category.value,
            "replacement_implications": self.replacement_implications.to_dto(),
            "most_constraining_reason": self.most_constraining_reason,
        }
        as_dict = humps.camelize(data)
        validator = TypeAdapter(ReplacementCandidateDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: ReplacementCandidateDTO) -> "ReplacementCandidate":
        return cls(
            worker_id=data.workerId,
            worker_name=data.workerName,
            rank=data.rank,
            replacement_category=ReplacementCategory(data.replacementCategory),
            replacement_implications=ReplacementImplications.from_dto(
                data.replacementImplications
            ),
            most_constraining_reason=data.mostConstrainingReason,
        )
