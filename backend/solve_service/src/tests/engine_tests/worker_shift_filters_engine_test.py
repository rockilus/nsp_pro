from datetime import UTC, date, datetime, timedelta

import pytest
from shared.schemas.core import (
    Assignment,
    AssignmentSource,
    Attribute,
    AttributeOwnerType,
    Dimension,
    DimensionEntryType,
    DimensionType,
    DimEntry,
    EngineInputsAugmented,
    ModelConfig,
    ObjectiveCategory,
    Penalties,
    RequestAugmented,
    RequestStatus,
    RequestType,
    Schedule,
    ScheduleStatus,
    Shift,
    ShiftDemandNew,
    ShiftDemandSource,
    ShiftLeaveType,
    ShiftRestType,
    ShiftType,
    ShiftWorkerOption,
    SlotRestriction,
    Staffing,
    SWOIdTypes,
    WeeklyPreferences,
    WeeklySlotPreference,
    WeekParity,
    Worker,
)

from engine import Outputs
from engine_to_core_service.build_breaches.build_breaches_model import (
    _parse_breaches_engine,
)
from tests.engine_tests.engine_solve import engine_solve_engine_inputs


# pylint: disable=R0801
class TestWorkerShiftFiltersEngine:
    @pytest.fixture
    def ei_filters(
        self, penalties_fix: Penalties, model_config_fix: ModelConfig
    ) -> EngineInputsAugmented:
        # Minimal scenario built from scratch: one schedule date, two workers,
        # two shifts
        schedule = Schedule(
            id="sch0",
            team_id="t0",
            start_date=date(2025, 1, 1),
            end_date=date(2025, 1, 1),
            status=ScheduleStatus.CAMPAIGN,
            missing_coverage_dates=[],
            constraint_build_ids=[],
            quick_staffings=[],
            created_by="user1",
            created_at=datetime(2025, 1, 1),
            updated_at=datetime(2025, 1, 1),
        )

        workers = [
            Worker(
                id=f"w{i}",
                team_id="t0",
                name=f"Worker {i}",
                acronym=f"W{i}",
                acronym_custom=False,
                employment_start_date=date(2025, 1, 1),
                employment_end_date=None,
                weekly_hours=40,
                weekly_hours_desired=40,
                duties_per_month=0,
                annual_leave=0,
                specialty_ids=[],
                deleted=False,
            )
            for i in range(2)
        ]

        shifts = [
            Shift(
                id="s0",
                team_id="t0",
                name="Shift 0",
                acronym="S0",
                acronym_custom=False,
                start_time=datetime(2025, 1, 1, 8, 0),
                end_time=datetime(2025, 1, 1, 18, 0),
                staffing=[Staffing(specialty_id=None, staffing=1)],
                color="blue",
                shift_type=ShiftType.NORMAL,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.NONE,
                recuperation_time=0,
                recuperation_duty_id=None,
                deleted=False,
            ),
            Shift(
                id="s1",
                team_id="t0",
                name="Shift 1",
                acronym="S1",
                acronym_custom=False,
                start_time=datetime(2025, 1, 1, 8, 0),
                end_time=datetime(2025, 1, 1, 18, 0),
                staffing=[Staffing(specialty_id=None, staffing=1)],
                color="green",
                shift_type=ShiftType.NORMAL,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.NONE,
                recuperation_time=0,
                recuperation_duty_id=None,
                deleted=False,
            ),
        ]

        # create shift demands for both shifts on the campaign date so solver
        # has coverage requirements to satisfy (one slot each)
        shift_demands = [
            ShiftDemandNew(
                date=schedule.start_date,
                shift_id=s.id,
                team_id="t0",
                count=1,
                notes=None,
                source=ShiftDemandSource.MANUAL,
                source_id=None,
                created_at=datetime.now(),
                updated_at=datetime.now(),
                id=f"dsd_{s.id}_{schedule.start_date.isoformat()}",
            )
            for s in shifts
        ]

        return EngineInputsAugmented(
            schedule=schedule,
            workers=workers,
            shifts=shifts,
            link_shifts=[],
            dimensions=[],
            dim_entries=[],
            attributes=[],
            as_hist=[],
            as_campaign_fixed=[],
            as_campaign_not_fixed=[],
            cbs_augmented=[],
            shift_demands=shift_demands,
            requests_work=[],
            requests_leave=[],
            model_output=None,
            penalties=penalties_fix,
            model_config=model_config_fix,
        )

    def test_solve_schedule_has_solution_and_no_breaches(
        self, ei_filters: EngineInputsAugmented
    ) -> None:
        # Solve the simple schedule and assert it's a valid solution with no breaches
        ei = ei_filters

        outputs: Outputs = engine_solve_engine_inputs(ei)

        assert outputs.is_solution is True
        assert outputs.objective_value == 0
        assert len(outputs.breaches) == 0

    def test_shift_filtered_out_by_dimension_causes_shift_demand_breach(
        self, ei_filters: EngineInputsAugmented
    ) -> None:
        # Create a shared dimension where the shift has one dim entry and
        # all workers have a different dim entry -> the shift is filtered out
        # for all workers which should produce a daily shift demand breach.
        ei = ei_filters
        dim = Dimension(
            id="dim_shift_only",
            team_id="t0",
            dim_types=[DimensionType.WORKER, DimensionType.SHIFT],
            name="d",
            entry_type=DimensionEntryType.DIM_ENTRIES,
            deleted=False,
        )
        de_filter = DimEntry(
            id="de_filter",
            dimension_id=dim.id,
            name="only_shift",
            deleted=False,
        )
        # attach the exclusive entry to the shift
        attr_shift = Attribute(
            id="a_s",
            value="",
            owner_type=AttributeOwnerType.SHIFT,
            owner_id=ei.shifts[0].id,
            dimension_id=dim.id,
            dim_entry_ids=[de_filter.id],
        )

        ei.dimensions = [dim]
        ei.dim_entries = [de_filter]
        ei.attributes = [attr_shift]

        # run solver
        outputs = engine_solve_engine_inputs(ei)

        # solver should still have found a solution (with coverage penalty)
        assert outputs.is_solution is True

        # confirm there is a single daily shift demand breach
        breaches = _parse_breaches_engine(ei.schedule, outputs.breaches)
        assert len(breaches) == 1
        assert breaches[0].objective_category == ObjectiveCategory.DAILY_SHIFT_DEMAND

        # objective_value should equal the coverage penalty for a normal shift
        expected_pen = ei.penalties.configuration_constraint.coverage.normal
        assert outputs.objective_value == expected_pen

    def test_worker_filtered_out_by_dimension_causes_shift_demand_breach(
        self, ei_filters
    ) -> None:
        # Create a shared dimension where workers have an entry that no
        # shift has -> all workers are filtered out for that shift.
        ei = ei_filters
        dim = Dimension(
            id="dim_worker_only",
            team_id="t0",
            dim_types=[DimensionType.WORKER, DimensionType.SHIFT],
            name="d2",
            entry_type=DimensionEntryType.DIM_ENTRIES,
            deleted=False,
        )
        de_worker = DimEntry(
            id="de_worker",
            dimension_id=dim.id,
            name="only_worker",
            deleted=False,
        )
        # attach the exclusive entry to every worker so none match shifts
        attr_w0 = Attribute(
            id="a_w0",
            value="",
            owner_type=AttributeOwnerType.WORKER,
            owner_id=ei.workers[0].id,
            dimension_id=dim.id,
            dim_entry_ids=[de_worker.id],
        )
        attr_w1 = Attribute(
            id="a_w1",
            value="",
            owner_type=AttributeOwnerType.WORKER,
            owner_id=ei.workers[1].id,
            dimension_id=dim.id,
            dim_entry_ids=[de_worker.id],
        )

        ei.dimensions = [dim]
        ei.dim_entries = [de_worker]
        ei.attributes = [attr_w0, attr_w1]

        outputs = engine_solve_engine_inputs(ei)

        # solver should find a solution but pay a coverage penalty
        assert outputs.is_solution is True

        breaches = _parse_breaches_engine(ei.schedule, outputs.breaches)
        assert len(breaches) == len(ei.shifts)  # one breach per shift
        assert breaches[0].objective_category == ObjectiveCategory.DAILY_SHIFT_DEMAND

        expected_pen = ei.penalties.configuration_constraint.coverage.normal
        assert outputs.objective_value == expected_pen * len(ei.shifts)

    def test_filter_in_but_other_dimension_filters_out_causes_shift_demand_breach(
        self, ei_filters: EngineInputsAugmented
    ) -> None:
        # Two dimensions: first matches (worker+shift), second mismatches ->
        # final result filtered
        # This should filter the shift for the worker and produce a daily shift
        # demand breach
        ei = ei_filters
        dim_ok = Dimension(
            id="dim_ok",
            team_id="t0",
            dim_types=[DimensionType.WORKER, DimensionType.SHIFT],
            name="ok",
            entry_type=DimensionEntryType.DIM_ENTRIES,
            deleted=False,
        )
        de_ok = DimEntry(id="de_ok", dimension_id=dim_ok.id, name="ok", deleted=False)

        dim_bad = Dimension(
            id="dim_bad",
            team_id="t0",
            dim_types=[DimensionType.WORKER, DimensionType.SHIFT],
            name="bad",
            entry_type=DimensionEntryType.DIM_ENTRIES,
            deleted=False,
        )
        de_bad = DimEntry(
            id="de_bad", dimension_id=dim_bad.id, name="bad", deleted=False
        )

        # worker has de_ok for dim_ok and no matching entry for dim_bad
        attr_w_ok = Attribute(
            id="a_w_ok",
            value="",
            owner_type=AttributeOwnerType.WORKER,
            owner_id=ei.workers[0].id,
            dimension_id=dim_ok.id,
            dim_entry_ids=[de_ok.id],
        )
        # shift has de_ok for dim_ok (match) and de_bad for dim_bad (mismatch)
        attr_s_ok = Attribute(
            id="a_s_ok",
            value="",
            owner_type=AttributeOwnerType.SHIFT,
            owner_id=ei.shifts[0].id,
            dimension_id=dim_ok.id,
            dim_entry_ids=[de_ok.id],
        )
        attr_s_bad = Attribute(
            id="a_s_bad",
            value="",
            owner_type=AttributeOwnerType.SHIFT,
            owner_id=ei.shifts[0].id,
            dimension_id=dim_bad.id,
            dim_entry_ids=[de_bad.id],
        )

        ei.dimensions = [dim_ok, dim_bad]
        ei.dim_entries = [de_ok, de_bad]
        ei.attributes = [attr_w_ok, attr_s_ok, attr_s_bad]

        # run solver (no request is provided)
        outputs = engine_solve_engine_inputs(ei)

        # solver should find a solution but pay a coverage penalty
        assert outputs.is_solution is True

        # confirm there is a single daily shift demand breach
        breaches = _parse_breaches_engine(ei.schedule, outputs.breaches)
        assert len(breaches) == 1
        assert breaches[0].objective_category == ObjectiveCategory.DAILY_SHIFT_DEMAND

        # objective_value should equal the coverage penalty for a normal shift
        expected_pen = ei.penalties.configuration_constraint.coverage.normal
        assert outputs.objective_value == expected_pen

    def test_shift_filtered_out_by_bool_dimension_causes_shift_demand_breach(
        self, ei_filters: EngineInputsAugmented
    ) -> None:
        # Shared boolean dimension: shift has a boolean attr but workers do not.
        # This should filter the shift for all workers and cause a breach.
        ei = ei_filters
        dim = Dimension(
            id="dim_shift_only_bool",
            team_id="t0",
            dim_types=[DimensionType.WORKER, DimensionType.SHIFT],
            name="d_bool",
            entry_type=DimensionEntryType.BOOL,
            deleted=False,
        )

        # attach the boolean attr to the shift
        attr_shift = Attribute(
            id="a_s_bool",
            value=True,
            owner_type=AttributeOwnerType.SHIFT,
            owner_id=ei.shifts[0].id,
            dimension_id=dim.id,
            dim_entry_ids=[],
        )

        ei.dimensions = [dim]
        ei.dim_entries = []
        ei.attributes = [attr_shift]

        # run solver
        outputs = engine_solve_engine_inputs(ei)

        # solver should still have found a solution (with coverage penalty)
        assert outputs.is_solution is True

        # confirm there is a single daily shift demand breach
        breaches = _parse_breaches_engine(ei.schedule, outputs.breaches)
        assert len(breaches) == 1
        assert breaches[0].objective_category == ObjectiveCategory.DAILY_SHIFT_DEMAND

        # objective_value should equal the coverage penalty for a normal shift
        expected_pen = ei.penalties.configuration_constraint.coverage.normal
        assert outputs.objective_value == expected_pen

    # def test_worker_filtered_out_by_bool_dimension_causes_shift_demand_breach(
    #     self, ei_filters: EngineInputsAugmented
    # ) -> None:
    #     # Shared boolean dimension: workers have True but shifts lack that attr.
    #     # All workers are therefore filtered out for the shift.
    #     ei = ei_filters
    #     dim = Dimension(
    #         id="dim_worker_only_bool",
    #         team_id="t0",
    #         dim_types=[DimensionType.WORKER, DimensionType.SHIFT],
    #         name="d2_bool",
    #         entry_type=DimensionEntryType.BOOL,
    #         deleted=False,
    #     )

    #     # attach the boolean attr to every worker so none match shifts
    #     attr_w0 = Attribute(
    #         id="a_w0_bool",
    #         value=True,
    #         owner_type=AttributeOwnerType.WORKER,
    #         owner_id=ei.workers[0].id,
    #         dimension_id=dim.id,
    #         dim_entry_ids=[],
    #     )
    #     attr_w1 = Attribute(
    #         id="a_w1_bool",
    #         value=True,
    #         owner_type=AttributeOwnerType.WORKER,
    #         owner_id=ei.workers[1].id,
    #         dimension_id=dim.id,
    #         dim_entry_ids=[],
    #     )

    #     ei.dimensions = [dim]
    #     ei.dim_entries = []
    #     ei.attributes = [attr_w0, attr_w1]

    #     outputs = engine_solve_engine_inputs(ei)

    #     # solver should find a solution but pay a coverage penalty
    #     assert outputs.is_solution is True

    #     breaches = _parse_breaches_engine(ei.schedule, outputs.breaches)
    #     assert len(breaches) == len(ei.shifts)  # one breach per shift
    #     assert (
    #         breaches[0].objective_category
    #         == ObjectiveCategory.DAILY_SHIFT_DEMAND
    #     )

    #     expected_pen = ei.penalties.configuration_constraint.coverage.normal
    #     assert outputs.objective_value == expected_pen * len(ei.shifts)

    def test_filter_in_but_other_bool_dimension_filters_out_causes_shift_demand_breach(
        self, ei_filters: EngineInputsAugmented
    ) -> None:
        # Two boolean dimensions: first matches (worker+shift), second mismatches
        # -> final result filtered and a daily breach produced.
        ei = ei_filters
        dim_ok = Dimension(
            id="dim_ok_bool",
            team_id="t0",
            dim_types=[DimensionType.WORKER, DimensionType.SHIFT],
            name="ok_bool",
            entry_type=DimensionEntryType.BOOL,
            deleted=False,
        )

        dim_bad = Dimension(
            id="dim_bad_bool",
            team_id="t0",
            dim_types=[DimensionType.WORKER, DimensionType.SHIFT],
            name="bad_bool",
            entry_type=DimensionEntryType.BOOL,
            deleted=False,
        )

        # worker has True for dim_ok but no attr for dim_bad
        attr_w_ok = Attribute(
            id="a_w_ok_bool",
            value=True,
            owner_type=AttributeOwnerType.WORKER,
            owner_id=ei.workers[0].id,
            dimension_id=dim_ok.id,
            dim_entry_ids=[],
        )
        # shift has True for dim_ok and True for dim_bad (mismatch for worker)
        attr_s_ok = Attribute(
            id="a_s_ok_bool",
            value=True,
            owner_type=AttributeOwnerType.SHIFT,
            owner_id=ei.shifts[0].id,
            dimension_id=dim_ok.id,
            dim_entry_ids=[],
        )
        attr_s_bad = Attribute(
            id="a_s_bad_bool",
            value=True,
            owner_type=AttributeOwnerType.SHIFT,
            owner_id=ei.shifts[0].id,
            dimension_id=dim_bad.id,
            dim_entry_ids=[],
        )

        ei.dimensions = [dim_ok, dim_bad]
        ei.dim_entries = []
        ei.attributes = [attr_w_ok, attr_s_ok, attr_s_bad]

        # run solver (no request is provided)
        outputs = engine_solve_engine_inputs(ei)

        # solver should find a solution but pay a coverage penalty
        assert outputs.is_solution is True

        # confirm there is a single daily shift demand breach
        breaches = _parse_breaches_engine(ei.schedule, outputs.breaches)
        assert len(breaches) == 1
        assert breaches[0].objective_category == ObjectiveCategory.DAILY_SHIFT_DEMAND

        # objective_value should equal the coverage penalty for a normal shift
        expected_pen = ei.penalties.configuration_constraint.coverage.normal
        assert outputs.objective_value == expected_pen

    def test_worker_with_zero_duties_not_assigned_to_duty(
        self, ei_filters: EngineInputsAugmented
    ) -> None:
        """
        Ensure workers with `duties_per_month == 0` are not assigned
        DUTY shifts.
        """
        ei = ei_filters

        # Make worker0 zero duties, worker1 allowed duties
        ei.workers[0].duties_per_month = 0
        ei.workers[1].duties_per_month = 5

        # Convert second shift to DUTY. fixture already provides demands
        ei.shifts[1].shift_type = ShiftType.DUTY
        ei.shifts[1].recuperation_time = 24
        ei.shifts.append(
            Shift(
                id="sh3",
                team_id="t0",
                name="Recup Shift 2",
                acronym="RS2",
                acronym_custom=False,
                start_time=datetime(2025, 1, 1, 18, tzinfo=UTC),
                end_time=datetime(2025, 1, 2, 18, tzinfo=UTC),
                staffing=[],
                color="#ffffff",
                shift_type=ShiftType.REST,
                rest_type=ShiftRestType.RECUPERATION,
                leave_type=ShiftLeaveType.NONE,
                recuperation_time=0,
                recuperation_duty_id="s1",
                deleted=False,
            )
        )

        outputs: Outputs = engine_solve_engine_inputs(ei)

        # Collect assigned workers for the duty shift
        duty_shift_id = ei.shifts[1].id
        assigned_workers_for_duty = [
            a.worker_id for a in outputs.assignments if a.shift_id == duty_shift_id
        ]
        # worker0 (zero duties) must not be assigned to duty shift
        assert "w0" not in assigned_workers_for_duty
        # worker1 (duties > 0) should be assigned to the duty shift
        assert "w1" in assigned_workers_for_duty


