import { ColumnDefinition } from '../../types/filter';
import { WorkerT } from '../../types/worker';
import { ShiftT } from '../../types/shift';
import { RequestT, RequestType, RequestStatus, FulfillmentStatus } from '../../types/request';

export const createWorkerColumns = (
  t: (key: string) => string,
  workers: WorkerT[] = [],
  shifts: ShiftT[] = [],
): ColumnDefinition[] => {
  // Generate unique worker identifiers from the actual workers data
  const uniqueWorkers = workers.map((worker) => ({
    value: worker.id,
    label: worker.name,
  }));

  return [
    {
      id: 'workerId',
      label: t('worker'),
      type: 'select' as const,
      getValue: (worker: WorkerT) => worker.id,
      getDisplayValue: (worker: WorkerT) => worker.name,
      getOptions: () => uniqueWorkers,
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
          if (!request.shiftId) return 'All Day';
          const shift = shifts.find((s) => s.id === request.shiftId);
          return shift ? shift.name : 'Unknown';
        }
        return request.shiftOptions.length > 0
          ? request.shiftOptions.map((opt) => opt.name).join(', ')
          : 'No Preferences';
      },
      getOptions: () => [
        { value: 'all_day', label: 'All Day' },
        { value: 'no_preferences', label: 'No Preferences' },
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
        request.requestType === RequestType.WORK_DEMAND ? 'Work' : 'Leave',
      getOptions: () => [
        { value: RequestType.WORK_DEMAND, label: 'Work' },
        { value: RequestType.LEAVE, label: 'Leave' },
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
      ],
    },
    {
      id: 'fulfillment',
      label: t('fulfillment'),
      type: 'select' as const,
      getValue: (request: RequestT) => request.fulfillment,
      getOptions: () => [
        { value: FulfillmentStatus.NOT_PROCESSED, label: 'Not Processed' },
        { value: FulfillmentStatus.FULFILLED, label: 'Fulfilled' },
        { value: FulfillmentStatus.UNFULFILLED, label: 'Unfulfilled' },
      ],
    },
  ];
};
