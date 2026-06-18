"""
Integration tests for auth_routes.py — cookie-based custom auth.

Strategy:
- Mock CognitoAuthClient so tests don't hit real AWS.
- `make_app` extended with ``auth_service_override``.
- Auth routes don't require Cerbos / user context, so the existing
  conftest overrides are sufficient.
"""

from unittest.mock import AsyncMock, MagicMock

from fastapi.testclient import TestClient
from shared.database.interface import DatabaseInterface

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
        # Check that cookies are cleared (max-age=0 or deleted)
        for cookie in resp.headers.get_list("set-cookie"):
            assert "rockilus_access_token" in cookie or "rockilus_refresh_token" in cookie


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
