from datetime import date
from typing import List

from openpyxl import Workbook
from openpyxl.drawing.image import Image
from openpyxl.styles import Alignment, Border, Font, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.worksheet import Worksheet
from openpyxl.cell.cell import Cell
from shared.schemas.core import Assignment, Shift, ShiftType, Worker
from pathlib import Path
import logging


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
    build_dates_header_row_in_worksheet(
        ws,
        dates,
        table_header_start_column,
        table_start_row,
        border_bottom_black,
    )
    build_shift_schedule_rows_in_worksheet(
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
    # Create a dictionary to map shift IDs to shift names
    worker_id_to_name = {w.id: w.name for w in workers}
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
                cell_worker_name = ws[
                    f"{get_column_letter(col_num)}{row_num_date}"
                ]
                cell_worker_name.value = worker_id_to_name.get(
                    assignment.worker_id, ""
                )
                cell_worker_name.alignment = Alignment(
                    horizontal="center", vertical="center"
                )
                row_num_date += 1
        # Create row header for the shift name
        cell_shift_name = ws[f"A{row_num}"]
        cell_shift_name.value = shift.name
        cell_shift_name.font = Font(bold=True)
        cell_shift_name.border = border_rigth_black_bottom_grey
        cell_shift_name.alignment = Alignment(vertical="center")
        shift_last_row_num = row_num + shift_max_assignments[shift.id] - 1
        if shift_max_assignments[shift.id] > 1:
            ws.merge_cells(
                start_row=row_num,
                start_column=1,
                end_row=shift_last_row_num,
                end_column=1,
            )

        for col_num in range(
            table_header_start_column, table_header_start_column + len(dates)
        ):
            cell = ws[f"{get_column_letter(col_num)}{shift_last_row_num}"]
            cell.border = border_bottom_grey
            ws.column_dimensions[get_column_letter(col_num)].width = 12

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
    # Create a dictionary to map shift IDs to shift names
    shift_id_to_name = {s.id: s.name for s in shifts}
    worker_ids_assignments = set(a.worker_id for a in assignments)
    workers_table = [w for w in workers if w.id in worker_ids_assignments]

    # Create a dictionary to store the maximum number of assignments for each shift
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
                cell_shift_name.value = shift_id_to_name.get(
                    assignment.shift_id, ""
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
        cell_worker_name.alignment = Alignment(vertical="center")
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
