from datetime import UTC, date, datetime

from shared.schemas.core import (
    Attribute,
    AttributeOwnerType,
    Dimension,
    DimensionEntryType,
    DimensionType,
    Shift,
    ShiftLeaveType,
    ShiftRestType,
    ShiftType,
    SlotRestriction,
    Staffing,
    WeekParity,
    WeeklyPreferences,
    WeeklySlotPreference,
    Worker,
    WorkerDates,
)

from core_to_engine_service.build_worker_shift_filter import (
    BoolSharedPolicy,
    build_worker_shift_filters,
    build_worker_shift_filters_weekly_preferences,
)


def _make_worker_dates(
    workers: list[Worker], campaign_date: date
) -> dict[str, WorkerDates]:
    return {
        w.id: WorkerDates(dates_hist=[], dates_campaign=[campaign_date])
        for w in workers
    }


def _to_set(
    tuples_list: list[tuple[str, str, str]],
) -> set[tuple[str, str, str]]:
    return set(tuples_list)


# pylint: disable=R0801
def test_no_shared_dimensions_returns_empty(workers_10: list[Worker]):
    # dimensions contain only worker-only or shift-only in the conftest fixture
    dimensions: list[Dimension] = []
    attributes: list[Attribute] = []
    workers = workers_10
    # use a small shifts list consistent with the worker fixture shape
    shifts: list[Shift] = []
    worker_dates = _make_worker_dates(workers, date(2025, 1, 1))

    out, penalty = build_worker_shift_filters(
        workers=workers,
        worker_ids_to_worker_dates=worker_dates,
        shifts=shifts,
        dimensions=dimensions,
        attributes=attributes,
        fixed_values={},
        penalty=123,
    )

    assert not out
    assert penalty == 123


def test_shared_dimension_but_no_attributes_returns_empty(
    workers_10: list[Worker], shifts_3n_2d: list[Shift]
):
    # One shared dimension but no attributes provided
    dim_shared = Dimension(
        id="dim_shared",
        team_id="t0",
        dim_types=[DimensionType.WORKER, DimensionType.SHIFT],
        name="shared",
        entry_type=DimensionEntryType.DIM_ENTRIES,
        deleted=False,
    )

    workers = workers_10
    shifts = shifts_3n_2d[:2]
    worker_dates = _make_worker_dates(workers, date(2025, 1, 1))

    out, penalty = build_worker_shift_filters(
        workers=workers,
        worker_ids_to_worker_dates=worker_dates,
        shifts=shifts,
        dimensions=[dim_shared],
        attributes=[],
        fixed_values={},
        penalty=5,
        shared_bool_policies={
            d.id: BoolSharedPolicy.SHIFT_TRUE_ONLY for d in [dim_shared]
        },
    )

    assert not out
    assert penalty == 5


def test_shared_dimension_attributes_only_for_one_worker(
    workers_10: list[Worker], shifts_3n_2d: list[Shift]
):
    # shared dimension; one worker has an attribute, no shift attributes
    dim = Dimension(
        id="dimA",
        team_id="t0",
        dim_types=[DimensionType.WORKER, DimensionType.SHIFT],
        name="dimA",
        entry_type=DimensionEntryType.DIM_ENTRIES,
        deleted=False,
    )

    workers = workers_10[:3]
    shifts = shifts_3n_2d[:2]
    # worker w0 will have dim entry 'de_x'
    attr_w0 = Attribute(
        id="a_w0",
        value="",
        owner_type=AttributeOwnerType.WORKER,
        owner_id=workers[0].id,
        dimension_id=dim.id,
        dim_entry_ids=["de_x"],
    )

    worker_dates = _make_worker_dates(workers, date(2025, 1, 1))

    out, penalty = build_worker_shift_filters(
        workers=workers,
        worker_ids_to_worker_dates=worker_dates,
        shifts=shifts,
        dimensions=[dim],
        attributes=[attr_w0],
        fixed_values={},
        penalty=7,
    )

    # Because no shift has attributes, the worker with an attribute will have
    # all relevant shifts considered invalid (relevant_shift_ids = all NORMAL/DUTY)
    expected = set()
    for s in shifts:
        expected.add((workers[0].id, date(2025, 1, 1).isoformat(), s.id))

    assert _to_set(out) == expected
    assert penalty == 7


