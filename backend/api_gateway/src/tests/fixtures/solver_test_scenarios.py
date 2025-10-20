"""
E2E Test Scenarios for Solver

This module defines predefined test scenarios that can be loaded
for E2E testing. Each scenario includes workers, shifts, shift demands,
constraints, and schedule configuration.

Scenarios are designed to test different solver capabilities:
- basic_coverage: Simple daily coverage requirements
- complex_constraints: Multiple constraint types and edge cases
- specialty_matching: Workers with different specialties
- irregular_shifts: Mix of normal, duty, and rest shifts
"""

from datetime import date, timedelta
from typing import Any, Dict, List
from shared.schemas.core import Worker


benoit_workers = [
    Worker(
        id="",
        team_id="team_01",
        name=f"Benoit Worker {i:02d}",
        acronym=f"BW{i:02d}",
        acronym_custom=False,
        employment_start_date=date(2025, 1, 1),
        employment_end_date=None,
        weekly_hours=40,
        weekly_hours_desired=40,
        duties_per_month=4,
        annual_leave=25,
        specialty_ids=[],
        deleted=False,
    )
    for i in range(1, 36)
]


class SolverTestScenarios:
    """Collection of predefined solver test scenarios"""

    @staticmethod
    def benoit_scenario_0() -> Dict[str, Any]:
        """
        Benoit Scenario 0:
        - 35 workers
        """

    @staticmethod
    def basic_coverage() -> Dict[str, Any]:
        """
        Basic coverage scenario:
        - 10 workers with standard hours
        - 3 shifts (morning, afternoon, night)
        - 1 month period (current month)
        - Daily shift demands for each shift (2, 2, 1 staffing)
        - No specialties or constraints

        Expected behavior:
        - Solver should find feasible solution in < 10 seconds
        - All shift demands should be covered
        - Workers should have balanced assignments
        - No constraint breaches expected
        """
        today = date.today()
        start_date = today.replace(day=1)
        # Get last day of current month
        if today.month == 12:
            next_month = start_date.replace(
                year=today.year + 1, month=1, day=1
            )
            end_date = next_month - timedelta(days=1)
        else:
            next_month = start_date.replace(month=today.month + 1, day=1)
            end_date = next_month - timedelta(days=1)

        return {
            "scenario_name": "basic_coverage",
            "description": "Basic daily coverage with 10 workers and 3 shifts",
            "expected_solve_time_seconds": 10,
            # 31 days * 3 shifts * ~1 worker avg
            "expected_min_assignments": 90,
            "expected_max_breaches": 0,
            "workers": [
                {
                    "name": f"Worker {i:02d}",
                    "acronym": f"W{i:02d}",
                    "employment_start_date": start_date.isoformat(),
                    "employment_end_date": None,
                    "weekly_hours": 40,
                    "weekly_hours_desired": 40,
                    "duties_per_month": 4,
                    "annual_leave": 25,
                    "specialty_ids": [],
                }
                for i in range(1, 11)
            ],
            "shifts": [
                {
                    "name": "Morning Shift",
                    "acronym": "MS",
                    "start_time": "08:00:00",
                    "end_time": "16:00:00",
                    "color": "#1976d2",
                    "shift_type": "NORMAL",
                    "rest_type": "NONE",
                    "leave_type": "NONE",
                    "recuperation_time": 0,
                    "is_rest": False,
                    "staffing": [{"specialty_id": None, "staffing": 2}],
                },
                {
                    "name": "Afternoon Shift",
                    "acronym": "AS",
                    "start_time": "16:00:00",
                    "end_time": "00:00:00",
                    "color": "#f57c00",
                    "shift_type": "NORMAL",
                    "rest_type": "NONE",
                    "leave_type": "NONE",
                    "recuperation_time": 0,
                    "is_rest": False,
                    "staffing": [{"specialty_id": None, "staffing": 2}],
                },
                {
                    "name": "Night Shift",
                    "acronym": "NS",
                    "start_time": "00:00:00",
                    "end_time": "08:00:00",
                    "color": "#7b1fa2",
                    "shift_type": "NORMAL",
                    "rest_type": "NONE",
                    "leave_type": "NONE",
                    "recuperation_time": 0,
                    "is_rest": False,
                    "staffing": [{"specialty_id": None, "staffing": 1}],
                },
            ],
            "shift_demands": {
                "pattern": "daily",
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "demands": [
                    {"shift_index": 0, "count": 2},  # Morning: 2 workers
                    {"shift_index": 1, "count": 2},  # Afternoon: 2 workers
                    {"shift_index": 2, "count": 1},  # Night: 1 worker
                ],
            },
            "constraints": [],
            "schedule": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "duration_days": (end_date - start_date).days + 1,
            },
        }

    @staticmethod
    def complex_constraints() -> Dict[str, Any]:
        """
        Complex scenario with multiple constraint types:
        - 15 workers with varied contracts
        - 5 shifts including duty shifts
        - Various hard and soft constraints
        - Different weekly hours and preferences
        - 1 month period

        Expected behavior:
        - Solver should handle constraint conflicts
        - Some soft constraints may be violated
        - Hard constraints must be respected
        - Solve time < 30 seconds
        """
        today = date.today()
        start_date = today.replace(day=1)
        if today.month == 12:
            next_month = start_date.replace(
                year=today.year + 1, month=1, day=1
            )
            end_date = next_month - timedelta(days=1)
        else:
            next_month = start_date.replace(month=today.month + 1, day=1)
            end_date = next_month - timedelta(days=1)

        return {
            "scenario_name": "complex_constraints",
            "description": (
                "Complex scenario with 15 workers, 5 shifts, "
                "and multiple constraints"
            ),
            "expected_solve_time_seconds": 30,
            "expected_min_assignments": 120,
            "expected_max_breaches": 10,
            "workers": [
                # Full-time workers (40h/week)
                *[
                    {
                        "name": f"FT Worker {i:02d}",
                        "acronym": f"FT{i:02d}",
                        "employment_start_date": start_date.isoformat(),
                        "employment_end_date": None,
                        "weekly_hours": 40,
                        "weekly_hours_desired": 40,
                        "duties_per_month": 5,
                        "annual_leave": 25,
                        "specialty_ids": [],
                    }
                    for i in range(1, 11)
                ],
                # Part-time workers (20h/week)
                *[
                    {
                        "name": f"PT Worker {i:02d}",
                        "acronym": f"PT{i:02d}",
                        "employment_start_date": start_date.isoformat(),
                        "employment_end_date": None,
                        "weekly_hours": 20,
                        "weekly_hours_desired": 20,
                        "duties_per_month": 2,
                        "annual_leave": 25,
                        "specialty_ids": [],
                    }
                    for i in range(11, 16)
                ],
            ],
            "shifts": [
                {
                    "name": "Morning Shift",
                    "acronym": "MS",
                    "start_time": "08:00:00",
                    "end_time": "16:00:00",
                    "color": "#1976d2",
                    "shift_type": "NORMAL",
                    "rest_type": "NONE",
                    "leave_type": "NONE",
                    "recuperation_time": 0,
                    "is_rest": False,
                    "staffing": [{"specialty_id": None, "staffing": 3}],
                },
                {
                    "name": "Afternoon Shift",
                    "acronym": "AS",
                    "start_time": "16:00:00",
                    "end_time": "00:00:00",
                    "color": "#f57c00",
                    "shift_type": "NORMAL",
                    "rest_type": "NONE",
                    "leave_type": "NONE",
                    "recuperation_time": 0,
                    "is_rest": False,
                    "staffing": [{"specialty_id": None, "staffing": 2}],
                },
                {
                    "name": "Night Shift",
                    "acronym": "NS",
                    "start_time": "00:00:00",
                    "end_time": "08:00:00",
                    "color": "#7b1fa2",
                    "shift_type": "NORMAL",
                    "rest_type": "NONE",
                    "leave_type": "NONE",
                    "recuperation_time": 0,
                    "is_rest": False,
                    "staffing": [{"specialty_id": None, "staffing": 2}],
                },
                {
                    "name": "Duty Shift",
                    "acronym": "DT",
                    "start_time": "08:00:00",
                    "end_time": "08:00:00",
                    "color": "#d32f2f",
                    "shift_type": "DUTY",
                    "rest_type": "NONE",
                    "leave_type": "NONE",
                    "recuperation_time": 24,
                    "is_rest": False,
                    "staffing": [{"specialty_id": None, "staffing": 1}],
                },
                {
                    "name": "Rest Day",
                    "acronym": "R",
                    "start_time": "00:00:00",
                    "end_time": "00:00:00",
                    "color": "#4caf50",
                    "shift_type": "REST",
                    "rest_type": "REST",
                    "leave_type": "NONE",
                    "recuperation_time": 0,
                    "is_rest": True,
                    "staffing": [],
                },
            ],
            "shift_demands": {
                "pattern": "daily",
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "demands": [
                    {"shift_index": 0, "count": 3},  # Morning: 3 workers
                    {"shift_index": 1, "count": 2},  # Afternoon: 2 workers
                    {"shift_index": 2, "count": 2},  # Night: 2 workers
                    {"shift_index": 3, "count": 1},  # Duty: 1 worker
                ],
            },
            "constraints": [
                # Example: Consecutive shifts constraint
                # This would need to match your constraint schema
                {
                    "type": "MAX_CONSECUTIVE_SHIFTS",
                    "parameters": {"max_consecutive": 5},
                    "is_hard": True,
                }
            ],
            "schedule": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "duration_days": (end_date - start_date).days + 1,
            },
        }

    @staticmethod
    def weekend_coverage() -> Dict[str, Any]:
        """
        Weekend coverage scenario:
        - 8 workers
        - 2 shifts (day, night)
        - Focus on weekend coverage requirements
        - Different staffing for weekdays vs weekends

        Expected behavior:
        - Weekend shifts should be fairly distributed
        - Minimum rest between weekend shifts
        - Solve time < 15 seconds
        """
        today = date.today()
        start_date = today.replace(day=1)
        if today.month == 12:
            next_month = start_date.replace(
                year=today.year + 1, month=1, day=1
            )
            end_date = next_month - timedelta(days=1)
        else:
            next_month = start_date.replace(month=today.month + 1, day=1)
            end_date = next_month - timedelta(days=1)

        return {
            "scenario_name": "weekend_coverage",
            "description": (
                "Weekend coverage with fair distribution across 8 workers"
            ),
            "expected_solve_time_seconds": 15,
            # ~6 weekends * 2 shifts * 4 workers
            "expected_min_assignments": 48,
            "expected_max_breaches": 2,
            "workers": [
                {
                    "name": f"Worker {i:02d}",
                    "acronym": f"W{i:02d}",
                    "employment_start_date": start_date.isoformat(),
                    "employment_end_date": None,
                    "weekly_hours": 40,
                    "weekly_hours_desired": 40,
                    "duties_per_month": 8,
                    "annual_leave": 25,
                    "specialty_ids": [],
                }
                for i in range(1, 9)
            ],
            "shifts": [
                {
                    "name": "Day Shift",
                    "acronym": "DS",
                    "start_time": "08:00:00",
                    "end_time": "20:00:00",
                    "color": "#1976d2",
                    "shift_type": "NORMAL",
                    "rest_type": "NONE",
                    "leave_type": "NONE",
                    "recuperation_time": 0,
                    "is_rest": False,
                    "staffing": [{"specialty_id": None, "staffing": 2}],
                },
                {
                    "name": "Night Shift",
                    "acronym": "NS",
                    "start_time": "20:00:00",
                    "end_time": "08:00:00",
                    "color": "#7b1fa2",
                    "shift_type": "NORMAL",
                    "rest_type": "NONE",
                    "leave_type": "NONE",
                    "recuperation_time": 0,
                    "is_rest": False,
                    "staffing": [{"specialty_id": None, "staffing": 2}],
                },
            ],
            "shift_demands": {
                "pattern": "weekend_only",  # Special pattern for weekends
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "demands": [
                    {"shift_index": 0, "count": 2},  # Day: 2 workers
                    {"shift_index": 1, "count": 2},  # Night: 2 workers
                ],
            },
            "constraints": [],
            "schedule": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "duration_days": (end_date - start_date).days + 1,
            },
        }

    @staticmethod
    def get_all_scenarios() -> List[str]:
        """Get list of all available scenario names"""
        return ["basic_coverage", "complex_constraints", "weekend_coverage"]

    @staticmethod
    def get_scenario(scenario_name: str) -> Dict[str, Any]:
        """Get a specific scenario by name"""
        scenarios = {
            "basic_coverage": SolverTestScenarios.basic_coverage,
            "complex_constraints": SolverTestScenarios.complex_constraints,
            "weekend_coverage": SolverTestScenarios.weekend_coverage,
        }

        if scenario_name not in scenarios:
            raise ValueError(
                f"Unknown scenario: {scenario_name}. "
                f"Available scenarios: {', '.join(scenarios.keys())}"
            )

        return scenarios[scenario_name]()

    @staticmethod
    def get_scenario_metadata(scenario_name: str) -> Dict[str, Any]:
        """Get metadata about a scenario without loading full data"""
        scenario = SolverTestScenarios.get_scenario(scenario_name)
        return {
            "name": scenario["scenario_name"],
            "description": scenario["description"],
            "worker_count": len(scenario["workers"]),
            "shift_count": len(scenario["shifts"]),
            "expected_solve_time_seconds": scenario[
                "expected_solve_time_seconds"
            ],
            "expected_min_assignments": scenario["expected_min_assignments"],
            "expected_max_breaches": scenario["expected_max_breaches"],
        }
