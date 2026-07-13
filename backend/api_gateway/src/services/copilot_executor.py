"""Deterministic Plan-and-Execute step loop with late variable binding.

Walks an ``ExecutionPlan`` sequentially. Read-side steps run eagerly and
their outputs are bound to ``$VARIABLE`` names in an in-memory store.
The executor stops at the first confirmation-requiring step and returns a
``PendingAction`` for the user to confirm.
"""

import re
from typing import Any

from pydantic import ValidationError
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_error

from src.config import config
from src.integrations.authorization.cerbos_authz_service import (
    CerbosAuthzService,
)
from src.mcp.schemas.copilot_plan_schemas import (
    CompletedStep,
    ExecutionPlan,
    PlanExecutionResult,
    PlanStepStatus,
)
from src.mcp.tools.registry import TOOL_REGISTRY
from src.security.copilot_action_token import create_action_token
from src.security.user_context import UserContext

_VAR_PATTERN = re.compile(r"^\$[A-Z_][A-Z0-9_]*$")


class VariableNotFoundError(Exception):
    """A $VARIABLE referenced in args has not been assigned yet."""


class ExecutionMemory:
    """In-memory variable store for the Plan-and-Execute step loop."""

    def __init__(self) -> None:
        self._store: dict[str, Any] = {}

    def assign(self, var: str, value: Any) -> None:
        self._store[var] = value

    def resolve(self, value: Any) -> Any:
        """Replace $VARIABLE references with stored values.

        Supports both plain ``"$VAR"`` strings and nested dicts/lists.
        """
        if isinstance(value, str) and _VAR_PATTERN.match(value):
            if value not in self._store:
                raise VariableNotFoundError(
                    f"${value} has not been assigned by a prior step"
                )
            return self._store[value]

        if isinstance(value, dict):
            return {k: self.resolve(v) for k, v in value.items()}

        if isinstance(value, list):
            return [self.resolve(item) for item in value]

        return value

    def resolve_args(self, args: dict[str, Any]) -> dict[str, Any]:
        """Resolve all $VARIABLE references in a step's argument dict."""
        resolved: dict[str, Any] = {}
        for key, val in args.items():
            resolved[key] = self.resolve(val)
        return resolved

    def to_dict(self) -> dict[str, Any]:
        return dict(self._store)


class CopilotPlanExecutor:
    """Walks an ExecutionPlan deterministically, binding variables from step
    outputs and stopping at the first confirmation wall."""

    @classmethod
    async def execute(
        cls,
        plan: ExecutionPlan,
        user_context: UserContext,
        db: DatabaseCollections,
        cerbos: CerbosAuthzService,
        memory: ExecutionMemory | None = None,
    ) -> PlanExecutionResult:
        memory = memory or ExecutionMemory()
        completed_steps: list[CompletedStep] = []
        pending_actions: list[dict[str, Any]] = []

        for step in plan.plan:
            resolved_args = memory.resolve_args(step.args)

            spec = TOOL_REGISTRY.get(step.tool)
            if spec is None:
                log_error(f"Executor: unknown tool {step.tool} at step {step.step}")
                completed_steps.append(
                    CompletedStep(
                        step=step.step,
                        status=PlanStepStatus.ERROR,
                        error_message=f"Unknown tool: {step.tool}",
                    )
                )
                break

            requires_confirmation = spec.confirmation_tier != "none"

            if not requires_confirmation:
                try:
                    output = await spec.executor(
                        db=db,
                        user_context=user_context,
                        cerbos=cerbos,
                        **resolved_args,
                    )
                except (TypeError, ValidationError) as e:
                    log_error(f"Executor step {step.step} ({step.tool}) failed: {e}")
                    completed_steps.append(
                        CompletedStep(
                            step=step.step,
                            status=PlanStepStatus.ERROR,
                            error_message=str(e),
                        )
                    )
                    break
                except Exception as e:
                    log_error(
                        f"Executor step {step.step} ({step.tool}) unexpected: {e}"
                    )
                    completed_steps.append(
                        CompletedStep(
                            step=step.step,
                            status=PlanStepStatus.ERROR,
                            error_message=str(e),
                        )
                    )
                    break

                if isinstance(output, dict) and output.get("status") == "error":
                    log_error(
                        f"Executor step {step.step} ({step.tool}) returned error: "
                        f"{output.get('message')}"
                    )
                    completed_steps.append(
                        CompletedStep(
                            step=step.step,
                            status=PlanStepStatus.ERROR,
                            error_message=output.get("message", "Unknown error"),
                        )
                    )
                    break

                if (
                    step.assign_output_to
                    and step.extract_key
                    and isinstance(output, dict)
                    and step.extract_key in output
                ):
                    memory.assign(step.assign_output_to, output[step.extract_key])

                completed_steps.append(
                    CompletedStep(step=step.step, status=PlanStepStatus.COMPLETED)
                )
            else:
                try:
                    output = await spec.executor(
                        db=db,
                        user_context=user_context,
                        cerbos=cerbos,
                        mode="preview",
                        **resolved_args,
                    )
                except (TypeError, ValidationError) as e:
                    log_error(
                        f"Executor step {step.step} ({step.tool}) preview failed: {e}"
                    )
                    completed_steps.append(
                        CompletedStep(
                            step=step.step,
                            status=PlanStepStatus.ERROR,
                            error_message=str(e),
                        )
                    )
                    break
                except Exception as e:
                    log_error(
                        f"Executor step {step.step} ({step.tool}) preview unexpected: {e}"
                    )
                    completed_steps.append(
                        CompletedStep(
                            step=step.step,
                            status=PlanStepStatus.ERROR,
                            error_message=str(e),
                        )
                    )
                    break

                if isinstance(output, dict) and output.get("status") == "error":
                    log_error(
                        f"Executor step {step.step} ({step.tool}) preview returned "
                        f"error: {output.get('message')}"
                    )
                    completed_steps.append(
                        CompletedStep(
                            step=step.step,
                            status=PlanStepStatus.ERROR,
                            error_message=output.get("message", "Unknown error"),
                        )
                    )
                    break

                if (
                    isinstance(output, dict)
                    and output.get("status") == "pending_confirmation"
                ):
                    token = create_action_token(
                        user_id=user_context.user_id,
                        tool_name=step.tool,
                        tool_args=resolved_args,
                        secret=config.copilot_action_jwt_secret,
                        ttl_seconds=config.copilot_action_token_ttl_seconds,
                    )
                    pending_actions.append(
                        {
                            "action_token": token,
                            "tier": output.get("tier", spec.confirmation_tier),
                            "tool_name": step.tool,
                            "tool_args": resolved_args,
                            "preview": output.get("preview", {}),
                            "step": step.step,
                        }
                    )

                completed_steps.append(
                    CompletedStep(
                        step=step.step, status=PlanStepStatus.PENDING_CONFIRMATION
                    )
                )
                break

        remaining = plan.plan[len(completed_steps) :]
        for s in remaining:
            completed_steps.append(
                CompletedStep(step=s.step, status=PlanStepStatus.WAITING)
            )

        return PlanExecutionResult(
            plan=plan,
            completed_steps=completed_steps,
            pending_actions=pending_actions,
            execution_memory=memory.to_dict(),
        )
