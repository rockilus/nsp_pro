import * as React from "react";
import { useTranslation } from "../../../app/i18n/client";
import dayjs from "dayjs";
// MUI
import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select, { SelectChangeEvent } from "@mui/material/Select";
// Styles
import "./add-member-dialog.css";
// Types
import {
  TeamInvitationT,
  TeamInvitationType,
  TeamInvitationStatus,
} from "@/types/team-invitation";
import { WorkerT } from "@/types/worker";

export default function AddMemberDialog({
  lng,
  workers,
  handleCreateTeamInvitation,
}: {
  lng: string;
  workers: WorkerT[];
  handleCreateTeamInvitation: (
    teamInvitation: TeamInvitationT
  ) => Promise<void>;
}) {
  const { t } = useTranslation(lng, "teams-page");

  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [helperText, setHelperText] = React.useState("");
  const [showAttachWorker, setShowAttachWorker] = React.useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = React.useState<string | null>(
    null
  );

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleCancelAttachWorker = () => {
    setShowAttachWorker(false);
    setSelectedWorkerId(null);
  };

  const handleClose = () => {
    setError(false);
    setHelperText("");
    setShowAttachWorker(false);
    setSelectedWorkerId(null);
    setOpen(false);
  };

  const handleChange = (event: SelectChangeEvent) => {
    setSelectedWorkerId(event.target.value as string);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const formJson = Object.fromEntries((formData as any).entries());
    const email = formJson.email;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || email.trim() === "") {
      setError(true);
      setHelperText(t("team_name_required"));
      return;
    }

    if (!emailRegex.test(email)) {
      setError(true);
      setHelperText(t("invalid_email"));
      return;
    }

    const teamInvitation: TeamInvitationT = {
      id: "",
      teamId: "",
      email,
      type: TeamInvitationType.MEMBER,
      workerId: selectedWorkerId,
      token: "",
      status: TeamInvitationStatus.PENDING,
      createdAt: dayjs(),
      expiresAt: dayjs().add(7, "day"),
      lastSentAt: null,
    };

    handleCreateTeamInvitation(teamInvitation).then(() => {
      handleClose();
    });
  };

  const AttachWorkerSelect = () => {
    return (
      <div className="attach-worker-select">
        <FormControl fullWidth>
          <InputLabel id="demo-simple-select-label">{t("worker")}</InputLabel>
          <Select
            labelId="demo-simple-select-label"
            id="demo-simple-select"
            value={selectedWorkerId || ""}
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
        <IconButton
          onClick={handleCancelAttachWorker}
          sx={{
            marginLeft: "10px",
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </div>
    );
  };

  return (
    <React.Fragment>
      <Button
        variant="contained"
        onClick={handleClickOpen}
        sx={{
          textTransform: "none",
          fontSize: "12px",
          padding: "3px 12px",
        }}
      >
        {t("add_member")}
      </Button>
      <Dialog
        open={open}
        onClose={handleClose}
        PaperProps={{
          component: "form",
          onSubmit: handleSubmit,
        }}
        sx={{
          "& .MuiDialog-paper": {
            width: "100%",
            maxWidth: "500px",
          },
        }}
      >
        <DialogTitle>{t("add_member")}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            required
            margin="dense"
            id="name"
            name="email"
            label={t("member_email")}
            type="email"
            fullWidth
            variant="standard"
            error={error}
            helperText={helperText}
          />
          {showAttachWorker ? (
            <AttachWorkerSelect />
          ) : (
            <button
              className="attach-worker-button"
              onClick={() => setShowAttachWorker(!showAttachWorker)}
            >
              {t("attach_worker")}
            </button>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleClose}
            sx={{
              textTransform: "none",
            }}
          >
            {t("cancel")}
          </Button>
          <Button
            variant="contained"
            type="submit"
            sx={{
              textTransform: "none",
            }}
          >
            {t("add")}
          </Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}
