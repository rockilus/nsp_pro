import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "../../../app/i18n/client";
// Components
import ChangePasswordDialog from "../profile/change-password-dialog";
import UserProfileRow from "../profile/user-profile-row";
// Skeletons
import TablesSkeleton from "../../skeletons/tables-skeleton";
// Actions
import { useGetUser, useUpdatePassword } from "../../../hooks/useUser";
// Styles
import "../../../styles/text-styles.css";
import "../../../styles/tab-container-styles.css";
// Types
import { UserT } from "../../../types/user";

export default function SecurityTab({ lng }: { lng: string }) {
  const { t } = useTranslation(lng, "profile-page");
  const getUser = useGetUser();
  const updatePassword = useUpdatePassword();

  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserT | null>(null);

  // Prevent multiple API calls
  const hasFetched = useRef(false);

  //////////////////////////
  // User Actions
  //////////////////////////

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

  useEffect(() => {
    // Prevent multiple calls during development hot reloads
    if (hasFetched.current) {
      return;
    }

    async function fetchUserData() {
      hasFetched.current = true;

      try {
        setIsLoading(true);
        const userData = await getUser();
        setUser(userData);
      } catch (error) {
        console.error("Failed to fetch user data:", error);
        // Reset flag on error to allow retry
        hasFetched.current = false;
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserData();
  }, [getUser]);

  return (
    <div className="tab-container-wide">
      {isLoading ? (
        <TablesSkeleton numTables={1} numInternalRows={2} />
      ) : (
        <div className="user-profile-container">
          <div>
            <span className="title">{t("security_and_sign_in")}</span>
          </div>
          {user ? (
            <div className="user-profile">
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
                handleEditConfirm={() => {}}
                handleEditCancel={() => {}}
              />
            </div>
          ) : (
            <div>{t("no_user_found")}</div>
          )}
        </div>
      )}
    </div>
  );
}
