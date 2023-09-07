from database import (
    DB,
    HospitalDB,
    ScheduleDataDB,
    ScheduleDB,
    UserDB,
    WorkerDB,
    WorkerParamDB,
    WorkerPropertyDB,
)

database_uri = "mongodb://localhost:27017/nsp_pro"

db = DB(database_uri)
user_db = UserDB(db)
hospital_db = HospitalDB(db)
schedule_data_db = ScheduleDataDB(db)
schedule_db = ScheduleDB(db)
worker_db = WorkerDB(db)
worker_param_db = WorkerParamDB(db)
worker_property_db = WorkerPropertyDB(db)
