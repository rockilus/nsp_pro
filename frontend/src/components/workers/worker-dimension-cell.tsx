import React, { useState } from "react";
// MUI
import AbcIcon from "@mui/icons-material/Abc";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import ListIcon from "@mui/icons-material/List";
import NumbersIcon from "@mui/icons-material/Numbers";
import TableCell from "@mui/material/TableCell";
// Components
import PopoverAnchorElBelow from "../inputs/popover-anchor-el-below";
import UpdateWorkerDimensionForm from "./update-worker-dimension-form";
// Styles
import "../../styles/table-styles.css";
// Types
import { WorkerDimensionT } from "../../types/worker";

export default function WorkerDimensionCell({
  lng,
  selectedTeamId,
  workerDimension,
  handleUpdateWorkerDimension,
  handleDeleteWorkerDimension,
}: {
  lng: string;
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
    <div className="table-header-custom-container">
      <span className="table-header-custom">{workerDimension.name}</span>
      {iconsPrefix[workerDimension.entryType]}
    </div>
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
            lng={lng}
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
