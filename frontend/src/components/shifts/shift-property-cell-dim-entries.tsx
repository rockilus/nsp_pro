import React, { useState } from "react";
// MUI
import Chip from "@mui/material/Chip";
// Components
import DimEntryTypeCellEdit from "../inputs/dim-entry-type-cell-edit";
import PopoverAnchorElOver from "../inputs/popover-anchor-el-over";
// Types
import {
  DimensionT,
  AttributeT,
  DimensionEntryType,
  DimEntryT,
} from "../../types/shift";

export default function ShiftPropertyCellDimEntries({
  selectedTeamId,
  shiftDimension,
  dimEntries,
  shiftProperty,
  handleUpdateShiftProperty,
}: {
  selectedTeamId: string;
  shiftDimension: DimensionT;
  dimEntries: DimEntryT[];
  shiftProperty: AttributeT;
  handleUpdateShiftProperty: (
    shiftProperty: AttributeT,
    teamId: string
  ) => void;
}) {
  const [open, setOpen] = useState(false);
  const [valueState, setValueState] = useState<DimEntryT[]>(
    dimEntries.filter((de) => shiftProperty.dimEntryIds.includes(de.id))
  );

  const handleClose = () => {
    setOpen(false);
  };

  const handleAddDimEntry = (dimEntry: DimEntryT) => {
    if (
      shiftDimension.entryType === DimensionEntryType.DIM_ENTRIES &&
      Array.isArray(valueState)
    ) {
      const updatedValue = [...valueState, dimEntry];
      setValueState(updatedValue);
      if (!selectedTeamId) {
        console.error("No team selected");
        return;
      }
      handleUpdateShiftProperty(
        {
          ...shiftProperty,
          dimEntryIds: updatedValue.map((v) => v.id),
        },
        selectedTeamId
      );
    } else {
      console.error("Cannot add list value to non-list property");
    }
  };

  const handleRemoveDimEntry = (dimEntry: DimEntryT) => {
    if (shiftDimension.entryType === DimensionEntryType.DIM_ENTRIES) {
      const updatedValue = valueState.filter((v) => v.id !== dimEntry.id);
      setValueState(updatedValue);
      if (!selectedTeamId) {
        console.error("No team selected");
        return;
      }
      handleUpdateShiftProperty(
        {
          ...shiftProperty,
          dimEntryIds: updatedValue.map((v) => v.id),
        },
        selectedTeamId
      );
    } else {
      console.error("Cannot remove list value from non-list property");
    }
  };

  return (
    <PopoverAnchorElOver
      buttonContent={shiftProperty.dimEntryIds.map((deId, index) => (
        <Chip
          key={deId}
          label={dimEntries.find((de) => de.id === deId)?.name || ""}
          sx={{ cursor: "pointer" }}
        />
      ))}
      content={
        <DimEntryTypeCellEdit
          selectedDimEntries={valueState}
          dimEntries={dimEntries}
          handleAddDimEntry={handleAddDimEntry}
          handleRemoveDimEntry={handleRemoveDimEntry}
          handleClose={handleClose}
        />
      }
      open={open}
      setOpen={setOpen}
    />
  );
}
