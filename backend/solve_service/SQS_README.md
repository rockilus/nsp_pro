# SQS Implementation for Solve Service

This document describes the new SQS-based implementation for the solve service, replacing the previous Celery+Redis approach.

## Architecture Overview

```
API Gateway → SQS Queue → Solve Service Consumer
     ↓                            ↓
  Schedule DB ←─────────────────── MongoDB
```

## Key Components

### 1. SQS Consumer (`sqs_consumer.py`)
- Polls SQS queue for solve requests
- Processes messages using existing solve logic
- Updates schedule status in MongoDB
- Handles errors and retries

### 2. SQS Worker (`sqs_worker.py`)
- Main entry point for the worker process
- Manages consumer lifecycle
- Handles graceful shutdown

### 3. Test Script (`test_sqs.py`)
- Testing utilities for SQS integration
- Send/receive message testing
- End-to-end workflow testing

## Configuration

Environment variables required:
```bash
AWS_REGION=us-east-1
SQS_QUEUE_NAME=nsp-pro-solve-queue-dev
SQS_VISIBILITY_TIMEOUT=300
SQS_MAX_RECEIVE_COUNT=3
```

## Running the Service

### Development
```bash
cd backend/solve_service/src
python sqs_worker.py
```

### Testing
```bash
# Test message sending
python test_sqs.py send

# Test message consumption
python test_sqs.py consume

# End-to-end test
python test_sqs.py e2e
```

## Migration Benefits

1. **Reliability**: AWS SQS guarantees message delivery
2. **Scalability**: Auto-scaling based on queue depth
3. **Monitoring**: Built-in CloudWatch metrics
4. **Cost**: Pay-per-use pricing
5. **Maintenance**: Fully managed service

## Message Flow

1. API Gateway receives solve request
2. Validates user authorization
3. Sends message to SQS queue
4. Updates schedule status to PENDING
5. Solve service polls queue
6. Processes solve request
7. Updates schedule with results
8. Deletes message from queue

## Error Handling

- Failed messages are retried up to `SQS_MAX_RECEIVE_COUNT` times
- After max retries, messages move to Dead Letter Queue
- Schedule status is updated with error information
- Comprehensive logging for debugging

## Monitoring

- Queue depth and processing metrics
- Error rates and retry counts
- Processing time per message
- Dead letter queue monitoring

See `SQS_MIGRATION_GUIDE.md` for detailed migration instructions.