def test_shared_dimension_attributes_only_for_one_shift(
    workers_10: list[Worker], shifts_3n_2d: list[Shift]
):
    # shared dimension; one shift has an attribute, no worker attributes
    dim = Dimension(
        id="dimB",
        team_id="t0",
        dim_types=[DimensionType.WORKER, DimensionType.SHIFT],
        name="dimB",
        entry_type=DimensionEntryType.DIM_ENTRIES,
        deleted=False,
    )

    workers = workers_10[:3]
    shifts = shifts_3n_2d[:2]
    # shift s0 has dim entry 'de_y'
    attr_s0 = Attribute(
        id="a_s0",
        value="",
        owner_type=AttributeOwnerType.SHIFT,
        owner_id=shifts[0].id,
        dimension_id=dim.id,
        dim_entry_ids=["de_y"],
    )

    worker_dates = _make_worker_dates(workers, date(2025, 1, 1))

    out, penalty = build_worker_shift_filters(
        workers=workers,
        worker_ids_to_worker_dates=worker_dates,
        shifts=shifts,
        dimensions=[dim],
        attributes=[attr_s0],
        fixed_values={},
        penalty=11,
    )

    # Since workers don't have matching attributes, the shift with attribute
    # will mark all workers as invalid for that shift
    expected = set()
    for w in workers:
        expected.add((w.id, date(2025, 1, 1).isoformat(), shifts[0].id))

    assert _to_set(out) == expected
    assert penalty == 11


def test_shared_dimension_worker_and_shift_match(
    workers_10: list[Worker], shifts_3n_2d: list[Shift]
):
    # shared dimension; worker0 has de_m, shift0 has de_m (match), shift1 has de_n
    dim = Dimension(
        id="dimC",
        team_id="t0",
        dim_types=[DimensionType.WORKER, DimensionType.SHIFT],
        name="dimC",
        entry_type=DimensionEntryType.DIM_ENTRIES,
        deleted=False,
    )

    workers = workers_10[:2]
    shifts = shifts_3n_2d[:2]

    attr_w0 = Attribute(
        id="a_w0_c",
        value="",
        owner_type=AttributeOwnerType.WORKER,
        owner_id=workers[0].id,
        dimension_id=dim.id,
        dim_entry_ids=["de_m"],
    )

    attr_s0 = Attribute(
        id="a_s0_c",
        value="",
        owner_type=AttributeOwnerType.SHIFT,
        owner_id=shifts[0].id,
        dimension_id=dim.id,
        dim_entry_ids=["de_m"],
    )

    attr_s1 = Attribute(
        id="a_s1_c",
        value="",
        owner_type=AttributeOwnerType.SHIFT,
        owner_id=shifts[1].id,
        dimension_id=dim.id,
        dim_entry_ids=["de_n"],
    )

    attributes = [attr_w0, attr_s0, attr_s1]
    worker_dates = _make_worker_dates(workers, date(2025, 1, 1))

    out, penalty = build_worker_shift_filters(
        workers=workers,
        worker_ids_to_worker_dates=worker_dates,
        shifts=shifts,
        dimensions=[dim],
        attributes=attributes,
        fixed_values={},
        penalty=13,
    )

    # Compute expected set:
    # - For worker->shift filtering: worker0 valid for s0 only -> invalid s1
    # - For shift->worker filtering: s0 valid workers {w0} -> invalid w1 for s0
    #   s1 has de_n but no worker with de_n -> invalid all workers for s1
    expected = set()
    # worker0 invalid for s1
    expected.add((workers[0].id, date(2025, 1, 1).isoformat(), shifts[1].id))
    # s0 invalid worker (w1)
    expected.add((workers[1].id, date(2025, 1, 1).isoformat(), shifts[0].id))
    # s1 invalid for all workers
    for w in workers:
        expected.add((w.id, date(2025, 1, 1).isoformat(), shifts[1].id))

    assert _to_set(out) == expected
    assert penalty == 13


def test_shared_dimension_all_workers_and_shifts_no_filtering(
    workers_10: list[Worker], shifts_3n_2d: list[Shift]
):
    # All workers and all shifts share the same dim entry -> no invalid combinations
    dim = Dimension(
        id="dimD",
        team_id="t0",
        dim_types=[DimensionType.WORKER, DimensionType.SHIFT],
        name="dimD",
        entry_type=DimensionEntryType.DIM_ENTRIES,
        deleted=False,
    )

    workers = workers_10[:3]
    shifts = shifts_3n_2d[:2]
    # All owners use the same dim entry id 'de_all'
    attributes = []
    for w in workers:
        attributes.append(
            Attribute(
                id=f"a_w_{w.id}",
                value="",
                owner_type=AttributeOwnerType.WORKER,
                owner_id=w.id,
                dimension_id=dim.id,
                dim_entry_ids=["de_all"],
            )
        )
    for s in shifts:
        attributes.append(
            Attribute(
                id=f"a_s_{s.id}",
                value="",
                owner_type=AttributeOwnerType.SHIFT,
                owner_id=s.id,
                dimension_id=dim.id,
                dim_entry_ids=["de_all"],
            )
        )

    worker_dates = _make_worker_dates(workers, date(2025, 1, 1))

    out, penalty = build_worker_shift_filters(
        workers=workers,
        worker_ids_to_worker_dates=worker_dates,
        shifts=shifts,
        dimensions=[dim],
        attributes=attributes,
        fixed_values={},
        penalty=17,
    )

    assert _to_set(out) == set()
    assert penalty == 17


