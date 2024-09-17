from typing import List

from core import ShiftWorkerOption, Template, TemplateBlock
from utils.constants import Constants


# pylint: disable=R0801
def build_templates_list_fr(
    worker_options: List[ShiftWorkerOption],
    shift_options: List[ShiftWorkerOption],
) -> List[Template]:
    return [
        Template(
            id="0",
            constraint_type="seq",
            text="Jean doit faire au plus 2 consultations consécutives",
            language="fr",
            blocks=[
                TemplateBlock(
                    name="worker",
                    type="dict",
                    options=worker_options,
                    placeholder="Jean",
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="doit faire",
                ),
                TemplateBlock(
                    name="operator",
                    type="string",
                    options=["at most", "at least", "exactly"],
                    placeholder="au plus",
                ),
                TemplateBlock(
                    name="#",
                    type="number",
                    options=[],
                    placeholder=2,
                ),
                TemplateBlock(
                    name="shift",
                    type="dict",
                    options=shift_options,
                    placeholder="consultations",
                ),
                TemplateBlock(
                    name="timing",
                    type="string",
                    options=["consecutive"],
                    placeholder="consecutives",
                ),
            ],
        ),
        Template(
            id="1",
            constraint_type="sum",
            text="Jean doit faire au moins 1 garde par semaine",
            language="fr",
            blocks=[
                TemplateBlock(
                    name="worker",
                    type="dict",
                    options=worker_options,
                    placeholder="Jean",
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="doit faire",
                ),
                TemplateBlock(
                    name="operator",
                    type="string",
                    options=["at most", "at least", "exactly"],
                    placeholder="au moins",
                ),
                TemplateBlock(
                    name="#",
                    type="number",
                    options=[],
                    placeholder=1,
                ),
                TemplateBlock(
                    name="shift",
                    type="dict",
                    options=shift_options,
                    placeholder="garde",
                ),
                TemplateBlock(
                    name="timing",
                    type="string",
                    options=["per week", "per month", "per year"],
                    placeholder="par semaine",
                ),
            ],
        ),
        Template(
            id="2",
            constraint_type="ord",
            text="Pas de consultation 1 jour après une garde pour Jean",
            language="fr",
            blocks=[
                TemplateBlock(
                    name="operator",
                    type="string",
                    options=["no"],
                    placeholder="Pas de",
                ),
                TemplateBlock(
                    name="shift_reference",
                    type="dict",
                    options=shift_options,
                    placeholder="consultation",
                ),
                TemplateBlock(
                    name="#",
                    type="number",
                    options=[],
                    placeholder=1,
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="jour",
                ),
                TemplateBlock(
                    name="timing",
                    type="string",
                    options=["after", "before"],
                    placeholder="après",
                ),
                TemplateBlock(
                    name="shift_relative",
                    type="dict",
                    options=shift_options,
                    placeholder="garde",
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="pour",
                ),
                TemplateBlock(
                    name="worker",
                    type="dict",
                    options=worker_options,
                    placeholder="Jean",
                ),
            ],
        ),
        Template(
            id="3",
            constraint_type="ord",
            text="Si garde, alors repos 1 jour après pour Jean",
            language="fr",
            blocks=[
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="Si",
                ),
                TemplateBlock(
                    name="shift_reference",
                    type="dict",
                    options=shift_options,
                    placeholder="garde",
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="alors",
                ),
                TemplateBlock(
                    name="shift_relative",
                    type="dict",
                    options=shift_options,
                    placeholder="repos",
                ),
                TemplateBlock(
                    name="#",
                    type="number",
                    options=[],
                    placeholder=1,
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="jour",
                ),
                TemplateBlock(
                    name="timing",
                    type="string",
                    options=["after", "before"],
                    placeholder="après",
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="pour",
                ),
                TemplateBlock(
                    name="worker",
                    type="dict",
                    options=worker_options,
                    placeholder="Jean",
                ),
            ],
        ),
        Template(
            id="4",
            constraint_type="ord",
            text="Si garde le samedi, alors repos 2 jours après pour Jean",
            # text="If morning on saturday, then off 2 days afer for John",
            language="fr",
            blocks=[
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="Si",
                ),
                TemplateBlock(
                    name="shift_reference",
                    type="dict",
                    options=shift_options,
                    placeholder="garde",
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="le",
                ),
                TemplateBlock(
                    name="weekday",
                    type="string",
                    options=list(Constants.WEEK_DAYS),
                    placeholder="samedi",
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="alors",
                ),
                TemplateBlock(
                    name="shift_relative",
                    type="dict",
                    options=shift_options,
                    placeholder="repos",
                ),
                TemplateBlock(
                    name="#",
                    type="number",
                    options=[],
                    placeholder=2,
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="jour",
                ),
                TemplateBlock(
                    name="timing",
                    type="string",
                    options=["after", "before"],
                    placeholder="après",
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="pour",
                ),
                TemplateBlock(
                    name="worker",
                    type="dict",
                    options=worker_options,
                    placeholder="Jean",
                ),
            ],
        ),
        # Filter
        Template(
            id="5",
            constraint_type="fil",
            text="Jean doit seulement faire des consultations",
            language="fr",
            blocks=[
                TemplateBlock(
                    name="worker",
                    type="dict",
                    options=worker_options,
                    placeholder="Jean",
                ),
                TemplateBlock(
                    name="operator",
                    type="string",
                    options=["should only", "should not"],
                    placeholder="doit seulement",
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="faire des",
                ),
                TemplateBlock(
                    name="shift",
                    type="dict",
                    options=shift_options,
                    placeholder="consultations",
                ),
            ],
        ),
        # Evenness
        Template(
            id="6",
            constraint_type="eve",
            text="Les gardes le dimanche doivent être réparties de manière "
            + "égale dans le temps pour tous les travailleurs",
            language="fr",
            blocks=[
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="Les",
                ),
                TemplateBlock(
                    name="shift",
                    type="dict",
                    options=shift_options,
                    placeholder="gardes",
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="le",
                ),
                TemplateBlock(
                    name="weekday",
                    type="string",
                    options=list(Constants.WEEK_DAYS),
                    placeholder="dimanche",
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="doivent être réparties de manière égale dans "
                    + "le temps pour",
                ),
                TemplateBlock(
                    name="worker",
                    type="dict",
                    options=worker_options,
                    placeholder="tous les travailleurs",
                ),
            ],
        ),
        # Fairness
        Template(
            id="7",
            constraint_type="fai",
            text="Les gardes le dimanche doivent être réparties de manière "
            + "équitable entre tous les travailleurs",
            language="fr",
            blocks=[
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="Les",
                ),
                TemplateBlock(
                    name="shift",
                    type="dict",
                    options=shift_options,
                    placeholder="gardes",
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="le",
                ),
                TemplateBlock(
                    name="weekday",
                    type="string",
                    options=list(Constants.WEEK_DAYS),
                    placeholder="dimanche",
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="doivent être réparties de manière équitable entre",
                ),
                TemplateBlock(
                    name="worker",
                    type="dict",
                    options=worker_options,
                    placeholder="tous les travailleurs",
                ),
            ],
        ),
    ]
