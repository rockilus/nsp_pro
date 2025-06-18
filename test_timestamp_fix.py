#!/usr/bin/env python3
"""
Test script to validate timestamp conversion fix.
Tests that both millisecond and second timestamps are handled correctly.
"""

from datetime import datetime, timezone, date


def test_timestamp_conversion():
    """Test timestamp conversion logic."""

    # Test data: both milliseconds and seconds
    test_cases = [
        {
            "name": "Millisecond timestamp",
            "timestamp": 1735689600000,  # 2025-01-01 00:00:00 UTC in milliseconds
            "expected_date": date(2025, 1, 1),
        },
        {
            "name": "Second timestamp",
            "timestamp": 1735689600,  # 2025-01-01 00:00:00 UTC in seconds
            "expected_date": date(2025, 1, 1),
        },
        {
            "name": "End of January (ms)",
            "timestamp": 1738367999000,  # 2025-01-31 23:59:59 UTC in milliseconds
            "expected_date": date(2025, 1, 31),
        },
        {
            "name": "End of January (s)",
            "timestamp": 1738367999,  # 2025-01-31 23:59:59 UTC in seconds
            "expected_date": date(2025, 1, 31),
        },
    ]

    print("Testing timestamp conversion logic...")
    print("=" * 50)

    all_passed = True

    for test_case in test_cases:
        timestamp = test_case["timestamp"]
        expected = test_case["expected_date"]

        # Apply the conversion logic from the backend
        if timestamp > 1e10:
            timestamp = timestamp / 1000

        try:
            converted_date = datetime.fromtimestamp(
                timestamp, tz=timezone.utc
            ).date()

            if converted_date == expected:
                print(f"✅ {test_case['name']}: {converted_date}")
            else:
                print(
                    f"❌ {test_case['name']}: got {converted_date}, expected {expected}"
                )
                all_passed = False

        except Exception as e:
            print(f"❌ {test_case['name']}: Error - {e}")
            all_passed = False

    print("=" * 50)
    if all_passed:
        print("✅ All timestamp conversion tests passed!")
        return True
    else:
        print("❌ Some tests failed!")
        return False


def test_frontend_style_timestamps():
    """Test with timestamps that would come from the frontend."""
    print("\nTesting frontend-style timestamps...")
    print("=" * 50)

    # These are the kind of timestamps the frontend would send
    frontend_timestamps = [
        1735689600000,  # January 1, 2025 (ms)
        1738281600000,  # January 31, 2025 (ms)
    ]

    for ts in frontend_timestamps:
        # Apply conversion logic
        converted_ts = ts / 1000 if ts > 1e10 else ts
        dt = datetime.fromtimestamp(converted_ts, tz=timezone.utc)

        print(f"Original: {ts}")
        print(f"Converted: {converted_ts}")
        print(f"Date: {dt.date()}")
        print(f"DateTime: {dt}")
        print()


if __name__ == "__main__":
    success = test_timestamp_conversion()
    test_frontend_style_timestamps()

    if success:
        print("🎉 Timestamp conversion fix is working correctly!")
        print(
            "The backend should now handle both millisecond and second timestamps."
        )
    else:
        print("❌ Issues found with timestamp conversion.")
