import os

from database import (
    DB,
    ConstraintDB,
    ConstraintParamDB,
    ConstraintParamOptionDB,
    ConstraintVariableDB,
    CoverageDB,
    CoverageSelectorDB,
    FixedAssignmentDB,
    RequestDB,
    ShiftDB,
    ShiftDimensionDB,
    ShiftPropertyDB,
    VariableDB,
    VariableParamDB,
    WorkerDB,
    WorkerDimensionDB,
    WorkerPropertyDB,
)

database_uri = (
    f"mongodb://localhost:27017/{os.getenv('ENV_SITUATION', default='nsp_pro')}"
)

db = DB(database_uri)
constraint_db = ConstraintDB(db)
constraint_param_db = ConstraintParamDB(db)
constraint_param_option_db = ConstraintParamOptionDB(db)
constraint_variable_db = ConstraintVariableDB(db)
coverage_db = CoverageDB(db)
coverage_selector_db = CoverageSelectorDB(db)
fixed_assignment_db = FixedAssignmentDB(db)
request_db = RequestDB(db)
shift_db = ShiftDB(db)
shift_dimension_db = ShiftDimensionDB(db)
shift_property_db = ShiftPropertyDB(db)
variable_db = VariableDB(db)
variable_param_db = VariableParamDB(db)
worker_db = WorkerDB(db)
worker_dimension_db = WorkerDimensionDB(db)
worker_property_db = WorkerPropertyDB(db)
