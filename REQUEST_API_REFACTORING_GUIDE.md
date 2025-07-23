# Request API Refactoring

This document describes the refactoring of request-related API calls from direct functions to a structured API class and React hooks pattern.

## What Changed

The request functionality has been refactored to follow the same pattern as `TeamApi` and `UserApi`:

1. **Created `RequestApi` class** in `/src/app/lib/api/requestApi.ts`
2. **Created request hooks** in `/src/hooks/useRequest.ts`
3. **Deprecated legacy functions** in `/src/app/lib/request.ts`

## Migration Guide

### Before (Deprecated)
```typescript
import { addRequest, getRequests, updateRequest, acceptRequest, denyRequest, rescindRequest, deleteRequest, getRequestsTabData } from './app/lib/request';

// Direct function calls
const newRequest = await addRequest(requestData, teamId);
const requests = await getRequests(teamId);
const updated = await updateRequest(requestData, teamId);
const accepted = await acceptRequest(requestId, teamId);
const denied = await denyRequest(requestId, teamId);
const rescinded = await rescindRequest(requestId, teamId);
await deleteRequest(requestId, teamId);
const tabData = await getRequestsTabData(teamId);
```

### After (Recommended)

#### Using React Hooks (Recommended for Components)
```typescript
import { 
  useAddRequest, 
  useGetRequests, 
  useUpdateRequest, 
  useAcceptRequest, 
  useDenyRequest, 
  useRescindRequest, 
  useDeleteRequest,
  useGetRequestsTabData
} from '../hooks/useRequest';

function MyComponent() {
  const addRequest = useAddRequest();
  const getRequests = useGetRequests();
  const updateRequest = useUpdateRequest();
  const acceptRequest = useAcceptRequest();
  const denyRequest = useDenyRequest();
  const rescindRequest = useRescindRequest();
  const deleteRequest = useDeleteRequest();
  const getRequestsTabData = useGetRequestsTabData();

  const handleAddRequest = async () => {
    try {
      const newRequest = await addRequest(requestData, teamId);
      // Handle success
    } catch (error) {
      // Handle error
    }
  };

  const handleGetTabData = async () => {
    try {
      const tabData = await getRequestsTabData(teamId);
      // tabData contains: { workers, shifts, requests, shiftOptions }
    } catch (error) {
      // Handle error
    }
  };
}
```

#### Using API Class Directly (For Non-React Contexts)
```typescript
import { RequestApi } from './app/lib/api/requestApi';
import { useApiClient } from './app/lib/api-client';

// In a function component or custom hook
const apiClient = useApiClient();

const newRequest = await RequestApi.addRequest(apiClient, requestData, teamId);
const requests = await RequestApi.getRequests(apiClient, teamId);
const updated = await RequestApi.updateRequest(apiClient, requestData, teamId);
const accepted = await RequestApi.acceptRequest(apiClient, requestId, teamId);
const denied = await RequestApi.denyRequest(apiClient, requestId, teamId);
const rescinded = await RequestApi.rescindRequest(apiClient, requestId, teamId);
await RequestApi.deleteRequest(apiClient, requestId, teamId);
```

## New Features

### Enhanced Error Handling
- Consistent error messages across all request operations
- Proper authentication state validation
- Input validation with meaningful error messages

### Better TypeScript Support
- Full type safety with proper return types
- Input validation with TypeScript interfaces
- Better IDE support and autocompletion

### Authentication Integration
- Automatic authentication state checking
- Proper token handling through the API client
- Security improvements with authenticated requests

### Composite Data Hook
The new `useGetRequestsTabData()` hook provides all the data needed for the requests tab in a single call:

```typescript
const getRequestsTabData = useGetRequestsTabData();

const tabData = await getRequestsTabData(teamId);
// Returns: {
//   workers: WorkerT[],
//   shifts: ShiftT[],
//   requests: RequestT[],
//   shiftOptions: ShiftWorkerOptionT[]
// }
```

## API Reference

### RequestApi Class Methods
- `addRequest(apiClient, request, teamId)` - Create a new request
- `getRequests(apiClient, teamId)` - Get all requests for a team
- `updateRequest(apiClient, request, teamId)` - Update an existing request
- `acceptRequest(apiClient, requestId, teamId)` - Accept a request
- `denyRequest(apiClient, requestId, teamId)` - Deny a request
- `rescindRequest(apiClient, requestId, teamId)` - Rescind a request
- `deleteRequest(apiClient, requestId, teamId)` - Delete a request

### Request Hooks
- `useAddRequest()` - Hook for adding requests
- `useGetRequests()` - Hook for fetching requests
- `useUpdateRequest()` - Hook for updating requests
- `useAcceptRequest()` - Hook for accepting requests
- `useDenyRequest()` - Hook for denying requests
- `useRescindRequest()` - Hook for rescinding requests
- `useDeleteRequest()` - Hook for deleting requests
- `useGetRequestsTabData()` - Hook for fetching complete requests tab data

## Backward Compatibility

The legacy functions in `/src/app/lib/request.ts` are still available but deprecated. They will log warnings and internally use the legacy API methods. These will be removed in a future version.

## Migration Timeline

1. **Phase 1** (Current): Legacy functions deprecated with warnings
2. **Phase 2** (Next release): Update all existing code to use new patterns
3. **Phase 3** (Future release): Remove legacy functions entirely

## Benefits

1. **Consistency**: Follows the same pattern as TeamApi and UserApi
2. **Authentication**: Proper authentication handling
3. **Error Handling**: Enhanced error handling and reporting
4. **Type Safety**: Better TypeScript support
5. **Maintainability**: Cleaner, more maintainable code structure
6. **Performance**: Efficient parallel data fetching in composite hooks
