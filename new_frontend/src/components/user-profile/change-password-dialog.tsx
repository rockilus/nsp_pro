import React, { useState } from "react";
import { useTranslation } from "react-i18next";
// MUI
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import EditIcon from "@mui/icons-material/Edit";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";

export default function ChangePasswordDialog({
  lng,
  handleUpdatePassword,
}: {
  lng: string;
  handleUpdatePassword: (passwordData: {
    currentPassword: string;
    newPassword: string;
    newPasswordConfirm: string;
  }) => void;
}) {
  const { t } = useTranslation();

  const [passwordData, setPasswordData] = useState<{
    currentPassword: string;
    newPassword: string;
    newPasswordConfirm: string;
  }>({
    currentPassword: "",
    newPassword: "",
    newPasswordConfirm: "",
  });
  const [open, setOpen] = useState<boolean>(false);
  const [currentPasswordError, setCurrentPasswordError] =
    useState<boolean>(false);
  const [newPasswordError, setNewPasswordError] = useState<boolean>(false);
  const [newPasswordConfirmError, setNewPasswordConfirmError] =
    useState<boolean>(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showNewPasswordConfirm, setShowNewPasswordConfirm] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string>("");

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      newPasswordConfirm: "",
    });
    setCurrentPasswordError(false);
    setNewPasswordError(false);
    setNewPasswordConfirmError(false);
    setOpen(false);
  };

  const handleUpdatePasswordClick = async () => {
    if (passwordData.currentPassword === "") {
      setCurrentPasswordError(true);
      return;
    }
    if (passwordData.newPassword === "") {
      setNewPasswordError(true);
      return;
    }
    if (passwordData.newPassword !== passwordData.newPasswordConfirm) {
      setNewPasswordConfirmError(true);
      return;
    }
    await handleUpdatePassword(passwordData);
    handleClose();
  };

  return (
    <React.Fragment>
      <IconButton onClick={handleClickOpen}>
        <EditIcon />
      </IconButton>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {t("user.change_password")}
        </DialogTitle>
        <DialogContent>
          <Box
            component="form"
            sx={{
              display: "flex",
              flexDirection: "column",
              "& .MuiTextField-root": { m: 1, width: "25ch" },
            }}
            noValidate
            autoComplete="off"
          >
            <TextField
              id="outlined-password-input"
              label={t("user.current_password")}
              type={showCurrentPassword ? "text" : "password"}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() =>
                        setShowCurrentPassword(!showCurrentPassword)
                      }
                    >
                      {showCurrentPassword ? <Visibility /> : <VisibilityOff />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              autoComplete="current-password"
              value={passwordData.currentPassword}
              onChange={(e) => {
                setPasswordData({
                  ...passwordData,
                  currentPassword: e.target.value,
                });
                if (e.target.value === "") {
                  setCurrentPasswordError(true);
                } else {
                  setCurrentPasswordError(false);
                }
              }}
              error={currentPasswordError}
              helperText={
                currentPasswordError ? t("user.password_empty_error") : ""
              }
            />
            <TextField
              id="outlined-password-input"
              label={t("user.new_password")}
              type={showNewPassword ? "text" : "password"}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <Visibility /> : <VisibilityOff />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              autoComplete="new-password"
              value={passwordData.newPassword}
              onChange={(e) => {
                setPasswordData({
                  ...passwordData,
                  newPassword: e.target.value,
                });
                if (e.target.value === "") {
                  setNewPasswordError(true);
                } else {
                  setNewPasswordError(false);
                }
              }}
              error={newPasswordError}
              helperText={
                newPasswordError ? t("user.password_empty_error") : ""
              }
            />
            <TextField
              id="outlined-password-input"
              label={t("user.new_password_confirm")}
              type={showNewPasswordConfirm ? "text" : "password"}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() =>
                        setShowNewPasswordConfirm(!showNewPasswordConfirm)
                      }
                    >
                      {showNewPasswordConfirm ? (
                        <Visibility />
                      ) : (
                        <VisibilityOff />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              autoComplete="new-password"
              value={passwordData.newPasswordConfirm}
              onChange={(e) => {
                setPasswordData({
                  ...passwordData,
                  newPasswordConfirm: e.target.value,
                });
                if (e.target.value !== passwordData.newPassword) {
                  setNewPasswordConfirmError(true);
                } else {
                  setNewPasswordConfirmError(false);
                }
              }}
              error={newPasswordConfirmError}
              helperText={
                newPasswordConfirmError ? t("user.password_match_error") : ""
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>{t("common.cancel")}</Button>
          <Button onClick={handleUpdatePasswordClick} autoFocus>
            {t("user.update_password")}
          </Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}
