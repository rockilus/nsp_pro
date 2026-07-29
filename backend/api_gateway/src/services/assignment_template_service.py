from datetime import date, datetime, timedelta
from typing import Dict, List, Optional

from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info
from shared.schemas.core.assignment import Assignment, AssignmentSource
from shared.schemas.core.assignment_template import (
    AssignmentTemplate,
    AssignmentTemplateEntry,
    AssignmentTemplateWeekData,
    TemplateType,
    create_template_from_assignments,
)
from shared.schemas.core.assignment_template import (
    apply_template_to_date_range as apply_template_fn,
)


class AssignmentTemplateService:
    def __init__(self, db_collections: DatabaseCollections):
        self.db = db_collections
        self.template_repo = db_collections.assignment_template_db

    async def create_template(self, template: AssignmentTemplate) -> AssignmentTemplate:
        try:
            existing = self.template_repo.get_template_by_name_and_team(
                template.name, template.team_id
            )
            if existing:
                raise ValueError(
                    f"Template with name '{template.name}' already exists "
                    f"for team {template.team_id}"
                )

            created_template = self.template_repo.create_template(template)

            log_info(
                f"Created assignment template {created_template.id} "
                f"'{created_template.name}' for team {template.team_id}"
            )

            return created_template

        except Exception as e:
            log_info(f"Failed to create assignment template: {str(e)}")
            raise

    async def get_template_by_id(
        self, template_id: str
    ) -> Optional[AssignmentTemplate]:
        try:
            return self.template_repo.get_template_by_id(template_id)
        except Exception as e:
            log_info(f"Failed to get assignment template {template_id}: {str(e)}")
            raise

    async def get_templates_by_team(
        self, team_id: str, template_type: Optional[str] = None
    ) -> List[AssignmentTemplate]:
        try:
            if template_type:
                return self.template_repo.get_templates_by_team_and_type(
                    team_id, template_type
                )
            return self.template_repo.get_templates_by_team_id(team_id)
        except Exception as e:
            log_info(f"Failed to get assignment templates for team {team_id}: {str(e)}")
            raise

    async def update_template(self, template: AssignmentTemplate) -> AssignmentTemplate:
        try:
            if not template.id:
                raise ValueError("Template ID is required for update operation")
            existing = self.template_repo.get_template_by_id(template.id)
            if not existing:
                raise ValueError(f"Template with ID {template.id} not found")

            if existing.name != template.name:
                name_conflict = self.template_repo.get_template_by_name_and_team(
                    template.name, template.team_id
                )
                if name_conflict and name_conflict.id != template.id:
                    raise ValueError(
                        f"Template with name '{template.name}' already exists "
                        f"for team {template.team_id}"
                    )

            updated_template = self.template_repo.update_template(template)

            log_info(
                f"Updated assignment template {template.id} "
                f"'{template.name}' for team {template.team_id}"
            )

            return updated_template

        except Exception as e:
            log_info(f"Failed to update assignment template {template.id}: {str(e)}")
            raise

    async def delete_template(self, template_id: str) -> bool:
        try:
            template = self.template_repo.get_template_by_id(template_id)
            if not template:
                return False

            success = self.template_repo.delete_template(template_id)

            if success:
                log_info(
                    f"Deleted assignment template {template_id} "
                    f"'{template.name}' for team {template.team_id}"
                )

            return success

        except Exception as e:
            log_info(f"Failed to delete assignment template {template_id}: {str(e)}")
            raise

    async def validate_template_for_team(
        self, template_id: str, team_id: str
    ) -> AssignmentTemplate:
        template = await self.get_template_by_id(template_id)
        if not template:
            raise ValueError(f"Template with ID {template_id} not found")

        if template.team_id != team_id:
            raise ValueError(
                f"Template {template_id} does not belong to team {team_id}"
            )

        return template

    async def create_template_from_assignments(
        self,
        name: str,
        team_id: str,
        template_type: TemplateType,
        assignments: List[dict],
        created_by: str,
        description: Optional[str] = None,
    ) -> AssignmentTemplate:
        try:
            existing = self.template_repo.get_template_by_name_and_team(name, team_id)
            if existing:
                raise ValueError(
                    f"Template with name '{name}' already exists for team {team_id}"
                )

            template = create_template_from_assignments(
                name=name,
                team_id=team_id,
                template_type=template_type,
                assignments=assignments,
                created_by=created_by,
                description=description,
            )

            created_template = self.template_repo.create_template(template)

            log_info(
                f"Created assignment template from assignments "
                f"{created_template.id} '{created_template.name}' for team {team_id}"
            )

            return created_template

        except Exception as e:
            log_info(f"Failed to create assignment template from assignments: {str(e)}")
            raise

    async def apply_assignments_to_template_week(
        self,
        template_id: str,
        team_id: str,
        source_week_start: datetime,
        target_week_number: int,
    ) -> AssignmentTemplate:
        try:
            template = await self.validate_template_for_team(template_id, team_id)

            week_start = source_week_start - timedelta(days=source_week_start.weekday())
            week_end = week_start + timedelta(days=6)

            source_assignments = self.db.assignment_db.get_assignments_by_dates(
                team_id=team_id,
                start_date=week_start.date(),
                end_date=week_end.date(),
            )

            # Group assignments by (shift_id, day_of_week) and collect unique workers
            entry_map: Dict[tuple, List[str]] = {}
            for a in source_assignments:
                a_date = a.date
                if isinstance(a_date, datetime):
                    a_date = a_date.date()
                day_of_week = a_date.weekday()
                key = (a.shift_id, day_of_week)
                if key not in entry_map:
                    entry_map[key] = []
                if a.worker_id not in entry_map[key]:
                    entry_map[key].append(a.worker_id)

            # Build new entries
            new_entries: List[AssignmentTemplateEntry] = []
            for (shift_id, dow), worker_ids in sorted(entry_map.items()):
                new_entries.append(
                    AssignmentTemplateEntry(
                        shift_id=shift_id,
                        day_of_week=dow,
                        worker_ids=sorted(worker_ids),
                    )
                )

            # Rebuild weeks_data with the updated week
            rebuild_weeks: List[AssignmentTemplateWeekData] = []
            for week in template.weeks_data:
                if week.week_number == target_week_number:
                    rebuild_weeks.append(
                        AssignmentTemplateWeekData(
                            week_number=target_week_number, entries=new_entries
                        )
                    )
                else:
                    rebuild_weeks.append(week)

            updated_template = AssignmentTemplate(
                id=template.id,
                name=template.name,
                team_id=template.team_id,
                template_type=template.template_type,
                weeks_data=rebuild_weeks,
                description=template.description,
                created_by=template.created_by,
                created_at=template.created_at,
                updated_at=datetime.now(template.created_at.tzinfo),
            )

            saved = self.template_repo.update_template(updated_template)

            log_info(
                f"Applied assignments from week {week_start.date()} to "
                f"assignment template {template_id} week {target_week_number}"
            )

            return saved

        except Exception as e:
            log_info(f"Failed to apply assignments to template week: {str(e)}")
            raise

    async def apply_template_to_date_range(
        self,
        template_id: str,
        team_id: str,
        start_date: date,
        end_date: date,
        overwrite_existing: bool = True,
        shift_id_filter: Optional[str] = None,
    ) -> Dict[str, int]:
        try:
            template = await self.validate_template_for_team(template_id, team_id)

            assignments_to_create = apply_template_fn(
                template=template,
                start_date=start_date,
                end_date=end_date,
                team_id=team_id,
                shift_id_filter=shift_id_filter,
            )

            log_info(
                f"Generated {len(assignments_to_create)} assignments from "
                f"template {template_id} for date range {start_date} to {end_date}"
            )

            if overwrite_existing:
                return await self._apply_with_overwrite(
                    template_id=template_id,
                    team_id=team_id,
                    start_date=start_date,
                    end_date=end_date,
                    assignments_to_create=assignments_to_create,
                    template_shifts=set(
                        e.shift_id for w in template.weeks_data for e in w.entries
                    ),
                    shift_id_filter=shift_id_filter,
                )
            return await self._apply_with_merge(
                template_id=template_id,
                team_id=team_id,
                assignments_to_create=assignments_to_create,
            )

        except Exception as e:
            log_info(f"Failed to apply assignment template to date range: {str(e)}")
            raise

    async def _apply_with_overwrite(
        self,
        template_id: str,
        team_id: str,
        start_date: date,
        end_date: date,
        assignments_to_create: List[dict],
        template_shifts: set,
        shift_id_filter: Optional[str] = None,
    ) -> Dict[str, int]:
        # Query existing assignments in the date range and delete those
        # matching template shifts (scoped by shift_id_filter if provided).
        existing = self.db.assignment_db.get_assignments_by_dates(
            team_id=team_id,
            start_date=start_date,
            end_date=end_date,
        )

        to_delete_ids = []
        for a in existing:
            if a.shift_id in template_shifts:
                if not shift_id_filter or a.shift_id == shift_id_filter:
                    to_delete_ids.append(a.id)

        assignments_deleted = 0
        if to_delete_ids:
            self.db.assignment_db.delete_assignments(to_delete_ids)
            assignments_deleted = len(to_delete_ids)

        assignments_created = 0
        for a_dict in assignments_to_create:
            a_date = a_dict["date"]
            if isinstance(a_date, datetime):
                a_date = a_date.date()

            # Check if this specific assignment already exists
            existing_for_slot = self.db.assignment_db.get_assignments_by_dates(
                team_id=team_id,
                start_date=a_date,
                end_date=a_date,
            )
            already_exists = any(
                e.shift_id == a_dict["shift_id"] and e.worker_id == a_dict["worker_id"]
                for e in existing_for_slot
            )
            if already_exists:
                continue

            assignment = Assignment(
                id="",
                team_id=team_id,
                schedule_id=None,
                worker_id=a_dict["worker_id"],
                date=a_date,
                shift_id=a_dict["shift_id"],
                fixed=False,
                source=AssignmentSource.MANUAL,
                reference_assignment_id=None,
                source_id=template_id,
            )
            self.db.assignment_db.create_assignment(assignment)
            assignments_created += 1

        log_info(
            f"Applied assignment template {template_id} with overwrite: "
            f"created {assignments_created}, deleted {assignments_deleted}"
        )

        return {
            "success": True,
            "assignmentsCreated": assignments_created,
            "assignmentsDeleted": assignments_deleted,
            "message": (
                f"Created {assignments_created} assignments, "
                f"deleted {assignments_deleted} existing assignments"
            ),
        }

    async def _apply_with_merge(
        self,
        template_id: str,
        team_id: str,
        assignments_to_create: List[dict],
    ) -> Dict[str, int]:
        assignments_created = 0

        for a_dict in assignments_to_create:
            a_date = a_dict["date"]
            if isinstance(a_date, datetime):
                a_date = a_date.date()

            existing_for_slot = self.db.assignment_db.get_assignments_by_dates(
                team_id=team_id,
                start_date=a_date,
                end_date=a_date,
            )

            slot_filled = any(
                e.shift_id == a_dict["shift_id"] for e in existing_for_slot
            )
            if slot_filled:
                continue

            already_has = any(
                e.shift_id == a_dict["shift_id"] and e.worker_id == a_dict["worker_id"]
                for e in existing_for_slot
            )
            if already_has:
                continue

            assignment = Assignment(
                id="",
                team_id=team_id,
                schedule_id=None,
                worker_id=a_dict["worker_id"],
                date=a_date,
                shift_id=a_dict["shift_id"],
                fixed=False,
                source=AssignmentSource.MANUAL,
                reference_assignment_id=None,
                source_id=template_id,
            )
            self.db.assignment_db.create_assignment(assignment)
            assignments_created += 1

        log_info(
            f"Applied assignment template {template_id} with merge: "
            f"created {assignments_created}"
        )

        return {
            "success": True,
            "assignmentsCreated": assignments_created,
            "assignmentsDeleted": 0,
            "message": f"Created {assignments_created} assignments",
        }
