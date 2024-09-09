import React from "react";
// MUI
import Box from "@mui/material/Box";
import ClearIcon from "@mui/icons-material/Clear";
import EditIcon from "@mui/icons-material/Edit";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
// Components
import ConstraintButton from "./constraint-button";
import { HardSoftButton } from "../buttons/hard-soft-button";
// Types
import { ConstraintT, TemplateT } from "../../types/constraint";
// Constants
import {
  ConstraintColorActiveBack,
  ConstraintColorInactiveBack,
  ConstraintColorActiveText,
  ConstraintColorInactiveText,
} from "../../constants/constants";

export default function ConstraintListItem({
  lng,
  constraint,
  constraintTemplate,
  handleAddConstraint,
  handleUpdateConstraint,
  handleDeleteConstraint,
}: {
  lng: string;
  constraint: ConstraintT;
  constraintTemplate: TemplateT | null;
  handleAddConstraint: (constraint: ConstraintT) => void;
  handleUpdateConstraint: (updatedConstraint: ConstraintT) => void;
  handleDeleteConstraint: (constraintId: string) => void;
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
    <Grid item xs={12} md={12} xl={12} sx={{ paddingX: 1 }}>
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
          >
            {constraint.text}
          </Typography>
          {constraint.missingProperties.length > 0 && (
            <div
              className="field-name"
              style={{
                fontSize: "10px",
                fontStyle: "italic",
                color: ConstraintColorInactiveText,
              }}
            >
              {"No " +
                constraint.missingProperties
                  .flatMap((mp) => mp.propertyValues)
                  .join(", ") +
                " property"}
            </div>
          )}
        </Grid>
        <Grid item xs={3}>
          {HardSoftButton(lng, constraint.hard, handleToggleHard)}
        </Grid>
        <Grid item xs={1}>
          <Box sx={{ display: "flex", flexDirection: "row" }}>
            <ConstraintButton
              lng={lng}
              buttonElement={editButton()}
              constraint={constraint}
              constraintTemplate={constraintTemplate}
              handleAddConstraint={handleAddConstraint}
              handleUpdateConstraint={handleUpdateConstraint}
            />
            <IconButton edge="end" aria-label="delete" onClick={handleDelete}>
              <ClearIcon />
            </IconButton>
          </Box>
        </Grid>
      </Grid>
    </Grid>
  );
}
