import React from "react";

import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import CircleIcon from "@mui/icons-material/Circle";
import ClearIcon from "@mui/icons-material/Clear";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import Grid from "@mui/material/Grid";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import IconButton from "@mui/material/IconButton";
import Rating from "@mui/material/Rating";
import RemoveIcon from "@mui/icons-material/Remove";
import ToggleButton from "@mui/material/ToggleButton";
import Typography from "@mui/material/Typography";

import ConstraintButton from "./ConstraintButton";
import { ConstraintT } from "./types";
import { useConstraintStore } from "../../stores/constraintStore";
import { PriorityLevels } from "../../utils/constants";

interface Props {
  constraint: ConstraintT;
}

export default function ConstraintListItem({ constraint }: Props) {
  const updateConstraint = useConstraintStore(
    (state) => state.updateConstraint
  );
  const deleteConstraint = useConstraintStore(
    (state) => state.deleteConstraint
  );

  const handleDelete = async () => {
    await deleteConstraint(constraint.id);
  };

  const handleToggleHard = () => {
    const updatedConstraint = { ...constraint, hard: !constraint.hard };
    updateConstraint(updatedConstraint);
  };

  const handlePriorityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const updatedConstraint = {
      ...constraint,
      priority: PriorityLevels[Number(event.target.value) - 1],
    };
    updateConstraint(updatedConstraint);
  };

  const handlePriorityIncrease = () => {
    const currentlLevel = PriorityLevels.indexOf(constraint.priority);
    if (currentlLevel < PriorityLevels.length - 1) {
      const updatedConstraint = {
        ...constraint,
        priority: PriorityLevels[currentlLevel + 1],
      };
      updateConstraint(updatedConstraint);
    }
  };

  const handlePriorityDecrease = () => {
    const currentlLevel = PriorityLevels.indexOf(constraint.priority);
    if (currentlLevel > 0) {
      const updatedConstraint = {
        ...constraint,
        priority: PriorityLevels[currentlLevel - 1],
      };
      updateConstraint(updatedConstraint);
    }
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
        {/* {!constraint.hard && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <IconButton size="small" onClick={handlePriorityDecrease}>
              <RemoveIcon fontSize="inherit" />
            </IconButton>
            <Rating
              name="highlight-selected-only"
              value={PriorityLevels.indexOf(constraint.priority) + 1}
              icon={<CircleIcon fontSize="inherit" color="warning" />}
              emptyIcon={<CircleIcon fontSize="inherit" color="disabled" />}
              max={PriorityLevels.length}
              highlightSelectedOnly
              size="small"
              onChange={(e) => {
                handlePriorityChange(e);
              }}
            />
            <IconButton size="small" onClick={handlePriorityIncrease}>
              <AddIcon fontSize="inherit" />
            </IconButton>
          </Box>
        )} */}
      </Box>
    );
  };

  return (
    <Grid item xs={12} md={12} xl={12}>
      <Grid
        container
        spacing={0}
        sx={{ display: "flex", alignItems: "center" }}
      >
        <Grid item xs={8}>
          <Typography variant="subtitle2" align="left" color="black">
            {constraint.text}
          </Typography>
        </Grid>
        <Grid item xs={3}>
          {hardSoftButton()}
        </Grid>
        <Grid item xs={1}>
          <Box sx={{ display: "flex", flexDirection: "row" }}>
            <ConstraintButton
              buttonElement={editButton()}
              constraint={constraint}
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
