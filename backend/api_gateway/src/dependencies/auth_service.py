from src.integrations.authentication.cognito_auth_client import (
    Boto3CognitoAuthClient,
)
from src.services.auth_service import AuthService


def get_auth_service() -> AuthService:
    return AuthService(auth_client=Boto3CognitoAuthClient())
