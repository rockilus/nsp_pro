"""AWS service exceptions for NSP Pro."""

from typing import Optional


class AWSServiceError(Exception):
    """Base exception for AWS service errors."""

    def __init__(
        self,
        message: str,
        service: str,
        error_code: Optional[str] = None,
        original_error: Optional[Exception] = None,
    ) -> None:
        """Initialize AWS service error.

        Args:
            message: Error message
            service: AWS service name
            error_code: AWS error code if available
            original_error: Original exception if available
        """
        self.message = message
        self.service = service
        self.error_code = error_code
        self.original_error = original_error
        super().__init__(self.message)


class SecretsManagerError(AWSServiceError):
    """Exception for AWS Secrets Manager operations."""

    def __init__(
        self,
        message: str,
        error_code: Optional[str] = None,
        original_error: Optional[Exception] = None,
    ) -> None:
        """Initialize Secrets Manager error.

        Args:
            message: Error message
            error_code: AWS error code if available
            original_error: Original exception if available
        """
        super().__init__(
            message=message,
            service="SecretsManager",
            error_code=error_code,
            original_error=original_error,
        )


class DocumentDBCredentialsError(SecretsManagerError):
    """Exception for DocumentDB credential retrieval errors."""

    def __init__(
        self,
        message: str,
        missing_fields: Optional[list[str]] = None,
        error_code: Optional[str] = None,
        original_error: Optional[Exception] = None,
    ) -> None:
        """Initialize DocumentDB credentials error.

        Args:
            message: Error message
            missing_fields: List of missing credential fields
            error_code: AWS error code if available
            original_error: Original exception if available
        """
        self.missing_fields = missing_fields or []
        super().__init__(
            message=message,
            error_code=error_code,
            original_error=original_error,
        )
