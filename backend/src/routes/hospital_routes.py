from flask import Blueprint, jsonify, request
from mongoengine import NotUniqueError, ValidationError, DoesNotExist
from scripts.setup_database import hospital_db, user_db

hospital_routes = Blueprint("hospital_routes", __name__)


@hospital_routes.route("/hospitals", methods=["POST"])
def create_new_hospital():
    hospital_info = request.get_json()
    try:
        admin = user_db.get_user_by_id(hospital_info["user_id"])
    except DoesNotExist as e:
        print(e)
        return jsonify({"error": f"{str(e)}"}), 404
    except ValidationError as e:
        return jsonify({"error": f"{str(e)}"}), 404
    try:
        hospital_saved = hospital_db.create_hospital(
            hospital_info["name"], admin
        )
        user_db.add_hospital_to_user(admin, hospital_saved)
        hospital_dict = hospital_saved.to_dict()
        return jsonify(hospital_dict), 201
    except NotUniqueError as e:
        print(e)
        return jsonify({"error": f"{str(e)}"}), 404
