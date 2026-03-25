"""Routes for in-app notifications."""

from typing import Dict

from fastapi import APIRouter, Depends, HTTPException
from shared.schemas.core.notification import NotificationDTO

from src.dependencies import get_user_context
from src.dependencies.notification_service import get_notification_service
from src.errors import handle_routes_errors
from src.security.user_context import UserContext
from src.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/me")
async def get_my_notifications(
    limit: int = 20,
    skip: int = 0,
    user_context: UserContext = Depends(get_user_context),
    notification_service: NotificationService = Depends(get_notification_service),
) -> Dict:
    """Return paginated notifications and unread count for the current user."""
    try:
        result = notification_service.get_user_notifications(
            user_context.effective_user_id, limit=limit, skip=skip
        )
        return {
            "notifications": [
                n.to_dto().model_dump(by_alias=True) for n in result["notifications"]
            ],
            "unreadCount": result["unread_count"],
        }
    except Exception as e:
        handle_routes_errors(e)


@router.get("/me/unread-count")
async def get_unread_count(
    user_context: UserContext = Depends(get_user_context),
    notification_service: NotificationService = Depends(get_notification_service),
) -> Dict:
    """Lightweight endpoint polled by the bell badge every 30 s."""
    try:
        count = notification_service.get_unread_count(user_context.effective_user_id)
        return {"count": count}
    except Exception as e:
        handle_routes_errors(e)


@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    user_context: UserContext = Depends(get_user_context),
    notification_service: NotificationService = Depends(get_notification_service),
) -> NotificationDTO:
    """Mark a single notification as read."""
    try:
        notification = notification_service.mark_read(
            notification_id, user_context.effective_user_id
        )
        if notification is None:
            raise HTTPException(status_code=404, detail="Notification not found")
        return notification.to_dto()
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e)) from e
    except HTTPException:
        raise
    except Exception as e:
        handle_routes_errors(e)


@router.post("/me/read-all")
async def mark_all_notifications_read(
    user_context: UserContext = Depends(get_user_context),
    notification_service: NotificationService = Depends(get_notification_service),
) -> Dict:
    """Mark all notifications for the current user as read."""
    try:
        notification_service.mark_all_read(user_context.effective_user_id)
        return {"status": "ok"}
    except Exception as e:
        handle_routes_errors(e)


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    user_context: UserContext = Depends(get_user_context),
    notification_service: NotificationService = Depends(get_notification_service),
) -> Dict:
    """Delete a notification owned by the current user."""
    try:
        deleted = notification_service.delete(
            notification_id, user_context.effective_user_id
        )
        if not deleted:
            raise HTTPException(status_code=404, detail="Notification not found")
        return {"status": "ok"}
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e)) from e
    except HTTPException:
        raise
    except Exception as e:
        handle_routes_errors(e)
