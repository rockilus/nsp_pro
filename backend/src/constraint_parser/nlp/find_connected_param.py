from typing import List, Tuple

import spacy
from utils.constants import Constants


class FindConnectedParam:
    def __init__(
        self, doc: spacy.tokens.Doc, verb_phrases: List[spacy.tokens.Span]
    ) -> None:
        self.doc = doc
        self.verb_phrases = verb_phrases

    def find_entity_connected_parameter(
        self, token: spacy.tokens.Token, ent: spacy.tokens.Span
    ) -> Tuple[str, str] | None:
        if ent.label_ in Constants.VAR_COORD_PATTERN_LABEL:
            # Noun (NOUN) as object of preposition (pobj)
            # Head is adposition (ADP) as prepositional modifier (prep)
            if (
                token.pos_ == "NOUN"
                and token.dep_ == "pobj"
                and token.head.pos_ == "ADP"
                and token.head.dep_ == "prep"
                and token.head.lemma_ in ["before", "after"]
            ):
                return self.find_token_connected_parameter(token.head)
            return (ent.label_, ent.text)
        return self.find_token_connected_parameter(token.head)

    def find_token_connected_parameter(
        self, token: spacy.tokens.Token
    ) -> Tuple[str, str] | None:
        if token.ent_iob != 2:
            for ent in self.doc.ents:
                if token in ent:
                    if ent.label_ in Constants.VAR_COORD_PATTERN_LABEL:
                        return (ent.label_, ent.text)
        # Adverb (ADV) as adverbial modifier (advmod)
        if token.pos_ == "ADV" and token.dep_ == "advmod":
            return self.find_token_connected_parameter(token.head)
        # Numeral (NUM) as modifier of noun (nummod), object of preprosition
        # (pobj) or meta modifier (meta)
        if token.pos_ == "NUM" and token.dep_ in ["nummod", "pobj", "meta"]:
            return self.find_token_connected_parameter(token.head)
        # Adverb (ADV) as prepositional modifier (prep)
        if token.pos_ == "ADP" and token.dep_ == "prep":
            return self.find_token_connected_parameter(token.head)
        # Adjective (ADJ) as adjectival modifier (amod) or conjunct (conj)
        if token.pos_ == "ADJ" and token.dep_ in ["conj", "amod"]:
            return self.find_token_connected_parameter(token.head)
        # Noun (NOUN) as object of preposition (pobj)
        if token.pos_ == "NOUN" and token.dep_ == "pobj":
            return self.find_token_connected_parameter(token.head)
        if token.dep_ == "ROOT":
            return self.find_token_connected_parameter_children(token)
        return None

    def find_token_connected_parameter_children(
        self, token: spacy.tokens.Token
    ) -> Tuple[str, str] | None:
        if token.ent_iob != 2:
            for ent in self.doc.ents:
                if token in ent:
                    if ent.label_ in Constants.VAR_COORD_PATTERN_LABEL:
                        return (ent.label_, ent.text)
        # If noun (NOUN) as object of preposition (pobj), child compound (compound)
        if token.pos_ == "NOUN" and token.dep_ == "pobj":
            for child in [t for t in token.children if t.dep_ in ["compound"]]:
                return self.find_token_connected_parameter_children(child)
        # If noun (NOUN) as root (ROOT) , child prepositional modifier (prep) or compound (compound)
        if token.pos_ == "NOUN" and token.dep_ == "ROOT":
            for child in [
                t for t in token.children if t.dep_ in ["prep", "compound"]
            ]:
                return self.find_token_connected_parameter_children(child)
        # If noun (NOUN) as nominal subject - passive (nsubjpass), child prepositional modifier (prep)
        if token.pos_ == "NOUN" and token.dep_ == "nsubjpass":
            for child in [t for t in token.children if t.dep_ == "prep"]:
                return self.find_token_connected_parameter_children(child)
        # If adverb (ADV) as root (ROOT), child object of preposition (pobj)
        if token.pos_ == "ADP" and token.dep_ == "ROOT":
            for child in [t for t in token.children if t.dep_ == "pobj"]:
                return self.find_token_connected_parameter_children(child)
        # If adverb (ADV) as prepositional modifier (prep), child object of preposition (pobj)
        if token.pos_ == "ADP" and token.dep_ == "prep":
            for child in [t for t in token.children if t.dep_ == "pobj"]:
                return self.find_token_connected_parameter_children(child)
        # If verb (VERB) as root (ROOT), child nominal subject - passive (nsubjpass)
        if token.pos_ == "VERB" and token.dep_ == "ROOT":
            for child in [t for t in token.children if t.dep_ == "nsubjpass"]:
                return self.find_token_connected_parameter_children(child)
        return None
