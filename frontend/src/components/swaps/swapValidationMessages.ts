import { TFunction } from "i18next";
import { SwapAssignmentInfoT } from "../../types/swapValidation";

/**
 * Build localized swap validation message based on validation key
 * @param validationKey - The validation key from backend (swap_valid_both, swap_invalid_both, swap_invalid_worker_a, swap_invalid_worker_b)
 * @param workerAInfo - Information about worker A
 * @param workerBInfo - Information about worker B
 * @param t - Translation function from useTranslation hook
 * @returns Localized validation message
 */
export function buildSwapValidationMessage(
  validationKey: string,
  workerAInfo: SwapAssignmentInfoT,
  workerBInfo: SwapAssignmentInfoT,
  t: TFunction,
): string {
  switch (validationKey) {
    case "swap_valid_both":
      return t("swap_valid_both");
    case "swap_invalid_both":
      return t("swap_invalid_both");
    case "swap_invalid_worker_a":
      return t("swap_invalid_worker", { workerName: workerAInfo.workerName });
    case "swap_invalid_worker_b":
      return t("swap_invalid_worker", { workerName: workerBInfo.workerName });
    default:
      return t("swap_validation_unknown");
  }
}
