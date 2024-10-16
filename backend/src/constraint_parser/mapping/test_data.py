# pylint: disable = too-many-lines, R0801
from datetime import date, datetime

from core import (
    Block,
    Constraint,
    ConstraintBuildAugmented,
    ConstraintOperator,
    ConstraintType,
    Shift,
    ShiftLeaveType,
    ShiftRestType,
    ShiftType,
    ShiftWorkerOption,
    Staffing,
    VarDay,
    VarShift,
    VarWorker,
    Worker,
)

shifts = [
    Shift(
        id="0",
        team_id="0",
        name="off",
        start_time=datetime.strptime("00:00", "%H:%M"),
        end_time=datetime.strptime("00:00", "%H:%M"),
        staffing=[Staffing(specialty_id=None, staffing=2)],
        color="#000000",
        shift_type=ShiftType.REST,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id=None,
        deleted=False,
    ),
    Shift(
        id="1",
        team_id="0",
        name="morning",
        start_time=datetime.strptime("08:00", "%H:%M"),
        end_time=datetime.strptime("16:00", "%H:%M"),
        staffing=[Staffing(specialty_id=None, staffing=2)],
        color="#000000",
        shift_type=ShiftType.NORMAL,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id=None,
        deleted=False,
    ),
    Shift(
        id="2",
        team_id="0",
        name="afternoon",
        start_time=datetime.strptime("16:00", "%H:%M"),
        end_time=datetime.strptime("00:00", "%H:%M"),
        staffing=[Staffing(specialty_id=None, staffing=2)],
        color="#000000",
        shift_type=ShiftType.NORMAL,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id=None,
        deleted=False,
    ),
    Shift(
        id="3",
        team_id="0",
        name="night",
        start_time=datetime.strptime("00:00", "%H:%M"),
        end_time=datetime.strptime("08:00", "%H:%M"),
        staffing=[Staffing(specialty_id=None, staffing=2)],
        color="#000000",
        shift_type=ShiftType.NORMAL,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id=None,
        deleted=False,
    ),
    Shift(
        id="4",
        team_id="0",
        name="maternity",
        start_time=datetime.strptime("00:00", "%H:%M"),
        end_time=datetime.strptime("00:00", "%H:%M"),
        staffing=[Staffing(specialty_id=None, staffing=2)],
        color="#000000",
        shift_type=ShiftType.NORMAL,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id=None,
        deleted=False,
    ),
    Shift(
        id="5",
        team_id="0",
        name="consultation",
        start_time=datetime.strptime("08:00", "%H:%M"),
        end_time=datetime.strptime("16:00", "%H:%M"),
        staffing=[Staffing(specialty_id=None, staffing=2)],
        color="#000000",
        shift_type=ShiftType.NORMAL,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id=None,
        deleted=False,
    ),
    Shift(
        id="6",
        team_id="0",
        name="emergency",
        start_time=datetime.strptime("16:00", "%H:%M"),
        end_time=datetime.strptime("00:00", "%H:%M"),
        staffing=[Staffing(specialty_id=None, staffing=2)],
        color="#000000",
        shift_type=ShiftType.NORMAL,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id=None,
        deleted=False,
    ),
    Shift(
        id="7",
        team_id="0",
        name="morning consultation",
        start_time=datetime.strptime("00:00", "%H:%M"),
        end_time=datetime.strptime("00:00", "%H:%M"),
        staffing=[Staffing(specialty_id=None, staffing=2)],
        color="#000000",
        shift_type=ShiftType.NORMAL,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id=None,
        deleted=False,
    ),
]

