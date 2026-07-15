"""Planner sub-agent for the Plan-and-Execute copilot pipeline.

Generates a static ``ExecutionPlan`` JSON DAG from a natural-language request.
The Planner is a single-turn, *no-tools* LiteLLM call constrained to output
only valid ``ExecutionPlan`` JSON. It never executes tools.
"""

import json
from typing import Any

from litellm import acompletion
from pydantic import ValidationError
from shared.logger import log_error, log_info

from src.mcp_server.schemas.copilot_plan_schemas import ExecutionPlan
from src.mcp_server.tools.registry import (
    TOOL_REGISTRY,
    ToolChannel,
)

_MAX_PLANNER_RETRIES = 2


def _build_planner_system_prompt() -> str:
    """Build the Planner's system prompt dynamically from the tool registry.

    Every tool's input parameters and output schema are described so the
    Planner knows what ``$VARIABLE`` names it can assign and which keys to
    extract.
    """
    lines: list[str] = [
        "You are a pipeline planner for a workforce management system.",
        "You output ONLY valid JSON matching the ExecutionPlan schema below.",
        "You do NOT execute tools — you only describe them in sequential steps.",
        "",
        "RULES:",
        "1. Every step references a tool by its exact name.",
        "2. When a step produces a value needed by later steps, assign it to",
        "   a $VARIABLE with assign_output_to (e.g. $TARGET_DATE).",
        "3. Set extract_key to the top-level dict key to extract from the",
        "   tool's output (e.g. 'calculated_date', 'worker_id').",
        "4. Reference $VARIABLEs in later step args as string values:",
        '   {"worker_id": "$LOGAN_ID", "employment_end_date": "$TARGET_DATE"}',
        "5. Place read-side resolution steps BEFORE write steps.",
        "6. Every required arg must be present or use a $VARIABLE from a",
        "   prior step.",
        "7. generate a concise human-readable description for each step.",
        "8. Use resolve_worker_reference to resolve worker names to IDs —",
        "   never use get_team_members for single-worker lookup.",
        "9. Use calculate_relative_date for ALL relative date expressions.",
        "10. CRITICAL: Most required fields now have sensible defaults "
        "(e.g. 35 for hours, today for employment_start_date). If a required "
        "field has no explicit user input, include it with its default value "
        "rather than omitting it. Omitting a required field causes the entire "
        "plan to fail.",
        "",
        "OUTPUT SCHEMA (JSON only, no markdown, no code fences):",
        "{",
        '  "complexity": "high",',
        '  "summary": "One-line human-readable plan description",',
        '  "plan": [',
        "    {",
        '      "step": 1,',
        '      "tool": "tool_name",',
        '      "args": {"param": "value"},',
        '      "assign_output_to": "$VAR",',
        '      "extract_key": "output_field",',
        '      "description": "What this step does"',
        "    }",
        "  ]",
        "}",
        "",
        "AVAILABLE TOOLS:",
        "",
    ]

    for spec in TOOL_REGISTRY.values():
        if ToolChannel.COPILOT not in spec.channels:
            continue
        lines.append(f"--- {spec.name} ---")
        lines.append(f"Description: {spec.manifest['function']['description']}")

        params = spec.manifest["function"]["parameters"]
        required_fields = params.get("required", [])
        properties = params.get("properties", {})
        if properties:
            lines.append("Input parameters:")
            for key, prop in properties.items():
                req = "required" if key in required_fields else "optional"
                lines.append(f"  - {key} ({req}): {prop.get('description', '')}")

        if spec.output_schema:
            lines.append("Output fields (usable for $VARIABLE binding):")
            for field in spec.output_schema:
                bindable = "assignable" if field.extractable else "display-only"
                lines.append(
                    f"  - {field.key} ({field.type_}, {bindable}): {field.description}"
                )
        lines.append("")

    return "\n".join(lines)


async def _call_planner(
    user_message: str,
    history: list[dict[str, Any]] | None,
    model: str,
    api_key: str | None,
    context_message: dict[str, Any],
    error_context: str | None = None,
) -> ExecutionPlan:
    """Call the Planner LLM and return a validated ExecutionPlan.

    When ``error_context`` is provided (from a prior execution failure), it
    is injected as a system message before the user message so the planner
    can correct the arguments that caused the failure.
    """
    system_prompt = _build_planner_system_prompt()

    messages: list[dict[str, Any]] = [
        {"role": "system", "content": system_prompt},
    ]
    if history:
        messages.extend(
            {"role": turn["role"], "content": turn["content"]} for turn in history[-4:]
        )
    messages.append(context_message)
    if error_context:
        messages.append(
            {
                "role": "system",
                "content": (
                    f"Your previous plan failed during execution:\n\n"
                    f"{error_context}\n\n"
                    "Please correct the arguments and regenerate a valid plan. "
                    "Pay special attention to required fields and argument types."
                ),
            }
        )
    messages.append(
        {
            "role": "user",
            "content": f"<raw_user_message>{user_message}</raw_user_message>",
        }
    )

    last_error: str | None = None
    for attempt in range(1, _MAX_PLANNER_RETRIES + 2):
        if last_error and attempt > 1:
            messages.append(
                {
                    "role": "system",
                    "content": (
                        f"Your previous plan was invalid: {last_error}\n"
                        "Output a corrected JSON plan matching the schema exactly."
                    ),
                }
            )

        response = await acompletion(
            model=model,
            messages=messages,
            temperature=0.0,
            api_key=api_key,
        )
        raw = response.choices[0].message.content.strip()

        if raw.startswith("```"):
            lines_split = raw.split("\n")
            if lines_split[0].startswith("```"):
                lines_split = lines_split[1:]
            if lines_split[-1].startswith("```"):
                lines_split = lines_split[:-1]
            raw = "\n".join(lines_split).strip()

        try:
            parsed = json.loads(raw)
            plan = ExecutionPlan.model_validate(parsed)
            log_info(
                f"Planner generated valid plan: {len(plan.plan)} steps "
                f"(attempt {attempt})"
            )
            return plan
        except (json.JSONDecodeError, ValidationError) as e:
            last_error = str(e)
            log_error(f"Planner validation failed (attempt {attempt}): {last_error}")

    raise ValueError(
        f"Planner failed to produce a valid plan after "
        f"{_MAX_PLANNER_RETRIES + 1} attempts: {last_error}"
    )
