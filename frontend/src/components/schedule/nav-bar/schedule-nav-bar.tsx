import React, { useState } from 'react';
import Link from 'next/link';
import dayjs from 'dayjs';
import { useTranslation } from '../../../app/i18n/client';
// Components
import DataViewSelector from './data-view-selector';
import { TimeNavigation } from '../../common/TimeNavigation';
import CampaignInfo from './campaign-info';
import ScheduleSettings from './schedule-settings';
import { RoleBased } from '../../access/role-based';
// Types
import {
  ScheduleT,
  DuplicateRequestT,
  ScheduleViewSettingsT,
  ExportOptionsT,
  periodDateT,
} from '../../../types/schedule';
import { TeamMembershipRole, TeamWithMembership } from '../../../types/team';
import { SolveTaskStatusResponseT } from '../../../types/solveTaskStatus';
import { SolveScopeType } from '../../../types/solveTaskStatus';
import { BreachT } from '../../../types/breach';
import { WorkerT } from '../../../types/worker';
import { ShiftT } from '../../../types/shift';
import { ScheduleSelectionState, SelectedScheduleCell } from '../../../types/scheduleSelection';

export default function ScheduleNavBar({
  lng,
  teamWithMembership,
  currentPeriodStart,
  currentPeriodEnd,
  scheduleCampaign,
  breaches,
  scheduleViewSettings,
  handleToday,
  handlePreviousPeriod,
  handleNextPeriod,
  handleValidateSchedule,
  handleSendDuplicateRequest,
  updateScheduleViewSettings,
  handleChangeTimeFrame,
  useSqsWorkflow = false, // Feature flag for SQS workflow
  onSqsSolveComplete,
  onToggleSelectionMode,
  workers = [],
  shifts = [],
  selectionState,
  selectedSolveScope = 'FULL',
  onSolveOptionChange,
  workerSolveCells = [],
  shiftSolveCells = [],
  handleExportSchedule,
  periodDates = [],
}: {
  lng: string;
  teamWithMembership: TeamWithMembership;
  currentPeriodStart: dayjs.Dayjs;
  currentPeriodEnd: dayjs.Dayjs;
  scheduleCampaign: ScheduleT | null;
  breaches: BreachT[];
  scheduleViewSettings: ScheduleViewSettingsT;
  handleToday: () => void;
  handlePreviousPeriod: () => void;
  handleNextPeriod: () => void;
  handleValidateSchedule: (scheduleId: string) => void;
  handleSendDuplicateRequest: (
    request: DuplicateRequestT,
    campaignId: string,
    teamId: string,
  ) => void;
  updateScheduleViewSettings: (newSettings: ScheduleViewSettingsT) => void;
  handleChangeTimeFrame: (newTimeFrame: 'week' | 'month') => void;
  useSqsWorkflow?: boolean;
  onSqsSolveComplete?: (result: SolveTaskStatusResponseT) => void;
  onToggleSelectionMode?: () => void;
  workers?: WorkerT[];
  shifts?: ShiftT[];
  selectionState?: ScheduleSelectionState;
  selectedSolveScope?: SolveScopeType;
  onSolveOptionChange?: (scope: SolveScopeType) => void;
  workerSolveCells?: SelectedScheduleCell[];
  shiftSolveCells?: SelectedScheduleCell[];
  handleExportSchedule?: (options: ExportOptionsT) => void;
  periodDates?: periodDateT[];
}) {
  const { t } = useTranslation(lng, 'schedule-page');

  const [isHoveredCreateCampaign, setIsHoveredCreateCampaign] = useState<boolean>(false);

  return (
    <div
      data-testid="schedule-nav-bar"
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        padding: '3px 16px',
      }}
    >
      <TimeNavigation
        lng={lng}
        currentPeriodStart={currentPeriodStart}
        currentPeriodEnd={currentPeriodEnd}
        timeFrame={scheduleViewSettings.timeFrame}
        onToday={handleToday}
        onPreviousPeriod={handlePreviousPeriod}
        onNextPeriod={handleNextPeriod}
        onTimeFrameChange={handleChangeTimeFrame}
      />
      <DataViewSelector
        lng={lng}
        scheduleViewSettings={scheduleViewSettings}
        updateScheduleViewSettings={updateScheduleViewSettings}
      />
      <RoleBased
        role={teamWithMembership.membership.role}
        allowedRoles={[TeamMembershipRole.OWNER]}
      >
        <>
          <ScheduleSettings
            lng={lng}
            teamWithMembership={teamWithMembership}
            campaign={scheduleCampaign}
            startDate={currentPeriodStart}
            endDate={currentPeriodEnd}
            scheduleViewSettings={scheduleViewSettings}
            onToggleSelectionMode={onToggleSelectionMode ?? (() => {})}
            handleSendDuplicateRequest={handleSendDuplicateRequest}
            updateScheduleViewSettings={updateScheduleViewSettings}
            handleChangeTimeFrame={handleChangeTimeFrame}
            handleExportSchedule={handleExportSchedule}
            periodDates={periodDates}
          />

          {scheduleCampaign ? (
            <CampaignInfo
              lng={lng}
              teamWithMembership={teamWithMembership}
              scheduleCampaign={scheduleCampaign}
              breaches={breaches}
              handleValidateSchedule={handleValidateSchedule}
              useSqsWorkflow={useSqsWorkflow}
              onSqsSolveComplete={onSqsSolveComplete}
              workers={workers}
              shifts={shifts}
              selectionState={selectionState}
              groupBy={scheduleViewSettings.groupBy}
              selectedSolveScope={selectedSolveScope}
              onSolveOptionChange={onSolveOptionChange}
              workerSolveCells={workerSolveCells}
              shiftSolveCells={shiftSolveCells}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                width: '470px',
              }}
            >
              <Link href={`/${lng}/plan/campaign`}>
                <button
                  data-testid="nav-bar-create-campaign-button"
                  style={{
                    borderRadius: '4px',
                    border: '1px solid #e5e7eb',
                    height: '35px',
                    padding: '0 15px',
                    fontSize: '0.9rem',
                    fontWeight: 550,
                    color: '#616161',
                    backgroundColor: isHoveredCreateCampaign ? '#f0f0f0' : 'white',
                  }}
                  onMouseEnter={() => setIsHoveredCreateCampaign(true)}
                  onMouseLeave={() => setIsHoveredCreateCampaign(false)}
                >
                  {t('create_campaign')}
                </button>
              </Link>
            </div>
          )}
        </>
      </RoleBased>
    </div>
  );
}
