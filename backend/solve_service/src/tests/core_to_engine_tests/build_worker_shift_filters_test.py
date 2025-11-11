from datetime import date
from typing import Dict, List, Set, Tuple

import pytest

from shared.schemas.core import (
    Attribute,
    AttributeOwnerType,
    Dimension,
    DimensionEntryType,
    DimensionType,
    Shift,
    ShiftType,
    Worker,
    WorkerDates,
)

from core_to_engine_service.build_worker_shift_filter import (
    build_worker_shift_filters,
)


def _make_worker_dates(
    workers: List[Worker], campaign_date: date
) -> Dict[str, WorkerDates]:
    return {
        w.id: WorkerDates(dates_hist=[], dates_campaign=[campaign_date])
        for w in workers
    }


def _to_set(
    tuples_list: List[Tuple[str, str, str]],
) -> Set[Tuple[str, str, str]]:
    return set(tuples_list)


def test_no_shared_dimensions_returns_empty(workers_10: List[Worker]):
    # dimensions contain only worker-only or shift-only in the conftest fixture
    dimensions: List[Dimension] = []
    attributes: List[Attribute] = []
    workers = workers_10
    # use a small shifts list consistent with the worker fixture shape
    shifts: List[Shift] = []
    worker_dates = _make_worker_dates(workers, date(2025, 1, 1))

    out, penalty = build_worker_shift_filters(
        workers, worker_dates, shifts, dimensions, attributes, penalty=123
    )

    assert not out
    assert penalty == 123


def test_shared_dimension_but_no_attributes_returns_empty(
    workers_10: List[Worker], shifts_3n_2d: List[Shift]
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
        workers, worker_dates, shifts, [dim_shared], [], penalty=5
    )

    assert not out
    assert penalty == 5


def test_shared_dimension_attributes_only_for_one_worker(
    workers_10: List[Worker], shifts_3n_2d: List[Shift]
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
        workers, worker_dates, shifts, [dim], [attr_w0], penalty=7
    )

    # Because no shift has attributes, the worker with an attribute will have
    # all relevant shifts considered invalid (relevant_shift_ids = all NORMAL/DUTY)
    expected = set()
    for s in shifts:
        expected.add((workers[0].id, date(2025, 1, 1).isoformat(), s.id))

    assert _to_set(out) == expected
    assert penalty == 7


def test_shared_dimension_attributes_only_for_one_shift(
    workers_10: List[Worker], shifts_3n_2d: List[Shift]
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
        workers, worker_dates, shifts, [dim], [attr_s0], penalty=11
    )

    # Since workers don't have matching attributes, the shift with attribute
    # will mark all workers as invalid for that shift
    expected = set()
    for w in workers:
        expected.add((w.id, date(2025, 1, 1).isoformat(), shifts[0].id))

    assert _to_set(out) == expected
    assert penalty == 11


def test_shared_dimension_worker_and_shift_match(
    workers_10: List[Worker], shifts_3n_2d: List[Shift]
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
        workers, worker_dates, shifts, [dim], attributes, penalty=13
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
    workers_10: List[Worker], shifts_3n_2d: List[Shift]
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
        workers, worker_dates, shifts, [dim], attributes, penalty=17
    )

    assert _to_set(out) == set()
    assert penalty == 17
