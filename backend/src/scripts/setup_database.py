from database import (
    DB,
    ShiftDB,
    ShiftParamDB,
    ShiftPropertyDB,
    WorkerDB,
    WorkerParamDB,
    WorkerPropertyDB,
)

database_uri = "mongodb://localhost:27017/nsp_pro"

db = DB(database_uri)
shift_db = ShiftDB(db)
shift_param_db = ShiftParamDB(db)
shift_property_db = ShiftPropertyDB(db)
worker_db = WorkerDB(db)
worker_param_db = WorkerParamDB(db)
worker_property_db = WorkerPropertyDB(db)
