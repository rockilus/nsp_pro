"""Admin import routes for uploading Excel schedules.

Provides:
- ``POST /admin/import/preview`` — parse Excel and return preview JSON
- ``GET  /admin/import/teams/{team_id}/template`` — download blank template
"""

from io import BytesIO

from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info
from shared.schemas.dto.import_preview import ImportPreviewDTO

from src.dependencies import get_db_collections, get_user_context
from src.dependencies.cerbos_authz_dependencies import get_cerbos_authz_service
from src.dependencies.import_service import get_import_service
from src.errors import NotAuthorizedError, handle_routes_errors
from src.integrations.authorization.cerbos_authz_service import (
    CerbosAuthzService,
)
from src.security.user_context import UserContext
from src.services.import_service import ImportService

router = APIRouter()


# ── Preview endpoint ──────────────────────────────────────────────────────────


@router.post(
    "/admin/import/preview",
    status_code=201,
    response_model=ImportPreviewDTO,
)
async def preview_import(
    file: UploadFile = File(...),
    user_context: UserContext = Depends(get_user_context),
    import_service: ImportService = Depends(get_import_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> ImportPreviewDTO:
    """Parse an Excel import file and return a preview of all extracted entities.

    No data is persisted — this is a read-only preview.  The caller must
    be a super admin (checked against the ``admin`` Cerbos resource).
    No team context is needed for preview. Team selection happens at
    the confirm/write phase.
    """
    response: ImportPreviewDTO
    try:
        # AuthZ: super-admin only
        if not await authz.check(
            user_context.user_id, "preview-import", "admin", "admin"
        ):
            raise NotAuthorizedError("You do not have permission to import schedules")

        # Validate file type
        if not file.filename or not (
            file.filename.endswith(".xlsx") or file.filename.endswith(".xls")
        ):
            raise ValueError("File must be an Excel workbook (.xlsx or .xls)")

        contents = await file.read()
        if not contents:
            raise ValueError("Uploaded file is empty")

        response = import_service.preview_import(contents)

    except Exception as e:
        log_info(f"Failed to preview import: {e}")
        handle_routes_errors(e)

    return response


# ── Template download endpoint ───────────────────────────────────────────────


@router.get("/admin/import/teams/{team_id}/template")
async def download_import_template(
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> StreamingResponse:
    """Download a blank Excel template for schedule import.

    The template contains three sheets with header rows:
    - ``members``
    - ``shifts``
    - ``schedule`` (header row only, no data)
    """
    try:
        if not await authz.check(
            user_context.user_id, "download-template", "admin", "admin"
        ):
            raise NotAuthorizedError(
                "You do not have permission to download import templates"
            )

        # Verify the target team exists
        team = db_collections.team_db.get_team_by_id(team_id)
        if team is None:
            raise ValueError(f"Team with id '{team_id}' does not exist")

        wb = _build_template_workbook()
        stream = BytesIO()
        wb.save(stream)
        stream.seek(0)

        response = StreamingResponse(
            stream,
            media_type=(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ),
        )
        response.headers["Content-Disposition"] = (
            f"attachment; filename=import_template_{team_id}.xlsx"
        )
        return response

    except Exception as e:
        log_info(f"Failed to generate import template: {e}")
        handle_routes_errors(e)


# ── Template builder ─────────────────────────────────────────────────────────


def _build_template_workbook() -> Workbook:
    """Build a blank template workbook with three sheets and header rows."""
    wb = Workbook()

    # ── Members sheet ─────────────────────────────────────────────────────
    ws_members = wb.active
    if ws_members is None:
        ws_members = wb.create_sheet("members")
    ws_members.title = "members"
    _write_headers(
        ws_members,
        [
            "name",
            "code",
            "start",
            "end",
            "skills",
            "contract",
            "desired",
            "duty/month",
            "leave",
        ],
    )
    # Add example row
    _write_row(
        ws_members,
        2,
        [
            "Dr. Example",
            "EX",
            "2026-01-01",
            "",
            "Cardiology;Surgery",
            "40",
            "40",
            "4",
            "20",
        ],
    )

    # ── Shifts sheet ──────────────────────────────────────────────────────
    ws_shifts = wb.create_sheet("shifts")
    _write_headers(
        ws_shifts,
        [
            "name",
            "code",
            "duty",
            "mandatory_rest",
            "start",
            "end",
            "staffing",
        ],
    )
    _write_row(
        ws_shifts,
        2,
        [
            "Morning",
            "AM",
            "",
            "",
            "08:00",
            "16:00",
            "",
        ],
    )
    _write_row(
        ws_shifts,
        3,
        [
            "Night Duty",
            "ND",
            "yes",
            "yes",
            "20:00",
            "08:00",
            "",
        ],
    )

    # ── Schedule sheet ────────────────────────────────────────────────────
    ws_schedule = wb.create_sheet("schedule")
    ws_schedule.cell(row=1, column=1, value="Worker").font = _bold()
    # A few example date columns
    from datetime import date, timedelta

    today = date.today()
    for i in range(14):
        cell = ws_schedule.cell(row=1, column=2 + i, value=(today + timedelta(days=i)))
        cell.font = _bold()
        cell.number_format = "YYYY-MM-DD"

    return wb


def _write_headers(ws, headers: list) -> None:
    for col_idx, header in enumerate(headers, start=1):
        cell = ws.cell(row=1, column=col_idx, value=header)
        cell.font = _bold()


def _write_row(ws, row_idx: int, values: list) -> None:
    for col_idx, value in enumerate(values, start=1):
        ws.cell(row=row_idx, column=col_idx, value=value)


def _bold():
    from openpyxl.styles import Font

    return Font(bold=True)
