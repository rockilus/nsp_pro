from datetime import date
from typing import List

from openpyxl import Workbook
from openpyxl.drawing.image import Image
from openpyxl.styles import Alignment, Border, Font, Side, PatternFill
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.worksheet import Worksheet
from openpyxl.cell.cell import Cell
from shared.schemas.core import Assignment, Shift, ShiftType, Worker
from .shift_color_mappings import SHIFT_COLOR_MAPPINGS, DEFAULT_SHIFT_COLOR
from pathlib import Path
import logging
from openpyxl.styles import Color
from typing import Tuple


def core_to_excel_schedule(
    workers: List[Worker],
    shifts: List[Shift],
    assignments: List[Assignment],
    dates: List[date],
) -> Workbook:
    # Create a new workbook and add a sheet named "schedule_shifts"
    wb = Workbook()
    ws_shift_schedule = wb.active
    if not isinstance(ws_shift_schedule, Worksheet):
        raise TypeError("Expected a Worksheet, but got a different type")
    ws_shift_schedule.title = "shift_schedule"

    border_bottom_black = Border(
        bottom=Side(border_style="thin", color="000000")
    )
    border_rigth_black_bottom_grey = Border(
        right=Side(border_style="thin", color="000000"),
        bottom=Side(border_style="thin", color="dddddd"),
    )
    border_bottom_grey = Border(
        bottom=Side(border_style="thin", color="dddddd"),
    )

    build_shift_schedule_worksheet(
        ws_shift_schedule,
        workers,
        shifts,
        assignments,
        dates,
        border_bottom_black,
        border_rigth_black_bottom_grey,
        border_bottom_grey,
    )

    ws_worker_schedule = wb.create_sheet(title="worker_schedule")

    build_worker_schedule_worksheet(
        ws_worker_schedule,
        workers,
        shifts,
        assignments,
        dates,
        border_bottom_black,
        border_rigth_black_bottom_grey,
        border_bottom_grey,
    )
    return wb


# pylint: disable=too-many-arguments
def build_shift_schedule_worksheet(
    ws: Worksheet,
    workers: List[Worker],
    shifts: List[Shift],
    assignments: List[Assignment],
    dates: List[date],
    border_bottom_black: Border,
    border_rigth_black_bottom_grey: Border,
    border_bottom_grey: Border,
) -> None:
    table_start_row = 3
    table_header_start_column = 2
    add_logo_to_worksheet(ws)
    # For the shift schedule we insert a time column between the
    # shift name (col A) and the date columns. So shift the dates
    # header one column to the right and add a 'Time' header in B.
    build_dates_header_row_in_worksheet(
        ws,
        dates,
        table_header_start_column + 1,
        table_start_row,
        border_bottom_black,
    )

    # Add a Time header in the column between the shift name and dates
    time_col_letter = get_column_letter(table_header_start_column)
    cell_time_header: Cell = ws[f"{time_col_letter}{table_start_row}"]
    cell_time_header.value = "Time"
    cell_time_header.font = Font(bold=True)
    cell_time_header.border = border_bottom_black
    cell_time_header.alignment = Alignment(horizontal="center")
    # Make the time column a bit wider
    ws.column_dimensions[time_col_letter].width = 14
    # pass table_header_start_column + 1 so the rows builder knows
    # that the first date column is one column to the right (B is time)
    build_shift_schedule_rows_in_worksheet(
        ws,
        workers,
        shifts,
        assignments,
        dates,
        table_start_row,
        table_header_start_column + 1,
        border_rigth_black_bottom_grey,
        border_bottom_grey,
    )
    ws.column_dimensions["A"].width = 17
    # Freeze the first 3 rows and the first column
    ws.freeze_panes = "B4"
    # Hide gridlines
    ws.sheet_view.showGridLines = False


