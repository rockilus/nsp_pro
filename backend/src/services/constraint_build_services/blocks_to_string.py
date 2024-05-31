from typing import List

from core import Block


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


def blocks_to_string(blocks: List[Block], language: str) -> str:
    values = []
    for block in blocks:
        if isinstance(block.value, list):
            block_values = block.value
            if all(isinstance(v, dict) for v in block.value):
                block_values = [v["name"] for v in block_values]  # type: ignore
            if block.name == "shift":
                block_values = [
                    translate_shift_block_value(str(v), language)
                    for v in block_values
                ]
            elif block.name == "worker":
                block_values = [
                    translate_worker_block_value(str(v), language)
                    for v in block_values
                ]
            if len(block_values) > 1 and all(
                isinstance(v, str) for v in block_values
            ):
                values.append(
                    ', '.join(block_values[:-1])  # type: ignore
                    + ' and '
                    + block_values[-1]
                )
            elif isinstance(block_values[0], str):
                values.append(block_values[0])
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
