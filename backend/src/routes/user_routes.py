from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    get_jwt,
    get_jwt_identity,
    # jwt_required,
    set_access_cookies,
    unset_jwt_cookies,
)
from mongoengine import DoesNotExist, NotUniqueError
from scripts.setup_database import user_db

user_routes = Blueprint("user_routes", __name__)


@user_routes.route("/signup", methods=["POST"])
def signup():
    user_info = request.get_json()
    print(user_info)
    if any(not value for value in user_info.values()):
        return jsonify({"message": "All entries are required"}), 400
    try:
        user_saved = user_db.create_user(**user_info)
        user_dict = user_saved.to_dict()
        response = jsonify({"user": user_dict})
        # pylint: disable=protected-access
        access_token = create_access_token(identity=str(user_saved._id))
        set_access_cookies(response, access_token)
        return response, 200
    except NotUniqueError as e:
        print(e)
        return jsonify({"error": f"{str(e)}"}), 404


@user_routes.route("/signin", methods=["POST"])
def signin():
    user_info = request.get_json()
    try:
        user = user_db.get_user_by_email(user_info["email"])
    except DoesNotExist:
        return jsonify({"message": "Invalid username or password"}), 401

    if not user.check_password(user_info["password"]):
        return jsonify({"message": "Invalid username or password"}), 401

    user_dict = user.to_dict()
    response = jsonify({"user": user_dict})
    # pylint: disable=protected-access
    access_token = create_access_token(identity=str(user._id))
    set_access_cookies(response, access_token)
    return response, 200


@user_routes.route("/logout", methods=["POST"])
def logout_with_cookies():
    response = jsonify({"msg": "logout successful"})
    unset_jwt_cookies(response)
    return response


# this might need to be on app instead of user_routes
@user_routes.after_request
def refresh_expiring_jwts(response):
    try:
        exp_timestamp = get_jwt()["exp"]
        now = datetime.now(timezone.utc)
        target_timestamp = datetime.timestamp(now + timedelta(minutes=30))
        if target_timestamp > exp_timestamp:
            access_token = create_access_token(identity=get_jwt_identity())
            set_access_cookies(response, access_token)
        return response
    except (RuntimeError, KeyError):
        return response


# @user_routes.route("/user-details", methods=["GET"])
# @jwt_required()
# def protected():
#     user_id = get_jwt_identity()
#     print("user_id:", user_id)
#     try:
#         user = user_db.get_user_by_id(user_id)
#         user_details = {
#             "first_name": user.first_name,
#             "last_name": user.last_name,
#             "email": user.email,
#             "hospital": user.hospital,
#         }
#         response = jsonify(user_details)
#         return response, 200
#     except DoesNotExist:
#         print("user does not exist")
#         response = jsonify({"message": "User does not exist"})
#         return response, 404