def test_shared_bool_attributes_only_for_one_worker(
    workers_10: list[Worker], shifts_3n_2d: list[Shift]
):
    # shared boolean dimension; one worker has an attribute True, no shift attrs
    dim = Dimension(
        id="dimBoolA",
        team_id="t0",
        dim_types=[DimensionType.WORKER, DimensionType.SHIFT],
        name="dimBoolA",
        entry_type=DimensionEntryType.BOOL,
        deleted=False,
    )

    workers = workers_10[:3]
    shifts = shifts_3n_2d[:2]
    # worker w0 will have boolean attribute True
    attr_w0 = Attribute(
        id="a_w0_bool",
        value=True,
        owner_type=AttributeOwnerType.WORKER,
        owner_id=workers[0].id,
        dimension_id=dim.id,
        dim_entry_ids=[],
    )

    worker_dates = _make_worker_dates(workers, date(2025, 1, 1))

    out, penalty = build_worker_shift_filters(
        workers=workers,
        worker_ids_to_worker_dates=worker_dates,
        shifts=shifts,
        dimensions=[dim],
        attributes=[attr_w0],
        fixed_values={},
        penalty=7,
    )

    # Because no shift has attributes, the worker with an attribute will have
    # all relevant shifts considered invalid
    expected = set()
    for s in shifts:
        expected.add((workers[0].id, date(2025, 1, 1).isoformat(), s.id))

    assert _to_set(out) == expected
    assert penalty == 7


def test_shared_bool_attributes_only_for_one_shift(
    workers_10: list[Worker], shifts_3n_2d: list[Shift]
):
    # shared boolean dimension; one shift has attribute True, no worker attrs
    dim = Dimension(
        id="dimBoolB",
        team_id="t0",
        dim_types=[DimensionType.WORKER, DimensionType.SHIFT],
        name="dimBoolB",
        entry_type=DimensionEntryType.BOOL,
        deleted=False,
    )

    workers = workers_10[:3]
    shifts = shifts_3n_2d[:2]
    # shift s0 has boolean attribute True
    attr_s0 = Attribute(
        id="a_s0_bool",
        value=True,
        owner_type=AttributeOwnerType.SHIFT,
        owner_id=shifts[0].id,
        dimension_id=dim.id,
        dim_entry_ids=[],
    )

    worker_dates = _make_worker_dates(workers, date(2025, 1, 1))

    out, penalty = build_worker_shift_filters(
        workers=workers,
        worker_ids_to_worker_dates=worker_dates,
        shifts=shifts,
        dimensions=[dim],
        attributes=[attr_s0],
        fixed_values={},
        penalty=11,
    )

    # Since workers don't have matching attributes, the shift with attribute
    # will mark all workers as invalid for that shift
    expected = set()
    for w in workers:
        expected.add((w.id, date(2025, 1, 1).isoformat(), shifts[0].id))

    assert _to_set(out) == expected
    assert penalty == 11


