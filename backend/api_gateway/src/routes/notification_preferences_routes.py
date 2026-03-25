"""Routes for notification preferences."""

from fastapi import APIRouter, Depends
from shared.schemas.core.notification_preferences import (
    NotificationPreferences,
    NotificationPreferencesDTO,
)

from src.dependencies import get_user_context
from src.dependencies.notification_preferences_service import (
    get_notification_preferences_service,
)
from src.errors import handle_routes_errors
from src.security.user_context import UserContext
from src.services.notification_preferences_service import (
    NotificationPreferencesService,
)

router = APIRouter(tags=["notification-preferences"])


@router.get("/users/me/notification-preferences")
async def get_notification_preferences(
    user_context: UserContext = Depends(get_user_context),
    prefs_service: NotificationPreferencesService = Depends(
        get_notification_preferences_service
    ),
) -> NotificationPreferencesDTO:
    """
    Return notification preferences for the current user (creates defaults on
    first access).
    """
    try:
        prefs = prefs_service.get_or_create(user_context.effective_user_id)
        return prefs.to_dto()
    except Exception as e:
        handle_routes_errors(e)


@router.put("/users/me/notification-preferences")
async def update_notification_preferences(
    prefs_dto: NotificationPreferencesDTO,
    user_context: UserContext = Depends(get_user_context),
    prefs_service: NotificationPreferencesService = Depends(
        get_notification_preferences_service
    ),
) -> NotificationPreferencesDTO:
    """Update notification preferences for the current user."""
    try:
        core_prefs = NotificationPreferences.from_dto(prefs_dto)
        core_prefs.user_id = user_context.effective_user_id
        updated = prefs_service.update(
            user_context.effective_user_id, core_prefs
        )
        return updated.to_dto()
    except Exception as e:
        handle_routes_errors(e)
