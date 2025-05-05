import React, { useState } from "react";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import Popover from "@mui/material/Popover";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import Button from "@mui/material/Button";
// Styles
import "./edit-worker.css";
// Types
import { WorkerT } from "@/types/worker";

export default function EditWorkerPopover({
  lng,
  teamId,
  userId,
  workers,
  handleAttachUserToWorker,
}: {
  lng: string;
  teamId: string;
  userId: string;
  workers: WorkerT[];
  handleAttachUserToWorker: (
    workerId: string,
    userId: string,
    teamId: string
  ) => Promise<void>;
}) {
  const { t } = useTranslation(lng, "teams-page");

  const userWorker = workers.find((worker) => worker.userId === userId) || null;
  const [workerIdState, setWorkerIdState] = useState<string | null>(
    userWorker?.id || null
  );
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleChange = (event: SelectChangeEvent) => {
    setWorkerIdState(event.target.value as string);
  };

  const handleSave = async () => {
    if (!workerIdState) return;

    const targetWorker = workers.find((worker) => worker.id === workerIdState);
    if (!targetWorker || targetWorker.userId !== null) return;

    await handleAttachUserToWorker(workerIdState, userId, teamId);
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? "simple-popover" : undefined;

  return (
    <div>
      <Button
        aria-describedby={id}
        variant="contained"
        onClick={handleClick}
        sx={{
          textTransform: "none",
          backgroundColor: "transparent",
          boxShadow: "none",
          color: "#616161",
          fontSize: "0.75rem",
          frontWeight: 500,
          marginRight: "10px",
          "&:hover": {
            textDecoration: "underline",
            backgroundColor: "transparent",
            boxShadow: "none",
          },
        }}
      >
        {userWorker?.name || t("no_worker")}
      </Button>
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        slotProps={{
          paper: {
            style: {
              boxShadow: "0px 3px 5px rgba(0, 0, 0, 0.2)",
              padding: 20,
              width: 350,
            },
          },
        }}
      >
        <FormControl fullWidth>
          <InputLabel id="demo-simple-select-label">{t("worker")}</InputLabel>
          <Select
            labelId="demo-simple-select-label"
            id="demo-simple-select"
            value={workerIdState || ""}
            label="Worker"
            onChange={handleChange}
          >
            {workers.map((worker) => (
              <MenuItem
                key={worker.id}
                value={worker.id}
                disabled={worker.userId !== null}
              >
                {worker.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <div className="edit-worker-actions">
          <Button
            variant="contained"
            type="submit"
            disabled={!workerIdState}
            onClick={handleSave}
            sx={{
              textTransform: "none",
            }}
          >
            {t("save")}
          </Button>
        </div>
      </Popover>
    </div>
  );
}
