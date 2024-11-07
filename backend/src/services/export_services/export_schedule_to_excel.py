from datetime import timedelta

from openpyxl import Workbook

from core import ExportOptions, ExportPeriodOptions
from core_to_excel_service import core_to_excel_schedule
from scripts.setup_database import assignment_db, shift_db, worker_db


def export_schedule_to_excel(team_id: str, export_options: ExportOptions) -> Workbook:
    workers = worker_db.get_workers(team_id)
    shifts = shift_db.get_shifts(team_id)
    if export_options.period_option == ExportPeriodOptions.ALL:
        assignments = assignment_db.get_assignments(team_id)
        start_date = min(assignment.date for assignment in assignments)
        end_date = max(assignment.date for assignment in assignments)
        dates = [
            start_date + timedelta(days=i)
            for i in range((end_date - start_date).days + 1)
        ]
    else:
        assignments = assignment_db.get_assignments_by_dates(
            team_id, export_options.start_date, export_options.end_date
        )
        dates = [
            export_options.start_date + timedelta(days=i)
            for i in range(
                (export_options.end_date - export_options.start_date).days + 1
            )
        ]
    wb = core_to_excel_schedule(workers, shifts, assignments, dates)

    return wb
