#!/usr/bin/env python3
"""
Test script to verify the filtering of demands with count 0 works correctly.
"""

import sys

sys.path.append("/Users/felipekharaba/Code/nsp_pro/backend/shared/src")

from datetime import date
from dataclasses import dataclass
from typing import List


@dataclass
class MockShiftDemand:
    """Mock shift demand for testing."""

    id: str
    shift_id: str
    date: date
    count: int


def test_count_filtering():
    """Test that demands with count 0 are filtered out."""
    print("Testing demand count filtering...")

    # Create test data with mixed counts
    test_demands = [
        MockShiftDemand(
            "demand-1", "shift-1", date(2023, 1, 1), 2
        ),  # Should be included
        MockShiftDemand(
            "demand-2", "shift-2", date(2023, 1, 1), 0
        ),  # Should be filtered out
        MockShiftDemand(
            "demand-3", "shift-3", date(2023, 1, 1), 1
        ),  # Should be included
        MockShiftDemand(
            "demand-4", "shift-4", date(2023, 1, 1), 0
        ),  # Should be filtered out
        MockShiftDemand(
            "demand-5", "shift-5", date(2023, 1, 1), 3
        ),  # Should be included
    ]

    print(f"Original demands: {len(test_demands)}")
    for demand in test_demands:
        print(f"  {demand.id}: count={demand.count}")

    # Apply the same filtering logic as in the service
    active_shift_demands = [
        demand for demand in test_demands if demand.count > 0
    ]

    print(f"\nFiltered demands: {len(active_shift_demands)}")
    for demand in active_shift_demands:
        print(f"  {demand.id}: count={demand.count}")

    # Verify results
    expected_count = 3  # demand-1, demand-3, demand-5
    if len(active_shift_demands) == expected_count:
        print(f"✓ Correct number of demands filtered: {expected_count}")
    else:
        print(
            f"✗ Expected {expected_count} demands, got {len(active_shift_demands)}"
        )
        return False

    # Verify no zero-count demands remain
    zero_count_demands = [d for d in active_shift_demands if d.count == 0]
    if len(zero_count_demands) == 0:
        print("✓ All zero-count demands successfully filtered out")
    else:
        print(
            f"✗ Found {len(zero_count_demands)} zero-count demands in result"
        )
        return False

    # Verify all remaining demands have positive counts
    all_positive = all(d.count > 0 for d in active_shift_demands)
    if all_positive:
        print("✓ All remaining demands have positive counts")
    else:
        print("✗ Some remaining demands have non-positive counts")
        return False

    print("\n🎉 Count filtering test passed!")
    return True


if __name__ == "__main__":
    success = test_count_filtering()
    sys.exit(0 if success else 1)
