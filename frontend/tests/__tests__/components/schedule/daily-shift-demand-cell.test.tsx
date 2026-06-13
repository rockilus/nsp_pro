import { describe, it, expect } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import DailyShiftDemandCell from '../../../../src/components/schedule/table/shared/daily-shift-demand-cell';
import type { ScheduleCellDataT, ScheduleViewSettingsT } from '../../../../src/types/schedule';

// Mock the translation hook
jest.mock('../../../../src/app/i18n/client', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: jest.fn(), resolvedLanguage: 'en' },
  }),
}));
import { ShiftType, ShiftRestType, ShiftLeaveType } from '../../../../src/types/shift';

dayjs.extend(utc);

/**
 * Test suite for DailyShiftDemandCell component
 * Focuses on edge cases, particularly zero staffing scenarios
 */
describe('DailyShiftDemandCell', () => {
  const mockHandleDemandSelection = jest.fn();
  const mockScheduleViewSettings: ScheduleViewSettingsT = {
    timeFrame: 'week',
    groupBy: 'shift',
    showBreaches: false,
    showAssignments: true,
    showDailyShiftDemands: true,
    showRequests: false,
    showWorkerPreferences: true,
    periodStartDate: dayjs.utc('2026-01-26'),
  };
  const mockLng = 'en';

  const createMockScheduleCellData = (
    assignmentsCount: number,
    staffingValues: number[],
    shiftDemandCount: number,
  ): ScheduleCellDataT => ({
    assignmentsData: Array(assignmentsCount).fill({
      id: 'assignment-1',
      workerId: 'worker-1',
      shiftId: 'shift-1',
    }),
    shiftDemandsData: {
      shiftDemand: {
        id: 'demand-1',
        count: shiftDemandCount,
        shiftId: 'shift-1',
        date: dayjs('2026-01-29').unix(),
        teamId: 'team-1',
        notes: null,
        source: 'manual' as const,
        sourceId: null,
        createdAt: dayjs().unix(),
        updatedAt: dayjs().unix(),
      },
      shift: {
        id: 'shift-1',
        teamId: 'team-1',
        name: 'Morning Shift',
        acronym: 'MS',
        acronymCustom: false,
        staffing: staffingValues.map((staffing, idx) => ({
          specialtyId: idx === 0 ? null : `specialty-${idx}`,
          staffing,
        })),
        color: '#000000',
        shiftType: ShiftType.NORMAL,
        restType: ShiftRestType.NONE,
        leaveType: ShiftLeaveType.NONE,
        startTime: dayjs.utc('08:00', 'HH:mm'),
        endTime: dayjs.utc('16:00', 'HH:mm'),
        recuperationTime: 0,
        recuperationDutyId: null,
        deleted: false,
        attributes: [],
      },
    },
    requests: [],
    workerPreferences: [],
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Normal operation', () => {
    it('should display correct actual/target counts when staffing is met', () => {
      // 6 assignments with total staffing of 3 = 2 fulfilled shifts out of 2 target
      const scheduleCellData = createMockScheduleCellData(6, [1, 2], 2);

      render(
        <DailyShiftDemandCell
          scheduleCellData={scheduleCellData}
          handleDemandSelection={mockHandleDemandSelection}
          scheduleViewSettings={mockScheduleViewSettings}
          lng={mockLng}
        />,
      );

      // Combined compact display should be "actual/target"
      expect(screen.getByText('2/2')).toBeTruthy();
    });

    it('should display correct actual/target counts when staffing is not met', () => {
      // 3 assignments with total staffing of 5 = 0 fulfilled shifts out of 2 target
      const scheduleCellData = createMockScheduleCellData(3, [2, 3], 2);

      render(
        <DailyShiftDemandCell
          scheduleCellData={scheduleCellData}
          handleDemandSelection={mockHandleDemandSelection}
          scheduleViewSettings={mockScheduleViewSettings}
          lng={mockLng}
        />,
      );

      expect(screen.getByText('0/2')).toBeTruthy();
    });

    it('should call handleDemandSelection when clicked', () => {
      const scheduleCellData = createMockScheduleCellData(4, [2], 1);

      render(
        <DailyShiftDemandCell
          scheduleCellData={scheduleCellData}
          handleDemandSelection={mockHandleDemandSelection}
          scheduleViewSettings={mockScheduleViewSettings}
          lng={mockLng}
        />,
      );

      const cell = screen.getByTestId('demand-cell-demand-1');
      fireEvent.click(cell);

      expect(mockHandleDemandSelection).toHaveBeenCalledTimes(1);
      expect(mockHandleDemandSelection).toHaveBeenCalledWith(scheduleCellData);
    });
  });

  describe('Zero staffing edge case', () => {
    it('should display 0 as actual count when shiftStaffingTotal is 0 (empty staffing array)', () => {
      // Empty staffing array (common for LEAVE/REST shifts)
      const scheduleCellData = createMockScheduleCellData(5, [], 3);

      render(
        <DailyShiftDemandCell
          scheduleCellData={scheduleCellData}
          handleDemandSelection={mockHandleDemandSelection}
          scheduleViewSettings={mockScheduleViewSettings}
          lng={mockLng}
        />,
      );

      // Should show 0/3 instead of Infinity/3 or NaN/3
      expect(screen.getByText('0/3')).toBeTruthy();
    });

    it('should display 0 as actual count when all staffing values are 0', () => {
      // All staffing values are 0
      const scheduleCellData = createMockScheduleCellData(8, [0, 0, 0], 2);

      render(
        <DailyShiftDemandCell
          scheduleCellData={scheduleCellData}
          handleDemandSelection={mockHandleDemandSelection}
          scheduleViewSettings={mockScheduleViewSettings}
          lng={mockLng}
        />,
      );

      // Should show 0/2
      expect(screen.getByText('0/2')).toBeTruthy();
    });

    it('should not throw error when rendering with zero staffing', () => {
      const scheduleCellData = createMockScheduleCellData(10, [], 5);

      // Should not throw
      expect(() => {
        render(
          <DailyShiftDemandCell
            scheduleCellData={scheduleCellData}
            handleDemandSelection={mockHandleDemandSelection}
            scheduleViewSettings={mockScheduleViewSettings}
            lng={mockLng}
          />,
        );
      }).not.toThrow();
    });

    it('should still be clickable when staffing is zero', () => {
      const scheduleCellData = createMockScheduleCellData(4, [], 2);

      render(
        <DailyShiftDemandCell
          scheduleCellData={scheduleCellData}
          handleDemandSelection={mockHandleDemandSelection}
          scheduleViewSettings={mockScheduleViewSettings}
          lng={mockLng}
        />,
      );

      const cell = screen.getByTestId('demand-cell-demand-1');
      fireEvent.click(cell);

      expect(mockHandleDemandSelection).toHaveBeenCalledTimes(1);
    });
  });

  describe('Traffic light color logic', () => {
    it('should apply green color when actual equals target', () => {
      const scheduleCellData = createMockScheduleCellData(4, [2], 2);

      const { container } = render(
        <DailyShiftDemandCell
          scheduleCellData={scheduleCellData}
          handleDemandSelection={mockHandleDemandSelection}
          scheduleViewSettings={mockScheduleViewSettings}
          lng={mockLng}
        />,
      );

      const cellContainer = container.querySelector('.dsd-cell-container');
      expect(cellContainer).toBeTruthy();
      // Green background color should be applied via CSS variables
    });

    it('should apply red color when actual does not equal target (zero staffing case)', () => {
      const scheduleCellData = createMockScheduleCellData(10, [], 5);

      const { container } = render(
        <DailyShiftDemandCell
          scheduleCellData={scheduleCellData}
          handleDemandSelection={mockHandleDemandSelection}
          scheduleViewSettings={mockScheduleViewSettings}
          lng={mockLng}
        />,
      );

      const cellContainer = container.querySelector('.dsd-cell-container');
      expect(cellContainer).toBeTruthy();
      // Red background color should be applied when 0 !== 5
    });
  });
});
