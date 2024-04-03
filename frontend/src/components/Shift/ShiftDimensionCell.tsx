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
import PopoverAnchorElBelow from "../../utils/PopoverAnchorElBelow";
import UpdateShiftDimensionForm from "./UpdateShiftDimensionForm";
//Types
import { ShiftDimensionT } from "./types";

interface Props {
  shiftDimension: ShiftDimensionT;
}

export default function ShiftDimensionCell({ shiftDimension }: Props) {
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
      <Typography variant="body2" color="text.secondary" align="left">
        {shiftDimension.name}
      </Typography>
      {iconsPrefix[shiftDimension.entryType]}
    </Box>
  );

  return (
    <TableCell key={shiftDimension.id} component="th" scope="row">
      <PopoverAnchorElBelow
        buttonContent={cellContent()}
        content={
          <UpdateShiftDimensionForm
            shiftDimension={shiftDimension}
            setOpenParent={setPopoverAnchorOpen}
          />
        }
        open={popoverAnchorOpen}
        setOpen={setPopoverAnchorOpen}
      />
    </TableCell>
  );
}
