from datetime import date
from typing import Dict, List

from shared.schemas.core import DuplicateRequest

from src.utils.date_utils import build_dates_list


def build_duplicate_date_mapping(
    duplicate: DuplicateRequest,
) -> Dict[date, date]:
    source_dates = build_dates_list(
        duplicate.source_period.start_date,
        duplicate.source_period.end_date,
    )
    target_dates = build_dates_list(
        duplicate.target_period.start_date,
        duplicate.target_period.end_date,
    )

    # Map source and target dates to their weekdays
    source_date_map = {
        source_date.weekday(): source_date for source_date in source_dates
    }
    target_date_map = {
        target_date.weekday(): target_date for target_date in target_dates
    }

    # Build the mapping by iterating through the target date map
    date_mapping = {
        source_date_map[weekday]: target_date
        for weekday, target_date in target_date_map.items()
        if weekday in source_date_map
    }

    return date_mapping


def validate_duplicate_lists(
    source_ids: List[str],
    target_ids: List[str],
    source_duplicate_ids: List[str],
    target_keep_ids: List[str],
    target_delete_ids: List[str],
) -> None:
    source_ids = list(set(source_ids))
    target_ids = list(set(target_ids))
    assert len(set(source_duplicate_ids)) == len(
        source_duplicate_ids
    ), "Duplicate IDs in list of assignments to duplicate"
    assert len(set(target_keep_ids)) == len(
        target_keep_ids
    ), "Duplicate IDs in list of assignments to keep"
    assert len(set(target_delete_ids)) == len(
        target_delete_ids
    ), "Duplicate IDs in list of assignments to delete"

    assert len(source_duplicate_ids) + len(target_keep_ids) == len(
        source_ids
    ), "Mismatch in number of assignments to duplicate+keep and source"
    assert sorted(list(set(target_keep_ids + target_delete_ids))) == sorted(
        target_ids
    ), "Mismatch in target assignments to keep+delete and target"
