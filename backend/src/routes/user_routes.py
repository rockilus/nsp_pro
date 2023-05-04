from flask import Blueprint, jsonify, request
from mongoengine import NotUniqueError
from scripts.setup_database import user_db

user_routes = Blueprint("user_routes", __name__)


# @user_routes.route("/create_user")
# def get_all_users():
# users = get_users()
# users_data = [
#     {"id": str(user["_id"]), "name": user["name"]} for user in users
# ]
# users_data = [{"name": "test"}]
# return jsonify(users_data)


# @user_routes.route("/users/<string:user_id>")
# def get_user(user_id):
#     user = get_user_by_id(user_id)
#     if user:
#         return jsonify({"id": str(user["_id"]), "name": user["name"]})
#     else:
#         return jsonify({"message": "User not found"}), 404


@user_routes.route("/users", methods=["POST"])
def create_new_user():
    user_info = request.get_json()
    try:
        user_saved = user_db.create_user(**user_info)
        print(user_saved["hospital"])
        user_dict = user_saved.to_dict()
        return jsonify(user_dict), 201
    except NotUniqueError as e:
        print(e)
        return jsonify({"error": f"{str(e)}"}), 404


@user_routes.route("/signup", methods=["POST"])
def signup():
    user_info = request.get_json()
    print(user_info)
    return jsonify({"message": "received"}), 201
    # try:
    #     user_saved = user_db.create_user(**user_info)
    #     print(user_saved["hospital"])
    #     user_dict = user_saved.to_dict()
    #     return jsonify(user_dict), 201
    # except NotUniqueError as e:
    #     print(e)
    #     return jsonify({"error": f"{str(e)}"}), 404