# pylint: disable=too-many-arguments
def build_worker_schedule_worksheet(
    ws: Worksheet,
    workers: List[Worker],
    shifts: List[Shift],
    assignments: List[Assignment],
    dates: List[date],
    border_bottom_black: Border,
    border_rigth_black_bottom_grey: Border,
    border_bottom_grey: Border,
) -> None:
    table_start_row = 3
    table_header_start_column = 2
    add_logo_to_worksheet(ws)
    build_dates_header_row_in_worksheet(
        ws,
        dates,
        table_header_start_column,
        table_start_row,
        border_bottom_black,
    )
    build_worker_schedule_rows_in_worksheet(
        ws,
        workers,
        shifts,
        assignments,
        dates,
        table_start_row,
        table_header_start_column,
        border_rigth_black_bottom_grey,
        border_bottom_grey,
    )
    ws.column_dimensions["A"].width = 17
    # Freeze the first 3 rows and the first column
    ws.freeze_panes = "B4"
    # Hide gridlines
    ws.sheet_view.showGridLines = False


def add_logo_to_worksheet(ws: Worksheet) -> None:
    module_dir = Path(__file__).resolve().parent
    candidates = [module_dir / "rockilus_logo_blue.jpg"]

    # Try to find a frontend/public fallback by walking up until we find a 'frontend' folder
    p = module_dir
    while p != p.parent:
        if (p / "frontend").exists():
            candidates.append(
                p / "frontend" / "public" / "rockilus_logo_blue.jpg"
            )
            break
        p = p.parent

    for candidate in candidates:
        if candidate.exists():
            try:
                img = Image(str(candidate))
                img.width = 150
                img.height = 20
                ws.add_image(img, "A1")
                return
            except Exception:
                # If image could not be loaded for any reason, log and continue to next candidate
                logging.getLogger(__name__).exception(
                    "Failed to load image from %s", candidate
                )

    # If we reach here, no image was found or loaded — log a warning and continue without a logo
    logging.getLogger(__name__).warning(
        "rockilus_logo_blue.jpg not found; skipping logo in Excel export"
    )


def _get_shift_color_values(color: str) -> Tuple[str, str, str]:
    """Resolve color strings or named mappings into (fill_hex, text_hex, sample_hex).

    Returns empty strings when no valid value could be resolved.
    """
    if not color:
        return "", "", ""

    # Named mapping (try exact then lowercase)
    if not color.startswith("#"):
        mapped = SHIFT_COLOR_MAPPINGS.get(color) or SHIFT_COLOR_MAPPINGS.get(
            color.lower()
        )
        if mapped:
            return (
                mapped.get("background", ""),
                mapped.get("text", ""),
                mapped.get("sample", ""),
            )
        # fallback to default sample when unknown named color
        return (
            DEFAULT_SHIFT_COLOR.get("background", ""),
            DEFAULT_SHIFT_COLOR.get("text", ""),
            DEFAULT_SHIFT_COLOR.get("sample", ""),
        )

    # color is a hex string provided directly on shift
    return (color, DEFAULT_SHIFT_COLOR.get("text", ""), color)


def _apply_fill_and_text(cell: Cell, fill_hex: str, text_hex: str) -> None:
    """Apply background fill and text color to a cell, validating hex codes.

    Accepts RGB (#RRGGBB) or AARRGGBB. Invalid values are skipped with a warning.
    """
    if fill_hex:
        color_hex = fill_hex.lstrip("#")
        try:
            if len(color_hex) == 6:
                fill_argb = "FF" + color_hex
            elif len(color_hex) == 8:
                fill_argb = color_hex
            else:
                raise ValueError("invalid hex length")
            int(fill_argb, 16)
            cell.fill = PatternFill(fgColor=fill_argb, fill_type="solid")
        except (ValueError, TypeError):
            logging.getLogger(__name__).warning(
                "Skipping invalid fill color for cell: %s", fill_hex
            )

    if text_hex:
        text_hex_stripped = text_hex.lstrip("#")
        try:
            if len(text_hex_stripped) == 6:
                text_argb = "FF" + text_hex_stripped
            elif len(text_hex_stripped) == 8:
                text_argb = text_hex_stripped
            else:
                raise ValueError("invalid hex length")
            int(text_argb, 16)
            cell.font = Font(color=text_argb)
        except (ValueError, TypeError):
            logging.getLogger(__name__).warning(
                "Skipping invalid text color for cell: %s", text_hex
            )


