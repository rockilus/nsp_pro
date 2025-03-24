from typing import Any, Dict, List, Union

from shared.database.schemas.base import (
    BaseSchema,
    DocumentBaseSchema,
)
from shared.schemas.schemas.constraint import (
    Block,
    BlockNameOptions,
    BlockTypeOptions,
    ConstraintBuild,
    ConstraintType,
    ShiftWorkerOption,
    SWOIdTypes,
)


class ShiftWorkerOptionSchema(BaseSchema):
    """ShiftWorkerOption embedded schema."""

    name: Any
    id: str
    id_type: int
    is_bool_dim: bool
    category_name: str

    def to_core(self) -> ShiftWorkerOption:
        out = super().to_mongo()
        return ShiftWorkerOption(
            name=out["name"],
            id=self.id,
            id_type=SWOIdTypes(out["id_type"]),
            is_bool_dim=out["is_bool_dim"],
            category_name=out["category_name"],
        )

    @classmethod
    def from_core(cls, swo: ShiftWorkerOption) -> "ShiftWorkerOptionSchema":
        return cls(
            name=swo.name,
            id=swo.id,
            id_type=swo.id_type.value,
            is_bool_dim=swo.is_bool_dim,
            category_name=swo.category_name,
        )


class BlockSchema(BaseSchema):
    """Block embedded schema."""

    name: int
    type: int
    value: Union[Any, List[ShiftWorkerOptionSchema]]

    def to_core(self) -> Block:
        out = super().to_mongo()
        value = out["value"]
        if (
            isinstance(value, list)
            and self.type == BlockTypeOptions.SHIFT_WORKER_OPTION.value
        ):
            value = [
                (
                    ShiftWorkerOptionSchema(**v).to_core()
                    if isinstance(v, dict) and "id" in v
                    else v
                )
                for v in value
            ]
        return Block(
            name=BlockNameOptions(out["name"]),
            type=BlockTypeOptions(out["type"]),
            value=value,
        )

    @classmethod
    def from_core(cls, block: Block) -> "BlockSchema":
        value: Union[Any, List[ShiftWorkerOptionSchema]] = block.value
        if isinstance(value, list) and all(
            isinstance(v, ShiftWorkerOption) for v in value
        ):
            value = [
                ShiftWorkerOptionSchema.from_core(v) for v in value  # type: ignore
            ]
        return cls(
            name=block.name.value,
            type=block.type.value,
            value=value,
        )


class ConstraintBuildSchema(DocumentBaseSchema):
    """ConstraintBuild schema for validation."""

    team: str  # Store team ID instead of reference
    constraint_type: int
    template_id: str
    language: str
    blocks: List[BlockSchema] = []
    hard: bool
    priority: str

    def to_mongo(self) -> Dict[str, Any]:
        out = super().to_mongo()
        out["blocks"] = [block.to_mongo() for block in self.blocks]
        return out

    @classmethod
    def from_mongo(cls, data: Dict[str, Any]) -> "ConstraintBuildSchema":
        data["id"] = str(data.pop("_id"))
        data["blocks"] = [BlockSchema.from_mongo(block) for block in data["blocks"]]
        return cls(**data)

    def to_core(self) -> ConstraintBuild:
        return ConstraintBuild(
            id=self.id or "",
            team_id=self.team,
            constraint_type=ConstraintType(self.constraint_type),
            template_id=self.template_id,
            language=self.language,
            blocks=[block.to_core() for block in self.blocks],
            hard=self.hard,
            priority=self.priority,
        )

    @classmethod
    def from_core(cls, constraint_build: ConstraintBuild) -> "ConstraintBuildSchema":
        return cls(
            id=constraint_build.id,
            team=constraint_build.team_id,
            constraint_type=constraint_build.constraint_type.value,
            template_id=constraint_build.template_id,
            language=constraint_build.language,
            blocks=[BlockSchema.from_core(block) for block in constraint_build.blocks],
            hard=constraint_build.hard,
            priority=constraint_build.priority,
        )
