from typing import Any, Literal, cast

import jwt
from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel, Field
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info

from src.config import config
from src.dependencies import get_db_collections, get_user_context
from src.dependencies.cerbos_authz_dependencies import get_cerbos_authz_service
from src.errors import NotAuthorizedError, handle_routes_errors
from src.integrations.authorization.cerbos_authz_service import (
    CerbosAuthzService,
)
from src.rate_limiter import limiter
from src.security.copilot_action_token import (
    compute_args_hash,
    verify_action_token,
)
from src.security.user_context import UserContext
from src.services.copilot_agent import CopilotAgentService

router = APIRouter()


_MAX_MESSAGE_CHARS = 8000
_MAX_HISTORY_TURNS = 20


class ChatMessage(BaseModel):
    """A single prior turn supplied by the client.

    ``role`` is intentionally restricted to ``user``/``assistant`` so callers
    can never inject ``system``/``tool`` turns that would override the copilot's
    guardrails (prompt-injection defense).
    """

    role: Literal["user", "assistant"]
    content: str = Field(max_length=_MAX_MESSAGE_CHARS)


class AgentChatInbound(BaseModel):
    message: str = Field(max_length=_MAX_MESSAGE_CHARS)
    history: list[ChatMessage] = Field(
        default_factory=list, max_length=_MAX_HISTORY_TURNS
    )
    team_id: str | None = None
    schedule_id: str | None = None


class PendingActionDTO(BaseModel):
    """A prepared write action awaiting the user's explicit confirmation.

    ``action_token`` is a short-lived signed JWT binding the approving user,
    the tool name, and a hash of ``tool_args``. It must be passed back to
    ``/copilot/actions/confirm`` to execute the change.
    """

    action_token: str
    tier: Literal["update", "delete"]
    tool_name: str
    tool_args: dict[str, Any]
    preview: dict[str, Any]
    step: int | None = None


class PlanStepDTO(BaseModel):
    step: int
    tool: str
    args: dict[str, Any] = Field(default_factory=dict)
    assign_output_to: str | None = None
    extract_key: str | None = None
    description: str


class PlanDTO(BaseModel):
    complexity: str
    summary: str
    plan: list[PlanStepDTO]


class CompletedStepDTO(BaseModel):
    step: int
    status: str
    error_message: str | None = None


class AgentChatOutbound(BaseModel):
    response: str
    pending_action: PendingActionDTO | None = None
    execution_mode: str = "react"
    plan: PlanDTO | None = None
    completed_steps: list[CompletedStepDTO] = Field(default_factory=list)
    pending_actions: list[PendingActionDTO] = Field(default_factory=list)


class ConfirmActionInbound(BaseModel):
    action_token: str = Field(max_length=_MAX_MESSAGE_CHARS)
    tool_name: str = Field(max_length=200)
    tool_args: dict[str, Any] = Field(default_factory=dict)
    step: int | None = Field(
        None,
        description="Plan step number being confirmed. Used by Pure Replay to "
        "identify the correct step when multiple steps share the same tool name.",
    )
    user_message: str | None = Field(
        None,
        max_length=_MAX_MESSAGE_CHARS,
        description="Original user message for Pure Replay plan continuation.",
    )
    history: list[ChatMessage] = Field(
        default_factory=list,
        max_length=_MAX_HISTORY_TURNS,
        description="Original conversation history for Pure Replay plan continuation.",
    )
    team_id: str | None = None
    schedule_id: str | None = None


class ConfirmActionOutbound(BaseModel):
    status: str
    message: str
    execution_mode: str = "react"
    plan: PlanDTO | None = None
    completed_steps: list[CompletedStepDTO] = Field(default_factory=list)
    pending_actions: list[PendingActionDTO] = Field(default_factory=list)
    pending_action: PendingActionDTO | None = None


def _build_agent_chat_outbound(result) -> AgentChatOutbound:
    """Map an AgentResult to the API response DTO."""
    pending = None
    if result.pending_action is not None:
        pa = result.pending_action
        pending = PendingActionDTO(
            action_token=pa.action_token,
            tier=cast(Literal["update", "delete"], pa.tier),
            tool_name=pa.tool_name,
            tool_args=pa.tool_args,
            preview=pa.preview,
            step=pa.step,
        )

    plan_dto = None
    if result.plan is not None:
        plan_dto = PlanDTO(
            complexity=result.plan.complexity,
            summary=result.plan.summary,
            plan=[
                PlanStepDTO(
                    step=s.step,
                    tool=s.tool,
                    args=s.args,
                    assign_output_to=s.assign_output_to,
                    extract_key=s.extract_key,
                    description=s.description,
                )
                for s in result.plan.plan
            ],
        )

    return AgentChatOutbound(
        response=result.text,
        pending_action=pending,
        execution_mode=result.execution_mode,
        plan=plan_dto,
        completed_steps=[
            CompletedStepDTO(
                step=s["step"],
                status=s["status"],
                error_message=s.get("error_message"),
            )
            for s in result.completed_steps
        ],
        pending_actions=[
            PendingActionDTO(
                action_token=pa["action_token"],
                tier=cast(Literal["update", "delete"], pa["tier"]),
                tool_name=pa["tool_name"],
                tool_args=pa["tool_args"],
                preview=pa["preview"],
                step=pa.get("step"),
            )
            for pa in result.pending_actions
        ],
    )


