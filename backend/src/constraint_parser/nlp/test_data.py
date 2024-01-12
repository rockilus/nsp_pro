from datetime import date
from core.constraint import ConstraintMap, VarDay, VarShift, VarWorker
from utils.constants import Constants

shift_names = ["off", "morning", "afternoon", "night"]
shift_ids = ["0", "1", "2", "3"]
worker_names = ["john", "paul", "george", "ringo"]
worker_ids = ["0", "1", "2", "3"]

# For single test
test_data_single = [
    {
        "in_text": "At least 2 consecutive night shifts",
        "out_nlp": {
            Constants.SHIFT_PATTERN_LABEL: [
                {
                    Constants.NAME_BLOCK_LABEL: "night",
                    Constants.OPERATOR_PATTERN_LABEL: "At least",
                    Constants.QUANTITY_BLOCK_LABEL: "2",
                    Constants.TIMING_PATTERN_LABEL: "consecutive",
                }
            ],
            Constants.WORKER_PATTERN_LABEL: [],
        },
        "out_map": ConstraintMap(
            constraint_type="seq",
            operator="greater_than_or_equal",
            target_value=2,
            target_unit="",
            worker_var=VarWorker(
                operator="",
                selector="all",
                target_ids=[],
                num_eligible_workers=0,
            ),
            day_var=VarDay(
                selector="all",
                target=0,
                start_date=date.today(),
                end_date=date.today(),
                interval=0,
            ),
            shift_var=VarShift(
                operator="",
                selector="equal",
                target_ids=["3"],
                reference_id="",
                relative_id="",
            ),
        ),
    },
]

