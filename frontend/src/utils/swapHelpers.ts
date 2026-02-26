import { AssignmentDataDictT } from "../types/assignment";
import { sortAssignmentsByDateThenShiftStart } from "./assignmentSort";
import "dayjs/locale/en-gb";
import "dayjs/locale/fr";
import "dayjs/locale/es";

/**
 * Get assignments for given assignment IDs, filtered and sorted
 * @param assignmentIds - Array of assignment IDs to filter by
 * @param allAssignments - All available assignments
 * @returns Filtered and sorted assignments
 */
export function getAssignmentsForIds(
  assignmentIds: string[],
  allAssignments: AssignmentDataDictT[],
): AssignmentDataDictT[] {
  return sortAssignmentsByDateThenShiftStart(
    allAssignments.filter((a) => assignmentIds.includes(a.assignment.id)),
  );
}

export const getDayjsLocaleFromLng = (lng: string): string =>
  lng === "en" ? "en-gb" : lng;

export const formatSwapTitleDate = (
  titleDate: any,
  lng: string,
): { dayNumber: string; monthWeekday: string } => {
  const dayjsLocale = getDayjsLocaleFromLng(lng);
  const localizedTitleDate =
    titleDate && typeof titleDate.locale === "function"
      ? titleDate.locale(dayjsLocale)
      : titleDate;

  const dayNumber =
    localizedTitleDate && typeof localizedTitleDate.format === "function"
      ? localizedTitleDate.format("D")
      : "";

  const monthWeekday =
    localizedTitleDate && typeof localizedTitleDate.format === "function"
      ? localizedTitleDate.format("MMM, ddd")
      : "";

  return {
    dayNumber,
    monthWeekday,
  };
};

export const formatSwapDateTime = (dateValue: any, lng: string): string => {
  if (!dateValue || typeof dateValue.format !== "function") {
    return "";
  }

  const dayjsLocale = getDayjsLocaleFromLng(lng);
  const localizedDateValue =
    typeof dateValue.locale === "function"
      ? dateValue.locale(dayjsLocale)
      : dateValue;

  return localizedDateValue.format("MMM D, YYYY HH:mm");
};
