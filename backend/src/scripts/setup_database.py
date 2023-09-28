import os
from database import (
    DB,
    ConstraintDB,
    ConstraintParamDB,
    ConstraintParamOptionDB,
    ConstraintVariableDB,
    CoverageDB,
    ShiftDB,
    ShiftParamDB,
    ShiftPropertyDB,
    TimetableCategoryDB,
    TimetableDB,
    TimetablePropertyDB,
    TimetableTimeDB,
    VariableDB,
    VariableParamDB,
    WorkerDB,
    WorkerParamDB,
    WorkerPropertyDB,
)

database_uri = (
    f"mongodb://localhost:27017/{os.getenv('ENV_SITUATION', default='nsp_pro')}"
)

db = DB(database_uri)
shift_db = ShiftDB(db)
coverage_db = CoverageDB(db)
shift_param_db = ShiftParamDB(db)
shift_property_db = ShiftPropertyDB(db)
worker_db = WorkerDB(db)
worker_param_db = WorkerParamDB(db)
worker_property_db = WorkerPropertyDB(db)
constraint_param_db = ConstraintParamDB(db)
constraint_param_option_db = ConstraintParamOptionDB(db)
constraint_db = ConstraintDB(db)
constraint_variable_db = ConstraintVariableDB(db)
timetable_db = TimetableDB(db)
timetable_time_db = TimetableTimeDB(db)
timetable_category_db = TimetableCategoryDB(db)
timetable_property_db = TimetablePropertyDB(db)
variable_db = VariableDB(db)
variable_param_db = VariableParamDB(db)
