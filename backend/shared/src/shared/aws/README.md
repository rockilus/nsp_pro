# AWS Services Module

This module provides secure interfaces to AWS services for NSP Pro, with proper error handling, logging, and security best practices suitable for healthcare applications.

## Features

- **Secrets Manager**: Retrieve and validate secrets from AWS Secrets Manager
- **DocumentDB Credentials**: Specialized handling for DocumentDB connection credentials
- **Error Handling**: Comprehensive exception hierarchy with security-conscious error messages
- **Logging**: Integrated with shared logging utilities
- **Configuration**: Flexible AWS configuration management

## Usage

### Basic Secrets Manager Usage

```python
from shared.aws import SecretsManager, AWSConfig

# Using environment variables
secrets_manager = SecretsManager()
secret_value = secrets_manager.get_secret("my-secret-name")

# Using custom configuration
aws_config = AWSConfig.from_boto3_session()
secrets_manager = SecretsManager(aws_config)
secret_dict = secrets_manager.get_secret_dict("my-json-secret")
```

### DocumentDB Credentials

```python
from shared.aws import SecretsManager

secrets_manager = SecretsManager()
credentials = secrets_manager.get_documentdb_credentials(
    "rockilus/prod/documentdb/credentials"
)

print(f"Host: {credentials.host}")
print(f"Port: {credentials.port}")
print(f"Username: {credentials.username}")
# Password available but not logged for security
```

### Error Handling

```python
from shared.aws import SecretsManager, DocumentDBCredentialsError

try:
    secrets_manager = SecretsManager()
    credentials = secrets_manager.get_documentdb_credentials("my-secret")
except DocumentDBCredentialsError as e:
    print(f"DocumentDB error: {e.message}")
    if e.missing_fields:
        print(f"Missing fields: {e.missing_fields}")
```

### Integration with Database Providers

```python
from shared.aws import SecretsManager
from shared.database.config import DatabaseConfig

# Retrieve DocumentDB credentials
secrets_manager = SecretsManager()
credentials = secrets_manager.get_documentdb_credentials()

# Use with database configuration
db_config = DatabaseConfig(
    database_provider="documentdb",
    documentdb_host=credentials.host,
    documentdb_port=credentials.port,
    documentdb_username=credentials.username,
    documentdb_password=credentials.password,
)
```

## Configuration

### Environment Variables

The AWS module can be configured using environment variables:

```bash
# Basic AWS Configuration
AWS_REGION=eu-west-3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_SESSION_TOKEN=your-session-token  # Optional for temporary credentials

# Secrets Manager Configuration
AWS_DOCUMENTDB_SECRET_NAME=rockilus/prod/documentdb/credentials

# SQS Configuration (if using SQS)
AWS_SQS_SOLVE_QUEUE_NAME=solve-queue
AWS_SQS_VISIBILITY_TIMEOUT_SECONDS=900
```

### Creating Configuration Objects

```python
from shared.aws import AWSConfig

# From environment variables
config = AWSConfig.from_environment()

# From boto3 session (recommended for production)
config = AWSConfig.from_boto3_session(region="eu-west-3")

# Manual configuration
config = AWSConfig(
    region="eu-west-3",
    aws_access_key_id="your-key",
    aws_secret_access_key="your-secret",
    documentdb_secret_name="your-secret-name",
    sqs_solve_queue_name="your-queue"
)
```

## Security Features

- Input validation for all parameters
- Secure error messages that don't leak sensitive information
- Proper exception handling with original error context
- Comprehensive logging without exposing secrets
- Type safety with dataclasses and proper typing
- Credential validation for DocumentDB connections

## Extension for Other AWS Services

This module is designed to be easily extended for other AWS services:

1. Add new service modules (e.g., `s3.py`, `rds.py`)
2. Create service-specific exception classes in `exceptions.py`
3. Add new service clients to `config.py` if needed
4. Follow the same patterns for error handling and logging

### Example: Adding S3 Support

```python
# In s3.py
from .config import AWSConfig
from .exceptions import AWSServiceError

class S3Client:
    def __init__(self, aws_config: AWSConfig):
        self.aws_config = aws_config
        self._client = None
    
    @property
    def client(self):
        if self._client is None:
            self._client = self.aws_config.create_boto3_client("s3")
        return self._client
```

## Testing

The module includes comprehensive error handling and logging, making it easy to test:

```python
import pytest
from shared.aws import SecretsManager, DocumentDBCredentialsError

def test_documentdb_credentials_missing_fields():
    # Test with mock AWS config that returns incomplete data
    with pytest.raises(DocumentDBCredentialsError) as exc_info:
        # Test missing fields scenario
        pass
    
    assert "Missing required credential fields" in str(exc_info.value)
```
