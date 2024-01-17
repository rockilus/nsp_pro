from typing import List

import spacy


# need to add negation modifier in the mix (e.g. "not", "no", "never")
def get_verb_phrases(doc: spacy.tokens.Doc) -> List[spacy.tokens.Span]:
    verb_phrases = []
    for token in [t for t in doc if t.head == t]:
        verb_phrases += build_verb_phrases(token)
    return [build_span_from_tokens(doc, vp) for vp in verb_phrases]


def build_verb_phrases(
    token: spacy.tokens.Token, seen: set | None = None, out: List | None = None
) -> List[List[spacy.tokens.Token]]:
    if seen is None:
        seen = set()
    if out is None:
        out = []

    if token not in seen:
        if token.pos_ in ("VERB", "AUX"):
            aux = [c for c in token.children if c.dep_ == "aux"]
            out.append([token] + aux)
            seen.update(aux)
        seen.add(token)

    for child in token.children:
        build_verb_phrases(child, seen, out)

    return out


def sort_tokens_by_index(
    tokens: List[spacy.tokens.Token],
) -> List[spacy.tokens.Token]:
    return sorted(tokens, key=lambda t: t.i)


def build_span_from_tokens(
    doc: spacy.tokens.Doc, tokens: List[spacy.tokens.Token]
) -> spacy.tokens.Span:
    return spacy.tokens.Span(
        doc,
        min(token.i for token in tokens),
        max(token.i for token in tokens) + 1,
    )
