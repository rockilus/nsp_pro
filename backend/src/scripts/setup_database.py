from database import DB, UserDB, HospitalDB, ScheduleDB, ScheduleDataDB

database_uri = "mongodb://localhost:27017/nsp_pro"

db = DB(database_uri)
user_db = UserDB(db)
hospital_db = HospitalDB(db)
schedule_data_db = ScheduleDataDB(db)
schedule_db = ScheduleDB(db)
