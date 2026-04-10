from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.integrations.authorization.cerbos_authz_service import (  # noqa: E501
    CerbosAuthzService,
)
from src.integrations.authorization.cerbos_client import get_cerbos_client


async def get_cerbos_authz_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> CerbosAuthzService:
    return CerbosAuthzService(
        client=get_cerbos_client(),
        user_db=db_collections.user_db,
        team_membership_db=db_collections.team_membership_db,
    )
