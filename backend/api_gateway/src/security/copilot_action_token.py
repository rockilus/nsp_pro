"""Utilities for signing and verifying copilot write-action confirmation tokens.

Destructive/mutating copilot tools (updates and deletions) are never executed
inside the agent loop. Instead the loop returns a ``pending_action`` describing
the proposed change and mints a short-lived, signed token that binds:

  - the approving user (``sub``),
  - the exact tool to run (``tool``),
  - a canonical hash of the approved arguments (``args_hash``).

The frontend passes this token back to ``POST /copilot/actions/confirm``. The
confirm route rejects the request unless the token is valid AND the incoming
``tool_name``/``tool_args`` reproduce the signed hash. This closes the
in-flight tampering vector (a leader editing ``tool_args`` in DevTools before
clicking "Apply"), which a valid session token alone would not prevent.

Uses PyJWT with HS256 and a dedicated secret (``config.copilot_action_jwt_secret``),
independent of the Cognito and impersonation stacks for clean rotation.
"""

import hashlib
import json
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

import jwt


def compute_args_hash(tool_args: Dict[str, Any]) -> str:
    """Return a canonical SHA-256 hash of the tool arguments.

    ``sort_keys=True`` guarantees a stable serialization so the hash computed
    at preview time matches the one recomputed at confirm time regardless of
    key ordering.
    """
    canonical = json.dumps(tool_args, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode()).hexdigest()


def create_action_token(
    user_id: str,
    tool_name: str,
    tool_args: Dict[str, Any],
    secret: str,
    ttl_seconds: int = 300,
) -> str:
    """Return a signed HS256 JWT authorizing a single pending write action.

    Args:
        user_id:     ID of the user who approved the action (binds the token).
        tool_name:   Registry tool name to execute on confirmation.
        tool_args:   Exact arguments approved during the preview phase.
        secret:      HMAC secret — ``config.copilot_action_jwt_secret``.
        ttl_seconds: Token lifetime in seconds (default 5 min).

    Returns:
        Compact serialised JWT string.
    """
    now = datetime.now(tz=timezone.utc)
    payload: Dict[str, Any] = {
        "sub": user_id,
        "tool": tool_name,
        "args_hash": compute_args_hash(tool_args),
        "iat": now,
        "exp": now + timedelta(seconds=ttl_seconds),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def verify_action_token(token: str, secret: str) -> Dict[str, Any]:
    """Decode and verify a copilot action token.

    Args:
        token:  JWT string returned in the ``pending_action`` payload.
        secret: HMAC secret used to sign the token.

    Returns:
        Decoded payload dict containing ``sub``, ``tool`` and ``args_hash``.

    Raises:
        jwt.ExpiredSignatureError: Token has passed its ``exp`` claim.
        jwt.InvalidTokenError:     Signature invalid or required claims missing.
    """
    claims: Dict[str, Any] = jwt.decode(token, secret, algorithms=["HS256"])

    if "sub" not in claims or "tool" not in claims or "args_hash" not in claims:
        raise jwt.InvalidTokenError("Missing required copilot action claims")

    return claims
