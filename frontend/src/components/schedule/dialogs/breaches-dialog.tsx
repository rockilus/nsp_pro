import React, { useState } from "react";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
// Components
import BreachItem from "./breach-item";
// Styles
import "../../../styles/text-styles.css";
// Types
import { BreachT } from "@/types/breach";
import { ObjectiveCategory } from "@/types/breach";

export default function BreachesDialog({
  lng,
  breaches,
  open,
  onClose,
}: {
  lng: string;
  breaches: BreachT[];
  open: boolean;
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

  const [selectedCategories, setSelectedCategories] = useState<
    ObjectiveCategory[]
  >(
    categoryMap
      .filter((c) => c.category !== "all")
      .map((c) => c.category as ObjectiveCategory),
  );

  const handleCategoryClick = (category: ObjectiveCategory | "all") => {
    if (category === "all") {
      setSelectedCategories(
        categoryMap
          .filter((c) => c.category !== "all")
          .map((c) => c.category as ObjectiveCategory),
      );
    } else {
      // Single-select: choose only this category
      setSelectedCategories([category]);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      data-testid="breaches-dialog"
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingBottom: 1,
        }}
      >
        {t("breaches")}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <div style={{ marginBottom: "16px" }}>
          {categoryMap.map((c) => (
            <button
              key={c.category}
              style={{
                border: "1px solid #e0e0e0",
                borderRadius: "4px",
                color: "#333",
                cursor: "pointer",
                display: "inline-block",
                fontSize: "12px",
                marginRight: "5px",
                marginBottom: "5px",
                padding: "4px 8px",
                backgroundColor:
                  c.category === "all"
                    ? selectedCategories.length === 6
                      ? "#f5f5f5"
                      : "transparent"
                    : selectedCategories.includes(c.category)
                      ? "#f5f5f5"
                      : "transparent",
                transition: "background-color 0.3s",
              }}
              onClick={() => handleCategoryClick(c.category)}
              onMouseEnter={(e) => {
                if (
                  (c.category === "all" && selectedCategories.length !== 6) ||
                  (c.category !== "all" &&
                    !selectedCategories.includes(c.category))
                ) {
                  e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
                }
              }}
              onMouseLeave={(e) => {
                if (
                  (c.category === "all" && selectedCategories.length !== 6) ||
                  (c.category !== "all" &&
                    !selectedCategories.includes(c.category))
                ) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {categoryMap
            .filter(
              (c) =>
                c.category !== "all" && selectedCategories.includes(c.category),
            )
            .map((category) => {
              const breachesCategory = breaches.filter(
                (breach) => breach.objectiveCategory === category.category,
              );
              return (
                <div
                  key={category.category}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    marginTop: "15px",
                  }}
                >
                  <span className="subtitle">{category.label}</span>
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
                        {t("no_breach")}
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
      </DialogContent>
    </Dialog>
  );
}
