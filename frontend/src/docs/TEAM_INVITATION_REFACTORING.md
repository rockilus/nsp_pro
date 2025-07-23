# Team Invitation API Refactoring

This document outlines the refactoring of team invitation methods from direct fetch calls to the new API class and hooks pattern, following the same structure as TeamApi and UserApi.

## New Structure

### API Class: `TeamInvitationApi`
Location: `frontend/src/app/lib/api/teamInvitationApi.ts`

The new API class provides:
- ✅ **Authenticated methods** (recommended for new code)
- ⚠️ **Legacy methods** (for backward compatibility)
- 🔒 **Input validation and security checks**
- 📝 **Proper error handling**
- 🎯 **Type safety**

### Hooks: `useTeamInvitation.ts`
Location: `frontend/src/hooks/useTeamInvitation.ts`

Provides React hooks for:
- `useCreateTeamInvitation()`
- `useGetTeamInvitations()`
- `useGetUserPendingInvitations()`
- `useAcceptTeamInvitation()`
- `useRejectTeamInvitation()`
- `useResendTeamInvitationEmail()`
- `useDeleteTeamInvitation()`

## Migration Guide

### For New Code (Recommended)

Use the new hooks in React components:

```typescript
import {
  useCreateTeamInvitation,
  useGetTeamInvitations,
  useAcceptTeamInvitation,
} from "@/hooks/useTeamInvitation";

function MyComponent() {
  const createInvitation = useCreateTeamInvitation();
  const getInvitations = useGetTeamInvitations();
  const acceptInvitation = useAcceptTeamInvitation();

  const handleCreateInvitation = async () => {
    try {
      const invitation = await createInvitation(invitationData, teamId);
      // Handle success
    } catch (error) {
      // Handle error
    }
  };

  // ... rest of component
}
```

For non-React code, use the API class directly:

```typescript
import { TeamInvitationApi } from "@/app/lib/api/teamInvitationApi";
import { useApiClient } from "@/app/lib/api-client";

// In an async function
const apiClient = useApiClient(); // or get from context
const invitation = await TeamInvitationApi.createTeamInvitation(
  apiClient,
  invitationData,
  teamId
);
```

### For Existing Code (Backward Compatibility)

The original functions in `team-invitation.ts` still work but are now deprecated:

```typescript
// ⚠️ DEPRECATED - Still works but discouraged
import {
  createTeamInvitation,
  acceptTeamInvitation,
} from "@/app/lib/team-invitation";

// These will show deprecation warnings but continue to function
const invitation = await createTeamInvitation(invitationData, teamId);
const team = await acceptTeamInvitation(token);
```

## Key Improvements

### 🔒 Security Enhancements
- **Authentication validation**: All new methods check authentication state
- **Input validation**: Proper validation of required parameters
- **Error sanitization**: Prevents sensitive data leakage in error messages

### 📈 Better Error Handling
- **Standardized errors**: Consistent error messages across all methods
- **User-friendly messages**: Clear, actionable error descriptions
- **Development logging**: Detailed logging in development mode

### 🎯 Type Safety
- **Full TypeScript coverage**: All methods are properly typed
- **Input/output validation**: Runtime type checking with compile-time safety
- **IntelliSense support**: Better developer experience

### 🔄 Consistent Patterns
- **Same structure as TeamApi/UserApi**: Familiar patterns for developers
- **Hook-based React integration**: Follows React best practices
- **Authentication-first design**: Modern authentication handling

## Method Mapping

| Legacy Function | New Hook | New API Method |
|----------------|----------|---------------|
| `createTeamInvitation` | `useCreateTeamInvitation` | `TeamInvitationApi.createTeamInvitation` |
| `getTeamInvitations` | `useGetTeamInvitations` | `TeamInvitationApi.getTeamInvitations` |
| `getUserPendingInvitations` | `useGetUserPendingInvitations` | `TeamInvitationApi.getUserPendingInvitations` |
| `acceptTeamInvitation` | `useAcceptTeamInvitation` | `TeamInvitationApi.acceptTeamInvitation` |
| `rejectTeamInvitation` | `useRejectTeamInvitation` | `TeamInvitationApi.rejectTeamInvitation` |
| `resendTeamInvitationEmail` | `useResendTeamInvitationEmail` | `TeamInvitationApi.resendTeamInvitationEmail` |
| `deleteTeamInvitation` | `useDeleteTeamInvitation` | `TeamInvitationApi.deleteTeamInvitation` |

## Best Practices

1. **Use hooks in React components** - They handle authentication and loading states automatically
2. **Use API class for non-React code** - Direct API access when hooks aren't available
3. **Handle authentication errors** - Properly catch and handle authentication failures
4. **Validate inputs** - The new methods include validation, but additional checks are recommended
5. **Use TypeScript properly** - Take advantage of the improved type safety

## Breaking Changes

⚠️ **None** - All existing code continues to work with deprecation warnings.

## Timeline

- **Phase 1** ✅ - New API class and hooks created
- **Phase 2** 🔄 - Migrate existing components to use new hooks
- **Phase 3** ⏳ - Remove legacy functions (after migration is complete)

## Security Notes

The new implementation follows NSP Pro's security best practices:
- Input validation and sanitization
- Proper authentication checks
- Protection against common vulnerabilities
- Secure error handling without information leakage
- Production-ready logging and monitoring
