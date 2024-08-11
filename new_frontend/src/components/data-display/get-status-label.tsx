import { useTranslation } from "../../app/i18n/client";

export const GetStatusLabel = (lng: string, status: string) => {
  const { t } = useTranslation(lng, "campaign-page");
  const statusOptions: Record<string, string>[] = [
    { name: "Not solved", label: t("not_solved") },
    { name: "Solved", label: t("solved") },
    { name: "No solution", label: t("no_solution") },
    { name: "Soft breached", label: t("soft_breach") },
    { name: "Hard breached", label: t("hard_breach") },
  ];
  return statusOptions.find((option) => option.name === status)?.label || "";
};

// Custom hook version
const useStatusLabel = (lng: string) => {
  const { t } = useTranslation(lng, "campaign-page");

  const getStatusLabel = (status: string): string => {
    const statusOptions: Record<string, string>[] = [
      { name: "Not solved", label: t("not_solved") },
      { name: "Solved", label: t("solved") },
      { name: "No solution", label: t("no_solution") },
      { name: "Soft breached", label: t("soft_breach") },
      { name: "Hard breached", label: t("hard_breach") },
    ];
    return statusOptions.find((option) => option.name === status)?.label || "";
  };

  return getStatusLabel;
};

export default useStatusLabel;
