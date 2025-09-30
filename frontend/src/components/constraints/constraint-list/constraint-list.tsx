import * as React from "react";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import Grid from "@mui/material/Grid";
// Components
import ConstraintListItem from "./constraint-list-item";
// Styles
import "../../../styles/text-styles.css";
import "../constraint-tab.css";
// Types
import { ConstraintT, TemplateT } from "../../../types/constraint";
import { WorkerT } from "../../../types/worker";
import { ShiftT } from "../../../types/shift";

export default function ConstraintList({
  lng,
  workers,
  shifts,
  constraints,
  constraintTemplates,
  handleUpdateConstraint,
  handleDeleteConstraint,
}: {
  lng: string;
  workers: WorkerT[];
  shifts: ShiftT[];
  constraints: ConstraintT[];
  constraintTemplates: TemplateT[];
  handleUpdateConstraint: (updatedConstraint: ConstraintT) => void;
  handleDeleteConstraint: (constraintId: string) => void;
}) {
  const { t } = useTranslation(lng, "constraint-page");

  const findTemplateById = (id: string): TemplateT | null => {
    const template = constraintTemplates.find((template) => template.id === id);
    return template ? template : null;
  };

  return (
    <Grid
      container
      spacing={0}
      sx={{ backgroundColor: "white", borderRadius: 2, mt: 1 }}
      data-testid="constraint-list"
    >
      {constraints.length === 0 ? (
        <Grid item xs={12} sx={{ p: 2, textAlign: "center" }}>
          <span>{t("no_constraints")}</span>
        </Grid>
      ) : (
        constraints.map((constraint, index) => (
          <ConstraintListItem
            key={constraint.id}
            lng={lng}
            workers={workers}
            shifts={shifts}
            constraint={constraint}
            constraintTemplate={findTemplateById(constraint.templateId)}
            handleUpdateConstraint={handleUpdateConstraint}
            handleDeleteConstraint={handleDeleteConstraint}
            isLast={index === constraints.length - 1}
            data-testid={`constraint-item-${index}`}
          />
        ))
      )}
    </Grid>
  );
}
