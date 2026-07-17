from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.services.campaign_quality_service import CampaignQualityService


def get_campaign_quality_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> CampaignQualityService:
    return CampaignQualityService(db_collections)
