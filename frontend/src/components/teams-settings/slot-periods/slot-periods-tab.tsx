'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from '@/app/i18n/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import SectionTitle from '../generation-settings/section-title';
import { useGetTeamById } from '@/hooks/useTeam';
import { useUpdateTeam } from '@/hooks/useTeam';
import { SlotPeriodsT, TeamT } from '@/types/team';

const DEFAULT_SLOT_PERIODS: SlotPeriodsT = {
  morning: { startHour: 6, startMinute: 0, endHour: 12, endMinute: 0 },
  afternoon: { startHour: 12, startMinute: 0, endHour: 18, endMinute: 0 },
  night: { startHour: 18, startMinute: 0, endHour: 6, endMinute: 0 },
};

type SlotKey = 'morning' | 'afternoon' | 'night';

const SLOT_KEYS: { key: SlotKey; i18nKey: string }[] = [
  { key: 'morning', i18nKey: 'slot_periods_morning' },
  { key: 'afternoon', i18nKey: 'slot_periods_afternoon' },
  { key: 'night', i18nKey: 'slot_periods_night' },
];

function parseTimeInput(value: string): { hour: number; minute: number } | null {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export default function SlotPeriodsTab({
  lng,
  selectedTeamId,
}: {
  lng: string;
  selectedTeamId: string;
}) {
  const { t } = useTranslation(lng, 'teams-page');

  const [isLoading, setIsLoading] = useState(true);
  const [team, setTeam] = useState<TeamT | null>(null);
  const [customEnabled, setCustomEnabled] = useState(false);
  const [slotPeriods, setSlotPeriods] = useState<SlotPeriodsT>(DEFAULT_SLOT_PERIODS);

  const getTeamByIdFn = useGetTeamById();
  const updateTeamFn = useUpdateTeam();

  const currentPeriods = customEnabled && team?.slotPeriods ? team.slotPeriods : DEFAULT_SLOT_PERIODS;

  const handleFetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetched = await getTeamByIdFn(selectedTeamId);
      setTeam(fetched);
      if (fetched.slotPeriods) {
        setCustomEnabled(true);
        setSlotPeriods(fetched.slotPeriods);
      } else {
        setCustomEnabled(false);
        setSlotPeriods(DEFAULT_SLOT_PERIODS);
      }
    } catch {
      // defaults apply
    } finally {
      setIsLoading(false);
    }
  }, [selectedTeamId, getTeamByIdFn]);

  useEffect(() => {
    handleFetch();
  }, [handleFetch]);

  const persist = useCallback(
    async (enabled: boolean, periods: SlotPeriodsT) => {
      if (!team) return;
      const updated: TeamT = {
        ...team,
        slotPeriods: enabled ? periods : null,
      };
      try {
        const result = await updateTeamFn(selectedTeamId, updated);
        setTeam(result);
      } catch (err) {
        console.error('Failed to save slot periods:', err);
      }
    },
    [selectedTeamId, team, updateTeamFn],
  );

  const handleToggleCustom = useCallback(
    (checked: boolean) => {
      setCustomEnabled(checked);
      if (checked) {
        const periods = team?.slotPeriods || DEFAULT_SLOT_PERIODS;
        setSlotPeriods(periods);
        persist(true, periods);
      } else {
        setSlotPeriods(DEFAULT_SLOT_PERIODS);
        persist(false, DEFAULT_SLOT_PERIODS);
      }
    },
    [team, persist],
  );

  const handleTimeChange = useCallback(
    (slot: SlotKey, field: 'startHour' | 'startMinute' | 'endHour' | 'endMinute', value: number) => {
      const updated = {
        ...slotPeriods,
        [slot]: { ...slotPeriods[slot], [field]: value },
      };
      setSlotPeriods(updated);
      persist(true, updated);
    },
    [slotPeriods, persist],
  );

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">{t('loading') || '…'}</div>;
  }

  return (
    <div className="max-w-2xl space-y-8 p-6">
      <section className="space-y-6">
        <SectionTitle title={t('slot_periods')} />

        <div className="flex items-start gap-4">
          <Checkbox
            id="slot-periods-toggle"
            checked={customEnabled}
            onCheckedChange={(c) => handleToggleCustom(Boolean(c))}
            className="mt-1"
          />
          <div>
            <Label htmlFor="slot-periods-toggle" className="cursor-pointer text-sm font-medium">
              {t('slot_periods_toggle')}
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">{t('slot_periods_toggle_desc')}</p>
          </div>
        </div>

        {customEnabled && (
          <div className="space-y-6">
            {SLOT_KEYS.map(({ key, i18nKey }) => {
              const period = currentPeriods[key];
              return (
                <div key={key} className="space-y-2">
                  <Label className="text-sm font-semibold">{t(i18nKey)}</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{t('slot_periods_start')}</span>
                    <Input
                      type="number"
                      min={0}
                      max={23}
                      value={period.startHour}
                      onChange={(e) =>
                        handleTimeChange(key, 'startHour', parseInt(e.target.value, 10) || 0)
                      }
                      className="h-8 w-16 text-center"
                    />
                    <span className="text-muted-foreground">:</span>
                    <Input
                      type="number"
                      min={0}
                      max={59}
                      value={period.startMinute}
                      onChange={(e) =>
                        handleTimeChange(key, 'startMinute', parseInt(e.target.value, 10) || 0)
                      }
                      className="h-8 w-16 text-center"
                    />
                    <span className="mx-2 text-muted-foreground">–</span>
                    <span className="text-xs text-muted-foreground">{t('slot_periods_end')}</span>
                    <Input
                      type="number"
                      min={0}
                      max={23}
                      value={period.endHour}
                      onChange={(e) =>
                        handleTimeChange(key, 'endHour', parseInt(e.target.value, 10) || 0)
                      }
                      className="h-8 w-16 text-center"
                    />
                    <span className="text-muted-foreground">:</span>
                    <Input
                      type="number"
                      min={0}
                      max={59}
                      value={period.endMinute}
                      onChange={(e) =>
                        handleTimeChange(key, 'endMinute', parseInt(e.target.value, 10) || 0)
                      }
                      className="h-8 w-16 text-center"
                    />
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground">{t('slot_periods_defaults_note')}</p>
          </div>
        )}
      </section>
    </div>
  );
}
