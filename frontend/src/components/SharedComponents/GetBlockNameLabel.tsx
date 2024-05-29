import { useTranslation } from "react-i18next";

const GetBlockNameLabel = (name: string) => {
  const { t } = useTranslation();
  const blockNameLabels: Record<string, string>[] = [
    { name: "worker", label: t("common.worker") },
    { name: "shift", label: t("common.shift") },
    { name: "operator", label: t("constraint.operator") },
    { name: "#", label: "#" },
    { name: "timing", label: t("constraint.timing") },
  ];
  return blockNameLabels.find((item) => item.name === name)?.label || name;
};

export default GetBlockNameLabel;
