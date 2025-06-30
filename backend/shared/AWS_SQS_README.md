# AWS SQS Integration for NSP Pro Solve Service

This module provides AWS SQS integration for managing solve requests in the NSP Pro healthcare scheduling application. It replaces the previous Redis+Celery implementation with a more scalable and cloud-native solution.

## Overview

The SQS integration consists of:

- **SQS Client**: Low-level AWS SQS operations
- **SQS Solve Service**: High-level solve request management
- **Message Schemas**: Pydantic models for type-safe messaging
- **Configuration**: Environment-based AWS configuration
- **Factory Functions**: Easy service creation and initialization

## Quick Start

### 1. Install Dependencies

The required dependencies are already added to `pyproject.toml`:

```toml
boto3 = "^1.35.0"
botocore = "^1.35.0"
```

### 2. Environment Configuration

Set up your AWS credentials and configuration:

```bash
# AWS Credentials (optional - can use IAM roles)
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_REGION="us-east-1"

# SQS Configuration
export AWS_SQS_SOLVE_QUEUE_NAME="nsp-solve-queue"
export AWS_SQS_SOLVE_DLQ_NAME="nsp-solve-dlq"
export AWS_SQS_VISIBILITY_TIMEOUT_SECONDS="900"  # 15 minutes
export AWS_SQS_MESSAGE_RETENTION_PERIOD="1209600"  # 14 days
export AWS_SQS_RECEIVE_MESSAGE_WAIT_TIME="20"  # Long polling
export AWS_SQS_MAX_RECEIVE_COUNT="3"  # Before moving to DLQ
```

### 3. Basic Usage

```python
from shared import create_sqs_solve_service, SolveRequestType, SolveRequestPriority

# Create service (automatically initializes queues)
solve_service = await create_sqs_solve_service()

# Submit a solve request
message_id = await solve_service.submit_solve_request(
    schedule_id="schedule_123",
    team_id="team_456", 
    user_id="user_789",
    request_type=SolveRequestType.FULL_SOLVE,
    priority=SolveRequestPriority.HIGH,
    constraints={"max_hours": 40},
    timeout_seconds=600
)

# Check queue status
status = await solve_service.get_queue_status()
print(f"Messages in queue: {status['messages_available']}")

# Health check
health = await solve_service.health_check()
print(f"SQS Status: {health['status']}")
```

## Components

### SQSClient

Low-level SQS operations:

```python
from shared import SQSClient, AWSConfig

config = AWSConfig(region="us-east-1")
client = SQSClient(config)

# Initialize queues
await client.initialize_queues()

# Send message
message_id = await client.send_solve_message(
    message_body={"schedule_id": "123"},
    delay_seconds=10
)

# Receive messages
messages = await client.receive_messages(max_messages=5)

# Delete processed message
await client.delete_message(receipt_handle)
```

### SQSSolveService

High-level solve service operations:

```python
from shared import SQSSolveService, SQSClient

sqs_client = SQSClient()
solve_service = SQSSolveService(sqs_client)

# Submit solve request with all options
message_id = await solve_service.submit_solve_request(
    schedule_id="schedule_123",
    team_id="team_456",
    user_id="user_789",
    request_type=SolveRequestType.PARTIAL_SOLVE,
    priority=SolveRequestPriority.URGENT,
    constraints={
        "max_consecutive_shifts": 5,
        "min_rest_hours": 12,
        "preferred_workers": ["worker_1", "worker_2"]
    },
    metadata={
        "source": "api",
        "version": "2.0"
    },
    timeout_seconds=1200
)
```

### Message Schemas

Type-safe message handling:

```python
from shared import SQSSolveMessage, SolveRequestType, SolveRequestPriority

# Create message
message = SQSSolveMessage(
    schedule_id="schedule_123",
    team_id="team_456", 
    user_id="user_789",
    request_type=SolveRequestType.FULL_SOLVE,
    priority=SolveRequestPriority.NORMAL,
    constraints={"constraint_key": "value"},
    timeout_seconds=300
)

# Serialize to dict for SQS
message_dict = message.dict()

# Parse from SQS message
received_message = SQSSolveMessage(**message_dict)
```

