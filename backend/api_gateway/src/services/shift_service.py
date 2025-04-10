from datetime import datetime, timedelta, timezone
from typing import Dict, List, Tuple

from shared.schemas.core import (
    Attribute,
    AttributeOwnerType,
    DimensionEntryType,
    DimensionType,
    LinkShift,
    Shift,
    ShiftLeaveType,
    ShiftRestType,
    ShiftType,
)

from src.services.assignment_service import AssignmentService
from src.services.base_service import BaseService
from src.services.link_shift_service import LinkShiftService
from src.utils.string_utils import generate_acronym


# pylint: disable= R0801
class ShiftService(BaseService):
    def __init__(
        self,
        collection,
        assignment_service: AssignmentService,
        link_shift_service: LinkShiftService,
    ):
        super().__init__(collection)
        self.assignment_service = assignment_service
        self.link_shift_service = link_shift_service

    def create_shift(self, shift: Shift) -> Tuple[Shift, List[Attribute]]:
        if shift.rest_type == ShiftRestType.OFF:
            raise ValueError("Cannot create the default rest shift")
        if shift.leave_type != ShiftLeaveType.NONE:
            raise ValueError("Cannot create a leave shift")
        shift_created = self.collection.shift_db.create_shift(shift)
        dim_types = (
            [DimensionType.SHIFT]
            if shift.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]
            else [DimensionType.REST_SHIFT]
        )
        d_bool = (
            self.collection.dimension_db.get_dimensions_by_dim_types_and_entry_type(
                dim_types,
                DimensionEntryType.BOOL,
                shift_created.team_id,
            )
        )
        attributes: List[Attribute] = []
        attributes_saved: List[Attribute] = []
        for d in d_bool:
            attributes.append(
                Attribute(
                    id="",
                    value=False,
                    owner_type=AttributeOwnerType.SHIFT,
                    owner_id=shift_created.id,
                    dimension_id=d.id,
                    dim_entry_ids=[],
                )
            )
        attributes_saved = self.collection.attribute_db.create_attributes(attributes)
        if shift_created.shift_type == ShiftType.DUTY:
            self.create_or_update_duty_recuperation_shift(shift_created)
        return shift_created, attributes_saved

    def create_or_update_duty_recuperation_shift(
        self,
        shift_duty: Shift,
    ) -> Shift | None:
        if shift_duty.shift_type != ShiftType.DUTY:
            return None
        recup_existing = self.collection.shift_db.get_recuperation_shift(shift_duty.id)
        recup_start_time = datetime(
            shift_duty.start_time.year,
            shift_duty.start_time.month,
            shift_duty.start_time.day,
            shift_duty.end_time.hour,
            shift_duty.end_time.minute,
            tzinfo=timezone.utc,
        )
        recup_end_time = recup_start_time + timedelta(
            hours=shift_duty.recuperation_time
        )
        if recup_existing:
            if (
                recup_existing.start_time == recup_start_time
                and recup_existing.end_time == recup_end_time
                and not recup_existing.deleted
            ):
                return recup_existing
            recup_existing.start_time = recup_start_time
            recup_existing.end_time = recup_end_time
            recup_existing.deleted = False
            return self.collection.shift_db.update_shift(recup_existing)
        recup_new = Shift(
            id="",
            team_id=shift_duty.team_id,
            name="Duty recuperation",
            acronym="DR",
            acronym_custom=False,
            start_time=recup_start_time,
            end_time=recup_end_time,
            staffing=[],
            color="#EDBB99",
            shift_type=ShiftType.REST,
            rest_type=ShiftRestType.RECUPERATION,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty_id=shift_duty.id,
            deleted=False,
        )
        return self.collection.shift_db.create_shift(recup_new)

    def create_default_shifts(self, team_id: str) -> None:
        reference_date = datetime.now(timezone.utc)
        reference_date_start = reference_date.replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        reference_date_end = (reference_date + timedelta(days=1)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        reference_date_midday = reference_date.replace(
            hour=12, minute=0, second=0, microsecond=0
        )
        rest_shifts = [
            Shift(
                id="",
                team_id=team_id,
                name="Off",
                acronym="O",
                acronym_custom=False,
                start_time=reference_date_start,
                end_time=reference_date_end,
                staffing=[],
                color="grey",
                shift_type=ShiftType.REST,
                rest_type=ShiftRestType.OFF,
                leave_type=ShiftLeaveType.NONE,
                recuperation_time=0,
                recuperation_duty_id=None,
                deleted=False,
            ),
        ]
        leave_shifts = [
            Shift(
                id="",
                team_id=team_id,
                name="Vacation",
                acronym="V",
                acronym_custom=False,
                start_time=reference_date_start,
                end_time=reference_date_end,
                staffing=[],
                color="grey",
                shift_type=ShiftType.LEAVE,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.VACATION,
                recuperation_time=0,
                recuperation_duty_id=None,
                deleted=False,
            ),
            Shift(
                id="",
                team_id=team_id,
                name="Vacation morning",
                acronym="V-m",
                acronym_custom=False,
                start_time=reference_date_start,
                end_time=reference_date_midday,
                staffing=[],
                color="grey",
                shift_type=ShiftType.LEAVE,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.VACATION_MORNING,
                recuperation_time=0,
                recuperation_duty_id=None,
                deleted=False,
            ),
            Shift(
                id="",
                team_id=team_id,
                name="Vacation afternoon",
                acronym="V-a",
                acronym_custom=False,
                start_time=reference_date_midday,
                end_time=reference_date_end,
                staffing=[],
                color="grey",
                shift_type=ShiftType.LEAVE,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.VACATION_AFTERNOON,
                recuperation_time=0,
                recuperation_duty_id=None,
                deleted=False,
            ),
            Shift(
                id="",
                team_id=team_id,
                name="Sick leave",
                acronym="SL",
                acronym_custom=False,
                start_time=reference_date_start,
                end_time=reference_date_end,
                staffing=[],
                color="grey",
                shift_type=ShiftType.LEAVE,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.SICK,
                recuperation_time=0,
                recuperation_duty_id=None,
                deleted=False,
            ),
            Shift(
                id="2",
                team_id=team_id,
                name="Sick leave morning",
                acronym="SL-m",
                acronym_custom=False,
                start_time=reference_date_start,
                end_time=reference_date_midday,
                staffing=[],
                color="grey",
                shift_type=ShiftType.LEAVE,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.SICK_MORNING,
                recuperation_time=0,
                recuperation_duty_id=None,
                deleted=False,
            ),
            Shift(
                id="",
                team_id=team_id,
                name="Sick leave afternoon",
                acronym="SL-a",
                acronym_custom=False,
                start_time=reference_date_midday,
                end_time=reference_date_end,
                staffing=[],
                color="grey",
                shift_type=ShiftType.LEAVE,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.SICK_AFTERNOON,
                recuperation_time=0,
                recuperation_duty_id=None,
                deleted=False,
            ),
            Shift(
                id="",
                team_id=team_id,
                name="Unpaid leave",
                acronym="UL",
                acronym_custom=False,
                start_time=reference_date_start,
                end_time=reference_date_end,
                staffing=[],
                color="grey",
                shift_type=ShiftType.LEAVE,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.UNPAID,
                recuperation_time=0,
                recuperation_duty_id=None,
                deleted=False,
            ),
            Shift(
                id="",
                team_id=team_id,
                name="Unpaid leave morning",
                acronym="UL-m",
                acronym_custom=False,
                start_time=reference_date_start,
                end_time=reference_date_midday,
                staffing=[],
                color="grey",
                shift_type=ShiftType.LEAVE,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.UNPAID_MORNING,
                recuperation_time=0,
                recuperation_duty_id=None,
                deleted=False,
            ),
            Shift(
                id="",
                team_id=team_id,
                name="Unpaid leave afternoon",
                acronym="UL-a",
                acronym_custom=False,
                start_time=reference_date_midday,
                end_time=reference_date_end,
                staffing=[],
                color="grey",
                shift_type=ShiftType.LEAVE,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.UNPAID_AFTERNOON,
                recuperation_time=0,
                recuperation_duty_id=None,
                deleted=False,
            ),
            Shift(
                id="",
                team_id=team_id,
                name="Parental leave",
                acronym="PL",
                acronym_custom=False,
                start_time=reference_date_start,
                end_time=reference_date_end,
                staffing=[],
                color="grey",
                shift_type=ShiftType.LEAVE,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.PARENTAL_LEAVE,
                recuperation_time=0,
                recuperation_duty_id=None,
                deleted=False,
            ),
            Shift(
                id="",
                team_id=team_id,
                name="Parental leave morning",
                acronym="PL-m",
                acronym_custom=False,
                start_time=reference_date_start,
                end_time=reference_date_midday,
                staffing=[],
                color="grey",
                shift_type=ShiftType.LEAVE,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.PARENTAL_LEAVE_MORNING,
                recuperation_time=0,
                recuperation_duty_id=None,
                deleted=False,
            ),
            Shift(
                id="",
                team_id=team_id,
                name="Parental leave afternoon",
                acronym="PL-a",
                acronym_custom=False,
                start_time=reference_date_midday,
                end_time=reference_date_end,
                staffing=[],
                color="grey",
                shift_type=ShiftType.LEAVE,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.PARENTAL_LEAVE_AFTERNOON,
                recuperation_time=0,
                recuperation_duty_id=None,
                deleted=False,
            ),
            Shift(
                id="",
                team_id=team_id,
                name="Training leave",
                acronym="TL",
                acronym_custom=False,
                start_time=reference_date_start,
                end_time=reference_date_end,
                staffing=[],
                color="grey",
                shift_type=ShiftType.LEAVE,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.TRAINING,
                recuperation_time=0,
                recuperation_duty_id=None,
                deleted=False,
            ),
            Shift(
                id="",
                team_id=team_id,
                name="Training leave morning",
                acronym="TL-m",
                acronym_custom=False,
                start_time=reference_date_start,
                end_time=reference_date_midday,
                staffing=[],
                color="grey",
                shift_type=ShiftType.LEAVE,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.TRAINING_MORNING,
                recuperation_time=0,
                recuperation_duty_id=None,
                deleted=False,
            ),
            Shift(
                id="",
                team_id=team_id,
                name="Training leave afternoon",
                acronym="TL-a",
                acronym_custom=False,
                start_time=reference_date_midday,
                end_time=reference_date_end,
                staffing=[],
                color="grey",
                shift_type=ShiftType.LEAVE,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.TRAINING_AFTERNOON,
                recuperation_time=0,
                recuperation_duty_id=None,
                deleted=False,
            ),
            Shift(
                id="",
                team_id=team_id,
                name="Other",
                acronym="O-2",
                acronym_custom=False,
                start_time=reference_date_start,
                end_time=reference_date_end,
                staffing=[],
                color="grey",
                shift_type=ShiftType.LEAVE,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.OTHER,
                recuperation_time=0,
                recuperation_duty_id=None,
                deleted=False,
            ),
            Shift(
                id="",
                team_id=team_id,
                name="Other morning",
                acronym="O-2-m",
                acronym_custom=False,
                start_time=reference_date_start,
                end_time=reference_date_midday,
                staffing=[],
                color="grey",
                shift_type=ShiftType.LEAVE,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.OTHER_MORNING,
                recuperation_time=0,
                recuperation_duty_id=None,
                deleted=False,
            ),
            Shift(
                id="",
                team_id=team_id,
                name="Other afternoon",
                acronym="O-2-a",
                acronym_custom=False,
                start_time=reference_date_midday,
                end_time=reference_date_end,
                staffing=[],
                color="grey",
                shift_type=ShiftType.LEAVE,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.OTHER_AFTERNOON,
                recuperation_time=0,
                recuperation_duty_id=None,
                deleted=False,
            ),
        ]
        self.collection.shift_db.create_shifts(rest_shifts + leave_shifts)

    def update_shift(
        self, shift_new: Shift
    ) -> Tuple[Shift, Dict[str, List[LinkShift | str]] | None]:
        shift_old = self._validate_shift_update(shift_new.id)
        self._handle_acronym_update(shift_new, shift_old)
        shift_saved = self.collection.shift_db.update_shift(shift_new)
        ls_change = self._handle_link_shift_updates(shift_saved, shift_old)
        self._handle_duty_recuperation_shift_updates(shift_saved, shift_old)
        return shift_saved, ls_change

    def _validate_shift_update(self, shift_id: str) -> Shift:
        shift = self.collection.shift_db.get_shift_by_id(shift_id)
        if shift is None:
            raise ValueError("Shift does not exist")
        if shift.rest_type == ShiftRestType.OFF:
            raise ValueError("Cannot update or delete the default rest shift")
        if shift.leave_type != ShiftLeaveType.NONE:
            raise ValueError("Cannot update or delete a leave shift")
        return shift

    def _handle_acronym_update(self, shift_new: Shift, shift_old: Shift) -> None:
        # If acronym changed, then set custom acronym to True
        if shift_new.acronym != shift_old.acronym:
            shift_new.acronym_custom = True

        # If name changed and acronym is not custom, then generate a new acronym
        # based on the new name and existing acronyms
        if shift_new.name != shift_old.name and not shift_new.acronym_custom:
            shifts = self.collection.shift_db.get_shifts_not_deleted(shift_new.team_id)
            acronyms = [s.acronym for s in shifts if s.id != shift_new.id]
            shift_new.acronym = generate_acronym(shift_new.name, acronyms)

    def _handle_link_shift_updates(
        self, shift_saved: Shift, shift_old: Shift
    ) -> Dict[str, List[LinkShift | str]] | None:
        # If shift start or end time changed, then update link shifts
        # associated with the shift
        if (
            shift_saved.start_time != shift_old.start_time
            or shift_saved.end_time != shift_old.end_time
        ):
            return self.link_shift_service.update_link_shift_upon_shift_update(
                shift_saved
            )
        return None

    def _handle_duty_recuperation_shift_updates(
        self, shift_saved: Shift, shift_old: Shift
    ) -> None:
        # If shift type changed from normal to duty, then:
        #   - create or update the recuperation shift
        #   - assign the recuperation shift after all assignment of the shift
        #     from today onwards
        # If the shift type changed from duty to normal, then:
        #   - delete the recuperation shift
        #   - delete the assignments of the recuperation shift from today onwards
        if (
            shift_old.shift_type == ShiftType.NORMAL
            and shift_saved.shift_type == ShiftType.DUTY
        ):
            self._handle_normal_to_duty_shift_update(shift_saved)
        elif (
            shift_old.shift_type == ShiftType.DUTY
            and shift_saved.shift_type == ShiftType.NORMAL
        ):
            self._handle_delete_recup_shift_and_its_assignments(shift_saved)
        elif (
            shift_old.shift_type == ShiftType.DUTY
            and shift_saved.shift_type == ShiftType.DUTY
            and (
                shift_saved.start_time != shift_old.start_time
                or shift_saved.end_time != shift_old.end_time
                or shift_saved.recuperation_time != shift_old.recuperation_time
            )
        ):
            self.create_or_update_duty_recuperation_shift(shift_saved)

    def _handle_normal_to_duty_shift_update(self, shift_saved: Shift) -> None:
        shift_recup = self.create_or_update_duty_recuperation_shift(shift_saved)
        if shift_recup is not None:
            self.assignment_service.create_recuperation_assignments(
                shift_duty_id=shift_saved.id,
                shift_recup_id=shift_recup.id,
                team_id=shift_saved.team_id,
            )

    def _handle_delete_recup_shift_and_its_assignments(self, shift_duty: Shift) -> None:
        shift_recup = self.collection.shift_db.get_recuperation_shift(shift_duty.id)
        if shift_recup is not None:
            self.collection.shift_db.logical_delete_shift(shift_recup.id)
            # fmt: off
            self.collection.assignment_db\
                .delete_assignments_by_team_and_shift_today_onward(
                    team_id=shift_recup.team_id, shift_id=shift_recup.id
                )
            # fmt: on

    def delete_shift(self, shift_id: str) -> Dict:
        shift = self._validate_shift_update(shift_id)
        ls_change = self.link_shift_service.update_link_shift_upon_shift_delete(shift)
        self._delete_shift_from_schedule_quick_staffing(shift_id)
        self.collection.shift_demand_db.delete_shift_demands_by_shift_id(shift_id)
        self.collection.daily_shift_demand_db.delete_daily_shift_demands_by_shift_id(
            shift_id
        )
        if shift.shift_type == ShiftType.DUTY:
            self._handle_delete_recup_shift_and_its_assignments(shift)
        self.collection.shift_db.logical_delete_shift(shift_id)
        # _delete_shift_from_objective_breach(shift_id)
        # assignment_db.delete_assignments_by_shift_id(shift_id)
        # request_db.delete_requests_by_shift_id(shift_id)
        return ls_change

    def _delete_shift_from_objective_breach(self, shift_id: str) -> None:
        obs = self.collection.breach_db.get_breaches_by_shift_id(shift_id)
        for ob in obs:
            new_vars = [v for v in ob.variables if v.shift_id != shift_id]
            if not new_vars:
                self.collection.breach_db.delete_breach(ob.id)
                continue
            ob.variables = new_vars
            self.collection.breach_db.update_breach(ob)

    def _delete_shift_from_schedule_quick_staffing(self, shift_id: str) -> None:
        schedules = (
            self.collection.schedule_db.get_schedule_quick_staffing_contain_shift_id(
                shift_id
            )
        )
        for schedule in schedules:
            new_quick_staffings = [
                qs for qs in schedule.quick_staffings if qs.shift_id != shift_id
            ]
            schedule.quick_staffings = new_quick_staffings
            self.collection.schedule_db.update_schedule(schedule)
