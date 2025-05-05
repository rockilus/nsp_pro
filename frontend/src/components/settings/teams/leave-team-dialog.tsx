import * as React from "react";
import { useTranslation } from "../../../app/i18n/client";
// // MUI
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
// Types
import { TeamWithMembership, TeamMembershipRole } from "@/types/team";

export default function LeaveTeamDialog({
  lng,
  teamWithMembership,
  handleLeaveTeam,
}: {
  lng: string;
  teamWithMembership: TeamWithMembership;
  handleLeaveTeam: (teamId: string) => void;
}) {
  const { t } = useTranslation(lng, "teams-page");

  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [helperText, setHelperText] = React.useState("");
  const [confirmationName, setConfirmationName] = React.useState("");

  const isDisabled =
    confirmationName.trim() !==
    teamWithMembership.team.name.toLocaleLowerCase();

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      confirmationName.trim() !==
      teamWithMembership.team.name.toLocaleLowerCase()
    ) {
      setError(true);
      setHelperText(t("team_name_mismatch"));
      return;
    }

    handleLeaveTeam(teamWithMembership.team.id);
    handleClose();
  };

  return (
    <React.Fragment>
      <Button
        variant="outlined"
        onClick={handleClickOpen}
        color="error"
        disabled={
          teamWithMembership.membership.role === TeamMembershipRole.OWNER
        }
        sx={{
          textTransform: "none",
          fontSize: "12px",
          padding: "3px 12px",
        }}
      >
        {t("leave")}
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
        <DialogTitle>{`${t("leave_team")} ${
          teamWithMembership.team.name
        }`}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("leave_team_message_1")}
            <strong>{teamWithMembership.team.name.toLocaleLowerCase()}</strong>
            {t("leave_team_message_2")}
          </DialogContentText>
          <TextField
            autoFocus
            required
            margin="dense"
            id="name"
            name="email"
            placeholder={teamWithMembership.team.name.toLocaleLowerCase()}
            type="text"
            fullWidth
            variant="standard"
            error={error}
            helperText={helperText}
            value={confirmationName}
            onChange={(e) => setConfirmationName(e.target.value)}
            onPaste={(e) => e.preventDefault()}
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
            disabled={isDisabled}
            sx={{
              textTransform: "none",
            }}
          >
            {t("leave")}
          </Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}
