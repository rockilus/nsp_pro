from scripts.setup_database import daily_shift_demand_db, shift_demand_db


def delete_shift_demand(shift_demand_id: str) -> None:
    daily_shift_demand_db.delete_daily_shift_demands_by_shift_demand_id(shift_demand_id)
    shift_demand_db.delete_shift_demand(shift_demand_id)
