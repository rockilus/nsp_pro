# from typing import Dict, List

# from constraint_parser.build_templates_list_en import build_templates_list_en
# from constraint_parser.build_templates_list_es import build_templates_list_es
# from constraint_parser.build_templates_list_fr import build_templates_list_fr
# from core import (
#     Attribute,
#     Dimension,
#     DimensionEntryType,
#     DimEntry,
#     Shift,
#     ShiftLeaveType,
#     ShiftWorkerOption,
#     Template,
#     Worker,
#     WorkerDimension,
#     WorkerProperty,
# )


# # pylint: disable=too-many-arguments
# def build_templates(
#     workers: List[Worker],
#     worker_dimensions: List[WorkerDimension],
#     worker_properties: Dict[str, List[WorkerProperty]],
#     shifts: List[Shift],
#     shift_dimensions: List[Dimension],
#     shift_dim_entries: List[DimEntry],
#     shift_properties: Dict[str, List[Attribute]],
#     lang_code: str,
# ) -> List[Template]:
#     worker_options = build_worker_options(
#         workers, worker_dimensions, worker_properties
#     )
#     shift_options = build_shift_options(
#         shifts, shift_dimensions, shift_dim_entries, shift_properties
#     )
#     return build_templates_list(worker_options, shift_options, lang_code)


# def build_worker_options(
#     workers: List[Worker],
#     worker_dimensions: List[WorkerDimension],
#     worker_properties: Dict[str, List[WorkerProperty]],
# ) -> List[ShiftWorkerOption]:
#     worker_options: List[ShiftWorkerOption] = [
#         ShiftWorkerOption(
#             name="all workers",
#             id="",
#             id_type="",
#             is_bool_dim=False,
#             category_name="All",
#         )
#     ] + [
#         ShiftWorkerOption(
#             name=w.name,
#             id=w.id,
#             id_type="worker",
#             is_bool_dim=False,
#             category_name="Workers",
#         )
#         for w in workers
#     ]
#     for worker_dimension in [wd for wd in worker_dimensions if not wd.deleted]:
#         worker_properties_wd = (
#             worker_properties[worker_dimension.id]
#             if worker_dimension.id in worker_properties
#             else []
#         )
#         if worker_dimension.entry_type == "bool":
#             worker_options.append(
#                 ShiftWorkerOption(
#                     name="",
#                     id=worker_dimension.id,
#                     id_type="worker_dimension",
#                     is_bool_dim=True,
#                     category_name=worker_dimension.name,
#                 )
#             )
#         elif worker_dimension.entry_type == "list":
#             worker_options += [
#                 ShiftWorkerOption(
#                     name=str(wp_value),
#                     id=worker_dimension.id,
#                     id_type="worker_dimension",
#                     is_bool_dim=False,
#                     category_name=worker_dimension.name,
#                 )
#                 for wp_value in worker_dimension.entry_options  # showing all options
#                 # for wp_value in list(
#                 #     set(
#                 #         str(item)
#                 #         for wp in worker_properties_wd
#                 #         for item in wp.value  # type: ignore
#                 #     )
#                 # ) # showing only options that are used
#             ]
#         else:
#             worker_options += [
#                 ShiftWorkerOption(
#                     name=str(wp_value),
#                     id=worker_dimension.id,
#                     id_type="worker_dimension",
#                     is_bool_dim=False,
#                     category_name=worker_dimension.name,
#                 )
#                 for wp_value in list(
#                     set(str(wp.value) for wp in worker_properties_wd)
#                 )
#             ]
#     return worker_options


# def build_shift_options(
#     shifts: List[Shift],
#     shift_dimensions: List[Dimension],
#     shift_dim_entries: List[DimEntry],
#     shift_properties: Dict[str, List[Attribute]],
# ) -> List[ShiftWorkerOption]:
#     shift_options: List[ShiftWorkerOption] = [
#         ShiftWorkerOption(
#             name="all shifts",
#             id="",
#             id_type="",
#             is_bool_dim=False,
#             category_name="All",
#         )
#     ] + [
#         ShiftWorkerOption(
#             name=s.name,
#             id=s.id,
#             id_type="shift",
#             is_bool_dim=False,
#             category_name="Shifts",
#         )
#         for s in shifts
#         if s.leave_type == ShiftLeaveType.NONE
#     ]
#     for shift_dimension in [sd for sd in shift_dimensions if not sd.deleted]:
#         shift_properties_sd = (
#             shift_properties[shift_dimension.id]
#             if shift_dimension.id in shift_properties
#             else []
#         )
#         if shift_dimension.entry_type == DimensionEntryType.BOOL:
#             shift_options.append(
#                 ShiftWorkerOption(
#                     name="",
#                     id=shift_dimension.id,
#                     id_type="shift_dimension",
#                     is_bool_dim=True,
#                     category_name=shift_dimension.name,
#                 )
#             )
#         elif shift_dimension.entry_type == DimensionEntryType.DIM_ENTRIES:
#             dim_entry_names = [
#                 de.name
#                 for de in shift_dim_entries
#                 if de.dimension_id == shift_dimension.id
#             ]
#             shift_options += [
#                 ShiftWorkerOption(
#                     name=name,
#                     id=shift_dimension.id,
#                     id_type="shift_dimension",
#                     is_bool_dim=False,
#                     category_name=shift_dimension.name,
#                 )
#                 for name in dim_entry_names  # showing all options
#                 # for sp_value in list(
#                 #     set(
#                 #         str(item)
#                 #         for sp in shift_properties_sd
#                 #         for item in sp.value  # type: ignore
#                 #     )
#                 # ) # showing only options that are used
#             ]
#         else:
#             shift_options += [
#                 ShiftWorkerOption(
#                     name=str(sp_value),
#                     id=shift_dimension.id,
#                     id_type="shift_dimension",
#                     is_bool_dim=False,
#                     category_name=shift_dimension.name,
#                 )
#                 for sp_value in list(
#                     set(str(sp.value) for sp in shift_properties_sd)
#                 )
#             ]
#     return shift_options


