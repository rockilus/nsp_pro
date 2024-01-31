import React, { useState } from "react";

import AbcIcon from "@mui/icons-material/Abc";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import ListIcon from "@mui/icons-material/List";
import Menu from "@mui/material/Menu";
import NumbersIcon from "@mui/icons-material/Numbers";
import TableCell from "@mui/material/TableCell";
import Typography from "@mui/material/Typography";

import UpdateWorkerDimension from "./UpdateWorkerDimension";
import { WorkerDimensionT } from "./types";
import { useWorkerDimensionStore } from "../../stores/workerDimensionStore";

interface Props {
  workerDimension: WorkerDimensionT;
}

export default function WorkerDimensionCell({ workerDimension }: Props) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [nameState, setNameState] = useState(workerDimension.name);
  const [entryOptionsState, setEntryOptionsState] = useState(
    workerDimension.entryOptions
  );

  const updateWorkerDimension = useWorkerDimensionStore(
    (state) => state.updateWorkerDimension
  );

  const open = Boolean(anchorEl);

  const iconsPrefix: Record<string, React.ReactNode> = {
    str: <AbcIcon color="disabled" fontSize="small" />,
    int: <NumbersIcon color="disabled" fontSize="small" />,
    bool: <CheckBoxIcon color="disabled" fontSize="small" />,
    list: <ListIcon color="disabled" fontSize="small" />,
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleEditConfirm = () => {
    if (
      nameState !== workerDimension.name ||
      entryOptionsState !== workerDimension.entryOptions
    ) {
      const updatedWD: WorkerDimensionT = {
        id: workerDimension.id,
        name: nameState,
        entryType: workerDimension.entryType,
        entryOptions: entryOptionsState,
      };
      updateWorkerDimension(updatedWD);
    }
    setNameState(workerDimension.name);
    setEntryOptionsState(workerDimension.entryOptions);
    handleClose();
  };

  const handleEditCancel = () => {
    setNameState(workerDimension.name);
    setEntryOptionsState(workerDimension.entryOptions);
    handleClose();
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
      <Button
        id="basic-button"
        aria-controls={open ? "basic-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        style={{
          textTransform: "none",
          justifyContent: "flex-start",
          padding: 0,
        }}
        onClick={handleClick}
      >
        {cellContent()}
      </Button>
      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleEditCancel}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleEditConfirm();
          }
        }}
        MenuListProps={{
          "aria-labelledby": "basic-button",
        }}
      >
        <UpdateWorkerDimension
          workerDimensionId={workerDimension.id}
          name={nameState}
          entryType={workerDimension.entryType}
          entryOptions={entryOptionsState}
          setNameState={setNameState}
          setEntryOptions={setEntryOptionsState}
        />
      </Menu>
    </TableCell>
  );
}
