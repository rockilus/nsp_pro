from typing import List

from core import (
    Block,
    Shift,
    ShiftDimension,
    ShiftWorkerOption,
    Worker,
    WorkerDimension,
)


def translate_worker_block_value(value: str, language: str) -> str:
    translations = {
        "es": {"all workers": "todos los trabajadores"},
        "fr": {"all workers": "tous les travailleurs"},
    }

    if language in translations:
        if value in translations[language]:
            return translations[language][value]
        return value

    if language == "en":
        return value

    raise ValueError(f"Unsupported language: {language}")


def translate_shift_block_value(value: str, language: str) -> str:
    translations = {
        "es": {"all shifts": "todos los turnos"},
        "fr": {"all shifts": "toutes les tâches"},
    }

    if language in translations:
        if value in translations[language]:
            return translations[language][value]
        return value

    if language == "en":
        return value

    raise ValueError(f"Unsupported language: {language}")


def translate_operator_block_value(value: str, language: str) -> str:
    translations = {
        "es": {
            "at most": "a lo más",
            "at least": "al menos",
            "exactly": "exactamente",
            "no": "ningún",
            "should not": "no debe",
            "should only": "sólo debe",
        },
        "fr": {
            "at most": "au plus",
            "at least": "au moins",
            "exactly": "exactement",
            "no": "aucun",
            "should not": "ne doit pas",
            "should only": "doit seulement",
        },
    }

    if language in translations:
        if value in translations[language]:
            return translations[language][value]
        return value

    if language == "en":
        return value

    raise ValueError(f"Unsupported language: {language}")


def translate_timing_block_value(value: str, language: str) -> str:
    translations = {
        "es": {
            "before": "antes de",
            "after": "después de",
            "per month": "por mes",
            "per week": "por semana",
            "per year": "por año",
        },
        "fr": {
            "before": "avant",
            "after": "après",
            "per month": "par mois",
            "per week": "par semaine",
            "per year": "par an",
        },
    }

    if language in translations:
        if value in translations[language]:
            return translations[language][value]
        return value

    if language == "en":
        return value

    raise ValueError(f"Unsupported language: {language}")


def translate_weekday_block_value(value: str, language: str) -> str:
    translations = {
        "es": {
            "monday": "lunes",
            "tuesday": "martes",
            "wednesday": "miércoles",
            "thursday": "jueves",
            "friday": "viernes",
            "saturday": "sábado",
            "sunday": "domingo",
        },
        "fr": {
            "monday": "lundi",
            "tuesday": "mardi",
            "wednesday": "mercredi",
            "thursday": "jeudi",
            "friday": "vendredi",
            "saturday": "samedi",
            "sunday": "dimanche",
        },
    }

    if language in translations:
        if value in translations[language]:
            return translations[language][value]
        return value

    if language == "en":
        return value

    raise ValueError(f"Unsupported language: {language}")


# pylint: disable=too-many-branches, too-many-arguments, too-many-return-statements
def get_shift_worker_option_display_name(
    option: ShiftWorkerOption,
    workers: List[Worker],
    shifts: List[Shift],
    worker_dimensions: List[WorkerDimension],
    shift_dimensions: List[ShiftDimension],
    lng: str,
) -> str:
    if option.id_type == "worker":
        worker = next((w for w in workers if w.id == option.id), None)
        if worker:
            return worker.name
    elif option.id_type == "shift":
        shift = next((s for s in shifts if s.id == option.id), None)
        if shift:
            return shift.name
    elif option.id_type in ["worker_dimension", "shift_dimension"]:
        if not option.is_bool_dim:
            if not isinstance(option.name, str):
                raise ValueError("Invalid option name type for non-bool dim")
            return option.name
        if option.name:
            if option.id_type == "worker_dimension":
                worker_dimension: WorkerDimension | None = next(
                    (wd for wd in worker_dimensions if wd.id == option.id),
                    None,
                )
                return worker_dimension.name if worker_dimension else ''
            shift_dimension: ShiftDimension | None = next(
                (sd for sd in shift_dimensions if sd.id == option.id),
                None,
            )
            return shift_dimension.name if shift_dimension else ''
        if not option.name:
            if option.id_type == "worker_dimension":
                worker_dimension = next(
                    (wd for wd in worker_dimensions if wd.id == option.id),
                    None,
                )
                return (
                    f"not {worker_dimension.name}" if worker_dimension else ''
                )
            shift_dimension = next(
                (sd for sd in shift_dimensions if sd.id == option.id),
                None,
            )
            return f"not {shift_dimension.name}" if shift_dimension else ''
    if option.name == "all workers":
        return translate_worker_block_value(option.name, lng)  # type: ignore
    if option.name == "all shifts":
        return translate_shift_block_value(option.name, lng)  # type: ignore
    return ''


# pylint: disable=too-many-arguments
def blocks_to_string(
    blocks: List[Block],
    workers: List[Worker],
    shifts: List[Shift],
    worker_dimensions: List[WorkerDimension],
    shift_dimensions: List[ShiftDimension],
    language: str,
) -> str:
    values = []
    for block in blocks:
        if block.type == "shift_worker_option":
            values.append(
                block_to_string_shift_worker_option(
                    block,
                    workers,
                    shifts,
                    worker_dimensions,
                    shift_dimensions,
                    language,
                )
            )
        else:
            block_value = block.value
            if block.name == "operator":
                block_value = translate_operator_block_value(
                    str(block_value), language
                )
            if block.name == "timing":
                block_value = translate_timing_block_value(
                    str(block_value), language
                )
            if block.name == "weekday":
                block_value = translate_weekday_block_value(
                    str(block_value), language
                )
            values.append(str(block_value))
    joined_values = ' '.join(values)
    capitalized_values = joined_values.capitalize()
    return capitalized_values + '.'


# pylint: disable=too-many-arguments
def block_to_string_shift_worker_option(
    block: Block,
    workers: List[Worker],
    shifts: List[Shift],
    worker_dimensions: List[WorkerDimension],
    shift_dimensions: List[ShiftDimension],
    lng: str,
) -> str:
    if not isinstance(block.value, list):
        raise ValueError("Invalid block value type for shift_worker_option")
    if not all(isinstance(v, ShiftWorkerOption) for v in block.value):
        raise ValueError(
            "Invalid block value item type for shift_worker_option"
        )
    block_values = [
        get_shift_worker_option_display_name(
            v,  # type: ignore
            workers,
            shifts,
            worker_dimensions,
            shift_dimensions,
            lng,
        )
        for v in block.value
    ]
    if len(block_values) > 1 and all(isinstance(v, str) for v in block_values):
        return ', '.join(block_values[:-1]) + ' and ' + block_values[-1]
    if isinstance(block_values[0], str):
        return block_values[0]
    return ''
