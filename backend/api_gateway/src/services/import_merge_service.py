"""Service for merging imported data into live team data.

Handles:
- Auto-matching imported entities to existing team members/shifts
- Executing the merge transactionally (create/update workers, shifts,
  requests, assignments)
- Cascading exclusions (skipping a worker excludes its requests/assignments)
"""

from datetime import date, datetime, time, timezone
from typing import Any, Dict, List, Tuple

from shared.logger import log_info
from shared.schemas.core.assignment import Assignment, AssignmentSource
from shared.schemas.core.import_record import ImportRecord
from shared.schemas.core.request import Request, RequestStatus, RequestType
from shared.schemas.core.shift import (
    Shift,
    ShiftLeaveType,
    ShiftRestType,
    ShiftType,
)
from shared.schemas.core.worker import Worker
from shared.schemas.dto.import_merge import (
    MergeAction,
    MergeRequest,
    MergeResult,
    MergeTargetShift,
    MergeTargetsResponse,
    MergeTargetWorker,
    ShiftMergeMapping,
    WorkerMergeMapping,
)

from src.services.base_service import BaseService

# Reference date for converting minutes-from-midnight to a datetime
_REF_DATE = date(2000, 1, 1)


def _minutes_to_datetime(minutes: float) -> datetime:
    """Convert minutes-from-midnight to a UTC datetime on the reference date."""
    total_minutes = int(minutes)
    h = total_minutes // 60
    m = total_minutes % 60
    return datetime.combine(
        _REF_DATE, time(hour=h, minute=m), tzinfo=timezone.utc
    )


def _levenshtein(s1: str, s2: str) -> int:
    """Compute Levenshtein edit distance between two strings."""
    if len(s1) < len(s2):
        return _levenshtein(s2, s1)
    if len(s2) == 0:
        return len(s1)

    prev = list(range(len(s2) + 1))
    for i, c1 in enumerate(s1):
        curr = [i + 1]
        for j, c2 in enumerate(s2):
            curr.append(
                prev[j]
                if c1 == c2
                else 1 + min(prev[j], prev[j + 1], curr[-1])
            )
        prev = curr
    return prev[-1]


