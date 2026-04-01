import dayjs from 'dayjs';
import {
  StatsOptionsT,
  StatsUnitOptions,
  StatsTimeFrameOptions,
  HeaderUnitOptions,
} from '@/types/stats';
import { ShiftWorkerOptionT, SWOIdTypes } from '@/types/constraint';

export interface SerializedStatsOptions {
  timeFrame: StatsTimeFrameOptions;
  startDate: string; // ISO string
  endDate: string; // ISO string
  statsUnit: StatsUnitOptions;
  headerUnit: HeaderUnitOptions;
  selectedShifts: ShiftWorkerOptionT[];
  showFavorites: boolean;
  enableHeatmap?: boolean;
}

/**
 * Validates and normalizes stats options
 */
export function validateStatsOptions(options: Partial<StatsOptionsT>): StatsOptionsT {
  const now = dayjs.utc();

  // Validate timeFrame
  const timeFrame = [
    StatsTimeFrameOptions.CAMPAING,
    StatsTimeFrameOptions.LTM,
    StatsTimeFrameOptions.CUSTOM,
  ].includes(options.timeFrame as StatsTimeFrameOptions)
    ? (options.timeFrame as StatsTimeFrameOptions)
    : StatsTimeFrameOptions.LTM;

  // Validate statsUnit
  const statsUnit = [
    StatsUnitOptions.NB_DAYS_WORKED,
    StatsUnitOptions.TIME_WORKED,
    StatsUnitOptions.NB_SHIFTS_WORKED,
    StatsUnitOptions.NB_REST_DAYS,
    StatsUnitOptions.NB_REST_SHIFTS,
    StatsUnitOptions.NB_TIMES_SHIFT,
    StatsUnitOptions.NB_TIMES_REST,
  ].includes(options.statsUnit as StatsUnitOptions)
    ? (options.statsUnit as StatsUnitOptions)
    : StatsUnitOptions.NB_DAYS_WORKED;

  // Validate headerUnit
  const headerUnit = [
    HeaderUnitOptions.WEEKDAY,
    HeaderUnitOptions.WEEK,
    HeaderUnitOptions.MONTH,
    HeaderUnitOptions.YEAR,
    HeaderUnitOptions.ALL,
    HeaderUnitOptions.SHIFT,
  ].includes(options.headerUnit as HeaderUnitOptions)
    ? (options.headerUnit as HeaderUnitOptions)
    : HeaderUnitOptions.WEEKDAY;

  // Validate dates
  let startDate: dayjs.Dayjs;
  let endDate: dayjs.Dayjs;

  if (dayjs.isDayjs(options.startDate) && options.startDate.isValid()) {
    startDate = options.startDate.utc();
  } else {
    try {
      const parsed = dayjs.utc(options.startDate);
      startDate = parsed.isValid() ? parsed : now.startOf('day').subtract(1, 'year');
    } catch {
      startDate = now.startOf('day').subtract(1, 'year');
    }
  }

  if (dayjs.isDayjs(options.endDate) && options.endDate.isValid()) {
    endDate = options.endDate.utc();
  } else {
    try {
      const parsed = dayjs.utc(options.endDate);
      endDate = parsed.isValid() ? parsed : now.startOf('day');
    } catch {
      endDate = now.startOf('day');
    }
  }

  // Ensure dates are reasonable (not more than 5 years in past/future)
  const fiveYearsAgo = now.subtract(5, 'years');
  const fiveYearsFromNow = now.add(5, 'years');

  if (startDate.isBefore(fiveYearsAgo) || startDate.isAfter(fiveYearsFromNow)) {
    startDate = now.startOf('day').subtract(1, 'year');
  }

  if (endDate.isBefore(fiveYearsAgo) || endDate.isAfter(fiveYearsFromNow)) {
    endDate = now.startOf('day');
  }

  // Ensure end date is not before start date
  if (endDate.isBefore(startDate)) {
    endDate = startDate.add(1, 'month');
  }

  // Validate selectedShifts
  const selectedShifts = Array.isArray(options.selectedShifts)
    ? options.selectedShifts
    : [
        {
          name: 'all shifts',
          id: '',
          idType: SWOIdTypes.NONE,
          isBoolDim: false,
          categoryName: 'All',
        },
      ];

  return {
    timeFrame,
    startDate,
    endDate,
    statsUnit,
    headerUnit,
    selectedShifts,
    showFavorites: typeof options.showFavorites === 'boolean' ? options.showFavorites : false,
    enableHeatmap: typeof options.enableHeatmap === 'boolean' ? options.enableHeatmap : true,
  };
}

export function getDefaultStatsOptions(
  scheduleCampaign?: { startDate: dayjs.Dayjs; endDate: dayjs.Dayjs } | null,
): StatsOptionsT {
  const now = dayjs.utc();

  return {
    timeFrame: scheduleCampaign ? StatsTimeFrameOptions.CAMPAING : StatsTimeFrameOptions.LTM,
    startDate: scheduleCampaign
      ? scheduleCampaign.startDate
      : now.startOf('day').subtract(1, 'year'),
    endDate: scheduleCampaign ? scheduleCampaign.endDate : now.startOf('day'),
    statsUnit: StatsUnitOptions.NB_DAYS_WORKED,
    headerUnit: HeaderUnitOptions.WEEKDAY,
    selectedShifts: [
      {
        name: 'all shifts',
        id: '',
        idType: SWOIdTypes.NONE,
        isBoolDim: false,
        categoryName: 'All',
      },
    ],
    showFavorites: false,
    enableHeatmap: true,
  };
}
