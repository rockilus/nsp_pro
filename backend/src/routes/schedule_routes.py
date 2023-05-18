from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from scripts.run_solver import run_solver
from scripts.setup_database import schedule_data_db, schedule_db

schedule_routes = Blueprint("schedule_routes", __name__)


@schedule_routes.route("/get-schedule", methods=["POST"])
@jwt_required()
def get_schedule():
    hospital_info = request.get_json()
    hospital_id = hospital_info["hospital_id"]
    start_date_iso = hospital_info["start_date"]
    num_days = hospital_info["num_days"]
    start_date = datetime.fromisoformat(start_date_iso)
    end_date = start_date + timedelta(days=num_days)
    schedule = schedule_db.get_schedule_by_hospital_id(hospital_id)[0]
    # schedule_data_list = schedule_data_db.get_schedule_by_hospital_id(
    #     hospital_id, start_date, end_date
    # )
    schedule_data_list = schedule_data_db.get_schedule_by_schedule_id(
        schedule["_id"], start_date, end_date
    )
    schedule_dict = schedule.to_dict()
    schedule_data_dict_list = [
        schedule_data.to_dict() for schedule_data in schedule_data_list
    ]
    response = jsonify(
        {
            "schedule": schedule_dict,
            "schedule_data_list": schedule_data_dict_list,
        }
    )
    return response, 201


@schedule_routes.route("/build-schedule", methods=["POST"])
@jwt_required()
def build_schedule():
    hospital_info = request.get_json()
    hospital_id = hospital_info["hospital_id"]
    start_date_iso = hospital_info["start_date"]
    end_date_iso = hospital_info["end_date"]
    start_date = datetime.fromisoformat(start_date_iso)
    end_date = datetime.fromisoformat(end_date_iso)
    solution = run_solver(hospital_id, start_date, end_date)
    schedule = solution.build_schedule()
    schedule_saved = schedule_db.save_schedule(schedule)
    schedule_data_list = solution.build_schedule_data_list(schedule_saved)
    schedule_data_db.save_schedule_data_list(schedule_data_list)
    response = jsonify({"msg": "scheduel built successfully"})
    return response, 201
