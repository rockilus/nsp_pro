from datetime import datetime, timedelta
from typing import Dict, List, Optional

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from models import Schedule
from scripts.run_solver import run_solver
from scripts.setup_database import schedule_data_db, schedule_db

schedule_routes = Blueprint("schedule_routes", __name__)


# @schedule_routes.route("/get-schedule", methods=["POST"])
# @jwt_required()
# def get_schedule():
#     schedule_info = request.get_json()
#     hospital_id = schedule_info["hospital_id"]
#     start_date_iso = schedule_info["start_date"]
#     num_days = schedule_info["num_days"]
#     start_date = datetime.fromisoformat(start_date_iso)
#     end_date = start_date + timedelta(days=num_days)
#     schedule = schedule_db.get_schedules_by_hospital_id(hospital_id)[0]
#     # schedule_data_list = schedule_data_db.get_schedule_by_hospital_id(
#     #     hospital_id, start_date, end_date
#     # )
#     schedule_data_list = schedule_data_db.get_schedules_by_hospital_ids(
#         schedule["_id"], start_date, end_date
#     )
#     schedule_dict = schedule.to_dict()
#     schedule_data_dict_list = [
#         schedule_data.to_dict() for schedule_data in schedule_data_list
#     ]
#     response = jsonify(
#         {
#             "schedule": schedule_dict,
#             "schedule_data_list": schedule_data_dict_list,
#         }
#     )
#     return response, 201


@schedule_routes.route("/get-schedule-list", methods=["POST"])
@jwt_required()
def get_schedule():
    schedule_info = request.get_json()
    hospital_id = schedule_info["hospital_id"]
    start_date_iso = schedule_info["start_date"]
    end_date_iso = schedule_info["end_date"]
    start_date = datetime.fromisoformat(start_date_iso)
    end_date = datetime.fromisoformat(end_date_iso)
    schedule_list = schedule_db.get_schedules_by_hospital_id(
        hospital_id, start_date, end_date
    )
    schedule_list_ids = [str(schedule.pk) for schedule in schedule_list]
    schedule_data_list = schedule_data_db.get_schedule_data_by_schedule_ids(
        schedule_list_ids, start_date, end_date
    )
    schedule_list_dict = [schedule.to_dict() for schedule in schedule_list]
    schedule_data_dict_list = [
        schedule_data.to_dict() for schedule_data in schedule_data_list
    ]
    response = jsonify(
        {
            "schedule_list": schedule_list_dict,
            "schedule_data_list": schedule_data_dict_list,
        }
    )
    return response, 201


@schedule_routes.route("/build-schedule", methods=["POST"])
@jwt_required()
def build_schedule():
    schedule_info = request.get_json()
    hospital_id = schedule_info["hospital_id"]
    author_id = schedule_info["author_id"]
    start_date_iso = schedule_info["start_date"]
    end_date_iso = schedule_info["end_date"]
    start_date = datetime.fromisoformat(start_date_iso)
    end_date = datetime.fromisoformat(end_date_iso)
    solution = run_solver(hospital_id, author_id, start_date, end_date)
    schedule = solution.build_schedule()
    schedule_saved = schedule_db.save_schedule(schedule)
    schedule_data_list = solution.build_schedule_data_list(schedule_saved)
    schedule_data_db.save_schedule_data_list(schedule_data_list)
    response = jsonify({"msg": "scheduel built successfully"})
    return response, 201


@schedule_routes.route("/build-main-schedule", methods=["POST"])
@jwt_required()
def build_main_schedule():
    schedule_info = request.get_json()
    hospital_id = schedule_info["hospital_id"]
    start_date_iso = schedule_info["start_date"]
    end_date_iso = schedule_info["end_date"]
    start_date = datetime.fromisoformat(start_date_iso)
    end_date = datetime.fromisoformat(end_date_iso)
    schedule_data_dict_list = build_and_save_main_schedule(
        hospital_id, start_date, end_date
    )
    response = jsonify(
        {
            "schedule_data_list": schedule_data_dict_list,
        }
    )
    return response, 201


def build_and_save_main_schedule(
    hospital_id: str, start_date: datetime, end_date: datetime
) -> List[Dict]:
    schedule_list = schedule_db.get_schedules_by_hospital_id(
        hospital_id, start_date, end_date
    )
    schedule_selection = build_schedule_selection(
        schedule_list, start_date, end_date
    )
    schedule_data_db.set_schedule_main_to_false_by_hospital_id(
        hospital_id, start_date, end_date
    )
    for schedule_id, dates in schedule_selection.items():
        schedule_data_db.set_schedule_main_to_train_by_schedule_id(
            schedule_id, dates
        )
    schedule_data_list = (
        schedule_data_db.get_main_schedule_data_by_hospital_id(
            hospital_id, start_date, end_date
        )
    )
    schedule_data_dict_list = [
        schedule_data.to_dict() for schedule_data in schedule_data_list
    ]
    return schedule_data_dict_list


def select_latest_schedule_for_day(
    schedule_list: List[Schedule], day: datetime
) -> Optional[Schedule]:
    selected_schedule = None
    for schedule in schedule_list:
        if schedule.start_date <= day <= schedule.end_date:
            if (
                not selected_schedule
                or schedule.build_date > selected_schedule.build_date
            ):
                selected_schedule = schedule
    return selected_schedule


def build_schedule_selection(
    schedule_list: List[Schedule], start_date: datetime, end_date: datetime
) -> Dict[str, List[datetime]]:
    schedule_selection: Dict[str, List[datetime]] = {}
    for day in (
        start_date + timedelta(n)
        for n in range((end_date - start_date).days + 1)
    ):
        selected_schedule = select_latest_schedule_for_day(schedule_list, day)
        if selected_schedule:
            selected_schedule_id = str(selected_schedule.pk)
            if selected_schedule_id in schedule_selection:
                schedule_selection[selected_schedule_id].append(day)
            else:
                schedule_selection[selected_schedule_id] = [day]
    return schedule_selection
