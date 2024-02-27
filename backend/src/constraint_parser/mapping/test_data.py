# pylint: disable = too-many-lines
from datetime import date, datetime

from core.constraint import (
    Block,
    Constraint,
    ConstraintBuild,
    VarDay,
    VarShift,
    VarWorker,
)
from core.shift import Shift
from core.worker import Worker

shifts = [
    Shift(
        id="0",
        name="off",
        start_time=datetime.strptime("00:00", "%H:%M"),
        end_time=datetime.strptime("00:00", "%H:%M"),
        staffing=2,
        is_time_off=True,
        color="#000000",
    ),
    Shift(
        id="1",
        name="morning",
        start_time=datetime.strptime("08:00", "%H:%M"),
        end_time=datetime.strptime("16:00", "%H:%M"),
        staffing=2,
        is_time_off=False,
        color="#000000",
    ),
    Shift(
        id="2",
        name="afternoon",
        start_time=datetime.strptime("16:00", "%H:%M"),
        end_time=datetime.strptime("00:00", "%H:%M"),
        staffing=2,
        is_time_off=False,
        color="#000000",
    ),
    Shift(
        id="3",
        name="night",
        start_time=datetime.strptime("00:00", "%H:%M"),
        end_time=datetime.strptime("08:00", "%H:%M"),
        staffing=2,
        is_time_off=False,
        color="#000000",
    ),
    Shift(
        id="4",
        name="maternity",
        start_time=datetime.strptime("00:00", "%H:%M"),
        end_time=datetime.strptime("00:00", "%H:%M"),
        staffing=2,
        is_time_off=False,
        color="#000000",
    ),
    Shift(
        id="5",
        name="consultation",
        start_time=datetime.strptime("08:00", "%H:%M"),
        end_time=datetime.strptime("16:00", "%H:%M"),
        staffing=2,
        is_time_off=False,
        color="#000000",
    ),
    Shift(
        id="6",
        name="emergency",
        start_time=datetime.strptime("16:00", "%H:%M"),
        end_time=datetime.strptime("00:00", "%H:%M"),
        staffing=2,
        is_time_off=False,
        color="#000000",
    ),
    Shift(
        id="7",
        name="morning consultation",
        start_time=datetime.strptime("00:00", "%H:%M"),
        end_time=datetime.strptime("00:00", "%H:%M"),
        staffing=2,
        is_time_off=False,
        color="#000000",
    ),
]

workers = [
    Worker(
        id="0",
        team_id="0",
        name="john",
    ),
    Worker(
        id="1",
        team_id="0",
        name="paul",
    ),
    Worker(
        id="2",
        team_id="0",
        name="george",
    ),
    Worker(
        id="3",
        team_id="0",
        name="ringo",
    ),
    Worker(
        id="4",
        team_id="0",
        name="yoko",
    ),
    Worker(
        id="5",
        team_id="0",
        name="linda",
    ),
    Worker(
        id="6",
        team_id="0",
        name="maureen",
    ),
    Worker(
        id="7",
        team_id="0",
        name="pattie",
    ),
    Worker(
        id="8",
        team_id="0",
        name="olivia",
    ),
    Worker(
        id="9",
        team_id="0",
        name="barbara",
    ),
]


shift_dim_dict = {
    "duty_id": {
        "duty": ["2", "3"],
        "not duty": ["0", "1", "4", "5", "6", "7"],
    },
    "unit_id": {
        "unit 1": ["0", "1", "2", "3"],
        "unit 2": ["4", "5", "6", "7"],
    },
}
worker_dim_dict = {
    "specialty_id": {"surgeon": ["1", "2"], "anesthesia": ["3", "4"]},
    "60+_id": {
        "60+": ["4", "5"],
        "not 60+": ["0", "1", "2", "3", "6", "7", "8", "9"],
    },
}

# 1 - Block inputted avec des templates -> pure mapping
# @WORKER:[John] should have @OPERATOR:[at least] @QUANTITY:two @SHIFT:[days
# off] @TIMING:[per week]

# WORKER OPERATOR QUANTITY SHIFT    TIMING
# John   at least two      days off per week

# 2 - Block inputted by typing -> pure mapping
# @WORKER:[John] should have @OPERATOR:[at least] @QUANTITY:two @SHIFT:[days
# off] @TIMING:[per week]

# 3 - Input text -> NLP + mapping
# John should have at least two days off per week


