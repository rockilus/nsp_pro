from typing import List

from shared.augment.cb_to_cb_augmented import (
    build_missing_attributes_and_active_owner,
)
from shared.schemas.core import (
    Attribute,
    AttributeOwnerType,
    Block,
    BlockNameOptions,
    BlockTypeOptions,
    Dimension,
    DimEntry,
    MissingAttribute,
    Request,
    RequestAugmented,
    RequestType,
    Shift,
    Worker,
)


# pylint: disable=too-many-arguments, too-many-positional-arguments
def r_to_r_augmented(
    request: Request,
    worker: Worker | None,
    shifts: List[Shift],
    dimensions: List[Dimension],
    dim_entries: List[DimEntry],
    attributes: List[Attribute],
) -> RequestAugmented:
    active: bool = False
    missing_attributes: List[MissingAttribute] = []

    if request.request_type == RequestType.LEAVE:
        shift = next((s for s in shifts if s.id == request.shift_id), None)
        active = (not worker.deleted if worker else False) and (
            not shift.deleted if shift else False
        )

    else:
        block = Block(
            name=BlockNameOptions.SHIFT,
            type=BlockTypeOptions.SHIFT_WORKER_OPTION,
            value=request.shift_options,
        )
        missing_attributes, active = build_missing_attributes_and_active_owner(
            owner_type=AttributeOwnerType.SHIFT,
            block=block,
            owners=shifts,
            dimensions=dimensions,
            dim_entries=dim_entries,
            attributes=attributes,
            specialties=[],
        )

    return RequestAugmented(
        id=request.id,
        team_id=request.team_id,
        request_type=request.request_type,
        worker_id=request.worker_id,
        start_date=request.start_date,
        end_date=request.end_date,
        shift_id=request.shift_id,
        shift_options=request.shift_options,
        negative=request.negative,
        hard=request.hard,
        status=request.status,
        fulfillment=request.fulfillment,
        comment=request.comment,
        created_at=request.created_at,
        active=active,
        missing_attributes=missing_attributes,
    )
