# Frontend Development Setup

This document explains how the frontend is configured to work in both development and production environments.

## Development vs Production

### Development Mode
- Uses simple header-based authentication (`X-Dev-User-ID`, `X-API-Key`)
- No Cognito/OIDC authentication required
- Direct API calls to `http://localhost:8000`
- Mock user switching capability
- **Same API interface as production** - no code changes needed

### Production Mode
- Uses Cognito OIDC authentication via `react-oidc-context`
- JWT tokens for API authentication
- Full AWS API Gateway integration

## Environment Configuration

All environment variables are centralized in `src/config/env.ts`.

### Development Environment Variables

Create/update `.env.development`:

```bash
# Development environment configuration
NODE_ENV=development

# API Configuration  
NEXT_PUBLIC_API_URL=http://localhost:8000

# Development Authentication - must match backend DEV_USER_ID
NEXT_PUBLIC_DEV_USER_ID=dev-user-123
NEXT_PUBLIC_DEV_API_KEY=dev-service-key-12345
```

## Key Components

### 1. Environment Configuration (`src/config/env.ts`)
Centralizes all environment variable extraction and provides helper functions:
- `env.isDevelopment`, `env.apiUrl`, `env.devUserId`, etc.
- `isDevelopment()`, `isProduction()` helper functions

### 2. Auth Provider (`src/components/auth/auth-provider.tsx`)
Conditionally renders:
- `DevAuthProvider` in development (provides same interface as production)
- `OidcAuthProvider` + `AuthContextProvider` in production

### 3. API Client (`src/app/lib/api-client.ts`)
Automatically handles:
- Development: Sends `X-Dev-User-ID` and `X-API-Key` headers
- Production: Sends `Authorization: Bearer <jwt>` header
- **Same `useApiClient()` hook interface in both environments**

### 4. Development Auth Context (`src/contexts/dev-auth-context.tsx`)
- Provides same interface as production auth context
- Exports `useAuth()` hook (same as production)
- Includes user switching functionality

## Usage Examples

### Using UserApi (No Changes Required!)

```typescript
import { UserApi } from "../app/lib/api/userApi";
import { useApiClient } from "../app/lib/api-client";

function MyComponent() {
  const apiClient = useApiClient(); // Same in dev and production

  const fetchUser = async () => {
    // Same call works in both environments!
    const user = await UserApi.getCurrentUser(apiClient);
  };
}
```

### Direct API Calls

```typescript
import { apiClient } from "../app/lib/api-client";

// This works in both environments
const response = await apiClient.get("/users/me");
```

## Development Workflow

1. **Start Backend**: Use your existing launch configuration
2. **Start Frontend**: 
   ```bash
   cd frontend
   npm run dev
   ```
3. **Access App**: Navigate to `http://localhost:3000`
4. **Switch Users**: Use the dev user switcher (appears automatically in dev mode)

## Key Benefits

✅ **Zero API Changes Required** - All existing API calls work unchanged
✅ **Same Interface** - `useApiClient()` works identically in both environments  
✅ **Automatic Detection** - Environment-based behavior switching
✅ **No Production Impact** - Production code paths completely unchanged
✅ **Easy User Testing** - Switch between dev users instantly

## Backend Requirements

The backend must support:
- `X-Dev-User-ID` header in development mode
- `X-API-Key` header for service authentication
- Environment variable `ENVIRONMENT=development`

## Notes

- Development user ID must match between frontend (`NEXT_PUBLIC_DEV_USER_ID`) and backend (`DEV_USER_ID`)
- Page refreshes when switching dev users to reset API call cache
- All production authentication code paths remain unchanged
- No CORS issues in development due to simple header-based auth
