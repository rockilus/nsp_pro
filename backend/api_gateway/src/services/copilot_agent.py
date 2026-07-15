"""AI Copilot agent orchestration.

Supports two execution strategies selected by the complexity classifier:

* **ReAct (low complexity):** A multi-turn LiteLLM completion loop for
  single-tool lookups and simple direct mutations.
* **Plan-and-Execute (high complexity):** A Planner sub-agent generates a
  static JSON DAG; a deterministic Python Executor walks it with late
  variable binding, stopping at the first confirmation wall.

Design notes:
  - Uses ``litellm.acompletion`` (async, non-blocking event loop).
  - Provider credentials are passed per-call via ``api_key=`` — NEVER written to
    ``os.environ`` (avoids cross-coroutine key bleed under concurrency).
  - Tool outputs are serialized to JSON strings before being appended to the
    message history, as required by the chat/tool protocol.
"""

import json
import re
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from typing import Any

from litellm import acompletion
from pydantic import BaseModel, ValidationError
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_error, log_info

from src.config import config
from src.errors.copilot_errors.copilot_errors import CopilotDisabledError
from src.integrations.authorization.cerbos_authz_service import (
    CerbosAuthzService,
)
from src.mcp_server.schemas.copilot_plan_schemas import (
    CompletedStep,
    ExecutionPlan,
    PlanStepStatus,
)
from src.mcp_server.schemas.intent_schemas import (
    ComplexityTier,
    IntentClassificationResult,
)
from src.mcp_server.tools.registry import (
    TOOL_REGISTRY,
    ToolChannel,
    get_tool_manifests,
)
from src.security.copilot_action_token import create_action_token
from src.security.user_context import UserContext
from src.services.copilot_executor import (
    CopilotPlanExecutor,
    ExecutionMemory,
)
from src.services.copilot_planner import _call_planner
from src.services.copilot_skills import SKILL_PLAYBOOKS, CopilotIntent


def _strip_thinking(text: str) -> str:
    """Remove ``<thinking>...</thinking>`` blocks from model output.

    Handles both closed and unclosed tags. The model is instructed to place
    all chain-of-thought reasoning inside these blocks so that it never leaks
    into the user-facing UI.
    """
    return re.sub(r"<thinking>.*?(?:</thinking>|$)", "", text, flags=re.DOTALL).strip()


_MAX_TOOL_ITERATIONS = 5


@dataclass
class PendingAction:
    """A prepared write awaiting the user's explicit confirmation."""

    action_token: str
    tier: str
    tool_name: str
    tool_args: dict[str, Any]
    preview: dict[str, Any]
    step: int | None = None


@dataclass
class AgentResult:
    """Result of an agent loop run."""

    text: str
    pending_action: PendingAction | None = None
    execution_mode: str = "react"
    plan: ExecutionPlan | None = None
    completed_steps: list[dict[str, Any]] = field(default_factory=list)
    pending_actions: list[dict[str, Any]] = field(default_factory=list)


def _resolve_api_key(model: str) -> str | None:
    """Map a LiteLLM model string to the configured provider API key.

    Keys are returned for per-call injection; they are never placed in the
    process environment.
    """
    if model.startswith("gemini/"):
        return config.gemini_api_key
    if model.startswith("openrouter/"):
        return config.openrouter_api_key
    if model.startswith("mistral/"):
        return config.mistral_api_key
    return None


def _serialize_tool_output(output: Any) -> str:
    """Serialize a tool result to a JSON string for the message history."""

    def _default(obj: Any) -> Any:
        if isinstance(obj, BaseModel):
            return obj.model_dump(mode="json")
        raise TypeError(f"Object of type {type(obj).__name__} is not serializable")

    if isinstance(output, list):
        payload: Any = [
            (item.model_dump(mode="json") if isinstance(item, BaseModel) else item)
            for item in output
        ]
    elif isinstance(output, BaseModel):
        payload = output.model_dump(mode="json")
    else:
        payload = output

    return json.dumps(payload, default=_default)


