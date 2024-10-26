from dataclasses import dataclass
from datetime import date
from enum import Enum
from typing import List


@dataclass
class Assignment:
    id: str
    worker_id: str
    date: date
    shift_id: str
    schedule_id: str
    status: str  # wip, valid, past
    fixed: bool


@dataclass
class Variable:
    worker_id: str
    date: date
    shift_id: str


class ObjectiveCategory(Enum):
    CONSTRAINT = 0
    REQUEST = 1
    DAILY_SHIFT_DEMAND = 2
    WORK_TIME_CONTRACT = 3
    WORK_TIME_DESIRED = 4
    DUTIES_PER_MONTH = 5


# pylint: disable=R0801
@dataclass
class Breach:
    id: str
    schedule_id: str
    objective_id: str | None
    objective_category: ObjectiveCategory
    variables: List[Variable]
    description: str
    hard_to_soft: bool | None


@dataclass
class QuickStaffing:
    worker_id: str
    shift_id: str
    target: int


@dataclass
class Schedule:
    id: str
    team_id: str
    start_date: date
    end_date: date
    solve_status: (str)  # Not solved, Solved, Hard breached, Soft breached, No solution
    status: str  # WIP, valid, past
    missing_coverage_dates: List[date]
    constraint_build_ids: List[str]
    quick_staffings: List[QuickStaffing]


# @dataclass
# class Worker:
#     id: str
#     name: str
#     max_weekly_hours: int
#     max_consecutive_shifts: int
#     min_consecutive_days_off: int
#     max_weekly_shifts: int
#     max_shifts_per_day: int
#     min_shifts_per_day: int
#     max_shift_length: int
#     min_shift_length: int
#     max_days_per_week: int
#     min_days_per_week: int
#     max_shifts_per_week: int
#     min_shifts_per_week: int
#     max_total_minutes_per_day: int
#     min_total_minutes_per_day: int
#     max_total_minutes_per_week: int
#     min_total_minutes_per_week: int
#     max_total_minutes_per_sunday: int
#     min_total_minutes_per_sunday: int
#     max_total_minutes_per_monday: int
#     min_total_minutes_per_monday: int
#     max_total_minutes_per_tuesday: int
#     min_total_minutes_per_tuesday: int
#     max_total_minutes_per_wednesday: int
#     min_total_minutes_per_wednesday: int
#     max_total_minutes_per_thursday: int
#     min_total_minutes_per_thursday: int
#     max_total_minutes_per_friday: int
#     min_total_minutes_per_friday: int
#     max_total_minutes_per_saturday: int
#     min_total_minutes_per_saturday: int
#     max_total_minutes_per_public_holiday: int
#     min_total_minutes_per_public_holiday: int
#     max_total_minutes_per_day_shift: int
#     min_total_minutes_per_day_shift: int
#     max_total_minutes_per_evening_shift: int
#     min_total_minutes_per_evening_shift: int
#     max_total_minutes_per_night_shift: int
#     min_total_minutes_per_night_shift: int
#     max_total_minutes_per_day_shift_on_weekend: int
#     min_total_minutes_per_day_shift_on_weekend: int
#     max_total_minutes_per_evening_shift_on_weekend: int
#     min_total_minutes_per_evening_shift_on_weekend: int
#     max_total_minutes_per_night_shift_on_weekend: int
#     min_total_minutes_per_night_shift_on_weekend: int
#     max_total_minutes_per_day_shift_on_public_holiday: int
#     min_total_minutes_per_day_shift_on_public_holiday: int
#     max_total_minutes_per_evening_shift_on_public_holiday: int
#     min_total_minutes_per_evening_shift_on_public_holiday: int
#     max_total_minutes_per_night_shift_on_public_holiday: int
#     min_total_minutes_per_night_shift_on_public_holiday: int
#     max_total_minutes_per_day_shift_on_weekday: int
#     min_total_minutes_per_day_shift_on_weekday: int
#     max_total_minutes_per_evening_shift_on_weekday: int
#     min_total_minutes_per_evening_shift_on_weekday: int
#     max_total_minutes_per_night_shift_on_weekday: int

# @dataclass
# class Shift:
#     id: str
#     name: str
#     start_time: int
#     end_time: int
#     minutes: int
#     shift_type: str
#     shift_category: str
#     shift_group: str
#     shift_group_order: int
#     shift_group_color: str
#     shift_group_text_color: str
#     shift_group_background_color: str
#     shift_group_border_color: str
#     shift_group_border_width: int
#     shift_group_border_radius: int
#     shift_group_padding: int
#     shift_group_margin: int
#     shift_group_font_size: int
#     shift_group_font_weight: str
#     shift_group_font_style: str
#     shift_group_text_decoration: str
#     shift_group_text_transform: str
#     shift_group_text_align: str
#     shift_group_vertical_align: str
#     shift_group_line_height: int
#     shift_group_letter_spacing: int
#     shift_group_word_spacing: int
#     shift_group_text_indent: int
#     shift_group_text_shadow: str
#     shift_group_box_shadow: str
#     shift_group_opacity: int
#     shift_group_background: str
#     shift_group_background_image: str
#     shift_group_background_repeat: str
#     shift_group_background_position: str
#     shift_group_background_size: str
#     shift_group_background_attachment: str
#     shift_group_background_origin: str
#     shift_group_background_clip: str
#     shift_group_background_blend_mode: str
#     shift_group_filter: str
#     shift_group_mix_blend_mode: str
#     shift_group_transition: str
