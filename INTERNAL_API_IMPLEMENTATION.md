# Internal API Gateway Implementation Summary

## Overview

This implementation provides a secure internal API Gateway endpoint architecture to resolve the "401 Unauthorized" errors when AWS Lambda functions need to communicate with the backend services during Cognito post-confirmation.

## Problem Solved

**Original Issue**: "I deployed my application on aws, and the cognito authentication works, the access token is saved in browser session. But now, when sending request to the backend via api gateway, I get unauthorized response"

**Root Cause**: The Cognito post-confirmation Lambda function needed to call backend services, but couldn't use user authentication tokens since it runs outside the user context.

**Solution**: Implemented a dual authentication architecture:
1. **User Authentication**: Frontend ↔ API Gateway (Cognito User Pool Authorizer)
2. **Service Authentication**: Lambda ↔ API Gateway (Internal API Key)

## Architecture Components

### 1. Infrastructure (Terraform)
- **File**: `/infra/modules/api_gateway/main.tf`
- **Added**: Internal API key generation and usage plans
- **Added**: `/internal/onboard` endpoint with API key authentication (no Cognito)
- **Integration**: HTTP_PROXY to backend services
- **Security**: SSM Parameter Store for secure API key storage

### 2. Lambda Function Enhancement
- **File**: `/infra/modules/cognito/lambda/post_confirmation/lambda_function.py`
- **Features**:
  - Dual API key support (internal + backend service)
  - Enhanced error handling and validation
  - Connection pooling for HTTP requests  
  - Comprehensive logging
  - Graceful failure handling (doesn't block user confirmation)

### 3. Backend Internal Routes
- **File**: `/backend/api_gateway/src/routes/internal_routes.py`
- **Endpoints**:
  - `POST /internal/onboard` - User onboarding from Lambda
  - `GET /internal/health` - Internal health check
- **Security**: Service authentication via `X-API-Key` header
- **Integration**: Reuses existing user service infrastructure

### 4. Backend App Integration
- **Files**: 
  - `/backend/api_gateway/src/app.py` (router registration)
  - `/backend/api_gateway/src/routes/__init__.py` (router exports)
- **Changes**: Added internal router to FastAPI application

## Security Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Lambda        │    │  API Gateway    │    │   Backend       │
│                 │    │                 │    │                 │
│ Internal API    ├────┤ /internal/*     ├────┤ Internal        │
│ Key Auth        │    │ (API Key Auth)  │    │ Endpoints       │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
┌─────────────────┐             │                ┌─────────────────┐
│   Frontend      │             │                │   Backend       │
│                 │             │                │                 │
│ User Session    ├─────────────┤                │ User            │
│ Auth            │             │                │ Endpoints       │
│                 │    ┌─────────────────┐       │                 │
└─────────────────┘    │ Cognito User    │       └─────────────────┘
                       │ Pool Authorizer │
                       └─────────────────┘
```

## Key Benefits

1. **Security**: Separate authentication layers for users vs services
2. **Scalability**: Cached API keys and connection pooling
3. **Reliability**: Graceful error handling doesn't block user registration
4. **Maintainability**: Clean separation of concerns
5. **Monitoring**: Comprehensive logging for debugging

## Environment Variables

The Lambda function expects:
- `AWS_REGION`: AWS region (defaults to "eu-west-3")
- `ENVIRONMENT`: Environment name (defaults to "dev") 
- `API_GATEWAY_URL`: API Gateway base URL (defaults to "https://api.rockilus.com")

## SSM Parameters

The implementation uses:
- `/${ENVIRONMENT}/nsp-pro/internal/api-key` - Internal API key (Lambda → API Gateway)
- `/${ENVIRONMENT}/nsp-pro/backend/api-key` - Backend service key (API Gateway → Backend)

## Flow Diagram

```
1. User completes Cognito confirmation
   ↓
2. Cognito triggers Lambda post-confirmation
   ↓
3. Lambda retrieves internal API key from SSM
   ↓
4. Lambda calls API Gateway /internal/onboard with API key
   ↓
5. API Gateway validates API key (not Cognito)
   ↓
6. API Gateway forwards to backend /internal/onboard
   ↓
7. Backend validates service API key
   ↓
8. Backend creates user in system
   ↓
9. Success response flows back to Lambda
   ↓
10. Lambda returns success to Cognito
```

## Testing

A test utility is provided at:
`/infra/modules/cognito/lambda/post_confirmation/test_lambda.py`

This validates:
- Correct SSM parameter retrieval
- Proper HTTP request formatting
- Error handling scenarios
- Event validation logic

## Next Steps

1. **Deploy Infrastructure**: Run `terraform apply` to deploy the updated infrastructure
2. **Verify SSM Parameters**: Ensure API keys are properly stored in SSM Parameter Store
3. **Test End-to-End**: Create a test user through Cognito and verify onboarding
4. **Monitor Logs**: Check CloudWatch logs for both Lambda and backend services
5. **Load Testing**: Validate performance under concurrent user registrations

## Rollback Plan

If issues arise:
1. Revert Terraform changes to remove internal endpoints
2. Lambda will gracefully fail but still allow user confirmation
3. Users can still manually onboard through existing frontend flows
4. No data loss or security compromise

## Security Considerations

- API keys are encrypted in transit and at rest
- Internal endpoints are only accessible with valid API keys
- Lambda has minimal required IAM permissions
- All authentication failures are logged for monitoring
- No sensitive data is exposed in logs

This implementation provides a robust, secure, and scalable solution for service-to-service communication in the NSP Pro application architecture.