test_data = [
    # Sequence
    # One worker, one shift
    {
        "text": "John should work at most 2 consecutive off.",
        "in": ConstraintBuild(
            id="",
            constraint_type="seq",
            template_id="0",
            blocks=[
                Block(
                    name="worker",
                    type="dict",
                    value=[{"name": "John", "id": "0", "id_type": "worker"}],
                ),
                Block(name="text", type="string", value="should work"),
                Block(name="operator", type="string", value="at most"),
                Block(name="#", type="number", value=2),
                Block(name="timing", type="string", value="consecutive"),
                Block(
                    name="shift",
                    type="dict",
                    value=[{"name": "off", "id": "0", "id_type": "shift"}],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_properties=[],
        ),
        "out": Constraint(
            id="",
            constraint_type="seq",
            operator="less_than_or_equal",
            target_value=2,
            target_unit="",
            worker_var=VarWorker(
                selector="equal", target_ids=["0"], num_eligible_workers=0
            ),
            day_var=VarDay(
                selector="all",
                target=0,
                start_date=date.today(),
                end_date=date.today(),
                interval=0,
            ),
            shift_var=VarShift(
                selector="equal",
                target_ids=["0"],
                reference_ids=[],
                relative_ids=[],
            ),
            active=True,
            hard=True,
            priority="medium",
            schedule_id="test_schedule",
            constraint_build_id="",
        ),
    },
    # All workers, all shifts
    {
        "text": "All workers should work at most 2 consecutive all shifts.",
        "in": ConstraintBuild(
            id="",
            constraint_type="seq",
            template_id="0",
            blocks=[
                Block(
                    name="worker",
                    type="dict",
                    value=[{"name": "all workers", "id": "", "id_type": ""}],
                ),
                Block(name="text", type="string", value="should work"),
                Block(name="operator", type="string", value="at most"),
                Block(name="#", type="number", value=2),
                Block(name="timing", type="string", value="consecutive"),
                Block(
                    name="shift",
                    type="dict",
                    value=[{"name": "all shifts", "id": "", "id_type": ""}],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_properties=[],
        ),
        "out": Constraint(
            id="",
            constraint_type="seq",
            operator="less_than_or_equal",
            target_value=2,
            target_unit="",
            worker_var=VarWorker(selector="all", target_ids=[], num_eligible_workers=0),
            day_var=VarDay(
                selector="all",
                target=0,
                start_date=date.today(),
                end_date=date.today(),
                interval=0,
            ),
            shift_var=VarShift(
                selector="all",
                target_ids=[],
                reference_ids=[],
                relative_ids=[],
            ),
            active=True,
            hard=True,
            priority="medium",
            schedule_id="test_schedule",
            constraint_build_id="",
        ),
    },
    # Boolean property workers, boolean property shifts
    {
        "text": "60+ should work at most 2 consecutive not duty.",
        "in": ConstraintBuild(
            id="",
            constraint_type="seq",
            template_id="0",
            blocks=[
                Block(
                    name="worker",
                    type="dict",
                    value=[
                        {
                            "name": "60+",
                            "id": "60+_id",
                            "id_type": "worker_dimension",
                        }
                    ],
                ),
                Block(name="text", type="string", value="should work"),
                Block(name="operator", type="string", value="at most"),
                Block(name="#", type="number", value=2),
                Block(name="timing", type="string", value="consecutive"),
                Block(
                    name="shift",
                    type="dict",
                    value=[
                        {
                            "name": "not duty",
                            "id": "duty_id",
                            "id_type": "shift_dimension",
                        }
                    ],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_properties=[],
        ),
        "out": Constraint(
            id="",
            constraint_type="seq",
            operator="less_than_or_equal",
            target_value=2,
            target_unit="",
            worker_var=VarWorker(
                selector="equal", target_ids=["4", "5"], num_eligible_workers=0
            ),
            day_var=VarDay(
                selector="all",
                target=0,
                start_date=date.today(),
                end_date=date.today(),
                interval=0,
            ),
            shift_var=VarShift(
                selector="equal",
                target_ids=["0", "1", "4", "5", "6", "7"],
                reference_ids=[],
                relative_ids=[],
            ),
            active=True,
            hard=True,
            priority="medium",
            schedule_id="test_schedule",
            constraint_build_id="",
        ),
    },
    # Non boolean property worker, non boolean property shift
    {
        "text": "Surgeon should work at most 2 consecutive unit 1.",
        "in": ConstraintBuild(
            id="",
            constraint_type="seq",
            template_id="0",
            blocks=[
                Block(
                    name="worker",
                    type="dict",
                    value=[
                        {
                            "name": "surgeon",
                            "id": "specialty_id",
                            "id_type": "worker_dimension",
                        }
                    ],
                ),
                Block(name="text", type="string", value="should work"),
                Block(name="operator", type="string", value="at most"),
                Block(name="#", type="number", value=2),
                Block(name="timing", type="string", value="consecutive"),
                Block(
                    name="shift",
                    type="dict",
                    value=[
                        {
                            "name": "unit 1",
                            "id": "unit_id",
                            "id_type": "shift_dimension",
                        }
                    ],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_properties=[],
        ),
        "out": Constraint(
            id="",
            constraint_type="seq",
            operator="less_than_or_equal",
            target_value=2,
            target_unit="",
            worker_var=VarWorker(
                selector="equal", target_ids=["1", "2"], num_eligible_workers=0
            ),
            day_var=VarDay(
                selector="all",
                target=0,
                start_date=date.today(),
                end_date=date.today(),
                interval=0,
            ),
            shift_var=VarShift(
                selector="equal",
                target_ids=["0", "1", "2", "3"],
                reference_ids=[],
                relative_ids=[],
            ),
            active=True,
            hard=True,
            priority="medium",
            schedule_id="test_schedule",
            constraint_build_id="",
        ),
    },
    # Sum
    {
        "text": "John should work at least 1 off per week.",
        "in": ConstraintBuild(
            id="",
            constraint_type="sum",
            template_id="1",
            blocks=[
                Block(
                    name="worker",
                    type="dict",
                    value=[{"name": "John", "id": "0", "id_type": "worker"}],
                ),
                Block(name="text", type="string", value="should work"),
                Block(name="operator", type="string", value="at least"),
                Block(name="#", type="number", value=1),
                Block(
                    name="shift",
                    type="dict",
                    value=[{"name": "off", "id": "0", "id_type": "shift"}],
                ),
                Block(name="timing", type="string", value="per week"),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_properties=[],
        ),
        "out": Constraint(
            id="",
            constraint_type="sum",
            operator="greater_than_or_equal",
            target_value=1,
            target_unit="",
            worker_var=VarWorker(
                selector="equal", target_ids=["0"], num_eligible_workers=0
            ),
            day_var=VarDay(
                selector="week",
                target=0,
                start_date=date.today(),
                end_date=date.today(),
                interval=0,
            ),
            shift_var=VarShift(
                selector="equal",
                target_ids=["0"],
                reference_ids=[],
                relative_ids=[],
            ),
            active=True,
            hard=True,
            priority="medium",
            schedule_id="test_schedule",
            constraint_build_id="",
        ),
    },
    # Order
    {
        "text": "No night 1 day after afternoon for john.",
        "in": ConstraintBuild(
            id="",
            constraint_type="ord",
            template_id="2",
            blocks=[
                Block(name="operator", type="string", value="no"),
                Block(
                    name="shift_reference",
                    type="dict",
                    value=[{"name": "night", "id": "3", "id_type": "shift"}],
                ),
                Block(name="#", type="number", value=1),
                Block(name="text", type="string", value="day"),
                Block(name="timing", type="string", value="after"),
                Block(
                    name="shift_relative",
                    type="dict",
                    value=[{"name": "afternoon", "id": "2", "id_type": "shift"}],
                ),
                Block(name="text", type="string", value="for"),
                Block(
                    name="worker",
                    type="dict",
                    value=[{"name": "John", "id": "0", "id_type": "worker"}],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_properties=[],
        ),
        "out": Constraint(
            id="",
            constraint_type="ord",
            operator="no",
            target_value=0,
            target_unit="",
            worker_var=VarWorker(
                selector="equal", target_ids=["0"], num_eligible_workers=0
            ),
            day_var=VarDay(
                selector="all",
                target=0,
                start_date=date.today(),
                end_date=date.today(),
                interval=1,
            ),
            shift_var=VarShift(
                selector="all",
                target_ids=[],
                reference_ids=["3"],
                relative_ids=["2"],
            ),
            active=True,
            hard=True,
            priority="medium",
            schedule_id="test_schedule",
            constraint_build_id="",
        ),
    },
    {
        "text": "If night then off 1 day after for john.",
        "in": ConstraintBuild(
            id="",
            constraint_type="ord",
            template_id="3",
            blocks=[
                Block(name="text", type="string", value="if"),
                Block(
                    name="shift_reference",
                    type="dict",
                    value=[{"name": "night", "id": "3", "id_type": "shift"}],
                ),
                Block(name="text", type="string", value="then"),
                Block(
                    name="shift_relative",
                    type="dict",
                    value=[{"name": "off", "id": "0", "id_type": "shift"}],
                ),
                Block(name="#", type="number", value=1),
                Block(name="text", type="string", value="day"),
                Block(name="timing", type="string", value="after"),
                Block(name="text", type="string", value="for"),
                Block(
                    name="worker",
                    type="dict",
                    value=[{"name": "John", "id": "0", "id_type": "worker"}],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_properties=[],
        ),
        "out": Constraint(
            id="",
            constraint_type="ord",
            operator="yes",
            target_value=0,
            target_unit="",
            worker_var=VarWorker(
                selector="equal", target_ids=["0"], num_eligible_workers=0
            ),
            day_var=VarDay(
                selector="all",
                target=0,
                start_date=date.today(),
                end_date=date.today(),
                interval=1,
            ),
            shift_var=VarShift(
                selector="all",
                target_ids=[],
                reference_ids=["3"],
                relative_ids=["0"],
            ),
            active=True,
            hard=True,
            priority="medium",
            schedule_id="test_schedule",
            constraint_build_id="",
        ),
    },
    {
        "text": "If morning on saturday then off 2 day after for john.",
        "in": ConstraintBuild(
            id="",
            constraint_type="ord",
            template_id="4",
            blocks=[
                Block(name="text", type="string", value="if"),
                Block(
                    name="shift_reference",
                    type="dict",
                    value=[{"name": "morning", "id": "1", "id_type": "shift"}],
                ),
                Block(name="text", type="string", value="on"),
                Block(name="weekday", type="string", value="saturday"),
                Block(name="text", type="string", value="then"),
                Block(
                    name="shift_relative",
                    type="dict",
                    value=[{"name": "off", "id": "0", "id_type": "shift"}],
                ),
                Block(name="#", type="number", value=2),
                Block(name="text", type="string", value="day"),
                Block(name="timing", type="string", value="after"),
                Block(name="text", type="string", value="for"),
                Block(
                    name="worker",
                    type="dict",
                    value=[{"name": "John", "id": "0", "id_type": "worker"}],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_properties=[],
        ),
        "out": Constraint(
            id="",
            constraint_type="ord",
            operator="yes",
            target_value=0,
            target_unit="",
            worker_var=VarWorker(
                selector="equal", target_ids=["0"], num_eligible_workers=0
            ),
            day_var=VarDay(
                selector="week_day_index",
                target=5,
                start_date=date.today(),
                end_date=date.today(),
                interval=2,
            ),
            shift_var=VarShift(
                selector="all",
                target_ids=[],
                reference_ids=["1"],
                relative_ids=["0"],
            ),
            active=True,
            hard=True,
            priority="medium",
            schedule_id="test_schedule",
            constraint_build_id="",
        ),
    },
    {
        "text": "If morning on saturday then off 2 day before for john.",
        "in": ConstraintBuild(
            id="",
            constraint_type="ord",
            template_id="4",
            blocks=[
                Block(name="text", type="string", value="if"),
                Block(
                    name="shift_reference",
                    type="dict",
                    value=[{"name": "morning", "id": "1", "id_type": "shift"}],
                ),
                Block(name="text", type="string", value="on"),
                Block(name="weekday", type="string", value="saturday"),
                Block(name="text", type="string", value="then"),
                Block(
                    name="shift_relative",
                    type="dict",
                    value=[{"name": "off", "id": "0", "id_type": "shift"}],
                ),
                Block(name="#", type="number", value=2),
                Block(name="text", type="string", value="day"),
                Block(name="timing", type="string", value="before"),
                Block(name="text", type="string", value="for"),
                Block(
                    name="worker",
                    type="dict",
                    value=[{"name": "John", "id": "0", "id_type": "worker"}],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_properties=[],
        ),
        "out": Constraint(
            id="",
            constraint_type="ord",
            operator="yes",
            target_value=0,
            target_unit="",
            worker_var=VarWorker(
                selector="equal", target_ids=["0"], num_eligible_workers=0
            ),
            day_var=VarDay(
                selector="week_day_index",
                target=5,
                start_date=date.today(),
                end_date=date.today(),
                interval=-2,
            ),
            shift_var=VarShift(
                selector="all",
                target_ids=[],
                reference_ids=["1"],
                relative_ids=["0"],
            ),
            active=True,
            hard=True,
            priority="medium",
            schedule_id="test_schedule",
            constraint_build_id="",
        ),
    },
    # Filter
    {
        "text": "John should only work night.",
        "in": ConstraintBuild(
            id="",
            constraint_type="fil",
            template_id="5",
            blocks=[
                Block(
                    name="worker",
                    type="dict",
                    value=[{"name": "John", "id": "0", "id_type": "worker"}],
                ),
                Block(name="operator", type="string", value="should only"),
                Block(name="text", type="string", value="work"),
                Block(
                    name="shift",
                    type="dict",
                    value=[{"name": "night", "id": "3", "id_type": "shift"}],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_properties=[],
        ),
        "out": Constraint(
            id="",
            constraint_type="fil",
            operator="yes",
            target_value=0,
            target_unit="",
            worker_var=VarWorker(
                selector="equal", target_ids=["0"], num_eligible_workers=0
            ),
            day_var=VarDay(
                selector="all",
                target=0,
                start_date=date.today(),
                end_date=date.today(),
                interval=0,
            ),
            shift_var=VarShift(
                selector="equal",
                target_ids=["0", "3"],
                reference_ids=[],
                relative_ids=[],
            ),
            active=True,
            hard=True,
            priority="medium",
            schedule_id="test_schedule",
            constraint_build_id="",
        ),
    },
    {
        "text": "John should not work night.",
        "in": ConstraintBuild(
            id="",
            constraint_type="fil",
            template_id="5",
            blocks=[
                Block(
                    name="worker",
                    type="dict",
                    value=[{"name": "John", "id": "0", "id_type": "worker"}],
                ),
                Block(name="operator", type="string", value="should not"),
                Block(name="text", type="string", value="work"),
                Block(
                    name="shift",
                    type="dict",
                    value=[{"name": "night", "id": "3", "id_type": "shift"}],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_properties=[],
        ),
        "out": Constraint(
            id="",
            constraint_type="fil",
            operator="no",
            target_value=0,
            target_unit="",
            worker_var=VarWorker(
                selector="equal", target_ids=["0"], num_eligible_workers=0
            ),
            day_var=VarDay(
                selector="all",
                target=0,
                start_date=date.today(),
                end_date=date.today(),
                interval=0,
            ),
            shift_var=VarShift(
                selector="equal",
                target_ids=["3"],
                reference_ids=[],
                relative_ids=[],
            ),
            active=True,
            hard=True,
            priority="medium",
            schedule_id="test_schedule",
            constraint_build_id="",
        ),
    },
    # Evenness
    {
        "text": "Night on sunday should be evenly spread in time for John.",
        "in": ConstraintBuild(
            id="",
            constraint_type="eve",
            template_id="6",
            blocks=[
                Block(
                    name="shift",
                    type="dict",
                    value=[{"name": "night", "id": "3", "id_type": "shift"}],
                ),
                Block(name="text", type="string", value="on"),
                Block(name="weekday", type="string", value="sunday"),
                Block(
                    name="text",
                    type="string",
                    value="should be evenly spread in time for",
                ),
                Block(
                    name="worker",
                    type="dict",
                    value=[{"name": "John", "id": "0", "id_type": "worker"}],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_properties=[],
        ),
        "out": Constraint(
            id="",
            constraint_type="eve",
            operator="",
            target_value=0,
            target_unit="",
            worker_var=VarWorker(
                selector="equal", target_ids=["0"], num_eligible_workers=0
            ),
            day_var=VarDay(
                selector="week_day_index",
                target=6,
                start_date=date.today(),
                end_date=date.today(),
                interval=0,
            ),
            shift_var=VarShift(
                selector="equal",
                target_ids=["3"],
                reference_ids=[],
                relative_ids=[],
            ),
            active=True,
            hard=True,
            priority="medium",
            schedule_id="test_schedule",
            constraint_build_id="",
        ),
    },
    # Fairness
    {
        "text": "Night on sunday should be fairly spread across all workers.",
        "in": ConstraintBuild(
            id="",
            constraint_type="fai",
            template_id="7",
            blocks=[
                Block(
                    name="shift",
                    type="dict",
                    value=[{"name": "night", "id": "3", "id_type": "shift"}],
                ),
                Block(name="text", type="string", value="on"),
                Block(name="weekday", type="string", value="sunday"),
                Block(
                    name="text",
                    type="string",
                    value="should be fairly spread across",
                ),
                Block(
                    name="worker",
                    type="dict",
                    value=[{"name": "all workers", "id": "", "id_type": ""}],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_properties=[],
        ),
        "out": Constraint(
            id="",
            constraint_type="fai",
            operator="",
            target_value=0,
            target_unit="",
            worker_var=VarWorker(selector="all", target_ids=[], num_eligible_workers=0),
            day_var=VarDay(
                selector="week_day_index",
                target=6,
                start_date=date.today(),
                end_date=date.today(),
                interval=0,
            ),
            shift_var=VarShift(
                selector="equal",
                target_ids=["3"],
                reference_ids=[],
                relative_ids=[],
            ),
            active=True,
            hard=True,
            priority="medium",
            schedule_id="test_schedule",
            constraint_build_id="",
        ),
    },
]
