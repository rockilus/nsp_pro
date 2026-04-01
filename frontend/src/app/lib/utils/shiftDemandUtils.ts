/**
 * Utility functions for shift demand management
 * Provides date manipulation, validation, and calculation helpers
 */

import { PeriodType } from "@/types/shiftDemand";

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
    periodType: PeriodType,
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
    periodType: PeriodType,
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
 * Export all utilities
 */
// Classes are individually exported above
// Additional re-export alias for DateUtils
export { ShiftDemandDateUtils as DateUtils };
