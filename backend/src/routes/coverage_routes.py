from dataclasses import asdict
import humps

from flask import Blueprint, jsonify, request
from core.coverage import Coverage, ShiftDemand
from scripts.setup_database import coverage_db

coverage_routes = Blueprint("coverage_routes", __name__)


@coverage_routes.route("/coverages", methods=["GET"])
def get_coverages():
    coverages = coverage_db.get_coverages()
    out = [coverage_to_dict(c) for c in coverages]
    return jsonify(out), 200


@coverage_routes.route("/coverages", methods=["POST"])
def create_coverage():
    new_coverage = request.json
    cov = coverage_db.create_coverage(
        name=new_coverage["name"],
        date_start=new_coverage["dateStart"],
        date_end=new_coverage["dateEnd"],
        shift_demands=new_coverage["shiftDemands"],
    )
    return jsonify(coverage_to_dict(cov)), 201


@coverage_routes.route("/coverages/<coverage_id>", methods=["PUT"])
def update_coverage(coverage_id):
    existing_cov = coverage_db.get_coverage_by_id(coverage_id)
    if not existing_cov:
        return {"message": "Coverage does not exist"}, 404
    updated_coverage = dict_to_coverage(request.json)
    cov = coverage_db.update_coverage(updated_coverage)
    return jsonify(coverage_to_dict(cov)), 200


@coverage_routes.route("/coverages/<coverage_id>", methods=["DELETE"])
def delete_coverage(coverage_id):
    coverage_db.delete_coverage(coverage_id)
    return jsonify({"message": "Coverage deleted successfully"}), 200


def coverage_to_dict(coverage: Coverage) -> dict:
    data = asdict(coverage)
    return humps.camelize(data)


def dict_to_coverage(data: dict) -> Coverage:
    data_snake = humps.decamelize(data)
    data_snake["shift_demands"] = [
        ShiftDemand(**humps.decamelize(d)) for d in data_snake["shift_demands"]
    ]
    return Coverage(**data_snake)
