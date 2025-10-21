import json
from pathlib import Path
from typing import Any, Dict, List

from pydantic import BaseModel
from shared.schemas.core import Shift, Worker

from src.services.base_service import BaseService


class ScenarioLoadResponse(BaseModel):
    """Response model for scenario loading."""

    scenario_name: str
    workers: List[Worker]
    shifts: List[Shift]


class SolverTestScenariosService(BaseService):

    @staticmethod
    def get_scenario_names() -> List[str]:
        """Get list of all available scenario names from the JSON fixture.
        Raises:
            FileNotFoundError: if the fixture file does not exist.
            ValueError: if the fixture cannot be parsed or has no keys.
        """
        file_path = Path(__file__).parent / "solver_data.json"
        if not file_path.exists():
            raise FileNotFoundError(f"Solver data file not found: {file_path}")

        try:
            with file_path.open("r", encoding="utf-8") as fh:
                data = json.load(fh)
        except Exception as exc:
            raise ValueError(
                f"Failed to parse solver data file: {file_path}"
            ) from exc

        if not isinstance(data, dict) or len(data) == 0:
            raise ValueError(
                f"Solver data file {file_path} contains no scenarios"
            )

        return list(data.keys())

    def create_scenario(
        self, scenario_name: str, team_id: str
    ) -> ScenarioLoadResponse:
        """Create a full scenario in the database for the given name.

        Loads workers from the JSON fixture, inserts them into the DB (with
        team_id override), and returns a dict shaped like
        ScenarioLoadResponse.
        """
        # Load raw scenario data from JSON fixture
        scenario_data = self.load_scenario_data_from_json(scenario_name)

        # Convert raw data into core worker objects and set team_id
        loaded = self.scenario_data_dict_to_core(scenario_data, team_id)

        # Create workers in DB (override team)
        saved = self.save_scenario_to_db(scenario_data=loaded)

        return ScenarioLoadResponse(
            scenario_name=scenario_name,
            workers=saved.get("workers", []),
            shifts=saved.get("shifts", []),
        )

    def get_scenario_metadata(self, scenario_name: str) -> Dict[str, Any]:
        """Get metadata about a scenario without loading full data"""
        scenario = self.load_scenario_data_from_json(scenario_name)
        return {
            "name": scenario_name,
            "worker_count": len(scenario["workers"]),
            "shift_count": len(scenario["shifts"]),
        }

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
    def scenario_data_dict_to_core(
        scenario_data: Dict[str, Any], team_id: str
    ) -> Dict[str, List[Worker]]:
        try:
            workers: List[Worker] = []
            for w in scenario_data.get("workers", []):
                worker = Worker.from_dict(w)
                # override team_id and clear id so DB creates a new doc
                worker.team_id = team_id
                if hasattr(worker, "id"):
                    setattr(worker, "id", None)
                workers.append(worker)

            return {"workers": workers}
        except Exception as exc:
            raise ValueError(
                "Failed to convert scenario data to core objects"
            ) from exc

    def save_scenario_to_db(
        self,
        scenario_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Save the given scenario data into the database."""
        try:
            out: Dict[str, Any] = {}
            workers = scenario_data.get("workers", [])
            if not all(isinstance(w, Worker) for w in workers):
                raise ValueError("Expected all workers to be Worker instances")
            out["workers"] = self.collection.worker_db.create_workers(
                workers=workers
            )
            return out
        except Exception as exc:
            raise ValueError(
                "Failed to save scenario data to database"
            ) from exc
