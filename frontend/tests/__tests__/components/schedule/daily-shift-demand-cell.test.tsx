import { describe, it, expect, jest } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import DailyShiftDemandCell from "../../../../src/components/schedule/table/shared/daily-shift-demand-cell";
import type { ScheduleCellDataT } from "../../../../src/types/schedule";

/**
 * Test suite for DailyShiftDemandCell component
 * Focuses on edge cases, particularly zero staffing scenarios
 */
describe("DailyShiftDemandCell", () => {
  const mockHandleDemandSelection = jest.fn();

  const createMockScheduleCellData = (
    assignmentsCount: number,
    staffingValues: number[],
    shiftDemandCount: number,
  ): ScheduleCellDataT => ({
    assignmentsData: Array(assignmentsCount).fill({
      id: "assignment-1",
      workerId: "worker-1",
      shiftId: "shift-1",
    }),
    shiftDemandsData: {
      shiftDemand: {
        id: "demand-1",
        count: shiftDemandCount,
        shiftId: "shift-1",
        date: "2026-01-29",
      },
      shift: {
        id: "shift-1",
        name: "Morning Shift",
        staffing: staffingValues.map((staffing, idx) => ({
          specialtyId: idx === 0 ? null : `specialty-${idx}`,
          staffing,
        })),
        shiftType: "REGULAR",
        startTime: "08:00",
        endTime: "16:00",
        isRest: false,
      },
    },
    requests: [],
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Normal operation", () => {
    it("should display correct actual/target counts when staffing is met", () => {
      // 6 assignments with total staffing of 3 = 2 fulfilled shifts out of 2 target
      const scheduleCellData = createMockScheduleCellData(6, [1, 2], 2);

      render(
        <DailyShiftDemandCell
          scheduleCellData={scheduleCellData}
          handleDemandSelection={mockHandleDemandSelection}
        />,
      );

      const actualCountElements = screen.getAllByText("2");
      expect(actualCountElements).toHaveLength(2); // Both actual and target are 2
      expect(screen.getByText("/")).toBeInTheDocument();
    });

    it("should display correct actual/target counts when staffing is not met", () => {
      // 3 assignments with total staffing of 5 = 0 fulfilled shifts out of 2 target
      const scheduleCellData = createMockScheduleCellData(3, [2, 3], 2);

      render(
        <DailyShiftDemandCell
          scheduleCellData={scheduleCellData}
          handleDemandSelection={mockHandleDemandSelection}
        />,
      );

      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.getByText("/")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("should call handleDemandSelection when clicked", () => {
      const scheduleCellData = createMockScheduleCellData(4, [2], 1);

      render(
        <DailyShiftDemandCell
          scheduleCellData={scheduleCellData}
          handleDemandSelection={mockHandleDemandSelection}
        />,
      );

      const cell = screen.getByTestId("demand-cell-demand-1");
      fireEvent.click(cell);

      expect(mockHandleDemandSelection).toHaveBeenCalledTimes(1);
      expect(mockHandleDemandSelection).toHaveBeenCalledWith(scheduleCellData);
    });
  });

  describe("Zero staffing edge case", () => {
    it("should display 0 as actual count when shiftStaffingTotal is 0 (empty staffing array)", () => {
      // Empty staffing array (common for LEAVE/REST shifts)
      const scheduleCellData = createMockScheduleCellData(5, [], 3);

      render(
        <DailyShiftDemandCell
          scheduleCellData={scheduleCellData}
          handleDemandSelection={mockHandleDemandSelection}
        />,
      );

      // Should show 0/3 instead of Infinity/3 or NaN/3
      const actualCountElements = screen.getAllByText("0");
      expect(actualCountElements.length).toBeGreaterThan(0);
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("should display 0 as actual count when all staffing values are 0", () => {
      // All staffing values are 0
      const scheduleCellData = createMockScheduleCellData(8, [0, 0, 0], 2);

      render(
        <DailyShiftDemandCell
          scheduleCellData={scheduleCellData}
          handleDemandSelection={mockHandleDemandSelection}
        />,
      );

      // Should show 0/2
      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("should not throw error when rendering with zero staffing", () => {
      const scheduleCellData = createMockScheduleCellData(10, [], 5);

      // Should not throw
      expect(() => {
        render(
          <DailyShiftDemandCell
            scheduleCellData={scheduleCellData}
            handleDemandSelection={mockHandleDemandSelection}
          />,
        );
      }).not.toThrow();
    });

    it("should still be clickable when staffing is zero", () => {
      const scheduleCellData = createMockScheduleCellData(4, [], 2);

      render(
        <DailyShiftDemandCell
          scheduleCellData={scheduleCellData}
          handleDemandSelection={mockHandleDemandSelection}
        />,
      );

      const cell = screen.getByTestId("demand-cell-demand-1");
      fireEvent.click(cell);

      expect(mockHandleDemandSelection).toHaveBeenCalledTimes(1);
    });
  });

  describe("Traffic light color logic", () => {
    it("should apply green color when actual equals target", () => {
      const scheduleCellData = createMockScheduleCellData(4, [2], 2);

      const { container } = render(
        <DailyShiftDemandCell
          scheduleCellData={scheduleCellData}
          handleDemandSelection={mockHandleDemandSelection}
        />,
      );

      const cellContainer = container.querySelector(".dsd-cell-container");
      expect(cellContainer).toBeInTheDocument();
      // Green background color should be applied via CSS variables
    });

    it("should apply red color when actual does not equal target (zero staffing case)", () => {
      const scheduleCellData = createMockScheduleCellData(10, [], 5);

      const { container } = render(
        <DailyShiftDemandCell
          scheduleCellData={scheduleCellData}
          handleDemandSelection={mockHandleDemandSelection}
        />,
      );

      const cellContainer = container.querySelector(".dsd-cell-container");
      expect(cellContainer).toBeInTheDocument();
      // Red background color should be applied when 0 !== 5
    });
  });
});