def _apply_duty_border(
    cell: Cell, sample_hex: str, position: str = "bottom"
) -> None:
    """Apply a medium border on the given `position` ("bottom" or "left")
    using the provided sample color. Accepts RGB or AARRGGBB; converts to
    the format expected by openpyxl Side.color (RGB without alpha).
    """
    if not sample_hex:
        return
    border_color = sample_hex.lstrip("#")
    try:
        if len(border_color) == 6:
            border_color_val = border_color
        elif len(border_color) == 8:
            border_color_val = border_color[2:]
        else:
            raise ValueError("invalid hex length")
        int(border_color_val, 16)
        side = Side(border_style="medium", color=border_color_val)
        # preserve other sides if they already exist on the cell
        existing = getattr(cell, "border", None)
        if position == "bottom":
            new_border = Border(
                left=getattr(existing, "left", None),
                right=getattr(existing, "right", None),
                top=getattr(existing, "top", None),
                bottom=side,
            )
        else:
            new_border = Border(
                left=side,
                right=getattr(existing, "right", None),
                top=getattr(existing, "top", None),
                bottom=getattr(existing, "bottom", None),
            )
        cell.border = new_border
    except (ValueError, TypeError):
        logging.getLogger(__name__).warning(
            "Skipping duty border for cell: %s", sample_hex
        )


def _format_shift_time(shift: Shift) -> str:
    """Return a formatted time range like 'HH:MM - HH:MM' and append
    a superscript '+1' (using Unicode superscript characters) if the
    shift ends on the following day.
    """
    # attempt to get start/end attributes with common names
    start = getattr(shift, "start_time", None) or getattr(
        shift, "startTime", None
    )
    end = getattr(shift, "end_time", None) or getattr(shift, "endTime", None)

    def fmt(t):
        if t is None:
            return ""
        if hasattr(t, "strftime"):
            return t.strftime("%H:%M")
        if isinstance(t, str):
            return t[:5]
        if hasattr(t, "hour"):
            return f"{t.hour:02d}:{getattr(t, 'minute', 0):02d}"
        return str(t)

    s_str = fmt(start)
    e_str = fmt(end)

    def to_minutes(t):
        if t is None:
            return None
        if hasattr(t, "hour"):
            return t.hour * 60 + getattr(t, "minute", 0)
        if isinstance(t, str) and ":" in t:
            parts = t.split(":")
            try:
                return int(parts[0]) * 60 + int(parts[1][:2])
            except Exception:
                return None
        return None

    s_min = to_minutes(start)
    e_min = to_minutes(end)
    end_next_day = False
    if s_min is not None and e_min is not None:
        if e_min <= s_min:
            end_next_day = True

    time_str = f"{s_str} - {e_str}"
    if end_next_day:
        # use Unicode superscript plus and one
        time_str = f"{time_str}⁺¹"
    return time_str


def build_dates_header_row_in_worksheet(
    ws: Worksheet,
    dates: List[date],
    table_header_start_column: int,
    table_start_row: int,
    border_bottom_black: Border,
) -> None:
    # Create column headers for the dates
    for col_num, date_value in enumerate(
        dates, start=table_header_start_column
    ):
        col_letter = get_column_letter(col_num)
        cell_date: Cell = ws[f"{col_letter}{table_start_row}"]
        cell_date.value = date_value
        cell_date.data_type = "d"
        # cell_date.number_format = 'dd/mm/yyyy'
        # cell_date.value = date_value.strftime("%d/%m/%Y")
        cell_date.font = Font(bold=True)
        cell_date.border = border_bottom_black
        cell_date.alignment = Alignment(horizontal="center")


