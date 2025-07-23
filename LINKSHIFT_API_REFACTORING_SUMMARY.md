# LinkShift API and Hooks Refactoring

## Summary

Successfully refactored the link shift methods to follow the same patterns as TeamApi and UserApi, creating a consistent API structure with authentication support and corresponding React hooks.

## Files Created

### 1. `/src/app/lib/api/linkShiftApi.ts`
- `LinkShiftApi` class with authenticated methods:
  - `createLinkShift(apiClient, linkShift)` - Create new link shift
  - `getLinkShifts(apiClient, teamId)` - Get all link shifts for a team
  - `updateLinkShift(apiClient, linkShift)` - Update existing link shift
  - `deleteLinkShift(apiClient, linkShiftId, teamId)` - Delete link shift
- Legacy methods for backward compatibility (with deprecation warnings)
- Proper error handling and input validation
- Follows BaseApi pattern with authentication support

### 2. `/src/hooks/useLinkShift.ts`
- React hooks for link shift operations:
  - `useCreateLinkShift()` - Hook for creating link shifts
  - `useGetLinkShifts()` - Hook for fetching link shifts
  - `useUpdateLinkShift()` - Hook for updating link shifts
  - `useDeleteLinkShift()` - Hook for deleting link shifts
- Automatic authentication handling
- Error handling with user-friendly messages
- Development logging for debugging

## Files Modified

### 1. `/src/app/lib/link-shift.ts`
- **Status**: Kept for backward compatibility with deprecation warnings
- All functions now delegate to `LinkShiftApi` legacy methods
- Added deprecation warnings to guide migration
- Functions marked as `@deprecated` with migration guidance

### 2. `/src/components/shifts/shift-tab.tsx`
- **Updated imports**: Removed legacy imports, added `useLinkShift` hooks
- **Updated handlers**: 
  - `handleAddLinkShift` now uses `useCreateLinkShift()` hook
  - `handleDeleteLinkShift` now uses `useDeleteLinkShift()` hook
- Maintains same component interface and behavior

### 3. `/src/app/lib/api/shiftApi.ts`
- Updated `getShiftsTabData` to use authenticated APIs:
  - `DimensionApi.getDimensions()` instead of legacy `getDimensions()`
  - `SpecialtyApi.getSpecialties()` instead of legacy `getSpecialties()`
  - `LinkShiftApi.getLinkShifts()` instead of legacy `getLinkShifts()`
- Now fully uses authenticated API pattern for all data fetching

### 4. `/src/app/lib/shift.ts`
- Updated legacy `getShiftsTabData` to use `LinkShiftApi.getLinkShiftsLegacy()`
- Maintains backward compatibility

## Migration Guide

### For New Code (Recommended)

#### Using React Hooks (Recommended for Components):
```typescript
import { useCreateLinkShift, useGetLinkShifts, useUpdateLinkShift, useDeleteLinkShift } from '../hooks/useLinkShift';

function MyComponent() {
  const createLinkShift = useCreateLinkShift();
  const getLinkShifts = useGetLinkShifts();
  const updateLinkShift = useUpdateLinkShift();
  const deleteLinkShift = useDeleteLinkShift();

  const handleCreate = async (linkShift: LinkShiftT) => {
    try {
      const newLinkShift = await createLinkShift(linkShift);
      // Handle success
    } catch (error) {
      // Handle error
    }
  };
}
```

#### Using API Class Directly (For Non-React Contexts):
```typescript
import { LinkShiftApi } from '../app/lib/api/linkShiftApi';
import { useApiClient } from '../app/lib/api-client';

// In a function component or custom hook
const apiClient = useApiClient();

// Create link shift
const newLinkShift = await LinkShiftApi.createLinkShift(apiClient, linkShiftData);

// Get link shifts
const linkShifts = await LinkShiftApi.getLinkShifts(apiClient, teamId);

// Update link shift
const updatedLinkShift = await LinkShiftApi.updateLinkShift(apiClient, linkShiftData);

// Delete link shift
await LinkShiftApi.deleteLinkShift(apiClient, linkShiftId, teamId);
```

### For Existing Code (Legacy Support)

Existing code will continue to work with deprecation warnings:

```typescript
// These still work but show deprecation warnings
import { addLinkShift, getLinkShifts, updateLinkShift, deleteLinkShift } from '../app/lib/link-shift';

const newLinkShift = await addLinkShift(linkShiftData);
const linkShifts = await getLinkShifts(teamId);
```

## Key Benefits

1. **Consistent Architecture**: Follows same patterns as TeamApi and UserApi
2. **Authentication Support**: All new methods support authenticated requests
3. **React Integration**: Purpose-built hooks for React components
4. **Error Handling**: Improved error handling with user-friendly messages
5. **Type Safety**: Full TypeScript support with proper typing
6. **Backward Compatibility**: Legacy functions still work during transition
7. **Security**: Input validation and authentication checks
8. **Debugging**: Development-mode logging for easier debugging

## Next Steps

1. **Gradual Migration**: Update components one by one to use new hooks
2. **Remove Legacy**: Once all components are migrated, remove legacy functions
3. **Testing**: Ensure all functionality works with new authenticated methods
4. **Documentation**: Update any component documentation to reference new hooks

## Dependencies

- Requires `useApiClient` hook for authentication
- Requires `useAuth` context for authentication state
- Uses `BaseApi` class for consistent API patterns
- Compatible with existing `LinkShiftT` type definitions
