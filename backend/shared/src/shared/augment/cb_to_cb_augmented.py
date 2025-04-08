from typing import List, Tuple

from shared.augment.blocks_to_string import blocks_to_string
from shared.schemas.schemas.attribute import Attribute, AttributeOwnerType
from shared.schemas.schemas.constraint import (
    Block,
    BlockNameOptions,
    ConstraintBuild,
    ConstraintBuildAugmented,
    MissingAttribute,
    ShiftWorkerOption,
    SWOIdTypes,
)
from shared.schemas.schemas.dim_entry import DimEntry
from shared.schemas.schemas.dimension import Dimension, DimensionEntryType
from shared.schemas.schemas.shift import Shift, ShiftType
from shared.schemas.schemas.specialty import Specialty
from shared.schemas.schemas.worker import Worker


# pylint: disable=too-many-arguments
def cb_to_cb_augmented(
    cb: ConstraintBuild,
    workers: List[Worker],
    shifts: List[Shift],
    dimensions: List[Dimension],
    dim_entries: List[DimEntry],
    attributes: List[Attribute],
    specialties: List[Specialty],
) -> ConstraintBuildAugmented:
    text = blocks_to_string(
        cb.blocks,
        workers,
        shifts,
        dimensions,
        specialties,
        cb.language,
    )
    missing_attributes, active = build_missing_attributes_and_active(
        cb.blocks,
        workers,
        shifts,
        dimensions,
        dim_entries,
        attributes,
        specialties,
    )
    return ConstraintBuildAugmented(
        id=cb.id,
        team_id=cb.team_id,
        constraint_type=cb.constraint_type,
        template_id=cb.template_id,
        language=cb.language,
        blocks=cb.blocks,
        hard=cb.hard,
        priority=cb.priority,
        text=text,
        missing_attributes=missing_attributes,
        active=active,
    )


# pylint: disable=too-many-locals
def build_missing_attributes_and_active(
    blocks: List[Block],
    workers: List[Worker],
    shifts: List[Shift],
    dimensions: List[Dimension],
    dim_entries: List[DimEntry],
    attributes: List[Attribute],
    specialties: List[Specialty],
) -> Tuple[List[MissingAttribute], bool]:
    mps: List[MissingAttribute] = []
    active_worker = False
    active_shift = False
    active_shift_reference = False
    active_shift_relative = False
    for block in blocks:
        if block.name == BlockNameOptions.WORKER:
            (new_mps, new_active_worker) = build_missing_attributes_and_active_owner(
                AttributeOwnerType.WORKER,
                block,
                workers,
                dimensions,
                dim_entries,
                attributes,
                specialties,
            )
            mps += new_mps
            active_worker = active_worker or new_active_worker
        if block.name in [
            BlockNameOptions.SHIFT,
            BlockNameOptions.SHIFT_REFERENCE,
            BlockNameOptions.SHIFT_RELATIVE,
        ]:
            new_mps, new_active_shift = build_missing_attributes_and_active_owner(
                AttributeOwnerType.SHIFT,
                block,
                shifts,
                dimensions,
                dim_entries,
                attributes,
                [],
            )
            mps += new_mps
            if block.name == BlockNameOptions.SHIFT:
                active_shift = active_shift or new_active_shift
            if block.name == BlockNameOptions.SHIFT_REFERENCE:
                active_shift_reference = active_shift_reference or new_active_shift
            if block.name == BlockNameOptions.SHIFT_RELATIVE:
                active_shift_relative = active_shift_relative or new_active_shift
    active = active_worker and (
        active_shift or (active_shift_reference and active_shift_relative)
    )
    return mps, active


