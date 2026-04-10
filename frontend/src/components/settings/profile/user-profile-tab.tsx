import React, { ReactElement, useEffect, useState, useRef } from 'react';
import { useTranslation } from '../../../app/i18n/client';
import { useRouter } from 'next/navigation';
// MUI
import Box from '@mui/material/Box';
import EditIcon from '@mui/icons-material/Edit';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import TextField from '@mui/material/TextField';
// Components
import UserProfileRow from './user-profile-row';
import NavigationHeader from '@/components/common/navigation-header';
// Skeletons
import TablesSkeleton from '../../skeletons/tables-skeleton';
// Hooks
import { useIsMobile, useIsLandscape } from '../../../hooks/useIsMobile';
// Actions
import { useGetUser, useUpdateUser } from '../../../hooks/useUser';
// Styles
import './user-profile-tab.css';
import '../../../styles/text-styles.css';
import '../../../styles/tab-container-styles.css';
// Types
import { UserT } from '../../../types/user';
// Constants
import { languages } from '../../../constants/constants';

export default function UserProfileTab({ lng }: { lng: string }) {
  const { t } = useTranslation(lng, 'profile-page');
  const router = useRouter();
  const isMobile = useIsMobile();
  const isLandscape = useIsLandscape();
  const getUser = useGetUser();
  const updateUser = useUpdateUser();

  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserT | null>(null);
  const [fieldEditing, setFieldEditing] = useState<string | null>(null);
  const [userState, setUserState] = useState<UserT | null>(user);

  // Prevent multiple API calls
  const hasFetched = useRef(false);

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

  const handleEditConfirm = () => {
    if (userState && user) {
      const userKeys = Object.keys(user);
      for (let key of userKeys) {
        if (key === 'workers') continue;
        if (user[key as keyof typeof user] !== userState[key as keyof typeof userState]) {
          handleUpdateUser(userState);
          break;
        }
      }
      if (userState.language !== lng) {
        window.location.href = `/${userState.language}/plan/settings/personal-info`;
      }
    }
    setFieldEditing(null);
  };

  const handleEditCancel = () => {
    console.log('handleEditCancel');

    setUserState(user);
    setFieldEditing(null);
  };

  const handleChange = (event: SelectChangeEvent) => {
    if (!userState) return;
    setUserState({ ...userState, language: event.target.value as string });
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
        setUserState(userData);
      } catch (error) {
        console.error('Failed to fetch user data:', error);
        // Reset flag on error to allow retry
        hasFetched.current = false;
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserData();
  }, [getUser]); // getUser is now stable

  // Sync userState when user changes (but prevent loops)
  useEffect(() => {
    if (user && !fieldEditing) {
      setUserState(user);
    }
  }, [user, fieldEditing]);

  return (
    <div>
      {isLoading ? (
        <TablesSkeleton numTables={1} numInternalRows={5} />
      ) : (
        <div className="user-profile-container" data-testid="personal-info-page-heading">
          <NavigationHeader
            title={t('personal_info')}
            onBack={() => router.push(`/${lng}/plan/settings`)}
            showBackButton={isMobile && !isLandscape}
          />
          {user && userState ? (
            <div className="user-profile">
              <UserProfileRow
                label={t('first_name')}
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
                      if (e.key === 'Enter') {
                        handleEditConfirm();
                      } else if (e.key === 'Escape') {
                        handleEditCancel();
                      }
                    }}
                    autoFocus
                  />
                }
                editing={fieldEditing === 'firstName'}
                editButton={editButton(() => setFieldEditing('firstName'))}
                handleEditConfirm={handleEditConfirm}
                handleEditCancel={handleEditCancel}
              />
              <UserProfileRow
                label={t('last_name')}
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
                      if (e.key === 'Enter') {
                        handleEditConfirm();
                      } else if (e.key === 'Escape') {
                        handleEditCancel();
                      }
                    }}
                    autoFocus
                  />
                }
                editing={fieldEditing === 'lastName'}
                editButton={editButton(() => setFieldEditing('lastName'))}
                handleEditConfirm={handleEditConfirm}
                handleEditCancel={handleEditCancel}
              />
              <UserProfileRow
                label={t('email')}
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
                      if (e.key === 'Enter') {
                        handleEditConfirm();
                      } else if (e.key === 'Escape') {
                        handleEditCancel();
                      }
                    }}
                    autoFocus
                  />
                }
                editing={fieldEditing === 'email'}
                editButton={editButton(() => setFieldEditing('email'))}
                handleEditConfirm={handleEditConfirm}
                handleEditCancel={handleEditCancel}
              />
              <UserProfileRow
                label={t('language')}
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
                editing={fieldEditing === 'language'}
                editButton={editButton(() => setFieldEditing('language'))}
                handleEditConfirm={handleEditConfirm}
                handleEditCancel={handleEditCancel}
              />
            </div>
          ) : (
            <Box sx={{ padding: 2 }}>{t('no_user_found')}</Box>
          )}
        </div>
      )}
    </div>
  );
}
