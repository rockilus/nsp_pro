from datetime import date, datetime
from typing import Any, Dict, List, Optional

from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info
from shared.schemas.core.assignment import Assignment, AssignmentSource
from shared.schemas.core.schedule_template import (
    ScheduleTemplate,
    generate_assignments_from_template,
    generate_demands_from_template,
)
from shared.schemas.core.shift_demand_new import (
    ShiftDemandNew,
    ShiftDemandSource,
)


class ScheduleTemplateService:
    def __init__(self, db_collections: DatabaseCollections):
        self.db = db_collections
        self.template_repo = db_collections.schedule_template_db

    async def create_template(self, template: ScheduleTemplate) -> ScheduleTemplate:
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
                f"Created schedule template {created_template.id} "
                f"'{created_template.name}' for team {template.team_id}"
            )

            return created_template

        except Exception as e:
            log_info(f"Failed to create schedule template: {str(e)}")
            raise

    async def get_template_by_id(self, template_id: str) -> Optional[ScheduleTemplate]:
        try:
            return self.template_repo.get_template_by_id(template_id)
        except Exception as e:
            log_info(f"Failed to get schedule template {template_id}: {str(e)}")
            raise

    async def get_templates_by_team(
        self, team_id: str, template_type: Optional[str] = None
    ) -> List[ScheduleTemplate]:
        try:
            if template_type:
                return self.template_repo.get_templates_by_team_and_type(
                    team_id, template_type
                )
            return self.template_repo.get_templates_by_team_id(team_id)
        except Exception as e:
            log_info(f"Failed to get schedule templates for team {team_id}: {str(e)}")
            raise

    async def update_template(self, template: ScheduleTemplate) -> ScheduleTemplate:
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
                f"Updated schedule template {template.id} "
                f"'{template.name}' for team {template.team_id}"
            )

            return updated_template

        except Exception as e:
            log_info(f"Failed to update schedule template {template.id}: {str(e)}")
            raise

    async def delete_template(self, template_id: str) -> bool:
        try:
            template = self.template_repo.get_template_by_id(template_id)
            if not template:
                return False

            success = self.template_repo.delete_template(template_id)

            if success:
                log_info(
                    f"Deleted schedule template {template_id} "
                    f"'{template.name}' for team {template.team_id}"
                )

            return success

        except Exception as e:
            log_info(f"Failed to delete schedule template {template_id}: {str(e)}")
            raise

    async def validate_template_for_team(
        self, template_id: str, team_id: str
    ) -> ScheduleTemplate:
        template = await self.get_template_by_id(template_id)
        if not template:
            raise ValueError(f"Template with ID {template_id} not found")

        if template.team_id != team_id:
            raise ValueError(
                f"Template {template_id} does not belong to team {team_id}"
            )

        return template

    async def apply_template_to_date_range(
        self,
        template_id: str,
        team_id: str,
        start_date: date,
        end_date: date,
        start_week_number: int = 0,
        overwrite_demands: bool = True,
        overwrite_assignments: bool = True,
    ) -> Dict[str, Any]:
        try:
            template = await self.validate_template_for_team(template_id, team_id)

            result: Dict[str, Any] = {
                "success": True,
                "demandsCreated": 0,
                "demandsDeleted": 0,
                "assignmentsCreated": 0,
                "assignmentsDeleted": 0,
            }

            if overwrite_demands:
                demand_result = await self._apply_demands_overwrite(
                    template=template,
                    team_id=team_id,
                    start_date=start_date,
                    end_date=end_date,
                    start_week_number=start_week_number,
                )
                result["demandsCreated"] = demand_result["created"]
                result["demandsDeleted"] = demand_result["deleted"]
            else:
                demand_result = await self._apply_demands_merge(
                    template=template,
                    team_id=team_id,
                    start_date=start_date,
                    end_date=end_date,
                    start_week_number=start_week_number,
                )
                result["demandsCreated"] = demand_result["created"]
                result["demandsDeleted"] = demand_result["deleted"]

            if overwrite_assignments:
                assignment_result = await self._apply_assignments_overwrite(
                    template=template,
                    team_id=team_id,
                    start_date=start_date,
                    end_date=end_date,
                    start_week_number=start_week_number,
                )
                result["assignmentsCreated"] = assignment_result["created"]
                result["assignmentsDeleted"] = assignment_result["deleted"]
            else:
                assignment_result = await self._apply_assignments_merge(
                    template=template,
                    team_id=team_id,
                    start_date=start_date,
                    end_date=end_date,
                    start_week_number=start_week_number,
                )
                result["assignmentsCreated"] = assignment_result["created"]
                result["assignmentsDeleted"] = assignment_result["deleted"]

            parts: List[str] = []
            if result["demandsCreated"] or result["demandsDeleted"]:
                parts.append(
                    f"demands: {result['demandsCreated']} created, "
                    f"{result['demandsDeleted']} deleted"
                )
            if result["assignmentsCreated"] or result["assignmentsDeleted"]:
                parts.append(
                    f"assignments: {result['assignmentsCreated']} created, "
                    f"{result['assignmentsDeleted']} deleted"
                )

            result["message"] = (
                "Template applied successfully. " + ", ".join(parts)
                if parts
                else "Template applied successfully."
            )

            log_info(
                f"Applied schedule template {template_id} to date range "
                f"{start_date} to {end_date} for team {team_id}: "
                f"{result['message']}"
            )

            return result

        except Exception as e:
            log_info(f"Failed to apply schedule template to date range: {str(e)}")
            raise

    async def _apply_demands_overwrite(
        self,
        template: ScheduleTemplate,
        team_id: str,
        start_date: date,
        end_date: date,
        start_week_number: int,
    ) -> Dict[str, int]:
        demands_to_create = generate_demands_from_template(
            template=template,
            start_date=start_date,
            end_date=end_date,
            team_id=team_id,
            template_id=template.id or "",
            start_week_number=start_week_number,
        )

        demands_deleted = self.db.shift_demand_new_db.delete_demands_by_date_range(
            team_id=team_id,
            start_date=start_date,
            end_date=end_date,
            shift_ids=template.scope_shift_ids if template.scope_shift_ids else None,
        )

        demands_created = 0
        for demand in demands_to_create:
            shift_demand = ShiftDemandNew(
                date=demand["date"],
                shift_id=demand["shift_id"],
                team_id=demand["team_id"],
                count=demand["count"],
                source=ShiftDemandSource.TEMPLATE,
                source_id=demand["source_id"],
            )
            self.db.shift_demand_new_db.create_shift_demand(shift_demand)
            demands_created += 1

        return {"created": demands_created, "deleted": demands_deleted}

    async def _apply_demands_merge(
        self,
        template: ScheduleTemplate,
        team_id: str,
        start_date: date,
        end_date: date,
        start_week_number: int,
    ) -> Dict[str, int]:
        demands_to_create = generate_demands_from_template(
            template=template,
            start_date=start_date,
            end_date=end_date,
            team_id=team_id,
            template_id=template.id or "",
            start_week_number=start_week_number,
        )

        existing_demands = self.db.shift_demand_new_db.get_shift_demands_by_date_range(
            team_id=team_id,
            start_date=start_date,
            end_date=end_date,
        )

        existing_map = {(d.shift_id, d.date): d for d in existing_demands}

        demands_created = 0

        for demand_dict in demands_to_create:
            demand_key = (demand_dict["shift_id"], demand_dict["date"])

            if demand_key in existing_map:
                existing = existing_map[demand_key]
                existing.count += demand_dict["count"]
                existing.update_timestamp()
                self.db.shift_demand_new_db.update_shift_demand(existing)
            else:
                new_demand = ShiftDemandNew(
                    date=demand_dict["date"],
                    shift_id=demand_dict["shift_id"],
                    team_id=demand_dict["team_id"],
                    count=demand_dict["count"],
                    source=ShiftDemandSource.TEMPLATE,
                    source_id=demand_dict["source_id"],
                )
                self.db.shift_demand_new_db.create_shift_demand(new_demand)
                demands_created += 1

        return {"created": demands_created, "deleted": 0}

    async def _apply_assignments_overwrite(
        self,
        template: ScheduleTemplate,
        team_id: str,
        start_date: date,
        end_date: date,
        start_week_number: int,
    ) -> Dict[str, int]:
        assignments_to_create = generate_assignments_from_template(
            template=template,
            start_date=start_date,
            end_date=end_date,
            team_id=team_id,
            template_id=template.id or "",
            start_week_number=start_week_number,
        )

        existing = self.db.assignment_db.get_assignments_by_dates(
            team_id=team_id,
            start_date=start_date,
            end_date=end_date,
        )

        template_shift_ids = {
            e.shift_id for w in template.weeks_data for e in w.entries
        }

        to_delete_ids = [a.id for a in existing if a.shift_id in template_shift_ids]
        assignments_deleted = 0
        if to_delete_ids:
            self.db.assignment_db.delete_assignments(to_delete_ids)
            assignments_deleted = len(to_delete_ids)

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
                source_id=a_dict["source_id"],
            )
            self.db.assignment_db.create_assignment(assignment)
            assignments_created += 1

        return {"created": assignments_created, "deleted": assignments_deleted}

    async def _apply_assignments_merge(
        self,
        template: ScheduleTemplate,
        team_id: str,
        start_date: date,
        end_date: date,
        start_week_number: int,
    ) -> Dict[str, int]:
        assignments_to_create = generate_assignments_from_template(
            template=template,
            start_date=start_date,
            end_date=end_date,
            team_id=team_id,
            template_id=template.id or "",
            start_week_number=start_week_number,
        )

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
                source_id=a_dict["source_id"],
            )
            self.db.assignment_db.create_assignment(assignment)
            assignments_created += 1

        return {"created": assignments_created, "deleted": 0}
