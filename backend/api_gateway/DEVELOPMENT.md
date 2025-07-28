# Backend Development Setup

This document explains the backend changes to support local development authentication.

## Overview

The backend has been updated to support both production (AWS API Gateway + Cognito) and development (simple header-based) authentication modes.

## Environment Configuration

### Development Environment Variables

Update `.env.development`:

```bash
# Development environment configuration
ENVIRONMENT=development

# Development Authentication - must match frontend
DEV_USER_ID=dev-user-123
DEV_USER_EMAIL=dev@nsp-pro.com
DEV_API_KEY=dev-service-key-12345

# Database Configuration
DB_URI=mongodb://localhost:27017/nsp_pro_dev
# or use your existing development database URI

# Other existing variables...
```

## Key Changes

### 1. Service Authentication (`src/security/service_auth.py`)

**Development Mode:**
- Uses `DEV_API_KEY` from environment variables
- Skips AWS SSM parameter store lookup
- Validates against the simple dev API key

**Production Mode:**
- Uses existing AWS SSM parameter store
- Full AWS authentication flow

### 2. Auth Dependencies (`src/dependencies/auth_dependencies.py`)

**Development Mode:**
- Accepts `X-Dev-User-ID` header
- Uses `DEV_USER_ID` from environment as fallback
- Creates mock user context with dev user data

**Production Mode:**
- Uses existing Cognito headers (`X-User-Sub`, `X-User-Email`, etc.)
- Full AWS API Gateway user context extraction

### 3. User Routes (`src/routes/user_routes.py`)

**No changes required!** The existing `/users/me` route works with both:
- Development: receives dev user context
- Production: receives Cognito user context

## How It Works

### Development Request Flow

1. **Frontend** sends request with headers:
   ```
   X-Dev-User-ID: dev-user-123
   X-API-Key: dev-service-key-12345
   ```

2. **Service Auth** validates `X-API-Key` against `DEV_API_KEY`

3. **User Context** extracts user info from `X-Dev-User-ID`

4. **Route Handler** receives `UserContext` with dev user ID

5. **Database** queries work normally with the dev user ID

### Production Request Flow

1. **API Gateway** forwards Cognito headers
2. **Service Auth** validates against AWS SSM parameter
3. **User Context** extracts from Cognito headers
4. **Route Handler** receives normal `UserContext`

## Development Workflow

### 1. Start the Backend

Use your existing launch configuration in VS Code or:

```bash
cd backend/api_gateway
python -m uvicorn src.app:app --reload --host 0.0.0.0 --port 8000
```

### 2. Test the API

```bash
# Test with curl
curl -X GET http://localhost:8000/users/me \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-ID: dev-user-123" \
  -H "X-API-Key: dev-service-key-12345"

# Or run the test script
python test_dev_api.py
```

### 3. Setup Development Data (Optional)

```bash
# Create development users in database
python setup_dev_data.py
```

## Environment Detection

The system automatically detects the environment using the `ENVIRONMENT` variable:

- `ENVIRONMENT=development` → Uses dev headers and local config
- `ENVIRONMENT=production` → Uses AWS services and Cognito

## Benefits

✅ **Zero Route Changes** - All existing routes work unchanged  
✅ **Same Interface** - `UserContext` works identically in both modes  
✅ **Easy Testing** - Simple header-based authentication  
✅ **Production Safety** - No impact on production code paths  
✅ **Database Flexibility** - Works with local or remote databases  

## Security Notes

⚠️ **Development Only** - The `X-Dev-User-ID` header is only accepted when `ENVIRONMENT=development`

⚠️ **Simple Auth** - Development authentication is intentionally simple for ease of use

⚠️ **API Key** - The dev API key should be kept consistent between frontend and backend

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check `X-API-Key` header matches `DEV_API_KEY`
   - Verify `ENVIRONMENT=development` is set

2. **404 User Not Found**
   - Check if dev user exists in database
   - Run `setup_dev_data.py` to create users

3. **500 Internal Server Error**
   - Check database connection
   - Verify environment variables are loaded

### Debug Logging

Set `LOG_LEVEL=DEBUG` in `.env.development` to see detailed authentication logs.

## Testing

The `/users/me` endpoint should work immediately with development headers once:

1. Backend is running with `ENVIRONMENT=development`
2. Frontend sends `X-Dev-User-ID` and `X-API-Key` headers
3. Development user exists in database (or is created automatically)
