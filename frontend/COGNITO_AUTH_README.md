# AWS Cognito Authentication Implementation

This document describes the AWS Cognito authentication implementation using the `react-oidc-context` library.

## Overview

The authentication system uses AWS Cognito's hosted UI for user authentication and integrates with the existing NSP Pro frontend architecture. This approach provides enterprise-grade security while maintaining simplicity.

## Architecture

### Components

1. **Cognito Configuration** (`src/config/cognito.ts`)
   - Central configuration for AWS Cognito OIDC settings
   - Environment variable based configuration

2. **Auth Context** (`src/contexts/auth-context.tsx`)
   - Wraps the `react-oidc-context` provider
   - Provides a simplified interface for authentication state

3. **Auth Provider** (`src/components/auth/auth-provider.tsx`)
   - Root level component that provides authentication context
   - Combines OIDC provider with custom auth context

4. **Protected Route** (`src/components/auth/protected-route.tsx`)
   - Component wrapper for pages that require authentication
   - Handles loading states, errors, and sign-in prompts

5. **API Client** (`src/app/lib/api-client.ts`)
   - Centralized API client with automatic token management
   - Backward compatible with existing session-based authentication

6. **Authenticated API Hook** (`src/hooks/use-authenticated-api.ts`)
   - React hook for making authenticated API calls
   - Automatically includes user tokens in requests

## Setup

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# AWS Cognito Configuration
NEXT_PUBLIC_COGNITO_AUTHORITY=https://cognito-idp.eu-west-3.amazonaws.com/eu-west-3_9tyN1YsF6
NEXT_PUBLIC_COGNITO_CLIENT_ID=your_client_id
NEXT_PUBLIC_COGNITO_DOMAIN=https://your-domain.auth.eu-west-3.amazoncognito.com

# Redirect URIs
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/fr/plan/workers
NEXT_PUBLIC_LOGOUT_REDIRECT_URI=http://localhost:3000

# API Configuration
NEXT_PUBLIC_API_URL=https://your-api-gateway-url
```

### Dependencies

The implementation requires the following dependency:

```bash
npm install react-oidc-context
```

## Usage

### Basic Authentication Check

```tsx
import { useAuth } from '@/contexts/auth-context';

function MyComponent() {
  const { isAuthenticated, user, signIn, signOut } = useAuth();
  
  if (!isAuthenticated) {
    return <button onClick={signIn}>Sign In</button>;
  }
  
  return (
    <div>
      <p>Welcome, {user?.profile?.email}</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

### Protected Pages

Wrap your page components with `ProtectedRoute`:

```tsx
import ProtectedRoute from '@/components/auth/protected-route';

export default function MyPage() {
  return (
    <ProtectedRoute>
      {/* Your page content */}
    </ProtectedRoute>
  );
}
```

### Making API Calls

Use the authenticated API hook:

```tsx
import { useAuthenticatedAPI } from '@/hooks/use-authenticated-api';

function MyComponent() {
  const api = useAuthenticatedAPI();
  
  const fetchData = async () => {
    try {
      const data = await api.get('/teams');
      console.log(data);
    } catch (error) {
      console.error('API call failed:', error);
    }
  };
  
  // ...
}
```

## Authentication Flow

1. User visits a protected route
2. If not authenticated, `ProtectedRoute` shows sign-in prompt
3. User clicks "Sign In" → redirected to Cognito hosted UI
4. After successful authentication → redirected back to the application
5. Auth context automatically manages tokens and user state
6. API calls include Bearer token automatically

## AWS Cognito Configuration

### Required Cognito Settings

1. **App Client Settings**
   - Enable "Authorization code grant"
   - Set callback URLs (e.g., `http://localhost:3000/fr/plan/workers`)
   - Set sign-out URLs (e.g., `http://localhost:3000`)

2. **Domain Configuration**
   - Configure a custom domain or use the default Cognito domain

3. **User Pool Settings**
   - Configure required attributes (email, given_name, family_name)
   - Set up sign-up and sign-in policies

## Security Features

- **OIDC/OAuth2 Compliance**: Uses standard authentication protocols
- **Automatic Token Refresh**: Tokens are refreshed automatically
- **Secure Token Storage**: Tokens are managed securely by the browser
- **HTTPS Required**: Production deployments must use HTTPS
- **CSRF Protection**: Built-in protection against CSRF attacks

## Testing

A test page is available at `/[lng]/auth-test` to verify the authentication implementation:

- Visit `http://localhost:3000/en/auth-test`
- Test sign-in/sign-out functionality
- View user profile and token information

## Backward Compatibility

The implementation maintains backward compatibility with existing session-based authentication:

- API client falls back to `credentials: 'include'` when no Bearer token is available
- Existing API calls continue to work during migration
- Gradual migration path from session-based to token-based authentication

## Deployment Considerations

### Development
```env
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/fr/plan/workers
NEXT_PUBLIC_LOGOUT_REDIRECT_URI=http://localhost:3000
```

### Production
```env
NEXT_PUBLIC_REDIRECT_URI=https://app.rockilus.com/fr/plan/workers
NEXT_PUBLIC_LOGOUT_REDIRECT_URI=https://app.rockilus.com
```

## Troubleshooting

### Common Issues

1. **Redirect Loop**: Check that redirect URIs match exactly in Cognito configuration
2. **CORS Errors**: Ensure API Gateway has proper CORS configuration
3. **Token Expiry**: Tokens are automatically refreshed, but check network connectivity
4. **Environment Variables**: Verify all required environment variables are set

### Debug Mode

Enable debug logging by adding to your environment:

```env
NEXT_PUBLIC_DEBUG_AUTH=true
```

## Migration from Session-Based Authentication

1. Deploy the new authentication system alongside existing session-based auth
2. Test thoroughly in development environment
3. Update Cognito redirect URIs for production
4. Deploy to production
5. Gradually migrate users from session-based to token-based authentication
6. Remove session-based authentication code once migration is complete
