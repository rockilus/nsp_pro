# Schedule API Migration Guide

This guide explains how to migrate from the legacy schedule functions to the new `ScheduleApi` class and `useSchedule` hooks.

## Overview

The schedule API has been refactored to follow the same pattern as `TeamApi` and `UserApi`:
- **ScheduleApi class**: Contains all authenticated API methods
- **useSchedule hooks**: React hooks for easy integration with components
- **Legacy functions**: Marked as deprecated but still available for backward compatibility

## Migration Examples

### Basic API Calls

#### Before (Legacy)
```typescript
import { addSchedule, getSchedules, updateSchedule } from '../app/lib/schedule';

// Direct function calls (unauthenticated)
const schedule = await addSchedule(teamId);
const schedules = await getSchedules(teamId);
const updatedSchedule = await updateSchedule(scheduleData);
```

#### After (New API Class)
```typescript
import { ScheduleApi } from '../app/lib/api/scheduleApi';
import { useApiClient } from '../app/lib/api-client';

// Using the API class with authentication
const apiClient = useApiClient();
const schedule = await ScheduleApi.createSchedule(apiClient, teamId);
const schedules = await ScheduleApi.getSchedules(apiClient, teamId);
const updatedSchedule = await ScheduleApi.updateSchedule(apiClient, scheduleData);
```

### React Component Integration

#### Before (Legacy)
```typescript
import { useState, useEffect } from 'react';
import { getSchedules } from '../app/lib/schedule';

function ScheduleComponent({ teamId }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSchedules() {
      try {
        const data = await getSchedules(teamId);
        setSchedules(data);
      } catch (error) {
        console.error('Failed to fetch schedules:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchSchedules();
  }, [teamId]);

  // ... rest of component
}
```

#### After (New Hooks)
```typescript
import { useState } from 'react';
import { useGetSchedules } from '../hooks/useSchedule';

function ScheduleComponent({ teamId }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const getSchedules = useGetSchedules();

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const data = await getSchedules(teamId);
      setSchedules(data);
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  // ... rest of component
}
```

## Function Mapping

| Legacy Function | New API Method | New Hook |
|---|---|---|
| `addSchedule()` | `ScheduleApi.createSchedule()` | `useCreateSchedule()` |
| `getSchedules()` | `ScheduleApi.getSchedules()` | `useGetSchedules()` |
| `getWorkTimeTable()` | `ScheduleApi.getWorkTimeTable()` | `useGetWorkTimeTable()` |
| `updateSchedule()` | `ScheduleApi.updateSchedule()` | `useUpdateSchedule()` |
| `deleteSchedule()` | `ScheduleApi.deleteSchedule()` | `useDeleteSchedule()` |
| `validateSchedule()` | `ScheduleApi.validateSchedule()` | `useValidateSchedule()` |
| `exportSchedule()` | `ScheduleApi.exportSchedule()` | `useExportSchedule()` |
| `duplicatePeriod()` | `ScheduleApi.duplicatePeriod()` | `useDuplicatePeriod()` |
| `getScheduleTabData()` | `ScheduleApi.getScheduleTabData()` | `useGetScheduleTabData()` |
| `getScheduleAssignmentsData()` | `ScheduleApi.getScheduleAssignmentsData()` | `useGetScheduleAssignmentsData()` |
| `getScheduleAssignmentsDataNoSolver()` | `ScheduleApi.getScheduleAssignmentsDataNoSolver()` | `useGetScheduleAssignmentsDataNoSolver()` |
| `getScheduleAssignmentsDataMember()` | `ScheduleApi.getScheduleAssignmentsDataMember()` | `useGetScheduleAssignmentsDataMember()` |
| `getScheduleLHSData()` | `ScheduleApi.getScheduleLHSData()` | `useGetScheduleLHSData()` |

## Benefits of the New API

1. **Authentication**: All new methods properly handle user authentication
2. **Error Handling**: Improved error handling with user-friendly messages
3. **Type Safety**: Better TypeScript support with proper typing
4. **Consistency**: Follows the same pattern as other API classes
5. **React Integration**: Hooks provide better integration with React components
6. **Security**: Input validation and proper authentication checks

## Migration Strategy

1. **Gradual Migration**: Legacy functions are still available and will continue to work
2. **Start with New Features**: Use the new API for any new functionality
3. **Update Existing Code**: Gradually migrate existing code when making changes
4. **Testing**: Test thoroughly when migrating critical functionality

## Notes

- Legacy functions will log deprecation warnings in development mode
- All new methods require proper authentication through the `useApiClient` hook
- The API class methods can be used in both React and non-React contexts
- Hooks should only be used within React components

## Example: Complete Migration

```typescript
// Before
import { 
  addSchedule, 
  getSchedules, 
  updateSchedule, 
  deleteSchedule 
} from '../app/lib/schedule';

// After
import { ScheduleApi } from '../app/lib/api/scheduleApi';
import { 
  useCreateSchedule,
  useGetSchedules,
  useUpdateSchedule,
  useDeleteSchedule
} from '../hooks/useSchedule';

// In a React component
function MyScheduleComponent() {
  const createSchedule = useCreateSchedule();
  const getSchedules = useGetSchedules();
  const updateSchedule = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();

  // Use the hooks as needed...
}
```
