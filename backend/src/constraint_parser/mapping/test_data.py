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
                Block(
                    name="worker",
                    type="dict",
                    value=[{"workers": "John"}],
                ),
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
                Block(
                    name="worker",
                    type="dict",
                    value=[{"workers": "John"}],
                ),
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
                Block(
                    name="worker",
                    type="dict",
                    value=[{"all": "all workers"}],
                ),
                Block(name="text", type="string", value="should work"),
                Block(name="operator", type="string", value="at most"),
                Block(name="#", type="number", value=2),
                Block(name="timing", type="string", value="consecutive"),
                Block(
                    name="shift",
                    type="dict",
                    value=[{"all": "all shifts"}],
                ),
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
                selector="all", target_ids=[], num_eligible_workers=0
            ),
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
                Block(
                    name="worker",
                    type="dict",
                    value=[{"all": "all workers"}],
                ),
                Block(name="text", type="string", value="should work"),
                Block(name="operator", type="string", value="at most"),
                Block(name="#", type="number", value=2),
                Block(name="timing", type="string", value="consecutive"),
                Block(
                    name="shift",
                    type="dict",
                    value=[{"all": "all shifts"}],
                ),
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
                Block(
                    name="shift",
                    type="dict",
                    value=[{"duty": "not duty"}],
                ),
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
                Block(
                    name="shift",
                    type="dict",
                    value=[{"duty": "not duty"}],
                ),
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
                Block(
                    name="worker",
                    type="dict",
                    value=[{"workers": "John"}],
                ),
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
                Block(
                    name="worker",
                    type="dict",
                    value=[{"workers": "John"}],
                ),
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
                Block(
                    name="worker",
                    type="dict",
                    value=[{"workers": "John"}],
                ),
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
                Block(
                    name="worker",
                    type="dict",
                    value=[{"workers": "John"}],
                ),
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
                Block(
                    name="worker",
                    type="dict",
                    value=[{"workers": "John"}],
                ),
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
                Block(
                    name="worker",
                    type="dict",
                    value=[{"workers": "John"}],
                ),
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
                Block(
                    name="worker",
                    type="dict",
                    value=[{"workers": "John"}],
                ),
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
                Block(
                    name="worker",
                    type="dict",
                    value=[{"workers": "John"}],
                ),
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
                Block(
                    name="worker",
                    type="dict",
                    value=[{"workers": "John"}],
                ),
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
                Block(
                    name="worker",
                    type="dict",
                    value=[{"workers": "John"}],
                ),
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
                Block(
                    name="worker",
                    type="dict",
                    value=[{"workers": "John"}],
                ),
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
                Block(
                    name="worker",
                    type="dict",
                    value=[{"workers": "John"}],
                ),
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
                Block(
                    name="worker",
                    type="dict",
                    value=[{"workers": "John"}],
                ),
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
                Block(
                    name="worker",
                    type="dict",
                    value=[{"workers": "John"}],
                ),
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
                Block(
                    name="worker",
                    type="dict",
                    value=[{"workers": "John"}],
                ),
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
                Block(
                    name="worker",
                    type="dict",
                    value=[{"workers": "John"}],
                ),
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
                Block(
                    name="worker",
                    type="dict",
                    value=[{"all": "all workers"}],
                ),
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
            worker_var=VarWorker(
                selector="all", target_ids=[], num_eligible_workers=0
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
                Block(
                    name="worker",
                    type="dict",
                    value=[{"all": "all workers"}],
                ),
            ],
        ),
    },
]
