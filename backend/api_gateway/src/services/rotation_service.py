"""
Service layer for shift rotation management.

Provides business logic for:
- Creating rotations with overlapping validation
- Materializing rotation assignments for campaign dates with shift demands
- Handling rotation breaks (CONTINUE, SWAP, RESTART)
- Lazy materialization on reads
"""

from datetime import date, timedelta
from typing import List, Optional

from shared.schemas.core import (
    Assignment,
    AssignmentSource,
    AssignmentsRecurrencesResult,
    Rotation,
    RotationBreakBehavior,
    ScheduleStatus,
)
from shared.schemas.dto.rotation import (
    RotationCreateDTO,
    RotationUpdateDTO,
)

from src.services.base_service import BaseService


class RotationService(BaseService):
    VALIDATION_WINDOW_DAYS = 90

    def create_rotation(
        self,
        team_id: str,
        data: RotationCreateDTO,
    ) -> Rotation:
        rotation = Rotation.from_create_dto(team_id, data)
        if len(rotation.worker_ids) < 2:
            raise ValueError("Rotation must have at least 2 workers")
        shift = self.collection.shift_db.get_shift_by_id(rotation.shift_id)
        if shift is None or shift.team_id != team_id:
            raise ValueError(f"Shift {rotation.shift_id} not found in team {team_id}")
        for worker_id in rotation.worker_ids:
            worker = self.collection.worker_db.get_worker_by_id(worker_id)
            if worker is None or worker.team_id != team_id:
                raise ValueError(f"Worker {worker_id} not found in team {team_id}")
        self._validate_no_shift_overlap(
            rotation.shift_id, rotation.start_date, rotation.end_date
        )
        rotation_saved = self.collection.rotation_db.create_rotation(rotation)

        campaign = self._get_active_campaign(team_id)
        if campaign:
            materialization_end = rotation.end_date or campaign.end_date
            if materialization_end > campaign.end_date:
                materialization_end = campaign.end_date
            if rotation.start_date <= materialization_end:
                self._materialize_rotation_assignments(
                    rotation=rotation_saved,
                    team_id=team_id,
                    start_date=max(rotation.start_date, campaign.start_date),
                    end_date=materialization_end,
                    campaign_id=campaign.id,
                )

        return rotation_saved

    def get_rotation(self, rotation_id: str, team_id: str) -> Rotation:
        rotation = self.collection.rotation_db.get_rotation_by_id(rotation_id)
        if rotation.team_id != team_id:
            raise ValueError(f"Rotation {rotation_id} not found in team {team_id}")
        return rotation

    def get_rotations_by_team(self, team_id: str) -> List[Rotation]:
        return self.collection.rotation_db.get_rotations_by_team_id(team_id)

    def update_rotation(
        self,
        rotation_id: str,
        team_id: str,
        data: RotationUpdateDTO,
    ) -> Rotation:
        rotation = self.get_rotation(rotation_id, team_id)
        old_worker_ids = list(rotation.worker_ids)
        old_end_date = rotation.end_date
        rotation.apply_update_dto(data)
        if (
            "worker_ids" in data.model_dump(exclude_unset=True)
            and len(rotation.worker_ids) < 2
        ):
            raise ValueError("Rotation must have at least 2 workers")
        if "start_date" in data.model_dump(
            exclude_unset=True
        ) or "end_date" in data.model_dump(exclude_unset=True):
            self._validate_no_shift_overlap(
                rotation.shift_id,
                rotation.start_date,
                rotation.end_date,
                exclude_rotation_id=rotation_id,
            )
        if data.workerIds is not None and rotation.worker_ids != old_worker_ids:
            rotation.current_position = rotation.current_position % len(
                rotation.worker_ids
            )
        updated = self.collection.rotation_db.update_rotation(rotation)

        campaign = self._get_active_campaign(team_id)
        if campaign:
            if data.endDate is not None and old_end_date != updated.end_date:
                if updated.end_date and updated.end_date > campaign.end_date:
                    pass
                self._delete_future_rotation_assignments(
                    rotation, old_end_date or campaign.end_date
                )
            self._cleanup_out_of_range_assignments(updated, campaign)

        return updated

    def delete_rotation(self, rotation_id: str, team_id: str) -> None:
        _rotation = self.get_rotation(rotation_id, team_id)
        self.collection.assignment_db.delete_assignments_by_source_id(rotation_id)
        self.collection.rotation_db.delete_rotation(rotation_id)

    def handle_rotation_break(
        self,
        assignment_id: str,
        team_id: str,
        behavior: RotationBreakBehavior,
        new_worker_id: Optional[str] = None,
    ) -> AssignmentsRecurrencesResult:
        assignment = self.collection.assignment_db.get_assignment_by_id(assignment_id)
        if assignment is None:
            raise ValueError(f"Assignment {assignment_id} not found")
        if assignment.source != AssignmentSource.ROTATION:
            raise ValueError("Assignment is not part of a rotation")
        if assignment.source_id is None:
            raise ValueError("Assignment has no rotation source_id")

        rotation = self.collection.rotation_db.get_rotation_by_id(assignment.source_id)

        if behavior == RotationBreakBehavior.CONTINUE:
            return self._handle_break_continue(assignment, rotation, new_worker_id)
        elif behavior == RotationBreakBehavior.SWAP:
            return self._handle_break_swap(assignment, rotation, new_worker_id, team_id)
        elif behavior == RotationBreakBehavior.RESTART:
            return self._handle_break_restart(
                assignment, rotation, new_worker_id, team_id
            )
        else:
            raise ValueError(f"Unknown break behavior: {behavior}")

    def _lazy_materialize_rotations(
        self,
        team_id: str,
        start_date: date,
        end_date: date,
        campaign_id: str,
    ) -> List[Assignment]:
        newly_created: List[Assignment] = []

        rotations = self.collection.rotation_db.get_rotations_by_team_and_date_range(
            team_id=team_id, start_date=start_date, end_date=end_date
        )

        for rotation in rotations:
            watermark = rotation.last_materialized_until

            if watermark is None:
                existing_assignments = (
                    self.collection.assignment_db.get_assignments_by_source_id(
                        source_id=rotation.id
                    )
                )
                if existing_assignments:
                    watermark = max(a.date for a in existing_assignments)
                else:
                    watermark = rotation.start_date - timedelta(days=1)
                self.collection.rotation_db.update_rotation_watermark(
                    rotation_id=rotation.id,
                    last_materialized_until=watermark,
                )

            rotation_end = rotation.end_date
            if rotation_end is not None and watermark >= rotation_end:
                continue

            if watermark and watermark >= end_date:
                continue

            materialization_start = max(watermark + timedelta(days=1), start_date)
            if rotation_end and materialization_start > rotation_end:
                continue
            materialization_end = end_date
            if rotation_end and materialization_end > rotation_end:
                materialization_end = rotation_end

            if materialization_start > materialization_end:
                continue

            new_assignments = self._materialize_rotation_assignments(
                rotation=rotation,
                team_id=team_id,
                start_date=materialization_start,
                end_date=materialization_end,
                campaign_id=campaign_id,
            )
            if new_assignments:
                newly_created.extend(new_assignments)

            self.collection.rotation_db.update_rotation_watermark(
                rotation_id=rotation.id,
                last_materialized_until=materialization_end,
            )

        return newly_created

    def _materialize_rotation_assignments(
        self,
        rotation: Rotation,
        team_id: str,
        start_date: date,
        end_date: date,
        campaign_id: str,
    ) -> List[Assignment]:
        demand_dates = self._get_demand_dates_for_rotation(
            team_id, rotation.shift_id, start_date, end_date
        )
        if not demand_dates:
            return []

        existing_dates: set[date] = set()
        existing_assignments = (
            self.collection.assignment_db.get_assignments_by_source_id_and_dates(
                source_id=rotation.id,
                start_date=min(demand_dates),
                end_date=max(demand_dates),
            )
        )
        existing_dates = {a.date for a in existing_assignments}

        assignments_to_create: List[Assignment] = []
        current_pos = rotation.current_position

        for d in sorted(demand_dates):
            if d in existing_dates:
                continue
            worker_id = rotation.worker_ids[current_pos % len(rotation.worker_ids)]
            assignments_to_create.append(
                Assignment(
                    id="",
                    team_id=team_id,
                    schedule_id=campaign_id,
                    worker_id=worker_id,
                    date=d,
                    shift_id=rotation.shift_id,
                    fixed=True,
                    source=AssignmentSource.ROTATION,
                    reference_assignment_id=None,
                    source_id=rotation.id,
                )
            )
            current_pos += 1

        if assignments_to_create:
            created = self.collection.assignment_db.create_assignments(
                assignments_to_create
            )
            rotation.current_position = current_pos % len(rotation.worker_ids)
            self.collection.rotation_db.update_rotation(rotation)
            return created
        return []

    def _get_demand_dates_for_rotation(
        self,
        team_id: str,
        shift_id: str,
        start_date: date,
        end_date: date,
    ) -> List[date]:
        demands = self.collection.shift_demand_new_db.get_shift_demands_by_shift_and_date_range(
            team_id=team_id,
            shift_id=shift_id,
            start_date=start_date,
            end_date=end_date,
        )
        return sorted({d.date for d in demands})

    def _get_active_campaign(self, team_id: str):
        schedules = self.collection.schedule_db.get_schedules(team_id=team_id)
        campaigns = [s for s in schedules if s.status == ScheduleStatus.CAMPAIGN]
        return campaigns[0] if campaigns else None

    def _validate_no_shift_overlap(
        self,
        shift_id: str,
        start_date: date,
        end_date: Optional[date],
        exclude_rotation_id: Optional[str] = None,
    ) -> None:
        check_end = end_date or (start_date + timedelta(days=365))
        existing = self.collection.rotation_db.get_rotations_by_shift_and_date_range(
            shift_id=shift_id, start_date=start_date, end_date=check_end
        )
        for rot in existing:
            if rot.id == exclude_rotation_id:
                continue
            rot_end = rot.end_date or (rot.start_date + timedelta(days=365 * 10))
            if start_date <= rot_end and (
                end_date is None or end_date >= rot.start_date
            ):
                raise ValueError(
                    f"Shift {shift_id} already has rotation '{rot.name}' "
                    f"overlapping this period"
                )

    def _delete_future_rotation_assignments(
        self, rotation: Rotation, from_date: date
    ) -> None:
        self.collection.assignment_db.delete_assignments_by_source_id_from_date(
            source_id=rotation.id, from_date=from_date
        )

    def _cleanup_out_of_range_assignments(self, rotation: Rotation, campaign) -> None:
        if rotation.end_date:
            self.collection.assignment_db.delete_assignments_by_source_id_from_date(
                source_id=rotation.id, from_date=rotation.end_date + timedelta(days=1)
            )
        campaign_end = campaign.end_date
        if rotation.end_date is None or rotation.end_date > campaign_end:
            self.collection.assignment_db.delete_assignments_by_source_id_from_date(
                source_id=rotation.id,
                from_date=campaign_end + timedelta(days=1),
            )

    def _handle_break_continue(
        self,
        assignment: Assignment,
        rotation: Rotation,
        new_worker_id: Optional[str],
    ) -> AssignmentsRecurrencesResult:
        if new_worker_id:
            assignment.worker_id = new_worker_id
        updated = [self.collection.assignment_db.update_assignment(assignment)]
        return AssignmentsRecurrencesResult(
            assignments_created=[],
            assignments_read=updated,
            assignments_updated=updated,
            assignments_deleted_ids=[],
            recurrence_created=None,
            recurrences_read=[],
            recurrence_updated=None,
            recurrences_deleted_ids=[],
            rotations=[rotation],
        )

    def _handle_break_swap(
        self,
        assignment: Assignment,
        rotation: Rotation,
        new_worker_id: Optional[str],
        team_id: str,
    ) -> AssignmentsRecurrencesResult:
        if not new_worker_id:
            raise ValueError("newWorkerId is required for SWAP behavior")

        future_assignments = (
            self.collection.assignment_db.get_assignments_by_source_id_and_dates(
                source_id=rotation.id,
                start_date=assignment.date + timedelta(days=1),
                end_date=rotation.end_date or (assignment.date + timedelta(days=365)),
            )
        )
        future_assignments = sorted(future_assignments, key=lambda a: a.date)

        swap_idx = -1
        for i, fa in enumerate(future_assignments):
            if fa.worker_id == new_worker_id:
                swap_idx = i
                break

        updated_assignments = [assignment]
        if swap_idx >= 0:
            swap_target = future_assignments[swap_idx]
            swap_target.worker_id = assignment.worker_id
            self.collection.assignment_db.update_assignment(swap_target)
            updated_assignments.append(swap_target)

        assignment.worker_id = new_worker_id
        self.collection.assignment_db.update_assignment(assignment)

        return AssignmentsRecurrencesResult(
            assignments_created=[],
            assignments_read=updated_assignments,
            assignments_updated=updated_assignments,
            assignments_deleted_ids=[],
            recurrence_created=None,
            recurrences_read=[],
            recurrence_updated=None,
            recurrences_deleted_ids=[],
            rotations=[rotation],
        )

    def _handle_break_restart(
        self,
        assignment: Assignment,
        rotation: Rotation,
        new_worker_id: Optional[str],
        team_id: str,
    ) -> AssignmentsRecurrencesResult:
        if not new_worker_id:
            raise ValueError("newWorkerId is required for RESTART behavior")

        try:
            new_position = rotation.worker_ids.index(new_worker_id)
        except ValueError:
            raise ValueError(
                f"Worker {new_worker_id} is not part of rotation {rotation.name}"
            )

        rotation.current_position = (new_position + 1) % len(rotation.worker_ids)

        self.collection.assignment_db.delete_assignments_by_source_id_from_date(
            source_id=rotation.id,
            from_date=assignment.date + timedelta(days=1),
        )

        assignment.worker_id = new_worker_id
        self.collection.assignment_db.update_assignment(assignment)

        campaign = self._get_active_campaign(team_id)
        new_assignments: List[Assignment] = []
        if campaign:
            new_assignments = self._materialize_rotation_assignments(
                rotation=rotation,
                team_id=team_id,
                start_date=assignment.date + timedelta(days=1),
                end_date=rotation.end_date or campaign.end_date,
                campaign_id=campaign.id,
            )

        self.collection.rotation_db.update_rotation(rotation)

        return AssignmentsRecurrencesResult(
            assignments_created=new_assignments,
            assignments_read=[assignment],
            assignments_updated=[assignment],
            assignments_deleted_ids=[],
            recurrence_created=None,
            recurrences_read=[],
            recurrence_updated=None,
            recurrences_deleted_ids=[],
            rotations=[rotation],
        )
