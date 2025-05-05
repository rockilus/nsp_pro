import React, { ReactElement, useEffect, useState } from "react";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import EditIcon from "@mui/icons-material/Edit";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import TextField from "@mui/material/TextField";
// Components
import ChangePasswordDialog from "./change-password-dialog";
import UserProfileRow from "./user-profile-row";
// Skeletons
import TablesSkeleton from "../../skeletons/tables-skeleton";
// Actions
import { getUser, updateUser, updatePassword } from "../../../app/lib/user";
// Styles
import "./user-profile-tab.css";
import "../../../styles/text-styles.css";
import "../../../styles/tab-container-styles.css";
// Types
import { UserT } from "../../../types/user";
// Constants
import { languages } from "../../../constants/constants";

export default function UserProfileTab({ lng }: { lng: string }) {
  const { t } = useTranslation(lng, "profile-page");

  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserT | null>(null);
  const [fieldEditing, setFieldEditing] = useState<string | null>(null);
  const [userState, setUserState] = useState<UserT | null>(user);

  const editButton = (handleSetEditing: () => void): ReactElement => (
    <IconButton onClick={handleSetEditing}>
      <EditIcon />
    </IconButton>
  );

  //////////////////////////
  // User Actions
  //////////////////////////

  const handleUpdateUser = async (updatedUser: UserT) => {
    const newUser = await updateUser(updatedUser);
    setUser(newUser);
  };

  const handleUpdatePassword = async (passwordData: {
    currentPassword: string;
    newPassword: string;
    newPasswordConfirm: string;
  }) => {
    if (!user) {
      throw new Error("User not found");
    }
    await updatePassword(passwordData, user.id);
  };

  const handleEditConfirm = () => {
    if (userState && user) {
      const userKeys = Object.keys(user);
      for (let key of userKeys) {
        if (key === "workers") continue;
        if (
          user[key as keyof typeof user] !==
          userState[key as keyof typeof userState]
        ) {
          handleUpdateUser(userState);
          break;
        }
      }
      if (userState.language !== lng) {
        window.location.href = `/${userState.language}/plan/profile`;
      }
    }
    setFieldEditing(null);
  };

  const handleEditCancel = () => {
    console.log("handleEditCancel");

    setUserState(user);
    setFieldEditing(null);
  };

  const handleChange = (event: SelectChangeEvent) => {
    if (!userState) return;
    setUserState({ ...userState, language: event.target.value as string });
  };

  useEffect(() => {
    const fetchUserTabData = async () => {
      setIsLoading(true);
      const fetchedUser = await getUser();
      setUser(fetchedUser);
      setIsLoading(false);
    };
    fetchUserTabData();
  }, []);

  useEffect(() => {
    if (user) {
      setUserState(user);
    }
  }, [user]);

  return (
    <div className="tab-container-wide">
      {isLoading ? (
        <TablesSkeleton numTables={1} numInternalRows={5} />
      ) : (
        <div className="user-profile-container">
          <span className="title">{t("user_profile")}</span>
          {user && userState ? (
            <div className="user-profile">
              <UserProfileRow
                label={t("first_name")}
                value={<span>{user.firstName}</span>}
                valueEditing={
                  <TextField
                    fullWidth
                    type="text"
                    name="firstName"
                    value={userState.firstName}
                    onChange={(e) => {
                      setUserState({
                        ...userState,
                        firstName: e.target.value,
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
                }
                editing={fieldEditing === "firstName"}
                editButton={editButton(() => setFieldEditing("firstName"))}
                handleEditConfirm={handleEditConfirm}
                handleEditCancel={handleEditCancel}
              />
              <UserProfileRow
                label={t("last_name")}
                value={<span>{user.lastName}</span>}
                valueEditing={
                  <TextField
                    fullWidth
                    type="text"
                    name="lastName"
                    value={userState.lastName}
                    onChange={(e) => {
                      setUserState({
                        ...userState,
                        lastName: e.target.value,
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
                }
                editing={fieldEditing === "lastName"}
                editButton={editButton(() => setFieldEditing("lastName"))}
                handleEditConfirm={handleEditConfirm}
                handleEditCancel={handleEditCancel}
              />
              <UserProfileRow
                label={t("email")}
                value={
                  <span>{user.email}</span>
                  // <div>
                  //   <span>{t("not_verified")}</span>
                  // </div>
                }
                valueEditing={
                  <TextField
                    fullWidth
                    type="email"
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
                }
                editing={fieldEditing === "email"}
                editButton={editButton(() => setFieldEditing("email"))}
                handleEditConfirm={handleEditConfirm}
                handleEditCancel={handleEditCancel}
              />
              <UserProfileRow
                label={t("password")}
                value={<span>●●●●●●●●●</span>}
                valueEditing={<></>}
                editing={false}
                editButton={
                  <ChangePasswordDialog
                    lng={lng}
                    handleUpdatePassword={handleUpdatePassword}
                  />
                }
                handleEditConfirm={handleEditConfirm}
                handleEditCancel={handleEditCancel}
              />
              <UserProfileRow
                label={t("language")}
                value={<span>{languages[user.language]}</span>}
                valueEditing={
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
                }
                editing={fieldEditing === "language"}
                editButton={editButton(() => setFieldEditing("language"))}
                handleEditConfirm={handleEditConfirm}
                handleEditCancel={handleEditCancel}
              />
            </div>
          ) : (
            <Box sx={{ padding: 2 }}>{t("no_user_found")}</Box>
          )}
        </div>
      )}
    </div>
  );
}
