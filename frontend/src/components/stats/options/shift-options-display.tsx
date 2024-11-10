import React, { useState } from "react";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
// Components
import PopoverBoxAnchorElOver from "../../inputs/popover-box-anchor-el-over";
import { blockDislayValue } from "../../data-display/block-display";
import ShiftOptionsEdit from "./shift-options-edit";
// Utils
import {
  getShiftWorkerOptionDisplayName,
  expandBoolDimOptions,
  groupByCategoryName,
} from "../../constraints/shift-worker-option-utils/shift-worker-option-utils";
// Types
import { ShiftWorkerOptionT } from "../../../types/constraint";

export default function ShiftOptionsDisplay({
  lng,
  selectedShifts,
  statsShiftOptions,
  handleEditSelectedShifts,
}: {
  lng: string;
  selectedShifts: ShiftWorkerOptionT[];
  statsShiftOptions: ShiftWorkerOptionT[];
  handleEditSelectedShifts: (selectedShifts: ShiftWorkerOptionT[]) => void;
}) {
  const { t } = useTranslation(lng, "stats-page");

  const [open, setOpen] = useState(false);

  const blockDisplay = () => {
    return (
      <div>
        {selectedShifts.length !== 0
          ? blockDislayValue(
              selectedShifts
                .map((item) =>
                  typeof item === "object" && "name" in item
                    ? getShiftWorkerOptionDisplayName(item)
                    : ""
                )
                .join(", ")
            )
          : t("select_shift")}
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
            lng={lng}
            selectedShifts={selectedShifts}
            statsShiftOptions={groupByCategoryName(
              expandBoolDimOptions(statsShiftOptions)
            )}
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
