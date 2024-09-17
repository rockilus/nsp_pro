from typing import List

from core import ShiftWorkerOption, Template, TemplateBlock
from utils.constants import Constants


# pylint: disable=R0801
def build_templates_list_es(
    worker_options: List[ShiftWorkerOption],
    shift_options: List[ShiftWorkerOption],
) -> List[Template]:
    return [
        Template(
            id="0",
            constraint_type="seq",
            text="Juan debe hacer como máximo 2 consultas consecutivas",
            language="es",
            blocks=[
                TemplateBlock(
                    name="worker",
                    type="dict",
                    options=worker_options,
                    placeholder="Juan",
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="debe hacer",
                ),
                TemplateBlock(
                    name="operator",
                    type="string",
                    options=["at most", "at least", "exactly"],
                    placeholder="como máximo",
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
                    placeholder="consultas",
                ),
                TemplateBlock(
                    name="timing",
                    type="string",
                    options=["consecutive"],
                    placeholder="consecutivas",
                ),
            ],
        ),
        Template(
            id="1",
            constraint_type="sum",
            text="Juan debe hacer al menos 1 guardia por semana",
            language="es",
            blocks=[
                TemplateBlock(
                    name="worker",
                    type="dict",
                    options=worker_options,
                    placeholder="Juan",
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="debe hacer",
                ),
                TemplateBlock(
                    name="operator",
                    type="string",
                    options=["at most", "at least", "exactly"],
                    placeholder="al menos",
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
                    placeholder="guardia",
                ),
                TemplateBlock(
                    name="timing",
                    type="string",
                    options=["per week", "per month", "per year"],
                    placeholder="por semana",
                ),
            ],
        ),
        Template(
            id="2",
            constraint_type="ord",
            text="No consulta 1 día después de una guardia para Juan",
            language="es",
            blocks=[
                TemplateBlock(
                    name="operator",
                    type="string",
                    options=["no"],
                    placeholder="No",
                ),
                TemplateBlock(
                    name="shift_reference",
                    type="dict",
                    options=shift_options,
                    placeholder="consulta",
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
                    placeholder="día",
                ),
                TemplateBlock(
                    name="timing",
                    type="string",
                    options=["after", "before"],
                    placeholder="después de",
                ),
                TemplateBlock(
                    name="shift_relative",
                    type="dict",
                    options=shift_options,
                    placeholder="guardia",
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="para",
                ),
                TemplateBlock(
                    name="worker",
                    type="dict",
                    options=worker_options,
                    placeholder="Juan",
                ),
            ],
        ),
        Template(
            id="3",
            constraint_type="ord",
            text="Si guardia, entonces descanso 1 día después para Juan",
            language="es",
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
                    placeholder="guardia",
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="entonces",
                ),
                TemplateBlock(
                    name="shift_relative",
                    type="dict",
                    options=shift_options,
                    placeholder="descanso",
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
                    placeholder="día",
                ),
                TemplateBlock(
                    name="timing",
                    type="string",
                    options=["after", "before"],
                    placeholder="después",
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="para",
                ),
                TemplateBlock(
                    name="worker",
                    type="dict",
                    options=worker_options,
                    placeholder="Juan",
                ),
            ],
        ),
        Template(
            id="4",
            constraint_type="ord",
            text="Si guardia el sábado, entonces descanso 2 días después para Juan",
            language="es",
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
                    placeholder="guardia",
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="el",
                ),
                TemplateBlock(
                    name="weekday",
                    type="string",
                    options=list(Constants.WEEK_DAYS),
                    placeholder="sábado",
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="entonces",
                ),
                TemplateBlock(
                    name="shift_relative",
                    type="dict",
                    options=shift_options,
                    placeholder="descanso",
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
                    placeholder="días",
                ),
                TemplateBlock(
                    name="timing",
                    type="string",
                    options=["after", "before"],
                    placeholder="después",
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="para",
                ),
                TemplateBlock(
                    name="worker",
                    type="dict",
                    options=worker_options,
                    placeholder="Juan",
                ),
            ],
        ),
        # Filter
        Template(
            id="5",
            constraint_type="fil",
            text="Juan solo debe hacer consultas",
            language="es",
            blocks=[
                TemplateBlock(
                    name="worker",
                    type="dict",
                    options=worker_options,
                    placeholder="Juan",
                ),
                TemplateBlock(
                    name="operator",
                    type="string",
                    options=["should only", "should not"],
                    placeholder="solo debe",
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="hacer",
                ),
                TemplateBlock(
                    name="shift",
                    type="dict",
                    options=shift_options,
                    placeholder="consultas",
                ),
            ],
        ),
        # Evenness
        Template(
            id="6",
            constraint_type="eve",
            text="Las guardias el domingo deben ser repartidas de manera "
            + "igual en el tiempo para todos los trabajadores",
            language="es",
            blocks=[
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="Las",
                ),
                TemplateBlock(
                    name="shift",
                    type="dict",
                    options=shift_options,
                    placeholder="guardias",
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="el",
                ),
                TemplateBlock(
                    name="weekday",
                    type="string",
                    options=list(Constants.WEEK_DAYS),
                    placeholder="domingo",
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="deben ser repartidas de manera igual en el "
                    + "tiempo para",
                ),
                TemplateBlock(
                    name="worker",
                    type="dict",
                    options=worker_options,
                    placeholder="todos los trabajadores",
                ),
            ],
        ),
        # Fairness
        Template(
            id="7",
            constraint_type="fai",
            text="Las guardias el domingo deben ser repartidas de manera "
            + "equitativa entre todos los trabajadores",
            language="es",
            blocks=[
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="Las",
                ),
                TemplateBlock(
                    name="shift",
                    type="dict",
                    options=shift_options,
                    placeholder="guardias",
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="el",
                ),
                TemplateBlock(
                    name="weekday",
                    type="string",
                    options=list(Constants.WEEK_DAYS),
                    placeholder="domingo",
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="deben ser repartidas de manera equitativa entre",
                ),
                TemplateBlock(
                    name="worker",
                    type="dict",
                    options=worker_options,
                    placeholder="todos los trabajadores",
                ),
            ],
        ),
    ]
