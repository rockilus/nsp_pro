from typing import List

from fastapi import APIRouter, Depends
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info
from shared.schemas.dto import TemplateDTO
from shared.schemas.errors import UserNotFoundError

from src.dependencies import (
    get_data_fetching_service,
    get_db_collections,
    get_user_context,
)
from src.errors import (
    NotAuthorizedError,
    handle_routes_errors,
)
from src.integrations.authorization import authz_check
from src.security.user_context import UserContext
from src.services.data_fetching_service import DataFetchingService
from src.utils.constraint_utils import build_templates

router = APIRouter()


# pylint: disable=too-many-locals
@router.get("/constraint-templates/teams/{team_id}")
async def get_constraint_templates(
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    db_collections: DatabaseCollections = Depends(get_db_collections),
    data_fetching_service: DataFetchingService = Depends(get_data_fetching_service),
) -> List[TemplateDTO]:
    try:
        user_id = user_context.user_id
        if not await authz_check(user_id, "read-constraint-templates", "team", team_id):
            raise NotAuthorizedError(
                "You do not have permission to get constraint templates"
            )
        user = db_collections.user_db.get_user_by_id(user_id)
        if user is None:
            raise UserNotFoundError(f"User with id {user_id} not found")
        # pylint: disable=R0801
        (workers, shifts, dimensions, dim_entries, attributes, specialties) = (
            # fmt: off
            data_fetching_service.fetch_workers_not_d_shifts_not_d_dim_not_d_attributes_spes(
                team_id
            )
            # fmt: on
        )
        templates = build_templates(
            workers,
            shifts,
            dimensions,
            dim_entries,
            attributes,
            specialties,
            user.language,
        )
        response = [ct.to_dto() for ct in templates]
    except Exception as e:
        log_info("Failed to get constraint templates")
        handle_routes_errors(e)
    return response
