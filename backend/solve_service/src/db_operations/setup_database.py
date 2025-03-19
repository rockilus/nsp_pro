# from shared.database import DatabaseCollections, setup_database
from shared.database_pymongo.database_collections import DatabaseCollections

from config import config


def get_collections() -> DatabaseCollections:
    # return setup_database(config.db_uri)
    return DatabaseCollections(config.db_uri, "test")


# # Set up the database and initialize collections
# collections = setup_database(config.db_uri)

# # Access the collections as needed
# db = collections.db
# assignment_db = collections.assignment_db
# attribute_db = collections.attribute_db
# breach_db = collections.breach_db
# config_db = collections.config_db
# constraint_build_db = collections.constraint_build_db
# coverage_db = collections.coverage_db
# coverage_selector_db = collections.coverage_selector_db
# daily_shift_demand_db = collections.daily_shift_demand_db
# dimension_db = collections.dimension_db
# dim_entry_db = collections.dim_entry_db
# request_db = collections.request_db
# schedule_db = collections.schedule_db
# shift_db = collections.shift_db
# shift_demand_db = collections.shift_demand_db
# specialty_db = collections.specialty_db
# stats_header_db = collections.stats_header_db
# team_db = collections.team_db
# user_db = collections.user_db
# worker_db = collections.worker_db
