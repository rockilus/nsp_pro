"""Strict argument schemas for the copilot dimension/dim-entry write tools.

Dimensions are the custom attributes a team defines for its workers (e.g.
Location, Seniority). Dropdown dimensions own a set of dim entries (the
selectable options). Rich ``Field`` descriptions guide the LLM's extraction.
"""

from typing import List, Optional

from pydantic import BaseModel, Field


class CreateDimensionArgs(BaseModel):
    """Arguments to create a new custom worker dimension."""

    team_id: str = Field(
        ...,
        description="The team the dimension belongs to. Usually from screen "
        "context; do not invent it.",
    )
    name: str = Field(
        ..., description="Human-readable dimension name, e.g. 'Location'."
    )
    entry_type: int = Field(
        ...,
        description="Value type of the dimension: 0=text (STR), 1=number (INT), "
        "2=yes/no (BOOL), 3=dropdown (DIM_ENTRIES). For dropdowns, provide "
        "entry_names.",
    )
    entry_names: List[str] = Field(
        default_factory=list,
        description="For dropdown (entry_type=3) dimensions, the list of option "
        "names to create, e.g. ['Paris', 'London']. Empty for other types.",
    )


class UpdateDimensionArgs(BaseModel):
    """Partial patch of an existing dimension. Only rename is supported."""

    dimension_id: str = Field(
        ..., description="The identifier of the dimension to update."
    )
    name: Optional[str] = Field(
        None, description="Updated human-readable dimension name."
    )


class DeleteDimensionArgs(BaseModel):
    """Arguments to soft-delete a dimension and its entries/attributes."""

    dimension_id: str = Field(
        ..., description="The identifier of the dimension to soft-delete."
    )


class CreateDimEntryArgs(BaseModel):
    """Arguments to add a new option to a dropdown dimension."""

    dimension_id: str = Field(
        ...,
        description="The dropdown dimension this new entry (option) belongs to.",
    )
    name: str = Field(
        ..., description="Name of the new dropdown option, e.g. 'Berlin'."
    )


class UpdateDimEntryArgs(BaseModel):
    """Partial patch of an existing dropdown entry. Only rename is supported."""

    dim_entry_id: str = Field(
        ..., description="The identifier of the dropdown entry to update."
    )
    name: Optional[str] = Field(None, description="Updated option name.")


class DeleteDimEntryArgs(BaseModel):
    """Arguments to soft-delete a dropdown entry (option)."""

    dim_entry_id: str = Field(
        ..., description="The identifier of the dropdown entry to soft-delete."
    )