def _build_context_message(
    today: date, team_id: str | None, schedule_id: str | None
) -> dict[str, Any]:
    """Build a server-authored context turn from the active page state.

    Injected as a ``system`` message so the model reliably targets the right
    entities and resolves relative dates without the user typing technical
    identifiers. The temporal anchor (``current_date``) is always present so
    the model never has to guess "today".
    """
    parts: list[str] = [
        f"current_date={today.isoformat()}",
        f"weekday={today.strftime('%A')}",
        "timezone=UTC",
    ]
    if team_id:
        parts.append(f"team_id={team_id}")
    if schedule_id:
        parts.append(f"schedule_id={schedule_id}")
    return {
        "role": "system",
        "content": (
            "Active context from the user's current screen: "
            + ", ".join(parts)
            + ". Use current_date (UTC) to resolve any relative dates. Use "
            "these identifiers when calling tools unless the user explicitly "
            "refers to a different team or schedule."
        ),
    }


def _build_execution_error_context(failed_steps: list[CompletedStep]) -> str:
    """Build an error context string for the planner from failed execution steps.

    Describes which step failed, which tool was being called, and the exact
    error message so the planner can correct argument issues on retry.
    """
    parts: list[str] = []
    for s in failed_steps:
        parts.append(f"  Step {s.step} failed: {s.error_message or 'unknown error'}")
    parts.append(
        "\nRegenerate the plan. Ensure ALL required input fields listed in "
        "the tool descriptions are present in each step's args dict. "
        "Infer sensible defaults for fields the user didn't specify rather "
        "than omitting them entirely."
    )
    return "\n".join(parts)


