from datetime import timedelta
from typing import List

from fastapi import APIRouter

from core.coverage import Coverage as CoverageCore
from engine import Coverage, Custom, Engine, Inputs, ShiftDemand, VariableSpace
from scripts.setup_database import coverage_db, shift_db, worker_db

router = APIRouter()


@router.get("/solver")
def solver():
    workers = worker_db.get_workers()
    shifts = shift_db.get_shifts()
    coverages = coverage_db.get_coverages()
    start_date, end_date = get_start_end_dates(coverages)
    engine = Engine()
    variable_space = VariableSpace(
        workers=[worker.id for worker in workers],
        start_date=start_date,
        end_date=end_date,
        shifts=[shift.id for shift in shifts],
    )
    shift_demands = build_shift_demands(coverages)
    # pylint: disable=R0801
    coverage = Coverage(shift_demands)
    requests = []
    fix_assignments = []
    custom = Custom(custom_constraints=[])

    inputs = Inputs(
        variable_space=variable_space,
        coverage=coverage,
        requests=requests,
        fixed_assignments=fix_assignments,
        custom=custom,
    )

    outputs = engine.solve(inputs)
    print(outputs)

    return {"msg": "all good"}


def get_start_end_dates(coverages: list[CoverageCore]) -> tuple[str, str]:
    date_format = "%Y-%m-%d"
    start_date = min(c.date_start for c in coverages)
    end_date = max(c.date_end for c in coverages)
    return start_date.strftime(date_format), end_date.strftime(date_format)


def build_shift_demands(coverages: List[CoverageCore]) -> List[ShiftDemand]:
    shift_demands = []
    for coverage in coverages:
        for day in range((coverage.date_end - coverage.date_start).days + 1):
            date = (coverage.date_start + timedelta(days=day)).strftime("%Y-%m-%d")
            for shift_demand in coverage.shift_demands:
                if shift_demand.day_index == day:
                    shift_demands.append(
                        ShiftDemand(
                            date=date,
                            shift_id=shift_demand.shift_id,
                            quantity=shift_demand.quantity,
                        )
                    )
    return shift_demands
