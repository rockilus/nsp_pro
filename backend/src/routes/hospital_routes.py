from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from mongoengine import DoesNotExist, NotUniqueError, ValidationError
from scripts.setup_database import hospital_db, user_db

hospital_routes = Blueprint("hospital_routes", __name__)


@hospital_routes.route("/create-hospital", methods=["POST"])
@jwt_required()
def create_new_hospital():
    hospital_info = request.get_json()
    print("hospital_info:", hospital_info)
    try:
        admin = user_db.get_user_by_id(hospital_info["user_id"])
    except DoesNotExist as e:
        print(e)
        return jsonify({"error": f"{str(e)}"}), 404
    except ValidationError as e:
        return jsonify({"error": f"{str(e)}"}), 404
    try:
        hospital_saved = hospital_db.create_hospital(
            hospital_info["hospital_name"], admin
        )
        user_db.add_hospital_to_user(admin, hospital_saved)
        hospital_dict = hospital_saved.to_dict()
        response = jsonify({"hospital": hospital_dict})
        return response, 201
    except NotUniqueError as e:
        print(e)
        return jsonify({"error": f"{str(e)}"}), 404


@hospital_routes.route("/option-hospital", methods=["POST", "DELETE"])
@jwt_required()
def add_option_to_profile():
    option_info = request.get_json()
    print("option_info:", option_info)
    try:
        hospital = hospital_db.get_hospital_by_id(option_info["hospital_id"])
    except DoesNotExist as e:
        print(e)
        return jsonify({"error": f"{str(e)}"}), 404
    except ValidationError as e:
        return jsonify({"error": f"{str(e)}"}), 404
    try:
        if request.method == "POST":
            option = option_info["option"].lower().replace(" ", "_")
            hospital_saved = hospital_db.add_profile_option(
                option_info["dict_path"], option, hospital
            )
        elif request.method == "DELETE":
            hospital_saved = hospital_db.delete_profile_option(
                option_info["dict_path"], hospital
            )
        hospital_dict = hospital_saved.to_dict()
        response = jsonify({"hospital": hospital_dict})
        return response, 201
    except NotUniqueError as e:
        print(e)
        return jsonify({"error": f"{str(e)}"}), 404


@hospital_routes.route("/hospital-info", methods=["POST"])
@jwt_required()
def get_hospital():
    hospital_info = request.get_json()
    print("hospital_info:", hospital_info)
    try:
        hospital = hospital_db.get_hospital_by_id(hospital_info["hospital_id"])
    except DoesNotExist as e:
        print(e)
        return jsonify({"error": f"{str(e)}"}), 404
    except ValidationError as e:
        return jsonify({"error": f"{str(e)}"}), 404
    try:
        hospital_dict = hospital.to_dict()
        response = jsonify({"hospital": hospital_dict})
        return response, 201
    except NotUniqueError as e:
        print(e)
        return jsonify({"error": f"{str(e)}"}), 404