## Request Types

- **FULL_SOLVE**: Complete schedule optimization
- **PARTIAL_SOLVE**: Optimize specific date range or shifts
- **VALIDATION**: Validate existing schedule without changes

## Priority Levels

- **URGENT**: No delay, highest priority (immediate processing)
- **HIGH**: No delay, high priority
- **NORMAL**: 10 second delay, normal priority  
- **LOW**: 60 second delay, lowest priority

## Configuration

### AWS Configuration

All configuration can be set via environment variables with the `AWS_` prefix:

```python
from shared import AWSConfig, get_aws_config_from_env

# From environment
config = get_aws_config_from_env()

# Manual configuration
config = AWSConfig(
    region="us-west-2",
    access_key_id="your-key",
    secret_access_key="your-secret",
    sqs_solve_queue_name="custom-solve-queue",
    sqs_visibility_timeout_seconds=1800  # 30 minutes
)
```

### Queue Naming

For different environments, use prefixed queue names:

```bash
# Development
export AWS_SQS_SOLVE_QUEUE_NAME="nsp-dev-solve-queue"
export AWS_SQS_SOLVE_DLQ_NAME="nsp-dev-solve-dlq"

# Production
export AWS_SQS_SOLVE_QUEUE_NAME="nsp-prod-solve-queue" 
export AWS_SQS_SOLVE_DLQ_NAME="nsp-prod-solve-dlq"
```

## Error Handling

The implementation includes comprehensive error handling:

- **Dead Letter Queue (DLQ)**: Failed messages after 3 attempts
- **Visibility Timeout**: 15 minutes for processing (configurable)
- **Message Retention**: 14 days (configurable)
- **Graceful Degradation**: Health checks and status monitoring

## Monitoring

### Health Checks

```python
# Service health check
health = await solve_service.health_check()
if health["status"] != "healthy":
    logger.error(f"SQS unhealthy: {health.get('error')}")

# Queue statistics
status = await solve_service.get_queue_status()
logger.info(f"Queue depth: {status['messages_available']}")
```

### Queue Attributes

Monitor these key metrics:

- `messages_available`: Messages ready for processing
- `messages_in_flight`: Messages being processed
- `messages_delayed`: Messages waiting for delay period

## Integration with API Gateway

The solve service integrates seamlessly with the existing API gateway patterns:

```python
# In your FastAPI dependency
async def get_sqs_solve_service() -> SQSSolveService:
    return await create_sqs_solve_service()

# In your route handler
@router.post("/{schedule_id}/solve")
async def solve_schedule(
    schedule_id: str,
    solve_service: SQSSolveService = Depends(get_sqs_solve_service)
):
    message_id = await solve_service.submit_solve_request(
        schedule_id=schedule_id,
        # ... other parameters
    )
    return {"message_id": message_id}
```

## Security Considerations

- Use IAM roles instead of access keys when possible
- Implement least-privilege access policies
- Enable SQS server-side encryption
- Use VPC endpoints for private communication
- Validate all message content before processing

## Testing

Run the included tests:

```bash
cd backend/shared
python -m pytest src/shared/tests/test_sqs_components.py -v
```

Run the example:

```bash
cd backend/shared
python src/shared/examples/sqs_usage_example.py
```

## Migration from Redis+Celery

To migrate from the existing Redis+Celery implementation:

1. Deploy SQS infrastructure
2. Update environment configuration
3. Replace Celery task submission with SQS message sending
4. Update solve service consumer to poll SQS instead of Redis
5. Gradually shift traffic from Celery to SQS
6. Remove Redis+Celery infrastructure

The SQS implementation maintains the same interface for submitting solve requests, making migration straightforward.
