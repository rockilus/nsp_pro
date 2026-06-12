import React, { useState } from 'react';
import dayjs from 'dayjs';
import { useTranslation } from '@/app/i18n/client';
// shadcn
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { FormActions } from '@/components/common/form-layout';
import { Separator } from '@/components/ui/separator';
// Icons
import { Users, Briefcase, Check, X, Trash2, Undo2, X as XIcon } from 'lucide-react';
// Components
import ShiftOptionsDisplay from '@/components/stats/nav-bar/shift-options-display';
// Utils
import { getRequestStatusColor, getRequestStatusLabel } from '@/utils/shift-worker-option-display';
// Types
import { RequestT, RequestStatus, RequestType, FulfillmentStatus } from '@/types/request';
import { ShiftT, ShiftType, ShiftRestType } from '@/types/shift';
import { WorkerT } from '@/types/worker';
import { TeamMembershipRole } from '@/types/team';
import { ShiftWorkerOptionT, SWOIdTypes } from '@/types/constraint';

const RequestForm = ({
  lng,
  teamId,
  isEdit,
  request = null,
  workers,
  shifts,
  shiftOptions,
  userWorkerId,
  userTeamRole,
  handleAddRequest,
  handleUpdateRequest,
  handleDeleteRequest,
  handleRescindRequest,
  handleAcceptRequest,
  handleDenyRequest,
  onClose,
  fullWidth = false,
  isMobile = false,
  title,
}: {
  lng: string;
  teamId: string;
  isEdit: boolean;
  request?: RequestT | null;
  workers: WorkerT[];
  shifts: ShiftT[];
  shiftOptions: ShiftWorkerOptionT[];
  userWorkerId: string | null;
  userTeamRole: TeamMembershipRole;
  handleAddRequest?: (request: RequestT) => void;
  handleUpdateRequest?: (request: RequestT) => void;
  handleDeleteRequest?: (requestId: string) => void;
  handleRescindRequest?: (requestId: string) => void;
  handleAcceptRequest?: (requestId: string) => void;
  handleDenyRequest?: (requestId: string) => void;
  onClose?: () => void;
  fullWidth?: boolean;
  isMobile?: boolean;
  title?: string;
}) => {
  const { t } = useTranslation(lng, 'request-page');

  const createDefaultRequest = (): RequestT => ({
    id: '',
    teamId: teamId,
    requestType: RequestType.WORK_DEMAND,
    workerId: userWorkerId || '',
    startDate: dayjs.utc().startOf('day'),
    endDate: dayjs.utc().startOf('day'),
    shiftId: null,
    shiftOptions: [],
    negative: false,
    hard: true,
    status: RequestStatus.PENDING,
    fulfillment: FulfillmentStatus.NOT_PROCESSED,
    comment: '',
    createdAt: dayjs.utc(),
    active: true,
    shiftTargetIds: [],
    missingAttributes: [],
  });

  const [requestState, setRequestState] = useState<RequestT>(
    isEdit && request ? request : createDefaultRequest(),
  );
  const [dateRange, setDateRange] = useState<boolean>(
    isEdit && request ? !request.startDate.isSame(request.endDate, 'day') : false,
  );
  const [requestType, setRequestType] = useState<RequestType>(
    isEdit && request ? request.requestType : RequestType.WORK_DEMAND,
  );

  const [workerIdError, setWorkerIdError] = useState(false);
  const [startDateError, setStartDateError] = useState(false);
  const [endDateError, setEndDateError] = useState(false);
  const [shiftIdError, setShiftIdError] = useState(false);
  const [shiftOptionsError, setShiftOptionsError] = useState(false);

  const canEdit =
    userTeamRole !== TeamMembershipRole.MEMBER ||
    (userWorkerId && requestState.workerId === userWorkerId);

  const canApprove =
    userTeamRole === TeamMembershipRole.OWNER && requestState.status === RequestStatus.PENDING;

  const canRescind =
    userTeamRole === TeamMembershipRole.OWNER &&
    (requestState.status === RequestStatus.APPROVED ||
      requestState.status === RequestStatus.DENIED);

  function filterShiftsByRequestType(shifts: ShiftT[], requestType: RequestType): ShiftT[] {
    return shifts.filter((s) => {
      if (requestType === RequestType.WORK_DEMAND) {
        return !s.deleted && (s.shiftType === ShiftType.NORMAL || s.shiftType === ShiftType.DUTY);
      } else {
        return (
          !s.deleted &&
          (s.shiftType === ShiftType.REST || s.shiftType === ShiftType.LEAVE) &&
          (s.restType === ShiftRestType.OFF || s.restType === ShiftRestType.NONE)
        );
      }
    });
  }

  function filterShiftOptions(
    shiftOptions: ShiftWorkerOptionT[],
    shifts: ShiftT[],
  ): ShiftWorkerOptionT[] {
    const normalDutyShiftIds = shifts
      .filter(
        (s) => !s.deleted && (s.shiftType === ShiftType.NORMAL || s.shiftType === ShiftType.DUTY),
      )
      .map((s) => s.id);

    return shiftOptions.filter((opt) => {
      if (opt.categoryName === 'All') return false;
      if (opt.idType === SWOIdTypes.SHIFT && !normalDutyShiftIds.includes(opt.id)) {
        return false;
      }
      return true;
    });
  }

  const handleEditSelectedShifts = (selectedShifts: ShiftWorkerOptionT[]) => {
    if (requestType === RequestType.LEAVE) return;

    const newRequestState: RequestT = {
      ...requestState,
      shiftOptions: selectedShifts,
    };
    setRequestState(newRequestState);
  };

  React.useEffect(() => {
    if (request) {
      setRequestState(request);
      setRequestType(request.requestType);
      setDateRange(!request.startDate.isSame(request.endDate, 'day'));
    }
  }, [request, isEdit]);

  const handleSaveRequest = async () => {
    setWorkerIdError(false);
    setStartDateError(false);
    setEndDateError(false);
    setShiftIdError(false);
    setShiftOptionsError(false);

    let hasError = false;

    if (!requestState.workerId || requestState.workerId.trim() === '') {
      setWorkerIdError(true);
      hasError = true;
    }

    const today = dayjs.utc().startOf('day');
    if (!requestState.startDate || !requestState.startDate.isAfter(today.subtract(1, 'day'))) {
      setStartDateError(true);
      hasError = true;
    }

    if (!requestState.endDate || requestState.endDate.isBefore(requestState.startDate, 'day')) {
      setEndDateError(true);
      hasError = true;
    }

    if (requestType === RequestType.LEAVE) {
      if (!requestState.shiftId || requestState.shiftId === '') {
        setShiftIdError(true);
        hasError = true;
      }
      if (requestState.shiftOptions && requestState.shiftOptions.length > 0) {
        setShiftOptionsError(true);
        hasError = true;
      }
    }

    if (requestType === RequestType.WORK_DEMAND) {
      if (requestState.shiftId !== null) {
        setShiftIdError(true);
        hasError = true;
      }
      if (!requestState.shiftOptions || requestState.shiftOptions.length === 0) {
        setShiftOptionsError(true);
        hasError = true;
      }
    }

    if (hasError) return;

    if (!isEdit) {
      if (!handleAddRequest) return;
      await handleAddRequest(requestState);
      if (onClose) onClose();
    } else if (request) {
      const areShiftOptionsEqual = (
        options1: ShiftWorkerOptionT[],
        options2: ShiftWorkerOptionT[],
      ) => {
        if (options1.length !== options2.length) return false;
        return options1.every((opt1, index) => {
          const opt2 = options2[index];
          return opt1.id === opt2.id && opt1.idType === opt2.idType;
        });
      };

      if (
        requestState.workerId === request.workerId &&
        requestState.startDate === request.startDate &&
        requestState.endDate === request.endDate &&
        requestState.shiftId === request.shiftId &&
        requestState.negative === request.negative &&
        requestState.hard === request.hard &&
        areShiftOptionsEqual(requestState.shiftOptions, request.shiftOptions)
      ) {
        if (onClose) onClose();
        return;
      }

      const updatedRequest = {
        ...requestState,
        status: RequestStatus.PENDING,
      };
      if (handleUpdateRequest) {
        handleUpdateRequest(updatedRequest);
      }
    }

    if (onClose) onClose();
  };

  const handleSelectDateRange = () => {
    if (dateRange) {
      setRequestState({
        ...requestState,
        endDate: requestState.startDate,
      });
    } else if (request) {
      setRequestState({
        ...requestState,
        endDate: request.endDate,
      });
    }
    setDateRange(!dateRange);
  };

  // Badge variant mapping for request status
  const getStatusBadgeVariant = (
    status: RequestStatus,
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    const color = getRequestStatusColor(status);
    if (color === 'success') return 'default';
    if (color === 'warning') return 'secondary';
    if (color === 'error') return 'destructive';
    return 'outline';
  };

  return (
    <div>
      {/* Mobile header */}
      {isMobile && (
        <div className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-popover p-4">
          <h2 className="text-lg font-semibold">{title || 'Request'}</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            data-testid="close-request-dialog-button"
          >
            <X className="size-4" />
          </Button>
        </div>
      )}

      {/* Status chip + action buttons (edit mode) */}
      {isEdit && request && (
        <div className="mb-4 flex items-center gap-2">
          <Badge variant={getStatusBadgeVariant(requestState.status)}>
            {getRequestStatusLabel(requestState.status, t)}
          </Badge>

          {canApprove && handleAcceptRequest && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                handleAcceptRequest(request.id);
                setRequestState((prev) => ({ ...prev, status: RequestStatus.APPROVED }));
              }}
              title={t('approve_request')}
              data-testid={`approve-request-button-${request.id}`}
            >
              <Check className="size-4 text-green-600" />
            </Button>
          )}

          {canApprove && handleDenyRequest && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                handleDenyRequest(request.id);
                setRequestState((prev) => ({ ...prev, status: RequestStatus.DENIED }));
              }}
              title={t('deny_request')}
              data-testid={`reject-request-button-${request.id}`}
            >
              <XIcon className="size-4 text-destructive" />
            </Button>
          )}

          {canRescind && handleRescindRequest && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                handleRescindRequest(request.id);
                setRequestState((prev) => ({ ...prev, status: RequestStatus.PENDING }));
              }}
              title={
                requestState.status === RequestStatus.APPROVED
                  ? t('rescind_approval')
                  : t('rescind_denial')
              }
              data-testid={`rescind-request-button-${request.id}`}
            >
              <Undo2 className="size-4 text-amber-600" />
            </Button>
          )}
        </div>
      )}

      {/* Form body */}
      <div
        className="flex w-full flex-col gap-4 p-4"
        style={fullWidth ? { width: '100%' } : undefined}
      >
        {/* Request type toggle */}
        <ToggleGroup
          type="single"
          value={requestType}
          onValueChange={(value) => {
            if (value) {
              const v = value as RequestType;
              setRequestType(v);
              setRequestState((prev) => {
                if (v === RequestType.WORK_DEMAND) {
                  return { ...prev, shiftId: null, requestType: v };
                } else {
                  return { ...prev, shiftOptions: [], negative: false, requestType: v };
                }
              });
            }
          }}
          aria-label="Request Type"
          data-testid="request-type-toggle"
        >
          <ToggleGroupItem
            value={RequestType.WORK_DEMAND}
            data-testid="work-request-type-button"
            className="min-w-[105px] px-4"
          >
            {t('work')}
          </ToggleGroupItem>
          <ToggleGroupItem
            value={RequestType.LEAVE}
            data-testid="leave-request-type-button"
            className="min-w-[105px] px-4"
          >
            {t('leave')}
          </ToggleGroupItem>
        </ToggleGroup>

        {/* Worker select */}
        <div>
          <div className="relative">
            <Users className="pointer-events-none absolute top-1/2 left-2.5 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
            <Select
              value={requestState.workerId}
              disabled={userTeamRole === TeamMembershipRole.MEMBER}
              onValueChange={(value) => {
                setRequestState({ ...requestState, workerId: value });
                setWorkerIdError(false);
              }}
            >
              <SelectTrigger
                data-testid="worker-select"
                aria-invalid={workerIdError}
                className="w-full max-w-full pl-9"
              >
                <SelectValue placeholder={t('select_a_worker')} />
              </SelectTrigger>
              <SelectContent>
                {workers.map((worker) => (
                  <SelectItem key={worker.id} value={worker.id}>
                    {worker.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {workerIdError && (
            <p className="mt-1 text-xs text-destructive" role="alert">
              {' '}
            </p>
          )}
        </div>

        {/* Start date */}
        <div>
          {/* Date range checkbox */}
          <div className="mb-1 flex items-center gap-1.5">
            <Checkbox
              id="date-range"
              checked={dateRange}
              onCheckedChange={handleSelectDateRange}
              data-testid="date-range-checkbox"
            />
            <Label htmlFor="date-range" className="cursor-pointer text-xs">
              {t('date_range')}
            </Label>
          </div>
          <DatePicker
            value={requestState.startDate}
            minDate={dayjs.utc().startOf('day')}
            onChange={(newValue) => {
              setRequestState({
                ...requestState,
                startDate: newValue?.startOf('day') || dayjs.utc().startOf('day'),
                endDate: !dateRange
                  ? newValue?.startOf('day') || dayjs.utc().startOf('day')
                  : requestState.endDate,
              });
              setStartDateError(false);
              if (!dateRange) setEndDateError(false);
            }}
            error={startDateError}
            data-testid="start-date-picker"
            className="w-full max-w-full"
          />
          {startDateError && (
            <p className="mt-1 text-xs text-destructive" role="alert">
              {' '}
            </p>
          )}
        </div>

        {/* End date (date range) */}
        {dateRange && (
          <div>
            <DatePicker
              value={requestState.endDate}
              minDate={requestState.startDate}
              onChange={(newValue) => {
                setRequestState({
                  ...requestState,
                  endDate: newValue?.startOf('day') || dayjs.utc().startOf('day'),
                });
                setEndDateError(false);
              }}
              error={endDateError}
              data-testid="end-date-picker"
              className="w-full max-w-full"
            />
            {endDateError && (
              <p className="mt-1 text-xs text-destructive" role="alert">
                {' '}
              </p>
            )}
          </div>
        )}

        {/* Negative/Positive toggle (work demand only) */}
        {requestType === RequestType.WORK_DEMAND && (
          <div>
            <ToggleGroup
              type="single"
              value={requestState.negative ? 'true' : 'false'}
              onValueChange={(value) => {
                if (value) {
                  setRequestState({ ...requestState, negative: value === 'true' });
                }
              }}
              data-testid="negative-positive-toggle"
            >
              <ToggleGroupItem
                value="false"
                data-testid="positive-request-button"
                className="min-w-[105px] px-4"
              >
                {t('do')}
              </ToggleGroupItem>
              <ToggleGroupItem
                value="true"
                data-testid="negative-request-button"
                className="min-w-[105px] px-4"
              >
                {t('dont')}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        )}

        {/* Shift / ShiftOptions */}
        <div>
          {requestType === RequestType.WORK_DEMAND ? (
            <div
              className={shiftOptionsError ? 'rounded-lg border-2 border-destructive p-0.5' : ''}
            >
              <ShiftOptionsDisplay
                lng={lng}
                selectedShifts={requestState.shiftOptions}
                statsShiftOptions={filterShiftOptions(shiftOptions, shifts)}
                workers={workers}
                shifts={shifts}
                disabled={false}
                handleEditSelectedShifts={(selected) => {
                  handleEditSelectedShifts(selected);
                  setShiftOptionsError(false);
                }}
              />
            </div>
          ) : (
            <div className="relative">
              <Briefcase className="pointer-events-none absolute top-1/2 left-2.5 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
              <Select
                value={requestState.shiftId || ''}
                onValueChange={(value) => {
                  setRequestState({ ...requestState, shiftId: value });
                  setShiftIdError(false);
                }}
              >
                <SelectTrigger
                  data-testid="shift-select"
                  aria-invalid={shiftIdError}
                  className="w-full max-w-full pl-9"
                >
                  <SelectValue placeholder={t('select_a_shift')} />
                </SelectTrigger>
                <SelectContent>
                  {filterShiftsByRequestType(shifts, requestType).map((shift) => (
                    <SelectItem key={shift.id} value={shift.id}>
                      {shift.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {(shiftIdError || shiftOptionsError) && (
            <p className="mt-1 text-xs text-destructive" role="alert">
              {' '}
            </p>
          )}
        </div>

        {/* Actions */}
        <FormActions>
          {isEdit && request && handleDeleteRequest && (
            <Button
              variant="destructive"
              onClick={() => {
                handleDeleteRequest(request.id);
                if (onClose) onClose();
              }}
              disabled={!canEdit}
              data-testid="delete-request-button"
            >
              <Trash2 className="mr-1 size-4" />
              {t('delete')}
            </Button>
          )}
          <Button onClick={handleSaveRequest} data-testid="save-request-button">
            {t('save')}
          </Button>
        </FormActions>
      </div>
    </div>
  );
};

RequestForm.displayName = 'RequestForm';

export default React.memo(RequestForm);
