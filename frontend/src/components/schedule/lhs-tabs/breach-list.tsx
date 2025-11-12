import React, { useState } from "react";
import { useTranslation } from "../../../app/i18n/client";
// Components
import BreachItem from "./breach-item";
import LHSHEader from "./lhs-header";
// Styles
import "../../../styles/text-styles.css";
import "./breach-list.css";
// Types
import { BreachT } from "@/types/breach";
import { ObjectiveCategory } from "@/types/breach";

export default function BreachList({
  lng,
  breaches,
  onClose,
}: {
  lng: string;
  breaches: BreachT[];
  onClose: () => void;
}) {
  const { t } = useTranslation(lng, "schedule-page");

  const categoryMap: { category: ObjectiveCategory | "all"; label: string }[] =
    [
      { category: "all", label: t("all") },
      { category: ObjectiveCategory.CONSTRAINT, label: t("constraint") },
      { category: ObjectiveCategory.REQUEST, label: t("request") },
      { category: ObjectiveCategory.DAILY_SHIFT_DEMAND, label: t("coverage") },
      {
        category: ObjectiveCategory.WORK_TIME_CONTRACT,
        label: t("work_time_contract"),
      },
      {
        category: ObjectiveCategory.WORK_TIME_DESIRED,
        label: t("work_time_desired"),
      },
      {
        category: ObjectiveCategory.DUTIES_PER_MONTH,
        label: t("duties_per_month"),
      },
      { category: ObjectiveCategory.LINK_SHIFT, label: t("link_shift") },
    ];

  const nonAllCount = categoryMap.filter((c) => c.category !== "all").length;

  const [selectedCategories, setSelectedCategories] = useState<
    ObjectiveCategory[]
  >(
    categoryMap
      .filter((c) => c.category !== "all")
      .map((c) => c.category as ObjectiveCategory)
  );

  const handleCategoryClick = (category: ObjectiveCategory | "all") => {
    if (category === "all") {
      setSelectedCategories(
        categoryMap
          .filter((c) => c.category !== "all")
          .map((c) => c.category as ObjectiveCategory)
      );
    } else {
      // Single-select: choose only this category
      setSelectedCategories([category]);
    }
  };

  return (
    <div className="breach-lhs-tab-container">
      <LHSHEader lhsHeaderTitle={t("breaches")} onClose={onClose} />
      <div>
        {categoryMap.map((c) => (
          <button
            key={c.category}
            className={`breach-selector-button ${
              c.category === "all"
                ? selectedCategories.length === 6
                  ? "selected"
                  : ""
                : selectedCategories.includes(c.category)
                ? "selected"
                : ""
            }`}
            onClick={() => handleCategoryClick(c.category)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="category-container">
        {categoryMap
          .filter(
            (c) =>
              c.category !== "all" && selectedCategories.includes(c.category)
          )
          .map((category) => {
            const breachesCategory = breaches.filter(
              (breach) => breach.objectiveCategory === category.category
            );
            return (
              <div key={category.category} className="breach-list-container">
                <span className="subtitle">{category.label}</span>
                {breachesCategory.length === 0 ? (
                  <div className="no-breach-container">
                    <span className="no-breach-text">{t("no_breach")}</span>
                  </div>
                ) : (
                  breachesCategory.map((breach) => (
                    <BreachItem key={breach.id} breach={breach} />
                  ))
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
