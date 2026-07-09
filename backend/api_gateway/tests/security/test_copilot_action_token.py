"""Tests for copilot action confirmation token signing/verification."""

import jwt
import pytest

from src.security.copilot_action_token import (
    compute_args_hash,
    create_action_token,
    verify_action_token,
)

SECRET = "unit-test-secret-that-is-at-least-32-bytes-long"


class TestComputeArgsHash:
    def test_stable_regardless_of_key_order(self):
        a = compute_args_hash({"a": 1, "b": 2})
        b = compute_args_hash({"b": 2, "a": 1})
        assert a == b

    def test_changes_when_value_changes(self):
        assert compute_args_hash({"hours": 30}) != compute_args_hash({"hours": 500})


class TestActionToken:
    def test_roundtrip(self):
        args = {"worker_id": "w1", "weekly_hours_desired": 30}
        token = create_action_token("user-1", "update_worker_fields", args, SECRET)
        claims = verify_action_token(token, SECRET)
        assert claims["sub"] == "user-1"
        assert claims["tool"] == "update_worker_fields"
        assert claims["args_hash"] == compute_args_hash(args)

    def test_wrong_secret_rejected(self):
        token = create_action_token("user-1", "t", {"x": 1}, SECRET)
        with pytest.raises(jwt.InvalidTokenError):
            verify_action_token(token, "other-secret-that-is-also-32-bytes-long!!")

    def test_expired_rejected(self):
        token = create_action_token("user-1", "t", {"x": 1}, SECRET, ttl_seconds=-1)
        with pytest.raises(jwt.ExpiredSignatureError):
            verify_action_token(token, SECRET)

    def test_tampered_args_detected_via_hash(self):
        approved = {"worker_id": "w1", "weekly_hours_desired": 30}
        token = create_action_token("user-1", "update_worker_fields", approved, SECRET)
        claims = verify_action_token(token, SECRET)
        tampered = {"worker_id": "w1", "weekly_hours_desired": 500}
        assert claims["args_hash"] != compute_args_hash(tampered)
