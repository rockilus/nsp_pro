from shared.database import (
    DB,
    AssignmentDB,
    AttributeDB,
    BreachDB,
    ConfigDB,
    ConstraintBuildDB,
    CoverageDB,
    CoverageSelectorDB,
    DailyShiftDemandDB,
    DimensionDB,
    DimEntryDB,
    RequestDB,
    ScheduleDB,
    ShiftDB,
    ShiftDemandDB,
    SpecialtyDB,
    StatsHeaderDB,
    TeamDB,
    UserDB,
    WorkerDB,
)
from shared.database.errors import DBConnectionError
from shared.logger import log_critical, log_info
from shared.schemas import Config
from utils.env_config import DB_URI


def ensure_config_exists():
    if config_db.get_config() is None:
        config_db.create_config(
            Config(
                id="",
                signup_emails_whitelist_enabled=True,
                signup_emails_whitelist=[],
                signup_emails_attempt=[],
            )
        )
        log_info("Config document not found. Created a new one.")


db = DB(DB_URI)
try:
    db.connect()
except DBConnectionError as e:
    log_critical("Failed to connect to database" + str(e))
    raise e


assignment_db = AssignmentDB(db)
attribute_db = AttributeDB(db)
breach_db = BreachDB(db)
config_db = ConfigDB(db)
constraint_build_db = ConstraintBuildDB(db)
coverage_db = CoverageDB(db)
coverage_selector_db = CoverageSelectorDB(db)
daily_shift_demand_db = DailyShiftDemandDB(db)
dimension_db = DimensionDB(db)
dim_entry_db = DimEntryDB(db)
request_db = RequestDB(db)
schedule_db = ScheduleDB(db)
shift_db = ShiftDB(db)
shift_demand_db = ShiftDemandDB(db)
specialty_db = SpecialtyDB(db)
stats_header_db = StatsHeaderDB(db)
team_db = TeamDB(db)
user_db = UserDB(db)
worker_db = WorkerDB(db)


ensure_config_exists()
