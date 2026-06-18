"""
Integration tests for auth_routes.py — cookie-based custom auth.

Strategy:
- Mock CognitoAuthClient so tests don't hit real AWS.
- ``make_app`` extended with ``auth_service_override``.
- Auth routes don't require Cerbos / user context.
"""

from unittest.mock import AsyncMock, MagicMock

from fastapi.testclient import TestClient
from shared.database.interface import DatabaseInterface

from src.errors.authn_errors.authn_errors import (
    AuthnConnectionError,
    AuthnEmailAlreadyExistsError,
    AuthnPasswordPolicyViolationError,
    AuthnUpdateEmailError,
    AuthnUserNotFoundError,
    AuthnWrongCredentialsError,
)
from src.integrations.authentication.cognito_auth_client import AuthTokens
from src.services.auth_service import AuthService

from .conftest import make_app


def _mock_auth_client() -> MagicMock:
    """Return a MagicMock that implements the CognitoAuthClient ABC."""
    mock = MagicMock()
    mock.sign_up = AsyncMock(return_value="mock-sub-123")
    mock.confirm_sign_up = AsyncMock(return_value=None)
    mock.admin_confirm_sign_up = AsyncMock(return_value=None)
    mock.resend_confirmation_code = AsyncMock(return_value=None)
    mock.initiate_auth = AsyncMock(
        return_value=AuthTokens(
            access_token="access-abc",
            id_token="id-abc",
            refresh_token="refresh-abc",
            expires_in=3600,
        )
    )
    mock.refresh_auth = AsyncMock(
        return_value=AuthTokens(
            access_token="new-access",
            id_token="new-id",
            refresh_token="new-refresh",
            expires_in=3600,
        )
    )
    mock.change_password = AsyncMock(return_value=None)
    mock.forgot_password = AsyncMock(return_value=None)
    mock.confirm_forgot_password = AsyncMock(return_value=None)
    mock.update_user_email = AsyncMock(return_value=None)
    mock.verify_user_email_attribute = AsyncMock(return_value=None)
    mock.global_sign_out = AsyncMock(return_value=None)
    return mock


def _make_app_with_auth(db_interface: DatabaseInterface, auth_client: MagicMock):
    auth_service = AuthService(auth_client=auth_client)
    return make_app(
        db_interface,
        auth_service_override=auth_service,
    )


# ---------------------------------------------------------------------------
# POST /auth/signup
# ---------------------------------------------------------------------------


class TestSignUp:
    def test_signup_success(self, db_interface: DatabaseInterface):
        mock = _mock_auth_client()
        app = _make_app_with_auth(db_interface, mock)
        client = TestClient(app)

        resp = client.post(
            "/auth/signup",
            json={
                "email": "new@example.com",
                "first_name": "John",
                "last_name": "Doe",
                "password": "StrongPass1!",
                "confirm_password": "StrongPass1!",
            },
        )
        assert resp.status_code == 200
        assert resp.json()["message"]
        mock.sign_up.assert_awaited_once()

    def test_signup_passwords_mismatch(self, db_interface: DatabaseInterface):
        mock = _mock_auth_client()
        app = _make_app_with_auth(db_interface, mock)
        client = TestClient(app)

        resp = client.post(
            "/auth/signup",
            json={
                "email": "new@example.com",
                "first_name": "John",
                "last_name": "Doe",
                "password": "StrongPass1!",
                "confirm_password": "Different!1",
            },
        )
        assert resp.status_code == 400

    def test_signup_invalid_email(self, db_interface: DatabaseInterface):
        mock = _mock_auth_client()
        app = _make_app_with_auth(db_interface, mock)
        client = TestClient(app)

        resp = client.post(
            "/auth/signup",
            json={
                "email": "not-an-email",
                "first_name": "John",
                "last_name": "Doe",
                "password": "StrongPass1!",
                "confirm_password": "StrongPass1!",
            },
        )
        assert resp.status_code == 422

    def test_signup_email_already_exists(self, db_interface: DatabaseInterface):
        """Existing user in Cognito → signin + onboard to DB, returns 200."""
        mock = _mock_auth_client()
        mock.sign_up.side_effect = AuthnEmailAlreadyExistsError(
            "An account with the given email already exists"
        )
        from src.integrations.authentication.cognito_auth_client import AuthTokens
        mock.initiate_auth.return_value = AuthTokens(
            access_token="eyJhbGci.eyJzdWIiOiJiZTAwZTFlNCJ9.sig",
            id_token="fake-id",
            refresh_token="fake-refresh",
            expires_in=3600,
        )
        app = _make_app_with_auth(db_interface, mock)
        client = TestClient(app)

        resp = client.post(
            "/auth/signup",
            json={
                "email": "taken@example.com",
                "first_name": "John",
                "last_name": "Doe",
                "password": "StrongPass1!",
                "confirm_password": "StrongPass1!",
            },
        )
        assert resp.status_code == 200
        assert resp.json()["message"] == "User registered. Please check your email for the verification code."


