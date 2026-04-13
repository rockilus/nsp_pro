from fastapi import APIRouter, Depends
from shared.logger import log_info
from shared.schemas.core import Attribute
from shared.schemas.dto import AttributeDTO

from src.dependencies import get_attribute_service, get_user_context
from src.dependencies.cerbos_authz_dependencies import get_cerbos_authz_service
from src.errors import NotAuthorizedError, handle_routes_errors
from src.integrations.authorization.cerbos_authz_service import (
    CerbosAuthzService,
)
from src.security.user_context import UserContext
from src.services.attribute_service import AttributeService

router = APIRouter()


@router.put("/attributes/teams/{team_id}")
async def update_attribute(
    team_id: str,
    attribute: AttributeDTO,
    user_context: UserContext = Depends(get_user_context),
    attribute_service: AttributeService = Depends(get_attribute_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> AttributeDTO:
    try:
        if not await authz.check(
            user_context.user_id, "update-attribute", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to update attributes")
        sp_data = Attribute.from_dto(attribute)
        new_sp = attribute_service.create_or_update_attribute(sp_data)
        response = new_sp.to_dto()
    except Exception as e:
        log_info("Failed to update attribute")
        handle_routes_errors(e)
    return response
