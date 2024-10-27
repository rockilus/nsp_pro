import React, { useState } from "react";
import { useTranslation } from "../../../app/i18n/client";
// Components
import BreachItem from "./breach-item";
// Styles
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
      { category: "all", label: "All" },
      { category: ObjectiveCategory.CONSTRAINT, label: "Constraint" },
      { category: ObjectiveCategory.REQUEST, label: "Request" },
      { category: ObjectiveCategory.DAILY_SHIFT_DEMAND, label: "Coverage" },
      {
        category: ObjectiveCategory.WORK_TIME_CONTRACT,
        label: "Work time contract",
      },
      {
        category: ObjectiveCategory.WORK_TIME_DESIRED,
        label: "Work time desired",
      },
      {
        category: ObjectiveCategory.DUTIES_PER_MONTH,
        label: "Duties per month",
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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignSelf: "flex-start",
        width: "100%",
        margin: "10px 10px 5px 5px",
      }}
    >
      <span
        style={{
          fontSize: "1rem",
          fontWeight: 600,
          color: "#3C4043",
        }}
      >
        {t("breaches")}
      </span>
      <div>
        {categoryMap.map((c) => (
          <button
            key={c.category}
            className="breach-selector-button"
            onClick={() => handleCategoryClick(c.category)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
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
              <div
                key={category.category}
                style={{ display: "flex", flexDirection: "column" }}
              >
                <span
                  style={{
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: "#3C4043",
                  }}
                >
                  {category.label}
                </span>
                {breachesCategory.length === 0 ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      borderBottom: "0.5px solid lightgrey",
                      padding: "5px 0",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 400,
                        fontSize: "0.875rem",
                        fontStyle: "italic",
                        lineHeight: "1.4",
                        letterSpacing: "0.001rem",
                        margin: "0",
                        padding: "0 5px 0 0",
                      }}
                    >
                      {"No breach."}
                    </span>
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
