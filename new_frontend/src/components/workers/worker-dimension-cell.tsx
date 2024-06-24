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
import UpdateWorkerDimensionForm from "./update-worker-dimension-form";
// Types
import { WorkerDimensionT } from "../../types/worker";

export default function WorkerDimensionCell({
  selectedTeamId,
  workerDimension,
  handleUpdateWorkerDimension,
  handleDeleteWorkerDimension,
}: {
  selectedTeamId: string;
  workerDimension: WorkerDimensionT;
  handleUpdateWorkerDimension: (workerDimension: WorkerDimensionT) => void;
  handleDeleteWorkerDimension: (workerDimensionId: string) => void;
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
        {workerDimension.name}
      </Typography>
      {iconsPrefix[workerDimension.entryType]}
    </Box>
  );

  return (
    <TableCell
      key={workerDimension.id}
      component="th"
      scope="row"
      sx={{ paddingY: 0 }}
    >
      <PopoverAnchorElBelow
        buttonContent={cellContent()}
        content={
          <UpdateWorkerDimensionForm
            selectedTeamId={selectedTeamId}
            workerDimension={workerDimension}
            setOpenParent={setPopoverAnchorOpen}
            handleUpdateWorkerDimension={handleUpdateWorkerDimension}
            handleDeleteWorkerDimension={handleDeleteWorkerDimension}
          />
        }
        open={popoverAnchorOpen}
        setOpen={setPopoverAnchorOpen}
      />
    </TableCell>
  );
}
