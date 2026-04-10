import ast
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, Tuple


class ModelOutputStatus(Enum):
    UNKNOWN = 0
    MODEL_INVALID = 1
    FEASIBLE = 2
    INFEASIBLE = 3
    OPTIMAL = 4


@dataclass
class ModelOutput:
    id: str
    schedule_id: str
    status: ModelOutputStatus
    var_sol: Dict[Tuple[str, str, str], int]
    var_spe_sol: Dict[Tuple[str, str, str, str], int]
    objective_value: float
    wall_time: float
    output_time: datetime

    def to_dict(self) -> Dict:
        out = asdict(self)
        out["status"] = self.status.value
        out["var_sol"] = {str(k): v for k, v in self.var_sol.items()}
        out["var_spe_sol"] = {str(k): v for k, v in self.var_spe_sol.items()}
        out["output_time"] = self.output_time.timestamp()
        return out

    @staticmethod
    def from_dict(data: Dict) -> "ModelOutput":
        return ModelOutput(
            id=data["id"],
            schedule_id=data["schedule_id"],
            status=ModelOutputStatus(data["status"]),
            # var_sol={eval(k): v for k, v in data["var_sol"].items()},
            # var_spe_sol={eval(k): v for k, v in data["var_spe_sol"].items()},
            var_sol={ast.literal_eval(k): v for k, v in data["var_sol"].items()},
            var_spe_sol={
                ast.literal_eval(k): v for k, v in data["var_spe_sol"].items()
            },
            objective_value=data["objective_value"],
            wall_time=data["wall_time"],
            output_time=datetime.fromtimestamp(data["output_time"], timezone.utc),
        )