workers = [
    Worker(
        id="0",
        team_id="0",
        name="john",
        employment_start_date=datetime.today(),
        employment_end_date=None,
        weekly_hours=39,
        weekly_hours_desired=39,
        duties_per_month=10,
        annual_leave=25,
        specialty_ids=[],
        deleted=False,
    ),
    Worker(
        id="1",
        team_id="0",
        name="paul",
        employment_start_date=datetime.today(),
        employment_end_date=None,
        weekly_hours=39,
        weekly_hours_desired=39,
        duties_per_month=10,
        annual_leave=25,
        specialty_ids=[],
        deleted=False,
    ),
    Worker(
        id="2",
        team_id="0",
        name="george",
        employment_start_date=datetime.today(),
        employment_end_date=None,
        weekly_hours=39,
        weekly_hours_desired=39,
        duties_per_month=10,
        annual_leave=25,
        specialty_ids=[],
        deleted=False,
    ),
    Worker(
        id="3",
        team_id="0",
        name="ringo",
        employment_start_date=datetime.today(),
        employment_end_date=None,
        weekly_hours=39,
        weekly_hours_desired=39,
        duties_per_month=10,
        annual_leave=25,
        specialty_ids=[],
        deleted=False,
    ),
    Worker(
        id="4",
        team_id="0",
        name="yoko",
        employment_start_date=datetime.today(),
        employment_end_date=None,
        weekly_hours=39,
        weekly_hours_desired=39,
        duties_per_month=10,
        annual_leave=25,
        specialty_ids=[],
        deleted=False,
    ),
    Worker(
        id="5",
        team_id="0",
        name="linda",
        employment_start_date=datetime.today(),
        employment_end_date=None,
        weekly_hours=39,
        weekly_hours_desired=39,
        duties_per_month=10,
        annual_leave=25,
        specialty_ids=[],
        deleted=False,
    ),
    Worker(
        id="6",
        team_id="0",
        name="maureen",
        employment_start_date=datetime.today(),
        employment_end_date=None,
        weekly_hours=39,
        weekly_hours_desired=39,
        duties_per_month=10,
        annual_leave=25,
        specialty_ids=[],
        deleted=False,
    ),
    Worker(
        id="7",
        team_id="0",
        name="pattie",
        employment_start_date=datetime.today(),
        employment_end_date=None,
        weekly_hours=39,
        weekly_hours_desired=39,
        duties_per_month=10,
        annual_leave=25,
        specialty_ids=[],
        deleted=False,
    ),
    Worker(
        id="8",
        team_id="0",
        name="olivia",
        employment_start_date=datetime.today(),
        employment_end_date=None,
        weekly_hours=39,
        weekly_hours_desired=39,
        duties_per_month=10,
        annual_leave=25,
        specialty_ids=[],
        deleted=False,
    ),
    Worker(
        id="9",
        team_id="0",
        name="barbara",
        employment_start_date=datetime.today(),
        employment_end_date=None,
        weekly_hours=39,
        weekly_hours_desired=39,
        duties_per_month=10,
        annual_leave=25,
        specialty_ids=[],
        deleted=False,
    ),
]


