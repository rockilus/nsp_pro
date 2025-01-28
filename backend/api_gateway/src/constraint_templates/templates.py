from typing import Dict, List

from shared.schemas import (
    Attribute,
    AttributeOwnerType,
    Dimension,
    DimensionEntryType,
    DimensionType,
    ShiftType,
    DimEntry,
    Shift,
    ShiftRestType,
    ShiftWorkerOption,
    Specialty,
    SWOIdTypes,
    Template,
    Worker,
)

from constraint_templates.build_templates_list_en import (
    build_templates_list_en,
)
from constraint_templates.build_templates_list_es import (
    build_templates_list_es,
)
from constraint_templates.build_templates_list_fr import (
    build_templates_list_fr,
)

# WARNING: IMPORTING DBs HERE CREATED ERROR WITH PYTEST


# pylint: disable=too-many-arguments
def build_templates(
    workers: List[Worker],
    shifts: List[Shift],
    dimensions: List[Dimension],
    dim_entries: List[DimEntry],
    attributes: List[Attribute],
    specialties: List[Specialty],
    lng: str,
) -> List[Template]:
    dim_to_attributes: Dict[str, List[Attribute]] = {}
    for a in attributes:
        d_id = a.dimension_id
        if d_id not in dim_to_attributes:
            dim_to_attributes[d_id] = []
        dim_to_attributes[d_id].append(a)

    worker_options = build_options(
        AttributeOwnerType.WORKER,
        workers,
        [d for d in dimensions if d.dim_types == [DimensionType.WORKER]],
        dim_entries,
        dim_to_attributes,
        specialties,
    )
    shifts_constraint = [
        s
        for s in shifts
        if s.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]
        or s.rest_type == ShiftRestType.OFF
    ]
    shift_options = build_options(
        AttributeOwnerType.SHIFT,
        shifts_constraint,
        [
            d
            for d in dimensions
            if any(
                dt in [DimensionType.SHIFT, DimensionType.REST_SHIFT]
                for dt in d.dim_types
            )
        ],
        dim_entries,
        dim_to_attributes,
        [],
    )
    return build_templates_list(worker_options, shift_options, lng)


def build_options(
    owner_type: AttributeOwnerType,
    owners: List[Worker] | List[Shift],
    dimensions: List[Dimension],
    dim_entries: List[DimEntry],
    dim_to_attributes: Dict[str, List[Attribute]],
    specialties: List[Specialty],
) -> List[ShiftWorkerOption]:
    out: List[ShiftWorkerOption] = [
        ShiftWorkerOption(
            name=(
                "all workers"
                if owner_type == AttributeOwnerType.WORKER
                else "all shifts"
            ),
            id="",
            id_type=SWOIdTypes.NONE,
            is_bool_dim=False,
            category_name="All",
        )
    ] + [
        ShiftWorkerOption(
            name=o.name,
            id=o.id,
            id_type=(
                SWOIdTypes.WORKER
                if owner_type == AttributeOwnerType.WORKER
                else SWOIdTypes.SHIFT
            ),
            is_bool_dim=False,
            category_name=(
                "Workers"
                if owner_type == AttributeOwnerType.WORKER
                else "Shifts"
            ),
        )
        for o in owners
    ]
    if owner_type == AttributeOwnerType.WORKER:
        out += [
            ShiftWorkerOption(
                name=s.name,
                id=s.id,
                id_type=SWOIdTypes.SPECIALTY,
                is_bool_dim=False,
                category_name="Specialties",
            )
            for s in specialties
        ]
    for dimension in dimensions:
        dim_attributes = (
            dim_to_attributes[dimension.id]
            if dimension.id in dim_to_attributes
            else []
        )
        if dimension.entry_type == DimensionEntryType.BOOL and not any(
            option.id == dimension.id for option in out
        ):
            out.append(
                ShiftWorkerOption(
                    name="",
                    id=dimension.id,
                    id_type=SWOIdTypes.DIMENSION,
                    is_bool_dim=True,
                    category_name=dimension.name,
                )
            )
        elif dimension.entry_type == DimensionEntryType.DIM_ENTRIES:
            dim_des = [
                de for de in dim_entries if de.dimension_id == dimension.id
            ]
            out += [
                ShiftWorkerOption(
                    name=de.name,
                    id=dimension.id,
                    id_type=SWOIdTypes.DIMENSION,
                    is_bool_dim=False,
                    category_name=dimension.name,
                )
                for de in dim_des
            ]
        else:
            out += [
                ShiftWorkerOption(
                    name=str(wp_value),
                    id=dimension.id,
                    id_type=SWOIdTypes.DIMENSION,
                    is_bool_dim=False,
                    category_name=dimension.name,
                )
                for wp_value in list(set(str(a.value) for a in dim_attributes))
            ]
    return out


def build_templates_list(
    worker_options: List[ShiftWorkerOption],
    shift_options: List[ShiftWorkerOption],
    lang_code: str,
) -> List[Template]:
    if lang_code == "en":
        return build_templates_list_en(worker_options, shift_options)
    if lang_code == "fr":
        return build_templates_list_fr(worker_options, shift_options)
    if lang_code == "es":
        return build_templates_list_es(worker_options, shift_options)
    raise ValueError(f"Language code {lang_code} not supported")
