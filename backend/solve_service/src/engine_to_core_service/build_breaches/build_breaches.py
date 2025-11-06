from typing import List

from shared.schemas.core import (
    Assignment,
    Breach,
    LinkShift,
    RequestAugmented,
    Schedule,
    Shift,
    ShiftDemandNew,
    Worker,
)

from engine import Breach as BreachEngine
from engine import Outputs as OutputsEngine
from engine import ProcessingCache
from engine_to_core_service.build_breaches.build_breaches_model import (
    build_breaches_model,
)
from engine_to_core_service.build_breaches.build_breaches_not_model import (
    build_breaches_not_model,
)


# pylint: disable=too-many-arguments, R0801
def build_breaches(
    schedule: Schedule,
    workers: List[Worker],
    shifts: List[Shift],
    link_shifts: List[LinkShift],
    daily_shift_demand: List[ShiftDemandNew],
    assignments: List[Assignment],
    requests: List[RequestAugmented],
    breaches_engine: List[BreachEngine],
    processing_cache: ProcessingCache,
    outputs: OutputsEngine | None = None,
) -> List[Breach]:
    breaches_model = build_breaches_model(
        schedule,
        workers,
        shifts,
        link_shifts,
        daily_shift_demand,
        assignments,
        processing_cache.constraints,
        requests,
        breaches_engine,
    )
    breaches_not_model = build_breaches_not_model(
        schedule,
        workers,
        shifts,
        assignments,
        processing_cache,
    )
    # If an Outputs object was provided, print quick debugging stats
    if outputs is not None:
        try:
            _print_breaches_debug_stats(
                outputs=outputs, breaches=breaches_model
            )
        except Exception:
            # Never fail the normal flow because of debug printing
            pass
    return breaches_model + breaches_not_model


def _print_breaches_debug_stats(
    outputs: OutputsEngine, breaches: List[Breach]
) -> None:
    """Print simple debug stats about solver outputs and breaches.

    Prints:
      - outputs.objective_value
      - number of raw engine breaches (len(outputs.breaches))
      - number of converted/model breaches per ObjectiveCategory
    """
    # Print objective value and raw engine breaches count
    print(f"Solver objective_value: {outputs.objective_value}")
    raw_breaches_len = len(outputs.breaches)
    print(f"Raw engine breaches (outputs.breaches): {raw_breaches_len}")

    # Group model breaches by objective category
    counts: dict[str, int] = {}
    for b in breaches:
        key = str(b.objective_category.name)
        counts[key] = counts.get(key, 0) + 1

    print("Model breaches by ObjectiveCategory:")
    if not counts:
        print("  (no model breaches)")
    else:
        for cat, cnt in sorted(counts.items()):
            print(f"  {cat}: {cnt}")