def test_shared_bool_worker_and_shift_match(
    workers_10: list[Worker], shifts_3n_2d: list[Shift]
):
    # shared boolean dimension; worker0 True, shift0 True (match), shift1 False
    dim = Dimension(
        id="dimBoolC",
        team_id="t0",
        dim_types=[DimensionType.WORKER, DimensionType.SHIFT],
        name="dimBoolC",
        entry_type=DimensionEntryType.BOOL,
        deleted=False,
    )

    workers = workers_10[:2]
    shifts = shifts_3n_2d[:2]

    attr_w0 = Attribute(
        id="a_w0_bool_c",
        value=True,
        owner_type=AttributeOwnerType.WORKER,
        owner_id=workers[0].id,
        dimension_id=dim.id,
        dim_entry_ids=[],
    )

    attr_s0 = Attribute(
        id="a_s0_bool_c",
        value=True,
        owner_type=AttributeOwnerType.SHIFT,
        owner_id=shifts[0].id,
        dimension_id=dim.id,
        dim_entry_ids=[],
    )

    attr_s1 = Attribute(
        id="a_s1_bool_c",
        value=False,
        owner_type=AttributeOwnerType.SHIFT,
        owner_id=shifts[1].id,
        dimension_id=dim.id,
        dim_entry_ids=[],
    )

    attributes = [attr_w0, attr_s0, attr_s1]
    worker_dates = _make_worker_dates(workers, date(2025, 1, 1))

    out, penalty = build_worker_shift_filters(
        workers=workers,
        worker_ids_to_worker_dates=worker_dates,
        shifts=shifts,
        dimensions=[dim],
        attributes=attributes,
        fixed_values={},
        penalty=13,
    )

    # Compute expected set (same logic as dim-entry variant):
    expected = set()
    # worker0 invalid for s1
    expected.add((workers[0].id, date(2025, 1, 1).isoformat(), shifts[1].id))
    # s0 invalid worker (w1)
    expected.add((workers[1].id, date(2025, 1, 1).isoformat(), shifts[0].id))
    # s1 invalid for all workers
    for w in workers:
        expected.add((w.id, date(2025, 1, 1).isoformat(), shifts[1].id))

    assert _to_set(out) == expected
    assert penalty == 13


def test_shared_bool_all_workers_and_shifts_no_filtering(
    workers_10: list[Worker], shifts_3n_2d: list[Shift]
):
    # All workers and all shifts share the same boolean value True -> no invalid
    # combinations
    dim = Dimension(
        id="dimBoolD",
        team_id="t0",
        dim_types=[DimensionType.WORKER, DimensionType.SHIFT],
        name="dimBoolD",
        entry_type=DimensionEntryType.BOOL,
        deleted=False,
    )

    workers = workers_10[:3]
    shifts = shifts_3n_2d[:2]
    attributes = []
    for w in workers:
        attributes.append(
            Attribute(
                id=f"a_w_bool_{w.id}",
                value=True,
                owner_type=AttributeOwnerType.WORKER,
                owner_id=w.id,
                dimension_id=dim.id,
                dim_entry_ids=[],
            )
        )
    for s in shifts:
        attributes.append(
            Attribute(
                id=f"a_s_bool_{s.id}",
                value=True,
                owner_type=AttributeOwnerType.SHIFT,
                owner_id=s.id,
                dimension_id=dim.id,
                dim_entry_ids=[],
            )
        )

    worker_dates = _make_worker_dates(workers, date(2025, 1, 1))

    out, penalty = build_worker_shift_filters(
        workers=workers,
        worker_ids_to_worker_dates=worker_dates,
        shifts=shifts,
        dimensions=[dim],
        attributes=attributes,
        fixed_values={},
        penalty=17,
    )

    assert _to_set(out) == set()
    assert penalty == 17


def test_duties_zero_prevents_duty_shifts() -> None:
    # Build two workers: w0 with 0 duties, w1 with >0 duties
    workers: list[Worker] = []
    for i, duties in enumerate((0, 5)):
        workers.append(
            Worker(
                id=f"w{i}",
                team_id="t0",
                name=f"Worker {i}",
                acronym=f"W{i}",
                acronym_custom=False,
                employment_start_date=date(2024, 1, 1),
                employment_end_date=None,
                weekly_hours=40,
                weekly_hours_desired=40,
                duties_per_month=duties,
                annual_leave=25,
                specialty_ids=[],
                deleted=False,
            )
        )

    # Create one NORMAL and one DUTY shift
    shifts: list[Shift] = [
        Shift(
            id="sh_normal",
            team_id="t0",
            name="Normal",
            acronym="N",
            acronym_custom=False,
            start_time=datetime(2025, 1, 1, tzinfo=UTC),
            end_time=datetime(2025, 1, 1, 8, tzinfo=UTC),
            staffing=[Staffing(specialty_id=None, staffing=1)],
            color="#000",
            shift_type=ShiftType.NORMAL,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        ),
        Shift(
            id="sh_duty",
            team_id="t0",
            name="Duty",
            acronym="D",
            acronym_custom=False,
            start_time=datetime(2025, 1, 1, tzinfo=UTC),
            end_time=datetime(2025, 1, 2, tzinfo=UTC),
            staffing=[Staffing(specialty_id=None, staffing=1)],
            color="#111",
            shift_type=ShiftType.DUTY,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=24,
            recuperation_duty_id=None,
            deleted=False,
        ),
    ]

    # Single campaign date
    campaign_date = date(2025, 1, 1)
    worker_dates: dict[str, WorkerDates] = {
        w.id: WorkerDates(dates_hist=[], dates_campaign=[campaign_date])
        for w in workers
    }

    out, _ = build_worker_shift_filters(
        workers=workers,
        worker_ids_to_worker_dates=worker_dates,
        shifts=shifts,
        dimensions=[],
        attributes=[],
        fixed_values={},
        penalty=99,
    )

    # Expect w0 (duties=0) forbidden for duty shift
    expected = {("w0", campaign_date.isoformat(), "sh_duty")}
    assert _to_set(out) >= expected
    # Ensure normal shift is not forbidden for w0
    assert ("w0", campaign_date.isoformat(), "sh_normal") not in _to_set(out)

    # Now set w0 duties to >0 and expect no forbidding for duty shifts
    workers[0].duties_per_month = 3
    out2, _ = build_worker_shift_filters(
        workers=workers,
        worker_ids_to_worker_dates=worker_dates,
        shifts=shifts,
        dimensions=[],
        attributes=[],
        fixed_values={},
        penalty=99,
    )

    assert ("w0", campaign_date.isoformat(), "sh_duty") not in _to_set(out2)
    assert len(out2) == 0


