from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info

from src.config import config
from src.dependencies import get_db_collections, get_user_context
from src.dependencies.cerbos_authz_dependencies import get_cerbos_authz_service
from src.errors import handle_routes_errors
from src.integrations.authorization.cerbos_authz_service import (
    CerbosAuthzService,
)
from src.rate_limiter import limiter
from src.security.user_context import UserContext
from src.services.copilot_agent import CopilotAgentService

router = APIRouter()


class AgentChatInbound(BaseModel):
    message: str


class AgentChatOutbound(BaseModel):
    response: str


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
        response = await CopilotAgentService.run_agent_loop(
            user_message=payload.message,
            user_context=user_context,
            db=db_collections,
            cerbos=authz,
        )
    except Exception as e:
        handle_routes_errors(e)

    return AgentChatOutbound(response=response)