# pylint: disable=too-many-locals
class TestWeeklyPreferencesEngine:
    """Engine-level integration tests for WeeklyPreferences.

    Each test mutates the base EngineInputsAugmented fixture to wire in a
    specific WeeklyPreferences configuration, runs the full solver pipeline,
    and asserts that assignments and breaches match expectations.
    """

    @pytest.fixture
    def ei_weekly_prefs(
        self, penalties_fix: Penalties, model_config_fix: ModelConfig
    ) -> EngineInputsAugmented:
        # 2 Mondays spanning even and odd ISO weeks
        start = date(2025, 1, 6)  # ISO week 2 (even), Monday
        end = date(2025, 1, 13)  # ISO week 3 (odd), Monday

        schedule = Schedule(
            id="sch_wp",
            team_id="t0",
            start_date=start,
            end_date=end,
            status=ScheduleStatus.CAMPAIGN,
            missing_coverage_dates=[],
            constraint_build_ids=[],
            quick_staffings=[],
            created_by="user1",
            created_at=datetime(2025, 1, 6),
            updated_at=datetime(2025, 1, 6),
        )

        workers = [
            Worker(
                id=f"w{i}",
                team_id="t0",
                name=f"Worker {i}",
                acronym=f"W{i}",
                acronym_custom=False,
                employment_start_date=date(2025, 1, 1),
                employment_end_date=None,
                weekly_hours=40,
                weekly_hours_desired=40,
                duties_per_month=5,
                annual_leave=0,
                specialty_ids=[],
                deleted=False,
            )
            for i in range(2)
        ]

        day1 = datetime(2025, 1, 6)

        shifts = [
            Shift(
                id="s_morning_n",
                team_id="t0",
                name="Morning Normal",
                acronym="MN",
                acronym_custom=False,
                start_time=datetime(day1.year, day1.month, day1.day, 8, 0),
                end_time=datetime(day1.year, day1.month, day1.day, 14, 0),
                staffing=[Staffing(specialty_id=None, staffing=1)],
                color="blue",
                shift_type=ShiftType.NORMAL,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.NONE,
                recuperation_time=0,
                recuperation_duty_id=None,
                deleted=False,
            ),
            Shift(
                id="s_afternoon_n",
                team_id="t0",
                name="Afternoon Normal",
                acronym="AN",
                acronym_custom=False,
                start_time=datetime(day1.year, day1.month, day1.day, 14, 0),
                end_time=datetime(day1.year, day1.month, day1.day, 20, 0),
                staffing=[Staffing(specialty_id=None, staffing=1)],
                color="orange",
                shift_type=ShiftType.NORMAL,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.NONE,
                recuperation_time=0,
                recuperation_duty_id=None,
                deleted=False,
            ),
            Shift(
                id="s_morning_d",
                team_id="t0",
                name="Morning Duty",
                acronym="MD",
                acronym_custom=False,
                start_time=datetime(day1.year, day1.month, day1.day, 8, 0),
                end_time=datetime(day1.year, day1.month, day1.day, 16, 0),
                staffing=[Staffing(specialty_id=None, staffing=1)],
                color="red",
                shift_type=ShiftType.DUTY,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.NONE,
                recuperation_time=8,
                recuperation_duty_id=None,
                deleted=False,
            ),
            Shift(
                id="s_recup_d",
                team_id="t0",
                name="Recup Duty",
                acronym="RD",
                acronym_custom=False,
                start_time=datetime(day1.year, day1.month, day1.day, 16, 0),
                end_time=datetime(day1.year, day1.month, day1.day, 0, 0)
                + timedelta(days=1),
                staffing=[],
                color="green",
                shift_type=ShiftType.REST,
                rest_type=ShiftRestType.RECUPERATION,
                leave_type=ShiftLeaveType.NONE,
                recuperation_time=0,
                recuperation_duty_id="s_morning_d",
                deleted=False,
            ),
        ]

        shift_demands = []
        current = start
        while current <= end:
            for s in shifts:
                if s.shift_type == ShiftType.REST:
                    continue
                shift_demands.append(
                    ShiftDemandNew(
                        id=f"dsd_{s.id}_{current}",
                        date=current,
                        shift_id=s.id,
                        team_id="t0",
                        count=1,
                        notes=None,
                        source=ShiftDemandSource.MANUAL,
                        source_id=None,
                        created_at=datetime.now(),
                        updated_at=datetime.now(),
                    )
                )
            current += timedelta(days=1)

        return EngineInputsAugmented(
            schedule=schedule,
            workers=workers,
            shifts=shifts,
            link_shifts=[],
            dimensions=[],
            dim_entries=[],
            attributes=[],
            as_hist=[],
            as_campaign_fixed=[],
            as_campaign_not_fixed=[],
            cbs_augmented=[],
            shift_demands=shift_demands,
            requests_work=[],
            requests_leave=[],
            model_output=None,
            penalties=penalties_fix,
            model_config=model_config_fix,
        )

    def _wp_factory(
        self, day: int, slot: str, restriction: SlotRestriction, parity: WeekParity
    ) -> WeeklyPreferences:
        return WeeklyPreferences(
            enabled=True,
            slots=[
                WeeklySlotPreference(
                    day_of_week=day,
                    slot=slot,
                    restriction=restriction,
                    week_parity=parity,
                )
            ],
        )

    # ------------------------------------------------------------------
    # NO_WORK — coverage breach when all workers filtered
    # ------------------------------------------------------------------
    def test_no_work_all_workers_filtered_causes_breach(
        self, ei_weekly_prefs: EngineInputsAugmented
    ) -> None:
        ei = ei_weekly_prefs
        prefs = self._wp_factory(0, "morning", SlotRestriction.NO_WORK, WeekParity.ALL)
        for w in ei.workers:
            w.weekly_preferences = prefs

        outputs = engine_solve_engine_inputs(ei)
        assert outputs.is_solution is True

        breaches = _parse_breaches_engine(ei.schedule, outputs.breaches)

        monday_dates = {date(2025, 1, 6), date(2025, 1, 13)}
        morning_shift_ids = {"s_morning_n", "s_morning_d"}

        for b in breaches:
            assert b.objective_category == ObjectiveCategory.DAILY_SHIFT_DEMAND, (
                f"Unexpected breach category: {b.objective_category}"
            )

        breach_pairs = {(v.date, v.shift_id) for b in breaches for v in b.variables}
        expected_pairs = {(d, sid) for d in monday_dates for sid in morning_shift_ids}
        assert breach_pairs == expected_pairs, (
            f"Expected breaches for morning shifts on Mondays only.\n"
            f"Expected: {expected_pairs}\nGot: {breach_pairs}"
        )

    # ------------------------------------------------------------------
    # NO_WORK — two workers, one filtered, other covers morning
    # ------------------------------------------------------------------
    def test_no_work_one_filtered_other_covers(
        self, ei_weekly_prefs: EngineInputsAugmented
    ) -> None:
        ei = ei_weekly_prefs
        ei.workers[0].weekly_preferences = self._wp_factory(
            0, "morning", SlotRestriction.NO_WORK, WeekParity.ALL
        )
        ei.workers[1].weekly_preferences = None

        outputs = engine_solve_engine_inputs(ei)
        assert outputs.is_solution is True

        morning_ids = {"s_morning_n", "s_morning_d"}
        monday_dates = {d for d in [date(2025, 1, 6), date(2025, 1, 13)]}
        for a in outputs.assignments:
            if a.worker_id == "w0" and a.date in monday_dates:
                assert a.shift_id not in morning_ids, (
                    f"w0 should never be assigned a morning shift on Monday,"
                    f" got {a.shift_id} on {a.date}"
                )

        breaches = _parse_breaches_engine(ei.schedule, outputs.breaches)

        monday_dates_set = {date(2025, 1, 6), date(2025, 1, 13)}
        for b in breaches:
            assert b.objective_category == ObjectiveCategory.DAILY_SHIFT_DEMAND, (
                f"Unexpected breach category: {b.objective_category}"
            )

        breach_pairs = {(v.date, v.shift_id) for b in breaches for v in b.variables}
        assert breach_pairs == {(d, "s_morning_n") for d in monday_dates_set}, (
            f"Expected breaches for s_morning_n on Mondays only.\n"
            f"Expected: {{(d, 's_morning_n') for d in monday_dates_set}}\n"
            f"Got: {breach_pairs}"
        )

    # ------------------------------------------------------------------
    # NO_DUTY — blocks DUTY, allows NORMAL
    # ------------------------------------------------------------------
    def test_no_duty_blocks_duty_allows_normal(
        self, ei_weekly_prefs: EngineInputsAugmented
    ) -> None:
        ei = ei_weekly_prefs
        ei.workers = [ei.workers[0]]
        ei.workers[0].weekly_preferences = self._wp_factory(
            0, "morning", SlotRestriction.NO_DUTY, WeekParity.ALL
        )

        outputs = engine_solve_engine_inputs(ei)
        assert outputs.is_solution is True

        monday_dates = {date(2025, 1, 6), date(2025, 1, 13)}
        for a in outputs.assignments:
            if a.worker_id == "w0" and a.date in monday_dates:
                assert a.shift_id != "s_morning_d", (
                    "w0 with NO_DUTY must not be assigned morning DUTY on Monday"
                )

        w0_monday_shifts = {
            a.shift_id
            for a in outputs.assignments
            if a.worker_id == "w0" and a.date in monday_dates
        }
        assert "s_morning_n" in w0_monday_shifts, (
            "w0 with NO_DUTY should still be assigned morning NORMAL on Monday"
        )

        breaches = _parse_breaches_engine(ei.schedule, outputs.breaches)

        for b in breaches:
            assert b.objective_category == ObjectiveCategory.DAILY_SHIFT_DEMAND, (
                f"Unexpected breach category: {b.objective_category}"
            )

        breach_pairs = {(v.date, v.shift_id) for b in breaches for v in b.variables}
        all_dates = {
            ei.schedule.start_date + timedelta(days=i)
            for i in range((ei.schedule.end_date - ei.schedule.start_date).days + 1)
        }
        monday_dates = {date(2025, 1, 6), date(2025, 1, 13)}
        non_monday_dates = all_dates - monday_dates
        # NO_DUTY on Monday mornings → s_morning_d breached on both Mondays.
        # With 1 worker, overflow capacity breaches s_morning_n + s_afternoon_n
        # on the remaining non-Monday dates.
        assert breach_pairs == (
            {(d, "s_morning_d") for d in monday_dates}
            | {
                (d, sid)
                for d in non_monday_dates
                for sid in ("s_morning_n", "s_afternoon_n")
            }
        ), f"Unexpected breach pairs: {breach_pairs}"

    # ------------------------------------------------------------------
    # NO_NORMAL — blocks NORMAL, allows DUTY
    # ------------------------------------------------------------------
    def test_no_normal_blocks_normal_allows_duty(
        self, ei_weekly_prefs: EngineInputsAugmented
    ) -> None:
        ei = ei_weekly_prefs
        ei.workers = [ei.workers[0]]
        ei.workers[0].weekly_preferences = self._wp_factory(
            0, "morning", SlotRestriction.NO_NORMAL, WeekParity.ALL
        )

        outputs = engine_solve_engine_inputs(ei)
        assert outputs.is_solution is True

        monday_dates = {date(2025, 1, 6), date(2025, 1, 13)}
        for a in outputs.assignments:
            if a.worker_id == "w0" and a.date in monday_dates:
                assert a.shift_id != "s_morning_n", (
                    "w0 with NO_NORMAL must not be assigned morning NORMAL on Monday"
                )

        breaches = _parse_breaches_engine(ei.schedule, outputs.breaches)

        for b in breaches:
            assert b.objective_category == ObjectiveCategory.DAILY_SHIFT_DEMAND, (
                f"Unexpected breach category: {b.objective_category}"
            )

        breach_pairs = {(v.date, v.shift_id) for b in breaches for v in b.variables}
        all_dates = {
            ei.schedule.start_date + timedelta(days=i)
            for i in range((ei.schedule.end_date - ei.schedule.start_date).days + 1)
        }
        # NO_NORMAL on Monday mornings → s_morning_n filtered on all Mondays.
        # With 1 worker, overflow capacity breaches s_morning_n + s_afternoon_n
        # on every schedule date.
        assert breach_pairs == {
            (d, sid) for d in all_dates for sid in ("s_morning_n", "s_afternoon_n")
        }, f"Unexpected breach pairs: {breach_pairs}"

    # ------------------------------------------------------------------
    # Multiple slot prefs — NO_NORMAL morning + NO_DUTY afternoon
    # ------------------------------------------------------------------
    def test_multiple_prefs_both_respected(
        self, ei_weekly_prefs: EngineInputsAugmented
    ) -> None:
        ei = ei_weekly_prefs
        # Add an afternoon DUTY for the afternoon NO_DUTY pref to apply to
        afternoon_duty = Shift(
            id="s_afternoon_d",
            team_id="t0",
            name="Afternoon Duty",
            acronym="AD",
            acronym_custom=False,
            start_time=datetime(2025, 1, 6, 14, 0),
            end_time=datetime(2025, 1, 6, 22, 0),
            staffing=[Staffing(specialty_id=None, staffing=1)],
            color="purple",
            shift_type=ShiftType.DUTY,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=8,
            recuperation_duty_id=None,
            deleted=False,
        )
        recup_ad = Shift(
            id="s_recup_ad",
            team_id="t0",
            name="Recup AD",
            acronym="RA",
            acronym_custom=False,
            start_time=datetime(2025, 1, 6, 22, 0),
            end_time=datetime(2025, 1, 7, 8, 0),
            staffing=[],
            color="pink",
            shift_type=ShiftType.REST,
            rest_type=ShiftRestType.RECUPERATION,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty_id="s_afternoon_d",
            deleted=False,
        )
        ei.shifts.extend([afternoon_duty, recup_ad])
        current = ei.schedule.start_date
        while current <= ei.schedule.end_date:
            ei.shift_demands.append(
                ShiftDemandNew(
                    id=f"dsd_s_afternoon_d_{current}",
                    date=current,
                    shift_id="s_afternoon_d",
                    team_id="t0",
                    count=1,
                    notes=None,
                    source=ShiftDemandSource.MANUAL,
                    source_id=None,
                    created_at=datetime.now(),
                    updated_at=datetime.now(),
                )
            )
            current += timedelta(days=1)

        ei.workers = [ei.workers[0]]
        ei.workers[0].weekly_preferences = WeeklyPreferences(
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
                    slot="afternoon",
                    restriction=SlotRestriction.NO_DUTY,
                    week_parity=WeekParity.ALL,
                ),
            ],
        )

        outputs = engine_solve_engine_inputs(ei)
        assert outputs.is_solution is True

        monday_dates = {date(2025, 1, 6), date(2025, 1, 13)}
        for a in outputs.assignments:
            if a.worker_id == "w0" and a.date in monday_dates:
                assert a.shift_id != "s_morning_n", (
                    "NO_NORMAL morning pref not respected"
                )
                assert a.shift_id != "s_afternoon_d", (
                    "NO_DUTY afternoon pref not respected"
                )

        breaches = _parse_breaches_engine(ei.schedule, outputs.breaches)

        for b in breaches:
            assert b.objective_category == ObjectiveCategory.DAILY_SHIFT_DEMAND, (
                f"Unexpected breach category: {b.objective_category}"
            )

        breach_pairs = {(v.date, v.shift_id) for b in breaches for v in b.variables}
        monday_dates = {date(2025, 1, 6), date(2025, 1, 13)}
        all_dates = {
            ei.schedule.start_date + timedelta(days=i)
            for i in range((ei.schedule.end_date - ei.schedule.start_date).days + 1)
        }
        non_monday_dates = all_dates - monday_dates
        # NO_NORMAL morning + NO_DUTY afternoon on Mondays.
        # 1 worker → s_morning_n, s_afternoon_n, s_afternoon_d breached on Mondays.
        # On non-Mondays: s_afternoon_n + s_morning_d overflow due to capacity.
        assert breach_pairs == (
            {
                (d, sid)
                for d in monday_dates
                for sid in ("s_morning_n", "s_afternoon_n", "s_afternoon_d")
            }
            | {
                (d, sid)
                for d in non_monday_dates
                for sid in ("s_afternoon_n", "s_morning_d")
            }
        ), f"Unexpected breach pairs: {breach_pairs}"

    # ------------------------------------------------------------------
    # Week parity EVEN — blocked only on even-ISO-week dates
    # ------------------------------------------------------------------
    def test_week_parity_even_blocks_even_dates_only(
        self, ei_weekly_prefs: EngineInputsAugmented
    ) -> None:
        ei = ei_weekly_prefs
        ei.workers = [ei.workers[0]]
        ei.workers[0].weekly_preferences = self._wp_factory(
            0, "morning", SlotRestriction.NO_WORK, WeekParity.EVEN
        )

        outputs = engine_solve_engine_inputs(ei)
        assert outputs.is_solution is True

        even_date = date(2025, 1, 6)
        odd_date = date(2025, 1, 13)

        for a in outputs.assignments:
            if a.worker_id == "w0" and a.date == even_date:
                assert a.shift_id not in {"s_morning_n", "s_morning_d"}, (
                    "NO_WORK EVEN must block morning on even-week date"
                )

        w0_odd_shifts = {
            a.shift_id
            for a in outputs.assignments
            if a.worker_id == "w0" and a.date == odd_date
        }
        assert w0_odd_shifts, "w0 should be assigned on odd-week date"

        breaches = _parse_breaches_engine(ei.schedule, outputs.breaches)

        for b in breaches:
            assert b.objective_category == ObjectiveCategory.DAILY_SHIFT_DEMAND, (
                f"Unexpected breach category: {b.objective_category}"
            )

        breach_pairs = {(v.date, v.shift_id) for b in breaches for v in b.variables}
        even_date = date(2025, 1, 6)
        all_dates = {
            ei.schedule.start_date + timedelta(days=i)
            for i in range((ei.schedule.end_date - ei.schedule.start_date).days + 1)
        }
        odd_dates = all_dates - {even_date}
        # NO_WORK EVEN on Monday morning → both morning shifts breached on even Monday.
        # With 1 worker, overflow breaches s_morning_n + s_afternoon_n on all other dates.
        assert breach_pairs == (
            {(even_date, "s_morning_n"), (even_date, "s_morning_d")}
            | {(d, sid) for d in odd_dates for sid in ("s_morning_n", "s_afternoon_n")}
        ), f"Unexpected breach pairs: {breach_pairs}"

    # ------------------------------------------------------------------
    # Week parity ALL — blocks all dates (both even and odd)
    # ------------------------------------------------------------------
    def test_week_parity_all_blocks_all_dates(
        self, ei_weekly_prefs: EngineInputsAugmented
    ) -> None:
        ei = ei_weekly_prefs
        ei.workers = [ei.workers[0]]
        ei.workers[0].weekly_preferences = self._wp_factory(
            0, "morning", SlotRestriction.NO_NORMAL, WeekParity.ALL
        )

        outputs = engine_solve_engine_inputs(ei)
        assert outputs.is_solution is True

        for a in outputs.assignments:
            if a.worker_id == "w0":
                assert a.shift_id != "s_morning_n", (
                    "NO_NORMAL ALL must block morning NORMAL on every date"
                )

    # ------------------------------------------------------------------
    # Day-of-week filter — Monday blocked, other days allowed
    # ------------------------------------------------------------------
    def test_day_of_week_monday_blocked_tuesday_allowed(
        self, ei_weekly_prefs: EngineInputsAugmented
    ) -> None:
        ei = ei_weekly_prefs
        # Extend campaign to include Tuesday 2025-01-07
        ei.schedule.end_date = date(2025, 1, 7)
        tuesday = date(2025, 1, 7)
        for s in ei.shifts:
            if s.shift_type == ShiftType.REST:
                continue
            ei.shift_demands.append(
                ShiftDemandNew(
                    id=f"dsd_{s.id}_{tuesday}",
                    date=tuesday,
                    shift_id=s.id,
                    team_id="t0",
                    count=1,
                    notes=None,
                    source=ShiftDemandSource.MANUAL,
                    source_id=None,
                    created_at=datetime.now(),
                    updated_at=datetime.now(),
                )
            )

        ei.workers = [ei.workers[0]]
        ei.workers[0].weekly_preferences = self._wp_factory(
            0, "morning", SlotRestriction.NO_WORK, WeekParity.ALL
        )

        outputs = engine_solve_engine_inputs(ei)
        assert outputs.is_solution is True

        monday = date(2025, 1, 6)
        morning_ids = {"s_morning_n", "s_morning_d"}

        for a in outputs.assignments:
            if a.worker_id == "w0" and a.date == monday:
                assert a.shift_id not in morning_ids, (
                    "Monday morning NO_WORK must block morning on Monday"
                )

        w0_tuesday_shifts = {
            a.shift_id
            for a in outputs.assignments
            if a.worker_id == "w0" and a.date == tuesday
        }
        assert w0_tuesday_shifts, "w0 should be assigned on Tuesday"

        breaches = _parse_breaches_engine(ei.schedule, outputs.breaches)

        for b in breaches:
            assert b.objective_category == ObjectiveCategory.DAILY_SHIFT_DEMAND, (
                f"Unexpected breach category: {b.objective_category}"
            )

        breach_pairs = {(v.date, v.shift_id) for b in breaches for v in b.variables}
        # NO_WORK Monday morning → both morning shifts breached on Monday.
        # 1 worker, 2 days → s_morning_n + s_afternoon_n overflow on Tuesday.
        assert breach_pairs == {
            (date(2025, 1, 6), "s_morning_n"),
            (date(2025, 1, 6), "s_morning_d"),
            (date(2025, 1, 7), "s_morning_n"),
            (date(2025, 1, 7), "s_afternoon_n"),
        }, f"Unexpected breach pairs: {breach_pairs}"

    # ------------------------------------------------------------------
    # Disabled prefs — no restriction applied
    # ------------------------------------------------------------------
    def test_disabled_prefs_no_restriction(
        self, ei_weekly_prefs: EngineInputsAugmented
    ) -> None:
        ei = ei_weekly_prefs
        ei.workers = [ei.workers[0]]
        ei.workers[0].weekly_preferences = WeeklyPreferences(
            enabled=False,
            slots=[
                WeeklySlotPreference(
                    day_of_week=0,
                    slot="morning",
                    restriction=SlotRestriction.NO_WORK,
                    week_parity=WeekParity.ALL,
                )
            ],
        )

        outputs = engine_solve_engine_inputs(ei)
        assert outputs.is_solution is True

        w0_morning = [
            a
            for a in outputs.assignments
            if a.worker_id == "w0" and a.shift_id in {"s_morning_n", "s_morning_d"}
        ]
        assert len(w0_morning) > 0, "Disabled prefs must not filter morning shifts"

        breaches = _parse_breaches_engine(ei.schedule, outputs.breaches)

        for b in breaches:
            assert b.objective_category == ObjectiveCategory.DAILY_SHIFT_DEMAND, (
                f"Unexpected breach category: {b.objective_category}"
            )

        breach_pairs = {(v.date, v.shift_id) for b in breaches for v in b.variables}
        all_dates = {
            ei.schedule.start_date + timedelta(days=i)
            for i in range((ei.schedule.end_date - ei.schedule.start_date).days + 1)
        }
        # Prefs disabled → no filtering applied. 1 worker cannot cover all demand
        # across 8 days → s_morning_n + s_afternoon_n breached on every date.
        assert breach_pairs == {
            (d, sid) for d in all_dates for sid in ("s_morning_n", "s_afternoon_n")
        }, f"Unexpected breach pairs: {breach_pairs}"

    # ------------------------------------------------------------------
    # NO_WORK stacked with dim filters — both respected
    # ------------------------------------------------------------------
    def test_no_work_combined_with_dim_filter_causes_breach(
        self, ei_weekly_prefs: EngineInputsAugmented
    ) -> None:
        ei = ei_weekly_prefs
        # w0: morning NO_WORK weekly pref
        ei.workers[0].weekly_preferences = self._wp_factory(
            0, "morning", SlotRestriction.NO_WORK, WeekParity.ALL
        )
        # w1: filtered out of morning shifts via shared dimension
        dim = Dimension(
            id="dim_wp_stack",
            team_id="t0",
            dim_types=[DimensionType.WORKER, DimensionType.SHIFT],
            name="stack",
            entry_type=DimensionEntryType.DIM_ENTRIES,
            deleted=False,
        )
        de_only = DimEntry(
            id="de_wp_stack", dimension_id=dim.id, name="only_shift", deleted=False
        )
        # shift has the exclusive entry; workers don't → w1 filtered out
        attr_s = Attribute(
            id="a_wp_stack",
            value="",
            owner_type=AttributeOwnerType.SHIFT,
            owner_id="s_morning_n",
            dimension_id=dim.id,
            dim_entry_ids=[de_only.id],
        )
        ei.dimensions = [dim]
        ei.dim_entries = [de_only]
        ei.attributes = [attr_s]

        outputs = engine_solve_engine_inputs(ei)
        assert outputs.is_solution is True

        breaches = _parse_breaches_engine(ei.schedule, outputs.breaches)

        all_dates = {
            ei.schedule.start_date + timedelta(days=i)
            for i in range((ei.schedule.end_date - ei.schedule.start_date).days + 1)
        }

        for b in breaches:
            assert b.objective_category == ObjectiveCategory.DAILY_SHIFT_DEMAND, (
                f"Unexpected breach category: {b.objective_category}"
            )

        breach_pairs = {(v.date, v.shift_id) for b in breaches for v in b.variables}
        # w0 is NO_WORK on Monday mornings, w1 is dim-filtered from s_morning_n
        # on all dates. Combined with work time constraints, s_morning_n is
        # breached on every date in the schedule. No other shift is breached.
        assert breach_pairs == {(d, "s_morning_n") for d in all_dates}, (
            f"Expected breaches for s_morning_n on all schedule dates only.\n"
            f"Expected: {{(d, 's_morning_n') for d in all_dates}}\nGot: {breach_pairs}"
        )

    # ------------------------------------------------------------------
    # NO_WORK pref overridden by positive WORK_DEMAND request
    # ------------------------------------------------------------------
    def test_no_work_overridden_by_work_request(
        self, ei_weekly_prefs: EngineInputsAugmented
    ) -> None:
        ei = ei_weekly_prefs
        # w0: NO_WORK on Monday morning
        ei.workers[0].weekly_preferences = self._wp_factory(
            0, "morning", SlotRestriction.NO_WORK, WeekParity.ALL
        )
        ei.workers[1].weekly_preferences = None

        # w0 also has an APPROVED positive WORK_DEMAND request to work
        # s_morning_n on the first Monday (Jan 6).
        req = RequestAugmented(
            id="req_override",
            team_id="t0",
            request_type=RequestType.WORK_DEMAND,
            worker_id="w0",
            start_date=date(2025, 1, 6),
            end_date=date(2025, 1, 6),
            shift_options=[
                ShiftWorkerOption(
                    name="Morning Normal",
                    id="s_morning_n",
                    id_type=SWOIdTypes.SHIFT,
                    is_bool_dim=False,
                    category_name="shifts",
                )
            ],
            negative=False,
            hard=True,
            status=RequestStatus.APPROVED,
            active=True,
            shift_target_ids=["s_morning_n"],
        )
        ei.requests_work = [req]

        outputs = engine_solve_engine_inputs(ei)
        assert outputs.is_solution is True

        monday = date(2025, 1, 6)
        other_monday = date(2025, 1, 13)

        # w0 must be assigned s_morning_n on Jan 6 (request overrides NO_WORK)
        w0_assignments = [a for a in outputs.assignments if a.worker_id == "w0"]
        assert any(
            a.shift_id == "s_morning_n" and a.date == monday for a in w0_assignments
        ), "w0 should be assigned s_morning_n on Jan 6 — request overrides NO_WORK pref"

        # w0 must NOT be assigned s_morning_n or s_morning_d on Jan 13
        # (NO_WORK still applies, no request for that date)
        for a in w0_assignments:
            if a.date == other_monday:
                assert a.shift_id not in {"s_morning_n", "s_morning_d"}, (
                    "w0 with NO_WORK must not be assigned morning on Jan 13"
                )

        breaches = _parse_breaches_engine(ei.schedule, outputs.breaches)
        for b in breaches:
            assert b.objective_category == ObjectiveCategory.DAILY_SHIFT_DEMAND, (
                f"Unexpected breach category: {b.objective_category}"
            )

        breach_pairs = {(v.date, v.shift_id) for b in breaches for v in b.variables}
        # s_morning_n on Jan 6 covered by w0 via request.
        # w1 covers s_morning_n and s_morning_d on Jan 13.
        # With 2 workers, no other breaches expected.
        assert breach_pairs == {
            (other_monday, "s_morning_n"),
        }, f"Unexpected breach pairs: {breach_pairs}"

    # ------------------------------------------------------------------
    # NO_WORK pref overridden by fixed assignment
    # ------------------------------------------------------------------
    def test_no_work_overridden_by_fixed_assignment(
        self, ei_weekly_prefs: EngineInputsAugmented
    ) -> None:
        ei = ei_weekly_prefs
        # w0: NO_WORK on Monday morning
        ei.workers[0].weekly_preferences = self._wp_factory(
            0, "morning", SlotRestriction.NO_WORK, WeekParity.ALL
        )
        ei.workers[1].weekly_preferences = None

        # Fixed assignment: w0 is assigned to s_morning_n on Jan 6
        ei.as_campaign_fixed = [
            Assignment(
                id="fix_override",
                team_id="t0",
                schedule_id=ei.schedule.id,
                worker_id="w0",
                date=date(2025, 1, 6),
                shift_id="s_morning_n",
                fixed=True,
                source=AssignmentSource.MANUAL,
            )
        ]

        outputs = engine_solve_engine_inputs(ei)
        assert outputs.is_solution is True

        monday = date(2025, 1, 6)
        other_monday = date(2025, 1, 13)

        # w0 must be assigned s_morning_n on Jan 6 (fixed overrides NO_WORK)
        w0_assignments = [a for a in outputs.assignments if a.worker_id == "w0"]
        assert any(
            a.shift_id == "s_morning_n" and a.date == monday for a in w0_assignments
        ), (
            "w0 should be assigned s_morning_n on Jan 6 — fixed assignment overrides NO_WORK"
        )

        # w0 must NOT be assigned morning on Jan 13 (NO_WORK still applies)
        for a in w0_assignments:
            if a.date == other_monday:
                assert a.shift_id not in {"s_morning_n", "s_morning_d"}, (
                    "w0 with NO_WORK must not be assigned morning on Jan 13"
                )

        breaches = _parse_breaches_engine(ei.schedule, outputs.breaches)
        for b in breaches:
            assert b.objective_category == ObjectiveCategory.DAILY_SHIFT_DEMAND, (
                f"Unexpected breach category: {b.objective_category}"
            )

        breach_pairs = {(v.date, v.shift_id) for b in breaches for v in b.variables}
        # s_morning_n on Jan 6 covered by w0 via fixed assignment.
        # w1 covers s_morning_n and s_morning_d on Jan 13.
        # With 2 workers, no other breaches expected.
        assert breach_pairs == {
            (other_monday, "s_morning_n"),
        }, f"Unexpected breach pairs: {breach_pairs}"