# ---------------------------------------------------------------------------
# WeeklyPreferences helpers
# ---------------------------------------------------------------------------


def _make_worker_with_prefs(
    worker_id: str, prefs: WeeklyPreferences
) -> Worker:
    return Worker(
        id=worker_id,
        team_id="t0",
        name="Test",
        acronym="T",
        acronym_custom=False,
        employment_start_date=date(2025, 1, 1),
        employment_end_date=None,
        weekly_hours=40,
        weekly_hours_desired=40,
        duties_per_month=5,
        annual_leave=20,
        specialty_ids=[],
        deleted=False,
        weekly_preferences=prefs,
    )


def _make_dates_multi(
    workers: list[Worker], campaign_dates: list[date]
) -> dict[str, WorkerDates]:
    return {
        w.id: WorkerDates(dates_hist=[], dates_campaign=campaign_dates)
        for w in workers
    }


def _make_shift_morning_normal(
    shift_id: str, start_hour: int = 8
) -> Shift:
    return Shift(
        id=shift_id,
        team_id="t0",
        name=shift_id,
        acronym=shift_id[:2].upper(),
        acronym_custom=False,
        start_time=datetime(2025, 1, 6, start_hour, 0, tzinfo=UTC),
        end_time=datetime(2025, 1, 6, start_hour + 2, 0, tzinfo=UTC),
        staffing=[Staffing(specialty_id=None, staffing=1)],
        color="#000",
        shift_type=ShiftType.NORMAL,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id=None,
        deleted=False,
    )


def _make_shift_morning_duty(
    shift_id: str, start_hour: int = 8
) -> Shift:
    return Shift(
        id=shift_id,
        team_id="t0",
        name=shift_id,
        acronym=shift_id[:2].upper(),
        acronym_custom=False,
        start_time=datetime(2025, 1, 6, start_hour, 0, tzinfo=UTC),
        end_time=datetime(2025, 1, 7, start_hour, 0, tzinfo=UTC),
        staffing=[Staffing(specialty_id=None, staffing=1)],
        color="#111",
        shift_type=ShiftType.DUTY,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=24,
        recuperation_duty_id=None,
        deleted=False,
    )


# ---------------------------------------------------------------------------
# WeeklyPreferences — NO_WORK
# ---------------------------------------------------------------------------


def test_wp_no_work_empty_slot() -> None:
    """Morning NO_WORK with no shifts starting in the morning slot → empty."""
    prefs = WeeklyPreferences(
        enabled=True,
        slots=[
            WeeklySlotPreference(
                day_of_week=0,
                slot="morning",
                restriction=SlotRestriction.NO_WORK,
            )
        ],
    )
    worker = _make_worker_with_prefs("w0", prefs)
    shift = _make_shift_morning_normal("sn", start_hour=12)
    d = date(2025, 1, 6)
    worker_dates = _make_worker_dates([worker], d)

    out = build_worker_shift_filters_weekly_preferences(
        workers=[worker],
        worker_ids_to_worker_dates=worker_dates,
        shifts=[shift],
    )

    assert _to_set(out) == set()


