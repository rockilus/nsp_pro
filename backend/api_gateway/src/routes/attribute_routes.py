from fastapi import APIRouter, Depends
from shared.logger import log_info
from shared.schemas.core import Attribute
from shared.schemas.dto import AttributeDTO

from src.dependencies import get_attribute_service
from src.errors import NotAuthorizedError, handle_routes_errors
from src.integrations.authentication import (
    SessionContainerType,
    authn_verify_session,
)
from src.integrations.authorization import authz_check
from src.services.attribute_service import AttributeService

router = APIRouter()


@router.put("/attributes/teams/{team_id}")
async def update_attribute(
    team_id: str,
    attribute: AttributeDTO,
    session: SessionContainerType = Depends(authn_verify_session()),
    attribute_service: AttributeService = Depends(get_attribute_service),
) -> AttributeDTO:
    try:
        if not await authz_check(
            session.get_user_id(), "update-attribute", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to update attributes")
        sp_data = Attribute.from_dto(attribute)
        new_sp = attribute_service.create_or_update_attribute(sp_data)
        response = new_sp.to_dto()
    except Exception as e:
        log_info("Failed to update attribute")
        handle_routes_errors(e)
    return response
