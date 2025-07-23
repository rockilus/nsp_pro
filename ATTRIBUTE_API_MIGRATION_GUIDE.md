# Attribute API Migration Guide

This guide explains how to migrate from the legacy attribute functions to the new AttributeApi class and hooks.

## Overview

The attribute functionality has been refactored to follow the same pattern as TeamApi and UserApi:
- **AttributeApi class**: For authenticated API calls
- **useAttribute hooks**: For React components
- **Legacy functions**: Maintained for backward compatibility (deprecated)

## New Structure

### Files Created/Updated
- `frontend/src/app/lib/api/attributeApi.ts` - New API class
- `frontend/src/hooks/useAttribute.ts` - New React hooks
- `frontend/src/types/attribute.ts` - Added converter functions
- `frontend/src/app/lib/attribute.ts` - Updated to use new API (backward compatible)

### Available Hooks
- `useUpdateAttribute()` - Update an existing attribute
- `useGetAttributesByOwner()` - Get attributes by owner ID
- `useCreateAttribute()` - Create a new attribute
- `useDeleteAttribute()` - Delete an attribute

## Migration Examples

### Before (Legacy Function)
```tsx
import { updateAttribute } from "../../app/lib/attribute";

const handleUpdateAttribute = async (attribute: AttributeT) => {
  const updatedAttribute = await updateAttribute(attribute, selectedTeamId);
  // Handle response...
};
```

### After (Using Hook)
```tsx
import { useUpdateAttribute } from "../../hooks/useAttribute";

const updateAttribute = useUpdateAttribute();

const handleUpdateAttribute = async (attribute: AttributeT) => {
  try {
    const updatedAttribute = await updateAttribute(attribute, selectedTeamId);
    // Handle response...
  } catch (error) {
    // Handle error...
  }
};
```

## Key Benefits

1. **Authentication**: Automatic token handling through auth context
2. **Error Handling**: Standardized error handling and user-friendly messages
3. **Security**: Input validation and secure API calls
4. **Type Safety**: Full TypeScript support with proper type conversion
5. **Consistency**: Same pattern as other API classes (TeamApi, UserApi)

## Migration Steps

1. **Import the hook** instead of the legacy function
2. **Call the hook** in your component to get the function
3. **Use the returned function** with the same parameters
4. **Add error handling** around the async calls
5. **Remove the legacy import** once migrated

## Backward Compatibility

The legacy functions are still available and will work exactly as before, but they will show deprecation warnings in the console. This allows for gradual migration without breaking existing functionality.

## Security Considerations

The new hooks include:
- Authentication state validation
- Input sanitization and validation
- Secure token handling
- Comprehensive error logging
- Protection against common vulnerabilities

All of these follow the security best practices outlined in the project's coding instructions.
