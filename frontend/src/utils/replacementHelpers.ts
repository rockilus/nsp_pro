import {
  ReplacementCategoryT,
  MostConstrainingReasonT,
} from "../types/replacement";

/**
 * Get category emoji indicator for replacement analysis
 * @param category - The replacement category
 * @returns Emoji string indicating the category (🟢 can_do, 🟠 could_do, 🔴 cant_do)
 */
export function getCategoryEmoji(
  category: ReplacementCategoryT | "can_do" | "could_do" | "cant_do",
): string {
  switch (category) {
    case "can_do":
      return "🟢";
    case "could_do":
      return "🟠";
    case "cant_do":
      return "🔴";
    default:
      return "⚪";
  }
}

/**
 * Get translated reason label for the most constraining reason
 * @param reason - The most constraining reason enum value
 * @param t - Translation function that accepts a translation key
 * @returns Translated reason label
 */
export function getReasonLabel(
  reason: MostConstrainingReasonT,
  t: (key: string) => string,
): string {
  const reasonMap: Record<MostConstrainingReasonT, string> = {
    [MostConstrainingReasonT.NOT_EMPLOYED]: t(
      "replacement_reason_not_employed",
    ),
    [MostConstrainingReasonT.MISSING_SPECIALTY]: t(
      "replacement_reason_missing_specialty",
    ),
    [MostConstrainingReasonT.ON_LEAVE]: t("replacement_reason_on_leave"),
    [MostConstrainingReasonT.FILTERED_OUT]: t(
      "replacement_reason_filtered_out",
    ),
    [MostConstrainingReasonT.HAS_OVERLAP]: t("replacement_reason_has_overlap"),
    [MostConstrainingReasonT.HARD_CONSTRAINT_VIOLATION]: t(
      "replacement_reason_hard_constraint_violation",
    ),
    [MostConstrainingReasonT.REQUEST_CONFLICT]: t(
      "replacement_reason_request_conflict",
    ),
    [MostConstrainingReasonT.SOFT_CONSTRAINT_VIOLATION]: t(
      "replacement_reason_soft_constraint_violation",
    ),
    [MostConstrainingReasonT.NO_CONSTRAINTS_VIOLATED]: t(
      "replacement_reason_no_constraints_violated",
    ),
  };

  return reasonMap[reason] || reason;
}
