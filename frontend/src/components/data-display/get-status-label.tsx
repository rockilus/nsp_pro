import { useTranslation } from "../../app/i18n/client";
// Types
import { ScheduleSolveStatus } from "../../types/schedule";

export const GetStatusLabel = (lng: string, status: ScheduleSolveStatus) => {
  const { t } = useTranslation(lng, "campaign-page");
  const statusOptions: { name: ScheduleSolveStatus; label: string }[] = [
    { name: ScheduleSolveStatus.NOT_SOLVED, label: t("not_solved") },
    { name: ScheduleSolveStatus.SOLVED, label: t("solved") },
    { name: ScheduleSolveStatus.NO_SOLUTION, label: t("no_solution") },
    { name: ScheduleSolveStatus.SOFT_BREACHED, label: t("soft_breach") },
    { name: ScheduleSolveStatus.HARD_BREACHED, label: t("hard_breach") },
  ];
  return statusOptions.find((option) => option.name === status)?.label || "";
};

// Custom hook version
const useStatusLabel = (lng: string) => {
  const { t } = useTranslation(lng, "campaign-page");

  const getStatusLabel = (status: ScheduleSolveStatus): string => {
    const statusOptions: { name: ScheduleSolveStatus; label: string }[] = [
      { name: ScheduleSolveStatus.NOT_SOLVED, label: t("not_solved") },
      { name: ScheduleSolveStatus.SOLVED, label: t("solved") },
      { name: ScheduleSolveStatus.NO_SOLUTION, label: t("no_solution") },
      { name: ScheduleSolveStatus.SOFT_BREACHED, label: t("soft_breach") },
      { name: ScheduleSolveStatus.HARD_BREACHED, label: t("hard_breach") },
    ];
    return statusOptions.find((option) => option.name === status)?.label || "";
  };

  return getStatusLabel;
};

export default useStatusLabel;
