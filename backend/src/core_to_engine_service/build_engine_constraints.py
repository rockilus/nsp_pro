from core import Constraints
from engine import ConstraintFai as ConstraintFaiEngine
from engine import ConstraintFil as ConstraintFilEngine
from engine import ConstraintOrd as ConstraintOrdEngine
from engine import Constraints as ConstraintsEngine
from engine import ConstraintSeq as ConstraintSeqEngine
from engine import ConstraintSum as ConstraintSumEngine


def core_to_engine_constraints(constraints: Constraints) -> ConstraintsEngine:
    return ConstraintsEngine(
        sum=[ConstraintSumEngine(**c_sum.__dict__) for c_sum in constraints.sum],
        seq=[ConstraintSeqEngine(**c_seq.__dict__) for c_seq in constraints.seq],
        ord=[ConstraintOrdEngine(**c_ord.__dict__) for c_ord in constraints.ord],
        fil=[ConstraintFilEngine(**c_fil.__dict__) for c_fil in constraints.fil],
        fai=[ConstraintFaiEngine(**c_fai.__dict__) for c_fai in constraints.fai],
    )
