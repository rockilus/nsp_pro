import React, { useState } from "react";
// MUI
import Box from "@mui/material/Box";
// Components
import PopoverBoxAnchorElOver from "../../SharedComponents/PopoverBoxAnchorElOver";
import { blockDislayValue } from "../../SharedComponents/blockDislay";
import ShiftOptionsEdit from "./ShiftOptionsEdit";
// Types
import { TemplateOptionValueT } from "../../Constraint/types";
import { StatsShiftOptionsT } from "../types";

interface Props {
  selectedShifts: TemplateOptionValueT[];
  statsShiftOptions: StatsShiftOptionsT;
  handleEditSelectedShifts: (selectedShifts: TemplateOptionValueT[]) => void;
}

export default function ShiftOptionsDisplay({
  selectedShifts,
  statsShiftOptions,
  handleEditSelectedShifts,
}: Props) {
  const [open, setOpen] = useState(false);

  const blockDisplay = () => {
    return (
      <div>
        {selectedShifts.length !== 0
          ? blockDislayValue(
              selectedShifts
                .map((item) =>
                  typeof item === "object" && "name" in item ? item.name : ""
                )
                .join(", ")
            )
          : "Select shift options"}
      </div>
    );
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Box sx={{ width: "160px" }}>
      <PopoverBoxAnchorElOver
        buttonContent={blockDisplay()}
        content={
          <ShiftOptionsEdit
            selectedShifts={selectedShifts}
            statsShiftOptions={statsShiftOptions}
            handleEditSelectedShifts={handleEditSelectedShifts}
            handleClose={handleClose}
          />
        }
        open={open}
        setOpen={setOpen}
      />
    </Box>
  );
}
