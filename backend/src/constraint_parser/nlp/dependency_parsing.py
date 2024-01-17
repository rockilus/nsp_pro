from typing import Dict, List, Set

import spacy
from constraint_parser.nlp.find_connected_param import FindConnectedParam
from utils.constants import Constants


# We are currently travelling deep, and coming back up. Would it make more
# sense to travel by level? I.e. first all the children of the root, and then
# all the children of the children of the root, etc.?
class DependencyParsing:
    def __init__(
        self,
        doc: spacy.tokens.Doc,
        verb_phrases: List[spacy.tokens.Span],
    ):
        self.doc = doc
        self.verb_phrases = verb_phrases
        self.find_token_connected_param = FindConnectedParam(doc, verb_phrases)
        self.out: Dict = {
            Constants.SHIFT_PATTERN_LABEL: [],
            Constants.WORKER_PATTERN_LABEL: [],
        }
        self.seen: Set[spacy.tokens.Token] = set()

    def dependency_parsing(self) -> Dict:
        for token in [t for t in self.doc if t.head == t]:
            self.build_dependency_parse(token)
        return self.out

    def build_dependency_parse(self, token: spacy.tokens.Token) -> None:
        if token not in self.seen:
            self.analyse_token(token)

        for child in token.children:
            self.build_dependency_parse(child)

    def analyse_token(self, token: spacy.tokens.Token) -> None:
        entities = self.get_token_entities(token)
        if entities is None:
            if token.pos_ == "NUM":
                connected_param = self.find_token_connected_param.find_token_connected_parameter(
                    token
                )
                if connected_param is None:
                    raise ValueError(
                        f"Could not find parameter name for {token.text}"
                    )
                param_label, param_name = connected_param
                self.add_quantity_token_to_out(token, param_label, param_name)
            return
        for entity in entities:
            connected_param = self.find_token_connected_param.find_entity_connected_parameter(
                token, entity
            )
            if connected_param is None:
                raise ValueError(
                    f"Could not find parameter name for {entity.text}"
                )
            param_label, param_name = connected_param
            self.add_entity_to_out(entity, param_label, param_name)

    def get_token_entities(
        self, token: spacy.tokens.Token
    ) -> set[spacy.tokens.Span] | None:
        # noun_chunk = self.check_if_token_in_noun_chunk(token)
        # if noun_chunk is not None:
        #     self.seen.update(noun_chunk)
        #     return self.check_if_span_in_entities(noun_chunk)
        # verb_phrase = self.check_if_token_in_verb_phrase(token)
        # if verb_phrase is not None:
        #     self.seen.update(verb_phrase)
        #     return self.check_if_span_in_entities(verb_phrase)
        entity = self.check_if_token_in_entity(token)
        if entity is not None:
            self.seen.update(entity)
            return {entity}
        self.seen.add(token)
        return None

    def check_if_token_in_noun_chunk(
        self, token: spacy.tokens.Token
    ) -> spacy.tokens.Span | None:
        for noun_chunk in self.doc.noun_chunks:
            if token in noun_chunk:
                return noun_chunk
        return None

    def check_if_token_in_verb_phrase(
        self, token: spacy.tokens.Token
    ) -> spacy.tokens.Span | None:
        for verb_phrase in self.verb_phrases:
            if token in verb_phrase:
                return verb_phrase
        return None

    def check_if_token_in_entity(
        self, token: spacy.tokens.Token
    ) -> spacy.tokens.Span | None:
        if token.ent_iob != 2:
            for ent in self.doc.ents:
                if token in ent:
                    return ent
        return None

    def check_if_span_in_entities(
        self,
        span: spacy.tokens.Span,
    ) -> set[spacy.tokens.Span] | None:
        out = set()
        for token in span:
            ent = self.check_if_token_in_entity(token)
            if ent is not None:
                out.add(ent)
        if len(out) == 0:
            return None
        return out

    def add_entity_to_out(
        self, entity: spacy.tokens.Span, param_label: str, param_name: str
    ) -> None:
        # Entity shift or worker
        if entity.label_ in Constants.VAR_COORD_PATTERN_LABEL:
            # Entity already in out, no action
            for subdict in self.out[param_label]:
                if subdict.get(Constants.NAME_BLOCK_LABEL) == entity.text:
                    return
            # Entity not in out, add it
            self.out[entity.label_].append(
                {Constants.NAME_BLOCK_LABEL: entity.text}
            )
            # If connected param name different from entity text, add it as a
            # reference
            if entity.text != param_name:
                for subdict in self.out[param_label]:
                    if subdict.get(Constants.NAME_BLOCK_LABEL) == entity.text:
                        subdict[Constants.REFERENCE_BLOCK_LABEL] = param_name
            return
        # Entity not shift or worker, check if connected param already in out,
        # if so, add entity to it
        for subdict in self.out[param_label]:
            if subdict.get(Constants.NAME_BLOCK_LABEL) == param_name:
                subdict[entity.label_] = entity.text
                return
        # Entity not shift or worker, connected param not in out, add connected
        # param to out
        self.out[param_label].append({Constants.NAME_BLOCK_LABEL: param_name})
        # Add entity tout connected param just added
        for subdict in self.out[param_label]:
            if subdict.get(Constants.NAME_BLOCK_LABEL) == param_name:
                subdict[entity.label_] = entity.text
                return
        raise ValueError(f"Could not find {param_label} {param_name}")

    def add_quantity_token_to_out(
        self, token: spacy.tokens.Token, param_label: str, param_name: str
    ) -> None:
        for subdict in self.out[param_label]:
            if subdict.get(Constants.NAME_BLOCK_LABEL) == param_name:
                subdict[Constants.QUANTITY_BLOCK_LABEL] = token.text
                return
        self.out[param_label].append({Constants.NAME_BLOCK_LABEL: param_name})
        for subdict in self.out[param_label]:
            if subdict.get(Constants.NAME_BLOCK_LABEL) == param_name:
                subdict[Constants.QUANTITY_BLOCK_LABEL] = token.text
                return
        raise ValueError(f"Could not find {param_label} {param_name}")

    @staticmethod
    def sort_tokens_by_index(
        tokens: List[spacy.tokens.Token],
    ) -> List[spacy.tokens.Token]:
        return sorted(tokens, key=lambda t: t.i)
