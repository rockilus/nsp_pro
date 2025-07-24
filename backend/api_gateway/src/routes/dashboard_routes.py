# from typing import Dict, List

from fastapi import APIRouter

# from fastapi import APIRouter, Depends, HTTPException, Request
# from fastapi.responses import JSONResponse
# from shared.database.database_collections import DatabaseCollections
# from shared.logger import log_info
# from shared.schemas.core import UserDashboard
# from shared.schemas.dto.user import UserDashboardDTO

# from src.dependencies import get_db_collections, get_user_service
# from src.errors import (
#     NotAuthorizedError,
#     handle_routes_errors,
# )
# from src.security.user_context import UserContext
# from src.dependencies import get_user_context
# from src.integrations.authentication import (
#     authn_delete_user,
#     authn_get_all_users,
#     authn_get_user,
#     authn_impersonate_user,
#     authn_restore_admin_session,
# )
# from src.integrations.authorization import (
#     authz_check,
#     authz_delete_user,
#     authz_get_all_users,
#     authz_get_user,
# )
# from src.services.user_service import UserService
# from src.utils.user_utils import build_user_dashboard

router = APIRouter()


# @router.get("/admin-dashboard/check-authz")
# async def check_dashboard_authz(
#     user_context: UserContext = Depends(get_user_context),
# ) -> Dict:
#     user_id = user_context.user_id
#     if not await authz_check(user_id, "read-dashboard", "admin"):
#         raise NotAuthorizedError(
#             "You do not have permission to view the dashboard"
#         )
#     return {"message": "You have permission to view the dashboard"}


# @router.get("/admin-dashboard/users")
# async def get_users(
#     user_context: UserContext = Depends(get_user_context),
#     db_collections: DatabaseCollections = Depends(get_db_collections),
# ) -> List[UserDashboardDTO]:
#     try:
#         user_id = user_context.user_id
#         if not await authz_check(user_id, "read-users", "admin"):
#             raise NotAuthorizedError(
#                 "You do not have permission to read users"
#             )
#         users = db_collections.user_db.get_users()
#         users_authn = await authn_get_all_users()
#         users_authz = await authz_get_all_users()
#         users_dashboard = build_user_dashboard(users, users_authn, users_authz)
#         response = [ud.to_dto() for ud in users_dashboard]
#     except Exception as e:
#         log_info("Failed to get users dashboard")
#         handle_routes_errors(e)
#     return response


# @router.get("/admin-dashboard/users/{target_user_id}")
# async def get_user(
#     target_user_id: str,
#     user_context: UserContext = Depends(get_user_context),
#     db_collections: DatabaseCollections = Depends(get_db_collections),
# ) -> UserDashboardDTO:
#     try:
#         user_id = user_context.user_id
#         if not await authz_check(user_id, "read-user", "admin"):
#             raise NotAuthorizedError(
#                 "You do not have permission to read a user"
#             )
#         user = db_collections.user_db.get_user_by_id(target_user_id)
#         user_authn = await authn_get_user(target_user_id)
#         user_authz = await authz_get_user(target_user_id)
#         user_dashboard = UserDashboard(
#             user=user, user_authn=user_authn, user_authz=user_authz
#         )
#         response = user_dashboard.to_dto()
#     except Exception as e:
#         log_info("Failed to get user dashboard")
#         handle_routes_errors(e)
#     return response


# @router.post("/admin-dashboard/impersonate")
# async def impersonate(
#     request: Request,
#     user_context: UserContext = Depends(get_user_context),
#     user_service: UserService = Depends(get_user_service),
# ) -> JSONResponse:
#     user_id = user_context.user_id
#     if not await authz_check(user_id, "create-impersonation", "admin"):
#         raise NotAuthorizedError(
#             "You do not have permission to impersonate users"
#         )
#     data = await request.json()
#     target_user_id = data.get("user_id", None)
#     if not target_user_id:
#         raise HTTPException(status_code=400, detail="User ID is required")
#     await user_context.revoke_session()
#     await authn_impersonate_user(request, target_user_id, user_id)
#     user_service.update_user_impersonating_user_id(user_id, target_user_id)
#     return JSONResponse({"message": "Impersonation complete!"})


# @router.post("/admin-dashboard/restore-session")
# async def restore_admin_session(
#     request: Request,
#     user_context: UserContext = Depends(get_user_context),
#     db_collections: DatabaseCollections = Depends(get_db_collections),
#     user_service: UserService = Depends(get_user_service),
# ) -> Dict:
#     user_id = user_context.user_id
#     access_token_payload = user_context.get_access_token_payload()
#     # Check if this is an impersonated session
#     if not access_token_payload.get("isImpersonation"):
#         raise HTTPException(
#             status_code=400,
#             detail="You do not have permission to restore the admin session",
#         )
#     # Get the admin's user ID from the access token payload
#     admin_user_id = access_token_payload.get("adminUserId", None)
#     if not admin_user_id:
#         raise HTTPException(
#             status_code=400,
#             detail="You do not have permission to restore the admin session",
#         )
#     if not await authz_check(admin_user_id, "delete-impersonation", "admin"):
#         raise NotAuthorizedError(
#             "You do not have permission to restore the admin session"
#         )
#     admin_user = db_collections.user_db.get_user_by_id(admin_user_id)
#     if not admin_user:
#         raise HTTPException(status_code=400, detail="Admin user not found")
#     if admin_user.impersonating_user_id != user_id:
#         raise HTTPException(
#             status_code=400,
#             detail="You do not have permission to restore the admin session",
#         )
#     # Revoke the current impersonated session
#     await user_context.revoke_session()
#     await authn_restore_admin_session(request, admin_user_id)
#     user_service.update_user_impersonating_user_id(admin_user_id, None)
#     return {"message": "Admin session restored"}


# @router.delete("/admin-dashboard/users/{target_user_id}")
# async def delete_user(
#     target_user_id: str,
#     user_context: UserContext = Depends(get_user_context),
#     db_collections: DatabaseCollections = Depends(get_db_collections),
# ) -> Dict:
#     try:
#         user_id = user_context.user_id
#         if not await authz_check(user_id, "delete-user", "admin"):
#             raise NotAuthorizedError(
#                 "You do not have permission to delete users"
#             )
#         user = db_collections.user_db.get_user_by_id(target_user_id)
#         if user:
#             raise HTTPException(
#                 status_code=400, detail="User can't be deleted"
#             )
#         user_authn = await authn_get_user(target_user_id)
#         if user_authn:
#             await authn_delete_user(target_user_id)
#         user_authz = await authz_get_user(target_user_id)
#         if user_authz:
#             await authz_delete_user(target_user_id)
#     except Exception as e:
#         log_info("Failed to get users dashboard")
#         handle_routes_errors(e)
#     return {"message": "User deleted"}
