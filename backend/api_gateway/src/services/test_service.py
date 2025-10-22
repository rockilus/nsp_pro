import json
from pathlib import Path
from typing import Any, Dict, List

from pydantic import BaseModel
from shared.database.database_collections import DatabaseCollections
from shared.database.schemas.attribute import AttributeSchema
from shared.database.schemas.dim_entry import DimEntrySchema
from shared.database.schemas.dimension import DimensionSchema
from shared.database.schemas.schedule import ScheduleSchema
from shared.database.schemas.shift import ShiftSchema
from shared.database.schemas.specialty import SpecialtySchema
from shared.database.schemas.worker import WorkerSchema
from shared.schemas.core import (
    Attribute,
    AttributeOwnerType,
    Dimension,
    DimEntry,
    Schedule,
    Shift,
    Specialty,
    Worker,
)

from src.services.base_service import BaseService


class ScenarioLoadResponse(BaseModel):
    """Response model for scenario loading."""

    scenario_name: str
    specialties: List[Specialty]
    workers: List[Worker]
    shifts: List[Shift]
    dimensions: List[Dimension]
    dim_entries: List[DimEntry]
    attributes: List[Attribute]
    schedules: List[Schedule]


class SolverTestScenariosService(BaseService):
    def __init__(
        self,
        collection: DatabaseCollections,
        test_data_file: Path | None = None,
    ):
        super().__init__(collection)
        if test_data_file is None:
            test_data_file = (
                Path(__file__).resolve().parents[2]
                / "tests"
                / "test_data"
                / "solver_data.json"
            )
        if not test_data_file.exists():
            raise FileNotFoundError(
                f"Solver data file not found: {test_data_file}"
            )
        self.test_data_file_path = test_data_file

    def get_scenario_names(self) -> List[str]:
        """Get list of all available scenario names from the JSON fixture.
        Raises:
            FileNotFoundError: if the fixture file does not exist.
            ValueError: if the fixture cannot be parsed or has no keys.
        """
        try:
            with self.test_data_file_path.open("r", encoding="utf-8") as fh:
                data = json.load(fh)
        except Exception as exc:
            raise ValueError(
                f"Failed to parse solver data file: {self.test_data_file_path}"
            ) from exc

        if not isinstance(data, dict) or len(data) == 0:
            raise ValueError(
                f"Solver data file {self.test_data_file_path} contains no scenarios"
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
        loaded = self.scenario_data_dict_to_core(scenario_data=scenario_data)

        # Create workers in DB (override team)
        saved = self.save_scenario_to_db(scenario_data=loaded, team_id=team_id)

        return ScenarioLoadResponse(
            scenario_name=scenario_name,
            specialties=saved.get("specialties", []),
            workers=saved.get("workers", []),
            shifts=saved.get("shifts", []),
            dimensions=saved.get("dimensions", []),
            dim_entries=saved.get("dim_entries", []),
            attributes=saved.get("attributes", []),
            schedules=saved.get("schedules", []),
        )

    def get_scenario_metadata(self, scenario_name: str) -> Dict[str, Any]:
        """Get metadata about a scenario without loading full data"""
        scenario = self.load_scenario_data_from_json(scenario_name)
        return {
            "name": scenario_name,
            "specialty_count": len(scenario.get("specialties", [])),
            "worker_count": len(scenario.get("workers", [])),
            "shift_count": len(scenario.get("shifts", [])),
            "dimension_count": len(scenario.get("dimensions", [])),
            "dim_entry_count": len(scenario.get("dim_entries", [])),
            "attribute_count": len(scenario.get("attributes", [])),
            "schedule_count": len(scenario.get("schedules", [])),
        }

    def load_scenario_data_from_json(
        self, scenario_name: str
    ) -> Dict[str, Any]:
        """Load raw scenario data from the local JSON fixture.

        Returns the raw dict stored under the given scenario name.
        """
        with self.test_data_file_path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)

        if scenario_name not in data:
            raise ValueError(
                f"Scenario '{scenario_name}' not found in solver_data.json"
            )

        return data[scenario_name]

    @staticmethod
    def scenario_data_dict_to_core(
        scenario_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        try:

            return {
                "specialties": [
                    SpecialtySchema.from_mongo(s).to_core()
                    for s in scenario_data.get("specialties", [])
                ],
                "workers": [
                    WorkerSchema.from_mongo(w).to_core()
                    for w in scenario_data.get("workers", [])
                ],
                "shifts": [
                    ShiftSchema.from_mongo(s).to_core()
                    for s in scenario_data.get("shifts", [])
                ],
                "dimensions": [
                    DimensionSchema.from_mongo(d).to_core()
                    for d in scenario_data.get("dimensions", [])
                ],
                "dim_entries": [
                    DimEntrySchema.from_mongo(de).to_core()
                    for de in scenario_data.get("dim_entries", [])
                ],
                "attributes": [
                    AttributeSchema.from_mongo(a).to_core()
                    for a in scenario_data.get("attributes", [])
                ],
                "schedules": [
                    ScheduleSchema.from_mongo(s).to_core()
                    for s in scenario_data.get("schedules", [])
                ],
            }
        except Exception as exc:
            raise ValueError(
                "Failed to convert scenario data to core objects"
            ) from exc

    def save_scenario_to_db(
        self,
        scenario_data: Dict[str, Any],
        team_id: str,
    ) -> Dict[str, Any]:
        """Save the given scenario data into the database."""
        try:
            out: Dict[str, Any] = {}
            maps: Dict[str, Any] = {}

            # Specialties
            specialties: List[Specialty] = scenario_data.get("specialties", [])
            if not all(isinstance(s, Specialty) for s in specialties):
                raise ValueError(
                    "Expected all specialties to be Specialty instances"
                )
            for s in specialties:
                if not maps.get("specialties", None):
                    maps["specialties"] = {}
                s.team_id = team_id
                s_id = s.id
                s.id = ""  # Clear ID to let DB assign a new one
                specialty_saved = (
                    self.collection.specialty_db.create_specialty(specialty=s)
                )
                maps["specialties"][s_id] = specialty_saved.id
                if not out.get("specialties", None):
                    out["specialties"] = []
                out["specialties"].append(specialty_saved)

            # Workers
            workers: List[Worker] = scenario_data.get("workers", [])
            if not all(isinstance(w, Worker) for w in workers):
                raise ValueError("Expected all workers to be Worker instances")
            for w in workers:
                if not maps.get("workers", None):
                    maps["workers"] = {}
                w.team_id = team_id
                # Remap specialty ids to the newly created specialty ids
                if maps.get("specialties"):
                    w.specialty_ids = [
                        maps["specialties"].get(old_id, old_id)
                        for old_id in w.specialty_ids
                    ]
                w_id = w.id
                w.id = ""  # Clear ID to let DB assign a new one
                worker_saved = self.collection.worker_db.create_worker(
                    worker=w
                )
                maps["workers"][w_id] = worker_saved.id

                if not out.get("workers", None):
                    out["workers"] = []
                out["workers"].append(worker_saved)

            # Shifts
            shifts: List[Shift] = scenario_data.get("shifts", [])
            if not all(isinstance(s, Shift) for s in shifts):
                raise ValueError("Expected all shifts to be Shift instances")
            for s in shifts:
                if not maps.get("shifts", None):
                    maps["shifts"] = {}
                s.team_id = team_id
                s_id = s.id
                s.id = ""  # Clear ID to let DB assign a new one
                shift_saved = self.collection.shift_db.create_shift(shift=s)
                maps["shifts"][s_id] = shift_saved.id

                if not out.get("shifts", None):
                    out["shifts"] = []
                out["shifts"].append(shift_saved)

            # Dimensions
            dimensions = scenario_data.get("dimensions", [])
            if not all(isinstance(d, Dimension) for d in dimensions):
                raise ValueError(
                    "Expected all dimensions to be Dimension instances"
                )
            for d in dimensions:
                if not maps.get("dimensions", None):
                    maps["dimensions"] = {}
                d.team_id = team_id
                d_id = d.id
                d.id = ""  # Clear ID to let DB assign a new one
                dimension_saved = (
                    self.collection.dimension_db.create_dimension(dimension=d)
                )
                maps["dimensions"][d_id] = dimension_saved.id
                if not out.get("dimensions", None):
                    out["dimensions"] = []
                out["dimensions"].append(dimension_saved)

            # Dim Entries
            dim_entries: List[DimEntry] = scenario_data.get("dim_entries", [])
            if not all(isinstance(de, DimEntry) for de in dim_entries):
                raise ValueError(
                    "Expected all dim entries to be DimEntry instances"
                )
            for de in dim_entries:
                if not maps.get("dim_entries", None):
                    maps["dim_entries"] = {}
                de_id = de.id
                de.id = ""  # Clear ID to let DB assign a new one
                # Update dimension reference
                if de.dimension_id in maps.get("dimensions", {}):
                    de.dimension_id = maps["dimensions"][de.dimension_id]
                dim_entry_saved = (
                    self.collection.dim_entry_db.create_dim_entry(dim_entry=de)
                )
                maps["dim_entries"][de_id] = dim_entry_saved.id
                if not out.get("dim_entries", None):
                    out["dim_entries"] = []
                out["dim_entries"].append(dim_entry_saved)

            # Attributes
            attributes: List[Attribute] = scenario_data.get("attributes", [])
            if not all(isinstance(a, Attribute) for a in attributes):
                raise ValueError(
                    "Expected all attributes to be Attribute instances"
                )
            for a in attributes:
                if not maps.get("attributes", None):
                    maps["attributes"] = {}
                a_id = a.id
                a.id = ""  # Clear ID to let DB assign a new one
                if a.owner_type == AttributeOwnerType.WORKER:
                    if a.owner_id in maps.get("workers", {}):
                        a.owner_id = maps["workers"][a.owner_id]
                elif a.owner_type == AttributeOwnerType.SHIFT:
                    if a.owner_id in maps.get("shifts", {}):
                        a.owner_id = maps["shifts"][a.owner_id]
                attribute_saved = (
                    self.collection.attribute_db.create_attribute(attribute=a)
                )
                maps["attributes"][a_id] = attribute_saved.id
                if not out.get("attributes", None):
                    out["attributes"] = []
                out["attributes"].append(attribute_saved)

            # Schedules
            schedules: List[Schedule] = scenario_data.get("schedules", [])
            if not all(isinstance(s, Schedule) for s in schedules):
                raise ValueError(
                    "Expected all schedules to be Schedule instances"
                )
            for s in schedules:
                s.team_id = team_id
                s.id = ""  # Clear ID to let DB assign a new one

                if not out.get("schedules", None):
                    out["schedules"] = []
                out["schedules"].append(
                    self.collection.schedule_db.create_schedule(schedule=s)
                )
            return out
        except Exception as exc:
            raise ValueError(
                "Failed to save scenario data to database"
            ) from exc
