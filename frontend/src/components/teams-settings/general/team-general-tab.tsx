import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from '../../../app/i18n/client';
import { useRouter } from 'next/navigation';
import { Pencil, Check, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import NavigationHeader from '@/components/common/navigation-header';
import { useTeam } from '@/context/TeamContext';
import TablesSkeleton from '../../skeletons/tables-skeleton';
import { useIsMobile, useIsLandscape } from '../../../hooks/useIsMobile';
import { useGetTeamById, useUpdateTeam } from '@/hooks/useTeam';
import '../../../styles/text-styles.css';
import '../../../styles/tab-container-styles.css';
import { SlotPeriodsT, TeamT } from '@/types/team';

const DEFAULT_SLOT_PERIODS: SlotPeriodsT = {
  morning: { startHour: 6, startMinute: 0, endHour: 12, endMinute: 0 },
  afternoon: { startHour: 12, startMinute: 0, endHour: 18, endMinute: 0 },
  night: { startHour: 18, startMinute: 0, endHour: 6, endMinute: 0 },
};

type SlotKey = 'morning' | 'afternoon' | 'night';

const SLOT_ROWS: { key: SlotKey; labelKey: string }[] = [
  { key: 'morning', labelKey: 'slot_periods_morning' },
  { key: 'afternoon', labelKey: 'slot_periods_afternoon' },
  { key: 'night', labelKey: 'slot_periods_night' },
];

function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function formatSlotPeriod(slot: {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}): string {
  return `${formatTime(slot.startHour, slot.startMinute)} \u2013 ${formatTime(slot.endHour, slot.endMinute)}`;
}

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
  const [teamState, setTeamState] = useState<TeamT | null>(team);
  const [fieldEditing, setFieldEditing] = useState<string | null>(null);
  const [slotPeriodsEditing, setSlotPeriodsEditing] = useState(false);
  const [editingSlotPeriods, setEditingSlotPeriods] = useState<SlotPeriodsT | null>(null);

  const getTeamByIdFn = useGetTeamById();
  const updateTeamFn = useUpdateTeam();

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

  const handleChangeUseSolver = (checked: boolean | 'indeterminate') => {
    if (!teamState || checked === 'indeterminate') return;
    const newTeamState = { ...teamState, useSolver: checked };
    setTeamState(newTeamState);
    handleUpdateTeam(newTeamState);
  };

  const handleNameEditConfirm = () => {
    if (teamState && team) {
      if (team.name !== teamState.name) {
        handleUpdateTeam(teamState);
      }
    }
    setFieldEditing(null);
  };

  const handleNameEditCancel = () => {
    setTeamState(team);
    setFieldEditing(null);
  };

  const handleStartSlotEditing = () => {
    setEditingSlotPeriods(teamState?.slotPeriods || DEFAULT_SLOT_PERIODS);
    setSlotPeriodsEditing(true);
  };

  const handleSlotConfirm = () => {
    if (!teamState || !editingSlotPeriods) return;
    const updated = { ...teamState, slotPeriods: editingSlotPeriods };
    setTeamState(updated);
    handleUpdateTeam(updated);
    setSlotPeriodsEditing(false);
  };

  const handleSlotCancel = () => {
    setEditingSlotPeriods(null);
    setSlotPeriodsEditing(false);
  };

  const handleSlotFieldChange = (
    slot: SlotKey,
    field: 'startHour' | 'startMinute' | 'endHour' | 'endMinute',
    value: number,
  ) => {
    if (!editingSlotPeriods) return;
    setEditingSlotPeriods({
      ...editingSlotPeriods,
      [slot]: { ...editingSlotPeriods[slot], [field]: value },
    });
  };

  useEffect(() => {
    handleGetTeam();
  }, [handleGetTeam]);

  useEffect(() => {
    if (team) {
      setTeamState(team);
    }
  }, [team]);

  const sectionRowClass = 'flex items-center py-[2px]';
  const labelContainerClass = 'w-[150px] flex items-center shrink-0';
  const labelClass = 'text-[#3c4043] text-[0.9rem]';
  const valueContainerClass = 'flex items-center gap-2 flex-1';

  return (
    <div>
      {isLoading ? (
        <TablesSkeleton numTables={1} numInternalRows={5} />
      ) : (
        <div className="flex w-full flex-col self-start" data-testid="team-general-page-heading">
          <NavigationHeader
            title={t('general')}
            onBack={() => router.push(`/${lng}/plan/teams?teamId=${selectedTeamId}`)}
            showBackButton={isMobile && !isLandscape}
          />
          {team && teamState ? (
            <div className="flex w-full flex-col">
              {/* ---- Name row ---- */}
              <div className={sectionRowClass}>
                <div className={labelContainerClass}>
                  <span className={labelClass}>{t('name')}</span>
                </div>
                <div className={valueContainerClass}>
                  {fieldEditing === 'name' ? (
                    <>
                      <Input
                        type="text"
                        name="name"
                        value={teamState.name}
                        onChange={(e) => setTeamState({ ...teamState, name: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleNameEditConfirm();
                          else if (e.key === 'Escape') handleNameEditCancel();
                        }}
                        autoFocus
                        className="h-8"
                      />
                      <Button variant="ghost" size="icon-xs" onClick={handleNameEditConfirm}>
                        <Check />
                      </Button>
                      <Button variant="ghost" size="icon-xs" onClick={handleNameEditCancel}>
                        <X />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span>{team.name}</span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setFieldEditing('name')}
                      >
                        <Pencil />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <Separator className="my-2.5" />

              {/* ---- Use generator section ---- */}
              <div className={sectionRowClass}>
                <div className={labelContainerClass}>
                  <span className={labelClass}>{t('use_solver')}</span>
                </div>
                <div className={valueContainerClass}>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="use-solver-checkbox"
                      checked={teamState.useSolver}
                      onCheckedChange={handleChangeUseSolver}
                      className="mt-1"
                    />
                    <div>
                      <Label
                        htmlFor="use-solver-checkbox"
                        className="cursor-pointer text-sm font-medium"
                      >
                        {t('use_solver_label')}
                      </Label>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t('use_solver_description')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="my-2.5" />

              {/* ---- Time slots section ---- */}
              {(() => {
                const sp = teamState.slotPeriods || DEFAULT_SLOT_PERIODS;
                return (
                  <>
                    <div className={`${sectionRowClass} justify-between`}>
                      <div className={labelContainerClass}>
                        <span className={labelClass}>{t('slot_periods')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {slotPeriodsEditing ? (
                          <>
                            <Button variant="ghost" size="icon-xs" onClick={handleSlotCancel}>
                              <X />
                            </Button>
                            <Button variant="ghost" size="icon-xs" onClick={handleSlotConfirm}>
                              <Check />
                            </Button>
                          </>
                        ) : (
                          <Button variant="ghost" size="icon-xs" onClick={handleStartSlotEditing}>
                            <Pencil />
                          </Button>
                        )}
                      </div>
                    </div>

                    {SLOT_ROWS.map((row) => {
                      const display =
                        slotPeriodsEditing && editingSlotPeriods
                          ? editingSlotPeriods[row.key]
                          : sp[row.key];

                      return (
                        <div key={row.key} className={`${sectionRowClass} py-0`}>
                          <div className={labelContainerClass}>
                            <span className={labelClass}>{t(row.labelKey)}</span>
                          </div>
                          <div className={valueContainerClass}>
                            {slotPeriodsEditing && editingSlotPeriods ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min={0}
                                  max={23}
                                  value={display.startHour}
                                  onChange={(e) =>
                                    handleSlotFieldChange(
                                      row.key,
                                      'startHour',
                                      parseInt(e.target.value || '0', 10),
                                    )
                                  }
                                  className="h-8 w-14 text-center [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <span className="text-sm">:</span>
                                <Input
                                  type="number"
                                  min={0}
                                  max={59}
                                  value={display.startMinute}
                                  onChange={(e) =>
                                    handleSlotFieldChange(
                                      row.key,
                                      'startMinute',
                                      parseInt(e.target.value || '0', 10),
                                    )
                                  }
                                  className="h-8 w-14 text-center [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <span className="mx-1 text-sm">&ndash;</span>
                                <Input
                                  type="number"
                                  min={0}
                                  max={23}
                                  value={display.endHour}
                                  onChange={(e) =>
                                    handleSlotFieldChange(
                                      row.key,
                                      'endHour',
                                      parseInt(e.target.value || '0', 10),
                                    )
                                  }
                                  className="h-8 w-14 text-center [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <span className="text-sm">:</span>
                                <Input
                                  type="number"
                                  min={0}
                                  max={59}
                                  value={display.endMinute}
                                  onChange={(e) =>
                                    handleSlotFieldChange(
                                      row.key,
                                      'endMinute',
                                      parseInt(e.target.value || '0', 10),
                                    )
                                  }
                                  className="h-8 w-14 text-center [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              </div>
                            ) : (
                              <span className="text-sm">{formatSlotPeriod(display)}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="p-2">{t('no_team_message')}</div>
          )}
        </div>
      )}
    </div>
  );
}