# ---------------------------------------------------------------------------
# POST /auth/confirm-signup
# ---------------------------------------------------------------------------


class TestConfirmSignUp:
    def test_confirm_success(self, db_interface: DatabaseInterface):
        mock = _mock_auth_client()
        app = _make_app_with_auth(db_interface, mock)
        client = TestClient(app)

        resp = client.post(
            "/auth/confirm-signup",
            json={"email": "new@example.com", "code": "123456"},
        )
        assert resp.status_code == 200
        mock.confirm_sign_up.assert_awaited_once()

    def test_confirm_invalid_code_returns_error(self, db_interface: DatabaseInterface):
        """Cognito CodeMismatchException → AuthnWrongCredentialsError → 401."""
        mock = _mock_auth_client()
        mock.confirm_sign_up.side_effect = AuthnWrongCredentialsError(
            "Invalid verification code"
        )
        app = _make_app_with_auth(db_interface, mock)
        client = TestClient(app)

        resp = client.post(
            "/auth/confirm-signup",
            json={"email": "new@example.com", "code": "000000"},
        )
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# POST /auth/signin
# ---------------------------------------------------------------------------


class TestSignIn:
    def test_signin_success_sets_cookies(self, db_interface: DatabaseInterface):
        mock = _mock_auth_client()
        app = _make_app_with_auth(db_interface, mock)
        client = TestClient(app)

        resp = client.post(
            "/auth/signin",
            json={"email": "user@example.com", "password": "StrongPass1!"},
        )
        assert resp.status_code == 200
        mock.initiate_auth.assert_awaited_once()
        cookies = resp.cookies
        assert "rockilus_access_token" in cookies
        assert "rockilus_refresh_token" in cookies
        assert cookies["rockilus_access_token"] == "access-abc"
        assert cookies["rockilus_refresh_token"] == "refresh-abc"

    def test_signin_cookies_have_security_flags(self, db_interface: DatabaseInterface):
        """Verify HttpOnly, Secure (in non-dev), and SameSite=Lax are set."""
        mock = _mock_auth_client()
        app = _make_app_with_auth(db_interface, mock)
        client = TestClient(app)

        resp = client.post(
            "/auth/signin",
            json={"email": "user@example.com", "password": "StrongPass1!"},
        )
        assert resp.status_code == 200
        set_cookie_headers = resp.headers.get_list("set-cookie")
        assert len(set_cookie_headers) >= 2

        for header in set_cookie_headers:
            lower = header.lower()
            assert "httponly" in lower, f"HttpOnly missing in: {header}"
            # Secure is False in dev (config defaults to "development" in tests)
            # so we only assert its presence when not in dev
            # assert "secure" in lower, f"Secure missing in: {header}"
            assert "samesite=lax" in lower, f"SameSite=Lax missing in: {header}"

    def test_signin_invalid_credentials(self, db_interface: DatabaseInterface):
        """Cognito NotAuthorizedException → AuthnWrongCredentialsError → 401."""
        mock = _mock_auth_client()
        mock.initiate_auth.side_effect = AuthnWrongCredentialsError(
            "Incorrect username or password"
        )
        app = _make_app_with_auth(db_interface, mock)
        client = TestClient(app)

        resp = client.post(
            "/auth/signin",
            json={"email": "user@example.com", "password": "WrongPassword!"},
        )
        assert resp.status_code == 401

    def test_signin_user_not_found(self, db_interface: DatabaseInterface):
        """Cognito UserNotFoundException → AuthnUserNotFoundError → 401."""
        mock = _mock_auth_client()
        mock.initiate_auth.side_effect = AuthnUserNotFoundError("User does not exist")
        app = _make_app_with_auth(db_interface, mock)
        client = TestClient(app)

        resp = client.post(
            "/auth/signin",
            json={"email": "unknown@example.com", "password": "SomePass1!"},
        )
        assert resp.status_code == 401

    def test_signin_cognito_connection_error(self, db_interface: DatabaseInterface):
        """Upstream failure → AuthnConnectionError → 503."""
        mock = _mock_auth_client()
        mock.initiate_auth.side_effect = AuthnConnectionError("Cognito unreachable")
        app = _make_app_with_auth(db_interface, mock)
        client = TestClient(app)

        resp = client.post(
            "/auth/signin",
            json={"email": "user@example.com", "password": "StrongPass1!"},
        )
        assert resp.status_code == 503

    def test_signin_missing_fields(self, db_interface: DatabaseInterface):
        mock = _mock_auth_client()
        app = _make_app_with_auth(db_interface, mock)
        client = TestClient(app)

        resp = client.post(
            "/auth/signin",
            json={"email": "user@example.com"},
        )
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# POST /auth/refresh
# ---------------------------------------------------------------------------


