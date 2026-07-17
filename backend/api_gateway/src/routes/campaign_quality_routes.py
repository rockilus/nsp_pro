from typing import Optional

from fastapi import APIRouter, Depends
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info
from shared.schemas.dto.campaign_quality import CampaignQualityDTO

from src.dependencies import get_db_collections, get_user_context
from src.dependencies.campaign_quality_service import get_campaign_quality_service
from src.dependencies.cerbos_authz_dependencies import get_cerbos_authz_service
from src.errors import NotAuthorizedError, handle_routes_errors
from src.integrations.authorization.cerbos_authz_service import CerbosAuthzService
from src.security.user_context import UserContext
from src.services.campaign_quality_service import CampaignQualityService

router = APIRouter()


@router.get("/campaign-quality/teams/{team_id}")
async def get_campaign_quality(
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    db_collections: DatabaseCollections = Depends(get_db_collections),
    quality_service: CampaignQualityService = Depends(get_campaign_quality_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> Optional[CampaignQualityDTO]:
    try:
        if not await authz.check(
            user_context.user_id, "read-campaign-quality", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to read campaign quality",
            )
        response = quality_service.build_campaign_quality(team_id)
    except Exception as e:
        log_info("Failed to get campaign quality")
        handle_routes_errors(e)
    return response
