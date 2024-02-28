import React from "react";
// MUI
import Box from "@mui/material/Box";
import ClearIcon from "@mui/icons-material/Clear";
import EditIcon from "@mui/icons-material/Edit";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import ToggleButton from "@mui/material/ToggleButton";
import Typography from "@mui/material/Typography";
// Components
import ConstraintButton from "./ConstraintButton";
// Stores
import { useConstraintStore } from "../../stores/constraintStore";
// Types
import { ConstraintT, TemplateT } from "./types";
// Constants
import {
  ConstraintColorActiveBack,
  ConstraintColorInactiveBack,
  ConstraintColorActiveText,
  ConstraintColorInactiveText,
} from "../../utils/constants";
import { TeamT } from "../../containers/types";

interface Props {
  team: TeamT;
  constraint: ConstraintT;
  constraintTemplate: TemplateT | null;
}

export default function ConstraintListItem({
  team,
  constraint,
  constraintTemplate,
}: Props) {
  const updateConstraint = useConstraintStore(
    (state) => state.updateConstraint
  );
  const deleteConstraint = useConstraintStore(
    (state) => state.deleteConstraint
  );

  const handleDelete = async () => {
    await deleteConstraint(constraint.id, team.id);
  };

  const handleToggleHard = () => {
    const updatedConstraint = { ...constraint, hard: !constraint.hard };
    updateConstraint(updatedConstraint);
  };

  const editButton = () => {
    return (
      <IconButton edge="end" aria-label="delete">
        <EditIcon />
      </IconButton>
    );
  };

  const hardSoftButton = () => {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <ToggleButton
          value="hard"
          // color="primary"
          // selected={constraint.hard}
          onChange={handleToggleHard}
          sx={{ height: 30 }}
        >
          {constraint.hard ? "Hard" : "Soft"}
        </ToggleButton>
      </Box>
    );
  };

  return (
    <Grid item xs={12} md={12} xl={12}>
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
          {hardSoftButton()}
        </Grid>
        <Grid item xs={1}>
          <Box sx={{ display: "flex", flexDirection: "row" }}>
            <ConstraintButton
              buttonElement={editButton()}
              constraint={constraint}
              constraintTemplate={constraintTemplate}
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
