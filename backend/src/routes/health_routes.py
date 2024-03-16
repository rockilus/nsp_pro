from fastapi import APIRouter, status

from routes.api_model import HealthCheck

router = APIRouter()


# pylint: disable=unused-argument
@router.get("/health")
async def health_check(status_code=status.HTTP_200_OK) -> HealthCheck:
    return HealthCheck(status="ok")
