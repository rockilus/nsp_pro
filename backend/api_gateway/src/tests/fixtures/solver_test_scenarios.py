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
import json
from pathlib import Path
from typing import Optional

# repository to create workers in DB
from shared.database.repositories.worker import WorkerRepository


class SolverTestScenarios:
    """Collection of predefined solver test scenarios"""

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

    @staticmethod
    def load_workers_from_json(scenario_name: str) -> Dict[str, List[Worker]]:
        """(deprecated) kept for backward compatibility.

        Use `load_scenario_data_from_json` and
        `create_workers_from_data` instead.
        """

        # For backward compatibility, call the new split methods
        scenario_data = SolverTestScenarios.load_scenario_data_from_json(
            scenario_name
        )
        return SolverTestScenarios.create_workers_from_data(scenario_data)

    @staticmethod
    def load_scenario_data_from_json(scenario_name: str) -> Dict[str, Any]:
        """Load raw scenario data from the local JSON fixture.

        Returns the raw dict stored under the given scenario name.
        """
        file_path = Path(__file__).parent / "solver_data.json"

        if not file_path.exists():
            raise FileNotFoundError(f"Solver data file not found: {file_path}")

        with file_path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)

        if scenario_name not in data:
            raise ValueError(
                f"Scenario '{scenario_name}' not found in solver_data.json"
            )

        return data[scenario_name]

    @staticmethod
    def create_workers_from_data(
        scenario_data: Dict[str, Any],
    ) -> Dict[str, List[Worker]]:
        """Create core Worker objects from raw scenario data.

        Expects scenario_data to be the dict loaded from the JSON file
        (the value at data[scenario_name]). Returns {"workers": [Worker,...]}.
        """
        raw = scenario_data.get("workers", [])
        workers: List[Worker] = []

        for w in raw:
            # Normalize keys expected by Worker.from_dict
            mapped = {
                "id": w.get("_id") or w.get("id"),
                "team_id": w.get("team") or w.get("team_id"),
                "name": w.get("name"),
                "acronym": w.get("acronym"),
                "acronym_custom": w.get("acronym_custom", False),
                "employment_start_date": w.get("employment_start_date"),
                "employment_end_date": w.get("employment_end_date"),
                "weekly_hours": w.get("weekly_hours"),
                "weekly_hours_desired": w.get("weekly_hours_desired"),
                "duties_per_month": w.get("duties_per_month"),
                "annual_leave": w.get("annual_leave"),
                "specialty_ids": (
                    w.get("specialties") or w.get("specialty_ids") or []
                ),
                "deleted": w.get("deleted", False),
                "user_id": w.get("user_id", None),
            }

            worker = Worker.from_dict(mapped)
            workers.append(worker)

        return {"workers": workers}

    @staticmethod
    def create_workers_in_db(
        db_interface,
        workers_input: Any,
        team_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Create workers in the database.

        workers_input may be a list of Worker objects or a dict with key
        'workers'. Optionally override the team_id for all workers before
        creation. Returns a list of worker dicts produced by Worker.to_dict().
        """
        # Normalize input
        if isinstance(workers_input, dict):
            workers = workers_input.get("workers", [])
        else:
            workers = workers_input

        # Ensure we have core Worker objects
        normalized_workers: List[Worker] = []
        for w in workers:
            if isinstance(w, Worker):
                worker_obj = w
            elif isinstance(w, dict):
                # If dict, try to map to Worker via from_dict
                worker_obj = Worker.from_dict(w)
            else:
                raise TypeError("Worker entries must be Worker or dict")

            # Override team_id if provided
            if team_id is not None:
                worker_obj.team_id = team_id

            # Let DB assign id
            # Clear id so repository treats this as a new document
            if hasattr(worker_obj, "id"):
                setattr(worker_obj, "id", None)

            normalized_workers.append(worker_obj)

        repo = WorkerRepository(db_interface)
        created_workers = repo.create_workers(normalized_workers)

        # Convert to simple dicts for responses
        return [w.to_dict() for w in created_workers]

    @staticmethod
    def create_scenario(scenario_name: str, db_interface, team_id: str) -> Any:
        """Create a full scenario in the database for the given name.

        Loads workers from the JSON fixture, inserts them into the DB (with
        team_id override), and returns a dict shaped like
        ScenarioLoadResponse.
        """
        # Load scenario definition (shifts, demands, etc.)
        scenario = SolverTestScenarios.get_scenario(scenario_name)

        # Load raw scenario data from JSON fixture
        scenario_data = SolverTestScenarios.load_scenario_data_from_json(
            scenario_name
        )

        # Convert raw data into core worker objects
        loaded = SolverTestScenarios.create_workers_from_data(scenario_data)

        # Create workers in DB (override team)
        created_workers = SolverTestScenarios.create_workers_in_db(
            db_interface, loaded, team_id=team_id
        )

        # Import the response model locally to avoid circular imports at
        # module import time when used within the application.
        try:
            from src.routes.test_utils_routes import ScenarioLoadResponse

            return ScenarioLoadResponse(
                success=True,
                scenario_name=scenario_name,
                workers=created_workers,
                shifts=scenario.get("shifts", []),
                shift_demands=scenario.get("shift_demands", {}),
                constraints=scenario.get("constraints", []),
                schedule=scenario.get("schedule", {}),
            )
        except ImportError:
            # If the import fails (for example in some test runners), fall
            # back to returning a plain dict with the same shape.
            return {
                "success": True,
                "scenario_name": scenario_name,
                "workers": created_workers,
                "shifts": scenario.get("shifts", []),
                "shift_demands": scenario.get("shift_demands", {}),
                "constraints": scenario.get("constraints", []),
                "schedule": scenario.get("schedule", {}),
            }
