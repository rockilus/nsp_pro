'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from '@/app/i18n/client';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { GapMode, TeamGenerationSettingsT } from '@/types/team-generation-settings';
import {
  useGetTeamGenerationSettings,
  useUpdateTeamGenerationSettings,
} from '@/hooks/useTeamGenerationSettings';

const DEFAULT_SETTINGS: Omit<TeamGenerationSettingsT, 'team_id'> = {
  duty_scope_work_time: true,
  duty_consecutive_gap_mode: 'off',
  duty_consecutive_gap_days: 2,
};

export default function GenerationSettingsTab({
  lng,
  selectedTeamId,
}: {
  lng: string;
  selectedTeamId: string;
}) {
  const { t } = useTranslation(lng, 'teams-page');

  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] =
    useState<Omit<TeamGenerationSettingsT, 'team_id'>>(DEFAULT_SETTINGS);

  const getSettingsFn = useGetTeamGenerationSettings();
  const updateSettingsFn = useUpdateTeamGenerationSettings();

  const handleFetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getSettingsFn(selectedTeamId);
      setSettings({
        duty_scope_work_time: data.duty_scope_work_time,
        duty_consecutive_gap_mode: data.duty_consecutive_gap_mode,
        duty_consecutive_gap_days: data.duty_consecutive_gap_days,
      });
    } catch {
      // No document yet — defaults apply; nothing to show
    } finally {
      setIsLoading(false);
    }
  }, [selectedTeamId, getSettingsFn]);

  useEffect(() => {
    handleFetch();
  }, [handleFetch]);

  const handleUpdate = useCallback(
    async (patch: Partial<Omit<TeamGenerationSettingsT, 'team_id'>>) => {
      try {
        await updateSettingsFn(selectedTeamId, {
          team_id: selectedTeamId,
          ...settings,
          ...patch,
        });
      } catch (err) {
        console.error('Failed to save generation settings:', err);
      }
    },
    [selectedTeamId, settings, updateSettingsFn],
  );

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">{t('loading') || '…'}</div>;
  }

  return (
    <div className="max-w-2xl space-y-8 p-6">
      {/* Section: Duties scope */}
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold">{t('duty_scope_section')}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t('duty_scope_section_desc')}</p>
        </div>
        <Separator />

        {/* Setting row: work time constraints */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="duty_scope_work_time" className="text-sm font-medium">
              {t('duty_scope_work_time')}
            </Label>
            <p className="text-sm text-muted-foreground">{t('duty_scope_work_time_desc')}</p>
          </div>
          <Checkbox
            id="duty_scope_work_time"
            checked={settings.duty_scope_work_time}
            onCheckedChange={(checked) => {
              const value = Boolean(checked);
              setSettings((s) => ({ ...s, duty_scope_work_time: value }));
              handleUpdate({ duty_scope_work_time: value });
            }}
          />
        </div>
      </section>

      {/* Section: Duty gap */}
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold">{t('duty_gap_section')}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t('duty_gap_section_desc')}</p>
        </div>
        <Separator />

        {/* Setting row: gap mode */}
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-sm font-medium">{t('duty_consecutive_gap')}</Label>
            <p className="text-sm text-muted-foreground">{t('duty_consecutive_gap_desc')}</p>
          </div>
          <RadioGroup
            value={settings.duty_consecutive_gap_mode}
            onValueChange={(val) => {
              const value = val as GapMode;
              setSettings((s) => ({ ...s, duty_consecutive_gap_mode: value }));
              handleUpdate({ duty_consecutive_gap_mode: value });
            }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="off" id="gap_off" />
              <Label htmlFor="gap_off" className="cursor-pointer font-normal">
                {t('gap_mode_off')}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="set" id="gap_set" />
              <Label htmlFor="gap_set" className="cursor-pointer font-normal">
                {t('gap_mode_set')}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="auto" id="gap_auto" />
              <Label htmlFor="gap_auto" className="cursor-pointer font-normal">
                {t('gap_mode_auto')}
              </Label>
            </div>
          </RadioGroup>

          {/* Days input — visible only when mode = "set" */}
          {settings.duty_consecutive_gap_mode === 'set' && (
            <div className="flex items-center gap-3 pl-6">
              <Input
                type="number"
                min={1}
                max={30}
                value={settings.duty_consecutive_gap_days}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    duty_consecutive_gap_days: Math.max(1, parseInt(e.target.value, 10) || 1),
                  }))
                }
                onBlur={(e) => {
                  const value = Math.max(1, parseInt(e.target.value, 10) || 1);
                  handleUpdate({ duty_consecutive_gap_days: value });
                }}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">{t('days')}</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
