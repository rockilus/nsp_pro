"""
User context dataclass for authenticated user identity.
"""

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class UserContext:
    """User context extracted from API Gateway headers"""

    user_id: str
    email: Optional[str] = None
    groups: Optional[List[str]] = None
    request_id: Optional[str] = None
    source_ip: Optional[str] = None
    # Impersonation state — populated by get_user_context via
    # X-Impersonation-Token header.
    # Use effective_user_id (not user_id) for all data-scoped operations so that
    # when an admin is impersonating a user, data is fetched/written for the
    # target user.
    # Always pass user_id (not effective_user_id) to authz.check so that permission
    # decisions are made against the admin's own role, never the target user's role.
    impersonated_user_id: Optional[str] = field(default=None)
    is_impersonating: bool = field(default=False)

    def __post_init__(self):
        if self.groups is None:
            self.groups = []

    @property
    def effective_user_id(self) -> str:
        """
        Returns the target user ID when impersonation is active,
        otherwise returns the authenticated admin's own ID.
        Routes that serve user-scoped data should use this instead of user_id.
        """
        if self.is_impersonating and self.impersonated_user_id:
            return self.impersonated_user_id
        return self.user_id

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for logging/serialization"""
        return {
            "user_id": self.user_id,
            "email": self.email,
            "groups": self.groups,
            "request_id": self.request_id,
            "source_ip": self.source_ip,
            "is_impersonating": self.is_impersonating,
            "impersonated_user_id": self.impersonated_user_id,
        }

    def get_user_id(self) -> str:
        """Compatibility method to match SessionContainerType interface"""
        return self.user_id
