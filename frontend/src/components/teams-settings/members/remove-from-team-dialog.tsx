import * as React from 'react';
import { useTranslation } from '../../../app/i18n/client';
// // MUI
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import DeleteIcon from '@mui/icons-material/Delete';
// Types
import { TeamMembershipRole } from '@/types/team';
import { UserWithMembership } from '@/types/user';

export default function RemoveFromTeamDialog({
  lng,
  teamId,
  userWithMembership,
  handleRemoveFromTeam,
}: {
  lng: string;
  teamId: string;
  userWithMembership: UserWithMembership;
  handleRemoveFromTeam: (teamId: string, userId: string) => void;
}) {
  const { t } = useTranslation(lng, 'teams-page');

  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [helperText, setHelperText] = React.useState('');
  const [confirmationName, setConfirmationName] = React.useState('');

  // Define a variable to store the confirmation string based on the user's name or email
  const confirmationString =
    userWithMembership.user.firstName.trim() && userWithMembership.user.lastName.trim()
      ? `${userWithMembership.user.firstName.toLocaleLowerCase()} ${userWithMembership.user.lastName.toLocaleLowerCase()}`
      : userWithMembership.user.email.toLocaleLowerCase();

  const isDisabled = confirmationName.trim() !== confirmationString;

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (confirmationName.trim() !== confirmationString) {
      setError(true);
      setHelperText(t('user_name_mismatch'));
      return;
    }

    handleRemoveFromTeam(teamId, userWithMembership.user.id);
    handleClose();
  };

  return (
    <React.Fragment>
      <Button
        variant="outlined"
        onClick={handleClickOpen}
        color="error"
        disabled={userWithMembership.membership.role === TeamMembershipRole.OWNER}
        sx={{
          textTransform: 'none',
          fontSize: '12px',
          padding: '3px 0',
          height: '100%',
        }}
      >
        <DeleteIcon fontSize="small" />
      </Button>
      <Dialog
        open={open}
        onClose={handleClose}
        PaperProps={{
          component: 'form',
          onSubmit: handleSubmit,
        }}
        sx={{
          '& .MuiDialog-paper': {
            width: '100%',
            maxWidth: '500px',
          },
        }}
      >
        <DialogTitle>{`${t('remove_from_team')} ${
          userWithMembership.user.firstName
        } ${userWithMembership.user.lastName}`}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('remove_from_team_message_1')}
            <strong>{confirmationString}</strong>
            {t('remove_from_team_message_2')}
          </DialogContentText>
          <TextField
            autoFocus
            required
            margin="dense"
            id="name"
            name="email"
            placeholder={confirmationString}
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
              textTransform: 'none',
            }}
          >
            {t('cancel')}
          </Button>
          <Button
            variant="contained"
            type="submit"
            disabled={isDisabled}
            sx={{
              textTransform: 'none',
            }}
          >
            {t('remove')}
          </Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}
