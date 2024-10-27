import React, { useState } from "react";
import { useTranslation } from "../../../app/i18n/client";
// Components
import BreachItem from "./breach-item";
// Styles
import "../../../styles/text-styles.css";
import "./breach-list.css";
// Types
import { BreachT, ObjectiveCategory } from "../../../types/schedule";

export default function BreachList({
  lng,
  breaches,
}: {
  lng: string;
  breaches: BreachT[];
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
    ];

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
      setSelectedCategories((prevCategories) => {
        if (prevCategories.includes(category)) {
          return prevCategories.filter((cat) => cat !== category);
        } else {
          return [...prevCategories, category];
        }
      });
    }
  };

  console.log(selectedCategories);

  return (
    <div className="breach-lhs-tab-container">
      <span className="title">{t("breaches")}</span>
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
