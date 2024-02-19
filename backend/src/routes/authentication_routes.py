from fastapi import APIRouter, Depends
from supertokens_python.recipe.multitenancy.asyncio import list_all_tenants
from supertokens_python.recipe.session import SessionContainer
from supertokens_python.recipe.session.framework.fastapi import verify_session


router = APIRouter()


@router.get("/sessioninfo")
async def secure_api(s: SessionContainer = Depends(verify_session())):
    return {
        "sessionHandle": s.get_handle(),
        "userId": s.get_user_id(),
        "accessTokenPayload": s.get_access_token_payload(),
    }


@router.get("/tenants")
async def get_tenants():
    tenantReponse = await list_all_tenants()

    tenantsList = []

    for tenant in tenantReponse.tenants:
        tenantsList.append(tenant.to_json())

    return {
        "status": "OK",
        "tenants": tenantsList,
    }
