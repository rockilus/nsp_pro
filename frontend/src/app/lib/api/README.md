# API Refactoring - New Architecture

This document explains the new unified API client architecture for user and team operations and how to migrate from the old patterns.

## Architecture Overview

### New Structure

```
frontend/src/
├── hooks/
│   ├── useUser.ts         # React hooks for user operations
│   └── useTeam.ts         # React hooks for team operations
├── app/lib/
│   ├── user.ts            # Legacy functions + re-exports
│   ├── team.ts            # Legacy functions + re-exports  
│   └── api/
│       ├── baseApi.ts     # Base API client with common functionality
│       ├── userApi.ts     # User-specific API methods
│       └── teamApi.ts     # Team-specific API methods
└── components/
    ├── debug/
    │   └── auth-test-component.tsx ✅ Updated
    ├── settings/profile/
    │   └── user-profile-tab.tsx   ✅ Updated
    └── ...
```

### Key Components

1. **BaseApi** - Abstract class with common API functionality
2. **UserApi & TeamApi** - Concrete implementations for specific operations  
3. **useUser.ts & useTeam.ts** - React hooks that use the new API with authentication
4. **Updated Components** - All components now use the new hooks

## Benefits

✅ **Consistent Authentication**: All API calls use the authenticated `useApiClient`  
✅ **Centralized Error Handling**: Common error patterns handled in `BaseApi`  
✅ **Type Safety**: Full TypeScript support throughout  
✅ **Security**: Authentication validation in hooks, sanitized error messages  
✅ **Maintainability**: Common patterns shared across all API clients  
✅ **Backward Compatibility**: Legacy methods preserved but discouraged  
✅ **Clean Organization**: Hooks in dedicated folder, components updated  

## Usage Examples

### In React Components (Recommended)

```typescript
import { useGetUser, useUpdateUser, useUpdatePassword } from "@/hooks/useUser";

function UserProfile() {
  const getUser = useGetUser();
  const updateUser = useUpdateUser();
  const updatePassword = useUpdatePassword();

  const handleGetUser = async () => {
    try {
      const user = await getUser();
      console.log("User:", user);
    } catch (error) {
      console.error("Failed to get user:", error);
    }
  };

  const handleUpdateUser = async (userData: UserT) => {
    try {
      const updatedUser = await updateUser(userData);
      console.log("User updated:", updatedUser);
    } catch (error) {
      console.error("Failed to update user:", error);
    }
  };

  const handleUpdatePassword = async (passwordData: PasswordUpdateData, userId: string) => {
    try {
      await updatePassword(passwordData, userId);
      console.log("Password updated successfully");
    } catch (error) {
      console.error("Failed to update password:", error);
    }
  };

  return (
    <div>
      <button onClick={handleGetUser}>Get User</button>
      {/* ... other UI */}
    </div>
  );
}
```

### Direct API Usage (When not in React context)

```typescript
import { UserApi } from "@/app/lib/api/userApi";
import { useApiClient } from "@/app/lib/api-client";

// This must be called within a React component or hook
function MyComponent() {
  const apiClient = useApiClient();

  const directApiCall = async () => {
    try {
      const user = await UserApi.getCurrentUser(apiClient);
      const updatedUser = await UserApi.updateUser(apiClient, userData);
      await UserApi.updatePassword(apiClient, passwordData, userId);
    } catch (error) {
      console.error("API call failed:", error);
    }
  };
}
```

## Migration Guide

### From Old Pattern
```typescript
// OLD - Direct fetch calls (deprecated)
import { getUser, updateUser } from "@/app/lib/user";
const user = await getUser(); // ⚠️ No authentication handling
```

### To New Pattern
```typescript
// NEW - Authenticated hooks
import { useGetUser, useUpdateUser } from "@/hooks/useUser";
const getUser = useGetUser();
const updateUser = useUpdateUser();
const user = await getUser(); // ✅ Full authentication handling
```

## Updated Components

These components have been successfully migrated to use the new hooks:

