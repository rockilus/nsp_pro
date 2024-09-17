from typing import Dict, List

from constraint_parser.build_templates_list_en import build_templates_list_en
from constraint_parser.build_templates_list_es import build_templates_list_es
from constraint_parser.build_templates_list_fr import build_templates_list_fr
from core import (
    Shift,
    ShiftDimension,
    ShiftProperty,
    ShiftWorkerOption,
    Template,
    Worker,
    WorkerDimension,
    WorkerProperty,
)


# pylint: disable=too-many-arguments
def build_templates(
    workers: List[Worker],
    worker_dimensions: List[WorkerDimension],
    worker_properties: Dict[str, List[WorkerProperty]],
    shifts: List[Shift],
    shift_dimensions: List[ShiftDimension],
    shift_properties: Dict[str, List[ShiftProperty]],
    lang_code: str,
) -> List[Template]:
    worker_options = build_worker_options(
        workers, worker_dimensions, worker_properties
    )
    shift_options = build_shift_options(
        shifts, shift_dimensions, shift_properties
    )
    return build_templates_list(worker_options, shift_options, lang_code)


def build_worker_options(
    workers: List[Worker],
    worker_dimensions: List[WorkerDimension],
    worker_properties: Dict[str, List[WorkerProperty]],
) -> List[ShiftWorkerOption]:
    worker_options: List[ShiftWorkerOption] = [
        ShiftWorkerOption(
            name="all workers",
            id="",
            id_type="",
            is_bool_dim=False,
            category_name="All",
        )
    ] + [
        ShiftWorkerOption(
            name=w.name,
            id=w.id,
            id_type="worker",
            is_bool_dim=False,
            category_name="Workers",
        )
        for w in workers
    ]
    for worker_dimension in worker_dimensions:
        worker_properties_wd = (
            worker_properties[worker_dimension.id]
            if worker_dimension.id in worker_properties
            else []
        )
        if worker_dimension.entry_type == "bool":
            worker_options += [
                ShiftWorkerOption(
                    name=worker_dimension.name,
                    id=worker_dimension.id,
                    id_type="worker_dimension",
                    is_bool_dim=True,
                    category_name=worker_dimension.name,
                ),
                ShiftWorkerOption(
                    name=f"not {worker_dimension.name}",
                    id=worker_dimension.id,
                    id_type="worker_dimension",
                    is_bool_dim=True,
                    category_name=worker_dimension.name,
                ),
            ]
        elif worker_dimension.entry_type == "list":
            worker_options += [
                ShiftWorkerOption(
                    name=str(wp_value),
                    id=worker_dimension.id,
                    id_type="worker_dimension",
                    is_bool_dim=False,
                    category_name=worker_dimension.name,
                )
                for wp_value in worker_dimension.entry_options  # showing all options
                # for wp_value in list(
                #     set(
                #         str(item)
                #         for wp in worker_properties_wd
                #         for item in wp.value  # type: ignore
                #     )
                # ) # showing only options that are used
            ]
        else:
            worker_options += [
                ShiftWorkerOption(
                    name=str(wp_value),
                    id=worker_dimension.id,
                    id_type="worker_dimension",
                    is_bool_dim=False,
                    category_name=worker_dimension.name,
                )
                for wp_value in list(
                    set(str(wp.value) for wp in worker_properties_wd)
                )
            ]
    return worker_options


def build_shift_options(
    shifts: List[Shift],
    shift_dimensions: List[ShiftDimension],
    shift_properties: Dict[str, List[ShiftProperty]],
) -> List[ShiftWorkerOption]:
    shift_options: List[ShiftWorkerOption] = [
        ShiftWorkerOption(
            name="all shifts",
            id="",
            id_type="",
            is_bool_dim=False,
            category_name="All",
        )
    ] + [
        ShiftWorkerOption(
            name=s.name,
            id=s.id,
            id_type="shift",
            is_bool_dim=False,
            category_name="Shifts",
        )
        for s in shifts
    ]
    for shift_dimension in shift_dimensions:
        shift_properties_sd = (
            shift_properties[shift_dimension.id]
            if shift_dimension.id in shift_properties
            else []
        )
        if shift_dimension.entry_type == "bool":
            shift_options += [
                ShiftWorkerOption(
                    name=shift_dimension.name,
                    id=shift_dimension.id,
                    id_type="shift_dimension",
                    is_bool_dim=True,
                    category_name=shift_dimension.name,
                ),
                ShiftWorkerOption(
                    name=f"not {shift_dimension.name}",
                    id=shift_dimension.id,
                    id_type="shift_dimension",
                    is_bool_dim=True,
                    category_name=shift_dimension.name,
                ),
            ]
        elif shift_dimension.entry_type == "list":
            shift_options += [
                ShiftWorkerOption(
                    name=str(sp_value),
                    id=shift_dimension.id,
                    id_type="shift_dimension",
                    is_bool_dim=False,
                    category_name=shift_dimension.name,
                )
                for sp_value in shift_dimension.entry_options  # showing all options
                # for sp_value in list(
                #     set(
                #         str(item)
                #         for sp in shift_properties_sd
                #         for item in sp.value  # type: ignore
                #     )
                # ) # showing only options that are used
            ]
        else:
            shift_options += [
                ShiftWorkerOption(
                    name=str(sp_value),
                    id=shift_dimension.id,
                    id_type="shift_dimension",
                    is_bool_dim=False,
                    category_name=shift_dimension.name,
                )
                for sp_value in list(
                    set(str(sp.value) for sp in shift_properties_sd)
                )
            ]
    return shift_options


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