# pylint: disable=too-many-arguments, too-many-locals
def build_shift_schedule_rows_in_worksheet(
    ws: Worksheet,
    workers: List[Worker],
    shifts: List[Shift],
    assignments: List[Assignment],
    dates: List[date],
    table_start_row: int,
    table_header_start_column: int,
    border_rigth_black_bottom_grey: Border,
    border_bottom_grey: Border,
) -> None:
    # Create a dictionary to map worker IDs to names and acronyms
    worker_id_to_name = {w.id: w.name for w in workers}
    worker_id_to_acronym = {w.id: getattr(w, "acronym", "") for w in workers}
    shift_ids_assigned = set(a.shift_id for a in assignments)
    shifts_table = [
        s
        for s in shifts
        if s.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]
        and s.id in shift_ids_assigned
    ]

    # Create a dictionary to store the maximum number of assignments for each shift
    shift_max_assignments = {s.id: 0 for s in shifts}

    row_num = table_start_row + 1
    # Populate the cells with worker names for each shift and date
    for shift in shifts_table:
        for col_num, date_value in enumerate(
            dates, start=table_header_start_column
        ):
            shift_date_assignments = [
                assignment
                for assignment in assignments
                if assignment.shift_id == shift.id
                and assignment.date == date_value
            ]
            shift_max_assignments[shift.id] = max(
                shift_max_assignments[shift.id], len(shift_date_assignments)
            )
            row_num_date = row_num
            for assignment in shift_date_assignments:
                cell_worker_name: Cell = ws[
                    f"{get_column_letter(col_num)}{row_num_date}"
                ]
                # show worker acronym (fall back to full name)
                cell_worker_name.value = worker_id_to_acronym.get(
                    assignment.worker_id,
                    worker_id_to_name.get(assignment.worker_id, ""),
                )
                cell_worker_name.alignment = Alignment(
                    horizontal="center",
                    vertical="center",
                    wrap_text=True,
                )
                # apply shift color/text but do NOT apply the duty bottom border here
                fill_hex, text_hex, sample_hex = _get_shift_color_values(
                    shift.color
                )
                _apply_fill_and_text(cell_worker_name, fill_hex, text_hex)
                row_num_date += 1
        # Create row header for the shift name
        cell_shift_name: Cell = ws[f"A{row_num}"]
        cell_shift_name.value = f"{shift.name} ({shift.acronym})"
        cell_shift_name.font = Font(bold=True)
        cell_shift_name.border = border_rigth_black_bottom_grey
        cell_shift_name.alignment = Alignment(
            vertical="center", wrap_text=True
        )

        # Create a time cell in the column immediately to the right
        # of the shift name column. Note: `table_header_start_column`
        # here points to the first DATE column (we passed +1 earlier),
        # so the time column is at index `table_header_start_column - 1`.
        time_col_idx = table_header_start_column - 1
        time_col_letter = get_column_letter(time_col_idx)
        cell_time: Cell = ws[f"{time_col_letter}{row_num}"]
        cell_time.value = _format_shift_time(shift)
        cell_time.alignment = Alignment(
            vertical="center", wrap_text=True, horizontal="center"
        )
        cell_time.border = border_rigth_black_bottom_grey
        ws.column_dimensions[time_col_letter].width = 14

        # If this shift is a duty, add a left border using the shift/sample color
        if shift.shift_type == ShiftType.DUTY:
            _, _, sample_hex = _get_shift_color_values(shift.color)
            _apply_duty_border(cell_shift_name, sample_hex, position="left")
            _apply_duty_border(cell_time, sample_hex, position="left")

        shift_last_row_num = row_num + shift_max_assignments[shift.id] - 1
        if shift_max_assignments[shift.id] > 1:
            ws.merge_cells(
                start_row=row_num,
                start_column=1,
                end_row=shift_last_row_num,
                end_column=1,
            )
            # Also merge the time column so it aligns with the shift name
            ws.merge_cells(
                start_row=row_num,
                start_column=time_col_idx,
                end_row=shift_last_row_num,
                end_column=time_col_idx,
            )

        # Apply bottom border and width for date columns
        for col_num in range(
            table_header_start_column, table_header_start_column + len(dates)
        ):
            cell = ws[f"{get_column_letter(col_num)}{shift_last_row_num}"]
            cell.border = border_bottom_grey
            ws.column_dimensions[get_column_letter(col_num)].width = 12

        # Ensure the time column also gets the bottom border on the last row
        time_bottom_cell: Cell = ws[f"{time_col_letter}{shift_last_row_num}"]
        time_bottom_cell.border = border_bottom_grey

        row_num += shift_max_assignments[shift.id]


