import unittest.mock as mock

import pytest
from fastapi import HTTPException, Request
from starlette.types import Message, Receive, Scope

from src.mcp.context import MCPContext, build_mcp_context

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _build_request(headers: dict) -> Request:
    scope: Scope = {
        "type": "http",
        "method": "GET",
        "path": "/api/v1/mcp/sse",
        "headers": [(k.lower().encode(), v.encode()) for k, v in headers.items()],
        "query_string": b"",
        "scheme": "http",
        "server": ("localhost", 4000),
        "client": ("127.0.0.1", 12345),
        "root_path": "",
    }
    return Request(scope, _mock_receive())


def _mock_receive() -> Receive:
    async def receive() -> Message:
        return {"type": "http.request", "body": b""}

    return receive


def _mock_app_state(db):
    state = mock.MagicMock()
    state.db_collections = db
    return state


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestMCPContextAuth:
    @pytest.mark.asyncio
    async def test_empty_auth_header_returns_401(self):
        req = _build_request({})
        with pytest.raises(HTTPException) as exc:
            await MCPContext.from_request(req, mock.MagicMock())
        assert exc.value.status_code == 401

    @pytest.mark.asyncio
    async def test_bearer_without_prefix_returns_401(self):
        req = _build_request({"authorization": "invalid_format"})
        with pytest.raises(HTTPException) as exc:
            await MCPContext.from_request(req, mock.MagicMock())
        assert exc.value.status_code == 401

    @pytest.mark.asyncio
    async def test_invalid_bearer_token_returns_401(self):
        req = _build_request({"authorization": "Bearer bad_token"})
        with pytest.raises(HTTPException) as exc:
            await MCPContext.from_request(req, mock.MagicMock())
        assert exc.value.status_code == 401

    @pytest.mark.asyncio
    async def test_proxy_auth_header_parsed_as_bearer(self, monkeypatch):
        claims = {"sub": "user-1", "email": "test@test.com", "cognito:groups": []}
        monkeypatch.setattr("src.mcp.context._decode_access_token", lambda t: claims)
        monkeypatch.setattr(
            "src.mcp.context.get_cerbos_client", lambda: mock.MagicMock()
        )

        db = mock.MagicMock()
        req = _build_request({"x-mcp-proxy-auth": "Bearer proxy_token_abc"})
        ctx = await MCPContext.from_request(req, _mock_app_state(db))
        assert ctx.user_context.user_id == "user-1"

    @pytest.mark.asyncio
    async def test_dev_mode_auth(self, monkeypatch):
        monkeypatch.setattr("src.mcp.context.config.environment", "development")
        monkeypatch.setattr("src.mcp.context.config.dev_api_key", "test-key")
        monkeypatch.setattr("src.mcp.context.config.dev_user_id", "dev-user")
        monkeypatch.setattr(
            "src.mcp.context.get_cerbos_client", lambda: mock.MagicMock()
        )

        db = mock.MagicMock()
        req = _build_request({"x-api-key": "test-key", "x-dev-user-id": "dev-user"})
        ctx = await MCPContext.from_request(req, _mock_app_state(db))
        assert ctx.user_context.user_id == "dev-user"
        assert ctx.user_context.email is not None

    @pytest.mark.asyncio
    async def test_dev_mode_with_default_user_id(self, monkeypatch):
        monkeypatch.setattr("src.mcp.context.config.environment", "development")
        monkeypatch.setattr("src.mcp.context.config.dev_api_key", "test-key")
        monkeypatch.setattr("src.mcp.context.config.dev_user_id", "fallback-user")
        monkeypatch.setattr(
            "src.mcp.context.get_cerbos_client", lambda: mock.MagicMock()
        )

        db = mock.MagicMock()
        req = _build_request({"x-api-key": "test-key"})
        ctx = await MCPContext.from_request(req, _mock_app_state(db))
        assert ctx.user_context.user_id == "fallback-user"

    @pytest.mark.asyncio
    async def test_dev_mode_invalid_key_returns_401(self, monkeypatch):
        monkeypatch.setattr("src.mcp.context.config.environment", "development")
        monkeypatch.setattr("src.mcp.context.config.dev_api_key", "correct-key")

        req = _build_request({"x-api-key": "wrong-key"})
        with pytest.raises(HTTPException) as exc:
            await MCPContext.from_request(req, mock.MagicMock())
        assert exc.value.status_code == 401

    def test_build_mcp_context_with_missing_request_context(self):
        fake_ctx = mock.MagicMock()
        fake_ctx.request_context = None
        with pytest.raises(HTTPException) as exc:
            import asyncio

            asyncio.run(build_mcp_context(fake_ctx))
        assert exc.value.status_code == 500
