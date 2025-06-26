import React, { useState } from "react";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
// Components
import PopoverSelectShifts from "./popover-select-shifts";
import { blockDislayValue } from "./block-display";
import ShiftOptionsEdit from "./shift-options-edit";
// Utils
import {
  expandBoolDimOptions,
  groupByCategoryName,
} from "../../constraints/shift-worker-option-utils/shift-worker-option-utils";
import { getShiftWorkerOptionDisplayText } from "../../../utils/shift-worker-option-display";
// Types
import { ShiftWorkerOptionT } from "../../../types/constraint";

export default function ShiftOptionsDisplay({
  lng,
  selectedShifts,
  statsShiftOptions,
  disabled,
  handleEditSelectedShifts,
}: {
  lng: string;
  selectedShifts: ShiftWorkerOptionT[];
  statsShiftOptions: ShiftWorkerOptionT[];
  disabled: boolean;
  handleEditSelectedShifts: (selectedShifts: ShiftWorkerOptionT[]) => void;
}) {
  const { t } = useTranslation(lng, "stats-page");

  const [open, setOpen] = useState(false);
  const [selectedShiftsState, setSelectedShiftsState] =
    useState<ShiftWorkerOptionT[]>(selectedShifts);

  const blockDisplay = () => {
    return (
      <div className="block-display">
        {selectedShiftsState.length !== 0
          ? blockDislayValue(
              selectedShiftsState
                .map((item) =>
                  typeof item === "object" && "name" in item
                    ? getShiftWorkerOptionDisplayText(item, [], [], t("not"))
                    : ""
                )
                .join(", "),
              disabled
            )
          : t("select_shift")}
      </div>
    );
  };

  const handleConfirmEditSelectedShifts = () => {
    if (disabled) {
      return;
    }
    handleEditSelectedShifts(selectedShiftsState);
    setOpen(false);
  };

  const handleEditSelectedShiftsState = (
    selectedShifts: ShiftWorkerOptionT[]
  ) => {
    setSelectedShiftsState(selectedShifts);
  };

  const handleOpenPopover = () => {
    if (disabled) {
      return;
    }
    setOpen(true);
  };

  const handleClosePopover = () => {
    if (disabled) {
      return;
    }
    handleEditSelectedShifts(selectedShiftsState);
    setOpen(false);
  };

  return (
    <PopoverSelectShifts
      buttonContent={blockDisplay()}
      content={
        <ShiftOptionsEdit
          lng={lng}
          selectedShifts={selectedShiftsState}
          statsShiftOptions={groupByCategoryName(
            expandBoolDimOptions(statsShiftOptions)
          )}
          handleConfirmEditSelectedShifts={handleConfirmEditSelectedShifts}
          handleEditSelectedShiftsState={handleEditSelectedShiftsState}
        />
      }
      open={open}
      disabled={disabled}
      handleOpenPopover={handleOpenPopover}
      handleClosePopover={handleClosePopover}
    />
  );
}