# pylint: disable=too-many-branches, too-many-statements
def build_missing_attributes_and_active_owner(
    owner_type: AttributeOwnerType,
    block: Block,
    owners: List[Worker] | List[Shift],
    dimensions: List[Dimension],
    dim_entries: List[DimEntry],
    attributes: List[Attribute],
    specialties: List[Specialty],
) -> Tuple[List[MissingAttribute], bool]:
    mps: List[MissingAttribute] = []
    active = False
    if not isinstance(block.value, list):
        raise ValueError("Block value is not a list")
    if not all(isinstance(swo, ShiftWorkerOption) for swo in block.value):
        raise ValueError("Block value list does not contain ShiftWorkerOption")
    if (
        any(
            b.name in ["all workers", "all shifts"] for b in block.value  # type: ignore
        )
        and len([o for o in owners if not o.deleted]) > 0
    ):
        active = True
    new_mps, new_active = build_missing_attributes_and_active_owner_deleted(
        owner_type, block, owners
    )
    mps += new_mps
    active = active or new_active
    swo_d_ids = list(
        set(
            swo.id  # type: ignore
            for swo in block.value
            if swo.id_type == SWOIdTypes.DIMENSION  # type: ignore
        )
    )
    if any(d_id is None for d_id in swo_d_ids):
        raise ValueError("Dimension id is missing")
    for d_id in swo_d_ids:
        dimension = next((d for d in dimensions if d.id == d_id), None)
        if dimension is None:
            raise ValueError("Dimension not found")
        if dimension.deleted:
            mps.append(
                build_missing_attributes_deleted_dimension(owner_type, block, dimension)
            )
            continue
        if dimension.entry_type == DimensionEntryType.BOOL:
            (new_mp, new_active) = build_missing_attributes_and_active_dimension_bool(
                owner_type, block, owners, dimension, attributes
            )

        elif dimension.entry_type == DimensionEntryType.DIM_ENTRIES:
            (
                new_mp,
                new_active,
            ) = build_missing_attributes_and_active_dimension_dim_entry(
                owner_type,
                block,
                owners,
                dimension,
                dim_entries,
                attributes,
            )
        elif dimension.entry_type in [
            DimensionEntryType.STR,
            DimensionEntryType.INT,
        ]:
            (
                new_mp,
                new_active,
            ) = build_missing_attributes_and_active_dimension_str_int(
                owner_type, block, owners, dimension, attributes
            )
        else:
            new_mp = None
            new_active = False
        if new_mp is not None:
            mps.append(new_mp)
        active = active or new_active

    new_active = False
    swo_spe_ids = list(
        set(
            swo.id  # type: ignore
            for swo in block.value
            if swo.id_type == SWOIdTypes.SPECIALTY  # type: ignore
        )
    )
    if any(spe_id is None for spe_id in swo_spe_ids):
        raise ValueError("Specialty id is missing")
    for spe_id in swo_spe_ids:
        specialty = next((spe for spe in specialties if spe.id == spe_id), None)
        if specialty is None:
            raise ValueError("Specialty not found")
        if specialty.deleted:
            mps.append(
                MissingAttribute(
                    dimension_id=specialty.id,
                    is_bool=False,
                    dim_name=specialty.name,
                    category=owner_type,
                    attribute_values=[specialty.name],
                )
            )
            continue
        new_active = True
    active = active or new_active

    swos_duty = [
        swo for swo in block.value if swo.id_type == SWOIdTypes.DUTY  # type: ignore
    ]
    if not all(isinstance(swo.name, bool) for swo in swos_duty):  # type: ignore
        raise ValueError("Duty name is not a boolean in SWO")
    new_active = False
    for swo in swos_duty:
        if swo.name is True:  # type: ignore
            if any(
                owner
                for owner in owners
                if owner.shift_type == ShiftType.DUTY  # type: ignore
                and not owner.deleted
            ):
                new_active = True
        else:
            if any(
                owner
                for owner in owners
                if owner.shift_type == ShiftType.NORMAL  # type: ignore
                and not owner.deleted
            ):
                new_active = True
    active = active or new_active
    return mps, active


def build_missing_attributes_and_active_owner_deleted(
    owner_type: AttributeOwnerType,
    block: Block,
    owners: List[Worker] | List[Shift],
) -> Tuple[List[MissingAttribute], bool]:
    mps = []
    active = False
    if not isinstance(block.value, list):
        raise ValueError("Block value is not a list")
    if not all(isinstance(swo, ShiftWorkerOption) for swo in block.value):
        raise ValueError("Block value list does not contain ShiftWorkerOption")
    target_swo_id_type = (
        SWOIdTypes.WORKER
        if owner_type == AttributeOwnerType.WORKER
        else SWOIdTypes.SHIFT
    )
    owner_ids = list(
        set(
            swo.id  # type: ignore
            for swo in block.value
            if swo.id_type == target_swo_id_type  # type: ignore
        )
    )
    if any(o_id is None for o_id in owner_ids):
        raise ValueError("Owner id is missing")
    for owner_id in owner_ids:
        owner = next((o for o in owners if o.id == owner_id), None)
        if owner is None:
            raise ValueError("Owner not found")
        if not owner.deleted:
            active = True
            continue
        mps.append(
            MissingAttribute(
                dimension_id=owner_id,
                is_bool=False,
                dim_name=owner.name,
                category=owner_type,
                attribute_values=[owner.name],
            )
        )
    return mps, active


def build_missing_attributes_deleted_dimension(
    owner_type: AttributeOwnerType, block: Block, dimension: Dimension
) -> MissingAttribute:
    if dimension.entry_type == DimensionEntryType.DIM_ENTRIES:
        a_values_constraint = [
            swo.name for swo in block.value if swo.id == dimension.id  # type: ignore
        ]
    elif dimension.entry_type == DimensionEntryType.BOOL:
        a_values_constraint = list(
            set(
                swo.name  # type: ignore
                for swo in block.value  # type: ignore
                if swo.id == dimension.id  # type: ignore
            )
        )
    else:
        a_values_constraint = [
            swo.name for swo in block.value if swo.id == dimension.id  # type: ignore
        ]
    return MissingAttribute(
        dimension_id=dimension.id,
        is_bool=dimension.entry_type == DimensionEntryType.BOOL,
        dim_name=dimension.name,
        category=owner_type,
        attribute_values=a_values_constraint,  # type: ignore
    )


