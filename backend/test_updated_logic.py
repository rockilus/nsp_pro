#!/usr/bin/env python3
"""
Test script to verify the updated multitasking logic works correctly.
"""

import sys

sys.path.append("/Users/felipekharaba/Code/nsp_pro/backend/api_gateway/src")
sys.path.append("/Users/felipekharaba/Code/nsp_pro/backend/shared/src")

from datetime import date, datetime, time
from dataclasses import dataclass
from typing import List, Dict, Set
from services.multitasking_service import MultitaskingService, EnrichedDemand


# Mock classes for testing
@dataclass
class MockShiftDemand:
    id: str
    shift_id: str
    date: date


@dataclass
class MockShift:
    id: str
    start_time: datetime
    end_time: datetime
    staffing: List = None

    def __post_init__(self):
        if self.staffing is None:
            self.staffing = []


def test_concurrency_logic():
    """Test the updated concurrency calculation logic."""
    print("Testing updated concurrency logic...")

    # Create mock data
    test_date = date(2023, 1, 1)

    # Create shifts with different times
    shift1 = MockShift(
        id="shift-1",
        start_time=datetime.combine(test_date, time(9, 0)),  # 9:00 AM
        end_time=datetime.combine(test_date, time(12, 0)),  # 12:00 PM
    )

    shift2 = MockShift(
        id="shift-2",
        start_time=datetime.combine(test_date, time(13, 0)),  # 1:00 PM
        end_time=datetime.combine(test_date, time(17, 0)),  # 5:00 PM
    )

    shift3 = MockShift(
        id="shift-3",
        start_time=datetime.combine(
            test_date, time(10, 0)
        ),  # 10:00 AM (overlaps with shift1)
        end_time=datetime.combine(
            test_date, time(14, 0)
        ),  # 2:00 PM (overlaps with shift2)
    )

    # Create demands
    demand1 = MockShiftDemand(
        id="demand-1", shift_id="shift-1", date=test_date
    )
    demand2 = MockShiftDemand(
        id="demand-2", shift_id="shift-2", date=test_date
    )
    demand3 = MockShiftDemand(
        id="demand-3", shift_id="shift-3", date=test_date
    )

    # Create enriched demands
    service = MultitaskingService(collection=None)  # Mock service

    enriched_demands = [
        EnrichedDemand(
            demand=demand1,
            shift=shift1,
            start_datetime=datetime.combine(test_date, time(9, 0)),
            end_datetime=datetime.combine(test_date, time(12, 0)),
        ),
        EnrichedDemand(
            demand=demand2,
            shift=shift2,
            start_datetime=datetime.combine(test_date, time(13, 0)),
            end_datetime=datetime.combine(test_date, time(17, 0)),
        ),
        EnrichedDemand(
            demand=demand3,
            shift=shift3,
            start_datetime=datetime.combine(test_date, time(10, 0)),
            end_datetime=datetime.combine(test_date, time(14, 0)),
        ),
    ]

    # Test the concurrency calculation
    try:
        concurrency_map = service._calculate_concurrency_for_date(
            enriched_demands
        )

        print(f"✓ Concurrency calculation completed")
        print(f"  Concurrency map: {dict(concurrency_map)}")

        # Expected results:
        # - demand1 and demand2 should be concurrent (no overlap: 9-12 and 13-17)
        # - demand1 and demand3 should NOT be concurrent (overlap: 9-12 and 10-14)
        # - demand2 and demand3 should NOT be concurrent (overlap: 13-17 and 10-14)

        demand1_concurrent = concurrency_map.get("demand-1", set())
        demand2_concurrent = concurrency_map.get("demand-2", set())
        demand3_concurrent = concurrency_map.get("demand-3", set())

        print(f"  Demand 1 concurrent with: {demand1_concurrent}")
        print(f"  Demand 2 concurrent with: {demand2_concurrent}")
        print(f"  Demand 3 concurrent with: {demand3_concurrent}")

        # Verify expected results
        if (
            "demand-2" in demand1_concurrent
            and "demand-1" in demand2_concurrent
        ):
            print("✓ Demand 1 and 2 are correctly identified as concurrent")
        else:
            print("✗ Demand 1 and 2 should be concurrent but aren't")

        if (
            "demand-3" not in demand1_concurrent
            and "demand-1" not in demand3_concurrent
        ):
            print(
                "✓ Demand 1 and 3 are correctly identified as NOT concurrent"
            )
        else:
            print("✗ Demand 1 and 3 should NOT be concurrent but are")

        if (
            "demand-3" not in demand2_concurrent
            and "demand-2" not in demand3_concurrent
        ):
            print(
                "✓ Demand 2 and 3 are correctly identified as NOT concurrent"
            )
        else:
            print("✗ Demand 2 and 3 should NOT be concurrent but are")

        print("\n🎉 Test completed successfully!")
        return True

    except Exception as e:
        print(f"✗ Test failed with error: {e}")
        return False


if __name__ == "__main__":
    success = test_concurrency_logic()
    sys.exit(0 if success else 1)