- ✅ `components/debug/auth-test-component.tsx` - Uses `useGetUser` from `@/hooks/useUser`
- ✅ `components/settings/profile/user-profile-tab.tsx` - Uses `useGetUser`, `useUpdateUser`, `useUpdatePassword`
- ✅ `hooks/useUserSelector.ts` - Uses `useGetUser` from `@/hooks/useUser`

## Import Paths

### Recommended (New)
```typescript
import { useGetUser, useUpdateUser, useUpdatePassword } from "@/hooks/useUser";
```

### Also Works (Legacy Re-export)
```typescript
import { useGetUser, useUpdateUser, useUpdatePassword } from "@/app/lib/user";
```

### Direct API (Advanced)
```typescript
import { UserApi } from "@/app/lib/api/userApi";
```

## API Methods

### UserApi Class Methods

```typescript
class UserApi extends BaseApi {
  // Authenticated methods (preferred)
  static async getCurrentUser(apiClient: AuthenticatedApiClient): Promise<UserT>
  static async updateUser(apiClient: AuthenticatedApiClient, user: UserT): Promise<UserT>
  static async updatePassword(apiClient: AuthenticatedApiClient, passwordData: PasswordData, userId: string): Promise<void>
  
  // Legacy method (discouraged)
  static async getCurrentUserLegacy(): Promise<UserT>
}
```

### React Hooks

```typescript
// Authentication-aware hooks
export function useGetUser(): () => Promise<UserT>
export function useUpdateUser(): (userData: UserT) => Promise<UserT>
export function useUpdatePassword(): (passwordData: PasswordData, userId: string) => Promise<void>

// Legacy functions (deprecated)
export async function getUser(): Promise<UserT> // @deprecated
export async function updateUser(user: UserT): Promise<UserT> // @deprecated
export async function updatePassword(passwordData: PasswordData, userId: string): Promise<void> // @deprecated
```

## Error Handling

The new architecture provides consistent error handling:

### HTTP Status Code Mapping
- `401` → "Authentication required. Please sign in again."
- `403` → "You don't have permission to perform this action"
- `404` → "The requested resource was not found"
- `422` → "Validation failed: {details}"
- `500` → "A server error occurred. Please try again later."

### Authentication Errors
- Hooks automatically validate authentication state
- Clear error messages for authentication failures
- Proper error propagation for UI handling

## Security Features

✅ **Input Validation**: All user data is validated before API calls  
✅ **Error Sanitization**: Error messages are sanitized to prevent information leakage  
✅ **Authentication Checks**: All hooks validate authentication state  
✅ **CSRF Protection**: Uses `credentials: "include"` for session-based fallback  
✅ **Type Safety**: TypeScript prevents common security mistakes  

## Next Steps

1. **Migrate Other APIs**: Apply this pattern to team, schedule, and other API clients
2. **Create React Query Integration**: Add React Query hooks for caching and optimistic updates
3. **Add Retry Logic**: Implement automatic retry for failed requests
4. **Enhanced Monitoring**: Add metrics and monitoring for API calls

## Example: Extending to Other APIs

```typescript
// Future: teamApi.ts
export class TeamApi extends BaseApi {
  static async getTeams(apiClient: AuthenticatedApiClient): Promise<TeamT[]> {
    return this.makeRequest<TeamT[]>(apiClient, 'get', '/teams');
  }
  
  static async createTeam(apiClient: AuthenticatedApiClient, teamData: CreateTeamT): Promise<TeamT> {
    return this.makeRequest<TeamT>(apiClient, 'post', '/teams', teamData);
  }
}

// Usage hook
export function useGetTeams() {
  const apiClient = useApiClient();
  const { isAuthenticated, loading } = useAuth();
  
  return useCallback(async () => {
    if (loading || !isAuthenticated) throw new Error("Not authenticated");
    return TeamApi.getTeams(apiClient);
  }, [apiClient, isAuthenticated, loading]);
}
```

This architecture provides a solid foundation for all future API integrations while maintaining security, type safety, and consistent authentication handling.
