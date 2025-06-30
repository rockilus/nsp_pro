# SQS Integration for API Gateway

This document describes the clean SQS implementation for the API Gateway, providing both new SQS-based endpoints and backward-compatible support in existing routes.

## Architecture Overview

```
Client Request → API Gateway → SQS Queue → Solve Service
                     ↓              ↓            ↓
                Schedule DB ←── Status Updates ←──
```

## Implementation Structure

### 1. Service Layer (`src/services/`)

**`api_gateway_sqs_solve_service.py`**
- Main service orchestrating SQS solve requests
- Handles validation, status updates, and error handling
- Clean separation of concerns with the shared SQS service

**Key Methods:**
- `submit_solve_request()`: Submits solve request to SQS
- `get_solve_status()`: Gets current solve status from database
- `create_sqs_solve_service()`: Factory function for dependency injection

### 2. Dependency Injection (`src/dependencies/`)

**`sqs_solve_service.py`**
- FastAPI dependency for the SQS solve service
- Handles proper initialization and configuration
- Integrates with existing schedule service dependencies

### 3. Routes (`src/routes/`)

**`sqs_solve_routes.py`** - New dedicated SQS endpoints:
- `POST /sqs/schedules/{id}/solve/teams/{team_id}` - Submit solve request
- `GET /sqs/schedules/{id}/solve-status/teams/{team_id}` - Get solve status

**`schedule_routes.py`** - Enhanced existing endpoint:
- `POST /schedules/{id}/solve/teams/{team_id}?use_sqs=true` - Hybrid approach

## API Endpoints

### New SQS Endpoints

#### Submit Solve Request
```http
POST /sqs/schedules/{schedule_id}/solve/teams/{team_id}
Content-Type: application/json

Query Parameters:
- priority: normal|low|high|urgent (default: normal)
- request_type: full_solve|partial_solve|validation (default: full_solve)

Response (202):
{
  "message_id": "uuid-string",
  "status": "PENDING", 
  "schedule_id": "schedule-id"
}
```

#### Get Solve Status
```http
GET /sqs/schedules/{schedule_id}/solve-status/teams/{team_id}

Response (200):
{
  "status": "PENDING|STARTED|SUCCESS|FAILED",
  "task_id": "message-id",
  "updated_at": "2024-01-01T12:00:00Z",
  "schedule_id": "schedule-id"
}
```

### Enhanced Existing Endpoint

#### Hybrid Solve (Backward Compatible)
```http
POST /schedules/{schedule_id}/solve/teams/{team_id}?use_sqs=true

Response (202):
{
  "status": "PENDING",
  "message_id": "uuid-string",  // Only present when use_sqs=true
  "method": "SQS|Celery|Celery (SQS fallback)",
  "schedule": { /* schedule DTO */ }
}
```

## Configuration

### Environment Variables
```bash
# AWS SQS Configuration
AWS_REGION=us-east-1
SQS_QUEUE_NAME=nsp-pro-solve-queue
SQS_VISIBILITY_TIMEOUT=300
SQS_MAX_RECEIVE_COUNT=3

# AWS Credentials (via IAM role or environment)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

### Dependencies
The implementation uses existing shared components:
- `shared.aws.config.AWSConfig`
- `shared.aws.sqs_client.SQSClient`
- `shared.services.sqs_solve_service.SQSSolveService`
- `shared.schemas.sqs_messages.*`

## Migration Strategy

### Phase 1: Parallel Operation
- Deploy both Celery and SQS systems
- Use new `/sqs/` endpoints for testing
- Use `use_sqs=true` parameter for gradual migration

### Phase 2: Gradual Migration
```python
# Test with specific schedules
POST /schedules/123/solve/teams/456?use_sqs=true

# Monitor both systems
GET /sqs/schedules/123/solve-status/teams/456
```

### Phase 3: Full Migration
- Switch default behavior to SQS
- Deprecate Celery endpoints
- Remove legacy code

## Error Handling

### Request Validation
- Schedule existence validation
- Authorization checks
- Duplicate solve prevention

### Fallback Mechanisms
- SQS failure → Celery fallback (in hybrid mode)
- Comprehensive error logging
- Graceful degradation

### Status Tracking
- Real-time status updates in database
- Message ID tracking for correlation
- Detailed error messages

## Benefits

1. **Clean Architecture**: Clear separation between API Gateway and solve logic
2. **Backward Compatibility**: Existing clients continue to work
3. **Gradual Migration**: Safe, incremental adoption of SQS
4. **Error Resilience**: Fallback mechanisms and comprehensive error handling
5. **Maintainability**: Well-structured code with proper dependency injection

## Testing

### Manual Testing
```bash
# Submit SQS solve request
curl -X POST "/sqs/schedules/123/solve/teams/456?priority=high" \
  -H "Authorization: Bearer <token>"

# Check status
curl -X GET "/sqs/schedules/123/solve-status/teams/456" \
  -H "Authorization: Bearer <token>"

# Test hybrid endpoint
curl -X POST "/schedules/123/solve/teams/456?use_sqs=true" \
  -H "Authorization: Bearer <token>"
```

### Integration Tests
- Test both SQS and Celery modes
- Verify status updates
- Test error scenarios and fallbacks

## Monitoring

### Metrics to Track
- Solve request volume (SQS vs Celery)
- Processing times
- Error rates
- Queue depth
- Fallback frequency

### Logging
- Structured logging with correlation IDs
- Performance metrics
- Error tracking with context

This implementation provides a robust, maintainable foundation for migrating from Celery to SQS while ensuring system reliability and backward compatibility.
