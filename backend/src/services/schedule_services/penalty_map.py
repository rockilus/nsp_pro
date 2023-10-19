from dataclasses import dataclass


@dataclass
class RequestPenaltyMap:
    low: int
    medium: int
    high: int


@dataclass
class PenaltyMap:
    request: RequestPenaltyMap


request_penalty_map = RequestPenaltyMap(low=1, medium=2, high=3)
penalty_map = PenaltyMap(request=request_penalty_map)