class ImportMergeService(BaseService):
    """Handles the full import merge workflow."""

    # ── Target resolution ────────────────────────────────────────────────

    def resolve_merge_targets(
        self, team_id: str, import_record: ImportRecord
    ) -> MergeTargetsResponse:
        """Return existing team workers/shifts plus auto-match suggestions.

        The frontend uses this to populate dropdowns and pre-fill the
        reconciliation table with smart defaults.
        """
        existing_workers = self.collection.worker_db.get_workers_not_deleted(
            team_id
        )
        existing_shifts = self.collection.shift_db.get_shifts_not_deleted(
            team_id
        )

        targets = MergeTargetsResponse(
            workers=[
                MergeTargetWorker(id=w.id, name=w.name, acronym=w.acronym)
                for w in existing_workers
            ],
            shifts=[
                MergeTargetShift(
                    id=s.id,
                    name=s.name,
                    acronym=s.acronym,
                    shiftType=s.shift_type.value,
                )
                for s in existing_shifts
            ],
        )

        # Run auto-match
        worker_matches, shift_matches = self._auto_match(
            import_record.members,
            import_record.shifts,
            existing_workers,
            existing_shifts,
        )

        targets.suggestedWorkerMappings = worker_matches
        targets.suggestedShiftMappings = shift_matches

        return targets

    # ── Auto-match logic ─────────────────────────────────────────────────

    def _auto_match(
        self,
        imported_members: List[Dict[str, Any]],
        imported_shifts: List[Dict[str, Any]],
        existing_workers: List[Worker],
        existing_shifts: List[Shift],
    ) -> Tuple[List[WorkerMergeMapping], List[ShiftMergeMapping]]:
        """Match imported entities to existing ones.

        Matching priority:
        1. Exact acronym match (case-insensitive) → MERGE_INTO
        2. Exact name match (case-insensitive, trimmed) → MERGE_INTO
        3. Levenshtein < 3 on name → still ADD_NEW (low confidence)
        4. No match → ADD_NEW
        """
        worker_mappings: List[WorkerMergeMapping] = []
        used_worker_ids: set = set()

        for member in imported_members:
            gid = member["generatedId"]
            name = (member.get("name") or "").strip().lower()
            acronym = (member.get("acronym") or "").strip().lower()

            match_found = False

            # Priority 1: exact acronym match
            for ew in existing_workers:
                if (
                    ew.acronym.strip().lower() == acronym
                    and ew.id not in used_worker_ids
                ):
                    worker_mappings.append(
                        WorkerMergeMapping(
                            generatedId=gid,
                            action=MergeAction.MERGE_INTO,
                            targetWorkerId=ew.id,
                        )
                    )
                    used_worker_ids.add(ew.id)
                    match_found = True
                    break

            if match_found:
                continue

            # Priority 2: exact name match
            for ew in existing_workers:
                if (
                    ew.name.strip().lower() == name
                    and ew.id not in used_worker_ids
                ):
                    worker_mappings.append(
                        WorkerMergeMapping(
                            generatedId=gid,
                            action=MergeAction.MERGE_INTO,
                            targetWorkerId=ew.id,
                        )
                    )
                    used_worker_ids.add(ew.id)
                    match_found = True
                    break

            if match_found:
                continue

            # Priority 3: fuzzy name match (Levenshtein < 3)
            for ew in existing_workers:
                if (
                    _levenshtein(name, ew.name.strip().lower()) < 3
                    and ew.id not in used_worker_ids
                ):
                    # Still ADD_NEW — close match but not confident enough for auto-merge
                    worker_mappings.append(
                        WorkerMergeMapping(
                            generatedId=gid,
                            action=MergeAction.ADD_NEW,
                            targetWorkerId=None,
                        )
                    )
                    match_found = True
                    break

            if match_found:
                continue

            # No match
            worker_mappings.append(
                WorkerMergeMapping(
                    generatedId=gid,
                    action=MergeAction.ADD_NEW,
                    targetWorkerId=None,
                )
            )

        # Same logic for shifts
        shift_mappings: List[ShiftMergeMapping] = []
        used_shift_ids: set = set()

        for imp_shift in imported_shifts:
            gid = imp_shift["generatedId"]
            name = (imp_shift.get("name") or "").strip().lower()
            acronym = (imp_shift.get("acronym") or "").strip().lower()

            match_found = False

            for es in existing_shifts:
                if (
                    es.acronym.strip().lower() == acronym
                    and es.id not in used_shift_ids
                ):
                    shift_mappings.append(
                        ShiftMergeMapping(
                            generatedId=gid,
                            action=MergeAction.MERGE_INTO,
                            targetShiftId=es.id,
                        )
                    )
                    used_shift_ids.add(es.id)
                    match_found = True
                    break

            if match_found:
                continue

            for es in existing_shifts:
                if (
                    es.name.strip().lower() == name
                    and es.id not in used_shift_ids
                ):
                    shift_mappings.append(
                        ShiftMergeMapping(
                            generatedId=gid,
                            action=MergeAction.MERGE_INTO,
                            targetShiftId=es.id,
                        )
                    )
                    used_shift_ids.add(es.id)
                    match_found = True
                    break

            if match_found:
                continue

            shift_mappings.append(
                ShiftMergeMapping(
                    generatedId=gid,
                    action=MergeAction.ADD_NEW,
                    targetShiftId=None,
                )
            )

        return worker_mappings, shift_mappings

    # ── Merge execution ──────────────────────────────────────────────────

    def execute_merge(
        self, import_id: str, merge_req: MergeRequest
    ) -> MergeResult:
        """Execute the merge transactionally.

        Steps:
        1. Load import record
        2. Build mapping indexes
        3. Cascade exclusions
        4. Apply assignment date filter
        5. Create/update workers, shifts, requests, assignments
        6. Return result counts
        """
        record = self.collection.import_record_db.get_import_by_id(import_id)
        if record is None:
            raise ValueError(f"Import record '{import_id}' not found")

        team_id = merge_req.teamId

        # ── 1. Build mapping indexes ──
        worker_action: Dict[str, MergeAction] = {}
        worker_target: Dict[str, str] = {}
        for wm in merge_req.workerMappings:
            worker_action[wm.generatedId] = wm.action
            if wm.action == MergeAction.MERGE_INTO and wm.targetWorkerId:
                worker_target[wm.generatedId] = wm.targetWorkerId

        shift_action: Dict[str, MergeAction] = {}
        shift_target: Dict[str, str] = {}
        for sm in merge_req.shiftMappings:
            shift_action[sm.generatedId] = sm.action
            if sm.action == MergeAction.MERGE_INTO and sm.targetShiftId:
                shift_target[sm.generatedId] = sm.targetShiftId

        request_action: Dict[str, MergeAction] = {}
        for rm in merge_req.requestMappings:
            request_action[rm.generatedId] = rm.action

        # ── 2. Validate: no duplicate MERGE_INTO targets ──
        self._validate_no_duplicate_targets(worker_target, "worker")
        self._validate_no_duplicate_targets(shift_target, "shift")

        # ── 3. Determine valid worker/shift IDs for cascade ──
        valid_worker_gids: set = {
            gid
            for gid, action in worker_action.items()
            if action != MergeAction.SKIP
        }
        valid_shift_gids: set = {
            gid
            for gid, action in shift_action.items()
            if action != MergeAction.SKIP
        }

        # ── 4. Process workers ──
        result = MergeResult()
        id_remap_workers: Dict[str, str] = {}  # generatedId → real ID

        for member in record.members:
            gid = member["generatedId"]
            action = worker_action.get(gid, MergeAction.SKIP)

            if action == MergeAction.SKIP:
                result.workersSkipped += 1
                continue

            if action == MergeAction.ADD_NEW:
                worker = self._dict_to_worker(member, team_id)
                created = self.collection.worker_db.create_worker(worker)
                id_remap_workers[gid] = created.id
                result.workersCreated += 1

            elif action == MergeAction.MERGE_INTO:
                real_id = worker_target[gid]
                existing = self.collection.worker_db.get_worker_by_id(real_id)
                if existing is None:
                    raise ValueError(f"Target worker '{real_id}' not found")
                # Merge: imported values overwrite existing fields
                merged = self._merge_worker_fields(existing, member)
                self.collection.worker_db.update_worker(merged)
                id_remap_workers[gid] = real_id
                result.workersUpdated += 1

        # ── 5. Process shifts ──
        id_remap_shifts: Dict[str, str] = {}

        for imp_shift in record.shifts:
            gid = imp_shift["generatedId"]
            action = shift_action.get(gid, MergeAction.SKIP)

            if action == MergeAction.SKIP:
                result.shiftsSkipped += 1
                continue

            if action == MergeAction.ADD_NEW:
                shift = self._dict_to_shift(imp_shift, team_id)
                created_shift = self.collection.shift_db.create_shift(shift)
                id_remap_shifts[gid] = created_shift.id
                result.shiftsCreated += 1

            elif action == MergeAction.MERGE_INTO:
                real_id = shift_target[gid]
                try:
                    existing_shift = self.collection.shift_db.get_shift_by_id(
                        real_id
                    )
                except Exception:
                    raise ValueError(f"Target shift '{real_id}' not found")
                merged_shift = self._merge_shift_fields(
                    existing_shift, imp_shift
                )
                self.collection.shift_db.update_shift(merged_shift)
                id_remap_shifts[gid] = real_id
                result.shiftsUpdated += 1

        # ── 6. Process requests (cascade: skip if worker was skipped) ──
        for req_data in record.requests:
            gid = req_data["generatedId"]
            worker_gid = req_data.get("workerId", "")

            # Cascade: if the parent worker was skipped, skip the request
            if worker_gid not in valid_worker_gids:
                result.requestsCascadeSkipped += 1
                continue

            action = request_action.get(gid, MergeAction.ADD_NEW)

            if action == MergeAction.SKIP:
                result.requestsSkipped += 1
                continue

            if action == MergeAction.ADD_NEW:
                real_worker_id = id_remap_workers.get(worker_gid)
                if real_worker_id is None:
                    result.requestsCascadeSkipped += 1
                    continue

                request = self._dict_to_request(
                    req_data, team_id, real_worker_id
                )
                self.collection.request_db.create_request(request)
                result.requestsCreated += 1

        # ── 7. Process assignments (cascade + date filter) ──
        for a_data in record.assignments:
            worker_gid = a_data.get("workerId", "")
            shift_gid = a_data.get("shiftId", "")

            # Cascade: skip if worker or shift was skipped
            if (
                worker_gid not in valid_worker_gids
                or shift_gid not in valid_shift_gids
            ):
                continue

            # Date filter
            a_date_ts = a_data.get("date")
            if a_date_ts is None:
                continue

            cfg = merge_req.assignmentConfig
            if not cfg.includeAll:
                if cfg.startDate is not None and a_date_ts < cfg.startDate:
                    continue
                if cfg.endDate is not None and a_date_ts > cfg.endDate:
                    continue

            real_worker_id = id_remap_workers.get(worker_gid)
            real_shift_id = id_remap_shifts.get(shift_gid)
            if real_worker_id is None or real_shift_id is None:
                continue

            assignment = self._dict_to_assignment(
                a_data, team_id, real_worker_id, real_shift_id
            )
            self.collection.assignment_db.create_assignment(assignment)
            result.assignmentsCreated += 1

        log_info(
            f"Merge complete for import {import_id}: "
            f"workers +{result.workersCreated}/~{result.workersUpdated}/-{result.workersSkipped}, "
            f"shifts +{result.shiftsCreated}/~{result.shiftsUpdated}/-{result.shiftsSkipped}, "
            f"requests +{result.requestsCreated}/-{result.requestsSkipped}, "
            f"assignments +{result.assignmentsCreated}"
        )

        return result

    # ── Validation ───────────────────────────────────────────────────────

    @staticmethod
    def _validate_no_duplicate_targets(
        target_map: Dict[str, str], entity_kind: str
    ) -> None:
        """Ensure no two imported entities map to the same target."""
        seen: Dict[str, str] = {}
        for gid, target_id in target_map.items():
            if target_id in seen:
                raise ValueError(
                    f"Duplicate {entity_kind} merge target: both "
                    f"'{seen[target_id]}' and '{gid}' map to '{target_id}'"
                )
            seen[target_id] = gid

    # ── Conversion helpers ───────────────────────────────────────────────

    @staticmethod
    def _dict_to_worker(data: Dict[str, Any], team_id: str) -> Worker:
        """Convert an imported member dict to a Worker domain object."""
        return Worker(
            id="",  # assigned by repository
            team_id=team_id,
            name=data.get("name", ""),
            acronym=data.get("acronym", ""),
            acronym_custom=data.get("acronymCustom", False),
            employment_start_date=datetime.fromtimestamp(
                data.get("employmentStartDate", 0), tz=timezone.utc
            ).date(),
            employment_end_date=(
                datetime.fromtimestamp(
                    data["employmentEndDate"], tz=timezone.utc
                ).date()
                if data.get("employmentEndDate")
                else None
            ),
            weekly_hours=data.get("weeklyHours", 0),
            weekly_hours_desired=data.get("weeklyHoursDesired", 0),
            duties_per_month=data.get("dutiesPerMonth", 0),
            annual_leave=data.get("annualLeave", 0),
            specialty_ids=data.get("specialtyIds", []),
            deleted=False,
            user_id=None,
        )

    @staticmethod
    def _merge_worker_fields(
        existing: Worker, imported: Dict[str, Any]
    ) -> Worker:
        """Overwrite existing worker fields with imported values."""
        existing.name = imported.get("name", existing.name)
        existing.acronym = imported.get("acronym", existing.acronym)
        existing.acronym_custom = imported.get(
            "acronymCustom", existing.acronym_custom
        )
        existing.employment_start_date = datetime.fromtimestamp(
            imported.get("employmentStartDate", 0), tz=timezone.utc
        ).date()
        existing.employment_end_date = (
            datetime.fromtimestamp(
                imported["employmentEndDate"], tz=timezone.utc
            ).date()
            if imported.get("employmentEndDate")
            else None
        )
        existing.weekly_hours = imported.get(
            "weeklyHours", existing.weekly_hours
        )
        existing.weekly_hours_desired = imported.get(
            "weeklyHoursDesired", existing.weekly_hours_desired
        )
        existing.duties_per_month = imported.get(
            "dutiesPerMonth", existing.duties_per_month
        )
        existing.annual_leave = imported.get(
            "annualLeave", existing.annual_leave
        )
        existing.specialty_ids = imported.get(
            "specialtyIds", existing.specialty_ids
        )
        return existing

    @staticmethod
    def _dict_to_shift(data: Dict[str, Any], team_id: str) -> Shift:
        """Convert an imported shift dict to a Shift domain object."""
        return Shift(
            id="",
            team_id=team_id,
            name=data.get("name", ""),
            acronym=data.get("acronym", ""),
            acronym_custom=data.get("acronymCustom", False),
            start_time=_minutes_to_datetime(data.get("startTime", 0)),
            end_time=_minutes_to_datetime(data.get("endTime", 0)),
            staffing=data.get("staffing", []),
            color=data.get("color", "#6B7280"),
            shift_type=ShiftType(data.get("shiftType", 0)),
            rest_type=ShiftRestType(data.get("restType", 0)),
            leave_type=ShiftLeaveType(data.get("leaveType", 0)),
            recuperation_time=data.get("recuperationTime", 0),
            recuperation_duty_id=data.get("recuperationDutyId"),
            deleted=False,
        )

    @staticmethod
    def _merge_shift_fields(
        existing: Shift, imported: Dict[str, Any]
    ) -> Shift:
        """Overwrite existing shift fields with imported values."""
        existing.name = imported.get("name", existing.name)
        existing.acronym = imported.get("acronym", existing.acronym)
        existing.acronym_custom = imported.get(
            "acronymCustom", existing.acronym_custom
        )
        existing.start_time = _minutes_to_datetime(
            imported.get("startTime", 0)
        )
        existing.end_time = _minutes_to_datetime(imported.get("endTime", 0))
        existing.staffing = imported.get("staffing", existing.staffing)
        existing.color = imported.get("color", existing.color)
        return existing

    def _dict_to_request(
        self, data: Dict[str, Any], team_id: str, real_worker_id: str
    ) -> Request:
        """Convert an imported request dict to a Request domain object.

        Resolves the imported request's shift_code to a real leave-type
        shift in the target team.  If no leave shift exists yet, one is
        auto-created so the merge can proceed.
        """
        start_date = datetime.fromtimestamp(
            data.get("startDate", 0), tz=timezone.utc
        ).date()
        end_date = datetime.fromtimestamp(
            data.get("endDate", 0), tz=timezone.utc
        ).date()

        shift_id = self._resolve_leave_shift_id(team_id)

        return Request(
            id="",
            team_id=team_id,
            request_type=RequestType.LEAVE,
            worker_id=real_worker_id,
            start_date=start_date,
            end_date=end_date,
            shift_id=shift_id,
            shift_options=[],
            status=RequestStatus.APPROVED,
        )

    def _resolve_leave_shift_id(self, team_id: str) -> str:
        """Return an existing leave-type shift id for *team_id*, creating
        one if none exists."""
        existing_shifts = self.collection.shift_db.get_shifts_not_deleted(
            team_id
        )
        for shift in existing_shifts:
            if shift.leave_type != ShiftLeaveType.NONE:
                return shift.id

        # No leave shift yet — auto-create a sensible default
        leave_shift = Shift(
            id="",
            team_id=team_id,
            name="Leave",
            acronym="LEAVE",
            acronym_custom=False,
            start_time=_minutes_to_datetime(0),  # 00:00
            end_time=_minutes_to_datetime(24 * 60),  # 24:00
            staffing=[],
            color="#9CA3AF",
            shift_type=ShiftType.LEAVE,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.VACATION,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        )
        created = self.collection.shift_db.create_shift(leave_shift)
        log_info(
            f"Auto-created leave shift '{created.id}' for team '{team_id}' "
            f"during import merge"
        )
        return created.id

    @staticmethod
    def _dict_to_assignment(
        data: Dict[str, Any],
        team_id: str,
        real_worker_id: str,
        real_shift_id: str,
    ) -> Assignment:
        """Convert an imported assignment dict to an Assignment domain object."""
        a_date = datetime.fromtimestamp(
            data.get("date", 0), tz=timezone.utc
        ).date()

        return Assignment(
            id="",
            team_id=team_id,
            schedule_id=None,
            worker_id=real_worker_id,
            date=a_date,
            shift_id=real_shift_id,
            fixed=data.get("fixed", False),
            source=AssignmentSource.MANUAL,
            source_id=None,
        )