# Actual test data
test_data = [
    {
        "in_text": "At most 2 consecutive days off",
        "out_nlp": {
            Constants.SHIFT_PATTERN_LABEL: [
                {
                    Constants.NAME_BLOCK_LABEL: "days off",
                    Constants.OPERATOR_PATTERN_LABEL: "At most",
                    Constants.QUANTITY_BLOCK_LABEL: "2",
                    Constants.TIMING_PATTERN_LABEL: "consecutive",
                }
            ],
            Constants.WORKER_PATTERN_LABEL: [],
        },
        "out_map": ConstraintMap(
            constraint_type="seq",
            operator="less_than_or_equal",
            target_value=2,
            target_unit="",
            worker_var=VarWorker(
                operator="",
                selector="all",
                target_ids=[],
                num_eligible_workers=0,
            ),
            day_var=VarDay(
                selector="all",
                target=0,
                start_date=date.today(),
                end_date=date.today(),
                interval=0,
            ),
            shift_var=VarShift(
                operator="",
                selector="equal",
                target_ids=["0"],
                reference_id="",
                relative_id="",
            ),
        ),
    },
    {
        "in_text": "Less than 3 consecutive days off",
        "out_nlp": {
            Constants.SHIFT_PATTERN_LABEL: [
                {
                    Constants.NAME_BLOCK_LABEL: "days off",
                    Constants.OPERATOR_PATTERN_LABEL: "Less than",
                    Constants.QUANTITY_BLOCK_LABEL: "3",
                    Constants.TIMING_PATTERN_LABEL: "consecutive",
                }
            ],
            Constants.WORKER_PATTERN_LABEL: [],
        },
        "out_map": ConstraintMap(
            constraint_type="seq",
            operator="less_than",
            target_value=3,
            target_unit="",
            worker_var=VarWorker(
                operator="",
                selector="all",
                target_ids=[],
                num_eligible_workers=0,
            ),
            day_var=VarDay(
                selector="all",
                target=0,
                start_date=date.today(),
                end_date=date.today(),
                interval=0,
            ),
            shift_var=VarShift(
                operator="",
                selector="equal",
                target_ids=["0"],
                reference_id="",
                relative_id="",
            ),
        ),
    },
    {
        "in_text": "Number of consecutive days off less than or equal to 2",
        "out_nlp": {
            Constants.SHIFT_PATTERN_LABEL: [
                {
                    Constants.NAME_BLOCK_LABEL: "days off",
                    Constants.OPERATOR_PATTERN_LABEL: "less than or equal to",
                    Constants.QUANTITY_BLOCK_LABEL: "2",
                    Constants.TIMING_PATTERN_LABEL: "consecutive",
                }
            ],
            Constants.WORKER_PATTERN_LABEL: [],
        },
        "out_map": ConstraintMap(
            constraint_type="seq",
            operator="less_than_or_equal",
            target_value=2,
            target_unit="",
            worker_var=VarWorker(
                operator="",
                selector="all",
                target_ids=[],
                num_eligible_workers=0,
            ),
            day_var=VarDay(
                selector="all",
                target=0,
                start_date=date.today(),
                end_date=date.today(),
                interval=0,
            ),
            shift_var=VarShift(
                operator="",
                selector="equal",
                target_ids=["0"],
                reference_id="",
                relative_id="",
            ),
        ),
    },
    {
        "in_text": "Maximum 2 consecutive days off",
        "out_nlp": {
            Constants.SHIFT_PATTERN_LABEL: [
                {
                    Constants.NAME_BLOCK_LABEL: "days off",
                    Constants.OPERATOR_PATTERN_LABEL: "Maximum",
                    Constants.QUANTITY_BLOCK_LABEL: "2",
                    Constants.TIMING_PATTERN_LABEL: "consecutive",
                }
            ],
            Constants.WORKER_PATTERN_LABEL: [],
        },
        "out_map": ConstraintMap(
            constraint_type="seq",
            operator="less_than_or_equal",
            target_value=2,
            target_unit="",
            worker_var=VarWorker(
                operator="",
                selector="all",
                target_ids=[],
                num_eligible_workers=0,
            ),
            day_var=VarDay(
                selector="all",
                target=0,
                start_date=date.today(),
                end_date=date.today(),
                interval=0,
            ),
            shift_var=VarShift(
                operator="",
                selector="equal",
                target_ids=["0"],
                reference_id="",
                relative_id="",
            ),
        ),
    },
    {
        "in_text": "John should have at least two days off per week",
        "out_nlp": {
            Constants.SHIFT_PATTERN_LABEL: [
                {
                    Constants.NAME_BLOCK_LABEL: "days off",
                    Constants.OPERATOR_PATTERN_LABEL: "at least",
                    Constants.QUANTITY_BLOCK_LABEL: "two",
                    Constants.TIMING_PATTERN_LABEL: "per week",
                }
            ],
            Constants.WORKER_PATTERN_LABEL: [
                {Constants.NAME_BLOCK_LABEL: "John"}
            ],
        },
        "out_map": ConstraintMap(
            constraint_type="seq",
            operator="greater_than_or_equal",
            target_value=2,
            target_unit="",
            worker_var=VarWorker(
                operator="",
                selector="equal",
                target_ids=["1"],
                num_eligible_workers=0,
            ),
            day_var=VarDay(
                selector="all",
                target=0,
                start_date=date.today(),
                end_date=date.today(),
                interval=0,
            ),
            shift_var=VarShift(
                operator="",
                selector="equal",
                target_ids=["0"],
                reference_id="",
                relative_id="",
            ),
        ),
    },
    {
        "in_text": "At least 2 consecutive night shifts",
        "out_nlp": {
            Constants.SHIFT_PATTERN_LABEL: [
                {
                    Constants.NAME_BLOCK_LABEL: "night",
                    Constants.OPERATOR_PATTERN_LABEL: "At least",
                    Constants.QUANTITY_BLOCK_LABEL: "2",
                    Constants.TIMING_PATTERN_LABEL: "consecutive",
                }
            ],
            Constants.WORKER_PATTERN_LABEL: [],
        },
        "out_map": ConstraintMap(
            constraint_type="seq",
            operator="greater_than_or_equal",
            target_value=2,
            target_unit="",
            worker_var=VarWorker(
                operator="",
                selector="all",
                target_ids=[],
                num_eligible_workers=0,
            ),
            day_var=VarDay(
                selector="all",
                target=0,
                start_date=date.today(),
                end_date=date.today(),
                interval=0,
            ),
            shift_var=VarShift(
                operator="",
                selector="equal",
                target_ids=["3"],
                reference_id="",
                relative_id="",
            ),
        ),
    },
    {
        "in_text": "At most 3 consecutive night shifts",
        "out_nlp": {
            Constants.SHIFT_PATTERN_LABEL: [
                {
                    Constants.NAME_BLOCK_LABEL: "night",
                    Constants.OPERATOR_PATTERN_LABEL: "At most",
                    Constants.QUANTITY_BLOCK_LABEL: "3",
                    Constants.TIMING_PATTERN_LABEL: "consecutive",
                }
            ],
            Constants.WORKER_PATTERN_LABEL: [],
        },
        "out_map": ConstraintMap(
            constraint_type="seq",
            operator="less_than_or_equal",
            target_value=3,
            target_unit="",
            worker_var=VarWorker(
                operator="",
                selector="all",
                target_ids=[],
                num_eligible_workers=0,
            ),
            day_var=VarDay(
                selector="all",
                target=0,
                start_date=date.today(),
                end_date=date.today(),
                interval=0,
            ),
            shift_var=VarShift(
                operator="",
                selector="equal",
                target_ids=["3"],
                reference_id="",
                relative_id="",
            ),
        ),
    },
    {
        "in_text": "At least 1 shift off per week",
        "out_nlp": {
            Constants.SHIFT_PATTERN_LABEL: [
                {
                    Constants.NAME_BLOCK_LABEL: "shift off",
                    Constants.OPERATOR_PATTERN_LABEL: "At least",
                    Constants.QUANTITY_BLOCK_LABEL: "1",
                    Constants.TIMING_PATTERN_LABEL: "per week",
                }
            ],
            Constants.WORKER_PATTERN_LABEL: [],
        },
        "out_map": ConstraintMap(
            constraint_type="sum",
            operator="greater_than_or_equal",
            target_value=1,
            target_unit="",
            worker_var=VarWorker(
                operator="",
                selector="all",
                target_ids=[],
                num_eligible_workers=0,
            ),
            day_var=VarDay(
                selector="week",
                target=0,
                start_date=date.today(),
                end_date=date.today(),
                interval=0,
            ),
            shift_var=VarShift(
                operator="",
                selector="equal",
                target_ids=["0"],
                reference_id="",
                relative_id="",
            ),
        ),
    },
    {
        "in_text": "At least 2 shifts off per week",
        "out_nlp": {
            Constants.SHIFT_PATTERN_LABEL: [
                {
                    Constants.NAME_BLOCK_LABEL: "shifts off",
                    Constants.OPERATOR_PATTERN_LABEL: "At least",
                    Constants.QUANTITY_BLOCK_LABEL: "2",
                    Constants.TIMING_PATTERN_LABEL: "per week",
                }
            ],
            Constants.WORKER_PATTERN_LABEL: [],
        },
        "out_map": ConstraintMap(
            constraint_type="sum",
            operator="greater_than_or_equal",
            target_value=2,
            target_unit="",
            worker_var=VarWorker(
                operator="",
                selector="all",
                target_ids=[],
                num_eligible_workers=0,
            ),
            day_var=VarDay(
                selector="week",
                target=0,
                start_date=date.today(),
                end_date=date.today(),
                interval=0,
            ),
            shift_var=VarShift(
                operator="",
                selector="equal",
                target_ids=["0"],
                reference_id="",
                relative_id="",
            ),
        ),
    },
    {
        "in_text": "At most 2 shifts off per week",
        "out_nlp": {
            Constants.SHIFT_PATTERN_LABEL: [
                {
                    Constants.NAME_BLOCK_LABEL: "shifts off",
                    Constants.OPERATOR_PATTERN_LABEL: "At most",
                    Constants.QUANTITY_BLOCK_LABEL: "2",
                    Constants.TIMING_PATTERN_LABEL: "per week",
                }
            ],
            Constants.WORKER_PATTERN_LABEL: [],
        },
        "out_map": ConstraintMap(
            constraint_type="sum",
            operator="less_than_or_equal",
            target_value=2,
            target_unit="",
            worker_var=VarWorker(
                operator="",
                selector="all",
                target_ids=[],
                num_eligible_workers=0,
            ),
            day_var=VarDay(
                selector="week",
                target=0,
                start_date=date.today(),
                end_date=date.today(),
                interval=0,
            ),
            shift_var=VarShift(
                operator="",
                selector="equal",
                target_ids=["0"],
                reference_id="",
                relative_id="",
            ),
        ),
    },
    {
        "in_text": "At least 1 night shift per week",
        "out_nlp": {
            Constants.SHIFT_PATTERN_LABEL: [
                {
                    Constants.NAME_BLOCK_LABEL: "night",
                    Constants.OPERATOR_PATTERN_LABEL: "At least",
                    Constants.QUANTITY_BLOCK_LABEL: "1",
                    Constants.TIMING_PATTERN_LABEL: "per week",
                }
            ],
            Constants.WORKER_PATTERN_LABEL: [],
        },
        "out_map": ConstraintMap(
            constraint_type="sum",
            operator="greater_than_or_equal",
            target_value=1,
            target_unit="",
            worker_var=VarWorker(
                operator="",
                selector="all",
                target_ids=[],
                num_eligible_workers=0,
            ),
            day_var=VarDay(
                selector="week",
                target=0,
                start_date=date.today(),
                end_date=date.today(),
                interval=0,
            ),
            shift_var=VarShift(
                operator="",
                selector="equal",
                target_ids=["3"],
                reference_id="",
                relative_id="",
            ),
        ),
    },
    {
        "in_text": "At most 4 night shifts per week",
        "out_nlp": {
            Constants.SHIFT_PATTERN_LABEL: [
                {
                    Constants.NAME_BLOCK_LABEL: "night",
                    Constants.OPERATOR_PATTERN_LABEL: "At most",
                    Constants.QUANTITY_BLOCK_LABEL: "4",
                    Constants.TIMING_PATTERN_LABEL: "per week",
                }
            ],
            Constants.WORKER_PATTERN_LABEL: [],
        },
        "out_map": ConstraintMap(
            constraint_type="sum",
            operator="less_than_or_equal",
            target_value=4,
            target_unit="",
            worker_var=VarWorker(
                operator="",
                selector="all",
                target_ids=[],
                num_eligible_workers=0,
            ),
            day_var=VarDay(
                selector="week",
                target=0,
                start_date=date.today(),
                end_date=date.today(),
                interval=0,
            ),
            shift_var=VarShift(
                operator="",
                selector="equal",
                target_ids=["3"],
                reference_id="",
                relative_id="",
            ),
        ),
    },
    {
        "in_text": "No shift night after afternoon",
        "out_nlp": {
            Constants.SHIFT_PATTERN_LABEL: [
                {
                    Constants.NAME_BLOCK_LABEL: "night",
                    Constants.OPERATOR_PATTERN_LABEL: "At most",
                    Constants.QUANTITY_BLOCK_LABEL: "4",
                    Constants.TIMING_PATTERN_LABEL: "per week",
                },
                {
                    Constants.NAME_BLOCK_LABEL: "afternoon",
                    Constants.REFERENCE_BLOCK_LABEL: "night",
                },
            ],
            Constants.WORKER_PATTERN_LABEL: [],
        },
        "out_map": ConstraintMap(
            constraint_type="sum",
            operator="less_than_or_equal",
            target_value=4,
            target_unit="",
            worker_var=VarWorker(
                operator="",
                selector="all",
                target_ids=[],
                num_eligible_workers=0,
            ),
            day_var=VarDay(
                selector="week",
                target=0,
                start_date=date.today(),
                end_date=date.today(),
                interval=0,
            ),
            shift_var=VarShift(
                operator="",
                selector="equal",
                target_ids=["3"],
                reference_id="",
                relative_id="",
            ),
        ),
    },
]
