# Stats API Refactoring Guide

## Overview

The stats functionality has been refactored to follow the same pattern as TeamApi and UserApi, providing both authenticated API methods and React hooks for better security and user experience.

## New Structure

### 1. StatsApi Class (`/frontend/src/app/lib/api/statsApi.ts`)

The new `StatsApi` class provides authenticated API methods:

- `getStats(apiClient, teamId, statsOptions)` - Get stats for a team
- `addHeader(apiClient, header)` - Add a stats header
- `deleteHeader(apiClient, headerId, teamId)` - Delete a stats header
- `getShiftOptions(apiClient, teamId)` - Get shift options for a team

Legacy methods are also available for backward compatibility:
- `getStatsLegacy(statsOptions, teamId)`
- `addHeaderLegacy(header)`
- `deleteHeaderLegacy(headerId, teamId)`
- `getShiftOptionsLegacy(teamId)`

### 2. React Hooks (`/frontend/src/hooks/useStats.ts`)

New hooks provide authenticated access to stats functionality:

- `useGetStats()` - Hook for getting team stats
- `useAddHeader()` - Hook for adding stats headers
- `useDeleteHeader()` - Hook for deleting stats headers  
- `useGetShiftOptions()` - Hook for getting shift options
- `useGetStatsTabData()` - Hook for getting combined stats tab data

### 3. Legacy Functions (Updated `/frontend/src/app/lib/stats.ts`)

The original functions are now marked as deprecated but still work for backward compatibility:

- `getStats()` - ⚠️ **Deprecated**: Use `useGetStats()` hook instead
- `addHeader()` - ⚠️ **Deprecated**: Use `useAddHeader()` hook instead
- `deleteHeader()` - ⚠️ **Deprecated**: Use `useDeleteHeader()` hook instead
- `getShiftOptions()` - ⚠️ **Deprecated**: Use `useGetShiftOptions()` hook instead
- `getStatsTabData()` - ⚠️ **Deprecated**: Use `useGetStatsTabData()` hook instead

## Migration Path

### For React Components

**Before:**
```typescript
import { getStats, addHeader, deleteHeader, getShiftOptions } from "../app/lib/stats";

// Inside component
const handleGetStats = async () => {
  const stats = await getStats(statsOptions, teamId);
  // ...
};
```

**After:**
```typescript
import { useGetStats, useAddHeader, useDeleteHeader, useGetShiftOptions } from "../hooks/useStats";

// Inside component
const getStats = useGetStats();
const addHeader = useAddHeader();
const deleteHeader = useDeleteHeader();
const getShiftOptions = useGetShiftOptions();

const handleGetStats = async () => {
  try {
    const stats = await getStats(teamId, statsOptions);
    // ...
  } catch (error) {
    // Error handling is built into the hooks
    console.error("Failed to get stats:", error);
  }
};
```

### Benefits of Migration

1. **Authentication**: Automatic handling of authentication state and tokens
2. **Error Handling**: Consistent error handling with user-friendly messages
3. **Security**: Input validation and secure API calls
4. **Developer Experience**: Better TypeScript support and debugging
5. **Consistency**: Follows the same pattern as other API modules

## Files That Need Migration

The following files currently use the legacy stats functions and should be updated to use the new hooks:

1. ✅ `/frontend/src/components/stats/stats-tab.tsx` - **MIGRATED** - Main stats component
2. `/frontend/src/components/stats/table/stats-table.tsx` - Stats table component  
3. ✅ `/frontend/src/app/lib/request.ts` - **MIGRATED** - Request functionality
4. ✅ `/frontend/src/hooks/useRequest.ts` - **MIGRATED** - Request hooks
5. ✅ `/frontend/src/components/schedule/schedule-tab.tsx` - **MIGRATED** - Schedule component

## Migration Completed

### ✅ Successfully Updated Components

- **StatsTab**: Now uses `useGetStats`, `useAddHeader`, `useDeleteHeader`, and `useGetStatsTabData` hooks
- **ScheduleTab**: Updated to use `useGetStats` hook for quick stats functionality
- **useRequest**: Updated `useGetRequestsTabData` to use the new `useGetShiftOptions` hook

### ✅ Benefits Realized

- **Authentication**: All stats operations now require proper authentication
- **Error Handling**: Consistent error handling across all components
- **Security**: Input validation and secure API calls
- **Type Safety**: Full TypeScript support with proper interfaces
- **Performance**: Optimized parallel data fetching

## Security Improvements

- All new methods require authentication
- Input validation on all parameters
- Consistent error handling without exposing sensitive information
- Development-only logging to reduce production console spam

## Backward Compatibility

The refactoring maintains full backward compatibility:
- All existing function signatures remain the same
- Legacy functions are marked as deprecated but still functional
- Gradual migration is possible without breaking existing functionality

## Next Steps

1. Update components to use the new hooks (recommended)
2. Update any remaining usage of legacy functions
3. Eventually remove legacy functions in a future release (after full migration)
