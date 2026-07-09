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
from typing import Any

from litellm import acompletion
from pydantic import BaseModel
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_error, log_info

from src.config import config
from src.errors.copilot_errors.copilot_errors import CopilotDisabledError
from src.integrations.authorization.cerbos_authz_service import (
    CerbosAuthzService,
)
from src.mcp.tools.registry import TOOL_REGISTRY, get_tool_manifests
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
    "French, or Spanish)."
)

_MAX_TOOL_ITERATIONS = 5


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
            item.model_dump(mode="json") if isinstance(item, BaseModel) else item
            for item in output
        ]
    elif isinstance(output, BaseModel):
        payload = output.model_dump(mode="json")
    else:
        payload = output

    return json.dumps(payload, default=_default)


def _build_context_message(
    team_id: str | None, schedule_id: str | None
) -> dict[str, Any] | None:
    """Build a server-authored context turn from the active page state.

    Injected as a ``system`` message so the model reliably targets the right
    entities without the user typing technical identifiers. Returns ``None``
    when no context is available so the prompt stays clean.
    """
    parts: list[str] = []
    if team_id:
        parts.append(f"team_id={team_id}")
    if schedule_id:
        parts.append(f"schedule_id={schedule_id}")
    if not parts:
        return None
    return {
        "role": "system",
        "content": (
            "Active context from the user's current screen: "
            + ", ".join(parts)
            + ". Use these identifiers when calling tools unless the user "
            "explicitly refers to a different team or schedule."
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
    ) -> str:
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

        Raises:
            CopilotDisabledError: If the AI feature is disabled.
        """
        if not config.ai_enabled:
            raise CopilotDisabledError("The AI copilot feature is disabled")

        model = config.ai_model
        api_key = _resolve_api_key(model)
        log_info(f"Copilot loop started: user={user_context.user_id} model={model}")

        messages: list[dict[str, Any]] = [
            {"role": "system", "content": _SYSTEM_PROMPT},
        ]
        context_message = _build_context_message(team_id, schedule_id)
        if context_message is not None:
            messages.append(context_message)
        if history:
            messages.extend(
                {"role": turn["role"], "content": turn["content"]} for turn in history
            )
        messages.append(
            {
                "role": "user",
                "content": (
                    "Analyze this request inside the data boundary rules:\n"
                    f"<user_query>{user_message}</user_query>"
                ),
            }
        )

        manifests = get_tool_manifests()

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
                    return response_message.content or ""

                messages.append(response_message.model_dump())

                for tool_call in tool_calls:
                    await cls._execute_tool_call(
                        tool_call=tool_call,
                        messages=messages,
                        user_context=user_context,
                        db=db,
                        cerbos=cerbos,
                    )

            # Tool budget exhausted: request a final synthesis without tools.
            final = await acompletion(
                model=model,
                messages=messages,
                temperature=0.0,
                api_key=api_key,
            )
            return final.choices[0].message.content or ""

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
    ) -> None:
        """Run a single tool call locally and append its result to messages."""
        function_name = tool_call.function.name
        spec = TOOL_REGISTRY.get(function_name)

        if spec is None:
            output: Any = {"error": f"Unknown tool: {function_name}"}
        else:
            try:
                args = json.loads(tool_call.function.arguments or "{}")
            except json.JSONDecodeError:
                args = {}
            log_info(f"Copilot executing tool={function_name} args={args}")
            output = await spec.executor(
                db=db,
                user_context=user_context,
                cerbos=cerbos,
                **args,
            )

        messages.append(
            {
                "role": "tool",
                "tool_call_id": tool_call.id,
                "name": function_name,
                "content": _serialize_tool_output(output),
            }
        )