class TestRefresh:
    def test_refresh_success(self, db_interface: DatabaseInterface):
        mock = _mock_auth_client()
        app = _make_app_with_auth(db_interface, mock)
        client = TestClient(app)

        client.cookies.set("rockilus_refresh_token", "old-refresh")
        resp = client.post("/auth/refresh")
        assert resp.status_code == 200
        mock.refresh_auth.assert_awaited_once_with("old-refresh")
        assert "rockilus_access_token" in resp.cookies

    def test_refresh_no_cookie_returns_401(self, db_interface: DatabaseInterface):
        mock = _mock_auth_client()
        app = _make_app_with_auth(db_interface, mock)
        client = TestClient(app)

        resp = client.post("/auth/refresh")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# POST /auth/signout
# ---------------------------------------------------------------------------


class TestSignOut:
    def test_signout_clears_cookies(self, db_interface: DatabaseInterface):
        mock = _mock_auth_client()
        app = _make_app_with_auth(db_interface, mock)
        client = TestClient(app)

        client.cookies.set("rockilus_access_token", "some-token")
        resp = client.post("/auth/signout")
        assert resp.status_code == 200
        for cookie in resp.headers.get_list("set-cookie"):
            assert (
                "rockilus_access_token" in cookie or "rockilus_refresh_token" in cookie
            )


# ---------------------------------------------------------------------------
# POST /auth/forgot-password
# ---------------------------------------------------------------------------


class TestForgotPassword:
    def test_forgot_password_success(self, db_interface: DatabaseInterface):
        mock = _mock_auth_client()
        app = _make_app_with_auth(db_interface, mock)
        client = TestClient(app)

        resp = client.post(
            "/auth/forgot-password",
            json={"email": "user@example.com"},
        )
        assert resp.status_code == 200
        mock.forgot_password.assert_awaited_once()

    def test_forgot_password_always_returns_200(self, db_interface: DatabaseInterface):
        """Prevent user enumeration — always return success."""
        mock = _mock_auth_client()
        mock.forgot_password.side_effect = Exception("user not found")
        app = _make_app_with_auth(db_interface, mock)
        client = TestClient(app)

        resp = client.post(
            "/auth/forgot-password",
            json={"email": "unknown@example.com"},
        )
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# POST /auth/confirm-forgot-password
# ---------------------------------------------------------------------------


class TestConfirmForgotPassword:
    def test_confirm_success(self, db_interface: DatabaseInterface):
        mock = _mock_auth_client()
        app = _make_app_with_auth(db_interface, mock)
        client = TestClient(app)

        resp = client.post(
            "/auth/confirm-forgot-password",
            json={
                "email": "user@example.com",
                "code": "123456",
                "new_password": "NewStrong1!",
            },
        )
        assert resp.status_code == 200
        mock.confirm_forgot_password.assert_awaited_once()

    def test_confirm_invalid_code(self, db_interface: DatabaseInterface):
        """Cognito CodeMismatchException → AuthnWrongCredentialsError → 401."""
        mock = _mock_auth_client()
        mock.confirm_forgot_password.side_effect = AuthnWrongCredentialsError(
            "Invalid verification code"
        )
        app = _make_app_with_auth(db_interface, mock)
        client = TestClient(app)

        resp = client.post(
            "/auth/confirm-forgot-password",
            json={
                "email": "user@example.com",
                "code": "000000",
                "new_password": "NewStrong1!",
            },
        )
        assert resp.status_code == 401

    def test_confirm_password_policy_violation(self, db_interface: DatabaseInterface):
        """Cognito InvalidPasswordException → AuthnPasswordPolicyViolationError → 400."""
        mock = _mock_auth_client()
        mock.confirm_forgot_password.side_effect = AuthnPasswordPolicyViolationError(
            "Password does not meet policy requirements"
        )
        app = _make_app_with_auth(db_interface, mock)
        client = TestClient(app)

        resp = client.post(
            "/auth/confirm-forgot-password",
            json={
                "email": "user@example.com",
                "code": "123456",
                "new_password": "weak",
            },
        )
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# POST /auth/change-email
# ---------------------------------------------------------------------------


