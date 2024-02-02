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
        name="john",
    ),
    Worker(
        id="1",
        name="paul",
    ),
    Worker(
        id="2",
        name="george",
    ),
    Worker(
        id="3",
        name="ringo",
    ),
    Worker(
        id="4",
        name="yoko",
    ),
    Worker(
        id="5",
        name="linda",
    ),
    Worker(
        id="6",
        name="maureen",
    ),
    Worker(
        id="7",
        name="pattie",
    ),
    Worker(
        id="8",
        name="olivia",
    ),
    Worker(
        id="9",
        name="barbara",
    ),
]


shift_dim_dict = {
    "duty": {"duty": ["2", "3"], "not duty": ["0", "1", "4", "5", "6", "7"]},
    "unit": {"unit 1": ["0", "1", "2", "3"], "unit 2": ["4", "5", "6", "7"]},
}
worker_dim_dict = {
    "specialty": {"surgeon": ["1", "2"], "anesthesia": ["3", "4"]},
    "60+": {
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
                Block(name="worker", type="dict", value=[{"workers": "John"}]),
                Block(name="text", type="string", value="should work"),
                Block(name="operator", type="string", value="at most"),
                Block(name="#", type="number", value=2),
                Block(name="timing", type="string", value="consecutive"),
                Block(name="shift", type="dict", value=[{"shifts": "off"}]),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
        ),
        "out": Constraint(
            id="",
            constraint_type="seq",
            template_id="0",
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
            text="John should work at most 2 consecutive off.",
            blocks=[
                Block(name="worker", type="dict", value=[{"workers": "John"}]),
                Block(name="text", type="string", value="should work"),
                Block(name="operator", type="string", value="at most"),
                Block(name="#", type="number", value=2),
                Block(name="timing", type="string", value="consecutive"),
                Block(name="shift", type="dict", value=[{"shifts": "off"}]),
            ],
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
                Block(name="worker", type="dict", value=[{"all": "all workers"}]),
                Block(name="text", type="string", value="should work"),
                Block(name="operator", type="string", value="at most"),
                Block(name="#", type="number", value=2),
                Block(name="timing", type="string", value="consecutive"),
                Block(name="shift", type="dict", value=[{"all": "all shifts"}]),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
        ),
        "out": Constraint(
            id="",
            constraint_type="seq",
            template_id="0",
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
            text="All workers should work at most 2 consecutive all shifts.",
            blocks=[
                Block(name="worker", type="dict", value=[{"all": "all workers"}]),
                Block(name="text", type="string", value="should work"),
                Block(name="operator", type="string", value="at most"),
                Block(name="#", type="number", value=2),
                Block(name="timing", type="string", value="consecutive"),
                Block(name="shift", type="dict", value=[{"all": "all shifts"}]),
            ],
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
                Block(name="worker", type="dict", value=[{"60+": "60+"}]),
                Block(name="text", type="string", value="should work"),
                Block(name="operator", type="string", value="at most"),
                Block(name="#", type="number", value=2),
                Block(name="timing", type="string", value="consecutive"),
                Block(name="shift", type="dict", value=[{"duty": "not duty"}]),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
        ),
        "out": Constraint(
            id="",
            constraint_type="seq",
            template_id="0",
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
            text="60+ should work at most 2 consecutive not duty.",
            blocks=[
                Block(name="worker", type="dict", value=[{"60+": "60+"}]),
                Block(name="text", type="string", value="should work"),
                Block(name="operator", type="string", value="at most"),
                Block(name="#", type="number", value=2),
                Block(name="timing", type="string", value="consecutive"),
                Block(name="shift", type="dict", value=[{"duty": "not duty"}]),
            ],
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
                    value=[{"specialty": "surgeon"}],
                ),
                Block(name="text", type="string", value="should work"),
                Block(name="operator", type="string", value="at most"),
                Block(name="#", type="number", value=2),
                Block(name="timing", type="string", value="consecutive"),
                Block(name="shift", type="dict", value=[{"unit": "unit 1"}]),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
        ),
        "out": Constraint(
            id="",
            constraint_type="seq",
            template_id="0",
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
            text="Surgeon should work at most 2 consecutive unit 1.",
            blocks=[
                Block(
                    name="worker",
                    type="dict",
                    value=[{"specialty": "surgeon"}],
                ),
                Block(name="text", type="string", value="should work"),
                Block(name="operator", type="string", value="at most"),
                Block(name="#", type="number", value=2),
                Block(name="timing", type="string", value="consecutive"),
                Block(name="shift", type="dict", value=[{"unit": "unit 1"}]),
            ],
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
                Block(name="worker", type="dict", value=[{"workers": "John"}]),
                Block(name="text", type="string", value="should work"),
                Block(name="operator", type="string", value="at least"),
                Block(name="#", type="number", value=1),
                Block(name="shift", type="dict", value=[{"shifts": "off"}]),
                Block(name="timing", type="string", value="per week"),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
        ),
        "out": Constraint(
            id="",
            constraint_type="sum",
            template_id="1",
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
            text="John should work at least 1 off per week.",
            blocks=[
                Block(name="worker", type="dict", value=[{"workers": "John"}]),
                Block(name="text", type="string", value="should work"),
                Block(name="operator", type="string", value="at least"),
                Block(name="#", type="number", value=1),
                Block(name="shift", type="dict", value=[{"shifts": "off"}]),
                Block(name="timing", type="string", value="per week"),
            ],
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
                    value=[{"shifts": "night"}],
                ),
                Block(name="#", type="number", value=1),
                Block(name="text", type="string", value="day"),
                Block(name="timing", type="string", value="after"),
                Block(
                    name="shift_relative",
                    type="dict",
                    value=[{"shifts": "afternoon"}],
                ),
                Block(name="text", type="string", value="for"),
                Block(name="worker", type="dict", value=[{"workers": "John"}]),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
        ),
        "out": Constraint(
            id="",
            constraint_type="ord",
            template_id="2",
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
            text="No night 1 day after afternoon for john.",
            blocks=[
                Block(name="operator", type="string", value="no"),
                Block(
                    name="shift_reference",
                    type="dict",
                    value=[{"shifts": "night"}],
                ),
                Block(name="#", type="number", value=1),
                Block(name="text", type="string", value="day"),
                Block(name="timing", type="string", value="after"),
                Block(
                    name="shift_relative",
                    type="dict",
                    value=[{"shifts": "afternoon"}],
                ),
                Block(name="text", type="string", value="for"),
                Block(name="worker", type="dict", value=[{"workers": "John"}]),
            ],
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
                    value=[{"shifts": "night"}],
                ),
                Block(name="text", type="string", value="then"),
                Block(
                    name="shift_relative",
                    type="dict",
                    value=[{"shifts": "off"}],
                ),
                Block(name="#", type="number", value=1),
                Block(name="text", type="string", value="day"),
                Block(name="timing", type="string", value="after"),
                Block(name="text", type="string", value="for"),
                Block(name="worker", type="dict", value=[{"workers": "John"}]),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
        ),
        "out": Constraint(
            id="",
            constraint_type="ord",
            template_id="3",
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
            text="If night then off 1 day after for john.",
            blocks=[
                Block(name="text", type="string", value="if"),
                Block(
                    name="shift_reference",
                    type="dict",
                    value=[{"shifts": "night"}],
                ),
                Block(name="text", type="string", value="then"),
                Block(
                    name="shift_relative",
                    type="dict",
                    value=[{"shifts": "off"}],
                ),
                Block(name="#", type="number", value=1),
                Block(name="text", type="string", value="day"),
                Block(name="timing", type="string", value="after"),
                Block(name="text", type="string", value="for"),
                Block(name="worker", type="dict", value=[{"workers": "John"}]),
            ],
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
                    value=[{"shifts": "morning"}],
                ),
                Block(name="text", type="string", value="on"),
                Block(name="weekday", type="string", value="saturday"),
                Block(name="text", type="string", value="then"),
                Block(
                    name="shift_relative",
                    type="dict",
                    value=[{"shifts": "off"}],
                ),
                Block(name="#", type="number", value=2),
                Block(name="text", type="string", value="day"),
                Block(name="timing", type="string", value="after"),
                Block(name="text", type="string", value="for"),
                Block(name="worker", type="dict", value=[{"workers": "John"}]),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
        ),
        "out": Constraint(
            id="",
            constraint_type="ord",
            template_id="4",
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
            text="If morning on saturday then off 2 day after for john.",
            blocks=[
                Block(name="text", type="string", value="if"),
                Block(
                    name="shift_reference",
                    type="dict",
                    value=[{"shifts": "morning"}],
                ),
                Block(name="text", type="string", value="on"),
                Block(name="weekday", type="string", value="saturday"),
                Block(name="text", type="string", value="then"),
                Block(
                    name="shift_relative",
                    type="dict",
                    value=[{"shifts": "off"}],
                ),
                Block(name="#", type="number", value=2),
                Block(name="text", type="string", value="day"),
                Block(name="timing", type="string", value="after"),
                Block(name="text", type="string", value="for"),
                Block(name="worker", type="dict", value=[{"workers": "John"}]),
            ],
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
                    value=[{"shifts": "morning"}],
                ),
                Block(name="text", type="string", value="on"),
                Block(name="weekday", type="string", value="saturday"),
                Block(name="text", type="string", value="then"),
                Block(
                    name="shift_relative",
                    type="dict",
                    value=[{"shifts": "off"}],
                ),
                Block(name="#", type="number", value=2),
                Block(name="text", type="string", value="day"),
                Block(name="timing", type="string", value="before"),
                Block(name="text", type="string", value="for"),
                Block(name="worker", type="dict", value=[{"workers": "John"}]),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
        ),
        "out": Constraint(
            id="",
            constraint_type="ord",
            template_id="4",
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
            text="If morning on saturday then off 2 day before for john.",
            blocks=[
                Block(name="text", type="string", value="if"),
                Block(
                    name="shift_reference",
                    type="dict",
                    value=[{"shifts": "morning"}],
                ),
                Block(name="text", type="string", value="on"),
                Block(name="weekday", type="string", value="saturday"),
                Block(name="text", type="string", value="then"),
                Block(
                    name="shift_relative",
                    type="dict",
                    value=[{"shifts": "off"}],
                ),
                Block(name="#", type="number", value=2),
                Block(name="text", type="string", value="day"),
                Block(name="timing", type="string", value="before"),
                Block(name="text", type="string", value="for"),
                Block(name="worker", type="dict", value=[{"workers": "John"}]),
            ],
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
                Block(name="worker", type="dict", value=[{"workers": "John"}]),
                Block(name="operator", type="string", value="should only"),
                Block(name="text", type="string", value="work"),
                Block(
                    name="shift",
                    type="dict",
                    value=[{"shifts": "night"}],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
        ),
        "out": Constraint(
            id="",
            constraint_type="fil",
            template_id="5",
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
                target_ids=["3"],
                reference_ids=[],
                relative_ids=[],
            ),
            active=True,
            hard=True,
            priority="medium",
            text="John should only work night.",
            blocks=[
                Block(name="worker", type="dict", value=[{"workers": "John"}]),
                Block(name="operator", type="string", value="should only"),
                Block(name="text", type="string", value="work"),
                Block(
                    name="shift",
                    type="dict",
                    value=[{"shifts": "night"}],
                ),
            ],
        ),
    },
    {
        "text": "John should not work night.",
        "in": ConstraintBuild(
            id="",
            constraint_type="fil",
            template_id="5",
            blocks=[
                Block(name="worker", type="dict", value=[{"workers": "John"}]),
                Block(name="operator", type="string", value="should not"),
                Block(name="text", type="string", value="work"),
                Block(
                    name="shift",
                    type="dict",
                    value=[{"shifts": "night"}],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
        ),
        "out": Constraint(
            id="",
            constraint_type="fil",
            template_id="5",
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
            text="John should not work night.",
            blocks=[
                Block(name="worker", type="dict", value=[{"workers": "John"}]),
                Block(name="operator", type="string", value="should not"),
                Block(name="text", type="string", value="work"),
                Block(
                    name="shift",
                    type="dict",
                    value=[{"shifts": "night"}],
                ),
            ],
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
                    value=[{"shifts": "night"}],
                ),
                Block(name="text", type="string", value="on"),
                Block(name="weekday", type="string", value="sunday"),
                Block(
                    name="text",
                    type="string",
                    value="should be evenly spread in time for",
                ),
                Block(name="worker", type="dict", value=[{"workers": "John"}]),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
        ),
        "out": Constraint(
            id="",
            constraint_type="eve",
            template_id="6",
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
            text="Night on sunday should be evenly spread in time for john.",
            blocks=[
                Block(
                    name="shift",
                    type="dict",
                    value=[{"shifts": "night"}],
                ),
                Block(name="text", type="string", value="on"),
                Block(name="weekday", type="string", value="sunday"),
                Block(
                    name="text",
                    type="string",
                    value="should be evenly spread in time for",
                ),
                Block(name="worker", type="dict", value=[{"workers": "John"}]),
            ],
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
                    value=[{"shifts": "night"}],
                ),
                Block(name="text", type="string", value="on"),
                Block(name="weekday", type="string", value="sunday"),
                Block(
                    name="text",
                    type="string",
                    value="should be fairly spread across",
                ),
                Block(name="worker", type="dict", value=[{"all": "all workers"}]),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
        ),
        "out": Constraint(
            id="",
            constraint_type="fai",
            template_id="7",
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
            text="Night on sunday should be fairly spread across all workers.",
            blocks=[
                Block(
                    name="shift",
                    type="dict",
                    value=[{"shifts": "night"}],
                ),
                Block(name="text", type="string", value="on"),
                Block(name="weekday", type="string", value="sunday"),
                Block(
                    name="text",
                    type="string",
                    value="should be fairly spread across",
                ),
                Block(name="worker", type="dict", value=[{"all": "all workers"}]),
            ],
        ),
    },
    # {
    #     "in_text": "Less than 3 consecutive days off",
    #     "out_nlp": {
    #         Constants.SHIFT_PATTERN_LABEL: [
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "days off",
    #                 Constants.OPERATOR_PATTERN_LABEL: "Less than",
    #                 Constants.QUANTITY_BLOCK_LABEL: "3",
    #                 Constants.TIMING_PATTERN_LABEL: "consecutive",
    #             }
    #         ],
    #         Constants.WORKER_PATTERN_LABEL: [],
    #     },
    #     "out_map": ConstraintMap(
    #         constraint_type="seq",
    #         operator="less_than",
    #         target_value=3,
    #         target_unit="",
    #         worker_var=VarWorker(
    #             operator="",
    #             selector="all",
    #             target_ids=[],
    #             num_eligible_workers=0,
    #         ),
    #         day_var=VarDay(
    #             selector="all",
    #             target=0,
    #             start_date=date.today(),
    #             end_date=date.today(),
    #             interval=0,
    #         ),
    #         shift_var=VarShift(
    #             operator="",
    #             selector="equal",
    #             target_ids=["0"],
    #             reference_id="",
    #             relative_id="",
    #         ),
    #     ),
    # },
    # {
    #     "in_text": "Number of consecutive days off less than or equal to 2",
    #     "out_nlp": {
    #         Constants.SHIFT_PATTERN_LABEL: [
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "days off",
    #                 Constants.OPERATOR_PATTERN_LABEL: "less than or equal to",
    #                 Constants.QUANTITY_BLOCK_LABEL: "2",
    #                 Constants.TIMING_PATTERN_LABEL: "consecutive",
    #             }
    #         ],
    #         Constants.WORKER_PATTERN_LABEL: [],
    #     },
    #     "out_map": ConstraintMap(
    #         constraint_type="seq",
    #         operator="less_than_or_equal",
    #         target_value=2,
    #         target_unit="",
    #         worker_var=VarWorker(
    #             operator="",
    #             selector="all",
    #             target_ids=[],
    #             num_eligible_workers=0,
    #         ),
    #         day_var=VarDay(
    #             selector="all",
    #             target=0,
    #             start_date=date.today(),
    #             end_date=date.today(),
    #             interval=0,
    #         ),
    #         shift_var=VarShift(
    #             operator="",
    #             selector="equal",
    #             target_ids=["0"],
    #             reference_id="",
    #             relative_id="",
    #         ),
    #     ),
    # },
    # {
    #     "in_text": "Maximum 2 consecutive days off",
    #     "out_nlp": {
    #         Constants.SHIFT_PATTERN_LABEL: [
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "days off",
    #                 Constants.OPERATOR_PATTERN_LABEL: "Maximum",
    #                 Constants.QUANTITY_BLOCK_LABEL: "2",
    #                 Constants.TIMING_PATTERN_LABEL: "consecutive",
    #             }
    #         ],
    #         Constants.WORKER_PATTERN_LABEL: [],
    #     },
    #     "out_map": ConstraintMap(
    #         constraint_type="seq",
    #         operator="less_than_or_equal",
    #         target_value=2,
    #         target_unit="",
    #         worker_var=VarWorker(
    #             operator="",
    #             selector="all",
    #             target_ids=[],
    #             num_eligible_workers=0,
    #         ),
    #         day_var=VarDay(
    #             selector="all",
    #             target=0,
    #             start_date=date.today(),
    #             end_date=date.today(),
    #             interval=0,
    #         ),
    #         shift_var=VarShift(
    #             operator="",
    #             selector="equal",
    #             target_ids=["0"],
    #             reference_id="",
    #             relative_id="",
    #         ),
    #     ),
    # },
    # {
    #     "in_text": "John should have at least two days off per week",
    #     "out_nlp": {
    #         Constants.SHIFT_PATTERN_LABEL: [
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "days off",
    #                 Constants.OPERATOR_PATTERN_LABEL: "at least",
    #                 Constants.QUANTITY_BLOCK_LABEL: "two",
    #                 Constants.TIMING_PATTERN_LABEL: "per week",
    #             }
    #         ],
    #         Constants.WORKER_PATTERN_LABEL: [
    #             {Constants.NAME_BLOCK_LABEL: "John"}
    #         ],
    #     },
    #     "out_map": ConstraintMap(
    #         constraint_type="seq",
    #         operator="greater_than_or_equal",
    #         target_value=2,
    #         target_unit="",
    #         worker_var=VarWorker(
    #             operator="",
    #             selector="equal",
    #             target_ids=["1"],
    #             num_eligible_workers=0,
    #         ),
    #         day_var=VarDay(
    #             selector="all",
    #             target=0,
    #             start_date=date.today(),
    #             end_date=date.today(),
    #             interval=0,
    #         ),
    #         shift_var=VarShift(
    #             operator="",
    #             selector="equal",
    #             target_ids=["0"],
    #             reference_id="",
    #             relative_id="",
    #         ),
    #     ),
    # },
    # {
    #     "in_text": "At least 2 consecutive night shifts",
    #     "out_nlp": {
    #         Constants.SHIFT_PATTERN_LABEL: [
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "night",
    #                 Constants.OPERATOR_PATTERN_LABEL: "At least",
    #                 Constants.QUANTITY_BLOCK_LABEL: "2",
    #                 Constants.TIMING_PATTERN_LABEL: "consecutive",
    #             }
    #         ],
    #         Constants.WORKER_PATTERN_LABEL: [],
    #     },
    #     "out_map": ConstraintMap(
    #         constraint_type="seq",
    #         operator="greater_than_or_equal",
    #         target_value=2,
    #         target_unit="",
    #         worker_var=VarWorker(
    #             operator="",
    #             selector="all",
    #             target_ids=[],
    #             num_eligible_workers=0,
    #         ),
    #         day_var=VarDay(
    #             selector="all",
    #             target=0,
    #             start_date=date.today(),
    #             end_date=date.today(),
    #             interval=0,
    #         ),
    #         shift_var=VarShift(
    #             operator="",
    #             selector="equal",
    #             target_ids=["3"],
    #             reference_id="",
    #             relative_id="",
    #         ),
    #     ),
    # },
    # {
    #     "in_text": "At most 3 consecutive night shifts",
    #     "out_nlp": {
    #         Constants.SHIFT_PATTERN_LABEL: [
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "night",
    #                 Constants.OPERATOR_PATTERN_LABEL: "At most",
    #                 Constants.QUANTITY_BLOCK_LABEL: "3",
    #                 Constants.TIMING_PATTERN_LABEL: "consecutive",
    #             }
    #         ],
    #         Constants.WORKER_PATTERN_LABEL: [],
    #     },
    #     "out_map": ConstraintMap(
    #         constraint_type="seq",
    #         operator="less_than_or_equal",
    #         target_value=3,
    #         target_unit="",
    #         worker_var=VarWorker(
    #             operator="",
    #             selector="all",
    #             target_ids=[],
    #             num_eligible_workers=0,
    #         ),
    #         day_var=VarDay(
    #             selector="all",
    #             target=0,
    #             start_date=date.today(),
    #             end_date=date.today(),
    #             interval=0,
    #         ),
    #         shift_var=VarShift(
    #             operator="",
    #             selector="equal",
    #             target_ids=["3"],
    #             reference_id="",
    #             relative_id="",
    #         ),
    #     ),
    # },
    # {
    #     "in_text": "At least 2 shifts off per week",
    #     "out_nlp": {
    #         Constants.SHIFT_PATTERN_LABEL: [
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "shifts off",
    #                 Constants.OPERATOR_PATTERN_LABEL: "At least",
    #                 Constants.QUANTITY_BLOCK_LABEL: "2",
    #                 Constants.TIMING_PATTERN_LABEL: "per week",
    #             }
    #         ],
    #         Constants.WORKER_PATTERN_LABEL: [],
    #     },
    #     "out_map": ConstraintMap(
    #         constraint_type="sum",
    #         operator="greater_than_or_equal",
    #         target_value=2,
    #         target_unit="",
    #         worker_var=VarWorker(
    #             operator="",
    #             selector="all",
    #             target_ids=[],
    #             num_eligible_workers=0,
    #         ),
    #         day_var=VarDay(
    #             selector="week",
    #             target=0,
    #             start_date=date.today(),
    #             end_date=date.today(),
    #             interval=0,
    #         ),
    #         shift_var=VarShift(
    #             operator="",
    #             selector="equal",
    #             target_ids=["0"],
    #             reference_id="",
    #             relative_id="",
    #         ),
    #     ),
    # },
    # {
    #     "in_text": "At most 2 shifts off per week",
    #     "out_nlp": {
    #         Constants.SHIFT_PATTERN_LABEL: [
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "shifts off",
    #                 Constants.OPERATOR_PATTERN_LABEL: "At most",
    #                 Constants.QUANTITY_BLOCK_LABEL: "2",
    #                 Constants.TIMING_PATTERN_LABEL: "per week",
    #             }
    #         ],
    #         Constants.WORKER_PATTERN_LABEL: [],
    #     },
    #     "out_map": ConstraintMap(
    #         constraint_type="sum",
    #         operator="less_than_or_equal",
    #         target_value=2,
    #         target_unit="",
    #         worker_var=VarWorker(
    #             operator="",
    #             selector="all",
    #             target_ids=[],
    #             num_eligible_workers=0,
    #         ),
    #         day_var=VarDay(
    #             selector="week",
    #             target=0,
    #             start_date=date.today(),
    #             end_date=date.today(),
    #             interval=0,
    #         ),
    #         shift_var=VarShift(
    #             operator="",
    #             selector="equal",
    #             target_ids=["0"],
    #             reference_id="",
    #             relative_id="",
    #         ),
    #     ),
    # },
    # {
    #     "in_text": "At least 1 night shift per week",
    #     "out_nlp": {
    #         Constants.SHIFT_PATTERN_LABEL: [
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "night",
    #                 Constants.OPERATOR_PATTERN_LABEL: "At least",
    #                 Constants.QUANTITY_BLOCK_LABEL: "1",
    #                 Constants.TIMING_PATTERN_LABEL: "per week",
    #             }
    #         ],
    #         Constants.WORKER_PATTERN_LABEL: [],
    #     },
    #     "out_map": ConstraintMap(
    #         constraint_type="sum",
    #         operator="greater_than_or_equal",
    #         target_value=1,
    #         target_unit="",
    #         worker_var=VarWorker(
    #             operator="",
    #             selector="all",
    #             target_ids=[],
    #             num_eligible_workers=0,
    #         ),
    #         day_var=VarDay(
    #             selector="week",
    #             target=0,
    #             start_date=date.today(),
    #             end_date=date.today(),
    #             interval=0,
    #         ),
    #         shift_var=VarShift(
    #             operator="",
    #             selector="equal",
    #             target_ids=["3"],
    #             reference_id="",
    #             relative_id="",
    #         ),
    #     ),
    # },
    # {
    #     "in_text": "At most 4 night shifts per week",
    #     "out_nlp": {
    #         Constants.SHIFT_PATTERN_LABEL: [
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "night",
    #                 Constants.OPERATOR_PATTERN_LABEL: "At most",
    #                 Constants.QUANTITY_BLOCK_LABEL: "4",
    #                 Constants.TIMING_PATTERN_LABEL: "per week",
    #             }
    #         ],
    #         Constants.WORKER_PATTERN_LABEL: [],
    #     },
    #     "out_map": ConstraintMap(
    #         constraint_type="sum",
    #         operator="less_than_or_equal",
    #         target_value=4,
    #         target_unit="",
    #         worker_var=VarWorker(
    #             operator="",
    #             selector="all",
    #             target_ids=[],
    #             num_eligible_workers=0,
    #         ),
    #         day_var=VarDay(
    #             selector="week",
    #             target=0,
    #             start_date=date.today(),
    #             end_date=date.today(),
    #             interval=0,
    #         ),
    #         shift_var=VarShift(
    #             operator="",
    #             selector="equal",
    #             target_ids=["3"],
    #             reference_id="",
    #             relative_id="",
    #         ),
    #     ),
    # },
    # {
    #     "in_text": "No shift night after afternoon",
    #     "out_nlp": {
    #         Constants.SHIFT_PATTERN_LABEL: [
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "night",
    #                 Constants.OPERATOR_PATTERN_LABEL: "No",
    #                 Constants.TIMING_PATTERN_LABEL: "after",
    #             },
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "afternoon",
    #                 Constants.REFERENCE_BLOCK_LABEL: "night",
    #             },
    #         ],
    #         Constants.WORKER_PATTERN_LABEL: [],
    #     },
    #     "out_map": ConstraintMap(
    #         constraint_type="ord",
    #         operator="no",
    #         target_value=0,
    #         target_unit="",
    #         worker_var=VarWorker(
    #             operator="",
    #             selector="all",
    #             target_ids=[],
    #             num_eligible_workers=0,
    #         ),
    #         day_var=VarDay(
    #             selector="all",
    #             target=0,
    #             start_date=date.today(),
    #             end_date=date.today(),
    #             interval=1,
    #         ),
    #         shift_var=VarShift(
    #             operator="",
    #             selector="equal",
    #             target_ids=[],
    #             reference_id="3",
    #             relative_id="2",
    #         ),
    #     ),
    # },
    # {
    #     "in_text": "No shift morning after night",
    #     "out_nlp": {
    #         Constants.SHIFT_PATTERN_LABEL: [
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "morning",
    #                 Constants.OPERATOR_PATTERN_LABEL: "No",
    #                 Constants.TIMING_PATTERN_LABEL: "after",
    #             },
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "night",
    #                 Constants.REFERENCE_BLOCK_LABEL: "morning",
    #             },
    #         ],
    #         Constants.WORKER_PATTERN_LABEL: [],
    #     },
    #     "out_map": ConstraintMap(
    #         constraint_type="ord",
    #         operator="no",
    #         target_value=0,
    #         target_unit="",
    #         worker_var=VarWorker(
    #             operator="",
    #             selector="all",
    #             target_ids=[],
    #             num_eligible_workers=0,
    #         ),
    #         day_var=VarDay(
    #             selector="all",
    #             target=0,
    #             start_date=date.today(),
    #             end_date=date.today(),
    #             interval=1,
    #         ),
    #         shift_var=VarShift(
    #             operator="",
    #             selector="equal",
    #             target_ids=[],
    #             reference_id="1",
    #             relative_id="3",
    #         ),
    #     ),
    # },
    # {
    #     "in_text": "Shift night after afternoon",
    #     "out_nlp": {
    #         Constants.SHIFT_PATTERN_LABEL: [
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "night",
    #                 Constants.TIMING_PATTERN_LABEL: "after",
    #             },
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "afternoon",
    #                 Constants.REFERENCE_BLOCK_LABEL: "night",
    #             },
    #         ],
    #         Constants.WORKER_PATTERN_LABEL: [],
    #     },
    #     "out_map": ConstraintMap(
    #         constraint_type="ord",
    #         operator="yes",
    #         target_value=0,
    #         target_unit="",
    #         worker_var=VarWorker(
    #             operator="",
    #             selector="all",
    #             target_ids=[],
    #             num_eligible_workers=0,
    #         ),
    #         day_var=VarDay(
    #             selector="all",
    #             target=0,
    #             start_date=date.today(),
    #             end_date=date.today(),
    #             interval=1,
    #         ),
    #         shift_var=VarShift(
    #             operator="",
    #             selector="equal",
    #             target_ids=[],
    #             reference_id="1",
    #             relative_id="3",
    #         ),
    #     ),
    # },
    # {
    #     "in_text": "Shift off after shift duty",
    #     "out_nlp": {
    #         Constants.SHIFT_PATTERN_LABEL: [
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "Shift off",
    #                 Constants.TIMING_PATTERN_LABEL: "after",
    #             },
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "duty",
    #                 Constants.REFERENCE_BLOCK_LABEL: "Shift off",
    #             },
    #         ],
    #         Constants.WORKER_PATTERN_LABEL: [],
    #     },
    #     "out_map": ConstraintMap(
    #         constraint_type="ord",
    #         operator="yes",
    #         target_value=0,
    #         target_unit="",
    #         worker_var=VarWorker(
    #             operator="",
    #             selector="all",
    #             target_ids=[],
    #             num_eligible_workers=0,
    #         ),
    #         day_var=VarDay(
    #             selector="all",
    #             target=0,
    #             start_date=date.today(),
    #             end_date=date.today(),
    #             interval=1,
    #         ),
    #         shift_var=VarShift(
    #             operator="",
    #             selector="equal",
    #             target_ids=[],
    #             reference_id=["0"],  # to be change to list in core and engine
    #             relative_id=["2", "3"],
    #         ),
    #     ),
    # },
    # {
    #     "in_text": "Shift off after duty",
    #     "out_nlp": {
    #         Constants.SHIFT_PATTERN_LABEL: [
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "Shift off",
    #                 Constants.TIMING_PATTERN_LABEL: "after",
    #             },
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "duty",
    #                 Constants.REFERENCE_BLOCK_LABEL: "Shift off",
    #             },
    #         ],
    #         Constants.WORKER_PATTERN_LABEL: [],
    #     },
    #     "out_map": ConstraintMap(
    #         constraint_type="ord",
    #         operator="yes",
    #         target_value=0,
    #         target_unit="",
    #         worker_var=VarWorker(
    #             operator="",
    #             selector="all",
    #             target_ids=[],
    #             num_eligible_workers=0,
    #         ),
    #         day_var=VarDay(
    #             selector="all",
    #             target=0,
    #             start_date=date.today(),
    #             end_date=date.today(),
    #             interval=1,
    #         ),
    #         shift_var=VarShift(
    #             operator="",
    #             selector="equal",
    #             target_ids=[],
    #             reference_id=["0"],  # to be change to list in core and engine
    #             relative_id=["2", "3"],
    #         ),
    #     ),
    # },
    # {
    #     "in_text": "1 shift off after shift duty",
    #     "out_nlp": {
    #         Constants.SHIFT_PATTERN_LABEL: [
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "shift off",
    #                 Constants.TIMING_PATTERN_LABEL: "after",
    #                 Constants.QUANTITY_BLOCK_LABEL: "1",
    #             },
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "duty",
    #                 Constants.REFERENCE_BLOCK_LABEL: "shift off",
    #             },
    #         ],
    #         Constants.WORKER_PATTERN_LABEL: [],
    #     },
    #     "out_map": ConstraintMap(
    #         constraint_type="ord",
    #         operator="yes",
    #         target_value=0,
    #         target_unit="",
    #         worker_var=VarWorker(
    #             operator="",
    #             selector="all",
    #             target_ids=[],
    #             num_eligible_workers=0,
    #         ),
    #         day_var=VarDay(
    #             selector="all",
    #             target=0,
    #             start_date=date.today(),
    #             end_date=date.today(),
    #             interval=1,
    #         ),
    #         shift_var=VarShift(
    #             operator="",
    #             selector="equal",
    #             target_ids=[],
    #             reference_id=["0"],  # to be change to list in core and engine
    #             relative_id=["2", "3"],
    #         ),
    #     ),
    # },
    # {
    #     "in_text": "1 day off after a duty",
    #     "out_nlp": {
    #         Constants.SHIFT_PATTERN_LABEL: [
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "day off",
    #                 Constants.TIMING_PATTERN_LABEL: "after",
    #                 Constants.QUANTITY_BLOCK_LABEL: "1",
    #             },
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "duty",
    #                 Constants.REFERENCE_BLOCK_LABEL: "day off",
    #             },
    #         ],
    #         Constants.WORKER_PATTERN_LABEL: [],
    #     },
    #     "out_map": ConstraintMap(
    #         constraint_type="ord",
    #         operator="yes",
    #         target_value=0,
    #         target_unit="",
    #         worker_var=VarWorker(
    #             operator="",
    #             selector="all",
    #             target_ids=[],
    #             num_eligible_workers=0,
    #         ),
    #         day_var=VarDay(
    #             selector="all",
    #             target=0,
    #             start_date=date.today(),
    #             end_date=date.today(),
    #             interval=1,
    #         ),
    #         shift_var=VarShift(
    #             operator="",
    #             selector="equal",
    #             target_ids=[],
    #             reference_id=["0"],  # to be change to list in core and
    # engine
    #             relative_id=["2", "3"],
    #         ),
    #     ),
    # },
    # {
    #     "in_text": "Number of duties on thursdays should be evenly spread
    # across eligible workers",
    #     "out_nlp": {
    #         Constants.SHIFT_PATTERN_LABEL: [
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "duties",
    #                 Constants.TIMING_PATTERN_LABEL: "thursdays",
    #                 Constants.OPERATOR_PATTERN_LABEL: "evenly",
    #             },
    #         ],
    #         Constants.WORKER_PATTERN_LABEL: [],
    #     },
    #     # NOT DONE!!!
    #     "out_map": ConstraintMap(
    #         constraint_type="ord",
    #         operator="yes",
    #         target_value=0,
    #         target_unit="",
    #         worker_var=VarWorker(
    #             operator="",
    #             selector="all",
    #             target_ids=[],
    #             num_eligible_workers=0,
    #         ),
    #         day_var=VarDay(
    #             selector="all",
    #             target=0,
    #             start_date=date.today(),
    #             end_date=date.today(),
    #             interval=1,
    #         ),
    #         shift_var=VarShift(
    #             operator="",
    #             selector="equal",
    #             target_ids=[],
    #             reference_id=["0"],  # to be change to list in core and
    # engine
    #             relative_id=["2", "3"],
    #         ),
    #     ),
    # },
    # {
    #     "in_text": "Number of duties on thursdays should be evenly spread
    # across surgeons",
    #     "out_nlp": {
    #         Constants.SHIFT_PATTERN_LABEL: [
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "duties",
    #                 Constants.TIMING_PATTERN_LABEL: "thursdays",
    #                 Constants.OPERATOR_PATTERN_LABEL: "evenly",
    #             },
    #         ],
    #         Constants.WORKER_PATTERN_LABEL: [
    #             {Constants.NAME_BLOCK_LABEL: "surgeons"}
    #         ],
    #     },
    #     # NOT DONE!!!
    #     "out_map": ConstraintMap(
    #         constraint_type="ord",
    #         operator="yes",
    #         target_value=0,
    #         target_unit="",
    #         worker_var=VarWorker(
    #             operator="",
    #             selector="all",
    #             target_ids=[],
    #             num_eligible_workers=0,
    #         ),
    #         day_var=VarDay(
    #             selector="all",
    #             target=0,
    #             start_date=date.today(),
    #             end_date=date.today(),
    #             interval=1,
    #         ),
    #         shift_var=VarShift(
    #             operator="",
    #             selector="equal",
    #             target_ids=[],
    #             reference_id=["0"],  # to be change to list in core and
    # engine
    #             relative_id=["2", "3"],
    #         ),
    #     ),
    # },
    # {
    #     "in_text": "Number of duties on fridays should be evenly spread
    # across eligible workers",
    #     "out_nlp": {
    #         Constants.SHIFT_PATTERN_LABEL: [
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "duties",
    #                 Constants.TIMING_PATTERN_LABEL: "fridays",
    #                 Constants.OPERATOR_PATTERN_LABEL: "evenly",
    #             },
    #         ],
    #         Constants.WORKER_PATTERN_LABEL: [],
    #     },
    #     # NOT DONE!!!
    #     "out_map": ConstraintMap(
    #         constraint_type="ord",
    #         operator="yes",
    #         target_value=0,
    #         target_unit="",
    #         worker_var=VarWorker(
    #             operator="",
    #             selector="all",
    #             target_ids=[],
    #             num_eligible_workers=0,
    #         ),
    #         day_var=VarDay(
    #             selector="all",
    #             target=0,
    #             start_date=date.today(),
    #             end_date=date.today(),
    #             interval=1,
    #         ),
    #         shift_var=VarShift(
    #             operator="",
    #             selector="equal",
    #             target_ids=[],
    #             reference_id=["0"],  # to be change to list in core and
    # engine
    #             relative_id=["2", "3"],
    #         ),
    #     ),
    # },
    # {
    #     "in_text": "Number of duties on saturdays should be evenly spread
    # across eligible workers",
    #     "out_nlp": {
    #         Constants.SHIFT_PATTERN_LABEL: [
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "duties",
    #                 Constants.TIMING_PATTERN_LABEL: "saturdays",
    #                 Constants.OPERATOR_PATTERN_LABEL: "evenly",
    #             },
    #         ],
    #         Constants.WORKER_PATTERN_LABEL: [],
    #     },
    #     # NOT DONE!!!
    #     "out_map": ConstraintMap(
    #         constraint_type="ord",
    #         operator="yes",
    #         target_value=0,
    #         target_unit="",
    #         worker_var=VarWorker(
    #             operator="",
    #             selector="all",
    #             target_ids=[],
    #             num_eligible_workers=0,
    #         ),
    #         day_var=VarDay(
    #             selector="all",
    #             target=0,
    #             start_date=date.today(),
    #             end_date=date.today(),
    #             interval=1,
    #         ),
    #         shift_var=VarShift(
    #             operator="",
    #             selector="equal",
    #             target_ids=[],
    #             reference_id=["0"],  # to be change to list in core and
    # engine
    #             relative_id=["2", "3"],
    #         ),
    #     ),
    # },
    # {
    #     "in_text": "Number of duties on sunday should be evenly spread across
    # eligible workers",
    #     "out_nlp": {
    #         Constants.SHIFT_PATTERN_LABEL: [
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "duties",
    #                 Constants.TIMING_PATTERN_LABEL: "sunday",
    #                 Constants.OPERATOR_PATTERN_LABEL: "evenly",
    #             },
    #         ],
    #         Constants.WORKER_PATTERN_LABEL: [],
    #     },
    #     # NOT DONE!!!
    #     "out_map": ConstraintMap(
    #         constraint_type="ord",
    #         operator="yes",
    #         target_value=0,
    #         target_unit="",
    #         worker_var=VarWorker(
    #             operator="",
    #             selector="all",
    #             target_ids=[],
    #             num_eligible_workers=0,
    #         ),
    #         day_var=VarDay(
    #             selector="all",
    #             target=0,
    #             start_date=date.today(),
    #             end_date=date.today(),
    #             interval=1,
    #         ),
    #         shift_var=VarShift(
    #             operator="",
    #             selector="equal",
    #             target_ids=[],
    #             reference_id=["0"],  # to be change to list in core and
    # engine
    #             relative_id=["2", "3"],
    #         ),
    #     ),
    # },
    # {
    #     "in_text": "Number of duties on bank holidays should be evenly spread
    # across eligible workers",
    #     "out_nlp": {
    #         Constants.SHIFT_PATTERN_LABEL: [
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "duties",
    #                 Constants.TIMING_PATTERN_LABEL: "bank holidays",
    #                 Constants.OPERATOR_PATTERN_LABEL: "evenly",
    #             },
    #         ],
    #         Constants.WORKER_PATTERN_LABEL: [],
    #     },
    #     # NOT DONE!!!
    #     "out_map": ConstraintMap(
    #         constraint_type="ord",
    #         operator="yes",
    #         target_value=0,
    #         target_unit="",
    #         worker_var=VarWorker(
    #             operator="",
    #             selector="all",
    #             target_ids=[],
    #             num_eligible_workers=0,
    #         ),
    #         day_var=VarDay(
    #             selector="all",
    #             target=0,
    #             start_date=date.today(),
    #             end_date=date.today(),
    #             interval=1,
    #         ),
    #         shift_var=VarShift(
    #             operator="",
    #             selector="equal",
    #             target_ids=[],
    #             reference_id=["0"],  # to be change to list in core and
    # engine
    #             relative_id=["2", "3"],
    #         ),
    #     ),
    # },
    # {
    #     "in_text": "Number of duties should be evenly spread across eligible
    # workers",
    #     "out_nlp": {
    #         Constants.SHIFT_PATTERN_LABEL: [
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "duties",
    #                 Constants.OPERATOR_PATTERN_LABEL: "evenly",
    #             },
    #         ],
    #         Constants.WORKER_PATTERN_LABEL: [],
    #     },
    #     # NOT DONE!!!
    #     "out_map": ConstraintMap(
    #         constraint_type="ord",
    #         operator="yes",
    #         target_value=0,
    #         target_unit="",
    #         worker_var=VarWorker(
    #             operator="",
    #             selector="all",
    #             target_ids=[],
    #             num_eligible_workers=0,
    #         ),
    #         day_var=VarDay(
    #             selector="all",
    #             target=0,
    #             start_date=date.today(),
    #             end_date=date.today(),
    #             interval=1,
    #         ),
    #         shift_var=VarShift(
    #             operator="",
    #             selector="equal",
    #             target_ids=[],
    #             reference_id=["0"],  # to be change to list in core and
    # engine
    #             relative_id=["2", "3"],
    #         ),
    #     ),
    # },
    # {
    #     "in_text": "60+ workers should do at most 4 duties per month",
    #     "out_nlp": {
    #         Constants.SHIFT_PATTERN_LABEL: [
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "duties",
    #                 Constants.OPERATOR_PATTERN_LABEL: "at most",
    #                 Constants.QUANTITY_BLOCK_LABEL: "4",
    #                 Constants.TIMING_PATTERN_LABEL: "per month",
    #             },
    #         ],
    #         Constants.WORKER_PATTERN_LABEL: [
    #             {Constants.NAME_BLOCK_LABEL: "60+"}
    #         ],
    #     },
    #     # NOT DONE!!!
    #     "out_map": ConstraintMap(
    #         constraint_type="ord",
    #         operator="yes",
    #         target_value=0,
    #         target_unit="",
    #         worker_var=VarWorker(
    #             operator="",
    #             selector="all",
    #             target_ids=[],
    #             num_eligible_workers=0,
    #         ),
    #         day_var=VarDay(
    #             selector="all",
    #             target=0,
    #             start_date=date.today(),
    #             end_date=date.today(),
    #             interval=1,
    #         ),
    #         shift_var=VarShift(
    #             operator="",
    #             selector="equal",
    #             target_ids=[],
    #             reference_id=["0"],  # to be change to list in core and
    # engine
    #             relative_id=["2", "3"],
    #         ),
    #     ),
    # },
    # {
    #     "in_text": "At most 2 consecutive morning consultations",
    #     "out_nlp": {
    #         Constants.SHIFT_PATTERN_LABEL: [
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "morning consultations",
    #                 Constants.OPERATOR_PATTERN_LABEL: "At most",
    #                 Constants.QUANTITY_BLOCK_LABEL: "2",
    #                 Constants.TIMING_PATTERN_LABEL: "consecutive",
    #             }
    #         ],
    #         Constants.WORKER_PATTERN_LABEL: [],
    #     },
    #     # NOT DONE!!!
    #     "out_map": ConstraintMap(
    #         constraint_type="seq",
    #         operator="less_than_or_equal",
    #         target_value=2,
    #         target_unit="",
    #         worker_var=VarWorker(
    #             operator="",
    #             selector="all",
    #             target_ids=[],
    #             num_eligible_workers=0,
    #         ),
    #         day_var=VarDay(
    #             selector="all",
    #             target=0,
    #             start_date=date.today(),
    #             end_date=date.today(),
    #             interval=0,
    #         ),
    #         shift_var=VarShift(
    #             operator="",
    #             selector="equal",
    #             target_ids=["0"],
    #             reference_id="",
    #             relative_id="",
    #         ),
    #     ),
    # },
    # {
    #     "in_text": "60+ workers should only do maternity duties",
    #     "out_nlp": {
    #         Constants.SHIFT_PATTERN_LABEL: [
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "maternity duties",
    #                 Constants.OPERATOR_PATTERN_LABEL: "only",
    #             },
    #         ],
    #         Constants.WORKER_PATTERN_LABEL: [
    #             {Constants.NAME_BLOCK_LABEL: "60+"}
    #         ],
    #     },
    #     # NOT DONE!!!
    #     "out_map": ConstraintMap(
    #         constraint_type="ord",
    #         operator="yes",
    #         target_value=0,
    #         target_unit="",
    #         worker_var=VarWorker(
    #             operator="",
    #             selector="all",
    #             target_ids=[],
    #             num_eligible_workers=0,
    #         ),
    #         day_var=VarDay(
    #             selector="all",
    #             target=0,
    #             start_date=date.today(),
    #             end_date=date.today(),
    #             interval=1,
    #         ),
    #         shift_var=VarShift(
    #             operator="",
    #             selector="equal",
    #             target_ids=[],
    #             reference_id=["0"],  # to be change to list in core and
    # engine
    #             relative_id=["2", "3"],
    #         ),
    #     ),
    # },
    # {
    #     "in_text": "Pregnant workers should not do any duties",
    #     "out_nlp": {
    #         Constants.SHIFT_PATTERN_LABEL: [
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "duties",
    #                 Constants.OPERATOR_PATTERN_LABEL: "not do",
    #             },
    #         ],
    #         Constants.WORKER_PATTERN_LABEL: [
    #             {Constants.NAME_BLOCK_LABEL: "Pregnant"}
    #         ],
    #     },
    #     # NOT DONE!!!
    #     "out_map": ConstraintMap(
    #         constraint_type="ord",
    #         operator="yes",
    #         target_value=0,
    #         target_unit="",
    #         worker_var=VarWorker(
    #             operator="",
    #             selector="all",
    #             target_ids=[],
    #             num_eligible_workers=0,
    #         ),
    #         day_var=VarDay(
    #             selector="all",
    #             target=0,
    #             start_date=date.today(),
    #             end_date=date.today(),
    #             interval=1,
    #         ),
    #         shift_var=VarShift(
    #             operator="",
    #             selector="equal",
    #             target_ids=[],
    #             reference_id=["0"],  # to be change to list in core and
    # engine
    #             relative_id=["2", "3"],
    #         ),
    #     ),
    # },
    # {
    #     "in_text": "Pregnant workers should only do consultations and
    # surgeries",
    #     "out_nlp": {
    #         Constants.SHIFT_PATTERN_LABEL: [
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "consultations",
    #                 Constants.OPERATOR_PATTERN_LABEL: "only",
    #             },
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "surgeries",
    #                 Constants.REFERENCE_BLOCK_LABEL: "consultations",
    #                 Constants.CONNECTOR_BLOCK_LABEL: "and",
    #             },
    #         ],
    #         Constants.WORKER_PATTERN_LABEL: [
    #             {Constants.NAME_BLOCK_LABEL: "Pregnant"}
    #         ],
    #     },
    #     # NOT DONE!!!
    #     "out_map": ConstraintMap(
    #         constraint_type="ord",
    #         operator="yes",
    #         target_value=0,
    #         target_unit="",
    #         worker_var=VarWorker(
    #             operator="",
    #             selector="all",
    #             target_ids=[],
    #             num_eligible_workers=0,
    #         ),
    #         day_var=VarDay(
    #             selector="all",
    #             target=0,
    #             start_date=date.today(),
    #             end_date=date.today(),
    #             interval=1,
    #         ),
    #         shift_var=VarShift(
    #             operator="",
    #             selector="equal",
    #             target_ids=[],
    #             reference_id=["0"],  # to be change to list in core and
    # engine
    #             relative_id=["2", "3"],
    #         ),
    #     ),
    # },
    # {
    #     "in_text": "Pregnant workers should only do consultations, surgeries
    # and classes",
    #     "out_nlp": {
    #         Constants.SHIFT_PATTERN_LABEL: [
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "consultations",
    #                 Constants.OPERATOR_PATTERN_LABEL: "only",
    #             },
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "surgeries",
    #                 Constants.REFERENCE_BLOCK_LABEL: "consultations",
    #                 Constants.CONNECTOR_BLOCK_LABEL: "and",
    #             },
    #             {
    #                 Constants.NAME_BLOCK_LABEL: "classes",
    #                 Constants.REFERENCE_BLOCK_LABEL: "consultations",
    #                 Constants.CONNECTOR_BLOCK_LABEL: "and",
    #             },
    #         ],
    #         Constants.WORKER_PATTERN_LABEL: [
    #             {Constants.NAME_BLOCK_LABEL: "Pregnant"}
    #         ],
    #     },
    #     # NOT DONE!!!
    #     "out_map": ConstraintMap(
    #         constraint_type="ord",
    #         operator="yes",
    #         target_value=0,
    #         target_unit="",
    #         worker_var=VarWorker(
    #             operator="",
    #             selector="all",
    #             target_ids=[],
    #             num_eligible_workers=0,
    #         ),
    #         day_var=VarDay(
    #             selector="all",
    #             target=0,
    #             start_date=date.today(),
    #             end_date=date.today(),
    #             interval=1,
    #         ),
    #         shift_var=VarShift(
    #             operator="",
    #             selector="equal",
    #             target_ids=[],
    #             reference_id=["0"],  # to be change to list in core and
    # engine
    #             relative_id=["2", "3"],
    #         ),
    #     ),
    # },
]
