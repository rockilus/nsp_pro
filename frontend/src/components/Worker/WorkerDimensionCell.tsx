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
import PopoverAnchorEl from "./PopoverAnchorEl";
import UpdateWorkerDimensionForm from "./UpdateWorkerDimensionForm";
// Types
import { WorkerDimensionT } from "./types";

interface Props {
  workerDimension: WorkerDimensionT;
}

export default function WorkerDimensionCell({ workerDimension }: Props) {
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
        {workerDimension.name}
      </Typography>
      {iconsPrefix[workerDimension.entryType]}
    </Box>
  );

  return (
    <TableCell key={workerDimension.id} component="th" scope="row">
      <PopoverAnchorEl
        buttonContent={cellContent()}
        content={
          <UpdateWorkerDimensionForm
            workerDimension={workerDimension}
            setOpenParent={setPopoverAnchorOpen}
          />
        }
        open={popoverAnchorOpen}
        setOpen={setPopoverAnchorOpen}
      />
    </TableCell>
  );
}
