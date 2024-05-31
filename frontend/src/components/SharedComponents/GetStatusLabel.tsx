import { useTranslation } from "react-i18next";

const GetStatusLabel = (status: string) => {
  const { t } = useTranslation();
  const statusOptions: Record<string, string>[] = [
    { name: "Not solved", label: t("campaign.not_solved") },
    { name: "Solved", label: t("campaign.solved") },
    { name: "No solution", label: t("campaign.no_solution") },
    { name: "Soft breached", label: "Soft breached" },
    { name: "Hard breached", label: "Hard breached" },
  ];
  return statusOptions.find((option) => option.name === status)?.label || "";
};

export { GetStatusLabel };
