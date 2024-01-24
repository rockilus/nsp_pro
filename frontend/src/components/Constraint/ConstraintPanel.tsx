import React, { useState } from "react";

import Box from "@mui/material/Box";
import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";

import ConstraintEdit from "./ConstraintEdit";
import NewConstraint from "./NewConstraint";
import { ConstraintT } from "./types";

interface Props {
  constraint: ConstraintT;
  handleClose: () => void;
}

export default function ConstraintPanel({ constraint, handleClose }: Props) {
  return (
    <Box style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      {/* <NewConstraint constraint={constraint} handleClose={handleClose} /> */}
    </Box>
  );
}
