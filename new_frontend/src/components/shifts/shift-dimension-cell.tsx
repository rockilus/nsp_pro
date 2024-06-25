import React, { useState } from "react";
// MUI
import AbcIcon from "@mui/icons-material/Abc";
import Box from "@mui/material/Box";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import ListIcon from "@mui/icons-material/List";
import NumbersIcon from "@mui/icons-material/Numbers";
import TableCell from "@mui/material/TableCell";
import Typography from "@mui/material/Typography";
// Components
import PopoverAnchorElBelow from "../inputs/popover-anchor-el-below";
import UpdateShiftDimensionForm from "./update-shift-dimension-form";
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
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Typography
        variant="body2"
        color="text.secondary"
        align="left"
        sx={{ fontWeight: "bold" }}
      >
        {shiftDimension.name}
      </Typography>
      {iconsPrefix[shiftDimension.entryType]}
    </Box>
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
