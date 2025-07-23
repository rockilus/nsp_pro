# Shift API Migration Guide

This document describes the migration from the legacy shift functions to the new authenticated `ShiftApi` class and `useShift` hooks.

## Overview

The shift API has been refactored to follow the same pattern as `TeamApi` and `UserApi`, providing:
- ✅ **Authentication handling** with proper error management
- ✅ **Input validation** and security best practices  
- ✅ **Type safety** with TypeScript
- ✅ **React hooks** for easy component integration
- ✅ **Legacy compatibility** for gradual migration

## Migration Examples

### Before (Legacy)
```typescript
import { addShift, getShifts, updateShift, deleteShift } from "../app/lib/shift";

// In a component
const handleAddShift = async (shiftData: ShiftT) => {
  try {
    const newShift = await addShift(shiftData);
    // Handle success
  } catch (error) {
    // Handle error
  }
};
```

### After (New API with Hooks)
```typescript
import { useAddShift, useGetShifts, useUpdateShift, useDeleteShift } from "../hooks/useShift";

// In a React component
function ShiftComponent() {
  const addShift = useAddShift();
  const getShifts = useGetShifts();
  const updateShift = useUpdateShift();
  const deleteShift = useDeleteShift();

  const handleAddShift = async (shiftData: ShiftT) => {
    try {
      const newShift = await addShift(shiftData);
      // Handle success - authentication is handled automatically
    } catch (error) {
      // Handle error - includes proper authentication error handling
    }
  };

  const handleLoadShifts = async (teamId: string) => {
    try {
      const shifts = await getShifts(teamId);
      // Handle success
    } catch (error) {
      // Handle error
    }
  };

  // ... rest of component
}
```

### Direct API Usage (Non-React contexts)
```typescript
import { ShiftApi } from "../app/lib/api/shiftApi";
import { createApiClient } from "../app/lib/api-client";

// In a non-React context with authenticated API client
const apiClient = createApiClient(userToken);
const shifts = await ShiftApi.getShifts(apiClient, teamId);
```

## Available Hooks

| Hook | Purpose | Parameters |
|------|---------|------------|
| `useAddShift()` | Add a new shift | `shift: ShiftT` |
| `useGetShifts()` | Get shifts for a team | `teamId: string` |
| `useGetWorkShifts()` | Get work shifts for a team | `teamId: string` |
| `useGetAllShifts()` | Get all shifts for a team | `teamId: string` |
| `useUpdateShift()` | Update an existing shift | `updatedShift: ShiftT` |
| `useDeleteShift()` | Delete a shift | `shiftId: string, teamId: string` |
| `useGetShiftsTabData()` | Get all shifts tab data | `teamId: string` |

## Available API Methods

| Method | Purpose | Authentication Required |
|--------|---------|-------------------------|
| `ShiftApi.addShift()` | Add a new shift | ✅ |
| `ShiftApi.getShifts()` | Get shifts for a team | ✅ |
| `ShiftApi.getWorkShifts()` | Get work shifts | ✅ |
| `ShiftApi.getAllShifts()` | Get all shifts | ✅ |
| `ShiftApi.updateShift()` | Update a shift | ✅ |
| `ShiftApi.deleteShift()` | Delete a shift | ✅ |
| `ShiftApi.getShiftsTabData()` | Get shifts tab data | ✅ |

## Security Improvements

The new API includes several security enhancements:

1. **Authentication Validation**: All methods verify user authentication before making requests
2. **Input Validation**: Parameters are validated before sending to the API
3. **Error Sanitization**: Errors are sanitized to avoid exposing sensitive information
4. **Type Safety**: Strong TypeScript typing prevents common errors

## Breaking Changes

- **Authentication Required**: All new methods require authentication
- **Error Handling**: Error messages may be different
- **Return Types**: Some methods now return wrapped response types with additional metadata

## Backward Compatibility

The legacy functions are still available but marked as deprecated:
- They will show console warnings when used
- They use the legacy `makeFetchRequest` method
- They should be migrated to the new API gradually

## Migration Steps

1. **Install the new hooks** in your components
2. **Replace function calls** with hook calls
3. **Update error handling** to work with the new authentication-aware errors
4. **Test thoroughly** to ensure authentication flows work correctly
5. **Remove legacy imports** once migration is complete

## Example: Complete Component Migration

### Before
```typescript
import { useEffect, useState } from "react";
import { getShifts, addShift } from "../app/lib/shift";

function ShiftsPage({ teamId }: { teamId: string }) {
  const [shifts, setShifts] = useState<ShiftT[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadShifts = async () => {
      setLoading(true);
      try {
        const shiftsData = await getShifts(teamId);
        setShifts(shiftsData);
      } catch (error) {
        console.error("Failed to load shifts:", error);
      } finally {
        setLoading(false);
      }
    };
    loadShifts();
  }, [teamId]);

  const handleAddShift = async (shiftData: ShiftT) => {
    try {
      const newShift = await addShift(shiftData);
      setShifts([...shifts, newShift]);
    } catch (error) {
      console.error("Failed to add shift:", error);
    }
  };

  // ... rest of component
}
```

### After
```typescript
import { useEffect, useState } from "react";
import { useGetShifts, useAddShift } from "../hooks/useShift";

function ShiftsPage({ teamId }: { teamId: string }) {
  const [shifts, setShifts] = useState<ShiftT[]>([]);
  const [loading, setLoading] = useState(false);
  
  const getShifts = useGetShifts();
  const addShift = useAddShift();

  useEffect(() => {
    const loadShifts = async () => {
      setLoading(true);
      try {
        const shiftsData = await getShifts(teamId);
        setShifts(shiftsData);
      } catch (error) {
        // Authentication errors are automatically handled
        console.error("Failed to load shifts:", error);
      } finally {
        setLoading(false);
      }
    };
    loadShifts();
  }, [teamId, getShifts]);

  const handleAddShift = async (shiftData: ShiftT) => {
    try {
      const newShift = await addShift(shiftData);
      setShifts([...shifts, newShift]);
    } catch (error) {
      // Better error handling with authentication context
      console.error("Failed to add shift:", error);
    }
  };

  // ... rest of component
}
```

## Next Steps

1. Identify components using shift functions
2. Update imports to use the new hooks
3. Test authentication flows
4. Remove deprecated function calls
5. Update any tests to use the new API

For questions or issues during migration, refer to the existing `TeamApi` and `UserApi` implementations as examples.