# pylint: disable=too-many-arguments, too-many-locals
def build_worker_schedule_rows_in_worksheet(
    ws: Worksheet,
    workers: List[Worker],
    shifts: List[Shift],
    assignments: List[Assignment],
    dates: List[date],
    table_start_row: int,
    table_header_start_column: int,
    border_rigth_black_bottom_grey: Border,
    border_bottom_grey: Border,
) -> None:
    # Create dictionaries to map shift IDs to acronyms and colors
    shift_id_to_acronym = {s.id: getattr(s, "acronym", "") for s in shifts}
    shift_id_to_color = {s.id: getattr(s, "color", "") for s in shifts}
    # Map shift id to full Shift object for type checks
    shift_id_to_obj = {s.id: s for s in shifts}
    worker_ids_assignments = set(a.worker_id for a in assignments)
    workers_table = [w for w in workers if w.id in worker_ids_assignments]

    # Create dict to store maximum assignments per worker
    worker_max_assignments = {w.id: 0 for w in workers}

    row_num = table_start_row + 1
    # Populate the cells with worker names for each shift and date
    for worker in workers_table:
        for col_num, date_value in enumerate(
            dates, start=table_header_start_column
        ):
            worker_date_assignments = [
                assignment
                for assignment in assignments
                if assignment.worker_id == worker.id
                and assignment.date == date_value
            ]
            worker_max_assignments[worker.id] = max(
                worker_max_assignments[worker.id], len(worker_date_assignments)
            )
            row_num_date = row_num
            for assignment in worker_date_assignments:
                cell_shift_name: Cell = ws[
                    f"{get_column_letter(col_num)}{row_num_date}"
                ]
                cell_shift_name.data_type = "s"
                # Use shift acronym (not full name) in worker schedule cells
                acronym = shift_id_to_acronym.get(assignment.shift_id, "")
                cell_shift_name.value = acronym
                # Apply shift color/text using shared helper
                color = shift_id_to_color.get(assignment.shift_id, "")
                fill_hex, text_hex, sample_hex = _get_shift_color_values(color)
                _apply_fill_and_text(cell_shift_name, fill_hex, text_hex)
                # If this assignment's shift is DUTY, draw a thick bottom
                # border using the sample color (or fallback).
                shift_obj = shift_id_to_obj.get(assignment.shift_id)
                if shift_obj and shift_obj.shift_type == ShiftType.DUTY:
                    border_color = sample_hex or DEFAULT_SHIFT_COLOR.get(
                        "sample", ""
                    )
                    _apply_duty_border(
                        cell_shift_name, border_color, position="bottom"
                    )
                cell_shift_name.alignment = Alignment(
                    horizontal="center", vertical="center"
                )
                row_num_date += 1
        # Create row header for the shift name
        cell_worker_name: Cell = ws[f"A{row_num}"]
        cell_worker_name.data_type = "s"
        cell_worker_name.value = f"{worker.name} ({worker.acronym})"
        cell_worker_name.font = Font(bold=True)
        cell_worker_name.border = border_rigth_black_bottom_grey
        cell_worker_name.alignment = Alignment(
            vertical="center",
            wrap_text=True,
        )
        shift_last_row_num = row_num + worker_max_assignments[worker.id] - 1
        if worker_max_assignments[worker.id] > 1:
            ws.merge_cells(
                start_row=row_num,
                start_column=1,
                end_row=shift_last_row_num,
                end_column=1,
            )

        for col_num in range(
            table_header_start_column, table_header_start_column + len(dates)
        ):
            cell: Cell = ws[
                f"{get_column_letter(col_num)}{shift_last_row_num}"
            ]
            cell.border = border_bottom_grey
            ws.column_dimensions[get_column_letter(col_num)].width = 12

        row_num += worker_max_assignments[worker.id]
