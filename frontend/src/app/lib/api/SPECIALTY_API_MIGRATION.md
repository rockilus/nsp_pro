# Specialty API Refactoring Guide

## Overview

The specialty API methods have been refactored to follow the same pattern as TeamApi and UserApi, providing better authentication handling, type safety, and error management.

## New Structure

### SpecialtyApi Class (`frontend/src/app/lib/api/specialtyApi.ts`)

Modern API client with:
- ✅ Authentication handling
- ✅ Input validation
- ✅ Type safety
- ✅ Consistent error handling
- ✅ Security best practices

### Specialty Hooks (`frontend/src/hooks/useSpecialty.ts`)

React hooks with authentication:
- ✅ `useAddSpecialty()` - Add specialty to team
- ✅ `useGetSpecialties()` - Get team specialties
- ✅ `useUpdateSpecialty()` - Update specialty
- ✅ `useDeleteSpecialty()` - Delete specialty

## Migration Path

### Before (Legacy - Deprecated)
```typescript
import { addSpecialty, getSpecialties, updateSpecialty, deleteSpecialty } from '../app/lib/specialty';

// Legacy unauthenticated calls
const specialty = await addSpecialty(specialtyData, teamId);
const specialties = await getSpecialties(teamId);
const updated = await updateSpecialty(updatedData, teamId);
const workers = await deleteSpecialty(specialtyId, teamId);
```

### After (Modern - Recommended)
```typescript
import { useAddSpecialty, useGetSpecialties, useUpdateSpecialty, useDeleteSpecialty } from '../hooks/useSpecialty';

function MyComponent() {
  const addSpecialty = useAddSpecialty();
  const getSpecialties = useGetSpecialties();
  const updateSpecialty = useUpdateSpecialty();
  const deleteSpecialty = useDeleteSpecialty();

  const handleAddSpecialty = async () => {
    try {
      const specialty = await addSpecialty(specialtyData, teamId);
      // Handle success
    } catch (error) {
      // Handle error - already authenticated and validated
    }
  };

  // Similar pattern for other operations...
}
```

## Benefits

1. **Authentication**: All new methods require proper authentication
2. **Type Safety**: Full TypeScript support with proper typing
3. **Error Handling**: Consistent error messages and validation
4. **Security**: Input validation and sanitization
5. **Debugging**: Better logging for development
6. **Consistency**: Same pattern as other API clients

## Backward Compatibility

Legacy functions in `specialty.ts` are still available but:
- ⚠️ **Deprecated** - Will show console warnings
- 🔓 **Unauthenticated** - Less secure
- 📝 **JSDoc marked** - TypeScript will show deprecation warnings

## Next Steps

1. Update components to use the new hooks
2. Test authentication flows
3. Remove legacy function calls
4. Eventually remove deprecated functions

## Security Notes

- All new methods validate authentication state
- Input validation prevents malformed requests
- Error messages don't leak sensitive information
- Follows NSP Pro security best practices
