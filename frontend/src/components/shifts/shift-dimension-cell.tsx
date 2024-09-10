import React, { useState } from "react";
// MUI
import AbcIcon from "@mui/icons-material/Abc";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import ListIcon from "@mui/icons-material/List";
import NumbersIcon from "@mui/icons-material/Numbers";
import TableCell from "@mui/material/TableCell";
// Components
import PopoverAnchorElBelow from "../inputs/popover-anchor-el-below";
import UpdateShiftDimensionForm from "./update-shift-dimension-form";
// Styles
import "../../styles/table-styles.css";
//Types
import { ShiftDimensionT } from "../../types/shift";

export default function ShiftDimensionCell({
  lng,
  selectedTeamId,
  shiftDimension,
  handleUpdateShiftDimension,
  handleDeleteShiftDimension,
}: {
  lng: string;
  selectedTeamId: string;
  shiftDimension: ShiftDimensionT;
  handleUpdateShiftDimension: (shiftDimension: ShiftDimensionT) => void;
  handleDeleteShiftDimension: (shiftDimensionId: string) => void;
}) {
  const [popoverAnchorOpen, setPopoverAnchorOpen] = useState(false);

  const iconsPrefix: Record<string, React.ReactNode> = {
    str: <AbcIcon color="disabled" fontSize="small" />,
    int: <NumbersIcon color="disabled" fontSize="small" />,
    bool: <CheckBoxIcon color="disabled" fontSize="small" />,
    list: <ListIcon color="disabled" fontSize="small" />,
  };

  const cellContent = () => (
    <div className="table-header-custom-container">
      <span className="table-header-custom">{shiftDimension.name}</span>
      {iconsPrefix[shiftDimension.entryType]}
    </div>
  );

  return (
    <TableCell
      key={shiftDimension.id}
      component="th"
      scope="row"
      sx={{ paddingY: 0 }}
    >
      <PopoverAnchorElBelow
        buttonContent={cellContent()}
        content={
          <UpdateShiftDimensionForm
            lng={lng}
            selectedTeamId={selectedTeamId}
            shiftDimension={shiftDimension}
            setOpenParent={setPopoverAnchorOpen}
            handleUpdateShiftDimension={handleUpdateShiftDimension}
            handleDeleteShiftDimension={handleDeleteShiftDimension}
          />
        }
        open={popoverAnchorOpen}
        setOpen={setPopoverAnchorOpen}
      />
    </TableCell>
  );
}
