import React, { useState } from "react";

import Box from "@mui/material/Box";
import CancelIcon from "@mui/icons-material/Cancel";
import Drawer from "@mui/material/Drawer";
import Typography from "@mui/material/Typography";

import BuildConstraint from "./BuildContraint";

interface Props {
  drawerOpen: boolean;
  toggleDrawer: () => void;
  constraintParams: Record<string, any>;
  handleAddRow: (newRow: Record<string, any>) => void;
}

export default function ConstraintDrawerTemplate({
  drawerOpen,
  toggleDrawer,
  constraintParams,
  handleAddRow,
}: Props) {
  const handleAddConfirm = async (newRow: Record<string, any>) => {
    await handleAddRow(newRow);
    toggleDrawer();
  };

  return (
    <Drawer anchor="bottom" open={drawerOpen} onClose={toggleDrawer}>
      <Box sx={{ width: 350 }} role="presentation">
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            pt: 2,
            pr: 2,
            pl: 2,
          }}
        >
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            New Contraint
          </Typography>
          <CancelIcon
            onClick={toggleDrawer}
            sx={{ color: "text.secondary", cursor: "pointer" }}
          />
        </Box>
        <BuildConstraint
          constraintParams={constraintParams}
          constraint={{}}
          handleAddRow={handleAddConfirm}
          handleEditRow={() => {}}
          editMode={false}
        />
      </Box>
    </Drawer>
  );
}
