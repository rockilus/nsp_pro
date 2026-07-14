"""Argument schema for the resolve_worker_reference tool.

A granular retrieval tool that resolves a worker name to an ID, returning
a flat dict suitable for direct ``$VARIABLE`` binding in the Plan-and-Execute
pipeline.
"""

from pydantic import BaseModel, ConfigDict, Field


class ResolveWorkerReferenceArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")

    team_id: str = Field(
        ...,
        description="The team to search within. Use the active screen context "
        "team_id unless the user explicitly refers to a different team.",
    )
    name: str = Field(
        ...,
        description="Full name or unambiguous fragment of the worker to find. "
        "Case-insensitive substring match. If multiple workers match, the tool "
        "returns an error with candidate names.",
    )
