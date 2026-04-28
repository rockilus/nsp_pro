'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from '@/app/i18n/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import SectionTitle from './section-title';
import CheckboxSetting from './checkbox-setting';
import GapSetting from './gap-setting';
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
        <SectionTitle title={t('duty_scope_section')} />

        {/* Setting row: work time constraints */}
        <div>
          <CheckboxSetting
            id="duty_scope_work_time"
            checked={settings.duty_scope_work_time}
            onCheckedChange={(checked) => {
              const value = Boolean(checked);
              setSettings((s) => ({ ...s, duty_scope_work_time: value }));
              handleUpdate({ duty_scope_work_time: value });
            }}
            label={t('duty_scope_work_time')}
            description={t('duty_scope_work_time_desc')}
          />
        </div>
      </section>

      {/* Section: Duty gap */}
      <section className="space-y-4">
        <SectionTitle title={t('duty_gap_section')} />

        <div>
          <GapSetting
            id="duty_consecutive_gap"
            mode={settings.duty_consecutive_gap_mode}
            days={settings.duty_consecutive_gap_days}
            onChange={(mode, d) => {
              setSettings((s) => ({
                ...s,
                duty_consecutive_gap_mode: mode,
                duty_consecutive_gap_days: d ?? s.duty_consecutive_gap_days,
              }));
              handleUpdate({
                duty_consecutive_gap_mode: mode,
                duty_consecutive_gap_days: d ?? settings.duty_consecutive_gap_days,
              });
            }}
            label={t('duty_consecutive_gap')}
            description={t('duty_consecutive_gap_desc')}
          />
        </div>
      </section>
    </div>
  );
}
