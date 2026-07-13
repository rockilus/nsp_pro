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
import re
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
    async def _classify_intent(
        cls,
        user_message: str,
        history: list[dict[str, Any]] | None,
        model: str,
        api_key: str | None,
    ) -> CopilotIntent:
        """Classify the user's request based on action intent, not vocabulary.

        A cheap, no-tools classifier call run before the main loop.  A rolling
        window of the last 2 history turns preserves pronoun / elliptical context
        for short follow-ups ("yes", "Fais-le").
        """
        classification_prompt = (
            "Analyze the trailing conversation window and the final user query.\n"
            "Classify the final user query into exactly one of these categories:\n"
            f"- '{CopilotIntent.ROSTER_MODIFICATION.value}': User wants to "
            "alter, update, create, or drop employee/worker data.\n"
            f"- '{CopilotIntent.SCHEDULE_SOLVER.value}': User wants to run, "
            "adjust, or generate shift blocks.\n"
            f"- '{CopilotIntent.GENERAL_QA.value}': Informational reports, "
            "listing people, standard app help, or general questions.\n\n"
            "CRITICAL: If the trailing history was a modification but the "
            "final user query switches to a plain question (e.g. 'Who is on "
            "the team?'), classify this turn as general_qa. Prioritise the "
            "final user turn over history.\n"
            "Respond ONLY with the raw string token of the category. "
            "No markdown, no prose, no punctuation."
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
            )
            raw_intent = response.choices[0].message.content.strip().lower()
            raw_intent = raw_intent.replace('"', "").replace("'", "")

            resolved = CopilotIntent(raw_intent)
            log_info(
                f"Copilot intent classified: raw={raw_intent!r} "
                f"resolved={resolved.value}"
            )
            return resolved
        except ValueError, Exception:
            log_info(
                f"Copilot intent fallback: raw={raw_intent!r} "
                f"resolved={CopilotIntent.GENERAL_QA.value} (unparseable)"
            )
            return CopilotIntent.GENERAL_QA

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

        intent = await cls._classify_intent(user_message, history, model, api_key)
        playbook = SKILL_PLAYBOOKS[intent]
        log_info(f"Copilot targeted skill route: {intent.value}")

        # Collects a prepared (but unexecuted) write to surface to the client.
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
            f"Copilot tool filter: {intent.value} "
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
                text=_strip_thinking(final.choices[0].message.content or ""),
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
