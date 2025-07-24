# Assignment API Migration Guide

This guide helps you migrate from the legacy assignment functions to the new `AssignmentApi` class and `useAssignment` hooks.

## Overview

The assignment API has been refactored to follow the same pattern as `TeamApi` and `UserApi`, providing:

- **Type-safe API methods** with proper error handling
- **React hooks** for seamless integration with components
- **Authentication integration** with AWS Cognito
- **Security best practices** with input validation
- **Consistent error handling** across all API calls

## Migration Steps

### 1. Replace Direct Function Calls with API Class

**Before (Legacy):**
```typescript
import { addAssignmentAndRecurrence } from '../lib/assignment';

const result = await addAssignmentAndRecurrence(assignment, recurrence);
```

**After (New API):**
```typescript
import { AssignmentApi } from '../lib/api/assignmentApi';
import { useApiClient } from '../lib/api-client';

const apiClient = useApiClient();
const result = await AssignmentApi.addAssignmentAndRecurrence(apiClient, assignment, recurrence);
```

### 2. Use React Hooks in Components

**Before (Legacy):**
```typescript
import { getAssignmentsByDates } from '../lib/assignment';

const MyComponent = () => {
  const [assignments, setAssignments] = useState([]);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getAssignmentsByDates(teamId, startDate, endDate);
        setAssignments(result.assignments);
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, [teamId, startDate, endDate]);
  
  // Component JSX...
};
```

**After (New Hooks):**
```typescript
import { useGetAssignmentsByDates } from '../hooks/useAssignment';

const MyComponent = () => {
  const [assignments, setAssignments] = useState([]);
  const getAssignmentsByDates = useGetAssignmentsByDates();
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getAssignmentsByDates(teamId, startDate, endDate);
        setAssignments(result.assignments);
      } catch (error) {
        console.error(error);
        // Error already logged by hook
      }
    };
    fetchData();
  }, [getAssignmentsByDates, teamId, startDate, endDate]);
  
  // Component JSX...
};
```

## Available API Methods

### AssignmentApi Class Methods

```typescript
// Add assignment with recurrence
AssignmentApi.addAssignmentAndRecurrence(apiClient, assignment, recurrence?)

// Get assignments by date range
AssignmentApi.getAssignmentsByDates(apiClient, teamId, startDate?, endDate?)

// Get validated assignments
AssignmentApi.getValidatedAssignments(apiClient, teamId, startDate?, endDate?)

// Update assignment with recurrence
AssignmentApi.updateAssignmentAndRecurrence(apiClient, assignment, teamId, recurrenceRule?, recurrenceUpdateScope?)

// Delete assignment
AssignmentApi.deleteAssignment(apiClient, assignmentId, teamId, recurrenceId?, recurrenceUpdateScope?)
```

### React Hooks

```typescript
// Add assignment hook
const addAssignmentAndRecurrence = useAddAssignmentAndRecurrence();

// Get assignments hook
const getAssignmentsByDates = useGetAssignmentsByDates();

// Get validated assignments hook
const getValidatedAssignments = useGetValidatedAssignments();

// Update assignment hook
const updateAssignmentAndRecurrence = useUpdateAssignmentAndRecurrence();

// Delete assignment hook
const deleteAssignment = useDeleteAssignment();
```

## Benefits of the New API

### 🔒 Enhanced Security
- Automatic authentication validation
- Input sanitization and validation
- Secure error handling without data leaks

### 🎯 Type Safety
- Full TypeScript support
- Compile-time error checking
- Better IDE autocompletion

### 🔄 Consistent Pattern
- Same pattern as other APIs (Team, User)
- Predictable method signatures
- Standardized error handling

### 🪝 React Integration
- Custom hooks for React components
- Automatic loading state management
- Built-in authentication checks

### 🐛 Better Error Handling
- User-friendly error messages
- Detailed logging in development
- Graceful error recovery

## Migration Status

### ✅ Completed
- **AssignmentApi Class** - Created with full authentication and type safety
- **useAssignment Hooks** - Created for React component integration  
- **ScheduleTab Component** - Migrated to use new assignment hooks
- **ScheduleApi Class** - Updated to use all new API classes (Assignment, Worker, Shift, Request, Stats, Specialty)
- **Legacy Functions** - Marked as deprecated with warnings
- **Legacy Methods Removed** - All legacy methods in ScheduleApi updated to throw migration errors

