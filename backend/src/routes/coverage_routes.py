from flask import Blueprint, jsonify, request
from core.coverage import Coverage, ShiftDemand
from scripts.setup_database import coverage_db

coverage_routes = Blueprint("coverage_routes", __name__)


@coverage_routes.route("/coverages", methods=["GET"])
def get_coverages():
    coverages = coverage_db.get_coverages()
    return jsonify(coverages), 200


@coverage_routes.route("/coverages", methods=["POST"])
def create_coverage():
    new_coverage = request.json
    cov = coverage_db.create_coverage(
        name=new_coverage["name"],
        dateStart=new_coverage["dateStart"],
        dateEnd=new_coverage["dateEnd"],
        shiftDemands=new_coverage["shiftDemands"],
    )
    return jsonify(cov), 201


@coverage_routes.route("/coverages/<coverage_id>", methods=["PUT"])
def update_coverage(coverage_id):
    existing_cov = coverage_db.get_coverage_by_id(coverage_id)
    if not existing_cov:
        return {"message": "Coverage does not exist"}, 404
    # Hack for mapping request dict to proper core types
    shift_demands = [ShiftDemand(**sd) for sd in request.json["shiftDemands"]]
    request.json["shiftDemands"] = shift_demands
    updated_coverage = Coverage(**request.json)
    cov = coverage_db.update_coverage(updated_coverage)
    return jsonify(cov), 200


@coverage_routes.route("/coverages/<coverage_id>", methods=["DELETE"])
def delete_coverage(coverage_id):
    coverage_db.delete_coverage(coverage_id)
    return jsonify({"message": "Coverage deleted successfully"}), 200
