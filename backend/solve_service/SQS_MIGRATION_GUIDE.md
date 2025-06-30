# SQS Migration Guide for Solve Service

This document provides guidance for migrating the solve service from Celery+Redis to AWS SQS.

## Overview

The solve service has been updated to use AWS SQS instead of Celery for task queuing. This change provides better reliability, scalability, and integration with AWS services.

## Key Changes

### 1. New Components

- **SQS Consumer** (`sqs_consumer.py`): Replaces Celery worker functionality
- **SQS Worker** (`sqs_worker.py`): Main entry point for the new worker
- **Test Script** (`test_sqs.py`): Testing utilities for SQS integration

### 2. Configuration Updates

The configuration has been extended to include SQS settings:

```python
# New SQS Configuration in config.py
aws_region: str = "eu-west-3"
sqs_queue_name: str = "nsp-pro-solve-queue"
sqs_visibility_timeout: int = 300
sqs_max_receive_count: int = 3
```

Environment variables to add:
```bash
AWS_REGION=us-east-1
SQS_QUEUE_NAME=nsp-pro-solve-queue-dev
SQS_VISIBILITY_TIMEOUT=300
SQS_MAX_RECEIVE_COUNT=3
```

### 3. Worker Transition

#### Old Celery Worker (worker.py)
```python
# Old way
celery_app.worker_main(argv=[...])
```

#### New SQS Worker (sqs_worker.py)
```python
# New way
asyncio.run(main())
```

## Running the New Worker

### Development
```bash
cd backend/solve_service/src
python sqs_worker.py
```

### Production (Docker)
Update the Dockerfile CMD:
```dockerfile
CMD ["python", "sqs_worker.py"]
```

## Testing

### Test SQS Message Sending
```bash
python test_sqs.py send
```

### Test SQS Message Consumption
```bash
python test_sqs.py consume
```

### End-to-End Test
```bash
python test_sqs.py e2e
```

## Migration Steps

### Phase 1: Preparation
1. ✅ Add AWS dependencies to `pyproject.toml`
2. ✅ Update configuration with SQS settings
3. ✅ Implement SQS consumer and worker
4. ✅ Create test scripts

### Phase 2: Parallel Operation (Recommended)
1. Deploy both Celery and SQS workers
2. Route a percentage of traffic to SQS
3. Monitor performance and error rates
4. Gradually increase SQS traffic

### Phase 3: Full Migration
1. Route all traffic to SQS
2. Stop Celery workers
3. Remove Celery dependencies
4. Clean up Redis queues

## Key Benefits

1. **Reliability**: AWS SQS provides guaranteed message delivery
2. **Scalability**: Auto-scaling based on queue depth
3. **Monitoring**: CloudWatch integration for metrics and alarms
4. **Cost**: Pay-per-use pricing model
5. **Maintenance**: Fully managed service, no Redis maintenance

## Rollback Plan

If issues arise, the rollback process is:

1. Stop SQS workers
2. Restart Celery workers
3. Update API Gateway to use Celery endpoints
4. Monitor system stability

## Monitoring and Observability

### CloudWatch Metrics
- Queue depth
- Message processing time
- Error rates
- Dead letter queue messages

### Application Logs
- Message processing logs via Loguru
- Error tracking and reporting
- Performance metrics

## Security Considerations

1. **IAM Roles**: Use appropriate IAM roles for SQS access
2. **Encryption**: Enable SQS encryption at rest and in transit
3. **Access Control**: Restrict queue access to authorized services
4. **Network**: Use VPC endpoints for private communication

## Troubleshooting

### Common Issues

1. **AWS Credentials**: Ensure proper AWS credentials are configured
2. **Queue Permissions**: Verify IAM permissions for SQS operations
3. **Network Connectivity**: Check VPC and security group settings
4. **Message Format**: Ensure message schema compatibility

### Debug Commands

```bash
# Check SQS queue status
aws sqs get-queue-attributes --queue-url <queue-url>

# List messages in queue
aws sqs receive-message --queue-url <queue-url>

# Check dead letter queue
aws sqs get-queue-attributes --queue-url <dlq-url>
```

## Performance Considerations

1. **Batch Processing**: Consider batch message processing for higher throughput
2. **Visibility Timeout**: Tune based on processing time requirements
3. **Long Polling**: Use long polling to reduce costs and latency
4. **Concurrent Workers**: Scale workers based on queue depth

## Next Steps

1. Test the new SQS implementation in development
2. Set up monitoring and alerting
3. Plan the migration timeline
4. Train the team on new troubleshooting procedures
5. Update documentation and runbooks
