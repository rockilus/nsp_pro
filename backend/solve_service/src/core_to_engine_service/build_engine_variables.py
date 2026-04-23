from datetime import date, timedelta

from shared.schemas.core import (
    Shift,
    ShiftRestType,
    ShiftType,
    Worker,
    WorkerDates,
)

from engine import Variables as VariablesEngine
from utils.constants import Constants


def build_no_overlap_shift_intervals(
    worker_ids_to_worker_dates: dict[str, WorkerDates],
    shift_not_deleted_ids: list[str],
    worker_not_deleted_ids: list[str],
) -> list[list[tuple[str, str, str]]]:
    return [
        [
            (w_id, d.isoformat(), s_id)
            for d in worker_ids_to_worker_dates[w_id].dates_campaign
            for s_id in shift_not_deleted_ids
        ]
        for w_id in worker_not_deleted_ids
    ]


# pylint: disable=too-many-locals
def build_engine_variables(
    workers: list[Worker],
    worker_ids_to_worker_dates: dict[str, WorkerDates],
    shifts: list[Shift],
    shifts_not_deleted: list[Shift],
    shift_id_to_duration_dict: dict[str, int],
) -> VariablesEngine:
    assignment_vars: list[tuple[str, str, str]] = []
    shift_interval_vars: list[tuple[int, int, int, tuple[str, str, str]]] = []
    for w in workers:
        for d in worker_ids_to_worker_dates[w.id].dates_hist:
            for s in shifts:
                assignment_vars.append((w.id, d.isoformat(), s.id))

        for d in worker_ids_to_worker_dates[w.id].dates_campaign:
            for s in shifts_not_deleted:
                assignment_vars.append((w.id, d.isoformat(), s.id))
                shift_interval_vars.append(
                    build_shift_interval_var(
                        worker=w,
                        current_date=d,
                        shift=s,
                        shifts=shifts_not_deleted,
                        shift_id_to_duration_dict=shift_id_to_duration_dict,
                    )
                )
                # day_diff_start = 0
                # if s.rest_type == ShiftRestType.RECUPERATION:
                #     s_duty = next(
                #         (
                #             shift
                #             for shift in shifts_not_deleted
                #             if shift.shift_type == ShiftType.DUTY
                #             and shift.id == s.recuperation_duty_id
                #         ),
                #         None,
                #     )
                #     if s_duty is None:
                #         raise ValueError(
                #             f"Shift {s.id} is a recuperation shift but the duty "
                #             + f"shift {s.recuperation_duty_id} is not found."
                #         )
                #     day_diff_start = (
                #         s_duty.end_time.date() - s_duty.start_time.date()
                #     ).days
                # s_duration = shift_id_to_duration_dict[s.id]
                # s_start_time = int(
                #     (
                #         s.start_time.replace(year=d.year, month=d.month, day=d.day)
                #         + timedelta(days=day_diff_start)
                #     ).timestamp()
                #     // Constants.NUM_SECONDS_MINUTE
                # )
                # day_diff_end = (
                #     s.end_time.date() - s.start_time.date()
                # ).days + day_diff_start
                # s_end_time = int(
                #     (
                #         s.end_time.replace(year=d.year, month=d.month, day=d.day)
                #         + timedelta(days=day_diff_end)
                #     ).timestamp()
                #     // Constants.NUM_SECONDS_MINUTE
                #     - 1
                # )
                # shift_interval_vars.append(
                #     (
                #         s_start_time,
                #         s_duration,
                #         s_end_time,
                #         (w.id, d.isoformat(), s.id),
                #     )
                # )
    return VariablesEngine(
        assignments=assignment_vars,
        shift_intervals=shift_interval_vars,
    )


def build_shift_interval_var(
    worker: Worker,
    current_date: date,
    shift: Shift,
    shifts: list[Shift],
    shift_id_to_duration_dict: dict[str, int],
) -> tuple[int, int, int, tuple[str, str, str]]:
    day_diff_start = 0
    if shift.rest_type == ShiftRestType.RECUPERATION:
        s_duty = next(
            (
                s
                for s in shifts
                if s.shift_type == ShiftType.DUTY and s.id == shift.recuperation_duty_id
            ),
            None,
        )
        if s_duty is None:
            raise ValueError(
                f"Shift {shift.id} is a recuperation shift but the duty "
                + f"shift {shift.recuperation_duty_id} is not found."
            )
        day_diff_start = (s_duty.end_time.date() - s_duty.start_time.date()).days
    s_duration = shift_id_to_duration_dict[shift.id]
    s_start_time = int(
        (
            shift.start_time.replace(
                year=current_date.year,
                month=current_date.month,
                day=current_date.day,
            )
            + timedelta(days=day_diff_start)
        ).timestamp()
        // Constants.NUM_SECONDS_MINUTE
    )
    day_diff_end = (
        shift.end_time.date() - shift.start_time.date()
    ).days + day_diff_start
    s_end_time = int(
        (
            shift.end_time.replace(
                year=current_date.year,
                month=current_date.month,
                day=current_date.day,
            )
            + timedelta(days=day_diff_end)
        ).timestamp()
        // Constants.NUM_SECONDS_MINUTE
        - 1
    )
    return (
        s_start_time,
        s_duration,
        s_end_time,
        (worker.id, current_date.isoformat(), shift.id),
    )