class CopilotAgentService:
    """Orchestrates the LiteLLM tool-execution loop for the copilot."""

    @classmethod
    async def _classify_intent(
        cls,
        user_message: str,
        history: list[dict[str, Any]] | None,
        model: str,
        api_key: str | None,
    ) -> tuple[CopilotIntent, ComplexityTier]:
        """Classify intent AND complexity in a single structured call.

        Uses LiteLLM's ``response_format`` with ``IntentClassificationResult``
        for deterministic, strict output — no string-splitting on pipe tokens.
        """
        classification_prompt = (
            "Analyze the trailing conversation window and the final user query.\n"
            "Classify both the intent and the complexity of the final query.\n\n"
            "INTENT categories:\n"
            f"- {CopilotIntent.GENERAL_QA.value}: informational reports, "
            "listing, help, general questions.\n"
            f"- {CopilotIntent.WORKER_MANAGEMENT.value}: alter, update, "
            "create, or drop employee/worker data.\n"
            f"- {CopilotIntent.SCHEDULE_SOLVER.value}: run, adjust, or "
            "generate shift blocks.\n\n"
            "COMPLEXITY categories:\n"
            f"- {ComplexityTier.LOW.value}: single-entity operations where "
            "at most one simple lookup (resolve_worker_reference, "
            "get_dimensions) precedes one write on the SAME worker, dimension, "
            "or entry. This includes trivial lookup→mutate pairs.\n"
            "  LOW examples: 'change Logan's name to Peter', 'create a "
            "worker named Marie with 35 hours', 'show me the team roster', "
            "'what are Alice's hours', 'set Alice's location to Paris', "
            "'delete the seniority dimension'.\n"
            f"- {ComplexityTier.HIGH.value}: multi-step operations where "
            "entities must be CREATED as prerequisites before the main "
            "operation, batch mutations across multiple distinct workers, "
            "operations spanning mixed domains (workers + shifts + campaigns), "
            "complex date resolution chains, or unbounded/ambiguous scope "
            "requiring enumeration.\n"
            "  HIGH examples: 'create 5 workers, 2 in Paris, 2 in London, "
            "1 in both' (prerequisite dimension+entries), 'end Logan's "
            "contract next Monday' (date resolution required), 'create a "
            "Location dimension with Paris/London options then assign "
            "workers to those cities', 'update ALL nurses to 30 hours' "
            "(batch across multiple workers).\n\n"
            "CRITICAL: a name-to-ID lookup immediately followed by a "
            "single-field update on the SAME worker is LOW complexity — "
            "do NOT classify trivial lookup→mutate pairs as HIGH.\n\n"
            "If the trailing history was a modification but the final user "
            "query switches to a plain question, classify this turn as "
            "general_qa with low complexity."
        )

        messages: list[dict[str, Any]] = [
            {"role": "system", "content": classification_prompt},
        ]

        if history:
            classifier_window = history[-2:]
            messages.extend(
                {"role": turn["role"], "content": turn["content"]}
                for turn in classifier_window
            )

        messages.append(
            {"role": "user", "content": f"<query>{user_message}</query>"},
        )

        try:
            response = await acompletion(
                model=model,
                messages=messages,
                temperature=0.0,
                api_key=api_key,
                response_format=IntentClassificationResult,
            )
            result = IntentClassificationResult.model_validate_json(
                response.choices[0].message.content
            )
            log_info(
                f"Copilot classified: intent={result.intent.value} "
                f"complexity={result.complexity.value}"
            )
            return result.intent, result.complexity
        except (ValidationError, ValueError, Exception) as e:
            log_info(f"Copilot classification fallback (general_qa/low): {e}")
            return CopilotIntent.GENERAL_QA, ComplexityTier.LOW

    @classmethod
    async def run_agent_loop(
        cls,
        user_message: str,
        user_context: UserContext,
        db: DatabaseCollections,
        cerbos: CerbosAuthzService,
        history: list[dict[str, Any]] | None = None,
        team_id: str | None = None,
        schedule_id: str | None = None,
    ) -> AgentResult:
        """Execute the copilot loop, routing by complexity.

        The backend remains stateless: conversation ``history`` and page
        ``context`` are supplied by the client on every request and are never
        persisted. Callers own storage.
        """
        if not config.ai_enabled:
            raise CopilotDisabledError("The AI copilot feature is disabled")

        model = config.ai_model
        api_key = _resolve_api_key(model)
        log_info(f"Copilot loop started: user={user_context.user_id} model={model}")

        intent, complexity = await cls._classify_intent(
            user_message, history, model, api_key
        )
        log_info(f"Copilot route: intent={intent.value} complexity={complexity.value}")

        if complexity == ComplexityTier.HIGH:
            return await cls._run_plan_and_execute(
                user_message=user_message,
                history=history,
                model=model,
                api_key=api_key,
                user_context=user_context,
                db=db,
                cerbos=cerbos,
                team_id=team_id,
                schedule_id=schedule_id,
            )

        return await cls._run_react_loop(
            user_message=user_message,
            intent=intent,
            history=history,
            model=model,
            api_key=api_key,
            user_context=user_context,
            db=db,
            cerbos=cerbos,
            team_id=team_id,
            schedule_id=schedule_id,
        )

    @classmethod
    async def _run_react_loop(
        cls,
        user_message: str,
        intent: CopilotIntent,
        history: list[dict[str, Any]] | None,
        model: str,
        api_key: str | None,
        user_context: UserContext,
        db: DatabaseCollections,
        cerbos: CerbosAuthzService,
        team_id: str | None,
        schedule_id: str | None,
    ) -> AgentResult:
        """Standard ReAct multi-turn tool-execution loop for low complexity."""
        playbook = SKILL_PLAYBOOKS[intent]
        pending: list[PendingAction] = []

        messages: list[dict[str, Any]] = [
            {"role": "system", "content": playbook["system_prompt"]},
        ]
        if history:
            capped_history = history[-config.ai_max_history_messages :]
            messages.extend(
                {"role": turn["role"], "content": turn["content"]}
                for turn in capped_history
            )
        context_message = _build_context_message(
            datetime.now(timezone.utc).date(), team_id, schedule_id
        )
        if context_message is not None:
            messages.append(context_message)
        messages.append(
            {
                "role": "user",
                "content": f"<raw_user_message>{user_message}</raw_user_message>",
            }
        )

        all_manifests = get_tool_manifests(ToolChannel.COPILOT)
        manifests = [
            m
            for m in all_manifests
            if m["function"]["name"] in playbook["allowed_tools"]
        ]
        log_info(
            f"ReAct tool filter: {intent.value} "
            f"total={len(all_manifests)} allowed={len(manifests)}"
        )

        try:
            for _ in range(_MAX_TOOL_ITERATIONS):
                response = await acompletion(
                    model=model,
                    messages=messages,
                    tools=manifests,
                    tool_choice="auto",
                    temperature=0.0,
                    api_key=api_key,
                )
                response_message = response.choices[0].message
                tool_calls = response_message.tool_calls

                if not tool_calls:
                    return AgentResult(
                        text=_strip_thinking(response_message.content or ""),
                        pending_action=pending[0] if pending else None,
                        execution_mode="react",
                    )

                normalized_msg = response_message.model_dump(exclude_none=True)
                if "content" not in normalized_msg:
                    normalized_msg["content"] = ""
                messages.append(normalized_msg)

                for tool_call in tool_calls:
                    await cls._execute_tool_call(
                        tool_call=tool_call,
                        messages=messages,
                        user_context=user_context,
                        db=db,
                        cerbos=cerbos,
                        pending=pending,
                    )

            final = await acompletion(
                model=model,
                messages=messages,
                temperature=0.0,
                api_key=api_key,
            )
            return AgentResult(
                text=_strip_thinking(final.choices[0].message.content or ""),
                pending_action=pending[0] if pending else None,
                execution_mode="react",
            )

        except CopilotDisabledError:
            raise
        except Exception as e:
            log_error(f"ReAct loop failed: {str(e)}")
            raise

    @classmethod
    async def _run_plan_and_execute(
        cls,
        user_message: str,
        history: list[dict[str, Any]] | None,
        model: str,
        api_key: str | None,
        user_context: UserContext,
        db: DatabaseCollections,
        cerbos: CerbosAuthzService,
        team_id: str | None,
        schedule_id: str | None,
    ) -> AgentResult:
        """Plan-and-Execute path: Planner → Executor for complex multi-step ops.

        Retries planner+executor up to ``copilot_plan_execution_max_retries``
        times when a step fails due to argument validation errors, feeding the
        exact error back to the planner so it can correct the plan.
        """
        context_message = _build_context_message(
            datetime.now(timezone.utc).date(), team_id, schedule_id
        )

        max_retries = config.copilot_plan_execution_max_retries
        last_result: Any = None
        error_context: str | None = None

        for attempt in range(max_retries + 1):
            plan = await _call_planner(
                user_message=user_message,
                history=history,
                model=model,
                api_key=api_key,
                context_message=context_message,
                error_context=error_context,
            )

            result = await CopilotPlanExecutor.execute(
                plan=plan,
                user_context=user_context,
                db=db,
                cerbos=cerbos,
            )

            errors = [
                s for s in result.completed_steps if s.status == PlanStepStatus.ERROR
            ]
            if not errors:
                last_result = result
                break

            last_result = result
            if attempt >= max_retries:
                log_error(
                    f"Plan execution exhausted {max_retries + 1} attempts; "
                    f"returning last result with {len(errors)} errors"
                )
                break

            error_context = _build_execution_error_context(errors)
            log_info(
                f"Plan execution attempt {attempt + 1} failed; "
                f"retrying with error context"
            )

        # At this point last_result is guaranteed to be set (loop runs at least once)
        assert last_result is not None

        completed_steps = [
            {"step": s.step, "status": s.status.value, "error_message": s.error_message}
            for s in last_result.completed_steps
        ]

        has_errors = any(
            s.status == PlanStepStatus.ERROR for s in last_result.completed_steps
        )
        if has_errors:
            error_lines = [
                f"Step {s.step}: {s.error_message or 'unknown error'}"
                for s in last_result.completed_steps
                if s.status == PlanStepStatus.ERROR
            ]
            response_text = "I encountered errors executing your plan:\n" + "\n".join(
                error_lines
            )
        else:
            response_text = (
                f"I've prepared {len(plan.plan)} steps for your request: {plan.summary}"
            )

        pending_action = None
        if last_result.pending_actions:
            first = last_result.pending_actions[0]
            pending_action = PendingAction(
                action_token=first["action_token"],
                tier=first["tier"],
                tool_name=first["tool_name"],
                tool_args=first["tool_args"],
                preview=first["preview"],
                step=first.get("step"),
            )

        return AgentResult(
            text=response_text,
            pending_action=pending_action,
            execution_mode="plan_and_execute",
            plan=plan,
            completed_steps=completed_steps,
            pending_actions=last_result.pending_actions,
        )

    @classmethod
    async def _execute_tool_call(
        cls,
        tool_call: Any,
        messages: list[dict[str, Any]],
        user_context: UserContext,
        db: DatabaseCollections,
        cerbos: CerbosAuthzService,
        pending: list["PendingAction"],
    ) -> None:
        """Run a single tool call locally and append its result to messages.

        Tier-2/Tier-1 write tools run in ``preview`` mode: they validate and
        authorize but do NOT mutate. When a tool returns ``pending_confirmation``
        we mint a signed action token binding the caller, tool name, and a hash
        of the arguments, and record it for the client to confirm.
        """
        function_name = tool_call.function.name
        spec = TOOL_REGISTRY.get(function_name)

        try:
            args = json.loads(tool_call.function.arguments or "{}")
        except json.JSONDecodeError:
            args = {}

        if spec is None:
            output: Any = {"error": f"Unknown tool: {function_name}"}
        else:
            log_info(f"Copilot executing tool={function_name} args={args}")
            requires_confirmation = spec.confirmation_tier != "none"
            try:
                call_kwargs = dict(args)
                if requires_confirmation:
                    call_kwargs["mode"] = "preview"
                output = await spec.executor(
                    db=db,
                    user_context=user_context,
                    cerbos=cerbos,
                    **call_kwargs,
                )
            except (TypeError, ValidationError) as e:
                log_error(
                    f"Copilot tool signature mismatch for {function_name}: {str(e)}"
                )
                output = {
                    "error": "Invalid tool arguments provided.",
                    "details": str(e),
                    "hint": "Verify the schema fields before re-attempting.",
                }

            if (
                isinstance(output, dict)
                and output.get("status") == "pending_confirmation"
                and not pending
            ):
                token = create_action_token(
                    user_id=user_context.user_id,
                    tool_name=function_name,
                    tool_args=args,
                    secret=config.copilot_action_jwt_secret,
                    ttl_seconds=config.copilot_action_token_ttl_seconds,
                )
                pending.append(
                    PendingAction(
                        action_token=token,
                        tier=output.get("tier", spec.confirmation_tier),
                        tool_name=function_name,
                        tool_args=args,
                        preview=output.get("preview", {}),
                    )
                )

        messages.append(
            {
                "role": "tool",
                "tool_call_id": tool_call.id,
                "name": function_name,
                "content": _serialize_tool_output(output),
            }
        )

    @classmethod
    async def confirm_action(
        cls,
        tool_name: str,
        tool_args: dict[str, Any],
        user_context: UserContext,
        db: DatabaseCollections,
        cerbos: CerbosAuthzService,
    ) -> dict[str, Any]:
        """Execute a previously previewed write in ``execute`` mode.

        Called only by the confirm route AFTER the signed action token and its
        argument hash have been verified. Cerbos is re-checked inside the
        executor as the final trust boundary.
        """
        spec = TOOL_REGISTRY.get(tool_name)
        if spec is None or spec.confirmation_tier == "none":
            return {
                "status": "error",
                "message": "Unknown or non-confirmable tool.",
            }

        log_info(f"Copilot confirming tool={tool_name} user={user_context.user_id}")
        return await spec.executor(
            db=db,
            user_context=user_context,
            cerbos=cerbos,
            mode="execute",
            **tool_args,
        )

    @classmethod
    async def confirm_plan_step(
        cls,
        tool_name: str,
        tool_args: dict[str, Any],
        confirmed_step: int | None,
        user_message: str,
        history: list[dict[str, Any]] | None,
        user_context: UserContext,
        db: DatabaseCollections,
        cerbos: CerbosAuthzService,
        team_id: str | None,
        schedule_id: str | None,
    ) -> AgentResult:
        """Confirm a plan step and continue execution via Pure Replay.

        The backend re-plans and re-executes all read-side steps
        deterministically, executes the confirmed step in ``execute`` mode,
        then continues with remaining steps until the next confirmation
        wall or plan completion.

        ``confirmed_step`` disambiguates which step to confirm when the plan
        contains multiple steps with the same tool name.

        Retries planner+execution up to ``copilot_plan_execution_max_retries``
        times when a step fails due to argument validation errors.

        The client never sends ``execution_memory`` or ``plan`` — the server
        reconstructs both. This closes the client-side trust boundary.
        """
        model = config.ai_model
        api_key = _resolve_api_key(model)

        context_message = _build_context_message(
            datetime.now(timezone.utc).date(), team_id, schedule_id
        )

        max_retries = config.copilot_plan_execution_max_retries
        error_context: str | None = None
        plan: ExecutionPlan | None = None
        completed_steps: list[dict[str, Any]] = []
        pending_actions: list[dict[str, Any]] = []

        for attempt in range(max_retries + 1):
            plan = await _call_planner(
                user_message=user_message,
                history=history,
                model=model,
                api_key=api_key,
                context_message=context_message,
                error_context=error_context,
            )

            executed_confirmation = False
            memory = ExecutionMemory()
            completed_steps = []
            pending_actions = []
            has_error = False
            error_steps: list[dict[str, Any]] = []

            for step in plan.plan:
                resolved_args = memory.resolve_args(step.args)
                spec = TOOL_REGISTRY.get(step.tool)

                if spec is None:
                    completed_steps.append(
                        {
                            "step": step.step,
                            "status": "error",
                            "error_message": f"Unknown tool: {step.tool}",
                        }
                    )
                    error_steps.append(completed_steps[-1])
                    has_error = True
                    break

                # Use step number when available (disambiguates same-tool
                # steps), fall back to tool_name for backward compatibility.
                _is_confirmed = (
                    confirmed_step is not None and step.step == confirmed_step
                ) or (confirmed_step is None and step.tool == tool_name)
                if _is_confirmed and not executed_confirmation:
                    try:
                        output = await spec.executor(
                            db=db,
                            user_context=user_context,
                            cerbos=cerbos,
                            mode="execute",
                            **resolved_args,
                        )
                    except (TypeError, ValidationError) as e:
                        completed_steps.append(
                            {
                                "step": step.step,
                                "status": "error",
                                "error_message": str(e),
                            }
                        )
                        error_steps.append(completed_steps[-1])
                        has_error = True
                        break
                    except Exception as e:
                        completed_steps.append(
                            {
                                "step": step.step,
                                "status": "error",
                                "error_message": str(e),
                            }
                        )
                        error_steps.append(completed_steps[-1])
                        has_error = True
                        break

                    executed_confirmation = True
                    if (
                        isinstance(output, dict)
                        and step.assign_output_to
                        and step.extract_key
                        and step.extract_key in output
                    ):
                        memory.assign(step.assign_output_to, output[step.extract_key])
                    completed_steps.append({"step": step.step, "status": "completed"})
                    continue

                requires_confirmation = spec.confirmation_tier != "none"

                if requires_confirmation:
                    try:
                        output = await spec.executor(
                            db=db,
                            user_context=user_context,
                            cerbos=cerbos,
                            mode="preview",
                            **resolved_args,
                        )
                    except (TypeError, ValidationError) as e:
                        completed_steps.append(
                            {
                                "step": step.step,
                                "status": "error",
                                "error_message": str(e),
                            }
                        )
                        error_steps.append(completed_steps[-1])
                        has_error = True
                        break
                    except Exception as e:
                        completed_steps.append(
                            {
                                "step": step.step,
                                "status": "error",
                                "error_message": str(e),
                            }
                        )
                        error_steps.append(completed_steps[-1])
                        has_error = True
                        break

                    if isinstance(output, dict) and output.get("status") == "error":
                        completed_steps.append(
                            {
                                "step": step.step,
                                "status": "error",
                                "error_message": output.get("message", "Unknown error"),
                            }
                        )
                        error_steps.append(completed_steps[-1])
                        has_error = True
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
                        {"step": step.step, "status": "pending_confirmation"}
                    )
                    break
                else:
                    try:
                        output = await spec.executor(
                            db=db,
                            user_context=user_context,
                            cerbos=cerbos,
                            **resolved_args,
                        )
                    except (TypeError, ValidationError) as e:
                        completed_steps.append(
                            {
                                "step": step.step,
                                "status": "error",
                                "error_message": str(e),
                            }
                        )
                        error_steps.append(completed_steps[-1])
                        has_error = True
                        break
                    except Exception as e:
                        completed_steps.append(
                            {
                                "step": step.step,
                                "status": "error",
                                "error_message": str(e),
                            }
                        )
                        error_steps.append(completed_steps[-1])
                        has_error = True
                        break

                    if isinstance(output, dict) and output.get("status") == "error":
                        completed_steps.append(
                            {
                                "step": step.step,
                                "status": "error",
                                "error_message": output.get("message", "Unknown error"),
                            }
                        )
                        error_steps.append(completed_steps[-1])
                        has_error = True
                        break

                    if (
                        step.assign_output_to
                        and step.extract_key
                        and isinstance(output, dict)
                    ):
                        memory.assign(
                            step.assign_output_to, output.get(step.extract_key)
                        )
                    completed_steps.append({"step": step.step, "status": "completed"})

            if not has_error:
                break

            if attempt >= max_retries:
                log_error(
                    f"Pure Replay execution exhausted {max_retries + 1} attempts; "
                    f"returning last result with errors"
                )
                break

            error_context = "\n".join(
                f"  Step {s['step']} failed: {s.get('error_message', 'unknown')}"
                for s in error_steps
            ) + (
                "\n\nRegenerate the plan. Fix the argument errors in the failing steps."
            )
            log_info(
                f"Pure Replay execution attempt {attempt + 1} failed; "
                f"retrying with error context"
            )

        assert plan is not None  # retry loop always runs >= 1 iteration

        for s in plan.plan[len(completed_steps) :]:
            completed_steps.append({"step": s.step, "status": "waiting"})

        pending_action = None
        if pending_actions:
            first = pending_actions[0]
            pending_action = PendingAction(
                action_token=first["action_token"],
                tier=first["tier"],
                tool_name=first["tool_name"],
                tool_args=first["tool_args"],
                preview=first["preview"],
                step=first.get("step"),
            )

        response_text = "Action confirmed. " + (
            f"Continuing plan: {plan.summary}" if pending_actions else "Plan complete."
        )

        return AgentResult(
            text=response_text,
            pending_action=pending_action,
            execution_mode="plan_and_execute",
            plan=plan,
            completed_steps=completed_steps,
            pending_actions=pending_actions,
        )
