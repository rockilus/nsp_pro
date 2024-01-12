from typing import Dict, List, Tuple

import spacy
from utils.constants import Constants


class TextToBlock:
    def __init__(self, pattern: List) -> None:
        self.nlp = spacy.load("en_core_web_sm", disable="ner")
        self.ruler = self.nlp.add_pipe("entity_ruler")
        self.ruler.add_patterns(pattern)
        self.out: Dict = {
            Constants.SHIFT_PATTERN_LABEL: [],
            Constants.WORKER_PATTERN_LABEL: [],
        }
        self.out_token: Dict[Tuple, any] = {}
        self.token_tracker: List[int] = []
        self.token_hierarchy: List[int | None] = []
        self.token_list: List[spacy.tokens.Token] = []

    def __call__(self, text: str) -> Dict:
        doc = self.nlp(text)
        return self.analyse_doc(doc)

    def analyse_doc(self, doc: spacy.tokens.Doc) -> Dict:
        self.setup_trackers(doc)
        self.analyse_dependencies_from_var_params(doc)
        if not self.check_all_entities_and_num_mapped(doc):
            self.analyse_dependencies_from_root(doc)
        if not self.check_all_entities_and_num_mapped(doc):
            raise ValueError(
                f"Not all entities or numbers mapped in: {doc.text}"
            )
        return self.out

    def setup_trackers(self, doc: spacy.tokens.Doc) -> None:
        self.token_tracker = [0 for _ in doc]
        self.token_hierarchy = [None for _ in doc]
        self.build_token_hierarchy(doc)
        self.token_list = [token for token in doc]
        self.token_list = [
            token
            for _, token in sorted(zip(self.token_hierarchy, self.token_list))
        ]

    def analyse_dependencies_from_var_params(
        self, doc: spacy.tokens.Doc
    ) -> None:
        for token in self.token_list:
            if (
                self.token_tracker[token.i] == 1
                or token.ent_type_ not in Constants.VAR_COORD_PATTERN_LABEL
            ):
                continue
            entity = self.add_token_entity_to_out(doc, token)
            if entity is None:
                continue
            entity_list = self.build_entity_list(entity)
            for t in entity_list:
                self.analyse_head(doc, t, entity)
                self.analyse_children(doc, t, entity)

    def analyse_dependencies_from_root(self, doc: spacy.tokens.Doc) -> None:
        for token in [token for token in doc if token.dep_ == "ROOT"]:
            var_co_tokens = [
                t
                for t in doc
                if t.ent_type_ in Constants.VAR_COORD_PATTERN_LABEL
            ]
            var_co_entities = set(
                self.get_entity_containing_token(doc, t) for t in var_co_tokens
            )
            if len(var_co_entities) == 0:
                break
            elif len(var_co_entities) > 1:
                raise ValueError(
                    f"More than one var co child: {var_co_tokens}"
                )
            var_co_entity = var_co_entities.pop()
            if var_co_entity is None:
                continue
            if token.ent_iob != 2:
                entity = self.add_token_entity_to_out(
                    doc, token, var_co_entity
                )
                if entity is None:
                    continue
                entity_list = self.build_entity_list(entity)
                for t in entity_list:
                    self.analyse_children(doc, t, var_co_entity)
            self.analyse_children(doc, token, var_co_entity)

    def analyse_head(
        self,
        doc: spacy.tokens.Doc,
        token: spacy.tokens.Token,
        entity_token: spacy.tokens.Span = None,
    ) -> None:
        head = token.head
        if head == token:
            return
        if self.token_tracker[head.i] == 0:
            if (
                head.ent_iob != 2
                and head.ent_type_ not in Constants.VAR_COORD_PATTERN_LABEL
            ):
                self.add_token_entity_to_out(doc, head, entity_token)
        else:
            if head.ent_type_ == "TIMING" and head.head.ent_type_ == "SHIFT":
                self.out[entity_token.text][
                    "reference"
                ] = self.get_entity_containing_token(doc, head.head)

    def analyse_children(
        self,
        doc: spacy.tokens.Doc,
        token: spacy.tokens.Token,
        entity_token: spacy.tokens.Span = None,
    ) -> None:
        for child in self.order_tokens_hierarchy(list(token.children)):
            if (
                self.token_tracker[child.i] == 1
                or child.ent_type_ in Constants.VAR_COORD_PATTERN_LABEL
            ):
                continue
            if child.ent_iob != 2:
                entity = self.add_token_entity_to_out(doc, child, entity_token)
                if entity is not None:
                    for t in entity:
                        self.analyse_children(doc, t, entity_token)
                    continue
            elif child.like_num:
                self.add_token_entity_to_out(
                    doc,
                    child,
                    entity_token,
                    Constants.QUANTITY_BLOCK_LABEL,
                )
            self.analyse_children(doc, child, entity_token)

    def build_token_hierarchy(self, doc: spacy.tokens.Doc) -> None:
        index = 0
        roots = [token for token in doc if token.dep_ == "ROOT"]
        for root in roots:
            self.token_hierarchy[root.i] = index
            self.build_token_hierarchy_children(root, index + 1)
        if None in self.token_hierarchy:
            raise ValueError("None in token hierarchy")

    def build_token_hierarchy_children(
        self, token: spacy.tokens.Token, index: int
    ) -> None:
        for child in token.children:
            self.token_hierarchy[child.i] = index
            self.build_token_hierarchy_children(child, index + 1)

    def add_token_entity_to_out(
        self,
        doc: spacy.tokens.Doc,
        token: spacy.tokens.Token,
        var_co_entity: spacy.tokens.Span | None = None,
        label: str | None = None,
    ) -> spacy.tokens.Span | None:
        entity = self.get_entity_containing_token(doc, token)
        if entity is None:
            if var_co_entity is not None and label is not None:
                self.add_to_subdict_in_list(
                    var_co_entity.label_, var_co_entity.text, label, token.text
                )
                self.token_tracker[token.i] = 1
            return None
        if entity.label_ in Constants.VAR_COORD_PATTERN_LABEL:
            self.out[entity.label_].append(
                {Constants.NAME_BLOCK_LABEL: entity.text}
            )
        elif var_co_entity is not None:
            self.add_to_subdict_in_list(
                var_co_entity.label_,
                var_co_entity.text,
                entity.label_,
                entity.text,
            )
        for t in entity:
            self.token_tracker[t.i] = 1
        return entity

    def add_to_subdict_in_list(
        self, var_co_label, var_co_name, add_key, add_value
    ):
        for subdict in self.out[var_co_label]:
            if subdict.get(Constants.NAME_BLOCK_LABEL) == var_co_name:
                subdict[add_key] = add_value
                return
        raise ValueError(f"Could not find {var_co_label} {var_co_name}")

    def build_entity_list(
        self, entity: spacy.tokens.Span
    ) -> List[spacy.tokens.Token]:
        entity_list = [token for token in entity]
        return [
            token
            for _, token in sorted(
                zip(
                    self.token_hierarchy[entity.start : entity.end],
                    entity_list,
                )
            )
        ]

    def order_tokens_hierarchy(
        self, tokens: List[spacy.tokens.Token]
    ) -> List[spacy.tokens.Token]:
        return [
            token
            for _, token in sorted(
                zip(
                    [self.token_hierarchy[token.i] for token in tokens],
                    tokens,
                )
            )
        ]

    def check_all_entities_and_num_mapped(self, doc: spacy.tokens.Doc) -> bool:
        for ent in doc.ents:
            for token in ent:
                if self.token_tracker[token.i] == 0:
                    return False
                break
        for token in [token for token in doc if token.like_num]:
            if self.token_tracker[token.i] == 0:
                return False
        return True

    @staticmethod
    def get_entity_containing_token(
        doc: spacy.tokens.Doc, token: spacy.tokens.Token
    ) -> spacy.tokens.Span | None:
        for ent in doc.ents:
            if token in ent:
                return ent
        return None

    # def analyse_doc(self, doc: spacy.tokens.Doc) -> Dict:
    #     out = {}
    #     self.token_tracker = [0 for _ in doc]
    #     for t in doc:
    #         print(t, t.lemma_, t.pos_)
    #     for ent in doc.ents:
    #         print(ent, ent.label_)
    #     for i, token in enumerate(doc):
    #         if token.ent_iob != 2:
    #             self.token_tracker[i] = 1
    #     for ent in doc.ents:
    #         quantity = self.find_quantity(ent)
    #         out[ent.label_] = {
    #             "text": [ent.text],
    #             "quantity": [quantity.text if quantity else None],
    #             "adjective": [self.find_adjective(ent)],
    #         }
    #     return out

    # def find_quantity(
    #     self, ent: spacy.tokens.Span
    # ) -> spacy.tokens.Token | None:
    #     for token in ent:
    #         head = token.head
    #         if self.token_tracker[head.i] == 0:
    #             if head.pos_ == "NUM" and head.dep_ == "nummod":
    #                 self.token_tracker[head.i] = 1
    #                 return head
    #         for child in token.children:
    #             if self.token_tracker[child.i] == 1:
    #                 continue
    #             if child.pos_ == "NUM":
    #                 # and child.dep_ == "pobj":
    #                 self.token_tracker[child.i] = 1
    #                 return child
    #     return None

    # def find_adjective(self, ent: spacy.tokens.Span):
    #     for token in ent:
    #         for child in token.children:
    #             if child.dep_ == "amod" and self.token_tracker[child.i] == 0:
    #                 self.token_tracker[child.i] = 1
    #                 return child
    #     return None

    # def find_var_params(self, doc: spacy.tokens.Doc) -> None:
    #     self.find_shifts(doc)

    # def find_shifts(self, doc: spacy.tokens.Doc) -> None:
    #     for ent in doc.ents:
    #         if ent.label_ == "SHIFT":
    #             self.out_token[(token for token in ent)] = {}
    #             for token in ent:
    #                 self.token_tracker[token.i] = 1

    # def analyse_var_params_dependencies(self, doc: spacy.tokens.Doc) -> None:
    #     for vp_tokens in self.out_token:
    #         for vp_token in vp_tokens:
    #             head = vp_token.head
    #             if (
    #                 head != vp_token
    #                 and self.token_tracker[head.i] == 0
    #                 and head.ent_type_ not in Constants.VAR_COORD_PATTERN_LABEL
    #             ):
    #                 if head.pos_ == "NUM" and head.dep_ == "nummod":
    #                     self.token_tracker[head.i] = 1
    #                     self.out_token[vp_tokens]["quantity"] = head