def test_wp_no_work_shift_starts_before_morning_ends_after() -> None:
    """Shift at 05:00 start (night slot) not caught by morning NO_WORK."""
    prefs = WeeklyPreferences(
        enabled=True,
        slots=[
            WeeklySlotPreference(
                day_of_week=0,
                slot="morning",
                restriction=SlotRestriction.NO_WORK,
            )
        ],
    )
    worker = _make_worker_with_prefs("w0", prefs)
    shift = Shift(
        id="s5",
        team_id="t0", name="s5", acronym="S5", acronym_custom=False,
        start_time=datetime(2025, 1, 6, 5, 0, tzinfo=UTC),
        end_time=datetime(2025, 1, 6, 13, 0, tzinfo=UTC),
        staffing=[Staffing(specialty_id=None, staffing=1)],
        color="#000", shift_type=ShiftType.NORMAL,
        rest_type=ShiftRestType.NONE, leave_type=ShiftLeaveType.NONE,
        recuperation_time=0, recuperation_duty_id=None, deleted=False,
    )
    d = date(2025, 1, 6)
    worker_dates = _make_worker_dates([worker], d)

    out = build_worker_shift_filters_weekly_preferences(
        workers=[worker],
        worker_ids_to_worker_dates=worker_dates,
        shifts=[shift],
    )

    assert _to_set(out) == set()


def test_wp_no_work_shift_starts_before_morning_ends_during() -> None:
    """Shift at 05:00–10:00 (night slot by start) not caught by morning NO_WORK."""
    prefs = WeeklyPreferences(
        enabled=True,
        slots=[
            WeeklySlotPreference(
                day_of_week=0,
                slot="morning",
                restriction=SlotRestriction.NO_WORK,
            )
        ],
    )
    worker = _make_worker_with_prefs("w0", prefs)
    shift = Shift(
        id="s5",
        team_id="t0", name="s5", acronym="S5", acronym_custom=False,
        start_time=datetime(2025, 1, 6, 5, 0, tzinfo=UTC),
        end_time=datetime(2025, 1, 6, 10, 0, tzinfo=UTC),
        staffing=[Staffing(specialty_id=None, staffing=1)],
        color="#000", shift_type=ShiftType.NORMAL,
        rest_type=ShiftRestType.NONE, leave_type=ShiftLeaveType.NONE,
        recuperation_time=0, recuperation_duty_id=None, deleted=False,
    )
    d = date(2025, 1, 6)
    worker_dates = _make_worker_dates([worker], d)

    out = build_worker_shift_filters_weekly_preferences(
        workers=[worker],
        worker_ids_to_worker_dates=worker_dates,
        shifts=[shift],
    )

    assert _to_set(out) == set()


def test_wp_no_work_shift_starts_during_morning_ends_during() -> None:
    """Shift at 08:00–10:00 fully in morning → forbidden by NO_WORK."""
    prefs = WeeklyPreferences(
        enabled=True,
        slots=[
            WeeklySlotPreference(
                day_of_week=0,
                slot="morning",
                restriction=SlotRestriction.NO_WORK,
            )
        ],
    )
    worker = _make_worker_with_prefs("w0", prefs)
    shift = _make_shift_morning_normal("sn")
    d = date(2025, 1, 6)
    worker_dates = _make_worker_dates([worker], d)

    out = build_worker_shift_filters_weekly_preferences(
        workers=[worker],
        worker_ids_to_worker_dates=worker_dates,
        shifts=[shift],
    )

    assert _to_set(out) == {("w0", d.isoformat(), "sn")}


def test_wp_no_work_shift_starts_during_morning_ends_after() -> None:
    """Shift at 08:00–13:00 starts in morning → forbidden by NO_WORK."""
    prefs = WeeklyPreferences(
        enabled=True,
        slots=[
            WeeklySlotPreference(
                day_of_week=0,
                slot="morning",
                restriction=SlotRestriction.NO_WORK,
            )
        ],
    )
    worker = _make_worker_with_prefs("w0", prefs)
    shift = Shift(
        id="s8",
        team_id="t0", name="s8", acronym="S8", acronym_custom=False,
        start_time=datetime(2025, 1, 6, 8, 0, tzinfo=UTC),
        end_time=datetime(2025, 1, 6, 13, 0, tzinfo=UTC),
        staffing=[Staffing(specialty_id=None, staffing=1)],
        color="#000", shift_type=ShiftType.NORMAL,
        rest_type=ShiftRestType.NONE, leave_type=ShiftLeaveType.NONE,
        recuperation_time=0, recuperation_duty_id=None, deleted=False,
    )
    d = date(2025, 1, 6)
    worker_dates = _make_worker_dates([worker], d)

    out = build_worker_shift_filters_weekly_preferences(
        workers=[worker],
        worker_ids_to_worker_dates=worker_dates,
        shifts=[shift],
    )

    assert _to_set(out) == {("w0", d.isoformat(), "s8")}


