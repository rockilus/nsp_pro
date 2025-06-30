# Frontend SQS Solve Integration

This document describes the frontend implementation of the AWS SQS-based solve workflow in the NSP Pro scheduling application.

## Overview

The frontend has been enhanced to support both the legacy (Redis+Celery+SSE) and new SQS-based solve workflows through feature flags and component composition. The SQS workflow provides better reliability, scalability, and observability for schedule optimization tasks.

## Architecture Components

### 1. API Client (`sqsSolveApi.ts`)

Located: `frontend/src/app/lib/api/sqsSolveApi.ts`

Provides type-safe API calls to the SQS solve endpoints:
- `startSolve()` - Initiate a new solve request
- `getSolveStatus()` - Check solve progress 
- `getSolveResult()` - Retrieve completed solve results
- `cancelSolve()` - Cancel an in-progress solve

### 2. Polling Service (`sqsSolvePollingService.ts`)

Located: `frontend/src/app/lib/services/sqsSolvePollingService.ts`

Manages automatic status polling with:
- Configurable polling intervals
- Exponential backoff on errors
- Automatic retry with maximum retry limits
- Lifecycle management (start/stop)
- Event callbacks for status changes

### 3. State Management (`SqsSolveContext.tsx`)

Located: `frontend/src/app/lib/contexts/SqsSolveContext.tsx`

React context providing:
- Centralized solve state management
- Automatic state persistence across page refreshes
- Integration with polling service
- Error handling and retry logic

**State Structure:**
```typescript
interface SqsSolveState {
  solveId: string | null;
  status: "IDLE" | "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  result: { schedule?, assignments?, breaches?, requests? } | null;
  isPolling: boolean;
  lastError: string | null;
  retryCount: number;
}
```

### 4. Enhanced UI Components

#### CampaignInfoSqs (`campaign-info-sqs.tsx`)

Enhanced version of the solve button component with:
- Real-time status display ("Queued", "Solving...")
- Progress indicators with circular spinner
- Cancel button during active solves
- Retry button for failed polling
- Success/error notifications
- Responsive button sizing based on status

#### ScheduleNavBar (Enhanced)

Updated to support both workflows via feature flag:
- Conditional rendering of `CampaignInfo` vs `CampaignInfoSqs`
- Backward compatibility with legacy workflow
- Feature flag-driven component selection

## User Experience Flow

### 1. Solve Initiation
- User clicks "Solve" button
- Button shows "Queued" status immediately
- Polling automatically begins

### 2. Progress Monitoring
- Button updates to show "Solving..." with animation
- Progress spinner indicates active processing
- Cancel button allows user to abort
- Status persists across page refreshes

### 3. Completion Handling
- Success: Green notification toast appears
- Results are automatically integrated
- Button returns to normal state
- State is cleared from localStorage

### 4. Error Handling
- Network errors: Automatic retry with backoff
- Solve failures: Error notification with details
- Polling failures: Retry button to resume monitoring
- Clear error states and recovery options

## Configuration

### Environment Variables

Add to `.env.local`:
```bash
NEXT_PUBLIC_USE_SQS_SOLVE=true  # Enable SQS workflow
NEXT_PUBLIC_API_URL=http://localhost:8000  # API base URL
```

### Feature Flag

The SQS workflow is controlled by the `USE_SQS_SOLVE` environment variable imported from `frontend/src/app/lib/env.ts`.

## Integration Points

### Provider Setup

The `SqsSolveProvider` wraps the schedule page:

```tsx
// frontend/src/app/[lng]/plan/schedule/page.tsx
<SqsSolveProvider>
  <ScheduleTab lng={lng} teamWithMembership={selectedTeam} />
</SqsSolveProvider>
```

### Component Usage

```tsx
// In any component within the provider:
import { useSqsSolve } from '../../../app/lib/contexts/SqsSolveContext';

function MyComponent() {
  const { state, startSolve, cancelSolve, isActiveSolve } = useSqsSolve();
  
  // Use state and actions as needed
}
```

## State Persistence

The solve state is automatically persisted to `localStorage` with the key `"sqs-solve-state"` to handle:
- Page refreshes during active solves
- Browser navigation
- Session restoration

Only active solve sessions (`PENDING` or `IN_PROGRESS`) are restored on page load.

## Error Handling Strategy

### Network Errors
- Automatic retry with exponential backoff
- Maximum retry limits to prevent infinite loops
- User notification of retry attempts

### API Errors
- Detailed error messages displayed to user
- Error state preserved in context
- Manual retry options provided

### Polling Failures
- Service automatically stops on max retries
- Retry button allows manual restart
- Error context preserved for debugging

## Translation Support

Added translation keys for all user-facing text:

**English (`en/schedule-page.json`):**
- `queued` - "Queued"
- `cancelSolve` - "Cancel solve"
- `retryPolling` - "Retry status check"
- `solveCompleted` - "Schedule solve completed successfully!"
- `solveError` - "Error occurred during solve process"

Similar translations provided for French and Spanish.

## Development and Testing

### Local Development

1. Set environment variable: `NEXT_PUBLIC_USE_SQS_SOLVE=true`
2. Ensure backend SQS services are running
3. Test both success and failure scenarios

### Testing Scenarios

1. **Normal Flow**: Start solve → Monitor progress → Complete successfully
2. **Cancellation**: Start solve → Cancel mid-process
3. **Page Refresh**: Start solve → Refresh page → Verify state restoration
4. **Network Issues**: Simulate network failures during polling
5. **Backend Errors**: Test backend error responses
6. **Multiple Solves**: Verify prevention of concurrent solves

## Migration Strategy

The implementation supports gradual migration:

1. **Phase 1**: Deploy with `USE_SQS_SOLVE=false` (legacy mode)
2. **Phase 2**: Enable for specific teams/users via feature flags
3. **Phase 3**: Enable globally with `USE_SQS_SOLVE=true`
4. **Phase 4**: Remove legacy code after validation

## Performance Considerations

- **Polling Frequency**: Default 2 seconds, configurable
- **Memory Usage**: State cleared after completion
- **Network Traffic**: Efficient polling with minimal payload
- **Bundle Size**: Tree-shaking eliminates unused workflow code

## Future Enhancements

Potential improvements identified:
- WebSocket integration for real-time updates
- Advanced progress reporting with completion percentage
- Solve result preview before applying changes
- Solve history and audit trail
- Batch solve operations
- Priority queue support

## Troubleshooting

### Common Issues

1. **Feature flag not working**: Check `NEXT_PUBLIC_USE_SQS_SOLVE` is set correctly
2. **Polling not starting**: Verify API connectivity and solve ID
3. **State not persisting**: Check localStorage permissions
4. **Notifications not showing**: Verify Material-UI theme setup

### Debug Information

The context provides debug information through:
- Console logging of state changes
- Error details in notification messages
- Retry counts and timing information
- Local storage inspection
