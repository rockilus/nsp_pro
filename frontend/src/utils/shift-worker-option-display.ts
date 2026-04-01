import { ShiftWorkerOptionT, SWOIdTypes } from '../types/constraint';
import { WorkerT } from '../types/worker';
import { ShiftT } from '../types/shift';
import { RequestT, RequestType, RequestStatus } from '../types/request';
import { ShiftColorMappings } from '../constants/constants';

/**
 * Get the display text for a ShiftWorkerOption with proper handling of different types
 * @param swo The ShiftWorkerOption to display
 * @param workers Array of workers (for worker type lookups)
 * @param shifts Array of shifts (for shift type lookups)
 * @param notTranslation The translation for "not" (default: "not")
 * @returns The display text for the option
 */
export const getShiftWorkerOptionDisplayText = (
  swo: ShiftWorkerOptionT,
  workers: WorkerT[] = [],
  shifts: ShiftT[] = [],
  notTranslation: string = 'not',
): string => {
  // Handle worker type
  if (swo.idType === SWOIdTypes.WORKER) {
    const worker = workers.find((w) => w.id === swo.id);
    return worker?.name || 'Unknown Worker';
  }

  // Handle shift type
  if (swo.idType === SWOIdTypes.SHIFT) {
    const shift = shifts.find((s) => s.id === swo.id);
    return shift?.name || 'Unknown Shift';
  }

  // Handle dimension type with boolean dimension
  if (swo.idType === SWOIdTypes.DIMENSION && swo.isBoolDim) {
    if (swo.name === true) {
      return swo.categoryName;
    } else if (swo.name === false) {
      return `${notTranslation} ${swo.categoryName.toLowerCase()}`;
    }
  }

  // Handle duty type (behaves like boolean dimension)
  if (swo.idType === SWOIdTypes.DUTY) {
    if (swo.name === true) {
      return swo.categoryName;
    } else if (swo.name === false) {
      return `${notTranslation} ${swo.categoryName.toLowerCase()}`;
    }
  }

  // Handle other dimension types and fallback
  return swo.name as string;
};

/**
 * Get the display text for a request's target shift with emoji indicators
 * @param request The request to display
 * @param workers Array of workers (for worker type lookups)
 * @param shifts Array of shifts (for shift type lookups)
 * @param notTranslation The translation for "not" (default: "not")
 * @returns The display text with emoji prefix for the request target
 */
export const getRequestTargetDisplayText = (
  request: RequestT,
  workers: WorkerT[] = [],
  shifts: ShiftT[] = [],
  notTranslation: string = 'not',
): string => {
  if (request.requestType === RequestType.LEAVE) {
    // For leave requests, show the shift being left (or all day)
    const shiftId = request.shiftId;
    if (shiftId) {
      const shift = shifts.find((s) => s.id === shiftId);
      return shift ? shift.name : shiftId;
    }
    return '—';
  } else {
    // For work requests, show emoji and shift options
    const emoji = request.negative ? '🙅' : '🙋';
    if (request.shiftOptions && request.shiftOptions.length > 0) {
      const optionTexts = request.shiftOptions.map((so) =>
        getShiftWorkerOptionDisplayText(so, workers, shifts, notTranslation),
      );
      return `${emoji} ${optionTexts.join(', ')}`;
    }
    return `${emoji} —`;
  }
};

/**
 * Get display text for multiple ShiftWorkerOptions joined by a separator
 * @param swos Array of ShiftWorkerOptions
 * @param workers Array of workers
 * @param shifts Array of shifts
 * @param notTranslation The translation for "not"
 * @param separator The separator to join multiple options (default: ", ")
 * @returns The joined display text
 */
export const getShiftWorkerOptionsDisplayText = (
  swos: ShiftWorkerOptionT[],
  workers: WorkerT[] = [],
  shifts: ShiftT[] = [],
  notTranslation: string = 'not',
  separator: string = ', ',
): string => {
  return swos
    .map((swo) => getShiftWorkerOptionDisplayText(swo, workers, shifts, notTranslation))
    .join(separator);
};

/**
 * Get shift colors for a request based on its type and shift options
 * @param request The request to get colors for
 * @param shifts Array of shifts (for shift type lookups)
 * @returns Object with background, sample, and text colors, or null if no colors apply
 */
export const getShiftColors = (
  request: RequestT | null,
  shifts: ShiftT[] = [],
): { background: string; sample: string; text: string } | null => {
  if (!request) return null;

  // For work demand requests, check shiftOptions
  if (request.requestType === RequestType.WORK_DEMAND) {
    // If there's exactly one shift option with type SHIFT, use that shift's color
    if (
      request.shiftOptions &&
      request.shiftOptions.length === 1 &&
      request.shiftOptions[0].idType === SWOIdTypes.SHIFT
    ) {
      const shiftOption = request.shiftOptions[0];
      const shift = shifts.find((s) => s.id === shiftOption.id);
      if (shift) {
        const colors = ShiftColorMappings[shift.color] || {
          background: '#f5f5f5',
          sample: '#9e9e9e',
          text: '#212121',
        };
        return {
          background: colors.background,
          sample: colors.sample,
          text: colors.text,
        };
      }
    }
    // Otherwise, use default work request colors (grey)
    return {
      background: '#f5f5f5',
      sample: '#9e9e9e',
      text: '#212121',
    };
  }

  // For leave requests, use red
  if (request.requestType === RequestType.LEAVE) {
    return {
      background: '#F44336',
      sample: '#D32F2F',
      text: '#FFFFFF',
    };
  }

  return null;
};

/**
 * Get the MUI color for a request status
 * @param status The request status
 * @returns MUI color name for the status
 */
export const getRequestStatusColor = (
  status: RequestStatus,
): 'success' | 'error' | 'warning' | 'default' => {
  switch (status) {
    case RequestStatus.APPROVED:
      return 'success';
    case RequestStatus.DENIED:
      return 'error';
    case RequestStatus.DEFERRED:
      return 'warning';
    default:
      return 'default';
  }
};

/**
 * Get the display label for a request status
 * @param status The request status
 * @param t Translation function
 * @returns Translated label for the status
 */
export const getRequestStatusLabel = (
  status: RequestStatus,
  t: (key: string) => string,
): string => {
  switch (status) {
    case RequestStatus.PENDING:
      return t('pending');
    case RequestStatus.APPROVED:
      return t('approved');
    case RequestStatus.DENIED:
      return t('rejected');
    case RequestStatus.DEFERRED:
      return t('deferred');
    default:
      return 'Unknown';
  }
};
