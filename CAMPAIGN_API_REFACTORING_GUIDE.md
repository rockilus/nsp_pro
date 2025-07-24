# Campaign API Refactoring Migration Guide

This document outlines the migration from the legacy campaign functions to the new authenticated API client and hooks pattern.

## Overview

The campaign API has been refactored to follow the same pattern as `TeamApi`, `UserApi`, and `ConstraintApi`, providing:

- **Authenticated API client** (`CampaignApi`)
- **React hooks** for campaign operations (`useCampaign.ts`)
- **Legacy compatibility** (deprecated but functional)
- **Enhanced security** with proper authentication and input validation
- **Optimized data fetching** with parallel API calls
- **Type safety** with proper TypeScript interfaces

## New Files Created

### 1. `/frontend/src/app/lib/api/campaignApi.ts`

New authenticated API client class with methods:

- `getCampaignTabData(apiClient, teamId)` - Get campaign data with constraints
- `getCampaignTabDataNoSolver(apiClient, teamId)` - Get campaign data without constraints

Key features:
- **Parallel API calls** for better performance (schedules + constraints fetched simultaneously)
- **Security input validation** and proper error handling
- **Authentication requirement** for all operations
- **Type-safe interfaces** for return data
- **Legacy methods** for backward compatibility

### 2. `/frontend/src/hooks/useCampaign.ts`

React hooks for campaign operations:

- `useGetCampaignTabData()` - Hook for fetching campaign data with constraints
- `useGetCampaignTabDataNoSolver()` - Hook for fetching campaign data without constraints

Each hook includes:
- Authentication state validation
- Comprehensive error handling
- Development debugging logs
- Performance optimization

### 3. `/frontend/src/components/campaign/campaign-tab-new.tsx`

Migration example showing how to use the new hooks pattern with enhanced error handling and authentication flow.

## Migration Guide

The original `/frontend/src/components/campaign/campaign-tab.tsx` has been successfully migrated to use the new authenticated hooks pattern.

### Key Changes Made:

1. **Import hooks instead of direct functions**:
   ```typescript
   // Old
   import { getCampaignTabData, getCampaignTabDataNoSolver } from "../../app/lib/campaign";
   
   // New
   import { useGetCampaignTabData, useGetCampaignTabDataNoSolver } from "../../hooks/useCampaign";
   ```

2. **Initialize hooks in component**:
   ```typescript
   const getCampaignTabData = useGetCampaignTabData();
   const getCampaignTabDataNoSolver = useGetCampaignTabDataNoSolver();
   ```

3. **Enhanced error handling**:
   ```typescript
   try {
     const data = await getCampaignTabData(teamId);
     // Handle success
   } catch (error) {
     console.error("Failed to load campaign data:", error);
     // TODO: Add user-facing error notification
   }
   ```

## API Design Decision

**Q: Why create a CampaignApi when it just calls other APIs?**

**A: Campaign operations represent distinct business logic that justifies a dedicated API layer:**

1. **Logical Grouping**: Campaign operations combine schedules and constraints in specific ways
2. **Business Logic**: Filtering schedules by status (CAMPAIGN vs VALIDATED) is campaign-specific logic
3. **Performance**: Parallel API calls for better performance (schedules + constraints fetched simultaneously)
4. **Error Handling**: Campaign-specific error messages and validation
5. **Future Extensibility**: Campaign functionality may expand beyond just combining other APIs
6. **Consistency**: Follows the established pattern for all other domain objects
7. **Type Safety**: Dedicated interfaces for campaign-specific data structures

## Key Improvements

### Performance Optimization
```typescript
// Old: Sequential API calls
const schedules = await getSchedules(teamId);
const constraints = await getConstraints(teamId);

// New: Parallel API calls
const [schedules, constraints] = await Promise.all([
  ScheduleApi.getSchedules(apiClient, teamId),
  ConstraintApi.getConstraints(apiClient, teamId),
]);
```

### Enhanced Error Handling
```typescript
try {
  const data = await getCampaignTabData(teamId);
  // Handle success
} catch (error) {
  console.error("Failed to load campaign data:", error);
  // TODO: Add user-facing error notification
}
```

### Type Safety
```typescript
export interface CampaignTabData {
  scheduleCampaign: ScheduleT | null;
  schedulesValidated: ScheduleT[];
  constraints: ConstraintT[];
}
```

## Security Improvements

### Input Validation
```typescript
// Security: Input validation
if (!teamId) {
  throw new Error("Team ID is required");
}
```

### Authentication Validation
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

The legacy functions in `/frontend/src/app/lib/campaign.ts` still work but are deprecated:

- Functions now show deprecation warnings in console
- Functions proxy to new API client legacy methods
- No breaking changes for existing code
- Can be migrated incrementally

## Next Steps

1. ✅ **Complete**: Original CampaignTab migrated to use new hooks
2. **Short-term**: Check for any other components that might be using campaign functions
3. **Long-term**: Remove legacy functions after confirming no remaining usage

## TODO

- [x] Migrate CampaignTab component to new hooks ✅
- [ ] Check for any other components using campaign functions
- [ ] Add user-facing error notifications in components
- [ ] Remove legacy functions after migration complete
- [ ] Consider similar pattern for other composite operations

## Testing

After migration:

1. Verify all campaign operations work with authentication
2. Test error handling scenarios
3. Confirm deprecation warnings appear for legacy usage
4. Validate performance improvements from parallel API calls
5. Test both solver and non-solver team scenarios

## Benefits

- ✅ **Authenticated requests** - All operations now require proper authentication
- ✅ **Performance optimization** - Parallel API calls reduce loading time
- ✅ **Consistent error handling** - Standardized error messages and logging
- ✅ **Input validation** - Protection against invalid data
- ✅ **Type safety** - Full TypeScript support with proper interfaces
- ✅ **Development experience** - Better debugging and development logs
- ✅ **Security** - Following cybersecurity best practices
- ✅ **Maintainability** - Consistent pattern across all APIs
- ✅ **Business logic encapsulation** - Campaign-specific operations properly grouped
