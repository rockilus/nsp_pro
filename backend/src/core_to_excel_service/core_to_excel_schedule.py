from datetime import date
from typing import List

from core import Assignment, Shift, ShiftType, Worker
from openpyxl import Workbook
from openpyxl.drawing.image import Image
from openpyxl.styles import Alignment, Border, Font, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.worksheet import Worksheet


def core_to_excel_schedule(
    workers: List[Worker],
    shifts: List[Shift],
    assignments: List[Assignment],
    dates: List[date],
) -> None:
    # Create a new workbook and add a sheet named "schedule_shifts"
    wb = Workbook()
    ws: Worksheet = wb.active
    ws.title = "schedule_shifts"

    # Insert an image into the top left cell
    img = Image("./backend/src/core_to_excel_service/rockilus_logo_blue.jpg")
    img.width = 150
    img.height = 20
    ws.add_image(img, "A1")

    font_bold = Font(bold=True)
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

    table_start_row = 3
    table_header_start_column = 2
    # Create column headers for the dates
    for col_num, date_value in enumerate(
        dates, start=table_header_start_column
    ):
        col_letter = get_column_letter(col_num)
        cell_date = ws[f"{col_letter}{table_start_row}"]
        cell_date.value = date_value.strftime("%d/%m/%Y")
        cell_date.font = font_bold
        cell_date.border = border_bottom_black
        cell_date.alignment = Alignment(horizontal="center")

    # Create a dictionary to map shift IDs to shift names
    worker_id_to_name = {worker.id: worker.name for worker in workers}
    shift_work_not_deleted = [
        shift
        for shift in shifts
        if not shift.deleted
        and shift.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]
    ]

    # Create a dictionary to store the maximum number of assignments for each shift
    shift_max_assignments = {shift.id: 0 for shift in shifts}

    row_num = table_start_row + 1
    # Populate the cells with worker names for each shift and date
    for shift in shift_work_not_deleted:
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
        cell_shift_name.font = font_bold
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

    ws.column_dimensions["A"].width = 17

    # Freeze the first 3 rows and the first column
    ws.freeze_panes = "B4"

    # Hide gridlines
    ws.sheet_view.showGridLines = False

    # Save the workbook
    wb.save("schedule_with_image.xlsx")
    print("Workbook saved successfully")