# ---------------------------------------------------------------------------
# WeeklyPreferences — NO_DUTY
# ---------------------------------------------------------------------------


def test_wp_no_duty_single_duty_shift() -> None:
    """Morning NO_DUTY with one DUTY shift at 08:00 → DUTY forbidden."""
    prefs = WeeklyPreferences(
        enabled=True,
        slots=[
            WeeklySlotPreference(
                day_of_week=0,
                slot="morning",
                restriction=SlotRestriction.NO_DUTY,
            )
        ],
    )
    worker = _make_worker_with_prefs("w0", prefs)
    duty = _make_shift_morning_duty("sd")
    d = date(2025, 1, 6)
    worker_dates = _make_worker_dates([worker], d)

    out = build_worker_shift_filters_weekly_preferences(
        workers=[worker],
        worker_ids_to_worker_dates=worker_dates,
        shifts=[duty],
    )

    assert _to_set(out) == {("w0", d.isoformat(), "sd")}


def test_wp_no_duty_two_duty_shifts() -> None:
    """Morning NO_DUTY with two DUTY shifts → both forbidden."""
    prefs = WeeklyPreferences(
        enabled=True,
        slots=[
            WeeklySlotPreference(
                day_of_week=0,
                slot="morning",
                restriction=SlotRestriction.NO_DUTY,
            )
        ],
    )
    worker = _make_worker_with_prefs("w0", prefs)
    d1 = _make_shift_morning_duty("sd1", start_hour=8)
    d2 = _make_shift_morning_duty("sd2", start_hour=9)
    d = date(2025, 1, 6)
    worker_dates = _make_worker_dates([worker], d)

    out = build_worker_shift_filters_weekly_preferences(
        workers=[worker],
        worker_ids_to_worker_dates=worker_dates,
        shifts=[d1, d2],
    )

    assert _to_set(out) == {
        ("w0", d.isoformat(), "sd1"),
        ("w0", d.isoformat(), "sd2"),
    }


def test_wp_no_duty_normal_shift_not_forbidden() -> None:
    """Morning NO_DUTY with a NORMAL shift → NORMAL passes through."""
    prefs = WeeklyPreferences(
        enabled=True,
        slots=[
            WeeklySlotPreference(
                day_of_week=0,
                slot="morning",
                restriction=SlotRestriction.NO_DUTY,
            )
        ],
    )
    worker = _make_worker_with_prefs("w0", prefs)
    normal = _make_shift_morning_normal("sn")
    d = date(2025, 1, 6)
    worker_dates = _make_worker_dates([worker], d)

    out = build_worker_shift_filters_weekly_preferences(
        workers=[worker],
        worker_ids_to_worker_dates=worker_dates,
        shifts=[normal],
    )

    assert _to_set(out) == set()


# ---------------------------------------------------------------------------
# WeeklyPreferences — NO_NORMAL
# ---------------------------------------------------------------------------


def test_wp_no_normal_single_normal_shift() -> None:
    """Morning NO_NORMAL with one NORMAL shift at 08:00 → NORMAL forbidden."""
    prefs = WeeklyPreferences(
        enabled=True,
        slots=[
            WeeklySlotPreference(
                day_of_week=0,
                slot="morning",
                restriction=SlotRestriction.NO_NORMAL,
            )
        ],
    )
    worker = _make_worker_with_prefs("w0", prefs)
    normal = _make_shift_morning_normal("sn")
    d = date(2025, 1, 6)
    worker_dates = _make_worker_dates([worker], d)

    out = build_worker_shift_filters_weekly_preferences(
        workers=[worker],
        worker_ids_to_worker_dates=worker_dates,
        shifts=[normal],
    )

    assert _to_set(out) == {("w0", d.isoformat(), "sn")}


def test_wp_no_normal_two_normal_shifts() -> None:
    """Morning NO_NORMAL with two NORMAL shifts → both forbidden."""
    prefs = WeeklyPreferences(
        enabled=True,
        slots=[
            WeeklySlotPreference(
                day_of_week=0,
                slot="morning",
                restriction=SlotRestriction.NO_NORMAL,
            )
        ],
    )
    worker = _make_worker_with_prefs("w0", prefs)
    n1 = _make_shift_morning_normal("sn1", start_hour=8)
    n2 = _make_shift_morning_normal("sn2", start_hour=9)
    d = date(2025, 1, 6)
    worker_dates = _make_worker_dates([worker], d)

    out = build_worker_shift_filters_weekly_preferences(
        workers=[worker],
        worker_ids_to_worker_dates=worker_dates,
        shifts=[n1, n2],
    )

    assert _to_set(out) == {
        ("w0", d.isoformat(), "sn1"),
        ("w0", d.isoformat(), "sn2"),
    }


