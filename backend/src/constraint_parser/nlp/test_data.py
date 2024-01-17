from datetime import date
from core.constraint import ConstraintMap, VarDay, VarShift, VarWorker
from utils.constants import Constants

shift_names = [
    "off",
    "morning",
    "afternoon",
    "night",
    "maternity",
    "consultation",
    "emergency",
    "morning consultation",
]
shift_ids = ["0", "1", "2", "3", "4", "5", "6", "7"]
worker_names = [
    "john",
    "paul",
    "george",
    "ringo",
    "yoko",
    "linda",
    "maureen",
    "pattie",
    "olivia",
    "barbara",
]
worker_ids = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]
shift_dimensions = {"duty": ["2", "3"]}
worker_dimensions = {"surgeon": ["1", "2"], "60+": ["4", "5"]}

# For single test
test_data_single = [
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
                    Constants.OPERATOR_PATTERN_LABEL: "No",
                    Constants.TIMING_PATTERN_LABEL: "after",
                },
                {
                    Constants.NAME_BLOCK_LABEL: "afternoon",
                    Constants.REFERENCE_BLOCK_LABEL: "night",
                },
            ],
            Constants.WORKER_PATTERN_LABEL: [],
        },
        "out_map": ConstraintMap(
            constraint_type="ord",
            operator="no",
            target_value=0,
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
                interval=1,
            ),
            shift_var=VarShift(
                operator="",
                selector="equal",
                target_ids=[],
                reference_id="3",
                relative_id="2",
            ),
        ),
    },
    {
        "in_text": "No shift morning after night",
        "out_nlp": {
            Constants.SHIFT_PATTERN_LABEL: [
                {
                    Constants.NAME_BLOCK_LABEL: "morning",
                    Constants.OPERATOR_PATTERN_LABEL: "No",
                    Constants.TIMING_PATTERN_LABEL: "after",
                },
                {
                    Constants.NAME_BLOCK_LABEL: "night",
                    Constants.REFERENCE_BLOCK_LABEL: "morning",
                },
            ],
            Constants.WORKER_PATTERN_LABEL: [],
        },
        "out_map": ConstraintMap(
            constraint_type="ord",
            operator="no",
            target_value=0,
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
                interval=1,
            ),
            shift_var=VarShift(
                operator="",
                selector="equal",
                target_ids=[],
                reference_id="1",
                relative_id="3",
            ),
        ),
    },
    {
        "in_text": "Shift night after afternoon",
        "out_nlp": {
            Constants.SHIFT_PATTERN_LABEL: [
                {
                    Constants.NAME_BLOCK_LABEL: "night",
                    Constants.TIMING_PATTERN_LABEL: "after",
                },
                {
                    Constants.NAME_BLOCK_LABEL: "afternoon",
                    Constants.REFERENCE_BLOCK_LABEL: "night",
                },
            ],
            Constants.WORKER_PATTERN_LABEL: [],
        },
        "out_map": ConstraintMap(
            constraint_type="ord",
            operator="yes",
            target_value=0,
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
                interval=1,
            ),
            shift_var=VarShift(
                operator="",
                selector="equal",
                target_ids=[],
                reference_id="1",
                relative_id="3",
            ),
        ),
    },
    {
        "in_text": "Shift off after shift duty",
        "out_nlp": {
            Constants.SHIFT_PATTERN_LABEL: [
                {
                    Constants.NAME_BLOCK_LABEL: "Shift off",
                    Constants.TIMING_PATTERN_LABEL: "after",
                },
                {
                    Constants.NAME_BLOCK_LABEL: "duty",
                    Constants.REFERENCE_BLOCK_LABEL: "Shift off",
                },
            ],
            Constants.WORKER_PATTERN_LABEL: [],
        },
        "out_map": ConstraintMap(
            constraint_type="ord",
            operator="yes",
            target_value=0,
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
                interval=1,
            ),
            shift_var=VarShift(
                operator="",
                selector="equal",
                target_ids=[],
                reference_id=["0"],  # to be change to list in core and engine
                relative_id=["2", "3"],
            ),
        ),
    },
    {
        "in_text": "Shift off after duty",
        "out_nlp": {
            Constants.SHIFT_PATTERN_LABEL: [
                {
                    Constants.NAME_BLOCK_LABEL: "Shift off",
                    Constants.TIMING_PATTERN_LABEL: "after",
                },
                {
                    Constants.NAME_BLOCK_LABEL: "duty",
                    Constants.REFERENCE_BLOCK_LABEL: "Shift off",
                },
            ],
            Constants.WORKER_PATTERN_LABEL: [],
        },
        "out_map": ConstraintMap(
            constraint_type="ord",
            operator="yes",
            target_value=0,
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
                interval=1,
            ),
            shift_var=VarShift(
                operator="",
                selector="equal",
                target_ids=[],
                reference_id=["0"],  # to be change to list in core and engine
                relative_id=["2", "3"],
            ),
        ),
    },
    {
        "in_text": "1 shift off after shift duty",
        "out_nlp": {
            Constants.SHIFT_PATTERN_LABEL: [
                {
                    Constants.NAME_BLOCK_LABEL: "shift off",
                    Constants.TIMING_PATTERN_LABEL: "after",
                    Constants.QUANTITY_BLOCK_LABEL: "1",
                },
                {
                    Constants.NAME_BLOCK_LABEL: "duty",
                    Constants.REFERENCE_BLOCK_LABEL: "shift off",
                },
            ],
            Constants.WORKER_PATTERN_LABEL: [],
        },
        "out_map": ConstraintMap(
            constraint_type="ord",
            operator="yes",
            target_value=0,
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
                interval=1,
            ),
            shift_var=VarShift(
                operator="",
                selector="equal",
                target_ids=[],
                reference_id=["0"],  # to be change to list in core and engine
                relative_id=["2", "3"],
            ),
        ),
    },
    {
        "in_text": "1 day off after a duty",
        "out_nlp": {
            Constants.SHIFT_PATTERN_LABEL: [
                {
                    Constants.NAME_BLOCK_LABEL: "day off",
                    Constants.TIMING_PATTERN_LABEL: "after",
                    Constants.QUANTITY_BLOCK_LABEL: "1",
                },
                {
                    Constants.NAME_BLOCK_LABEL: "duty",
                    Constants.REFERENCE_BLOCK_LABEL: "day off",
                },
            ],
            Constants.WORKER_PATTERN_LABEL: [],
        },
        "out_map": ConstraintMap(
            constraint_type="ord",
            operator="yes",
            target_value=0,
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
                interval=1,
            ),
            shift_var=VarShift(
                operator="",
                selector="equal",
                target_ids=[],
                reference_id=["0"],  # to be change to list in core and engine
                relative_id=["2", "3"],
            ),
        ),
    },
    {
        "in_text": "Number of duties on thursdays should be evenly spread across eligible workers",
        "out_nlp": {
            Constants.SHIFT_PATTERN_LABEL: [
                {
                    Constants.NAME_BLOCK_LABEL: "duties",
                    Constants.TIMING_PATTERN_LABEL: "thursdays",
                    Constants.OPERATOR_PATTERN_LABEL: "evenly",
                },
            ],
            Constants.WORKER_PATTERN_LABEL: [],
        },
        # NOT DONE!!!
        "out_map": ConstraintMap(
            constraint_type="ord",
            operator="yes",
            target_value=0,
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
                interval=1,
            ),
            shift_var=VarShift(
                operator="",
                selector="equal",
                target_ids=[],
                reference_id=["0"],  # to be change to list in core and engine
                relative_id=["2", "3"],
            ),
        ),
    },
    {
        "in_text": "Number of duties on thursdays should be evenly spread across surgeons",
        "out_nlp": {
            Constants.SHIFT_PATTERN_LABEL: [
                {
                    Constants.NAME_BLOCK_LABEL: "duties",
                    Constants.TIMING_PATTERN_LABEL: "thursdays",
                    Constants.OPERATOR_PATTERN_LABEL: "evenly",
                },
            ],
            Constants.WORKER_PATTERN_LABEL: [
                {Constants.NAME_BLOCK_LABEL: "surgeons"}
            ],
        },
        # NOT DONE!!!
        "out_map": ConstraintMap(
            constraint_type="ord",
            operator="yes",
            target_value=0,
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
                interval=1,
            ),
            shift_var=VarShift(
                operator="",
                selector="equal",
                target_ids=[],
                reference_id=["0"],  # to be change to list in core and engine
                relative_id=["2", "3"],
            ),
        ),
    },
    {
        "in_text": "Number of duties on fridays should be evenly spread across eligible workers",
        "out_nlp": {
            Constants.SHIFT_PATTERN_LABEL: [
                {
                    Constants.NAME_BLOCK_LABEL: "duties",
                    Constants.TIMING_PATTERN_LABEL: "fridays",
                    Constants.OPERATOR_PATTERN_LABEL: "evenly",
                },
            ],
            Constants.WORKER_PATTERN_LABEL: [],
        },
        # NOT DONE!!!
        "out_map": ConstraintMap(
            constraint_type="ord",
            operator="yes",
            target_value=0,
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
                interval=1,
            ),
            shift_var=VarShift(
                operator="",
                selector="equal",
                target_ids=[],
                reference_id=["0"],  # to be change to list in core and engine
                relative_id=["2", "3"],
            ),
        ),
    },
    {
        "in_text": "Number of duties on saturdays should be evenly spread across eligible workers",
        "out_nlp": {
            Constants.SHIFT_PATTERN_LABEL: [
                {
                    Constants.NAME_BLOCK_LABEL: "duties",
                    Constants.TIMING_PATTERN_LABEL: "saturdays",
                    Constants.OPERATOR_PATTERN_LABEL: "evenly",
                },
            ],
            Constants.WORKER_PATTERN_LABEL: [],
        },
        # NOT DONE!!!
        "out_map": ConstraintMap(
            constraint_type="ord",
            operator="yes",
            target_value=0,
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
                interval=1,
            ),
            shift_var=VarShift(
                operator="",
                selector="equal",
                target_ids=[],
                reference_id=["0"],  # to be change to list in core and engine
                relative_id=["2", "3"],
            ),
        ),
    },
    {
        "in_text": "Number of duties on sunday should be evenly spread across eligible workers",
        "out_nlp": {
            Constants.SHIFT_PATTERN_LABEL: [
                {
                    Constants.NAME_BLOCK_LABEL: "duties",
                    Constants.TIMING_PATTERN_LABEL: "sunday",
                    Constants.OPERATOR_PATTERN_LABEL: "evenly",
                },
            ],
            Constants.WORKER_PATTERN_LABEL: [],
        },
        # NOT DONE!!!
        "out_map": ConstraintMap(
            constraint_type="ord",
            operator="yes",
            target_value=0,
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
                interval=1,
            ),
            shift_var=VarShift(
                operator="",
                selector="equal",
                target_ids=[],
                reference_id=["0"],  # to be change to list in core and engine
                relative_id=["2", "3"],
            ),
        ),
    },
    {
        "in_text": "Number of duties on bank holidays should be evenly spread across eligible workers",
        "out_nlp": {
            Constants.SHIFT_PATTERN_LABEL: [
                {
                    Constants.NAME_BLOCK_LABEL: "duties",
                    Constants.TIMING_PATTERN_LABEL: "bank holidays",
                    Constants.OPERATOR_PATTERN_LABEL: "evenly",
                },
            ],
            Constants.WORKER_PATTERN_LABEL: [],
        },
        # NOT DONE!!!
        "out_map": ConstraintMap(
            constraint_type="ord",
            operator="yes",
            target_value=0,
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
                interval=1,
            ),
            shift_var=VarShift(
                operator="",
                selector="equal",
                target_ids=[],
                reference_id=["0"],  # to be change to list in core and engine
                relative_id=["2", "3"],
            ),
        ),
    },
    {
        "in_text": "Number of duties should be evenly spread across eligible workers",
        "out_nlp": {
            Constants.SHIFT_PATTERN_LABEL: [
                {
                    Constants.NAME_BLOCK_LABEL: "duties",
                    Constants.OPERATOR_PATTERN_LABEL: "evenly",
                },
            ],
            Constants.WORKER_PATTERN_LABEL: [],
        },
        # NOT DONE!!!
        "out_map": ConstraintMap(
            constraint_type="ord",
            operator="yes",
            target_value=0,
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
                interval=1,
            ),
            shift_var=VarShift(
                operator="",
                selector="equal",
                target_ids=[],
                reference_id=["0"],  # to be change to list in core and engine
                relative_id=["2", "3"],
            ),
        ),
    },
    {
        "in_text": "60+ workers should do at most 4 duties per month",
        "out_nlp": {
            Constants.SHIFT_PATTERN_LABEL: [
                {
                    Constants.NAME_BLOCK_LABEL: "duties",
                    Constants.OPERATOR_PATTERN_LABEL: "at most",
                    Constants.QUANTITY_BLOCK_LABEL: "4",
                    Constants.TIMING_PATTERN_LABEL: "per month",
                },
            ],
            Constants.WORKER_PATTERN_LABEL: [
                {Constants.NAME_BLOCK_LABEL: "60+"}
            ],
        },
        # NOT DONE!!!
        "out_map": ConstraintMap(
            constraint_type="ord",
            operator="yes",
            target_value=0,
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
                interval=1,
            ),
            shift_var=VarShift(
                operator="",
                selector="equal",
                target_ids=[],
                reference_id=["0"],  # to be change to list in core and engine
                relative_id=["2", "3"],
            ),
        ),
    },
    {
        "in_text": "At most 2 consecutive morning consultations",
        "out_nlp": {
            Constants.SHIFT_PATTERN_LABEL: [
                {
                    Constants.NAME_BLOCK_LABEL: "morning consultations",
                    Constants.OPERATOR_PATTERN_LABEL: "At most",
                    Constants.QUANTITY_BLOCK_LABEL: "2",
                    Constants.TIMING_PATTERN_LABEL: "consecutive",
                }
            ],
            Constants.WORKER_PATTERN_LABEL: [],
        },
        # NOT DONE!!!
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
        "in_text": "60+ workers should only do maternity duties",
        "out_nlp": {
            Constants.SHIFT_PATTERN_LABEL: [
                {
                    Constants.NAME_BLOCK_LABEL: "maternity duties",
                    Constants.OPERATOR_PATTERN_LABEL: "only",
                },
            ],
            Constants.WORKER_PATTERN_LABEL: [
                {Constants.NAME_BLOCK_LABEL: "60+"}
            ],
        },
        # NOT DONE!!!
        "out_map": ConstraintMap(
            constraint_type="ord",
            operator="yes",
            target_value=0,
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
                interval=1,
            ),
            shift_var=VarShift(
                operator="",
                selector="equal",
                target_ids=[],
                reference_id=["0"],  # to be change to list in core and engine
                relative_id=["2", "3"],
            ),
        ),
    },
    {
        "in_text": "Pregnant workers should not do any duties",
        "out_nlp": {
            Constants.SHIFT_PATTERN_LABEL: [
                {
                    Constants.NAME_BLOCK_LABEL: "duties",
                    Constants.OPERATOR_PATTERN_LABEL: "not do",
                },
            ],
            Constants.WORKER_PATTERN_LABEL: [
                {Constants.NAME_BLOCK_LABEL: "Pregnant"}
            ],
        },
        # NOT DONE!!!
        "out_map": ConstraintMap(
            constraint_type="ord",
            operator="yes",
            target_value=0,
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
                interval=1,
            ),
            shift_var=VarShift(
                operator="",
                selector="equal",
                target_ids=[],
                reference_id=["0"],  # to be change to list in core and engine
                relative_id=["2", "3"],
            ),
        ),
    },
    {
        "in_text": "Pregnant workers should only do consultations and surgeries",
        "out_nlp": {
            Constants.SHIFT_PATTERN_LABEL: [
                {
                    Constants.NAME_BLOCK_LABEL: "consultations",
                    Constants.OPERATOR_PATTERN_LABEL: "only",
                },
                {
                    Constants.NAME_BLOCK_LABEL: "surgeries",
                    Constants.REFERENCE_BLOCK_LABEL: "consultations",
                    Constants.CONNECTOR_BLOCK_LABEL: "and",
                },
            ],
            Constants.WORKER_PATTERN_LABEL: [
                {Constants.NAME_BLOCK_LABEL: "Pregnant"}
            ],
        },
        # NOT DONE!!!
        "out_map": ConstraintMap(
            constraint_type="ord",
            operator="yes",
            target_value=0,
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
                interval=1,
            ),
            shift_var=VarShift(
                operator="",
                selector="equal",
                target_ids=[],
                reference_id=["0"],  # to be change to list in core and engine
                relative_id=["2", "3"],
            ),
        ),
    },
    {
        "in_text": "Pregnant workers should only do consultations, surgeries and classes",
        "out_nlp": {
            Constants.SHIFT_PATTERN_LABEL: [
                {
                    Constants.NAME_BLOCK_LABEL: "consultations",
                    Constants.OPERATOR_PATTERN_LABEL: "only",
                },
                {
                    Constants.NAME_BLOCK_LABEL: "surgeries",
                    Constants.REFERENCE_BLOCK_LABEL: "consultations",
                    Constants.CONNECTOR_BLOCK_LABEL: "and",
                },
                {
                    Constants.NAME_BLOCK_LABEL: "classes",
                    Constants.REFERENCE_BLOCK_LABEL: "consultations",
                    Constants.CONNECTOR_BLOCK_LABEL: "and",
                },
            ],
            Constants.WORKER_PATTERN_LABEL: [
                {Constants.NAME_BLOCK_LABEL: "Pregnant"}
            ],
        },
        # NOT DONE!!!
        "out_map": ConstraintMap(
            constraint_type="ord",
            operator="yes",
            target_value=0,
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
                interval=1,
            ),
            shift_var=VarShift(
                operator="",
                selector="equal",
                target_ids=[],
                reference_id=["0"],  # to be change to list in core and engine
                relative_id=["2", "3"],
            ),
        ),
    },
]
