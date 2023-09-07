from database import (
    DB,
    WorkerDB,
    WorkerParamDB,
    WorkerPropertyDB,
)

database_uri = "mongodb://localhost:27017/nsp_pro"

db = DB(database_uri)
worker_db = WorkerDB(db)
worker_param_db = WorkerParamDB(db)
worker_property_db = WorkerPropertyDB(db)
