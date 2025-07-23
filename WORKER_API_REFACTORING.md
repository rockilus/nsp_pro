# Worker API Refactoring - Migration Guide

This document outlines the refactoring of worker-related functions from a direct API approach to a proper API client class and React hooks pattern, following the same structure as `TeamApi` and `UserApi`.

## What Was Changed

### 1. New Files Created

#### `/src/app/lib/api/workerApi.ts`
- **WorkerApi** class with authenticated and legacy methods
- Type-safe API calls with proper error handling
- Input validation and security checks
- Follows the same pattern as `TeamApi` and `UserApi`

#### `/src/hooks/useWorker.ts`
- React hooks for worker operations
- Authentication state validation
- Consistent error handling and logging
- Hooks available:
  - `useAddWorker()`
  - `useGetWorkers()`
  - `useGetAllWorkers()`
  - `useUpdateWorker()`
  - `useAttachUserToWorker()`
  - `useDeleteWorker()`
  - `useGetWorkersTabData()`

### 2. Updated Files

#### `/src/app/lib/worker.ts`
- **Refactored to legacy wrapper functions**
- All original functions now delegate to `WorkerApi`
- Added deprecation warnings for legacy functions
- Maintains backward compatibility
- Exports transformation functions (`toWorkerT`, `fromWorkerT`) for compatibility

#### `/src/components/workers/worker-tab.tsx`
- **Updated to use new hooks**
- Replaced direct function calls with hook-based approach
- Improved authentication handling
- Added proper error handling

#### `/src/components/teams-settings/members/members-tab.tsx`
- **Updated to use new hooks**
- Replaced direct function calls with hook-based approach
- Improved authentication handling

## Migration Path

### For React Components (Recommended)
```typescript
// OLD (deprecated)
import { getWorkers, addWorker } from "@/app/lib/worker";

const workers = await getWorkers(teamId);
const newWorker = await addWorker(workerData);

// NEW (recommended)
import { useGetWorkers, useAddWorker } from "@/hooks/useWorker";

const getWorkersFn = useGetWorkers();
const addWorkerFn = useAddWorker();

const workers = await getWorkersFn(teamId);
const newWorker = await addWorkerFn(workerData);
```

### For Non-React Contexts
```typescript
// OLD
import { getWorkers, addWorker } from "@/app/lib/worker";

// NEW
import { WorkerApi } from "@/app/lib/api/workerApi";
import { useApiClient } from "@/app/lib/api-client";

const apiClient = useApiClient(); // or create authenticated client
const workers = await WorkerApi.getWorkers(apiClient, teamId);
const newWorker = await WorkerApi.addWorker(apiClient, workerData);
```

## Available Methods

### WorkerApi Class Methods
- `WorkerApi.addWorker(apiClient, worker)`
- `WorkerApi.getWorkers(apiClient, teamId)`
- `WorkerApi.getAllWorkers(apiClient, teamId)`
- `WorkerApi.updateWorker(apiClient, updatedWorker)`
- `WorkerApi.attachUserToWorker(apiClient, workerId, userId, teamId)`
- `WorkerApi.deleteWorker(apiClient, workerId, teamId)`

### React Hooks
- `useAddWorker()` - Returns function to add a worker
- `useGetWorkers()` - Returns function to get workers by team
- `useGetAllWorkers()` - Returns function to get all workers by team
- `useUpdateWorker()` - Returns function to update a worker
- `useAttachUserToWorker()` - Returns function to attach user to worker
- `useDeleteWorker()` - Returns function to delete a worker
- `useGetWorkersTabData()` - Returns function to get workers tab data

## Benefits of This Refactoring

1. **Consistency**: Follows the same pattern as `TeamApi` and `UserApi`
2. **Authentication**: Proper authentication handling and validation
3. **Error Handling**: Consistent error handling across all worker operations
4. **Type Safety**: Better TypeScript support and type validation
5. **React Integration**: Proper hooks integration with auth context
6. **Maintainability**: Cleaner separation of concerns
7. **Backward Compatibility**: Existing code continues to work with deprecation warnings

## Current Status

- ✅ All legacy functions still work (with deprecation warnings)
- ✅ New API and hooks are available and tested
- ✅ Two main components migrated:
  - `WorkerTab` - Main worker management interface
  - `members-tab.tsx` - Team member management
- ⚠️ Utility files still use legacy functions (expected behavior)

## Next Steps

1. ✅ ~~Migrate main React components to use the new hooks~~ **COMPLETED**
2. Optionally migrate utility files to use `WorkerApi` class directly
3. Remove legacy functions after all desired migrations are complete
4. Update documentation and examples

## Files That Still Use Legacy Functions

Based on the analysis, these files import from the legacy worker functions:
- `/src/app/lib/constraint.ts` - uses `getWorkers`
- `/src/app/lib/request.ts` - uses `getAllWorkers`
- `/src/app/lib/stats.ts` - uses `getWorkers`
- `/src/app/lib/schedule.ts` - uses `getAllWorkers`

These can be migrated to use `WorkerApi` directly since they're not React components.
