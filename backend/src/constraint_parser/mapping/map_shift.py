from typing import Dict, List, Set, Tuple

from constraint_parser.mapping.utils import find_block_by_name
from core import (
    Block,
    ConstraintBuildAugmented,
    ConstraintOperator,
    ConstraintType,
    MissingAttribute,
    Shift,
    ShiftType,
    ShiftWorkerOption,
    VarShift,
)
from utils.constants import Constants


class MapShift:
    def __init__(
        self,
        shifts: List[Shift],
        shift_dim_dict: Dict,
        shift_ids_in_coverage: List[str] | None = None,
    ) -> None:
        self.shifts = shifts
        self.shift_dim_dict = shift_dim_dict
        self.shift_ids_in_coverage = shift_ids_in_coverage

    def __call__(
        self,
        cstr_build: ConstraintBuildAugmented,
        cstr_operator: ConstraintOperator | None,
    ) -> VarShift:
        shift_values = (
            self.get_shift_values(cstr_build.blocks, "shift")
            if cstr_build.constraint_type != ConstraintType.ORD
            else []
        )
        shift_reference_values = (
            self.get_shift_values(cstr_build.blocks, "shift_reference")
            if cstr_build.constraint_type == ConstraintType.ORD
            else []
        )
        shift_relative_values = (
            self.get_shift_values(cstr_build.blocks, "shift_relative")
            if cstr_build.constraint_type == ConstraintType.ORD
            else []
        )
        return VarShift(
            selector=self.get_selector(
                shift_values, cstr_build.constraint_type
            ),
            target_ids=self.get_target_ids(
                shift_values,
                cstr_build.constraint_type,
                cstr_build.missing_attributes,
                cstr_operator,
            ),
            reference_ids=self.get_target_ids(
                shift_reference_values,
                cstr_build.constraint_type,
                cstr_build.missing_attributes,
            ),
            relative_ids=self.get_target_ids(
                shift_relative_values,
                cstr_build.constraint_type,
                cstr_build.missing_attributes,
            ),
        )

    def get_coords_shifts(
        self,
        cba: ConstraintBuildAugmented,
        cstr_operator: ConstraintOperator | None,
    ) -> List[Shift]:
        swos_shift = self.get_shift_values(cba.blocks, "shift")
        selector = self.get_selector(swos_shift, cba.constraint_type)
        target_ids = self.get_target_ids(
            swos_shift,
            cba.constraint_type,
            cba.missing_attributes,
            cstr_operator,
        )
        if selector == "all":
            if self.shift_ids_in_coverage is not None:
                return [
                    s
                    for s in self.shifts
                    if s.id in self.shift_ids_in_coverage
                ]
            return self.shifts
        if selector == "equal":
            return [s for s in self.shifts if s.id in target_ids]
        raise NotImplementedError(
            f"Shift selector {selector} " + "not implemented"
        )

    def get_coords_shifts_ord(
        self, cba: ConstraintBuildAugmented
    ) -> List[Tuple[Shift, Shift]]:
        swos_shift_ref = self.get_shift_values(cba.blocks, "shift_reference")
        swos_shift_rel = self.get_shift_values(cba.blocks, "shift_relative")
        shift_ref_ids = self.get_target_ids(
            swos_shift_ref,
            cba.constraint_type,
            cba.missing_attributes,
        )
        shift_rel_ids = self.get_target_ids(
            swos_shift_rel,
            cba.constraint_type,
            cba.missing_attributes,
        )
        shifts_ref = [s for s in self.shifts if s.id in shift_ref_ids]
        shifts_rel = [s for s in self.shifts if s.id in shift_rel_ids]
        return [(s_ref, s_rel) for s_ref in shifts_ref for s_rel in shifts_rel]

    def get_coords_shifts_fil(
        self,
        cba: ConstraintBuildAugmented,
        cstr_operator: ConstraintOperator | None,
    ) -> List[str]:
        swos_shift = self.get_shift_values(cba.blocks, "shift")
        shift_ids = self.get_target_ids(
            swos_shift,
            cba.constraint_type,
            cba.missing_attributes,
            cstr_operator,
        )
        if cstr_operator == ConstraintOperator.NO:
            return shift_ids
        return [s.id for s in self.shifts if s not in shift_ids]

    def get_selector(
        self, values: List[ShiftWorkerOption], cstr_type: ConstraintType | None
    ) -> Constants.VAR_SHIFT_SELECTOR_OPTIONS:
        if cstr_type == ConstraintType.ORD:
            return "all"
        string_values = [v.name for v in values if isinstance(v.name, str)]
        if any("all shifts" in v for v in string_values):
            return "all"
        return "equal"

    # "shift", "worker", "dimension", ""
    # if id_type is shift, check if the shift exists, and return the id
    # if id_type is dimension, check if the dimension exists.
    # if it does, check if the property is in missing properties.
    # if it is not in the missing property, return the list of shift ids that
    # have this property. This might be done differently if for bool dimensions

    # In the case of property values, we look for the shifts that have the
    # property value in a dictionary with the format:
    # {
    #     "dimension_id": {
    #         "property_value": [ids of shifts with this property],
    #         ...
    #     },
    #     ...
    # }
    def get_target_ids(
        self,
        values: List[ShiftWorkerOption],
        cstr_type: ConstraintType | None,
        missing_properties: List[MissingAttribute],
        cstr_operator: ConstraintOperator | None = None,
    ) -> List[str]:
        if (
            self.get_selector(values, cstr_type) == "all"
            and cstr_type != ConstraintType.ORD
        ):
            return []
        out = []
        for value in values:
            if value.id_type == "shift":
                if not self.check_shift_id(value.id):
                    raise ValueError(
                        f"Shift {value.name} with id {value.id} not found"
                    )
                out.append(value.id)
            # pylint: disable=R0801
            elif value.id_type == "dimension":
                target_ids = self.get_target_ids_dimension(
                    value, missing_properties
                )
                if target_ids:
                    out += target_ids
        if (
            cstr_type == ConstraintType.FIL
            and cstr_operator == ConstraintOperator.YES
        ):
            out += [
                s.id
                for s in self.shifts
                if s.shift_type in [ShiftType.REST, ShiftType.LEAVE]
            ]
        return sorted(list(set(out)))

    # pylint: disable=R0801
    def get_target_ids_dimension(
        self,
        value: ShiftWorkerOption,
        missing_properties: List[MissingAttribute],
    ) -> List[str] | None:
        mp = next(
            (mp for mp in missing_properties if mp.dimension_id == value.id),
            None,
        )
        if mp and value.name in mp.attribute_values:
            return None
        if value.id not in self.shift_dim_dict:
            raise ValueError(f"Shift dimension {value.id} not found")
        if value.is_bool_dim:
            if not isinstance(value.name, bool):
                raise ValueError(
                    "Value name is not a boolean for bool dimension"
                )
            if value.name not in self.shift_dim_dict[value.id]:
                raise ValueError(
                    f"Shift property {value.name} "
                    + f"for dimension {value.id} not found"
                )
            return self.shift_dim_dict[value.id][value.name]
        if not isinstance(value.name, str):
            raise ValueError(
                "Value name is not a string for non-bool dimension"
            )
        # if value.name.lower() not in self.shift_dim_dict[value.id]:
        if value.name not in self.shift_dim_dict[value.id]:
            raise ValueError(
                f"Shift property {value.name} "
                + f"for dimension {value.id} not found"
            )
        # return self.shift_dim_dict[value.id][value.name.lower()]
        return self.shift_dim_dict[value.id][value.name]

    def check_shift_id(self, shift_id: str) -> bool:
        return any(s.id == shift_id for s in self.shifts)

    @staticmethod
    def get_shift_values(
        blocks: List[Block], block_name: str
    ) -> List[ShiftWorkerOption]:
        shift_block = find_block_by_name(blocks, block_name)
        if shift_block:
            if not isinstance(shift_block.value, list):
                raise ValueError("Shift block value is not a list")
            if not all(
                isinstance(v, ShiftWorkerOption) for v in shift_block.value
            ):
                raise ValueError(
                    "Shift block value is not a list of ShiftWorkerOption"
                )
            return shift_block.value  # type: ignore
        raise ValueError("Shift block not found")