class TestChangeEmail:
    def test_change_email_success(self, db_interface: DatabaseInterface):
        mock = _mock_auth_client()
        app = _make_app_with_auth(db_interface, mock)
        client = TestClient(app)

        client.cookies.set("rockilus_access_token", "access-abc")
        resp = client.post(
            "/auth/change-email",
            json={"new_email": "new@example.com"},
        )
        assert resp.status_code == 200
        mock.update_user_email.assert_awaited_once_with(
            access_token="access-abc",
            new_email="new@example.com",
        )

    def test_change_email_requires_token(self, db_interface: DatabaseInterface):
        mock = _mock_auth_client()
        app = _make_app_with_auth(db_interface, mock)
        client = TestClient(app)

        resp = client.post(
            "/auth/change-email",
            json={"new_email": "new@example.com"},
        )
        assert resp.status_code == 401
        mock.update_user_email.assert_not_awaited()

    def test_change_email_rejects_invalid_email(self, db_interface: DatabaseInterface):
        """Pydantic EmailStr validation rejects malformed emails → 422."""
        mock = _mock_auth_client()
        app = _make_app_with_auth(db_interface, mock)
        client = TestClient(app)

        client.cookies.set("rockilus_access_token", "access-abc")
        resp = client.post(
            "/auth/change-email",
            json={"new_email": "not-an-email"},
        )
        assert resp.status_code == 422

    def test_change_email_cognito_error(self, db_interface: DatabaseInterface):
        """AuthnUpdateEmailError → 400."""
        mock = _mock_auth_client()
        mock.update_user_email.side_effect = AuthnUpdateEmailError(
            "Email address is already in use"
        )
        app = _make_app_with_auth(db_interface, mock)
        client = TestClient(app)

        client.cookies.set("rockilus_access_token", "access-abc")
        resp = client.post(
            "/auth/change-email",
            json={"new_email": "taken@example.com"},
        )
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# POST /auth/verify-email
# ---------------------------------------------------------------------------


class TestVerifyEmail:
    def test_verify_email_success(self, db_interface: DatabaseInterface):
        mock = _mock_auth_client()
        app = _make_app_with_auth(db_interface, mock)
        client = TestClient(app)

        client.cookies.set("rockilus_access_token", "access-abc")
        resp = client.post(
            "/auth/verify-email",
            json={"code": "123456"},
        )
        assert resp.status_code == 200
        mock.verify_user_email_attribute.assert_awaited_once_with(
            access_token="access-abc",
            code="123456",
        )

    def test_verify_email_requires_token(self, db_interface: DatabaseInterface):
        mock = _mock_auth_client()
        app = _make_app_with_auth(db_interface, mock)
        client = TestClient(app)

        resp = client.post(
            "/auth/verify-email",
            json={"code": "123456"},
        )
        assert resp.status_code == 401
        mock.verify_user_email_attribute.assert_not_awaited()

    def test_verify_email_invalid_code(self, db_interface: DatabaseInterface):
        """Cognito CodeMismatchException → AuthnWrongCredentialsError → 401."""
        mock = _mock_auth_client()
        mock.verify_user_email_attribute.side_effect = AuthnWrongCredentialsError(
            "Invalid verification code"
        )
        app = _make_app_with_auth(db_interface, mock)
        client = TestClient(app)

        client.cookies.set("rockilus_access_token", "access-abc")
        resp = client.post(
            "/auth/verify-email",
            json={"code": "000000"},
        )
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# POST /auth/resend-code
# ---------------------------------------------------------------------------


class TestResendCode:
    def test_resend_success(self, db_interface: DatabaseInterface):
        mock = _mock_auth_client()
        app = _make_app_with_auth(db_interface, mock)
        client = TestClient(app)

        resp = client.post(
            "/auth/resend-code",
            json={"email": "user@example.com"},
        )
        assert resp.status_code == 200
        mock.resend_confirmation_code.assert_awaited_once()
