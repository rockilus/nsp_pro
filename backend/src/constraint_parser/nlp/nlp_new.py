from typing import Dict, List

import spacy
from constraint_parser.nlp.verb_phrases import get_verb_phrases
from constraint_parser.nlp.dependency_parsing import DependencyParsing


class NLPNew:
    def __init__(self, pattern: List) -> None:
        self.pattern = pattern

    def __call__(self, text: str) -> Dict:
        nlp = self.instanciate_language_object(self.pattern)
        doc = nlp(text)
        return self.analyse_doc(doc)

    @staticmethod
    def instanciate_language_object(pattern) -> spacy.language.Language:
        nlp = spacy.load("en_core_web_sm", disable="ner")
        ruler = nlp.add_pipe("entity_ruler")
        ruler.add_patterns(pattern)
        return nlp

    def analyse_doc(self, doc: spacy.tokens.Doc) -> Dict:
        verb_phrases = get_verb_phrases(doc)
        dependency_parsing = DependencyParsing(doc, verb_phrases)
        out = dependency_parsing.dependency_parsing()
        return out


"""
1 - instanciate language object (nlp)
2 - ner: load patterns from patterns.py into nlp language object
3 - tokenization: create doc object from text, doc is sequence of token objects
4 - [sentence segmentation, doc.sents]
5 - shallow parsing or chunking: doc.noun_chunks (noun phrase detection), verb 
phrase detection (need to build)
5 - [preprocessing: puntucation (no need for lower case, lemmatization, stop words, etc)]
6 - dependency parsing: doc.root, doc.conjuncts, doc.conjuncts, 
doc.subtree, doc.lefts, doc.rights, doc.ancestors, doc.children, doc.sentiment,
doc.similarity, doc.nbor, doc.doc, doc.vector, doc.vector_norm, doc.has_vector,


POS: The simple UPOS part-of-speech tag.
Tag: The detailed part-of-speech tag.
Dep: Syntactic dependency, i.e. the relation between tokens.

UPOS: Universal part-of-speech tag.
    ADJ: adjective
    ADP: adposition
    ADV: adverb
    AUX: auxiliary
    CCONJ: coordinating conjunction
    DET: determiner
    INTJ: interjection
    NOUN: noun
    NUM: numeral
    PART: particle
    PRON: pronoun
    PROPN: proper noun
    PUNCT: punctuation
    SCONJ: subordinating conjunction
    SYM: symbol
    VERB: verb
    X: other
"""