# def build_templates_list(
#     worker_options: List[ShiftWorkerOption],
#     shift_options: List[ShiftWorkerOption],
#     lang_code: str,
# ) -> List[Template]:
#     if lang_code == "en":
#         return build_templates_list_en(worker_options, shift_options)
#     if lang_code == "fr":
#         return build_templates_list_fr(worker_options, shift_options)
#     if lang_code == "es":
#         return build_templates_list_es(worker_options, shift_options)
#     raise ValueError(f"Language code {lang_code} not supported")


from typing import Dict, List

from constraint_parser.build_templates_list_en import build_templates_list_en
from constraint_parser.build_templates_list_es import build_templates_list_es
from constraint_parser.build_templates_list_fr import build_templates_list_fr
from core import (
    Attribute,
    AttributeOwnerType,
    Dimension,
    DimensionEntryType,
    DimensionType,
    DimEntry,
    Shift,
    ShiftWorkerOption,
    Template,
    Worker,
)
from scripts.setup_database import (
    attribute_db,
    dim_entry_db,
    dimension_db,
    shift_db,
    user_db,
    worker_db,
)


# pylint: disable=too-many-arguments
def build_templates(team_id: str, user_id: str) -> List[Template]:
    user = user_db.get_user_by_id(user_id)
    workers = worker_db.get_workers_not_deleted(team_id)
    shifts = shift_db.get_shifts_not_deleted(team_id)
    sw_ids = [s.id for s in shifts] + [w.id for w in workers]
    dimensions = dimension_db.get_dimensions_not_deleted(team_id)
    dim_entries = dim_entry_db.get_dim_entries_by_dim_ids(
        [d.id for d in dimensions]
    )
    attributes = attribute_db.get_attributes_by_owner_ids(sw_ids)
    dim_to_attributes: Dict[str, List[Attribute]] = {}
    for a in attributes:
        d_id = a.dimension_id
        if d_id not in dim_to_attributes:
            dim_to_attributes[d_id] = []
        dim_to_attributes[d_id].append(a)

    worker_options = build_shift_options(
        AttributeOwnerType.WORKER,
        workers,
        [d for d in dimensions if d.dim_types == [DimensionType.WORKER]],
        dim_entries,
        dim_to_attributes,
    )
    shift_options = build_shift_options(
        AttributeOwnerType.SHIFT,
        shifts,
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
    )
    return build_templates_list(worker_options, shift_options, user.language)


def build_shift_options(
    owner_type: AttributeOwnerType,
    owners: List[Worker] | List[Shift],
    dimensions: List[Dimension],
    dim_entries: List[DimEntry],
    dim_to_attributes: Dict[str, List[Attribute]],
) -> List[ShiftWorkerOption]:
    out: List[ShiftWorkerOption] = [
        ShiftWorkerOption(
            name=(
                "all workers"
                if owner_type == AttributeOwnerType.WORKER
                else "all shifts"
            ),
            id="",
            id_type="",
            is_bool_dim=False,
            category_name="All",
        )
    ] + [
        ShiftWorkerOption(
            name=o.name,
            id=o.id,
            id_type=(
                "worker"
                if owner_type == AttributeOwnerType.WORKER
                else "shift"
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
    for dimension in dimensions:
        dim_attributes = (
            dim_to_attributes[dimension.id]
            if dimension.id in dim_to_attributes
            else []
        )
        if dimension.entry_type == DimensionEntryType.BOOL:
            out.append(
                ShiftWorkerOption(
                    name="",
                    id=dimension.id,
                    id_type="dimension",
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
                    id_type="dimension",
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
                    id_type="dimension",
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
