import React, { useMemo, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import { useTranslation } from '../../app/i18n/client';
// MUI
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import UndoIcon from '@mui/icons-material/Undo';
// Components
import RequestPanel from './request-panel';
import ColumnSortFilterMenu from '../table/ColumnSortFilterMenu';
import TableFilterBar from '../table/TableFilterBar';
// Hooks
import { useTableState } from '../../hooks/useTableState';
// Utils
import {
  getShiftWorkerOptionDisplayText,
  getRequestTargetDisplayText,
  getShiftColors,
  getRequestStatusColor,
  getRequestStatusLabel,
} from '../../utils/shift-worker-option-display';
// Styles
import '../../styles/table-styles.css';
import './request-table.css';
// Types
import { WorkerT } from '../../types/worker';
import {
  RequestT,
  RequestStatus,
  FulfillmentStatus,
  RequestType,
  RequestViewSettingsT,
} from '../../types/request';
import { ShiftT } from '../../types/shift';
import { TeamMembershipRole } from '@/types/team';
import { ShiftWorkerOptionT } from '@/types/constraint';
import { ColumnDefinition, ColumnFilter } from '../../types/filter';
import { RequestDeadlineT } from '../../types/schedule';

// Helper components for better organization
const WorkerCell = ({ request, workers, t }: { request: RequestT; workers: WorkerT[]; t: any }) => {
  const worker = workers.find((w) => w.id === request.workerId);
  return (
    <div className="flex flex-col">
      <span className="font-medium">{worker?.name || t('unknown')}</span>
      {worker?.deleted && <span className="text-xs text-red-500">{t('worker')} deleted</span>}
    </div>
  );
};

const ShiftCell = ({
  request,
  shifts,
  workers,
  t,
}: {
  request: RequestT;
  shifts: ShiftT[];
  workers: WorkerT[];
  t: any;
}) => {
  // Get shift colors for consistent styling
  const shiftColors = getShiftColors(request, shifts);

  if (request.requestType === RequestType.LEAVE) {
    if (!request.shiftId) {
      return <Chip label={t('all_day')} size="small" variant="outlined" />;
    }
    const shift = shifts.find((s) => s.id === request.shiftId);

    // If shift is deleted, show it as plain text with error message
    if (shift?.deleted) {
      return (
        <div className="flex flex-col">
          <span>{shift?.name || t('unknown')}</span>
          <span className="text-xs text-red-500">{t('shift')} deleted</span>
        </div>
      );
    }

    // Otherwise, show as a chip with shift colors (like work requests)
    return (
      <div className="flex flex-wrap gap-1">
        <Chip
          label={shift?.name || 'Unknown'}
          size="small"
          variant="filled"
          sx={{
            ...(shiftColors && {
              backgroundColor: shiftColors.background,
              color: shiftColors.text,
              borderColor: shiftColors.sample,
            }),
          }}
        />
      </div>
    );
  } else {
    // Work request - show shift preferences
    if (request.shiftOptions.length === 0) {
      return <Chip label={t('no_preferences')} size="small" variant="outlined" />;
    }

    const displayText = getRequestTargetDisplayText(request, workers, shifts, t('not'));

    return (
      <div className="flex flex-wrap gap-1">
        <Chip
          label={displayText}
          size="small"
          variant="filled"
          sx={{
            ...(shiftColors && {
              backgroundColor: shiftColors.background,
              color: shiftColors.text,
              borderColor: shiftColors.sample,
            }),
          }}
        />
      </div>
    );
  }
};

const DateCell = ({ request, lng, t }: { request: RequestT; lng: string; t: any }) => {
  // Use localized formatting on the date object (assumes dayjs/moment-like API)
  const start = request.startDate.locale ? request.startDate.locale(lng) : request.startDate;
  const end = request.endDate.locale ? request.endDate.locale(lng) : request.endDate;

  if (start.isSame(end, 'day')) {
    return (
      <div className="flex flex-col">
        <span className="font-medium">{start.format('MMM D')}</span>
        <span className="table-helper-text">{start.format('dddd')}</span>
      </div>
    );
  } else {
    return (
      <div className="flex flex-col">
        <span className="font-medium">
          {start.format('MMM D')} - {end.format('MMM D')}
        </span>
        <span className="table-helper-text">
          {start.format('ddd')} - {end.format('ddd')}
        </span>
      </div>
    );
  }
};

const TypeCell = ({ request, t }: { request: RequestT; t: any }) => {
  const isWork = request.requestType === RequestType.WORK_DEMAND;
  return (
    <div className="flex flex-col items-start gap-1">
      <Chip
        label={isWork ? t('work') : t('leave')}
        size="small"
        color={isWork ? 'primary' : 'secondary'}
        variant="filled"
      />
      {/* <Chip
        label={request.hard ? "Hard" : "Soft"}
        size="small"
        variant="outlined"
        color={request.hard ? "error" : "default"}
      /> */}
    </div>
  );
};

const StatusCell = ({ request, t }: { request: RequestT; t: any }) => {
  return (
    <Chip
      label={getRequestStatusLabel(request.status, t)}
      size="small"
      color={getRequestStatusColor(request.status)}
      variant="filled"
    />
  );
};

const FulfillmentCell = ({ request, t }: { request: RequestT; t: any }) => {
  const getFulfillmentColor = (fulfillment: FulfillmentStatus) => {
    switch (fulfillment) {
      case FulfillmentStatus.FULFILLED:
        return 'success';
      case FulfillmentStatus.UNFULFILLED:
        return 'error';
      default:
        return 'default';
    }
  };

  const getFulfillmentLabel = (fulfillment: FulfillmentStatus) => {
    switch (fulfillment) {
      case FulfillmentStatus.FULFILLED:
        return `✅ ${t('fulfilled')}`;
      case FulfillmentStatus.UNFULFILLED:
        return `❌ ${t('unfulfilled')}`;
      case FulfillmentStatus.NOT_PROCESSED:
        return t('not_processed');
      default:
        return t('unknown');
    }
  };

  return (
    <Chip
      label={getFulfillmentLabel(request.fulfillment)}
      size="small"
      color={getFulfillmentColor(request.fulfillment)}
      variant="outlined"
    />
  );
};

const ActionsCell = ({
  request,
  lng,
  workers,
  shifts,
  shiftOptions,
  userWorkerId,
  userTeamRole,
  handleUpdateRequest,
  handleDeleteRequest,
  handleRescindRequest,
  handleAcceptRequest,
  handleDenyRequest,
}: {
  request: RequestT;
  lng: string;
  workers: WorkerT[];
  shifts: ShiftT[];
  shiftOptions: ShiftWorkerOptionT[];
  userWorkerId: string | null;
  userTeamRole: TeamMembershipRole;
  handleUpdateRequest: (request: RequestT) => void;
  handleDeleteRequest: (requestId: string) => void;
  handleRescindRequest: (requestId: string) => void;
  handleAcceptRequest: (requestId: string) => void;
  handleDenyRequest: (requestId: string) => void;
}) => {
  const { t } = useTranslation(lng, 'request-page');
  const canEdit =
    userTeamRole !== TeamMembershipRole.MEMBER ||
    (userWorkerId && request.workerId === userWorkerId);

  const canApprove =
    userTeamRole === TeamMembershipRole.OWNER && request.status === RequestStatus.PENDING;

  const canRescind =
    userTeamRole === TeamMembershipRole.OWNER &&
    (request.status === RequestStatus.APPROVED || request.status === RequestStatus.DENIED);

  return (
    <div className="flex items-center gap-1">
      <RequestPanel
        lng={lng}
        teamId={request.teamId}
        isEdit={true}
        request={request}
        workers={workers.filter((worker) => !worker.deleted)}
        shifts={shifts.filter((shift) => !shift.deleted)}
        shiftOptions={shiftOptions}
        userWorkerId={userWorkerId}
        userTeamRole={userTeamRole}
        handleAddRequest={handleUpdateRequest}
        handleUpdateRequest={handleUpdateRequest}
        handleDeleteRequest={handleDeleteRequest}
        handleRescindRequest={handleRescindRequest}
        handleAcceptRequest={handleAcceptRequest}
        handleDenyRequest={handleDenyRequest}
      />

      {canApprove && (
        <IconButton
          size="small"
          onClick={() => handleAcceptRequest(request.id)}
          title={t('approve_request')}
          color="success"
          data-testid={`approve-request-button-${request.id}`}
        >
          <CheckIcon />
        </IconButton>
      )}

      {canApprove && (
        <IconButton
          size="small"
          onClick={() => handleDenyRequest(request.id)}
          title={t('reject_request')}
          color="error"
          data-testid={`reject-request-button-${request.id}`}
        >
          <CloseIcon />
        </IconButton>
      )}

      {canRescind && (
        <IconButton
          size="small"
          onClick={() => handleRescindRequest(request.id)}
          title={
            request.status === RequestStatus.APPROVED
              ? t('rescind_approval')
              : t('rescind_rejection')
          }
          color="warning"
          data-testid={`rescind-request-button-${request.id}`}
        >
          <UndoIcon />
        </IconButton>
      )}

      <IconButton
        size="small"
        disabled={!canEdit}
        onClick={() => handleDeleteRequest(request.id)}
        title={t('delete_request')}
        color="error"
        data-testid={`delete-request-button-${request.id}`}
      >
        <DeleteIcon />
      </IconButton>
    </div>
  );
};

export default function RequestTable({
  lng,
  teamId,
  requests,
  workers,
  shifts,
  shiftOptions,
  userWorkerId,
  userTeamRole,
  handleUpdateRequest,
  handleDeleteRequest,
  handleRescindRequest,
  handleAcceptRequest,
  handleDenyRequest,
  showPastRequests,
  viewSettings,
  onUpdateViewSettings,
  requestDeadline,
}: {
  lng: string;
  teamId: string;
  requests: RequestT[];
  workers: WorkerT[];
  shifts: ShiftT[];
  shiftOptions: ShiftWorkerOptionT[];
  userWorkerId: string | null;
  userTeamRole: TeamMembershipRole;
  handleUpdateRequest: (request: RequestT) => void;
  handleDeleteRequest: (requestId: string) => void;
  handleRescindRequest: (requestId: string) => void;
  handleAcceptRequest: (requestId: string) => void;
  handleDenyRequest: (requestId: string) => void;
  showPastRequests: boolean;
  viewSettings: RequestViewSettingsT;
  onUpdateViewSettings: (updates: Partial<RequestViewSettingsT>) => void;
  requestDeadline?: RequestDeadlineT;
}) {
  const { t } = useTranslation(lng, 'request-page');

  // Helper function to check if request is in the past
  const isRequestPast = (request: RequestT) => {
    return request.endDate.isBefore(new Date(), 'day');
  };

  // Simplified column definitions focused on the actual requirements
  const columns: ColumnDefinition[] = useMemo(
    () => [
      {
        id: 'workerId',
        label: t('worker'),
        type: 'select' as const,
        getValue: (request: RequestT) => request.workerId,
        getDisplayValue: (request: RequestT) => {
          const worker = workers.find((w) => w.id === request.workerId);
          return worker ? worker.name : 'Unknown';
        },
        getOptions: () =>
          workers.map((worker) => ({
            value: worker.id,
            label: worker.name,
          })),
      },
      {
        id: 'shift',
        label: t('shift'),
        type: 'select' as const,
        getValue: (request: RequestT) => {
          if (request.requestType === RequestType.LEAVE) {
            return request.shiftId || 'all_day';
          }
          return request.shiftOptions.map((opt) => opt.id).join(',') || 'no_preferences';
        },
        getDisplayValue: (request: RequestT) => {
          if (request.requestType === RequestType.LEAVE) {
            if (!request.shiftId) return t('all_day');
            const shift = shifts.find((s) => s.id === request.shiftId);
            return shift ? shift.name : t('unknown');
          }
          return request.shiftOptions.length > 0
            ? request.shiftOptions.map((opt) => opt.name).join(', ')
            : t('no_preferences');
        },
        getOptions: () => [
          { value: 'all_day', label: t('all_day') },
          { value: 'no_preferences', label: t('no_preferences') },
          ...shifts.map((shift) => ({
            value: shift.id,
            label: shift.name,
          })),
        ],
      },
      {
        id: 'date',
        label: t('date'),
        type: 'date' as const,
        getValue: (request: RequestT) => request.startDate.format('YYYY-MM-DD'),
        getDisplayValue: (request: RequestT) => {
          if (request.startDate.isSame(request.endDate, 'day')) {
            return request.startDate.format('MMM D, YYYY');
          }
          return `${request.startDate.format('MMM D')} - ${request.endDate.format('MMM D, YYYY')}`;
        },
      },
      {
        id: 'requestType',
        label: t('type'),
        type: 'select' as const,
        getValue: (request: RequestT) => request.requestType,
        getDisplayValue: (request: RequestT) =>
          request.requestType === RequestType.WORK_DEMAND ? t('work') : t('leave'),
        getOptions: () => [
          { value: RequestType.WORK_DEMAND, label: t('work') },
          { value: RequestType.LEAVE, label: t('leave') },
        ],
      },
      {
        id: 'status',
        label: t('status'),
        type: 'select' as const,
        getValue: (request: RequestT) => request.status,
        getOptions: () => [
          { value: RequestStatus.PENDING, label: t('pending') },
          { value: RequestStatus.APPROVED, label: t('approved') },
          { value: RequestStatus.DENIED, label: t('rejected') },
          // { value: RequestStatus.DEFERRED, label: t("deferred") },
        ],
      },
      {
        id: 'fulfillment',
        label: t('fulfillment'),
        type: 'select' as const,
        getValue: (request: RequestT) => request.fulfillment,
        getOptions: () => [
          { value: FulfillmentStatus.NOT_PROCESSED, label: t('not_processed') },
          { value: FulfillmentStatus.FULFILLED, label: t('fulfilled') },
          { value: FulfillmentStatus.UNFULFILLED, label: t('unfulfilled') },
        ],
      },
      ...(userTeamRole !== TeamMembershipRole.MEMBER
        ? [
            {
              id: 'createdAt',
              label: t('submitted_on'),
              type: 'date' as const,
              getValue: (request: RequestT) => request.createdAt.format('YYYY-MM-DD'),
              getDisplayValue: (request: RequestT) => request.createdAt.format('MMM D, YYYY'),
            },
          ]
        : []),
    ],
    [workers, shifts, t, userTeamRole],
  );

  // Table state for filtering requests (in-memory only, synced with parent viewSettings)
  // Don't persist here - parent useRequestViewSettings handles all persistence
  const {
    tableState,
    filteredAndSortedData,
    addFilter: addFilterInternal,
    removeFilter: removeFilterInternal,
    updateSort: updateSortInternal,
    resetAll: resetAllInternal,
  } = useTableState(requests, columns, undefined); // No storage key - parent manages persistence

  // Sync viewSettings filters/sort into local tableState when they change
  useEffect(() => {
    // Only update if different to avoid infinite loops
    const filtersChanged =
      JSON.stringify(viewSettings.filters) !== JSON.stringify(tableState.filters);
    const sortChanged = JSON.stringify(viewSettings.sort) !== JSON.stringify(tableState.sort);

    if (filtersChanged || sortChanged) {
      // Update internal state to match parent
      viewSettings.filters.forEach((filter: ColumnFilter) => addFilterInternal(filter));
      if (viewSettings.sort !== tableState.sort) {
        updateSortInternal(viewSettings.sort);
      }
    }
  }, [
    viewSettings.filters,
    viewSettings.sort,
    tableState.filters,
    tableState.sort,
    addFilterInternal,
    updateSortInternal,
  ]);

  // Wrapped callbacks that update both local state and parent viewSettings
  const addFilter = useCallback(
    (filter: ColumnFilter) => {
      addFilterInternal(filter);
      onUpdateViewSettings({
        filters: [...viewSettings.filters.filter((f: ColumnFilter) => f.id !== filter.id), filter],
      });
    },
    [addFilterInternal, onUpdateViewSettings, viewSettings.filters],
  );

  const removeFilter = useCallback(
    (filterId: string) => {
      removeFilterInternal(filterId);
      onUpdateViewSettings({
        filters: viewSettings.filters.filter((f: ColumnFilter) => f.id !== filterId),
      });
    },
    [removeFilterInternal, onUpdateViewSettings, viewSettings.filters],
  );

  const updateSort = useCallback(
    (sort: any) => {
      updateSortInternal(sort);
      onUpdateViewSettings({ sort });
    },
    [updateSortInternal, onUpdateViewSettings],
  );

  const resetAll = useCallback(() => {
    resetAllInternal();
    onUpdateViewSettings({ filters: [], sort: null });
  }, [resetAllInternal, onUpdateViewSettings]);

  return (
    <div className="w-full">
      <TableFilterBar
        lng={lng}
        filters={tableState.filters}
        sort={tableState.sort}
        onRemoveFilter={removeFilter}
        onRemoveSort={() => updateSort(null)}
        onResetAll={resetAll}
      />

      <TableContainer
        className="request-table-container"
        data-testid="request-table"
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '8px',
        }}
      >
        <Table size="small" aria-label="requests table">
          <TableHead>
            <TableRow sx={{ backgroundColor: (theme) => theme.palette.grey[50] }}>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  sx={{
                    fontWeight: 600,
                    color: (theme) => theme.palette.grey[700],
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span>{column.label}</span>
                    <ColumnSortFilterMenu
                      column={column}
                      currentSort={
                        tableState.sort?.columnId === column.id ? tableState.sort : undefined
                      }
                      currentFilter={tableState.filters.find((f) => f.id === column.id)}
                      onSort={updateSort}
                      onFilter={addFilter}
                    />
                  </div>
                </TableCell>
              ))}
              <TableCell
                sx={{
                  fontWeight: 600,
                  color: (theme) => theme.palette.grey[700],
                  width: '8rem',
                }}
              >
                <span />
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAndSortedData.map((request) => {
              const isPast = isRequestPast(request);
              return (
                <TableRow
                  key={request.id}
                  sx={{
                    '&:last-child td, &:last-child th': { border: 0 },
                    '&:hover': {
                      backgroundColor: (theme) => theme.palette.grey[50],
                    },
                    ...(!request.active ? { opacity: 0.5 } : {}),
                    ...(isPast && showPastRequests
                      ? {
                          backgroundColor: (theme) => theme.palette.grey[100],
                          opacity: 0.75,
                          '& .MuiTableCell-root': { color: 'text.secondary' },
                        }
                      : {}),
                  }}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <WorkerCell request={request} workers={workers} t={t} />
                      {isPast && showPastRequests && (
                        <Chip
                          label={t('past') || 'Past'}
                          size="small"
                          variant="outlined"
                          color="default"
                          sx={{ fontSize: '0.75rem', opacity: 0.6 }}
                        />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <ShiftCell request={request} shifts={shifts} workers={workers} t={t} />
                  </TableCell>
                  <TableCell>
                    <DateCell request={request} lng={lng} t={t} />
                  </TableCell>
                  <TableCell>
                    <TypeCell request={request} t={t} />
                  </TableCell>
                  <TableCell>
                    <StatusCell request={request} t={t} />
                  </TableCell>
                  <TableCell>
                    <FulfillmentCell request={request} t={t} />
                  </TableCell>
                  {userTeamRole !== TeamMembershipRole.MEMBER && (
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span>{request.createdAt.format('MMM D, YYYY')}</span>
                        {requestDeadline?.deadlineDate && (
                          <Chip
                            label={
                              request.createdAt.isBefore(requestDeadline.deadlineDate, 'day') ||
                              request.createdAt.isSame(requestDeadline.deadlineDate, 'day')
                                ? t('before_deadline')
                                : t('after_deadline')
                            }
                            size="small"
                            color={
                              request.createdAt.isBefore(requestDeadline.deadlineDate, 'day') ||
                              request.createdAt.isSame(requestDeadline.deadlineDate, 'day')
                                ? 'success'
                                : 'error'
                            }
                            variant="outlined"
                            data-testid="request-created-at-chip"
                          />
                        )}
                      </div>
                    </TableCell>
                  )}
                  <TableCell>
                    <ActionsCell
                      request={request}
                      lng={lng}
                      workers={workers}
                      shifts={shifts}
                      shiftOptions={shiftOptions}
                      userWorkerId={userWorkerId}
                      userTeamRole={userTeamRole}
                      handleUpdateRequest={handleUpdateRequest}
                      handleDeleteRequest={handleDeleteRequest}
                      handleRescindRequest={handleRescindRequest}
                      handleAcceptRequest={handleAcceptRequest}
                      handleDenyRequest={handleDenyRequest}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}
