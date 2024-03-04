from database import (
    DB,
    AssignmentDB,
    ConstraintBuildDB,
    ConstraintDB,
    CoverageDB,
    CoverageSelectorDB,
    FixedAssignmentDB,
    ObjectiveBreachDB,
    RequestDB,
    ScheduleDB,
    ShiftDB,
    ShiftDemandDB,
    ShiftDimensionDB,
    ShiftPropertyDB,
    StatsOptionsDB,
    TeamDB,
    UserDB,
    WorkerDB,
    WorkerDimensionDB,
    WorkerPropertyDB,
)
from utils.env_config import DB_NAME, DB_URI

database_uri = DB_URI + "/" + DB_NAME

db = DB(database_uri)
assignment_db = AssignmentDB(db)
constraint_build_db = ConstraintBuildDB(db)
constraint_db = ConstraintDB(db)
coverage_db = CoverageDB(db)
coverage_selector_db = CoverageSelectorDB(db)
fixed_assignment_db = FixedAssignmentDB(db)
objective_breach_db = ObjectiveBreachDB(db)
request_db = RequestDB(db)
schedule_db = ScheduleDB(db)
shift_db = ShiftDB(db)
shift_demand_db = ShiftDemandDB(db)
shift_dimension_db = ShiftDimensionDB(db)
shift_property_db = ShiftPropertyDB(db)
stats_options_db = StatsOptionsDB(db)
team_db = TeamDB(db)
user_db = UserDB(db)
worker_db = WorkerDB(db)
worker_dimension_db = WorkerDimensionDB(db)
worker_property_db = WorkerPropertyDB(db)
