"""
Utilities for creating and verifying short-lived impersonation JWTs.

Uses PyJWT with HS256, independent of the Cognito stack.

Token claims
------------
sub           : admin_user_id  (who holds the token — for replay prevention)
impersonating : target_user_id (whose data to serve)
iat           : issued-at timestamp
exp           : expiry timestamp
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict

import jwt


def create_impersonation_token(
    admin_id: str,
    target_id: str,
    secret: str,
    ttl_seconds: int = 3600,
) -> str:
    """Return a signed HS256 JWT encoding the impersonation session.

    Args:
        admin_id:    Cognito sub of the admin initiating impersonation.
        target_id:   ID of the user being impersonated.
        secret:      HMAC secret — should come from config.impersonation_jwt_secret.
        ttl_seconds: Token lifetime in seconds (default 1 h).

    Returns:
        Compact serialised JWT string.
    """
    now = datetime.now(tz=timezone.utc)
    payload: Dict[str, Any] = {
        "sub": admin_id,
        "impersonating": target_id,
        "iat": now,
        "exp": now + timedelta(seconds=ttl_seconds),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def verify_impersonation_token(token: str, secret: str) -> Dict[str, Any]:
    """Decode and verify an impersonation JWT.

    Args:
        token:  JWT string from the X-Impersonation-Token request header.
        secret: HMAC secret used to sign the token.

    Returns:
        Decoded payload dict containing at least ``sub`` and ``impersonating``.

    Raises:
        jwt.ExpiredSignatureError: Token has passed its ``exp`` claim.
        jwt.InvalidTokenError:    Signature invalid, payload malformed, or
                                  required claims missing.
    """
    claims: Dict[str, Any] = jwt.decode(token, secret, algorithms=["HS256"])

    # Basic structural validation — callers should not have to check these
    if "sub" not in claims or "impersonating" not in claims:
        raise jwt.InvalidTokenError("Missing required impersonation claims")

    return claims
