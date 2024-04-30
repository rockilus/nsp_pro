from database import (
    DB,
    AssignmentDB,
    ConstraintBuildDB,
    ConstraintDB,
    CoverageDB,
    CoverageSelectorDB,
    ObjectiveBreachDB,
    RequestDB,
    ScheduleDB,
    ShiftDB,
    ShiftDemandDB,
    ShiftDimensionDB,
    ShiftPropertyDB,
    StatsHeaderDB,
    StatsOptionsDB,
    TeamDB,
    UserDB,
    WorkerDB,
    WorkerDimensionDB,
    WorkerPropertyDB,
)
from errors import DBConnectionError
from logger import log_critical
from utils.env_config import DB_URI

db = DB(DB_URI)
try:
    db.connect()
except DBConnectionError as e:
    log_critical("Failed to connect to database" + str(e))
    raise e


assignment_db = AssignmentDB(db)
constraint_build_db = ConstraintBuildDB(db)
constraint_db = ConstraintDB(db)
coverage_db = CoverageDB(db)
coverage_selector_db = CoverageSelectorDB(db)
objective_breach_db = ObjectiveBreachDB(db)
request_db = RequestDB(db)
schedule_db = ScheduleDB(db)
shift_db = ShiftDB(db)
shift_demand_db = ShiftDemandDB(db)
shift_dimension_db = ShiftDimensionDB(db)
shift_property_db = ShiftPropertyDB(db)
stats_header_db = StatsHeaderDB(db)
stats_options_db = StatsOptionsDB(db)
team_db = TeamDB(db)
user_db = UserDB(db)
worker_db = WorkerDB(db)
worker_dimension_db = WorkerDimensionDB(db)
worker_property_db = WorkerPropertyDB(db)
