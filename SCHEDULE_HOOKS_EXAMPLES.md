# Schedule API Migration Examples

This document shows practical examples of how to use the new ScheduleApi and useSchedule hooks in React components.

## Examples

### 1. Simple Schedule Creation Component

```tsx
import React, { useState } from 'react';
import { useCreateSchedule } from '../hooks/useSchedule';
import { TeamWithMembership } from '../types/team';

interface ScheduleCreatorProps {
  teamWithMembership: TeamWithMembership;
  onScheduleCreated?: (schedule: ScheduleT) => void;
}

export function ScheduleCreator({ teamWithMembership, onScheduleCreated }: ScheduleCreatorProps) {
  const [loading, setLoading] = useState(false);
  const createSchedule = useCreateSchedule();

  const handleCreateSchedule = async () => {
    setLoading(true);
    try {
      const newSchedule = await createSchedule(teamWithMembership.team.id);
      onScheduleCreated?.(newSchedule);
      console.log('Schedule created successfully!');
    } catch (error) {
      console.error('Failed to create schedule:', error);
      // Handle error - show toast notification, etc.
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleCreateSchedule} 
      disabled={loading}
    >
      {loading ? 'Creating...' : 'Create New Schedule'}
    </button>
  );
}
```

### 2. Schedule List with Loading States

```tsx
import React, { useState, useEffect } from 'react';
import { useGetSchedules } from '../hooks/useSchedule';
import { ScheduleT } from '../types/schedule';

interface ScheduleListProps {
  teamId: string;
}

export function ScheduleList({ teamId }: ScheduleListProps) {
  const [schedules, setSchedules] = useState<ScheduleT[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const getSchedules = useGetSchedules();

  useEffect(() => {
    const fetchSchedules = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedSchedules = await getSchedules(teamId);
        setSchedules(fetchedSchedules);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch schedules');
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, [teamId, getSchedules]);

  if (loading) return <div>Loading schedules...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h3>Schedules ({schedules.length})</h3>
      {schedules.map((schedule) => (
        <div key={schedule.id}>
          <h4>{schedule.name}</h4>
          <p>Status: {schedule.status}</p>
          <p>Period: {schedule.startDate.format('MMM DD')} - {schedule.endDate.format('MMM DD')}</p>
        </div>
      ))}
    </div>
  );
}
```

### 3. Schedule Update with Error Handling

```tsx
import React, { useState } from 'react';
import { useUpdateSchedule } from '../hooks/useSchedule';
import { ScheduleT } from '../types/schedule';

interface ScheduleEditorProps {
  schedule: ScheduleT;
  onScheduleUpdated?: (schedule: ScheduleT) => void;
}

export function ScheduleEditor({ schedule, onScheduleUpdated }: ScheduleEditorProps) {
  const [name, setName] = useState(schedule.name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const updateSchedule = useUpdateSchedule();

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      const updatedSchedule = await updateSchedule({
        ...schedule,
        name: name.trim(),
      });
      onScheduleUpdated?.(updatedSchedule);
      console.log('Schedule updated successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update schedule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3>Edit Schedule</h3>
      {error && <div style={{ color: 'red' }}>Error: {error}</div>}
      
      <div>
        <label>
          Schedule Name:
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
          />
        </label>
      </div>
      
      <button 
        onClick={handleSave} 
        disabled={loading || !name.trim()}
      >
        {loading ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}
```

### 4. Complex Data Fetching with Multiple Hooks

```tsx
import React, { useState, useEffect } from 'react';
import {
  useGetSchedules,
  useGetScheduleTabData,
  useExportSchedule,
} from '../hooks/useSchedule';
import { TeamWithMembership } from '../types/team';
import { ExportOptionsT } from '../types/schedule';

interface AdvancedScheduleManagerProps {
  teamWithMembership: TeamWithMembership;
}

export function AdvancedScheduleManager({ teamWithMembership }: AdvancedScheduleManagerProps) {
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  
  const getSchedules = useGetSchedules();
  const getScheduleTabData = useGetScheduleTabData();
  const exportSchedule = useExportSchedule();

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        // Fetch comprehensive schedule data
        const tabData = await getScheduleTabData(teamWithMembership.team.id);
        setScheduleData(tabData);
      } catch (error) {
        console.error('Failed to fetch schedule data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [teamWithMembership.team.id, getScheduleTabData]);

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const exportOptions: ExportOptionsT = {
        format: 'pdf',
        dateRange: {
          startDate: dayjs().startOf('month'),
          endDate: dayjs().endOf('month'),
        },
        // Add other export options as needed
      };
      
      await exportSchedule(teamWithMembership.team.id, exportOptions);
      console.log('Schedule exported successfully!');
    } catch (error) {
      console.error('Failed to export schedule:', error);
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) return <div>Loading comprehensive schedule data...</div>;

  return (
    <div>
      <h2>Schedule Manager</h2>
      
      {scheduleData && (
        <div>
          <div>Schedules: {scheduleData.schedule.length}</div>
          <div>Workers: {scheduleData.workers.length}</div>
          <div>Shifts: {scheduleData.shifts.length}</div>
          <div>Assignments: {scheduleData.assignments?.assignmentsRead?.length || 0}</div>
          
          <button 
            onClick={handleExport}
            disabled={exportLoading}
          >
            {exportLoading ? 'Exporting...' : 'Export Schedule'}
          </button>
        </div>
      )}
    </div>
  );
}
```

## Key Benefits Demonstrated

1. **Type Safety**: All hooks return properly typed data
2. **Error Handling**: Comprehensive error handling with user-friendly messages
3. **Loading States**: Easy to manage loading states for better UX
4. **Authentication**: Automatic authentication handling - no manual token management
5. **Reusability**: Hooks can be reused across multiple components
6. **Separation of Concerns**: Business logic separated from UI logic

## Migration Checklist

- [ ] Replace direct function imports with hook imports
- [ ] Initialize hooks at the component level
- [ ] Add error handling with try/catch blocks
- [ ] Update useEffect dependencies to include hook functions
- [ ] Add loading states for better user experience
- [ ] Test all functionality thoroughly
- [ ] Remove legacy function imports once migration is complete

## Common Patterns

### Error Handling Pattern
```tsx
const [error, setError] = useState<string | null>(null);

try {
  const result = await apiHook(params);
  setError(null); // Clear previous errors
  // Handle success
} catch (err) {
  setError(err instanceof Error ? err.message : 'Operation failed');
}
```

### Loading State Pattern
```tsx
const [loading, setLoading] = useState(false);

const handleAction = async () => {
  setLoading(true);
  try {
    await apiHook(params);
  } finally {
    setLoading(false);
  }
};
```
