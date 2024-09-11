import { useTranslation } from "../../app/i18n/client";

const GetBlockNameLabel = (lng: string, name: string) => {
  const { t } = useTranslation(lng, "constraint-page");

  const blockNameLabels: Record<string, string>[] = [
    { name: "worker", label: t("worker") },
    { name: "shift", label: t("shift") },
    { name: "shift_reference", label: t("shift") },
    { name: "shift_relative", label: t("shift") },
    { name: "operator", label: t("operator") },
    { name: "#", label: "#" },
    { name: "timing", label: t("timing") },
    { name: "weekday", label: t("week_day") },
  ];
  return blockNameLabels.find((item) => item.name === name)?.label || name;
};

export default GetBlockNameLabel;
