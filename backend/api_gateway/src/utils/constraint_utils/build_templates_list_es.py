from typing import List

from shared.schemas import (
    BlockNameOptions,
    BlockTypeOptions,
    ConstraintType,
    ShiftWorkerOption,
    Template,
    TemplateBlock,
)

from src.utils.constants import WEEK_DAYS


# pylint: disable=R0801
def build_templates_list_es(
    worker_options: List[ShiftWorkerOption],
    shift_options: List[ShiftWorkerOption],
) -> List[Template]:
    return [
        Template(
            id="0",
            constraint_type=ConstraintType.SEQ,
            text="Juan debe hacer como máximo 2 consultas consecutivas",
            language="es",
            blocks=[
                TemplateBlock(
                    name=BlockNameOptions.WORKER,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    options=worker_options,
                    placeholder="Juan",
                ),
                TemplateBlock(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    options=[],  # type: ignore
                    placeholder="debe hacer",
                ),
                TemplateBlock(
                    name=BlockNameOptions.OPERATOR,
                    type=BlockTypeOptions.STRING,
                    options=["at most", "at least", "exactly"],
                    placeholder="como máximo",
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
                    placeholder="consultas",
                ),
                TemplateBlock(
                    name=BlockNameOptions.TIMING,
                    type=BlockTypeOptions.STRING,
                    options=["consecutive"],
                    placeholder="consecutivas",
                ),
            ],
        ),
        Template(
            id="1",
            constraint_type=ConstraintType.SUM,
            text="Juan debe hacer al menos 1 guardia por semana",
            language="es",
            blocks=[
                TemplateBlock(
                    name=BlockNameOptions.WORKER,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    options=worker_options,
                    placeholder="Juan",
                ),
                TemplateBlock(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    options=[],  # type: ignore
                    placeholder="debe hacer",
                ),
                TemplateBlock(
                    name=BlockNameOptions.OPERATOR,
                    type=BlockTypeOptions.STRING,
                    options=["at most", "at least", "exactly"],
                    placeholder="al menos",
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
                    placeholder="guardia",
                ),
                TemplateBlock(
                    name=BlockNameOptions.TIMING,
                    type=BlockTypeOptions.STRING,
                    options=["per week", "per month", "per year"],
                    placeholder="por semana",
                ),
            ],
        ),
        Template(
            id="2",
            constraint_type=ConstraintType.ORD,
            text="No consulta 1 día después de una guardia para Juan",
            language="es",
            blocks=[
                TemplateBlock(
                    name=BlockNameOptions.OPERATOR,
                    type=BlockTypeOptions.STRING,
                    options=["no"],
                    placeholder="No",
                ),
                TemplateBlock(
                    name=BlockNameOptions.SHIFT_REFERENCE,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    options=shift_options,
                    placeholder="consulta",
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
                    placeholder="día",
                ),
                TemplateBlock(
                    name=BlockNameOptions.TIMING,
                    type=BlockTypeOptions.STRING,
                    options=["after", "before"],
                    placeholder="después de",
                ),
                TemplateBlock(
                    name=BlockNameOptions.SHIFT_RELATIVE,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    options=shift_options,
                    placeholder="guardia",
                ),
                TemplateBlock(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    options=[],  # type: ignore
                    placeholder="para",
                ),
                TemplateBlock(
                    name=BlockNameOptions.WORKER,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    options=worker_options,
                    placeholder="Juan",
                ),
            ],
        ),
        Template(
            id="3",
            constraint_type=ConstraintType.ORD,
            text="Si guardia, entonces descanso 1 día después para Juan",
            language="es",
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
                    placeholder="guardia",
                ),
                TemplateBlock(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    options=[],  # type: ignore
                    placeholder="entonces",
                ),
                TemplateBlock(
                    name=BlockNameOptions.SHIFT_RELATIVE,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    options=shift_options,
                    placeholder="descanso",
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
                    placeholder="día",
                ),
                TemplateBlock(
                    name=BlockNameOptions.TIMING,
                    type=BlockTypeOptions.STRING,
                    options=["after", "before"],
                    placeholder="después",
                ),
                TemplateBlock(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    options=[],  # type: ignore
                    placeholder="para",
                ),
                TemplateBlock(
                    name=BlockNameOptions.WORKER,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    options=worker_options,
                    placeholder="Juan",
                ),
            ],
        ),
        Template(
            id="4",
            constraint_type=ConstraintType.ORD,
            text="Si guardia el sábado, entonces descanso 2 días después para Juan",
            language="es",
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
                    placeholder="guardia",
                ),
                TemplateBlock(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    options=[],  # type: ignore
                    placeholder="el",
                ),
                TemplateBlock(
                    name=BlockNameOptions.WEEKDAY,
                    type=BlockTypeOptions.STRING,
                    options=WEEK_DAYS,
                    placeholder="sábado",
                ),
                TemplateBlock(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    options=[],  # type: ignore
                    placeholder="entonces",
                ),
                TemplateBlock(
                    name=BlockNameOptions.SHIFT_RELATIVE,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    options=shift_options,
                    placeholder="descanso",
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
                    placeholder="días",
                ),
                TemplateBlock(
                    name=BlockNameOptions.TIMING,
                    type=BlockTypeOptions.STRING,
                    options=["after", "before"],
                    placeholder="después",
                ),
                TemplateBlock(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    options=[],  # type: ignore
                    placeholder="para",
                ),
                TemplateBlock(
                    name=BlockNameOptions.WORKER,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    options=worker_options,
                    placeholder="Juan",
                ),
            ],
        ),
        # Filter
        Template(
            id="5",
            constraint_type=ConstraintType.FIL,
            text="Juan solo debe hacer consultas",
            language="es",
            blocks=[
                TemplateBlock(
                    name=BlockNameOptions.WORKER,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    options=worker_options,
                    placeholder="Juan",
                ),
                TemplateBlock(
                    name=BlockNameOptions.OPERATOR,
                    type=BlockTypeOptions.STRING,
                    options=["should only", "should not"],
                    placeholder="solo debe",
                ),
                TemplateBlock(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    options=[],  # type: ignore
                    placeholder="hacer",
                ),
                TemplateBlock(
                    name=BlockNameOptions.SHIFT,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    options=shift_options,
                    placeholder="consultas",
                ),
            ],
        ),
        # Evenness
        Template(
            id="6",
            constraint_type=ConstraintType.EVE,
            text="Las guardias el domingo deben ser repartidas de manera "
            + "igual en el tiempo para todos los trabajadores",
            language="es",
            blocks=[
                TemplateBlock(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    options=[],  # type: ignore
                    placeholder="Las",
                ),
                TemplateBlock(
                    name=BlockNameOptions.SHIFT,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    options=shift_options,
                    placeholder="guardias",
                ),
                TemplateBlock(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    options=[],  # type: ignore
                    placeholder="el",
                ),
                TemplateBlock(
                    name=BlockNameOptions.WEEKDAY,
                    type=BlockTypeOptions.STRING,
                    options=WEEK_DAYS,
                    placeholder="domingo",
                ),
                TemplateBlock(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    options=[],  # type: ignore
                    placeholder="deben ser repartidas de manera igual en el "
                    + "tiempo para",
                ),
                TemplateBlock(
                    name=BlockNameOptions.WORKER,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    options=worker_options,
                    placeholder="todos los trabajadores",
                ),
            ],
        ),
        # Fairness
        Template(
            id="7",
            constraint_type=ConstraintType.FAI,
            text="Las guardias el domingo deben ser repartidas de manera "
            + "equitativa entre todos los trabajadores",
            language="es",
            blocks=[
                TemplateBlock(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    options=[],  # type: ignore
                    placeholder="Las",
                ),
                TemplateBlock(
                    name=BlockNameOptions.SHIFT,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    options=shift_options,
                    placeholder="guardias",
                ),
                TemplateBlock(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    options=[],  # type: ignore
                    placeholder="el",
                ),
                TemplateBlock(
                    name=BlockNameOptions.WEEKDAY,
                    type=BlockTypeOptions.STRING,
                    options=WEEK_DAYS,
                    placeholder="domingo",
                ),
                TemplateBlock(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    options=[],  # type: ignore
                    placeholder="deben ser repartidas de manera equitativa entre",
                ),
                TemplateBlock(
                    name=BlockNameOptions.WORKER,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    options=worker_options,
                    placeholder="todos los trabajadores",
                ),
            ],
        ),
    ]
