import React, { ReactElement, useEffect, useState, useCallback } from 'react';
import { useTranslation } from '../../../app/i18n/client';
import { useRouter } from 'next/navigation';
// MUI
import Box from '@mui/material/Box';
import EditIcon from '@mui/icons-material/Edit';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
// Components
import UserProfileRow from '@/components/settings/profile/user-profile-row';
import NavigationHeader from '@/components/common/navigation-header';
// Context
import { useTeam } from '@/context/TeamContext';
// Skeletons
import TablesSkeleton from '../../skeletons/tables-skeleton';
// Hooks
import { useIsMobile, useIsLandscape } from '../../../hooks/useIsMobile';
// Actions
import { useGetTeamById, useUpdateTeam } from '@/hooks/useTeam';
// Styles
import './team-general-tab.css';
import '../../../styles/text-styles.css';
import '../../../styles/tab-container-styles.css';
// Types
import { TeamT } from '@/types/team';

export default function TeamGeneralTab({
  lng,
  selectedTeamId,
}: {
  lng: string;
  selectedTeamId: string | null;
}) {
  const { t } = useTranslation(lng, 'teams-page');
  const router = useRouter();
  const isMobile = useIsMobile();
  const isLandscape = useIsLandscape();

  const { updateTeamInContext } = useTeam();

  const [isLoading, setIsLoading] = useState(true);
  const [team, setTeam] = useState<TeamT | null>(null);
  const [fieldEditing, setFieldEditing] = useState<string | null>(null);
  const [teamState, setTeamState] = useState<TeamT | null>(team);

  // Hook functions
  const getTeamByIdFn = useGetTeamById();
  const updateTeamFn = useUpdateTeam();

  const editButton = (handleSetEditing: () => void): ReactElement => (
    <IconButton onClick={handleSetEditing}>
      <EditIcon />
    </IconButton>
  );

  //////////////////////////
  // Team Actions
  //////////////////////////

  const handleGetTeam = useCallback(async () => {
    if (!selectedTeamId) return;
    setIsLoading(true);
    try {
      const fetchedTeam = await getTeamByIdFn(selectedTeamId);
      setTeam(fetchedTeam);
    } catch (error) {
      console.error('Failed to fetch team:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTeamId, getTeamByIdFn]);

  const handleUpdateTeam = async (updatedTeam: TeamT) => {
    if (!selectedTeamId) return;
    try {
      const newTeam = await updateTeamFn(selectedTeamId, updatedTeam);
      setTeam(newTeam);
      updateTeamInContext(newTeam);
    } catch (error) {
      console.error('Failed to update team:', error);
    }
  };

  const handleChangeUseSolver = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!teamState) return;
    const newTeamState = {
      ...teamState,
      useSolver: e.target.checked,
    };
    setTeamState(newTeamState);
    handleUpdateTeam(newTeamState);
  };

  const handleEditConfirm = () => {
    if (teamState && team) {
      const userKeys = Object.keys(team);

      for (let key of userKeys) {
        if (team[key as keyof typeof team] !== teamState[key as keyof typeof teamState]) {
          handleUpdateTeam(teamState);
          break;
        }
      }
    }
    setFieldEditing(null);
  };

  const handleEditCancel = () => {
    console.log('handleEditCancel');

    setTeamState(team);
    setFieldEditing(null);
  };

  useEffect(() => {
    handleGetTeam();
  }, [handleGetTeam]);

  useEffect(() => {
    if (team) {
      setTeamState(team);
    }
  }, [team]);

  return (
    <div>
      {isLoading ? (
        <TablesSkeleton numTables={1} numInternalRows={5} />
      ) : (
        <div className="team-general-container" data-testid="team-general-page-heading">
          <NavigationHeader
            title={t('general')}
            onBack={() => router.push(`/${lng}/plan/teams?teamId=${selectedTeamId}`)}
            showBackButton={isMobile && !isLandscape}
          />
          {team && teamState ? (
            <div className="team-general-content">
              <UserProfileRow
                label={t('name')}
                value={<span>{team.name}</span>}
                valueEditing={
                  <TextField
                    fullWidth
                    type="text"
                    name="name"
                    value={teamState.name}
                    onChange={(e) => {
                      setTeamState({
                        ...teamState,
                        name: e.target.value,
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
                editing={fieldEditing === 'name'}
                editButton={editButton(() => setFieldEditing('name'))}
                handleEditConfirm={handleEditConfirm}
                handleEditCancel={handleEditCancel}
              />
              <hr className="separator" />
              <div className="team-settings-row">
                <div className="team-settings-row-label-container">
                  <span className="team-settings-row-label">{t('use_solver')}</span>
                </div>
                <div className="team-settings-row-value-container">
                  <Checkbox
                    id="use-solver-checkbox"
                    size="small"
                    checked={teamState.useSolver}
                    onChange={handleChangeUseSolver}
                    sx={{ marginTop: '-7px' }}
                    autoFocus
                  />
                  <div className="team-settings-checkbox-label-container">
                    <label className="team-settings-checkbox-label" htmlFor="use-solver-checkbox">
                      {t('use_solver_label')}
                    </label>
                    <span className="team-settings-checkbox-description">
                      {t('use_solver_description')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <Box sx={{ padding: 2 }}>{t('no_team_message')}</Box>
          )}
        </div>
      )}
    </div>
  );
}
