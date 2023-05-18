from datetime import datetime

from scripts.setup_database import hospital_db, user_db
from solver import BuildModel, ModelData, Solution, Solver


def run_solver(
    hospital_id: str, start_date: datetime, end_date: datetime
) -> Solution:
    num_days = (end_date - start_date).days + 1
    hospital = hospital_db.get_hospital_by_id(hospital_id)
    users = user_db.get_user_for_hospital_id(hospital_id)
    model_data = ModelData(hospital, users, num_days)
    build_model = BuildModel(model_data)
    model = build_model()
    solver = Solver().solve(model)
    solution = Solution(model_data, solver, start_date)
    return solution
