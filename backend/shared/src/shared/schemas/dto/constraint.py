from typing import List

from pydantic import BaseModel


class ShiftWorkerOptionDTO(BaseModel):
    name: str | bool
    id: str
    idType: int
    isBoolDim: bool
    categoryName: str


class BlockDTO(BaseModel):
    name: int
    type: int
    value: str | int | List[str] | List[ShiftWorkerOptionDTO]


class MissingAttributeDTO(BaseModel):
    dimensionId: str
    isBool: bool
    dimName: str
    category: int
    attributeValues: List[str | int | float | bool]


class ConstraintBuildDTO(BaseModel):
    id: str
    teamId: str
    constraintType: int
    templateId: str
    language: str
    blocks: List[BlockDTO]
    text: str
    hard: bool
    priority: str
    active: bool
    missingAttributes: List[MissingAttributeDTO]


class TemplateBlockDTO(BaseModel):
    name: int
    type: int
    options: List[str] | List[ShiftWorkerOptionDTO]
    placeholder: str | int


class TemplateDTO(BaseModel):
    id: str
    constraintType: int
    text: str
    language: str
    blocks: List[TemplateBlockDTO]
