from datetime import date, timedelta
from typing import List

from core import CoverageSelector


def build_no_coverage_date(
    start_date: date,
    end_date: date,
    coverage_selectors: List[CoverageSelector],
) -> List[date]:
    delta = end_date - start_date
    no_cov_date = [start_date + timedelta(days=i) for i in range(delta.days + 1)]
    for coverage_selector in coverage_selectors:
        for day in range(
            (coverage_selector.end_date - coverage_selector.start_date).days + 1
        ):
            cov_date = coverage_selector.start_date + timedelta(days=day)
            if cov_date in no_cov_date:
                no_cov_date.remove(cov_date)
                if len(no_cov_date) == 0:
                    return []
    return no_cov_date
