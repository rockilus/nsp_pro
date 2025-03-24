import ast
from datetime import datetime, timezone
from typing import Dict

from shared.database.schemas.base import DocumentBaseSchema
from shared.schemas.schemas.model_output import ModelOutput, ModelOutputStatus


class ModelOutputSchema(DocumentBaseSchema):
    """ModelOutput schema for validation."""

    schedule: str
    status: int
    var_sol: Dict[str, int]
    var_spe_sol: Dict[str, int]
    objective_value: float
    wall_time: float
    output_time: float

    def to_core(self) -> ModelOutput:
        return ModelOutput(
            id=self.id or "",
            schedule_id=self.schedule,
            status=ModelOutputStatus(self.status),
            var_sol={ast.literal_eval(k): v for k, v in self.var_sol.items()},
            var_spe_sol={ast.literal_eval(k): v for k, v in self.var_spe_sol.items()},
            objective_value=self.objective_value,
            wall_time=self.wall_time,
            output_time=datetime.fromtimestamp(self.output_time, tz=timezone.utc),
        )

    @classmethod
    def from_core(cls, model_output: ModelOutput) -> "ModelOutputSchema":
        return cls(
            id=model_output.id,
            schedule=model_output.schedule_id,
            status=model_output.status.value,
            var_sol={str(k): v for k, v in model_output.var_sol.items()},
            var_spe_sol={str(k): v for k, v in model_output.var_spe_sol.items()},
            objective_value=model_output.objective_value,
            wall_time=model_output.wall_time,
            output_time=model_output.output_time.timestamp(),
        )
