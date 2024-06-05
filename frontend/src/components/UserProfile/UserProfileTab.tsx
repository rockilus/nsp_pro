import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
// MUI
import Box from "@mui/material/Box";
import CheckIcon from "@mui/icons-material/Check";
import Chip from "@mui/material/Chip";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
// Components
import ChangePasswordDialog from "./ChangePasswordDialog";
// Stores
import { useUserStore } from "../../stores/userStore";
// Types
import { UserT } from "./types";
// Constants
import { languages } from "../../utils/constants";

interface Props {
  user: UserT | null;
}

export default function UserProfileTab({ user }: Props) {
  const { t } = useTranslation();

  const [fieldEditing, setFieldEditing] = useState<string | null>(null);
  const [userState, setUserState] = useState<UserT | null>(user);

  const fetchUser = useUserStore((state) => state.fetchUser);
  const updateUser = useUserStore((state) => state.updateUser);
  const sendVerificationEmail = useUserStore(
    (state) => state.sendVerificationEmail
  );

  const tableFields: Record<string, string>[] = [
    { name: "firstName", label: t("user.first_name") },
    { name: "lastName", label: t("user.last_name") },
    // { name: "email", label: t("user.email") },
  ];

  const handleEditConfirm = () => {
    if (userState && user) {
      const userKeys = Object.keys(user);
      for (let key of userKeys) {
        if (key === "workers") continue;
        if (
          user[key as keyof typeof user] !==
          userState[key as keyof typeof userState]
        ) {
          updateUser(userState);
          break;
        }
      }
      if (userState.language !== user.language) {
        i18n.changeLanguage(userState.language);
        localStorage.setItem("i18nextLng", userState.language);
      }
    }
    setFieldEditing(null);
  };

  const handleEditCancel = () => {
    setUserState(user);
    setFieldEditing(null);
  };

  const handleChange = (event: SelectChangeEvent) => {
    if (!userState) return;
    setUserState({ ...userState, language: event.target.value as string });
  };

  useEffect(() => {
    if (!user) {
      console.log("fetching user");
      fetchUser();
    }
  }, [user, fetchUser]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignSelf: "flex-start",
        backgroundColor: "grey.100",
        minWidth: 200,
        border: "1px solid grey",
        borderRadius: 2,
        margin: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          minHeight: 45,
          paddingX: 1,
          borderBottom: "1px solid lightgrey",
        }}
      >
        <Typography
          variant="subtitle1"
          align="left"
          sx={{ fontWeight: "bold" }}
        >
          {t("user.user_profile")}
        </Typography>
      </Box>
      {user && userState ? (
        <TableContainer
          component={Paper}
          sx={{ width: "100%", borderRadius: "0 0 8px 8px" }}
        >
          <Table sx={{ minWidth: 650 }} aria-label="simple table">
            <TableBody>
              {tableFields.map((field, index) =>
                fieldEditing === field.name ? (
                  <TableRow
                    key={index}
                    sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                  >
                    <TableCell sx={{ paddingY: 0 }}>{field.label}</TableCell>
                    <TableCell component="th" scope="row" sx={{ paddingY: 0 }}>
                      <TextField
                        fullWidth
                        type="text"
                        name={field.name}
                        value={userState[field.name as keyof typeof userState]}
                        onChange={(e) => {
                          setUserState({
                            ...userState,
                            [field.name]: e.target.value,
                          });
                        }}
                        onBlur={handleEditConfirm}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleEditConfirm();
                          } else if (e.key === "Escape") {
                            handleEditCancel();
                          }
                        }}
                        autoFocus
                      />
                    </TableCell>
                    <TableCell component="th" scope="row" sx={{ paddingY: 0 }}>
                      <IconButton onClick={handleEditConfirm}>
                        <CheckIcon />
                      </IconButton>
                      <IconButton onClick={handleEditCancel}>
                        <CloseIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow
                    key={index}
                    sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                  >
                    <TableCell sx={{ paddingY: 0 }}>{field.label}</TableCell>
                    <TableCell component="th" scope="row" sx={{ paddingY: 0 }}>
                      {user[field.name as keyof typeof user]}
                    </TableCell>
                    <TableCell component="th" scope="row" sx={{ paddingY: 0 }}>
                      <IconButton onClick={() => setFieldEditing(field.name)}>
                        <EditIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                )
              )}
              <TableRow
                sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
              >
                <TableCell sx={{ paddingY: 0 }}>{t("user.email")}</TableCell>
                <TableCell component="th" scope="row" sx={{ paddingY: 0 }}>
                  {fieldEditing === "email" ? (
                    <TextField
                      fullWidth
                      type="text"
                      name="email"
                      value={userState.email}
                      onChange={(e) => {
                        setUserState({
                          ...userState,
                          email: e.target.value,
                        });
                      }}
                      onBlur={handleEditConfirm}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleEditConfirm();
                        } else if (e.key === "Escape") {
                          handleEditCancel();
                        }
                      }}
                      autoFocus
                    />
                  ) : (
                    <Box sx={{ display: "flex", flexDirection: "column" }}>
                      <Box sx={{ display: "flex", flexDirection: "row" }}>
                        <Typography>{user.email}</Typography>
                        {/* <Chip
                          label={t("user.verified")}
                          color="success"
                          variant="outlined"
                          sx={{ height: "20px" }}
                        /> */}
                        <Chip
                          label={t("user.not_verified")}
                          color="default"
                          variant="outlined"
                          sx={{ height: "20px" }}
                        />
                      </Box>
                      <Link
                        onClick={() => sendVerificationEmail(user.id)}
                        sx={{ cursor: "pointer", underline: "hover" }}
                      >
                        {t("user.send_verification_email")}
                      </Link>
                    </Box>
                  )}
                </TableCell>
                <TableCell component="th" scope="row" sx={{ paddingY: 0 }}>
                  {fieldEditing === "email" ? (
                    <>
                      <IconButton onClick={handleEditConfirm}>
                        <CheckIcon />
                      </IconButton>
                      <IconButton onClick={handleEditCancel}>
                        <CloseIcon />
                      </IconButton>
                    </>
                  ) : (
                    <IconButton onClick={() => setFieldEditing("email")}>
                      <EditIcon />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
              <TableRow
                sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
              >
                <TableCell sx={{ paddingY: 0 }}>{t("user.password")}</TableCell>
                <TableCell component="th" scope="row" sx={{ paddingY: 0 }}>
                  <Typography>●●●●●●●●●</Typography>
                </TableCell>
                <TableCell component="th" scope="row" sx={{ paddingY: 0 }}>
                  <ChangePasswordDialog user={user} />
                </TableCell>
              </TableRow>
              <TableRow
                sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
              >
                <TableCell sx={{ paddingY: 0 }}>{t("user.language")}</TableCell>
                <TableCell component="th" scope="row" sx={{ paddingY: 0 }}>
                  {fieldEditing === "language" ? (
                    <FormControl fullWidth>
                      <Select
                        labelId="demo-simple-select-label"
                        id="demo-simple-select"
                        value={userState.language}
                        onChange={handleChange}
                      >
                        {Object.keys(languages).map((lang) => (
                          <MenuItem key={lang} value={lang}>
                            {languages[lang]}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : (
                    <Typography>{languages[user.language]}</Typography>
                  )}
                </TableCell>
                <TableCell component="th" scope="row" sx={{ paddingY: 0 }}>
                  {fieldEditing === "language" ? (
                    <>
                      <IconButton onClick={handleEditConfirm}>
                        <CheckIcon />
                      </IconButton>
                      <IconButton onClick={handleEditCancel}>
                        <CloseIcon />
                      </IconButton>
                    </>
                  ) : (
                    <IconButton onClick={() => setFieldEditing("language")}>
                      <EditIcon />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Box sx={{ padding: 2 }}>{t("user.no_user_found")}</Box>
      )}
    </Box>
  );
}
