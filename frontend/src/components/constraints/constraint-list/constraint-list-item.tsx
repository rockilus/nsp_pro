import React from "react";
// MUI
import Box from "@mui/material/Box";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
// Components
import ConstraintButton from "./constraint-button";
import MissingProperties from "./missing-properties";
import { HardSoftButton } from "../../buttons/hard-soft-button";
// Types
import { ConstraintT, TemplateT } from "../../../types/constraint";
// Constants
import {
  ConstraintColorActiveBack,
  ConstraintColorInactiveBack,
  ConstraintColorActiveText,
  ConstraintColorInactiveText,
} from "../../../constants/constants";
import { WorkerT } from "../../../types/worker";
import { ShiftT } from "../../../types/shift";

export default function ConstraintListItem({
  lng,
  workers,
  shifts,
  constraint,
  constraintTemplate,
  handleUpdateConstraint,
  handleDeleteConstraint,
  isLast,
  "data-testid": dataTestId,
}: {
  lng: string;
  workers: WorkerT[];
  shifts: ShiftT[];
  constraint: ConstraintT;
  constraintTemplate: TemplateT | null;
  handleUpdateConstraint: (updatedConstraint: ConstraintT) => void;
  handleDeleteConstraint: (constraintId: string) => void;
  isLast?: boolean;
  "data-testid"?: string;
}) {
  const handleDelete = async () => {
    await handleDeleteConstraint(constraint.id);
  };

  const handleToggleHard = () => {
    const updatedConstraint = { ...constraint, hard: !constraint.hard };
    handleUpdateConstraint(updatedConstraint);
  };

  const editButton = () => {
    return (
      <IconButton edge="end" aria-label="delete">
        <EditIcon />
      </IconButton>
    );
  };

  return (
    <Grid
      item
      xs={12}
      md={12}
      xl={12}
      sx={{
        paddingX: 1,
        borderBottom: isLast ? "none" : "1px solid #e0e0e0",
      }}
      data-testid={dataTestId || `constraint-item-${constraint.id}`}
    >
      <Grid
        container
        spacing={0}
        sx={{
          display: "flex",
          alignItems: "center",
          backgroundColor: constraint.active
            ? ConstraintColorActiveBack
            : ConstraintColorInactiveBack,
        }}
      >
        <Grid item xs={8}>
          <Typography
            variant="subtitle2"
            align="left"
            color={
              constraint.active
                ? ConstraintColorActiveText
                : ConstraintColorInactiveText
            }
            data-testid={`constraint-text-${constraint.id}`}
          >
            {constraint.text}
          </Typography>
          <MissingProperties
            lng={lng}
            missingProperties={constraint.missingAttributes}
          />
        </Grid>
        <Grid item xs={3}>
          <div data-testid={`constraint-hard-soft-button-${constraint.id}`}>
            {HardSoftButton(lng, constraint.hard, handleToggleHard)}
          </div>
        </Grid>
        <Grid item xs={1}>
          <Box sx={{ display: "flex", flexDirection: "row" }}>
            <div data-testid={`constraint-edit-button-${constraint.id}`}>
              <ConstraintButton
                lng={lng}
                workers={workers}
                shifts={shifts}
                buttonElement={editButton()}
                constraint={constraint}
                constraintTemplate={constraintTemplate}
                // Add constraint is not needed in edit mode
                handleUpdateConstraint={handleUpdateConstraint}
              />
            </div>
            <IconButton
              edge="end"
              aria-label="delete"
              onClick={handleDelete}
              data-testid={`constraint-delete-button-${constraint.id}`}
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        </Grid>
      </Grid>
    </Grid>
  );
}
