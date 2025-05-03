import * as React from "react";
import { useTranslation } from "../../../app/i18n/client";
// // MUI
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";

export default function NewTeamDialog({
  lng,
  handleCreateTeam,
}: {
  lng: string;
  handleCreateTeam: (teamName: string) => void;
}) {
  const { t } = useTranslation(lng, "teams-page");

  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [helperText, setHelperText] = React.useState("");

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const formJson = Object.fromEntries((formData as any).entries());
    const teamName = formJson.email;

    if (!teamName || teamName.trim() === "") {
      setError(true);
      setHelperText(t("team_name_required"));
      return;
    }

    handleCreateTeam(teamName);
    handleClose();
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
        {t("new_team")}
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
        <DialogTitle>{t("new_team")}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            required
            margin="dense"
            id="name"
            name="email"
            label={t("team_name")}
            type="text"
            fullWidth
            variant="standard"
            error={error}
            helperText={helperText}
          />
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
            {t("create")}
          </Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}