@router.post(
    "/copilot/chat",
    status_code=status.HTTP_200_OK,
    response_model=AgentChatOutbound,
)
@limiter.limit(lambda: config.ai_chat_rate_limit)
async def handle_agent_chat(
    request: Request,
    payload: AgentChatInbound,
    user_context: UserContext = Depends(get_user_context),
    db_collections: DatabaseCollections = Depends(get_db_collections),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> AgentChatOutbound:
    """Run the AI copilot orchestration loop for a manager's chat message."""
    try:
        log_info(f"Copilot chat request from user {user_context.user_id}")
        result = await CopilotAgentService.run_agent_loop(
            user_message=payload.message,
            user_context=user_context,
            db=db_collections,
            cerbos=authz,
            history=[turn.model_dump() for turn in payload.history],
            team_id=payload.team_id,
            schedule_id=payload.schedule_id,
        )
    except Exception as e:
        handle_routes_errors(e)

    return _build_agent_chat_outbound(result)


@router.post(
    "/copilot/actions/confirm",
    status_code=status.HTTP_200_OK,
    response_model=ConfirmActionOutbound,
)
@limiter.limit(lambda: config.ai_chat_rate_limit)
async def confirm_copilot_action(
    request: Request,
    payload: ConfirmActionInbound,
    user_context: UserContext = Depends(get_user_context),
    db_collections: DatabaseCollections = Depends(get_db_collections),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> ConfirmActionOutbound:
    """Execute a previously previewed copilot write after verifying its token.

    Trust boundary: the signed action token is the sole authority to run these
    arguments. We reject any request where the token is invalid/expired, was
    issued to a different user, or whose ``tool_name``/``tool_args`` do not
    reproduce the signed hash (defends against in-flight argument tampering).

    When ``user_message`` is provided, the Pure Replay protocol is used:
    the backend re-plans and re-executes all read-side steps deterministically,
    executes the confirmed step in ``execute`` mode, then continues with
    remaining plan steps. The client never sends ``execution_memory`` or
    ``plan`` — the server reconstructs both.
    """
    try:
        try:
            claims = verify_action_token(
                payload.action_token, config.copilot_action_jwt_secret
            )
        except (jwt.InvalidTokenError, jwt.ExpiredSignatureError) as e:
            raise NotAuthorizedError(
                "This confirmation has expired or is invalid. Please ask again."
            ) from e

        if claims.get("sub") != user_context.user_id:
            raise NotAuthorizedError("This confirmation does not belong to you.")

        if claims.get("tool") != payload.tool_name:
            raise NotAuthorizedError("Confirmation does not match the action.")

        if claims.get("args_hash") != compute_args_hash(payload.tool_args):
            raise NotAuthorizedError(
                "The action details were altered and cannot be confirmed."
            )

        log_info(
            f"Copilot action confirm: user={user_context.user_id} "
            f"tool={payload.tool_name}"
        )

        if payload.user_message:
            history = (
                [turn.model_dump() for turn in payload.history]
                if payload.history
                else None
            )
            plan_result = await CopilotAgentService.confirm_plan_step(
                tool_name=payload.tool_name,
                tool_args=payload.tool_args,
                confirmed_step=payload.step,
                user_message=payload.user_message,
                history=history,
                user_context=user_context,
                db=db_collections,
                cerbos=authz,
                team_id=payload.team_id,
                schedule_id=payload.schedule_id,
            )

            plan_dto = None
            if plan_result.plan is not None:
                plan_dto = PlanDTO(
                    complexity=plan_result.plan.complexity,
                    summary=plan_result.plan.summary,
                    plan=[
                        PlanStepDTO(
                            step=s.step,
                            tool=s.tool,
                            args=s.args,
                            assign_output_to=s.assign_output_to,
                            extract_key=s.extract_key,
                            description=s.description,
                        )
                        for s in plan_result.plan.plan
                    ],
                )

            pending_action_dto = None
            if plan_result.pending_action is not None:
                pa = plan_result.pending_action
                pending_action_dto = PendingActionDTO(
                    action_token=pa.action_token,
                    tier=cast(Literal["update", "delete"], pa.tier),
                    tool_name=pa.tool_name,
                    tool_args=pa.tool_args,
                    preview=pa.preview,
                    step=pa.step,
                )

            return ConfirmActionOutbound(
                status="success",
                message=plan_result.text,
                execution_mode="plan_and_execute",
                plan=plan_dto,
                completed_steps=[
                    CompletedStepDTO(
                        step=s["step"],
                        status=s["status"],
                        error_message=s.get("error_message"),
                    )
                    for s in plan_result.completed_steps
                ],
                pending_actions=[
                    PendingActionDTO(
                        action_token=pa["action_token"],
                        tier=cast(Literal["update", "delete"], pa["tier"]),
                        tool_name=pa["tool_name"],
                        tool_args=pa["tool_args"],
                        preview=pa["preview"],
                        step=pa.get("step"),
                    )
                    for pa in plan_result.pending_actions
                ],
                pending_action=pending_action_dto,
            )

        result = await CopilotAgentService.confirm_action(
            tool_name=payload.tool_name,
            tool_args=payload.tool_args,
            user_context=user_context,
            db=db_collections,
            cerbos=authz,
        )
    except Exception as e:
        handle_routes_errors(e)

    return ConfirmActionOutbound(
        status=result.get("status", "error"),
        message=result.get("message", ""),
    )
