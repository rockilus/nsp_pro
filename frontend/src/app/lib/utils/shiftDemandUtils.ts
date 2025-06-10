/**
 * Utility functions for shift demand management
 * Provides date manipulation, validation, and calculation helpers
 */

import {
  ShiftDemandDTO,
  ValidationResult,
  PeriodType,
  DemandPattern,
} from "@/types/shiftDemand";

/**
 * Date utility functions for shift demand management
 */
export class ShiftDemandDateUtils {
  /**
   * Get the start of week (Monday) for a given date
   */
  static getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  }

  /**
   * Get the end of week (Sunday) for a given date
   */
  static getEndOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? 0 : 7); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  }

  /**
   * Get the start of month for a given date
   */
  static getStartOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  /**
   * Get the end of month for a given date
   */
  static getEndOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }

  /**
   * Generate an array of dates between start and end (inclusive)
   */
  static generateDateRange(startDate: Date, endDate: Date): Date[] {
    const dates: Date[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  /**
   * Get the next period based on period type
   */
  static getNextPeriod(
    startDate: Date,
    endDate: Date,
    periodType: PeriodType
  ): { start: Date; end: Date } {
    const periodLength = endDate.getTime() - startDate.getTime();

    switch (periodType) {
      case "week":
        return {
          start: new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000),
          end: new Date(endDate.getTime() + 7 * 24 * 60 * 60 * 1000),
        };
      case "month":
        const nextStart = new Date(startDate);
        nextStart.setMonth(nextStart.getMonth() + 1);
        const nextEnd = new Date(endDate);
        nextEnd.setMonth(nextEnd.getMonth() + 1);
        return { start: nextStart, end: nextEnd };
      case "custom":
        return {
          start: new Date(startDate.getTime() + periodLength),
          end: new Date(endDate.getTime() + periodLength),
        };
      default:
        throw new Error(`Unknown period type: ${periodType}`);
    }
  }

  /**
   * Get the previous period based on period type
   */
  static getPreviousPeriod(
    startDate: Date,
    endDate: Date,
    periodType: PeriodType
  ): { start: Date; end: Date } {
    const periodLength = endDate.getTime() - startDate.getTime();

    switch (periodType) {
      case "week":
        return {
          start: new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000),
          end: new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000),
        };
      case "month":
        const prevStart = new Date(startDate);
        prevStart.setMonth(prevStart.getMonth() - 1);
        const prevEnd = new Date(endDate);
        prevEnd.setMonth(prevEnd.getMonth() - 1);
        return { start: prevStart, end: prevEnd };
      case "custom":
        return {
          start: new Date(startDate.getTime() - periodLength),
          end: new Date(endDate.getTime() - periodLength),
        };
      default:
        throw new Error(`Unknown period type: ${periodType}`);
    }
  }

  /**
   * Format date for display (e.g., "Mon 15")
   */
  static formatDateShort(date: Date): string {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return `${days[date.getDay()]} ${date.getDate()}`;
  }

  /**
   * Format date for API (YYYY-MM-DD)
   */
  static formatDateForAPI(date: Date): string {
    return date.toISOString().split("T")[0];
  }

  /**
   * Check if a date is a weekend
   */
  static isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  /**
   * Check if a date is today
   */
  static isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  /**
   * Get the number of days between two dates
   */
  static getDaysBetween(startDate: Date, endDate: Date): number {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

/**
 * Validation utility functions
 */
export class ValidationUtils {
  /**
   * Validate shift demand count
   */
  static validateDemandCount(count: number): ValidationResult {
    if (!Number.isInteger(count)) {
      return {
        isValid: false,
        message: "Demand count must be a whole number",
        severity: "error",
      };
    }

    if (count < 0) {
      return {
        isValid: false,
        message: "Demand count cannot be negative",
        severity: "error",
      };
    }

    if (count > 50) {
      return {
        isValid: false,
        message: "Demand count seems unusually high (>50)",
        severity: "warning",
      };
    }

    if (count > 20) {
      return {
        isValid: true,
        message: "High demand count - please verify",
        severity: "warning",
      };
    }

    return {
      isValid: true,
      severity: "info",
    };
  }

  /**
   * Validate date range
   */
  static validateDateRange(startDate: Date, endDate: Date): ValidationResult {
    if (startDate > endDate) {
      return {
        isValid: false,
        message: "Start date must be before end date",
        severity: "error",
      };
    }

    const daysDiff = ShiftDemandDateUtils.getDaysBetween(startDate, endDate);
    if (daysDiff > 93) {
      // ~3 months
      return {
        isValid: false,
        message: "Date range too large (maximum 3 months)",
        severity: "error",
      };
    }

    if (daysDiff > 62) {
      // ~2 months
      return {
        isValid: true,
        message: "Large date range may affect performance",
        severity: "warning",
      };
    }

    return {
      isValid: true,
      severity: "info",
    };
  }
}

/**
 * Calculation utility functions
 */
export class CalculationUtils {
  /**
   * Calculate total demands for a period
   */
  static calculatePeriodTotal(demands: ShiftDemandDTO[]): number {
    return demands.reduce((total, demand) => total + demand.count, 0);
  }

  /**
   * Calculate total demands for a specific shift
   */
  static calculateShiftTotal(
    demands: ShiftDemandDTO[],
    shiftId: string
  ): number {
    return demands
      .filter((demand) => demand.shiftId === shiftId)
      .reduce((total, demand) => total + demand.count, 0);
  }

  /**
   * Calculate total demands for a specific date
   */
  static calculateDateTotal(
    demands: ShiftDemandDTO[],
    targetDate: Date
  ): number {
    const targetTimestamp = Math.floor(targetDate.getTime() / 1000);
    return demands
      .filter((demand) => demand.date === targetTimestamp)
      .reduce((total, demand) => total + demand.count, 0);
  }

  /**
   * Calculate average daily demands for a shift
   */
  static calculateShiftDailyAverage(
    demands: ShiftDemandDTO[],
    shiftId: string,
    totalDays: number
  ): number {
    const total = this.calculateShiftTotal(demands, shiftId);
    return totalDays > 0 ? Math.round((total / totalDays) * 100) / 100 : 0;
  }

  /**
   * Calculate utilization percentage
   */
  static calculateUtilization(actual: number, target: number): number {
    return target > 0 ? Math.round((actual / target) * 100) : 0;
  }

  /**
   * Apply pattern to demands
   */
  static applyPatternToDemands(
    demands: ShiftDemandDTO[],
    pattern: DemandPattern,
    startDate: Date,
    endDate: Date,
    shiftIds: string[]
  ): Partial<ShiftDemandDTO>[] {
    const newDemands: Partial<ShiftDemandDTO>[] = [];
    const dates = ShiftDemandDateUtils.generateDateRange(startDate, endDate);

    dates.forEach((date) => {
      const dayOfWeek = (date.getDay() + 6) % 7; // Convert to Monday = 0
      const patternValue = pattern.pattern[dayOfWeek];

      shiftIds.forEach((shiftId) => {
        if (patternValue > 0) {
          newDemands.push({
            shiftId,
            date: Math.floor(date.getTime() / 1000),
            count: patternValue,
            source: "manual",
          });
        }
      });
    });

    return newDemands;
  }
}

/**
 * Data transformation utility functions
 */
export class TransformUtils {
  /**
   * Convert demands array to matrix format
   */
  static demandsToMatrix(demands: ShiftDemandDTO[]): {
    [shiftId: string]: { [dateStr: string]: number };
  } {
    const matrix: { [shiftId: string]: { [dateStr: string]: number } } = {};

    demands.forEach((demand) => {
      const dateStr = ShiftDemandDateUtils.formatDateForAPI(
        new Date(demand.date * 1000)
      );

      if (!matrix[demand.shiftId]) {
        matrix[demand.shiftId] = {};
      }

      matrix[demand.shiftId][dateStr] = demand.count;
    });

    return matrix;
  }

  /**
   * Convert matrix format to demands array
   */
  static matrixToDemands(
    matrix: { [shiftId: string]: { [dateStr: string]: number } },
    teamId: string
  ): Partial<ShiftDemandDTO>[] {
    const demands: Partial<ShiftDemandDTO>[] = [];

    Object.entries(matrix).forEach(([shiftId, dates]) => {
      Object.entries(dates).forEach(([dateStr, count]) => {
        if (count > 0) {
          demands.push({
            shiftId,
            teamId,
            date: Math.floor(new Date(dateStr).getTime() / 1000),
            count,
            source: "manual",
          });
        }
      });
    });

    return demands;
  }

  /**
   * Group demands by shift
   */
  static groupDemandsByShift(demands: ShiftDemandDTO[]): {
    [shiftId: string]: ShiftDemandDTO[];
  } {
    return demands.reduce((groups, demand) => {
      if (!groups[demand.shiftId]) {
        groups[demand.shiftId] = [];
      }
      groups[demand.shiftId].push(demand);
      return groups;
    }, {} as { [shiftId: string]: ShiftDemandDTO[] });
  }

  /**
   * Group demands by date
   */
  static groupDemandsByDate(demands: ShiftDemandDTO[]): {
    [dateStr: string]: ShiftDemandDTO[];
  } {
    return demands.reduce((groups, demand) => {
      const dateStr = ShiftDemandDateUtils.formatDateForAPI(
        new Date(demand.date * 1000)
      );
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(demand);
      return groups;
    }, {} as { [dateStr: string]: ShiftDemandDTO[] });
  }
}

/**
 * Predefined demand patterns
 */
export const DEMAND_PATTERNS: DemandPattern[] = [
  {
    name: "Standard Weekdays",
    description: "Monday to Friday coverage",
    pattern: [2, 2, 2, 2, 2, 0, 0], // Mon-Sun
    category: "weekday",
  },
  {
    name: "Weekend Coverage",
    description: "Saturday and Sunday coverage",
    pattern: [0, 0, 0, 0, 0, 1, 1], // Mon-Sun
    category: "weekend",
  },
  {
    name: "24/7 Coverage",
    description: "Every day coverage",
    pattern: [2, 2, 2, 2, 2, 2, 2], // Mon-Sun
    category: "custom",
  },
  {
    name: "Holiday Schedule",
    description: "Reduced holiday coverage",
    pattern: [1, 1, 1, 1, 1, 1, 1], // Mon-Sun
    category: "holiday",
  },
];

/**
 * Export all utilities
 */
// Classes are individually exported above
// Additional re-export alias for DateUtils
export { ShiftDemandDateUtils as DateUtils };
