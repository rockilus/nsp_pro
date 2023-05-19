import React, { useState, useContext } from "react";

import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";

import { HospitalContext } from "../../context/HospitalContext";

export default function AddConstaint() {
  const [addingConstraint, setAddingConstraint] = useState(false);
  const hospitalContext = useContext(HospitalContext);

  const handleAddingOption = () => {
    setAddingConstraint(true);
  };

  const handleAddOptionCancel = () => {
    setAddingConstraint(false);
  };

  return (
    <Grid
      container
      direction="column"
      justifyContent="center"
      alignItems="stretch"
      spacing={2}
    >
      <Grid item xs={12}>
        {addingConstraint ? (
          "Test"
        ) : (
          <Chip
            icon={<AddIcon />}
            onClick={() => setAddingConstraint(true)}
            label="Add Constraint"
          />
        )}
      </Grid>
    </Grid>
  );
}
