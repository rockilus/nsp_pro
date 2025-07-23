# Dim Entry API Migration Guide

The dim entry functionality has been refactored to follow the same authentication and error handling patterns as other APIs in the application. This guide will help you migrate from the legacy functions to the new authenticated API and hooks.

## What Changed

### Old Pattern (Deprecated)
```typescript
// Legacy import
import { addDimEntry, updateDimEntry, deleteDimEntry } from "../../app/lib/dim-entry";

// Legacy usage (no authentication)
const result = await addDimEntry(dimEntryData, teamId);
```

### New Pattern (Recommended)

#### Option 1: Using Hooks (Recommended for Components)
```typescript
// Import hooks
import { 
  useAddDimEntry, 
  useUpdateDimEntry, 
  useDeleteDimEntry 
} from "../../hooks/useDimEntry";

// In your component
function MyComponent() {
  const addDimEntry = useAddDimEntry();
  const updateDimEntry = useUpdateDimEntry();
  const deleteDimEntry = useDeleteDimEntry();
  
  const handleAdd = async () => {
    try {
      const result = await addDimEntry(dimEntryData, teamId);
      // Handle success
    } catch (error) {
      // Handle error (authentication, validation, etc.)
    }
  };
}
```

#### Option 2: Using API Class Directly
```typescript
// Import API class and client
import { DimEntryApi } from "../../app/lib/api/dimEntryApi";
import { useApiClient } from "../../app/lib/api-client";

// In your component
function MyComponent() {
  const apiClient = useApiClient();
  
  const handleAdd = async () => {
    try {
      const result = await DimEntryApi.addDimEntry(apiClient, dimEntryData, teamId);
      // Handle success
    } catch (error) {
      // Handle error
    }
  };
}
```

## Migration Steps

### Step 1: Update Imports

**Before:**
```typescript
import {
  addDimEntry,
  updateDimEntry,
  deleteDimEntry,
} from "../../app/lib/dim-entry";
```

**After (Hooks - Recommended):**
```typescript
import { 
  useAddDimEntry, 
  useUpdateDimEntry, 
  useDeleteDimEntry 
} from "../../hooks/useDimEntry";
```

**After (API Class):**
```typescript
import { DimEntryApi } from "../../app/lib/api/dimEntryApi";
import { useApiClient } from "../../app/lib/api-client";
```

### Step 2: Update Function Calls

**Before:**
```typescript
// Direct function calls
const newDimEntry = await addDimEntry(dimEntryData, teamId);
const updatedDimEntry = await updateDimEntry(dimEntryData, teamId);
const attributes = await deleteDimEntry(dimEntryId, teamId);
```

**After (Hooks):**
```typescript
// Hook-based calls
const addDimEntryFn = useAddDimEntry();
const updateDimEntryFn = useUpdateDimEntry();
const deleteDimEntryFn = useDeleteDimEntry();

// Usage
const newDimEntry = await addDimEntryFn(dimEntryData, teamId);
const updatedDimEntry = await updateDimEntryFn(dimEntryData, teamId);
const attributes = await deleteDimEntryFn(dimEntryId, teamId);
```

**After (API Class):**
```typescript
// API class calls
const apiClient = useApiClient();

const newDimEntry = await DimEntryApi.addDimEntry(apiClient, dimEntryData, teamId);
const updatedDimEntry = await DimEntryApi.updateDimEntry(apiClient, dimEntryData, teamId);
const attributes = await DimEntryApi.deleteDimEntry(apiClient, dimEntryId, teamId);
```

## Benefits of Migration

1. **Authentication**: All calls are properly authenticated with user tokens
2. **Error Handling**: Better error messages and standardized error handling
3. **Security**: Input validation and security checks
4. **Consistency**: Same pattern as other APIs (TeamApi, UserApi, etc.)
5. **Type Safety**: Better TypeScript support
6. **Future-Proof**: Ready for additional features and improvements

## Files That Need Migration

~~The following files currently use the legacy dim entry functions and should be migrated:~~

- ~~`/components/workers/worker-tab.tsx`~~ ✅ **MIGRATED**
- ~~`/components/shifts/shift-tab.tsx`~~ ✅ **MIGRATED**

All files have been successfully migrated to use the new authenticated dim entry hooks!

## Legacy Support

The old functions are still available but deprecated. They will:
- Show warning messages in the console
- Continue to work temporarily for backward compatibility
- Be removed in a future version

## Need Help?

If you encounter issues during migration, check:
1. Ensure you're authenticated (user logged in)
2. Verify the team ID is valid
3. Check the browser console for error messages
4. Review the auth context and API client setup