def build_missing_attributes_and_active_dimension_bool(
    owner_type: AttributeOwnerType,
    block: Block,
    owners: List[Worker] | List[Shift],
    dimension: Dimension,
    attributes: List[Attribute],
) -> Tuple[MissingAttribute | None, bool]:
    if not isinstance(block.value, list):
        raise ValueError("Block value is not a list")
    if not all(isinstance(b, ShiftWorkerOption) for b in block.value):
        raise ValueError("Block value list does not contain ShiftWorkerOption")
    a_values_constraint: List[bool] = list(
        set(swo.name for swo in block.value if swo.id == dimension.id)  # type: ignore
    )
    if any(value is None for value in a_values_constraint):
        raise ValueError("Attribute value from block is missing")
    o_not_deleted_ids = [o.id for o in owners if not o.deleted]
    a_all = [
        a
        for a in attributes
        if a.dimension_id == dimension.id and a.owner_id in o_not_deleted_ids
    ]
    a_values_owners = [a.value for a in a_all]
    if not all(isinstance(v, bool) for v in a_values_owners):
        raise ValueError("Attribute value is not a boolean")
    missing_values = list(
        set(a_values_constraint) - set(a_values_owners)  # type: ignore
    )
    not_missing_values = list(set(a_values_constraint) - set(missing_values))
    if missing_values:
        mp = MissingAttribute(
            dimension_id=dimension.id,
            is_bool=True,
            dim_name=dimension.name,
            category=owner_type,
            attribute_values=missing_values,  # type: ignore
        )
    else:
        mp = None
    return mp, len(not_missing_values) > 0


def build_missing_attributes_and_active_dimension_dim_entry(
    owner_type: AttributeOwnerType,
    block: Block,
    owners: List[Shift] | List[Worker],
    dimension: Dimension,
    dim_entries: List[DimEntry],
    attributes: List[Attribute],
) -> Tuple[MissingAttribute | None, bool]:
    if not isinstance(block.value, list):
        raise ValueError("Block value is not a list")
    if not all(isinstance(swo, ShiftWorkerOption) for swo in block.value):
        raise ValueError("Block value list does not contain ShiftWorkerOption")
    a_values_constraint = [
        swo.name for swo in block.value if swo.id == dimension.id  # type: ignore
    ]
    if any(value is None for value in a_values_constraint):
        raise ValueError("Attribute value from block is missing")
    o_not_deleted_ids = [o.id for o in owners if not o.deleted]
    a_all = [
        a
        for a in attributes
        if a.dimension_id == dimension.id and a.owner_id in o_not_deleted_ids
    ]
    dim_entry_ids = list(set(de_id for a in a_all for de_id in a.dim_entry_ids))
    dim_entry_names_owners = [de.name for de in dim_entries if de.id in dim_entry_ids]
    missing_values = list(set(a_values_constraint) - set(dim_entry_names_owners))
    not_missing_values = list(set(a_values_constraint) - set(missing_values))
    if missing_values:
        mp = MissingAttribute(
            dimension_id=dimension.id,
            is_bool=False,
            dim_name=dimension.name,
            category=owner_type,
            attribute_values=missing_values,  # type: ignore
        )
    else:
        mp = None
    return mp, len(not_missing_values) > 0


def build_missing_attributes_and_active_dimension_str_int(
    owner_type: AttributeOwnerType,
    block: Block,
    owners: List[Shift] | List[Worker],
    dimension: Dimension,
    attributes: List[Attribute],
) -> Tuple[MissingAttribute | None, bool]:
    if not isinstance(block.value, list):
        raise ValueError("Block value is not a list")
    if not all(isinstance(swo, ShiftWorkerOption) for swo in block.value):
        raise ValueError("Block value list does not contain ShiftWorkerOption")
    a_values_constraint = [
        swo.name for swo in block.value if swo.id == dimension.id  # type: ignore
    ]
    if any(value is None for value in a_values_constraint):
        raise ValueError("Attribute value from block is missing")
    o_not_deleted_ids = [o.id for o in owners if not o.deleted]
    a_all = [
        a
        for a in attributes
        if a.dimension_id == dimension.id and a.owner_id in o_not_deleted_ids
    ]
    if not (
        all(isinstance(a.value, str) for a in a_all)
        or all(isinstance(a.value, int) for a in a_all)
    ):
        raise ValueError("Attribute value is not a str or int")
    wp_values_shifts = [a.value for a in a_all]
    missing_values = list(set(a_values_constraint) - set(wp_values_shifts))
    not_missing_values = list(set(a_values_constraint) - set(missing_values))
    if missing_values:
        mp = MissingAttribute(
            dimension_id=dimension.id,
            is_bool=False,
            dim_name=dimension.name,
            category=owner_type,
            attribute_values=missing_values,  # type: ignore
        )
    else:
        mp = None
    return mp, len(not_missing_values) > 0
