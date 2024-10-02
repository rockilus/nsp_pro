import React, { useState } from "react";
// MUI
import AbcIcon from "@mui/icons-material/Abc";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import ListIcon from "@mui/icons-material/List";
import NumbersIcon from "@mui/icons-material/Numbers";
import TableCell from "@mui/material/TableCell";
// Components
import PopoverAnchorElBelow from "../inputs/popover-anchor-el-below";
import UpdateDimensionForm from "./dimension/update-dimension-form";
// Styles
import "../../styles/table-styles.css";
//Types
import { DimensionT } from "../../types/shift";

export default function ShiftDimensionCell({
  lng,
  selectedTeamId,
  shiftDimension,
  handleUpdateShiftDimension,
  handleDeleteShiftDimension,
}: {
  lng: string;
  selectedTeamId: string;
  shiftDimension: DimensionT;
  handleUpdateShiftDimension: (shiftDimension: DimensionT) => void;
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
          <UpdateDimensionForm
            lng={lng}
            selectedTeamId={selectedTeamId}
            shiftDimension={shiftDimension}
            setOpenParent={setPopoverAnchorOpen}
            handleUpdateDimension={handleUpdateShiftDimension}
            handleDeleteDimension={handleDeleteShiftDimension}
          />
        }
        open={popoverAnchorOpen}
        setOpen={setPopoverAnchorOpen}
      />
    </TableCell>
  );
}
