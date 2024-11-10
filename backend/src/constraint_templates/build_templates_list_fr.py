from typing import List

from core import (
    BlockNameOptions,
    BlockTypeOptions,
    ConstraintType,
    ShiftWorkerOption,
    Template,
    TemplateBlock,
)
from utils.constants import Constants


# pylint: disable=R0801
def build_templates_list_fr(
    worker_options: List[ShiftWorkerOption],
    shift_options: List[ShiftWorkerOption],
) -> List[Template]:
    return [
        Template(
            id="0",
            constraint_type=ConstraintType.SEQ,
            text="Jean doit faire au plus 2 consultations consécutives",
            language="fr",
            blocks=[
                TemplateBlock(
                    name=BlockNameOptions.WORKER,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    options=worker_options,
                    placeholder="Jean",
                ),
                TemplateBlock(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    options=[],  # type: ignore
                    placeholder="doit faire",
                ),
                TemplateBlock(
                    name=BlockNameOptions.OPERATOR,
                    type=BlockTypeOptions.STRING,
                    options=["at most", "at least", "exactly"],
                    placeholder="au plus",
                ),
                TemplateBlock(
                    name=BlockNameOptions.NUMBER,
                    type=BlockTypeOptions.NUMBER,
                    options=[],  # type: ignore
                    placeholder=2,
                ),
                TemplateBlock(
                    name=BlockNameOptions.SHIFT,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    options=shift_options,
                    placeholder="consultations",
                ),
                TemplateBlock(
                    name=BlockNameOptions.TIMING,
                    type=BlockTypeOptions.STRING,
                    options=["consecutive"],
                    placeholder="consecutives",
                ),
            ],
        ),
        Template(
            id="1",
            constraint_type=ConstraintType.SUM,
            text="Jean doit faire au moins 1 garde par semaine",
            language="fr",
            blocks=[
                TemplateBlock(
                    name=BlockNameOptions.WORKER,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    options=worker_options,
                    placeholder="Jean",
                ),
                TemplateBlock(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    options=[],  # type: ignore
                    placeholder="doit faire",
                ),
                TemplateBlock(
                    name=BlockNameOptions.OPERATOR,
                    type=BlockTypeOptions.STRING,
                    options=["at most", "at least", "exactly"],
                    placeholder="au moins",
                ),
                TemplateBlock(
                    name=BlockNameOptions.NUMBER,
                    type=BlockTypeOptions.NUMBER,
                    options=[],  # type: ignore
                    placeholder=1,
                ),
                TemplateBlock(
                    name=BlockNameOptions.SHIFT,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    options=shift_options,
                    placeholder="garde",
                ),
                TemplateBlock(
                    name=BlockNameOptions.TIMING,
                    type=BlockTypeOptions.STRING,
                    options=["per week", "per month", "per year"],
                    placeholder="par semaine",
                ),
            ],
        ),
        Template(
            id="2",
            constraint_type=ConstraintType.ORD,
            text="Pas de consultation 1 jour après une garde pour Jean",
            language="fr",
            blocks=[
                TemplateBlock(
                    name=BlockNameOptions.OPERATOR,
                    type=BlockTypeOptions.STRING,
                    options=["no"],
                    placeholder="Pas de",
                ),
                TemplateBlock(
                    name=BlockNameOptions.SHIFT_REFERENCE,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    options=shift_options,
                    placeholder="consultation",
                ),
                TemplateBlock(
                    name=BlockNameOptions.NUMBER,
                    type=BlockTypeOptions.NUMBER,
                    options=[],  # type: ignore
                    placeholder=1,
                ),
                TemplateBlock(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    options=[],  # type: ignore
                    placeholder="jour",
                ),
                TemplateBlock(
                    name=BlockNameOptions.TIMING,
                    type=BlockTypeOptions.STRING,
                    options=["after", "before"],
                    placeholder="après",
                ),
                TemplateBlock(
                    name=BlockNameOptions.SHIFT_RELATIVE,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    options=shift_options,
                    placeholder="garde",
                ),
                TemplateBlock(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    options=[],  # type: ignore
                    placeholder="pour",
                ),
                TemplateBlock(
                    name=BlockNameOptions.WORKER,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    options=worker_options,
                    placeholder="Jean",
                ),
            ],
        ),
        Template(
            id="3",
            constraint_type=ConstraintType.ORD,
            text="Si garde, alors repos 1 jour après pour Jean",
            language="fr",
            blocks=[
                TemplateBlock(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    options=[],  # type: ignore
                    placeholder="Si",
                ),
                TemplateBlock(
                    name=BlockNameOptions.SHIFT_REFERENCE,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    options=shift_options,
                    placeholder="garde",
                ),
                TemplateBlock(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    options=[],  # type: ignore
                    placeholder="alors",
                ),
                TemplateBlock(
                    name=BlockNameOptions.SHIFT_RELATIVE,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    options=shift_options,
                    placeholder="repos",
                ),
                TemplateBlock(
                    name=BlockNameOptions.NUMBER,
                    type=BlockTypeOptions.NUMBER,
                    options=[],  # type: ignore
                    placeholder=1,
                ),
                TemplateBlock(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    options=[],  # type: ignore
                    placeholder="jour",
                ),
                TemplateBlock(
                    name=BlockNameOptions.TIMING,
                    type=BlockTypeOptions.STRING,
                    options=["after", "before"],
                    placeholder="après",
                ),
                TemplateBlock(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    options=[],  # type: ignore
                    placeholder="pour",
                ),
                TemplateBlock(
                    name=BlockNameOptions.WORKER,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    options=worker_options,
                    placeholder="Jean",
                ),
            ],
        ),
        Template(
            id="4",
            constraint_type=ConstraintType.ORD,
            text="Si garde le samedi, alors repos 2 jours après pour Jean",
            # text="If morning on saturday, then off 2 days afer for John",
            language="fr",
            blocks=[
                TemplateBlock(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    options=[],  # type: ignore
                    placeholder="Si",
                ),
                TemplateBlock(
                    name=BlockNameOptions.SHIFT_REFERENCE,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    options=shift_options,
                    placeholder="garde",
                ),
                TemplateBlock(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    options=[],  # type: ignore
                    placeholder="le",
                ),
                TemplateBlock(
                    name=BlockNameOptions.WEEKDAY,
                    type=BlockTypeOptions.STRING,
                    options=list(Constants.WEEK_DAYS),
                    placeholder="samedi",
                ),
                TemplateBlock(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    options=[],  # type: ignore
                    placeholder="alors",
                ),
                TemplateBlock(
                    name=BlockNameOptions.SHIFT_RELATIVE,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    options=shift_options,
                    placeholder="repos",
                ),
                TemplateBlock(
                    name=BlockNameOptions.NUMBER,
                    type=BlockTypeOptions.NUMBER,
                    options=[],  # type: ignore
                    placeholder=2,
                ),
                TemplateBlock(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    options=[],  # type: ignore
                    placeholder="jour",
                ),
                TemplateBlock(
                    name=BlockNameOptions.TIMING,
                    type=BlockTypeOptions.STRING,
                    options=["after", "before"],
                    placeholder="après",
                ),
                TemplateBlock(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    options=[],  # type: ignore
                    placeholder="pour",
                ),
                TemplateBlock(
                    name=BlockNameOptions.WORKER,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    options=worker_options,
                    placeholder="Jean",
                ),
            ],
        ),
        # Filter
        Template(
            id="5",
            constraint_type=ConstraintType.FIL,
            text="Jean doit seulement faire des consultations",
            language="fr",
            blocks=[
                TemplateBlock(
                    name=BlockNameOptions.WORKER,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    options=worker_options,
                    placeholder="Jean",
                ),
                TemplateBlock(
                    name=BlockNameOptions.OPERATOR,
                    type=BlockTypeOptions.STRING,
                    options=["should only", "should not"],
                    placeholder="doit seulement",
                ),
                TemplateBlock(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    options=[],  # type: ignore
                    placeholder="faire des",
                ),
                TemplateBlock(
                    name=BlockNameOptions.SHIFT,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    options=shift_options,
                    placeholder="consultations",
                ),
            ],
        ),
        # Evenness
        Template(
            id="6",
            constraint_type=ConstraintType.EVE,
            text="Les gardes le dimanche doivent être réparties de manière "
            + "égale dans le temps pour tous les travailleurs",
            language="fr",
            blocks=[
                TemplateBlock(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    options=[],  # type: ignore
                    placeholder="Les",
                ),
                TemplateBlock(
                    name=BlockNameOptions.SHIFT,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    options=shift_options,
                    placeholder="gardes",
                ),
                TemplateBlock(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    options=[],  # type: ignore
                    placeholder="le",
                ),
                TemplateBlock(
                    name=BlockNameOptions.WEEKDAY,
                    type=BlockTypeOptions.STRING,
                    options=list(Constants.WEEK_DAYS),
                    placeholder="dimanche",
                ),
                TemplateBlock(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    options=[],  # type: ignore
                    placeholder="doivent être réparties de manière égale dans "
                    + "le temps pour",
                ),
                TemplateBlock(
                    name=BlockNameOptions.WORKER,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    options=worker_options,
                    placeholder="tous les travailleurs",
                ),
            ],
        ),
        # Fairness
        Template(
            id="7",
            constraint_type=ConstraintType.FAI,
            text="Les gardes le dimanche doivent être réparties de manière "
            + "équitable entre tous les travailleurs",
            language="fr",
            blocks=[
                TemplateBlock(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    options=[],  # type: ignore
                    placeholder="Les",
                ),
                TemplateBlock(
                    name=BlockNameOptions.SHIFT,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    options=shift_options,
                    placeholder="gardes",
                ),
                TemplateBlock(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    options=[],  # type: ignore
                    placeholder="le",
                ),
                TemplateBlock(
                    name=BlockNameOptions.WEEKDAY,
                    type=BlockTypeOptions.STRING,
                    options=list(Constants.WEEK_DAYS),
                    placeholder="dimanche",
                ),
                TemplateBlock(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    options=[],  # type: ignore
                    placeholder="doivent être réparties de manière équitable entre",
                ),
                TemplateBlock(
                    name=BlockNameOptions.WORKER,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    options=worker_options,
                    placeholder="tous les travailleurs",
                ),
            ],
        ),
    ]
