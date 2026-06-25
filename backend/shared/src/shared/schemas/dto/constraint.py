from typing import List

from pydantic import BaseModel, ConfigDict, Field


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
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "constraint-1",
                "teamId": "64e9b7f1e13e4a1a9c8b4567",
                "constraintType": 1,
                "templateId": "template-1",
                "language": "en",
                "blocks": [{"name": 1, "type": 1, "value": "example"}],
                "text": "Constraint text",
                "hard": True,
                "priority": "high",
                "active": True,
                "missingAttributes": [],
            }
        }
    )

    id: str
    teamId: str
    constraintType: int = Field(examples=[1])
    templateId: str
    language: str
    blocks: List[BlockDTO]
    text: str
    hard: bool = Field(examples=[True])
    priority: str
    active: bool = Field(examples=[True])
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