### � ScheduleApi Modernization
- **Before**: Mixed authenticated and unauthenticated calls
- **After**: All API calls now require authenticated clients
- **Removed**: All working legacy methods (now throw errors to force migration)
- **Updated**: All data fetching methods to use proper API classes

#### Updated Methods:
- `getScheduleTabData()` - Now uses WorkerApi, ShiftApi, RequestApi, StatsApi, AssignmentApi
- `getScheduleAssignmentsData()` - Now uses WorkerApi, ShiftApi, AssignmentApi  
- `getScheduleAssignmentsDataMember()` - Now uses WorkerApi, ShiftApi, AssignmentApi
- `getScheduleLHSData()` - Now uses RequestApi, StatsApi, SpecialtyApi

### �📋 Migration Checklist

- [x] Create AssignmentApi class with authenticated methods
- [x] Create useAssignment hooks for React components
- [x] Update ScheduleTab component to use new hooks
- [x] Update ScheduleApi to use new API classes for all entities
- [x] Remove functional legacy methods (replaced with error-throwing stubs)
- [x] Add deprecation warnings to legacy functions
- [x] Remove direct imports of legacy assignment functions
- [x] Test authentication flows
- [x] Verify error handling works correctly

### 🎯 Next Migration Targets
- **BreachApi** - Create authenticated API class for breach operations
- **schedule.ts** - Migrate remaining legacy functions to use authenticated APIs
- **Individual hooks** - Create useWorker, useShift, useRequest, useStats hooks for React components

## Legacy Support

The legacy functions in `assignment.ts` are still available but deprecated. They now internally use the new API class and will show deprecation warnings in the console.

**Remove legacy imports when migration is complete:**
```typescript
// Remove these imports:
import { addAssignmentAndRecurrence } from '../lib/assignment'; // ❌ Deprecated

// Use these instead:
import { AssignmentApi } from '../lib/api/assignmentApi'; // ✅ New API
import { useAddAssignmentAndRecurrence } from '../hooks/useAssignment'; // ✅ New Hook
```

## Example: Complete Component Migration

**Before:**
```typescript
import React, { useState, useEffect } from 'react';
import { getAssignmentsByDates, addAssignmentAndRecurrence } from '../lib/assignment';

const AssignmentManager = ({ teamId }) => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const result = await getAssignmentsByDates(teamId);
      setAssignments(result.assignments);
    } catch (error) {
      console.error('Failed to load assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAssignment = async (assignment) => {
    try {
      await addAssignmentAndRecurrence(assignment);
      await loadAssignments(); // Reload
    } catch (error) {
      console.error('Failed to add assignment:', error);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, [teamId]);

  return (
    <div>
      {loading ? 'Loading...' : assignments.length + ' assignments'}
    </div>
  );
};
```

**After:**
```typescript
import React, { useState, useEffect } from 'react';
import { useGetAssignmentsByDates, useAddAssignmentAndRecurrence } from '../hooks/useAssignment';

const AssignmentManager = ({ teamId }) => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const getAssignmentsByDates = useGetAssignmentsByDates();
  const addAssignmentAndRecurrence = useAddAssignmentAndRecurrence();

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const result = await getAssignmentsByDates(teamId);
      setAssignments(result.assignments);
    } catch (error) {
      console.error('Failed to load assignments:', error);
      // Error already logged by hook with auth context
    } finally {
      setLoading(false);
    }
  };

  const handleAddAssignment = async (assignment) => {
    try {
      await addAssignmentAndRecurrence(assignment);
      await loadAssignments(); // Reload
    } catch (error) {
      console.error('Failed to add assignment:', error);
      // Error already logged by hook with auth context
    }
  };

  useEffect(() => {
    loadAssignments();
  }, [getAssignmentsByDates, teamId]); // Include hook in dependencies

  return (
    <div>
      {loading ? 'Loading...' : assignments.length + ' assignments'}
    </div>
  );
};
```

## Support

If you encounter any issues during migration, please:

1. Check that authentication is properly set up
2. Verify all required dependencies are imported
3. Ensure the API client is available in your component context
4. Review console logs for detailed error messages

For additional help, refer to the existing `TeamApi` and `UserApi` implementations as examples.
