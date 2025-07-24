# Constraint API Refactoring Migration Guide

This document outlines the migration from the legacy constraint functions to the new authenticated API client and hooks pattern.

## Overview

The constraint API has been refactored to follow the same pattern as `TeamApi` and `UserApi`, providing:

- **Authenticated API client** (`ConstraintApi`)
- **React hooks** for constraint operations (`useConstraint.ts`)
- **Legacy compatibility** (deprecated but functional)
- **Enhanced security** with proper authentication and input validation
- **Consistent error handling** and logging

## New Files Created

### 1. `/frontend/src/app/lib/api/constraintApi.ts`

New authenticated API client class with methods:

- `addConstraint(apiClient, constraint)` - Add a new constraint
- `getConstraints(apiClient, teamId)` - Get constraints by team ID
- `updateConstraint(apiClient, updatedConstraint)` - Update existing constraint
- `deleteConstraint(apiClient, constraintId, teamId)` - Delete a constraint
- `getTemplates(apiClient, teamId)` - Get constraint templates

Each method includes:
- Security input validation
- Proper error handling
- Authentication requirement
- Legacy methods for backward compatibility

### 2. `/frontend/src/hooks/useConstraint.ts`

React hooks for constraint operations:

- `useAddConstraint()` - Hook for adding constraints
- `useGetConstraints()` - Hook for fetching constraints
- `useUpdateConstraint()` - Hook for updating constraints
- `useDeleteConstraint()` - Hook for deleting constraints
- `useGetTemplates()` - Hook for fetching templates
- `useGetConstraintsTabData()` - Hook for fetching all constraint tab data

Each hook includes:
- Authentication state validation
- Loading state management
- Comprehensive error handling
- Development debugging logs

## Migration Guide

### Before (Legacy)

```typescript
import {
  getConstraintsTabData,
  addConstraint,
  updateConstraint,
  deleteConstraint,
} from "../../app/lib/constraint";

// Direct function calls (unauthenticated)
const data = await getConstraintsTabData(teamId);
const newConstraint = await addConstraint(constraint);
```

### After (New Pattern)

```typescript
import {
  useGetConstraintsTabData,
  useAddConstraint,
  useUpdateConstraint,
  useDeleteConstraint,
} from "../../hooks/useConstraint";

// Inside React component
const getConstraintsTabData = useGetConstraintsTabData();
const addConstraint = useAddConstraint();
const updateConstraint = useUpdateConstraint();
const deleteConstraint = useDeleteConstraint();

// Authenticated function calls
const data = await getConstraintsTabData(teamId);
const newConstraint = await addConstraint(constraint);
```

## Example Migration

The original `/frontend/src/components/constraints/constraint-tab.tsx` has been successfully migrated to use the new authenticated hooks pattern.

### Key Changes Made:

1. **Import hooks instead of direct functions**:
   ```typescript
   // Old
   import { getConstraintsTabData, addConstraint } from "../../app/lib/constraint";
   
   // New
   import { useGetConstraintsTabData, useAddConstraint } from "../../hooks/useConstraint";
   ```

2. **Initialize hooks in component**:
   ```typescript
   const getConstraintsTabData = useGetConstraintsTabData();
   const addConstraint = useAddConstraint();
   ```

3. **Enhanced error handling**:
   ```typescript
   try {
     const data = await getConstraintsTabData(selectedTeamId);
     // Handle success
   } catch (error) {
     console.error("Failed to load constraints data:", error);
     // TODO: Add user-facing error notification
   }
   ```

## Security Improvements

### Input Validation
All API methods now include comprehensive input validation:

```typescript
// Security: Input validation
if (!constraint || !constraint.teamId) {
  throw new Error("Invalid constraint data provided");
}
```

### Authentication Validation
All hooks validate authentication state:

```typescript
// Security: Validate authentication state
if (loading) {
  throw new Error("Authentication still loading - please wait");
}

if (!isAuthenticated || !user?.id_token) {
  throw new Error("User not authenticated - please sign in");
}
```

## Backward Compatibility

The legacy functions in `/frontend/src/app/lib/constraint.ts` still work but are deprecated:

- Functions now show deprecation warnings in console
- Functions proxy to new API client legacy methods
- No breaking changes for existing code
- Can be migrated incrementally

## Next Steps

1. ✅ **Complete**: Original ConstraintTab migrated to use new hooks
2. **Short-term**: Migrate other components that might be using constraint functions
3. **Long-term**: Remove legacy functions after confirming no remaining usage

## TODO

- [x] Migrate ConstraintTab component to new hooks ✅
- [ ] Check for any other components using constraint functions
- [ ] Add user-facing error notifications in components  
- [ ] Remove legacy functions after migration complete
- [ ] Update worker and shift APIs to follow same pattern

## Testing

After migration:

1. Verify all constraint operations work with authentication
2. Test error handling scenarios
3. Confirm deprecation warnings appear for legacy usage
4. Validate security input validation

## Benefits

- ✅ **Authenticated requests** - All operations now require proper authentication
- ✅ **Consistent error handling** - Standardized error messages and logging
- ✅ **Input validation** - Protection against invalid data
- ✅ **Type safety** - Full TypeScript support with proper typing
- ✅ **Development experience** - Better debugging and development logs
- ✅ **Security** - Following cybersecurity best practices
- ✅ **Maintainability** - Consistent pattern across all APIs
