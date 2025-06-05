from typing import List

from shared.augment.cb_to_cb_augmented import (
    build_missing_attributes_and_active_owner,
)
from shared.constraint_parser.build_dim_to_attr_value_to_owner import (
    build_dim_to_attr_value_to_owner,
)
from shared.constraint_parser.parse_selected_shifts import (
    parse_selected_shifts,
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
    active: bool = (
        worker is not None
        and not worker.deleted
        and (worker.employment_start_date <= request.start_date)
        and (
            worker.employment_end_date >= request.end_date
            if worker.employment_end_date
            else True
        )
    )
    missing_attributes: List[MissingAttribute] = []
    shift_ids: List[str] = []

    if request.request_type == RequestType.LEAVE:
        shift = next((s for s in shifts if s.id == request.shift_id), None)
        active = active and (not shift.deleted if shift else False)

    else:
        block = Block(
            name=BlockNameOptions.SHIFT,
            type=BlockTypeOptions.SHIFT_WORKER_OPTION,
            value=request.shift_options,
        )
        missing_attributes, new_active = build_missing_attributes_and_active_owner(
            owner_type=AttributeOwnerType.SHIFT,
            block=block,
            owners=shifts,
            dimensions=dimensions,
            dim_entries=dim_entries,
            attributes=attributes,
            specialties=[],
        )
        dim_to_attr_value_to_shift = build_dim_to_attr_value_to_owner(
            owners=shifts,
            dimensions=dimensions,
            dim_entries=dim_entries,
            attributes=attributes,
        )
        shift_ids = parse_selected_shifts(
            selected_shifts=request.shift_options,
            missing_properties=missing_attributes,
            shifts=shifts,
            shift_dim_dict=dim_to_attr_value_to_shift,
        )
        active = active and new_active

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
        shift_target_ids=shift_ids,
        missing_attributes=missing_attributes,
    )


# pylint: disable=too-many-locals
def requests_to_requests_augmented(
    requests: List[Request],
    workers: List[Worker],
    shifts: List[Shift],
    dimensions: List[Dimension],
    dim_entries: List[DimEntry],
    attributes: List[Attribute],
) -> List[RequestAugmented]:
    dim_to_attr_value_to_shift = build_dim_to_attr_value_to_owner(
        owners=shifts,
        dimensions=dimensions,
        dim_entries=dim_entries,
        attributes=attributes,
    )

    out: List[RequestAugmented] = []

    for r in requests:
        worker = next((w for w in workers if w.id == r.worker_id), None)
        active: bool = (
            worker is not None
            and not worker.deleted
            and (worker.employment_start_date <= r.start_date)
            and (
                worker.employment_end_date >= r.end_date
                if worker.employment_end_date
                else True
            )
        )
        missing_attributes: List[MissingAttribute] = []
        shift_ids: List[str] = []

        if r.request_type == RequestType.LEAVE:
            shift = next((s for s in shifts if s.id == r.shift_id), None)
            active = active and (not shift.deleted if shift else False)

        else:
            block = Block(
                name=BlockNameOptions.SHIFT,
                type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                value=r.shift_options,
            )
            missing_attributes, new_active = build_missing_attributes_and_active_owner(
                owner_type=AttributeOwnerType.SHIFT,
                block=block,
                owners=shifts,
                dimensions=dimensions,
                dim_entries=dim_entries,
                attributes=attributes,
                specialties=[],
            )

            shift_ids = parse_selected_shifts(
                selected_shifts=r.shift_options,
                missing_properties=missing_attributes,
                shifts=shifts,
                shift_dim_dict=dim_to_attr_value_to_shift,
            )
            active = active and new_active

        out.append(
            RequestAugmented(
                id=r.id,
                team_id=r.team_id,
                request_type=r.request_type,
                worker_id=r.worker_id,
                start_date=r.start_date,
                end_date=r.end_date,
                shift_id=r.shift_id,
                shift_options=r.shift_options,
                negative=r.negative,
                hard=r.hard,
                status=r.status,
                fulfillment=r.fulfillment,
                comment=r.comment,
                created_at=r.created_at,
                active=active,
                shift_target_ids=shift_ids,
                missing_attributes=missing_attributes,
            )
        )
    return out
