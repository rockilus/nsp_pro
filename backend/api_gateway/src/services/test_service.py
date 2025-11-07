import json
from pathlib import Path
from typing import Any, Dict, List

from pydantic import BaseModel
from shared.database.database_collections import DatabaseCollections
from shared.database.schemas.attribute import AttributeSchema
from shared.database.schemas.constraint_build import ConstraintBuildSchema
from shared.database.schemas.dim_entry import DimEntrySchema
from shared.database.schemas.dimension import DimensionSchema
from shared.database.schemas.request import RequestSchema
from shared.database.schemas.schedule import ScheduleSchema
from shared.database.schemas.shift import ShiftSchema
from shared.database.schemas.shift_demand_new import ShiftDemandNewSchema
from shared.database.schemas.shift_demand_template import (
    ShiftDemandTemplateSchema,
)
from shared.database.schemas.specialty import SpecialtySchema
from shared.database.schemas.worker import WorkerSchema
from shared.database.schemas.link_shift import LinkShiftSchema
from shared.logger import log_info
from shared.schemas.core import (
    Attribute,
    AttributeOwnerType,
    LinkShift,
    BlockTypeOptions,
    RequestStatus,
    ConstraintBuild,
    Dimension,
    DimEntry,
    Request,
    RequestType,
    Schedule,
    Shift,
    ShiftDemandNew,
    ShiftDemandTemplate,
    ShiftWorkerOption,
    Specialty,
    SWOIdTypes,
    Worker,
)

from src.services.base_service import BaseService


