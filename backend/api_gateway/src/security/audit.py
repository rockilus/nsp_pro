"""
Audit logging for impersonation sessions.

Every action taken while admin impersonation is active should produce a
structured audit record so the full chain of accountability is preserved:
  - who the real acting admin is
  - who they were impersonating
  - what action was performed
  - when it happened
"""

from shared.logger import log_info

from src.security.user_context import UserContext


def log_impersonated_action(user_context: UserContext, action: str) -> None:
    """
    Emit a structured audit log entry when an admin performs an action
    while impersonating another user.

    This is a no-op when impersonation is not active, so it is safe to
    call unconditionally on every route that could be triggered during an
    impersonation session.

    Args:
        user_context: The resolved UserContext for the current request.
        action:       Human-readable description of the action,
                      e.g. "create_team", "get_user_teams".
    """
    if not user_context.is_impersonating:
        return

    log_info(
        f"[IMPERSONATION AUDIT] "
        f"admin={user_context.user_id} "
        f"impersonating={user_context.impersonated_user_id} "
        f"action={action}"
    )