shift_dim_dict = {
    "duty_id": {
        True: ["2", "3"],
        False: ["0", "1", "4", "5", "6", "7"],
    },
    "unit_id": {
        "unit 1": ["0", "1", "2", "3"],
        "unit 2": ["4", "5", "6", "7"],
    },
}
worker_dim_dict = {
    "specialty_id": {"surgeon": ["1", "2"], "anesthesia": ["3", "4"]},
    "60+_id": {
        True: ["4", "5"],
        False: ["0", "1", "2", "3", "6", "7", "8", "9"],
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
        "in": ConstraintBuildAugmented(
            id="",
            team_id="0",
            constraint_type=ConstraintType.SEQ,
            template_id="0",
            language="en",
            blocks=[
                Block(
                    name="worker",
                    type="shift_worker_option",
                    value=[
                        ShiftWorkerOption(
                            name="John",
                            id="0",
                            id_type="worker",
                            is_bool_dim=False,
                            category_name="Workers",
                        )
                    ],
                ),
                Block(name="text", type="string", value="should work"),
                Block(name="operator", type="string", value="at most"),
                Block(name="#", type="number", value=2),
                Block(name="timing", type="string", value="consecutive"),
                Block(
                    name="shift",
                    type="shift_worker_option",
                    value=[
                        ShiftWorkerOption(
                            name="off",
                            id="0",
                            id_type="shift",
                            is_bool_dim=False,
                            category_name="Shifts",
                        )
                    ],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_attributes=[],
        ),
        "out": Constraint(
            id="",
            constraint_type=ConstraintType.SEQ,
            operator=ConstraintOperator.LESS_THAN_OR_EQUAL,
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
        "in": ConstraintBuildAugmented(
            id="",
            team_id="0",
            constraint_type=ConstraintType.SEQ,
            template_id="0",
            language="en",
            blocks=[
                Block(
                    name="worker",
                    type="shift_worker_option",
                    value=[
                        ShiftWorkerOption(
                            name="all workers",
                            id="",
                            id_type="",
                            is_bool_dim=False,
                            category_name="All",
                        ),
                    ],
                ),
                Block(name="text", type="string", value="should work"),
                Block(name="operator", type="string", value="at most"),
                Block(name="#", type="number", value=2),
                Block(name="timing", type="string", value="consecutive"),
                Block(
                    name="shift",
                    type="shift_worker_option",
                    value=[
                        ShiftWorkerOption(
                            name="all shifts",
                            id="",
                            id_type="",
                            is_bool_dim=False,
                            category_name="All",
                        ),
                    ],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_attributes=[],
        ),
        "out": Constraint(
            id="",
            constraint_type=ConstraintType.SEQ,
            operator=ConstraintOperator.LESS_THAN_OR_EQUAL,
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
        "in": ConstraintBuildAugmented(
            id="",
            team_id="0",
            constraint_type=ConstraintType.SEQ,
            template_id="0",
            language="en",
            blocks=[
                Block(
                    name="worker",
                    type="shift_worker_option",
                    value=[
                        ShiftWorkerOption(
                            name=True,
                            id="60+_id",
                            id_type="dimension",
                            is_bool_dim=True,
                            category_name="60+",
                        ),
                    ],
                ),
                Block(name="text", type="string", value="should work"),
                Block(name="operator", type="string", value="at most"),
                Block(name="#", type="number", value=2),
                Block(name="timing", type="string", value="consecutive"),
                Block(
                    name="shift",
                    type="shift_worker_option",
                    value=[
                        ShiftWorkerOption(
                            name=False,
                            id="duty_id",
                            id_type="dimension",
                            is_bool_dim=True,
                            category_name="Duty",
                        ),
                    ],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_attributes=[],
        ),
        "out": Constraint(
            id="",
            constraint_type=ConstraintType.SEQ,
            operator=ConstraintOperator.LESS_THAN_OR_EQUAL,
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
        "in": ConstraintBuildAugmented(
            id="",
            team_id="0",
            constraint_type=ConstraintType.SEQ,
            template_id="0",
            language="en",
            blocks=[
                Block(
                    name="worker",
                    type="shift_worker_option",
                    value=[
                        ShiftWorkerOption(
                            name="surgeon",
                            id="specialty_id",
                            id_type="dimension",
                            is_bool_dim=False,
                            category_name="Specialty",
                        ),
                    ],
                ),
                Block(name="text", type="string", value="should work"),
                Block(name="operator", type="string", value="at most"),
                Block(name="#", type="number", value=2),
                Block(name="timing", type="string", value="consecutive"),
                Block(
                    name="shift",
                    type="shift_worker_option",
                    value=[
                        ShiftWorkerOption(
                            name="unit 1",
                            id="unit_id",
                            id_type="dimension",
                            is_bool_dim=False,
                            category_name="Units",
                        )
                    ],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_attributes=[],
        ),
        "out": Constraint(
            id="",
            constraint_type=ConstraintType.SEQ,
            operator=ConstraintOperator.LESS_THAN_OR_EQUAL,
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
        "in": ConstraintBuildAugmented(
            id="",
            team_id="0",
            constraint_type=ConstraintType.SUM,
            template_id="1",
            language="en",
            blocks=[
                Block(
                    name="worker",
                    type="shift_worker_option",
                    value=[
                        ShiftWorkerOption(
                            name="John",
                            id="0",
                            id_type="worker",
                            is_bool_dim=False,
                            category_name="Workers",
                        )
                    ],
                ),
                Block(name="text", type="string", value="should work"),
                Block(name="operator", type="string", value="at least"),
                Block(name="#", type="number", value=1),
                Block(
                    name="shift",
                    type="shift_worker_option",
                    value=[
                        ShiftWorkerOption(
                            name="off",
                            id="0",
                            id_type="shift",
                            is_bool_dim=False,
                            category_name="Shifts",
                        )
                    ],
                ),
                Block(name="timing", type="string", value="per week"),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_attributes=[],
        ),
        "out": Constraint(
            id="",
            constraint_type=ConstraintType.SUM,
            operator=ConstraintOperator.GREATER_THAN_OR_EQUAL,
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
        "in": ConstraintBuildAugmented(
            id="",
            team_id="0",
            constraint_type=ConstraintType.ORD,
            template_id="2",
            language="en",
            blocks=[
                Block(name="operator", type="string", value="no"),
                Block(
                    name="shift_reference",
                    type="shift_worker_option",
                    value=[
                        ShiftWorkerOption(
                            name="night",
                            id="3",
                            id_type="shift",
                            is_bool_dim=False,
                            category_name="Shifts",
                        ),
                    ],
                ),
                Block(name="#", type="number", value=1),
                Block(name="text", type="string", value="day"),
                Block(name="timing", type="string", value="after"),
                Block(
                    name="shift_relative",
                    type="shift_worker_option",
                    value=[
                        ShiftWorkerOption(
                            name="afternoon",
                            id="2",
                            id_type="shift",
                            is_bool_dim=False,
                            category_name="Shifts",
                        ),
                    ],
                ),
                Block(name="text", type="string", value="for"),
                Block(
                    name="worker",
                    type="shift_worker_option",
                    value=[
                        ShiftWorkerOption(
                            name="John",
                            id="0",
                            id_type="worker",
                            is_bool_dim=False,
                            category_name="Workers",
                        )
                    ],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_attributes=[],
        ),
        "out": Constraint(
            id="",
            constraint_type=ConstraintType.ORD,
            operator=ConstraintOperator.NO,
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
        "in": ConstraintBuildAugmented(
            id="",
            team_id="0",
            constraint_type=ConstraintType.ORD,
            template_id="3",
            language="en",
            blocks=[
                Block(name="text", type="string", value="if"),
                Block(
                    name="shift_reference",
                    type="shift_worker_option",
                    value=[
                        ShiftWorkerOption(
                            name="night",
                            id="3",
                            id_type="shift",
                            is_bool_dim=False,
                            category_name="Shifts",
                        ),
                    ],
                ),
                Block(name="text", type="string", value="then"),
                Block(
                    name="shift_relative",
                    type="shift_worker_option",
                    value=[
                        ShiftWorkerOption(
                            name="off",
                            id="0",
                            id_type="shift",
                            is_bool_dim=False,
                            category_name="Shifts",
                        )
                    ],
                ),
                Block(name="#", type="number", value=1),
                Block(name="text", type="string", value="day"),
                Block(name="timing", type="string", value="after"),
                Block(name="text", type="string", value="for"),
                Block(
                    name="worker",
                    type="shift_worker_option",
                    value=[
                        ShiftWorkerOption(
                            name="John",
                            id="0",
                            id_type="worker",
                            is_bool_dim=False,
                            category_name="Workers",
                        )
                    ],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_attributes=[],
        ),
        "out": Constraint(
            id="",
            constraint_type=ConstraintType.ORD,
            operator=ConstraintOperator.YES,
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
        "in": ConstraintBuildAugmented(
            id="",
            team_id="0",
            constraint_type=ConstraintType.ORD,
            template_id="4",
            language="en",
            blocks=[
                Block(name="text", type="string", value="if"),
                Block(
                    name="shift_reference",
                    type="shift_worker_option",
                    value=[
                        ShiftWorkerOption(
                            name="morning",
                            id="1",
                            id_type="shift",
                            is_bool_dim=False,
                            category_name="Shifts",
                        ),
                    ],
                ),
                Block(name="text", type="string", value="on"),
                Block(name="weekday", type="string", value="saturday"),
                Block(name="text", type="string", value="then"),
                Block(
                    name="shift_relative",
                    type="shift_worker_option",
                    value=[
                        ShiftWorkerOption(
                            name="off",
                            id="0",
                            id_type="shift",
                            is_bool_dim=False,
                            category_name="Shifts",
                        )
                    ],
                ),
                Block(name="#", type="number", value=2),
                Block(name="text", type="string", value="day"),
                Block(name="timing", type="string", value="after"),
                Block(name="text", type="string", value="for"),
                Block(
                    name="worker",
                    type="shift_worker_option",
                    value=[
                        ShiftWorkerOption(
                            name="John",
                            id="0",
                            id_type="worker",
                            is_bool_dim=False,
                            category_name="Workers",
                        )
                    ],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_attributes=[],
        ),
        "out": Constraint(
            id="",
            constraint_type=ConstraintType.ORD,
            operator=ConstraintOperator.YES,
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
        "in": ConstraintBuildAugmented(
            id="",
            team_id="0",
            constraint_type=ConstraintType.ORD,
            template_id="4",
            language="en",
            blocks=[
                Block(name="text", type="string", value="if"),
                Block(
                    name="shift_reference",
                    type="shift_worker_option",
                    value=[
                        ShiftWorkerOption(
                            name="morning",
                            id="1",
                            id_type="shift",
                            is_bool_dim=False,
                            category_name="Shifts",
                        ),
                    ],
                ),
                Block(name="text", type="string", value="on"),
                Block(name="weekday", type="string", value="saturday"),
                Block(name="text", type="string", value="then"),
                Block(
                    name="shift_relative",
                    type="shift_worker_option",
                    value=[
                        ShiftWorkerOption(
                            name="off",
                            id="0",
                            id_type="shift",
                            is_bool_dim=False,
                            category_name="Shifts",
                        )
                    ],
                ),
                Block(name="#", type="number", value=2),
                Block(name="text", type="string", value="day"),
                Block(name="timing", type="string", value="before"),
                Block(name="text", type="string", value="for"),
                Block(
                    name="worker",
                    type="shift_worker_option",
                    value=[
                        ShiftWorkerOption(
                            name="John",
                            id="0",
                            id_type="worker",
                            is_bool_dim=False,
                            category_name="Workers",
                        )
                    ],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_attributes=[],
        ),
        "out": Constraint(
            id="",
            constraint_type=ConstraintType.ORD,
            operator=ConstraintOperator.YES,
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
        "in": ConstraintBuildAugmented(
            id="",
            team_id="0",
            constraint_type=ConstraintType.FIL,
            template_id="5",
            language="en",
            blocks=[
                Block(
                    name="worker",
                    type="shift_worker_option",
                    value=[
                        ShiftWorkerOption(
                            name="John",
                            id="0",
                            id_type="worker",
                            is_bool_dim=False,
                            category_name="Workers",
                        )
                    ],
                ),
                Block(name="operator", type="string", value="should only"),
                Block(name="text", type="string", value="work"),
                Block(
                    name="shift",
                    type="shift_worker_option",
                    value=[
                        ShiftWorkerOption(
                            name="night",
                            id="3",
                            id_type="shift",
                            is_bool_dim=False,
                            category_name="Shifts",
                        ),
                    ],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_attributes=[],
        ),
        "out": Constraint(
            id="",
            constraint_type=ConstraintType.FIL,
            operator=ConstraintOperator.YES,
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
        "in": ConstraintBuildAugmented(
            id="",
            team_id="0",
            constraint_type=ConstraintType.FIL,
            template_id="5",
            language="en",
            blocks=[
                Block(
                    name="worker",
                    type="shift_worker_option",
                    value=[
                        ShiftWorkerOption(
                            name="John",
                            id="0",
                            id_type="worker",
                            is_bool_dim=False,
                            category_name="Workers",
                        )
                    ],
                ),
                Block(name="operator", type="string", value="should not"),
                Block(name="text", type="string", value="work"),
                Block(
                    name="shift",
                    type="shift_worker_option",
                    value=[
                        ShiftWorkerOption(
                            name="night",
                            id="3",
                            id_type="shift",
                            is_bool_dim=False,
                            category_name="Shifts",
                        ),
                    ],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_attributes=[],
        ),
        "out": Constraint(
            id="",
            constraint_type=ConstraintType.FIL,
            operator=ConstraintOperator.NO,
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
        "in": ConstraintBuildAugmented(
            id="",
            team_id="0",
            constraint_type=ConstraintType.EVE,
            template_id="6",
            language="en",
            blocks=[
                Block(
                    name="shift",
                    type="shift_worker_option",
                    value=[
                        ShiftWorkerOption(
                            name="night",
                            id="3",
                            id_type="shift",
                            is_bool_dim=False,
                            category_name="Shifts",
                        ),
                    ],
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
                    type="shift_worker_option",
                    value=[
                        ShiftWorkerOption(
                            name="John",
                            id="0",
                            id_type="worker",
                            is_bool_dim=False,
                            category_name="Workers",
                        )
                    ],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_attributes=[],
        ),
        "out": Constraint(
            id="",
            constraint_type=ConstraintType.EVE,
            operator=None,
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
        "in": ConstraintBuildAugmented(
            id="",
            team_id="0",
            constraint_type=ConstraintType.FAI,
            template_id="7",
            language="en",
            blocks=[
                Block(
                    name="shift",
                    type="shift_worker_option",
                    value=[
                        ShiftWorkerOption(
                            name="night",
                            id="3",
                            id_type="shift",
                            is_bool_dim=False,
                            category_name="Shifts",
                        ),
                    ],
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
                    type="shift_worker_option",
                    value=[
                        ShiftWorkerOption(
                            name="all workers",
                            id="",
                            id_type="",
                            is_bool_dim=False,
                            category_name="All",
                        ),
                    ],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_attributes=[],
        ),
        "out": Constraint(
            id="",
            constraint_type=ConstraintType.FAI,
            operator=None,
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
