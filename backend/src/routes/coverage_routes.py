from flask import Blueprint, jsonify, request

coverage_routes = Blueprint("coverage_routes", __name__)

"""
shifts
[
    {
        "id": "65115b1d0a76afd775b91c63",
        "name": "morning"
    },
    {
        "id": "65143d3e50ca08a4fa65fdf9",
        "name": "afternoon"
    },
    {
        "id": "65143d4450ca08a4fa65fdfb",
        "name": "night"
    }
]
"""

# Dummy database
coverages_db = [
    {
        "id": "cov-1",
        "name": "Normal Coverage",
        "dateStart": "2023-09-27",
        "dateEnd": "2023-12-31",
        "shiftDemands": [
            {
                "dayIndex": 0,
                "shiftId": "65115b1d0a76afd775b91c63",
                "quantity": 2,
            },
            {
                "dayIndex": 1,
                "shiftId": "65115b1d0a76afd775b91c63",
                "quantity": 1,
            },
        ],
    }
]


@coverage_routes.route("/coverages", methods=["GET"])
def get_coverages():
    return jsonify(coverages_db), 200


@coverage_routes.route("/coverages", methods=["POST"])
def create_coverage():
    new_coverage = request.json
    coverages_db.append(new_coverage)
    return jsonify(new_coverage), 201


@coverage_routes.route("/coverages/<coverage_id>", methods=["PUT"])
def update_coverage(coverage_id):
    updated_coverage = request.json
    for index, coverage in enumerate(coverages_db):
        if coverage["id"] == coverage_id:
            coverages_db[index] = updated_coverage
            return jsonify(updated_coverage), 200
    return jsonify({"message": "Coverage not found"}), 404


@coverage_routes.route("/coverages/<coverage_id>", methods=["DELETE"])
def delete_coverage(coverage_id):
    # pylint: disable=W0603
    global coverages_db
    coverages_db = [
        coverage for coverage in coverages_db if coverage["id"] != coverage_id
    ]
    return jsonify({"message": "Coverage deleted successfully"}), 200
