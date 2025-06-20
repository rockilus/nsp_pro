#!/usr/bin/env python3
"""
Quick test script to verify camelCase DTO conversion works correctly.
"""

import sys

sys.path.append("/Users/felipekharaba/Code/nsp_pro/backend/shared/src")

try:
    from shared.schemas.dto.multitasking import (
        ShiftDemandConcurrencyRequestDTO,
        ShiftDemandConcurrencyResponseDTO,
        ShiftDemandConcurrencyDTO,
    )
    from shared.schemas.core.multitasking import (
        ShiftDemandConcurrencyRequest,
    )
except ImportError as e:
    print(f"Import error: {e}")
    sys.exit(1)

import json


def test_camelcase_dto():
    """Test that camelCase DTOs work correctly."""

    print("Testing camelCase DTO conversion...")

    # Test 1: Create DTO with camelCase fields
    print("\n1. Testing DTO creation with camelCase fields...")
    try:
        dto = ShiftDemandConcurrencyRequestDTO(
            teamId="test-team-001",
            startDate=1672531200,  # 2023-01-01
            endDate=1675209600,  # 2023-02-01
        )
        print(f"✓ DTO created successfully: {dto.model_dump()}")
    except Exception as e:
        print(f"✗ Failed to create DTO: {e}")
        return False

    # Test 2: Convert DTO to JSON
    print("\n2. Testing DTO serialization...")
    try:
        json_data = dto.model_dump()
        print(f"✓ DTO serialized: {json.dumps(json_data, indent=2)}")
    except Exception as e:
        print(f"✗ Failed to serialize DTO: {e}")
        return False

    # Test 3: Core model conversion
    print("\n3. Testing core model conversion...")
    try:
        core_request = ShiftDemandConcurrencyRequest.from_dto(dto)
        print(
            f"✓ Core model created: team_id={core_request.team_id}, start_date={core_request.start_date}, end_date={core_request.end_date}"
        )
    except Exception as e:
        print(f"✗ Failed to convert to core model: {e}")
        return False

    # Test 4: Core model back to DTO
    print("\n4. Testing core model back to DTO...")
    try:
        new_dto = core_request.to_dto()
        print(f"✓ Back to DTO: {new_dto.model_dump()}")
    except Exception as e:
        print(f"✗ Failed to convert back to DTO: {e}")
        return False

    # Test 5: Response DTO structure
    print("\n5. Testing response DTO structure...")
    try:
        concurrency_item = ShiftDemandConcurrencyDTO(
            shiftDemandId="shift-001",
            concurrentShiftDemandIds=["shift-002", "shift-003"],
        )

        response_dto = ShiftDemandConcurrencyResponseDTO(
            teamId="test-team-001",
            startDate=1672531200,
            endDate=1675209600,
            concurrencyList=[concurrency_item],
        )

        print(
            f"✓ Response DTO created: {json.dumps(response_dto.model_dump(), indent=2)}"
        )
    except Exception as e:
        print(f"✗ Failed to create response DTO: {e}")
        return False

    print("\n🎉 All tests passed! CamelCase DTOs are working correctly.")
    return True


if __name__ == "__main__":
    success = test_camelcase_dto()
    sys.exit(0 if success else 1)
