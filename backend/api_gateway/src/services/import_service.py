"""Service for importing schedules from Excel files.

Parses an uploaded Excel workbook and produces an ``ImportPreviewDTO``
with all extracted entities and validation warnings.  No data is persisted
— this is a read-only preview step.
"""

import logging
from datetime import date, datetime, time, timezone
from typing import Dict, List, Optional
from uuid import uuid4

from shared.schemas.core.shift import ShiftLeaveType, ShiftRestType, ShiftType
from shared.schemas.dto.import_preview import (
    ImportAssignmentPreviewDTO,
    ImportMemberPreviewDTO,
    ImportPreviewDTO,
    ImportRequestPreviewDTO,
    ImportShiftPreviewDTO,
)

from src.services.base_service import BaseService
from src.utils.excel_utils.excel_to_core_import import parse_import_workbook

logger = logging.getLogger(__name__)

# ── Defaults for missing member fields ────────────────────────────────────────
DEFAULT_WEEKLY_HOURS = 40
DEFAULT_DUTIES_PER_MONTH = 4
DEFAULT_ANNUAL_LEAVE = 20

# ── Deterministic color palette for auto-generated shift colors ───────────────
_NAMED_COLORS = [
    "#4F46E5",
    "#0891B2",
    "#059669",
    "#D97706",
    "#DC2626",
    "#7C3AED",
    "#DB2777",
    "#2563EB",
    "#65A30D",
    "#9333EA",
    "#C026D3",
    "#0D9488",
    "#EA580C",
    "#0284C7",
    "#A21CAF",
    "#15803D",
    "#B45309",
    "#1D4ED8",
    "#BE123C",
    "#854D0E",
]


