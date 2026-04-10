import React, { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useTranslation } from '../../app/i18n/client';
// Components
import ScheduleItemDialog from './dialogs/schedule-item-dialog';
import { ScheduleItemType, DialogMode } from './dialogs/schedule-item-types';
// Types
import { TeamMembershipRole, TeamWithMembership } from '../../types/team';
import { WorkerT } from '../../types/worker';
import { ShiftT } from '../../types/shift';
import { AssignmentT } from '../../types/assignment';
import { RecurrenceRuleT } from '../../types/recurrence';
import dayjs from 'dayjs';
import Link from 'next/link';

interface NoAssignmentsDisplayProps {
  lng: string;
  teamWithMembership: TeamWithMembership;
  scheduleId: string | null;
  workers: WorkerT[];
  shifts: ShiftT[];
  handleCreateAssignment?: (
    newAssignment: AssignmentT,
    newRecurrence: RecurrenceRuleT | null,
  ) => void;
  handleCreateShiftDemand: (
    shiftId: string,
    date: dayjs.Dayjs,
    count: number,
    notes?: string,
  ) => Promise<void>;
}

export default function NoAssignmentsDisplay({
  lng,
  teamWithMembership,
  scheduleId,
  workers,
  shifts,
  handleCreateAssignment,
  handleCreateShiftDemand,
}: NoAssignmentsDisplayProps) {
  const { t } = useTranslation(lng, 'schedule-page');
  const [isCreateAssignmentDialogOpen, setIsCreateAssignmentDialogOpen] = useState(false);
  const [isHoveredCreateCampaign, setIsHoveredCreateCampaign] = useState<boolean>(false);

  const isOwner = teamWithMembership.membership.role === TeamMembershipRole.OWNER;

  const handleOpenCreateAssignmentDialog = () => {
    setIsCreateAssignmentDialogOpen(true);
  };

  const handleCloseCreateAssignmentDialog = () => {
    setIsCreateAssignmentDialogOpen(false);
  };

  if (!isOwner) {
    // Member view: just show simple text
    return (
      <Box
        data-testid="no-assignments-display-member"
        sx={{
          margin: 2,
          marginLeft: 0,
          overflowX: 'auto',
          backgroundColor: 'none',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '300px',
        }}
      >
        <Typography variant="body1" color="textSecondary" sx={{ fontStyle: 'italic' }}>
          {t('no_assignment_yet_member')}
        </Typography>
      </Box>
    );
  }

  // Owner view: show text and action buttons
  return (
    <>
      <Box
        data-testid="no-assignments-display-owner"
        sx={{
          margin: 2,
          marginLeft: 0,
          overflowX: 'auto',
          backgroundColor: 'none',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '300px',
          gap: 3,
        }}
      >
        <Typography
          variant="body1"
          color="textSecondary"
          sx={{
            fontStyle: 'italic',
            textAlign: 'center',
            maxWidth: '600px',
          }}
          data-testid="no-assignments-owner-text"
        >
          {t('no_assignments_yet_owner')}
        </Typography>
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <Button
            component={Link}
            href={`/${lng}/plan/campaign`}
            variant="outlined"
            data-testid="create-campaign-button"
            sx={{
              borderRadius: '4px',
              height: '40px',
              padding: '0 20px',
              fontSize: '0.9rem',
              fontWeight: 550,
              textTransform: 'none',
              backgroundColor: isHoveredCreateCampaign ? '#f0f0f0' : 'white',
            }}
            onMouseEnter={() => setIsHoveredCreateCampaign(true)}
            onMouseLeave={() => setIsHoveredCreateCampaign(false)}
          >
            {t('create_campaign')}
          </Button>
          <Button
            variant="contained"
            data-testid="create-assignment-button"
            onClick={handleOpenCreateAssignmentDialog}
            sx={{
              borderRadius: '4px',
              height: '40px',
              padding: '0 20px',
              fontSize: '0.9rem',
              fontWeight: 550,
              textTransform: 'none',
            }}
          >
            {t('create_assignment')}
          </Button>
        </Box>
      </Box>

      {/* Create Assignment Dialog */}
      <ScheduleItemDialog
        lng={lng}
        open={isCreateAssignmentDialogOpen}
        onClose={handleCloseCreateAssignmentDialog}
        mode={DialogMode.CREATE}
        selectedType={ScheduleItemType.ASSIGNMENT}
        dialogData={{
          scheduleId: scheduleId,
          workerId: null,
          shiftId: null,
          date: null,
          addDemandActive: false,
        }}
        teamId={teamWithMembership.team.id}
        scheduleId={scheduleId}
        workers={workers}
        shifts={shifts}
        schedules={[]}
        specialties={[]}
        shiftOptions={[]}
        userWorkerId={null}
        userTeamRole={teamWithMembership.membership.role}
        useSolver={teamWithMembership.team.useSolver}
        handleCreateAssignment={handleCreateAssignment}
        handleCreateShiftDemand={handleCreateShiftDemand}
      />
    </>
  );
}