class ScenarioLoadResponse(BaseModel):
    """Response model for scenario loading."""

    scenario_name: str
    specialties: List[Specialty]
    workers: List[Worker]
    shifts: List[Shift]
    link_shifts: List[LinkShift]
    dimensions: List[Dimension]
    dim_entries: List[DimEntry]
    attributes: List[Attribute]
    shift_demand_templates: List[ShiftDemandTemplate]
    shift_demands: List[ShiftDemandNew]
    constraints: List[ConstraintBuild]
    requests: List[Request]
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
            link_shifts=saved.get("link_shifts", []),
            dimensions=saved.get("dimensions", []),
            dim_entries=saved.get("dim_entries", []),
            attributes=saved.get("attributes", []),
            shift_demand_templates=saved.get("shift_demand_templates", []),
            shift_demands=saved.get("shift_demands", []),
            constraints=saved.get("constraints", []),
            requests=saved.get("requests", []),
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
            "shift_demand_templates_count": len(
                scenario.get("shift_demand_templates", [])
            ),
            "shift_demand_count": len(scenario.get("shift_demands", [])),
            "constraint_count": len(scenario.get("constraints", [])),
            "request_count": len(scenario.get("requests", [])),
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
                "link_shifts": [
                    LinkShiftSchema.from_mongo(ls).to_core()
                    for ls in scenario_data.get("link_shifts", [])
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
                "shift_demand_templates": [
                    ShiftDemandTemplateSchema.from_mongo(sdt).to_core()
                    for sdt in scenario_data.get("shift_demand_templates", [])
                ],
                "shift_demands": [
                    ShiftDemandNewSchema.from_mongo(sd).to_core()
                    for sd in scenario_data.get("shift_demands", [])
                ],
                "constraints": [
                    ConstraintBuildSchema.from_mongo(c).to_core()
                    for c in scenario_data.get("constraints", [])
                ],
                "requests": [
                    RequestSchema.from_mongo(r).to_core()
                    for r in scenario_data.get("requests", [])
                ],
                "schedules": [
                    ScheduleSchema.from_mongo(s).to_core()
                    for s in scenario_data.get("schedules", [])
                ],
            }
        except Exception as exc:
            # Include the original exception type and message to aid debugging
            exc_type = type(exc).__name__
            exc_msg = str(exc)
            log_info(
                f"Exception during scenario data conversion: {exc_type}: {exc_msg}"
            )
            raise ValueError(
                (
                    "Failed to convert scenario data to core objects: "
                    f"{exc_type}: {exc_msg}"
                )
            ) from exc

    def _remap_shift_worker_options(
        self, swo: ShiftWorkerOption | str, maps: Dict[str, Any]
    ) -> Any:
        # If caller passed a bare string id (legacy), just return it
        if isinstance(swo, str):
            return swo

        try:
            if swo.id_type == SWOIdTypes.WORKER:
                if maps.get("workers") and swo.id in maps["workers"]:
                    swo.id = maps["workers"][swo.id]
            elif swo.id_type == SWOIdTypes.SHIFT:
                if maps.get("shifts") and swo.id in maps["shifts"]:
                    swo.id = maps["shifts"][swo.id]
            elif swo.id_type == SWOIdTypes.DIMENSION:
                if maps.get("dimensions") and swo.id in maps["dimensions"]:
                    swo.id = maps["dimensions"][swo.id]
            elif swo.id_type == SWOIdTypes.SPECIALTY:
                if maps.get("specialties") and swo.id in maps["specialties"]:
                    swo.id = maps["specialties"][swo.id]
        except Exception:
            # be defensive: if any unexpected structure is encountered,
            # skip remapping for this option
            return swo

        return swo

    def save_scenario_to_db(
        self,
        scenario_data: Dict[str, Any],
        team_id: str,
    ) -> Dict[str, Any]:
        """Save the given scenario data into the database.

        This method coordinates a set of smaller helpers that each persist a
        single entity type. The helpers mutate `maps` and `out` in-place, which
        preserves the original remapping semantics.
        """
        try:
            out: Dict[str, Any] = {}
            maps: Dict[str, Any] = {}

            # Persist each entity type using small focused helpers.
            self._save_specialties(scenario_data, team_id, maps, out)
            self._save_workers(scenario_data, team_id, maps, out)
            self._save_shifts(scenario_data, team_id, maps, out)
            self._save_link_shifts(scenario_data, team_id, maps, out)
            self._save_dimensions(scenario_data, team_id, maps, out)
            self._save_dim_entries(scenario_data, maps, out)
            self._save_attributes(scenario_data, maps, out)
            self._save_shift_demand_templates(
                scenario_data, team_id, maps, out
            )
            self._save_shift_demands(scenario_data, team_id, maps, out)
            self._save_constraints(scenario_data, team_id, maps, out)
            self._save_requests(scenario_data, team_id, maps, out)
            self._save_schedules(scenario_data, team_id, maps, out)

            return out
        except Exception as exc:
            raise ValueError(
                "Failed to save scenario data to database"
            ) from exc

    # -- Helper methods -------------------------------------------------
    def _save_specialties(
        self,
        scenario_data: Dict[str, Any],
        team_id: str,
        maps: Dict[str, Any],
        out: Dict[str, Any],
    ) -> None:
        specialties: List[Specialty] = scenario_data.get("specialties", [])
        if not all(isinstance(s, Specialty) for s in specialties):
            raise ValueError(
                "Expected all specialties to be Specialty instances"
            )
        for spe in specialties:
            spe.team_id = team_id
            spe_id = spe.id
            spe.id = ""
            specialty_saved = self.collection.specialty_db.create_specialty(
                specialty=spe
            )

            maps.setdefault("specialties", {})[spe_id] = specialty_saved.id
            out.setdefault("specialties", []).append(specialty_saved)

    def _save_workers(
        self,
        scenario_data: Dict[str, Any],
        team_id: str,
        maps: Dict[str, Any],
        out: Dict[str, Any],
    ) -> None:
        workers: List[Worker] = scenario_data.get("workers", [])
        if not all(isinstance(w, Worker) for w in workers):
            raise ValueError("Expected all workers to be Worker instances")
        for w in workers:
            w.team_id = team_id
            if maps.get("specialties"):
                w.specialty_ids = [
                    maps["specialties"].get(old_id, old_id)
                    for old_id in w.specialty_ids
                ]
            w_id = w.id
            w.id = ""
            worker_saved = self.collection.worker_db.create_worker(worker=w)

            maps.setdefault("workers", {})[w_id] = worker_saved.id
            out.setdefault("workers", []).append(worker_saved)

    def _save_shifts(
        self,
        scenario_data: Dict[str, Any],
        team_id: str,
        maps: Dict[str, Any],
        out: Dict[str, Any],
    ) -> None:
        shifts: List[Shift] = scenario_data.get("shifts", [])
        if not all(isinstance(s, Shift) for s in shifts):
            raise ValueError("Expected all shifts to be Shift instances")
        for s in shifts:
            s.team_id = team_id
            if maps.get("specialties"):
                for st in s.staffing:
                    if st.specialty_id in maps["specialties"]:
                        st.specialty_id = maps["specialties"][st.specialty_id]
            s_id = s.id
            s.id = ""
            shift_saved = self.collection.shift_db.create_shift(shift=s)

            maps.setdefault("shifts", {})[s_id] = shift_saved.id
            out.setdefault("shifts", []).append(shift_saved)

    def _save_link_shifts(
        self,
        scenario_data: Dict[str, Any],
        team_id: str,
        maps: Dict[str, Any],
        out: Dict[str, Any],
    ) -> None:
        link_shifts: List[LinkShift] = scenario_data.get("link_shifts", [])
        if not all(isinstance(ls, LinkShift) for ls in link_shifts):
            raise ValueError(
                "Expected all link_shifts to be LinkShift instances"
            )
        for ls in link_shifts:
            ls.team_id = team_id
            ls_id = ls.id
            # Remap shift ids to the newly-created shift ids if mappings exist
            if maps.get("shifts"):
                ls.shift_ids = [
                    maps["shifts"].get(old_id, old_id)
                    for old_id in ls.shift_ids
                ]
            ls.id = ""
            # Persist link shift
            link_shift_saved = self.collection.link_shift_db.create_link_shift(
                link_shift=ls
            )

            maps.setdefault("link_shifts", {})[ls_id] = link_shift_saved.id
            out.setdefault("link_shifts", []).append(link_shift_saved)

    def _save_dimensions(
        self,
        scenario_data: Dict[str, Any],
        team_id: str,
        maps: Dict[str, Any],
        out: Dict[str, Any],
    ) -> None:
        dimensions = scenario_data.get("dimensions", [])
        if not all(isinstance(d, Dimension) for d in dimensions):
            raise ValueError(
                "Expected all dimensions to be Dimension instances"
            )
        for d in dimensions:
            d.team_id = team_id
            d_id = d.id
            d.id = ""
            dimension_saved = self.collection.dimension_db.create_dimension(
                dimension=d
            )

            maps.setdefault("dimensions", {})[d_id] = dimension_saved.id
            out.setdefault("dimensions", []).append(dimension_saved)

    def _save_dim_entries(
        self,
        scenario_data: Dict[str, Any],
        maps: Dict[str, Any],
        out: Dict[str, Any],
    ) -> None:
        dim_entries: List[DimEntry] = scenario_data.get("dim_entries", [])
        if not all(isinstance(de, DimEntry) for de in dim_entries):
            raise ValueError(
                "Expected all dim entries to be DimEntry instances"
            )
        for de in dim_entries:
            de_id = de.id
            de.id = ""
            if de.dimension_id in maps.get("dimensions", {}):
                de.dimension_id = maps["dimensions"][de.dimension_id]
            dim_entry_saved = self.collection.dim_entry_db.create_dim_entry(
                dim_entry=de
            )

            maps.setdefault("dim_entries", {})[de_id] = dim_entry_saved.id
            out.setdefault("dim_entries", []).append(dim_entry_saved)

    def _save_attributes(
        self,
        scenario_data: Dict[str, Any],
        maps: Dict[str, Any],
        out: Dict[str, Any],
    ) -> None:
        attributes: List[Attribute] = scenario_data.get("attributes", [])
        if not all(isinstance(a, Attribute) for a in attributes):
            raise ValueError(
                "Expected all attributes to be Attribute instances"
            )
        for a in attributes:
            a_id = a.id
            a.id = ""
            if maps.get("dimensions") and a.dimension_id in maps["dimensions"]:
                a.dimension_id = maps["dimensions"][a.dimension_id]
            if (
                a.owner_type == AttributeOwnerType.WORKER
                and a.owner_id in maps.get("workers", {})
            ):
                a.owner_id = maps["workers"][a.owner_id]
            elif (
                a.owner_type == AttributeOwnerType.SHIFT
                and a.owner_id in maps.get("shifts", {})
            ):
                a.owner_id = maps["shifts"][a.owner_id]
            attribute_saved = self.collection.attribute_db.create_attribute(
                attribute=a
            )

            maps.setdefault("attributes", {})[a_id] = attribute_saved.id
            out.setdefault("attributes", []).append(attribute_saved)

    # pylint: disable=too-many-nested-blocks
    def _save_shift_demand_templates(
        self,
        scenario_data: Dict[str, Any],
        team_id: str,
        maps: Dict[str, Any],
        out: Dict[str, Any],
    ) -> None:
        shift_demand_templates: List[ShiftDemandTemplate] = scenario_data.get(
            "shift_demand_templates", []
        )
        if not all(
            isinstance(sdt, ShiftDemandTemplate)
            for sdt in shift_demand_templates
        ):
            raise ValueError(
                "Expected all shift demand templates to be "
                + "ShiftDemandTemplate instances"
            )
        for sdt in shift_demand_templates:
            sdt.team_id = team_id
            sdt.id = ""
            try:
                maps_shifts = maps.get("shifts")
                if maps_shifts:
                    for week in sdt.weeks_data:
                        for demand in week.demands:
                            if demand.shift_id in maps_shifts:
                                demand.shift_id = maps_shifts[demand.shift_id]
            except Exception:
                # Skip deep remap on unexpected structure
                pass
            shift_demand_template_saved = (
                self.collection.shift_demand_template_db.create_template(
                    template=sdt
                )
            )

            out.setdefault("shift_demand_templates", []).append(
                shift_demand_template_saved
            )

    def _save_shift_demands(
        self,
        scenario_data: Dict[str, Any],
        team_id: str,
        maps: Dict[str, Any],
        out: Dict[str, Any],
    ) -> None:
        shift_demands: List[ShiftDemandNew] = scenario_data.get(
            "shift_demands", []
        )
        if not all(isinstance(sd, ShiftDemandNew) for sd in shift_demands):
            raise ValueError(
                "Expected all shift demands to be ShiftDemandNew instances"
            )
        for sd in shift_demands:
            sd.team_id = team_id
            sd.id = ""
            if maps.get("shifts") and sd.shift_id in maps["shifts"]:
                sd.shift_id = maps["shifts"][sd.shift_id]
            shift_demand_saved = (
                self.collection.shift_demand_new_db.create_shift_demand(
                    shift_demand=sd
                )
            )

            out.setdefault("shift_demands", []).append(shift_demand_saved)

    def _save_constraints(
        self,
        scenario_data: Dict[str, Any],
        team_id: str,
        maps: Dict[str, Any],
        out: Dict[str, Any],
    ) -> None:
        constraints: List[ConstraintBuild] = scenario_data.get(
            "constraints", []
        )
        if not all(isinstance(c, ConstraintBuild) for c in constraints):
            raise ValueError(
                "Expected all constraints to be ConstraintBuild instances"
            )
        for c in constraints:
            c.team_id = team_id
            c_id = c.id
            c.id = ""
            for b in c.blocks:
                if b.type == BlockTypeOptions.SHIFT_WORKER_OPTION:
                    if not isinstance(b.value, list) or not all(
                        isinstance(swo, ShiftWorkerOption) for swo in b.value
                    ):
                        raise ValueError(
                            "Expected block value to be list of "
                            "shift_worker_option"
                        )
                    b.value = [
                        self._remap_shift_worker_options(swo, maps)
                        for swo in b.value
                    ]

            constraint_saved = (
                self.collection.constraint_build_db.create_constraint_build(
                    constraint_build=c
                )
            )

            maps.setdefault("constraints", {})[c_id] = constraint_saved.id
            out.setdefault("constraints", []).append(constraint_saved)

    def _save_requests(
        self,
        scenario_data: Dict[str, Any],
        team_id: str,
        maps: Dict[str, Any],
        out: Dict[str, Any],
    ) -> None:
        requests: List[Request] = scenario_data.get("requests", [])
        if not all(isinstance(r, Request) for r in requests):
            raise ValueError("Expected all requests to be Request instances")
        for r in requests:
            r.team_id = team_id
            r.id = ""
            if maps.get("workers") and r.worker_id in maps["workers"]:
                r.worker_id = maps["workers"][r.worker_id]
            if (
                r.request_type == RequestType.LEAVE
                and maps.get("shifts")
                and r.shift_id in maps["shifts"]
            ):
                r.shift_id = maps["shifts"][r.shift_id]
            elif r.request_type == RequestType.WORK_DEMAND:
                if not isinstance(r.shift_options, list) or not all(
                    isinstance(swo, ShiftWorkerOption)
                    for swo in r.shift_options
                ):
                    raise ValueError(
                        "Expected request shift_options to be list of "
                        + "shift_worker_option"
                    )
                r.shift_options = [
                    self._remap_shift_worker_options(swo, maps)
                    for swo in r.shift_options
                ]

            r.status = RequestStatus.APPROVED
            request_saved = self.collection.request_db.create_request(
                request=r
            )
            out.setdefault("requests", []).append(request_saved)

    def _save_schedules(
        self,
        scenario_data: Dict[str, Any],
        team_id: str,
        maps: Dict[str, Any],
        out: Dict[str, Any],
    ) -> None:
        schedules: List[Schedule] = scenario_data.get("schedules", [])
        if not all(isinstance(s, Schedule) for s in schedules):
            raise ValueError("Expected all schedules to be Schedule instances")
        for schedule in schedules:
            schedule.team_id = team_id
            schedule.id = ""
            if maps.get("constraints"):
                remapped_ids: list[str] = []
                for c_id in schedule.constraint_build_ids:
                    if c_id in maps["constraints"]:
                        remapped_ids.append(maps["constraints"][c_id])
                schedule.constraint_build_ids = remapped_ids
            out.setdefault("schedules", []).append(
                self.collection.schedule_db.create_schedule(schedule=schedule)
            )
