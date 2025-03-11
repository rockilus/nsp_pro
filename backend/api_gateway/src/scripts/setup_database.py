from shared.database import setup_database
from shared.database_pymongo.database import MongoDB
from shared.database_pymongo.repositories.assignment import AssignmentRepository
from shared.database_pymongo.repositories.schedule import ScheduleRepository
from shared.database_pymongo.repositories.shift import ShiftRepository
from shared.database_pymongo.repositories.worker import WorkerRepository

from utils.env_config import DB_URI

# Set up the database and initialize collections
collections = setup_database(DB_URI)
MongoDB.connect(DB_URI, "test")
assignment_db = AssignmentRepository()
schedule_db = ScheduleRepository()
shift_db = ShiftRepository()
worker_db = WorkerRepository()


# Access the collections as needed
db = collections.db
# assignment_db = collections.assignment_db
attribute_db = collections.attribute_db
breach_db = collections.breach_db
config_db = collections.config_db
constraint_build_db = collections.constraint_build_db
coverage_db = collections.coverage_db
coverage_selector_db = collections.coverage_selector_db
daily_shift_demand_db = collections.daily_shift_demand_db
dimension_db = collections.dimension_db
dim_entry_db = collections.dim_entry_db
link_shift_db = collections.link_shift_db
request_db = collections.request_db
# schedule_db = collections.schedule_db
# shift_db = collections.shift_db
shift_demand_db = collections.shift_demand_db
specialty_db = collections.specialty_db
stats_header_db = collections.stats_header_db
team_db = collections.team_db
user_db = collections.user_db
# worker_db = collections.worker_db
