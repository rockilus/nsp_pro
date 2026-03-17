from typing import Callable, Tuple

import pytest
from shared.constraint_parser import (
    build_dim_to_attr_value_to_owner,
    parse_constraints,
)
from shared.schemas.core import (
    ConstraintBuildAugmented,
    ConstraintFai,
    ConstraintFil,
    ConstraintOrd,
    Constraints,
    ConstraintSeq,
    ConstraintSum,
    ConstraintType,
    EngineInputsAugmented,
)

from core_to_engine_service.build_dates import (
    build_dates,
    build_worker_ids_to_worker_dates,
)
from core_to_engine_service.build_periods import (
    build_periods_monthly,
    build_periods_weekly,
    build_periods_yearly,
)


# pylint: disable=R0801, too-few-public-methods
class TestParseConstraints:
    @pytest.fixture
    def run_parse_constraints(
        self, engine_inputs: EngineInputsAugmented
    ) -> Callable[[EngineInputsAugmented], Constraints]:
        dim_to_attr_value_to_worker = build_dim_to_attr_value_to_owner(
            engine_inputs.workers,
            engine_inputs.dimensions,
            engine_inputs.dim_entries,
            engine_inputs.attributes,
        )
        dim_to_attr_value_to_shift = build_dim_to_attr_value_to_owner(
            engine_inputs.shifts,
            engine_inputs.dimensions,
            engine_inputs.dim_entries,
            engine_inputs.attributes,
        )
        dates_hist, dates_campaign = build_dates(
            engine_inputs.schedule,
            engine_inputs.as_hist + engine_inputs.as_campaign_fixed,
        )
        periods_weekly = build_periods_weekly(dates_hist, dates_campaign)
        periods_monthly = build_periods_monthly(dates_hist, dates_campaign)
        periods_yearly = build_periods_yearly(dates_hist, dates_campaign)
        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            engine_inputs.schedule,
            engine_inputs.workers,
            engine_inputs.as_hist + engine_inputs.as_campaign_fixed,
            dates_campaign,
        )
        return lambda inputs: parse_constraints(  # type: ignore
            cbas=engine_inputs.cbs_augmented,
            schedule_id=engine_inputs.schedule.id,
            workers=engine_inputs.workers,
            worker_dim_dict=dim_to_attr_value_to_worker,
            dates_hist=dates_hist,
            dates_campaign=dates_campaign,
            periods_weekly=periods_weekly,
            periods_monthly=periods_monthly,
            periods_yearly=periods_yearly,
            worker_ids_to_worker_dates=worker_ids_to_worker_dates,
            shifts=engine_inputs.shifts,
            shift_dim_dict=dim_to_attr_value_to_shift,
            penalties=engine_inputs.penalties,
        )

    def test_parse_constraints(
        self,
        engine_inputs: EngineInputsAugmented,
        constraint_with_expected_output: Tuple[
            ConstraintBuildAugmented,
            ConstraintFai
            | ConstraintFil
            | ConstraintOrd
            | ConstraintSeq
            | ConstraintSum,
        ],
        run_parse_constraints: Callable[[EngineInputsAugmented], Constraints],
    ) -> None:
        cba, expected_output = constraint_with_expected_output
        engine_inputs.cbs_augmented = [cba]
        out = run_parse_constraints(engine_inputs)
        if cba.constraint_type == ConstraintType.SEQ:
            assert out.seq == [expected_output]
        elif cba.constraint_type in [ConstraintType.SUM, ConstraintType.EVE]:
            assert out.sum == [expected_output]
        elif cba.constraint_type == ConstraintType.ORD:
            assert out.ord == [expected_output]
        elif cba.constraint_type == ConstraintType.FIL:
            assert out.fil == [expected_output]
        elif cba.constraint_type == ConstraintType.FAI:
            assert out.fai == [expected_output]
        else:
            assert False, "Constraint type not recognized"
