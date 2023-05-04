from database import DB, UserDB, HospitalDB

database_uri = "mongodb://localhost:27017/nsp_pro"

db = DB(database_uri)
user_db = UserDB(db)
hospital_db = HospitalDB(db)