def test_wp_no_normal_duty_shift_not_forbidden() -> None:
    """Morning NO_NORMAL with a DUTY shift → DUTY passes through."""
    prefs = WeeklyPreferences(
        enabled=True,
        slots=[
            WeeklySlotPreference(
                day_of_week=0,
                slot="morning",
                restriction=SlotRestriction.NO_NORMAL,
            )
        ],
    )
    worker = _make_worker_with_prefs("w0", prefs)
    duty = _make_shift_morning_duty("sd")
    d = date(2025, 1, 6)
    worker_dates = _make_worker_dates([worker], d)

    out = build_worker_shift_filters_weekly_preferences(
        workers=[worker],
        worker_ids_to_worker_dates=worker_dates,
        shifts=[duty],
    )

    assert _to_set(out) == set()


# ---------------------------------------------------------------------------
# WeeklyPreferences — week parity
# ---------------------------------------------------------------------------


def test_wp_no_normal_even_weeks_only() -> None:
    """Morning NO_NORMAL even weeks → forbidden only on even-ISO-week dates."""
    prefs = WeeklyPreferences(
        enabled=True,
        slots=[
            WeeklySlotPreference(
                day_of_week=0,
                slot="morning",
                restriction=SlotRestriction.NO_NORMAL,
                week_parity=WeekParity.EVEN,
            )
        ],
    )
    worker = _make_worker_with_prefs("w0", prefs)
    normal = _make_shift_morning_normal("sn")
    even_monday = date(2025, 1, 6)   # ISO week 2 (even), Monday
    odd_monday = date(2025, 1, 13)   # ISO week 3 (odd), Monday
    worker_dates = _make_dates_multi([worker], [even_monday, odd_monday])

    out = build_worker_shift_filters_weekly_preferences(
        workers=[worker],
        worker_ids_to_worker_dates=worker_dates,
        shifts=[normal],
    )

    assert _to_set(out) == {("w0", even_monday.isoformat(), "sn")}


def test_wp_multi_slot_all_normal_even_duty() -> None:
    """Two slot prefs: NO_NORMAL all weeks + NO_DUTY even weeks.

    NORMAL forbidden on both dates; DUTY forbidden only on the even date.
    """
    prefs = WeeklyPreferences(
        enabled=True,
        slots=[
            WeeklySlotPreference(
                day_of_week=0,
                slot="morning",
                restriction=SlotRestriction.NO_NORMAL,
                week_parity=WeekParity.ALL,
            ),
            WeeklySlotPreference(
                day_of_week=0,
                slot="morning",
                restriction=SlotRestriction.NO_DUTY,
                week_parity=WeekParity.EVEN,
            ),
        ],
    )
    worker = _make_worker_with_prefs("w0", prefs)
    normal = _make_shift_morning_normal("sn")
    duty = _make_shift_morning_duty("sd")
    even_monday = date(2025, 1, 6)   # ISO week 2 (even)
    odd_monday = date(2025, 1, 13)   # ISO week 3 (odd)
    worker_dates = _make_dates_multi([worker], [even_monday, odd_monday])

    out = build_worker_shift_filters_weekly_preferences(
        workers=[worker],
        worker_ids_to_worker_dates=worker_dates,
        shifts=[normal, duty],
    )

    assert _to_set(out) == {
        ("w0", even_monday.isoformat(), "sn"),
        ("w0", odd_monday.isoformat(), "sn"),
        ("w0", even_monday.isoformat(), "sd"),
    }


def test_wp_no_duty_odd_weeks_only() -> None:
    """Morning NO_DUTY odd weeks → forbidden only on odd-ISO-week dates."""
    prefs = WeeklyPreferences(
        enabled=True,
        slots=[
            WeeklySlotPreference(
                day_of_week=0,
                slot="morning",
                restriction=SlotRestriction.NO_DUTY,
                week_parity=WeekParity.ODD,
            )
        ],
    )
    worker = _make_worker_with_prefs("w0", prefs)
    duty = _make_shift_morning_duty("sd")
    even_monday = date(2025, 1, 6)   # ISO week 2 (even)
    odd_monday = date(2025, 1, 13)   # ISO week 3 (odd)
    worker_dates = _make_dates_multi([worker], [even_monday, odd_monday])

    out = build_worker_shift_filters_weekly_preferences(
        workers=[worker],
        worker_ids_to_worker_dates=worker_dates,
        shifts=[duty],
    )

    assert _to_set(out) == {("w0", odd_monday.isoformat(), "sd")}