class ImportService(BaseService):
    """Import-related business logic — preview phase only."""

    # ── Public API ─────────────────────────────────────────────────────────

    def preview_import(
        self,
        team_id: str,
        file_contents: bytes,
    ) -> ImportPreviewDTO:
        """Parse an Excel workbook and return a full preview."""
        all_warnings: List[str] = []

        # 1. Parse the raw Excel workbook
        members_raw, shifts_raw, schedule_raw, errors = parse_import_workbook(
            file_contents
        )
        if errors:
            return ImportPreviewDTO(
                members=[],
                shifts=[],
                requests=[],
                assignments=[],
                errors=errors,
                warnings=[],
            )

        # 2. Fetch team specialties for skill name → ID mapping
        specialties = (
            self.collection.specialty_db.get_specialties_not_deleted_by_team_id(team_id)
        )
        specialty_name_to_id = {s.name.lower(): s.id for s in specialties}

        # 3. Build shift previews (must come first — leave shift may be
        #    auto-generated and needed by requests/assignments)
        shifts_preview, shift_code_to_id = self._build_shift_previews(
            shifts_raw, schedule_raw, team_id, all_warnings
        )

        # 4. Build member previews
        members_preview = self._build_member_previews(
            members_raw, team_id, specialty_name_to_id, all_warnings
        )

        # worker name → generated worker ID mapping
        worker_name_to_id = {m.name.lower(): m.generatedId for m in members_preview}

        # 5. Build request previews (from "leave" cells)
        leave_shift = self._find_leave_shift_preview(shifts_preview)
        requests_preview: List[ImportRequestPreviewDTO] = []
        if leave_shift and schedule_raw:
            requests_preview = self._build_request_previews(
                schedule_raw, worker_name_to_id, leave_shift, team_id, all_warnings
            )

        # 6. Build assignment previews (all non-empty cells)
        assignments_preview: List[ImportAssignmentPreviewDTO] = []
        if schedule_raw:
            assignments_preview = self._build_assignment_previews(
                schedule_raw,
                worker_name_to_id,
                shift_code_to_id,
                team_id,
                all_warnings,
            )

        return ImportPreviewDTO(
            members=members_preview,
            shifts=shifts_preview,
            requests=requests_preview,
            assignments=assignments_preview,
            errors=[],
            warnings=all_warnings,
        )

    # ── Member builder ─────────────────────────────────────────────────────

    def _build_member_previews(
        self,
        members_raw: List[dict],
        team_id: str,
        specialty_name_to_id: Dict[str, str],
        warnings: List[str],
    ) -> List[ImportMemberPreviewDTO]:
        previews: List[ImportMemberPreviewDTO] = []
        seen_names: set = set()

        for m in members_raw:
            name = m["name"]
            name_lower = name.lower()
            member_warnings: List[str] = []

            if name_lower in seen_names:
                member_warnings.append(f"Duplicate worker name: {name}")
            seen_names.add(name_lower)

            # Start date is required
            start_date = m.get("start")
            if start_date is None:
                member_warnings.append(f"Missing employment start date for {name}")

            # Resolve skills → specialty IDs
            specialty_ids: List[str] = []
            for skill_name in m.get("skills", []):
                skill_lower = skill_name.lower()
                spec_id = specialty_name_to_id.get(skill_lower)
                if spec_id:
                    specialty_ids.append(spec_id)
                else:
                    member_warnings.append(
                        f"Skill '{skill_name}' not found in team specialties — skipped"
                    )

            contract = m.get("contract") or DEFAULT_WEEKLY_HOURS
            desired = m.get("desired") or contract

            previews.append(
                ImportMemberPreviewDTO(
                    generatedId=str(uuid4()),
                    name=name,
                    acronym=m["code"] or _derive_acronym(name),
                    acronymCustom=bool(m["code"]),
                    employmentStartDate=(
                        _date_to_unix(start_date)
                        if start_date
                        else _date_to_unix(date.today())
                    ),
                    employmentEndDate=(
                        _date_to_unix(m["end"]) if m.get("end") else None
                    ),
                    weeklyHours=contract,
                    weeklyHoursDesired=desired,
                    dutiesPerMonth=m.get("duty_per_month") or DEFAULT_DUTIES_PER_MONTH,
                    annualLeave=m.get("annual_leave") or DEFAULT_ANNUAL_LEAVE,
                    specialtyIds=specialty_ids,
                    warnings=member_warnings,
                )
            )

            warnings.extend(member_warnings)

        return previews

    # ── Shift builder ──────────────────────────────────────────────────────

    def _build_shift_previews(
        self,
        shifts_raw: List[dict],
        schedule_raw: List[dict],
        team_id: str,
        warnings: List[str],
    ) -> tuple[List[ImportShiftPreviewDTO], Dict[str, str]]:
        """Build shift previews and return (previews, code→id mapping)."""
        previews: List[ImportShiftPreviewDTO] = []
        code_to_id: Dict[str, str] = {}
        seen_codes: set = set()
        has_leave_in_schedule = _schedule_has_leave_values(schedule_raw)
        has_explicit_leave_shift = False

        for s in shifts_raw:
            code = s["code"].upper() if s["code"] else ""
            shift_warnings: List[str] = []

            if not code:
                shift_warnings.append(f"Missing code for shift '{s['name']}'")
                continue
            if code.upper() in seen_codes:
                shift_warnings.append(f"Duplicate shift code: {code}")
            seen_codes.add(code.upper())

            shift_type = ShiftType.DUTY if s["duty"] else ShiftType.NORMAL
            rest_type = ShiftRestType.OFF if s["mandatory_rest"] else ShiftRestType.NONE

            # Check if this is explicitly a leave shift (by name or code)
            if "leave" in s["name"].lower() or code.upper() == "LEAVE":
                has_explicit_leave_shift = True
                shift_type = ShiftType.LEAVE

            generated_id = str(uuid4())
            code_to_id[code.upper()] = generated_id

            previews.append(
                ImportShiftPreviewDTO(
                    generatedId=generated_id,
                    name=s["name"],
                    acronym=code,
                    acronymCustom=True,
                    startTime=s["start_time"] or 0,
                    endTime=s["end_time"] or 0,
                    staffing=[],  # bare list — StaffingDTO not needed for preview
                    color=_pick_color(len(previews)),
                    shiftType=shift_type.value,
                    restType=rest_type.value,
                    leaveType=ShiftLeaveType.VACATION.value
                    if shift_type == ShiftType.LEAVE
                    else ShiftLeaveType.NONE.value,
                    recuperationTime=0,
                    recuperationDutyId=None,
                    duty=s["duty"],
                    mandatoryRest=s["mandatory_rest"],
                    warnings=shift_warnings,
                )
            )

            warnings.extend(shift_warnings)

        # Auto-generate a Leave shift if needed
        if has_leave_in_schedule and not has_explicit_leave_shift:
            leave_code = "LEAVE"
            # Ensure no collision
            suffix = 0
            base_code = leave_code
            while leave_code.upper() in seen_codes:
                suffix += 1
                leave_code = f"{base_code}{suffix}"
            seen_codes.add(leave_code.upper())

            generated_id = str(uuid4())
            code_to_id[leave_code.upper()] = generated_id
            previews.append(
                ImportShiftPreviewDTO(
                    generatedId=generated_id,
                    name="Leave (auto-generated)",
                    acronym=leave_code,
                    acronymCustom=True,
                    startTime=0,
                    endTime=0,
                    staffing=[],
                    color="#9CA3AF",  # gray
                    shiftType=ShiftType.LEAVE.value,
                    restType=ShiftRestType.NONE.value,
                    leaveType=ShiftLeaveType.VACATION.value,
                    recuperationTime=0,
                    recuperationDutyId=None,
                    duty=False,
                    mandatoryRest=False,
                    warnings=[
                        "Auto-generated leave shift (found 'leave' values in schedule)"
                    ],
                )
            )
            warnings.append(
                "Auto-generated 'Leave' shift — no leave-type shift was found in the shifts sheet"
            )

        return previews, code_to_id

    # ── Request builder ────────────────────────────────────────────────────

    def _build_request_previews(
        self,
        schedule_raw: List[dict],
        worker_name_to_id: Dict[str, str],
        leave_shift: ImportShiftPreviewDTO,
        team_id: str,
        warnings: List[str],
    ) -> List[ImportRequestPreviewDTO]:
        """Detect consecutive 'leave' cells per worker, create one request per range."""
        previews: List[ImportRequestPreviewDTO] = []

        for row in schedule_raw:
            worker_name = row["worker_name"]
            worker_id = worker_name_to_id.get(worker_name.lower())
            if worker_id is None:
                continue  # warning already emitted during assignment building

            cells: Dict[str, List[str]] = row.get("cells", {})

            # Collect all dates where the cell contains "leave" (case-insensitive)
            leave_dates: List[date] = []
            for date_str, codes in cells.items():
                if any(c.lower() == "leave" for c in codes):
                    try:
                        leave_dates.append(date.fromisoformat(date_str))
                    except ValueError:
                        continue

            if not leave_dates:
                continue

            leave_dates.sort()

            # Group consecutive dates into ranges
            ranges: List[List[date]] = []
            current_range: List[date] = [leave_dates[0]]
            for i in range(1, len(leave_dates)):
                delta = (leave_dates[i] - leave_dates[i - 1]).days
                if delta == 1:
                    current_range.append(leave_dates[i])
                else:
                    ranges.append(current_range)
                    current_range = [leave_dates[i]]
            ranges.append(current_range)

            for rng in ranges:
                previews.append(
                    ImportRequestPreviewDTO(
                        generatedId=str(uuid4()),
                        workerName=worker_name,
                        workerId=worker_id,
                        requestType="leave",
                        startDate=_date_to_unix(rng[0]),
                        endDate=_date_to_unix(rng[-1]),
                        shiftCode=leave_shift.acronym,
                        status="approved",
                        fulfillment="fulfilled",
                        warnings=[],
                    )
                )

        return previews

    # ── Assignment builder ─────────────────────────────────────────────────

    def _build_assignment_previews(
        self,
        schedule_raw: List[dict],
        worker_name_to_id: Dict[str, str],
        shift_code_to_id: Dict[str, str],
        team_id: str,
        warnings: List[str],
    ) -> List[ImportAssignmentPreviewDTO]:
        """Build one assignment per non-empty cell per shift code."""
        previews: List[ImportAssignmentPreviewDTO] = []
        unresolved_workers: set = set()
        unresolved_shifts: set = set()

        for row in schedule_raw:
            worker_name = row["worker_name"]
            worker_id = worker_name_to_id.get(worker_name.lower())

            if worker_id is None:
                unresolved_workers.add(worker_name)
                continue

            cells: Dict[str, List[str]] = row.get("cells", {})
            for date_str, codes in cells.items():
                try:
                    d = date.fromisoformat(date_str)
                except ValueError:
                    continue

                for code in codes:
                    code_upper = code.strip().upper()
                    shift_id = shift_code_to_id.get(code_upper)
                    if shift_id is None:
                        unresolved_shifts.add(code.strip())
                        continue

                    cell_warnings: List[str] = []
                    previews.append(
                        ImportAssignmentPreviewDTO(
                            generatedId=str(uuid4()),
                            workerName=worker_name,
                            workerId=worker_id,
                            date=_date_to_unix(d),
                            shiftCode=code.strip(),
                            shiftId=shift_id,
                            fixed=True,
                            source="manual",
                            warnings=cell_warnings,
                        )
                    )

        # Emit aggregate warnings (once per unique unresolved name/code)
        for w in sorted(unresolved_workers):
            warnings.append(
                f"Worker '{w}' in schedule not found in members sheet — skipped"
            )

        for s in sorted(unresolved_shifts):
            # "leave" is special-cased — it should resolve to the leave shift
            if s.lower() != "leave":
                warnings.append(
                    f"Shift code '{s}' in schedule not found in shifts sheet — skipped"
                )

        return previews

    # ── Helpers ────────────────────────────────────────────────────────────

    @staticmethod
    def _find_leave_shift_preview(
        shifts: List[ImportShiftPreviewDTO],
    ) -> Optional[ImportShiftPreviewDTO]:
        """Find the first LEAVE-type shift in the preview list."""
        for s in shifts:
            if s.shiftType == ShiftType.LEAVE.value:
                return s
        return None


# ── Module-level helpers ──────────────────────────────────────────────────────


def _derive_acronym(name: str) -> str:
    """Derive a 3-letter uppercase acronym from a name."""
    parts = name.strip().split()
    if len(parts) >= 2:
        return "".join(p[0].upper() for p in parts[:3])
    return name.strip()[:3].upper()


def _pick_color(index: int) -> str:
    """Pick a deterministic color from the palette."""
    return _NAMED_COLORS[index % len(_NAMED_COLORS)]


def _date_to_unix(d: date) -> float:
    """Convert a date to UTC-midnight UNIX timestamp."""
    return datetime.combine(d, time.min, tzinfo=timezone.utc).timestamp()


def _schedule_has_leave_values(schedule_raw: List[dict]) -> bool:
    """Check if any cell in the schedule contains a 'leave' value."""
    for row in schedule_raw:
        for codes in row.get("cells", {}).values():
            if any(c.lower() == "leave" for c in codes):
                return True
    return False
