"""AI Copilot agent orchestration.

Runs a multi-turn LiteLLM completion loop that routes user intent to local
tools, executes them inside the secure Python runtime (with Cerbos enforced per
call via the shared tool registry), and synthesizes a final localized answer.

Design notes:
  - Uses ``litellm.acompletion`` (async, non-blocking event loop).
  - Provider credentials are passed per-call via ``api_key=`` — NEVER written to
    ``os.environ`` (avoids cross-coroutine key bleed under concurrency).
  - Tool outputs are serialized to JSON strings before being appended to the
    message history, as required by the chat/tool protocol.
"""

import json
from dataclasses import dataclass
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
from src.mcp.tools.registry import (
    TOOL_REGISTRY,
    ToolChannel,
    get_tool_manifests,
)
from src.security.copilot_action_token import create_action_token
from src.security.user_context import UserContext

_SYSTEM_PROMPT = (
    "You are the exclusive Rockilus Workforce Management Intelligent Copilot.\n\n"
    "CRITICAL CONSTRAINT: You are strictly forbidden from answering questions "
    "about general knowledge, history, science, pop culture, politics, or "
    "general programming unrelated to this application.\n\n"
    "Your operational boundary is strictly limited to: hospital shift "
    "scheduling, nurse/worker rosters, compliance tracking, workforce "
    "analytics, and Rockilus platform support.\n\n"
    'If the user asks an off-topic question (e.g., "Who was the first '
    'president of France?", "Write a recipe", "Solve this history '
    'riddle"), you must ignore your internal general knowledge database and '
    "reply with a polite refusal in the same language the user wrote in. "
    "Convey that you are only configured to assist with Rockilus workforce "
    "management data and platform support.\n\n"
    "You have access to local tools. Always verify data via the provided tools "
    "before answering — never invent worker data.\n\n"
    "Respond fluently in the same language the user writes in (English, "
    "French, or Spanish).\n\n"
    "CRITICAL TOOL-CALLING RULES:\n"
    "1. Any database modification, creation, or deletion MUST be performed by "
    "calling the appropriate tool in the SAME turn. You are forbidden from "
    "replying with narrative text alone when a write tool is required.\n"
    "2. NEVER say you 'have prepared', 'will prepare', or 'are setting up' a "
    "change unless you are emitting the tool call in that exact same turn. "
    "Prose alone changes nothing in the database.\n"
    "3. Do NOT imitate or copy older preview descriptions (e.g. '39 -> 45') "
    "found in the conversation history. Every fresh user request to modify "
    "data requires a brand-new, explicit tool call.\n"
    "4. Only produce a 'Proposed Changes' style summary AFTER a tool has "
    "returned a 'pending_confirmation' result in the immediate turn.\n\n"
    "WRITE SEMANTICS & LIFECYCLE:\n"
    "- create_* tools apply changes immediately once called.\n"
    "- update_* / soft_delete_* / delete_* tools are strictly "
    "PREVIEW-GENERATION tools. Calling them is completely safe and does NOT "
    "alter the database; it only generates the secure confirmation payload "
    "required for the UI card. Therefore you MUST call these tools "
    "immediately on the user's very first request so the frontend can render "
    "the interactive confirmation card. Do NOT ask for permission in prose "
    "first — calling the tool is the only way to show the user the "
    "confirmation card.\n"
    "- Never output systemic classification preamble like 'La demande est "
    "valide' or 'This request is valid'. Get straight to the point.\n\n"
    "INBOUND NOTIFICATION CLAUSE:\n"
    "- Turns beginning with '[System Notification: ...]' are absolute, "
    "immutable ground truth about what was actually committed to the database "
    "(whether the user applied or cancelled a prepared change). Trust them "
    "over your own assumptions when answering follow-ups.\n\n"
    "DATE RESOLUTION:\n"
    "- Resolve all relative dates ('today', 'tomorrow', 'yesterday', "
    "'last year', 'next Monday', 'this week') against the 'current_date' "
    "(UTC) provided in the active context, using its 'weekday' as reference. "
    "Compute the exact calendar date yourself and NEVER guess or invent "
    "dates. Always express dates in ISO YYYY-MM-DD format."
)

_MAX_TOOL_ITERATIONS = 5


@dataclass
class PendingAction:
    """A prepared write awaiting the user's explicit confirmation."""

    action_token: str
    tier: str
    tool_name: str
    tool_args: dict[str, Any]
    preview: dict[str, Any]


@dataclass
class AgentResult:
    """Result of an agent loop run."""

    text: str
    pending_action: PendingAction | None = None


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


class CopilotAgentService:
    """Orchestrates the LiteLLM tool-execution loop for the copilot."""

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
        """Execute the multi-turn agent loop and return the final answer.

        The backend remains stateless: conversation ``history`` and page
        ``context`` are supplied by the client on every request and are never
        persisted. Callers own storage.

        Args:
            user_message: The manager's natural-language request.
            user_context: Authenticated caller identity (drives authorization).
            db: Database collections for tool execution.
            cerbos: Authorization service enforced per tool call.
            history: Prior ``{"role", "content"}`` turns for follow-up context.
                Roles are restricted to ``user``/``assistant`` at the API layer.
            team_id: Active team from the client's current screen, if any.
            schedule_id: Active schedule from the client's current screen, if any.

        Returns:
            An ``AgentResult`` with the assistant text and, when a Tier-2/Tier-1
            write was prepared, a signed ``PendingAction`` for confirmation.

        Raises:
            CopilotDisabledError: If the AI feature is disabled.
        """
        if not config.ai_enabled:
            raise CopilotDisabledError("The AI copilot feature is disabled")

        model = config.ai_model
        api_key = _resolve_api_key(model)
        log_info(f"Copilot loop started: user={user_context.user_id} model={model}")

        # Collects a prepared (but unexecuted) write to surface to the client.
        pending: list[PendingAction] = []

        messages: list[dict[str, Any]] = [
            {"role": "system", "content": _SYSTEM_PROMPT},
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

        manifests = get_tool_manifests(ToolChannel.COPILOT)

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
                        text=response_message.content or "",
                        pending_action=pending[0] if pending else None,
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

            # Tool budget exhausted: request a final synthesis without tools.
            final = await acompletion(
                model=model,
                messages=messages,
                temperature=0.0,
                api_key=api_key,
            )
            return AgentResult(
                text=final.choices[0].message.content or "",
                pending_action=pending[0] if pending else None,
            )

        except CopilotDisabledError:
            raise
        except Exception as e:
            log_error(f"Copilot agent loop failed: {str(e)}")
            raise

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
