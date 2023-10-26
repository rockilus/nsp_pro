from dataclasses import dataclass, field


@dataclass
class PenaltyMap:
    low: int
    medium: int
    high: int
    no: int = field(default=0)


@dataclass
class PenaltyMaps:
    request: PenaltyMap
    constraint: PenaltyMap


request_penalty_map = PenaltyMap(low=1, medium=2, high=3)
constraint_penalty_map = PenaltyMap(low=1, medium=2, high=3)
penalty_map = PenaltyMaps(
    request=request_penalty_map, constraint=constraint_penalty_map
)
